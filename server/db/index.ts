import { getFirestore, isUsingMock } from './firestore';
import bcrypt from 'bcryptjs';
import { calculateMonthlySummary, calculateMemberAccounting, roundMoney } from '../../src/shared/calculations';
import { getBangladeshToday, getBangladeshNow } from '../../src/utils/bangladeshTime';
import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
} from '../../src/types';

export { getFirestore, isUsingMock };

export const ADMIN_EMAIL = 'abidulsafat85@gmail.com';
export const DEFAULT_APP_NAME = 'ঘরের স্বাদ';
export const DEFAULT_LOGO = '/ghorer_shadh_logo.svg';

// Cache invalidator placeholder (no-op as function instances do not share memory, Section 3d)
export function invalidateMonthlyCache(_month?: string) {
  // Direct Firestore querying without in-memory cache
}

// Collections enum
export const Collections = {
  MEMBERS: 'members',
  ADMIN_ACCOUNT: 'admin_account',
  MEALS: 'meals', // Monthly documents: ${memberId}_${YYYY-MM}
  BAZAR: 'bazar',
  DEPOSITS: 'deposits',
  FIXED_EXPENSES: 'fixed_expenses',
  SETTINGS: 'settings',
  TOMORROW_VOTES: 'tomorrow_votes',
  ORDERS: 'orders',
  RATE_LIMITS: 'rate_limits',
  SCHEDULER_RUNS: 'scheduler_runs',
  SESSIONS: 'sessions',
  WHATSAPP_MESSAGES: 'whatsapp_messages',
  AUDIT_LOG: 'audit_log',
  COUNTERS: 'counters',
  LOOKUPS: 'unique_lookups',
};

// Default Settings (Section 7b: fake phone/bKash/manager removed, start empty with hint)
export const DEFAULT_SETTINGS = {
  appName: 'ঘরের স্বাদ',
  messName: 'ঘরের স্বাদ',
  logo: '/ghorer_shadh_logo.svg',
  subtitle: 'ঘরের তৈরি স্বাস্থ্যকর খাবারের নির্ভরযোগ্য ঠিকানা',
  currency: '৳',
  mealRateMode: 'bazar_only' as const,
  defaultMealsPerDay: 2,
  theme: 'light' as const,
  fixedMealRate: 50,
  managerName: '',
  managerPhone: '',
  allowNewRegistrations: true,
  orderCutoffTime: '20:00',
  orderAreas: ['মিরপুর', 'উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মোহাম্মদপুর'],
  bkashNagadNumber: '',
  maxOrderPortions: 50,
  isWhatsAppAutomationEnabled: true,
};

// Rate limiter using Firestore
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const db = getFirestore();
  const cleanKey = key.replace(/[/\\.#$]/g, '_');
  const docRef = db.collection(Collections.RATE_LIMITS).doc(cleanKey);
  const now = Date.now();

  try {
    const snap = await docRef.get();
    if (!snap.exists) {
      const resetAt = now + windowMs;
      await docRef.set({ count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    const data = snap.data();
    if (now > data.resetAt) {
      const resetAt = now + windowMs;
      await docRef.set({ count: 1, resetAt });
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    if (data.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: data.resetAt };
    }

    const newCount = data.count + 1;
    await docRef.update({ count: newCount });
    return { allowed: true, remaining: limit - newCount, resetAt: data.resetAt };
  } catch {
    // If rate limit check fails, allow traffic gracefully
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
}

// Generate next unique Member ID
export async function getNextMemberId(): Promise<string> {
  const db = getFirestore();
  const counterRef = db.collection(Collections.COUNTERS).doc('members');

  try {
    return await db.runTransaction(async (t: any) => {
      const doc = await t.get(counterRef);
      let nextSeq = 1;
      if (doc.exists && typeof doc.data()?.lastSeq === 'number') {
        nextSeq = doc.data().lastSeq + 1;
      }
      t.set(counterRef, { lastSeq: nextSeq }, { merge: true });
      return `mem-${nextSeq}`;
    });
  } catch {
    return `mem-${Date.now()}`;
  }
}

// Check and reserve a unique lookup key in Firestore (email, phone, studentId, transactionId)
export async function reserveUniqueLookup(
  type: 'email' | 'phone' | 'studentId' | 'txn',
  rawVal: string,
  targetId: string,
  errorMessage: string
): Promise<void> {
  const db = getFirestore();
  const normalized = rawVal.trim().toLowerCase();
  if (!normalized) return;
  const docId = `${type}__${normalized.replace(/[/\\.#$]/g, '_')}`;
  const lookupRef = db.collection(Collections.LOOKUPS).doc(docId);

  await db.runTransaction(async (t: any) => {
    const snap = await t.get(lookupRef);
    if (snap.exists && snap.data()?.targetId !== targetId) {
      throw new Error(errorMessage);
    }
    t.set(lookupRef, {
      type,
      value: normalized,
      targetId,
      reservedAt: new Date().toISOString(),
    });
  });
}

// Release unique lookup key
export async function releaseUniqueLookup(type: 'email' | 'phone' | 'studentId' | 'txn', rawVal: string): Promise<void> {
  const db = getFirestore();
  const normalized = rawVal.trim().toLowerCase();
  if (!normalized) return;
  const docId = `${type}__${normalized.replace(/[/\\.#$]/g, '_')}`;
  await db.collection(Collections.LOOKUPS).doc(docId).delete();
}

// Export entire database dump for admin backup
export async function exportDatabaseDump(): Promise<Record<string, any[]>> {
  const db = getFirestore();
  const dump: Record<string, any[]> = {};
  const collectionNames = Object.values(Collections);

  for (const col of collectionNames) {
    try {
      const snap = await db.collection(col).get();
      dump[col] = snap.docs.map((d: any) => ({
        id: d.id,
        ...d.data(),
      }));
    } catch {
      dump[col] = [];
    }
  }

  return dump;
}

export async function hasSchedulerRun(jobName: string, bangladeshDate: string): Promise<boolean> {
  const db = getFirestore();
  const id = `${jobName}__${bangladeshDate}`;
  const doc = await db.collection(Collections.SCHEDULER_RUNS).doc(id).get();
  return doc.exists;
}

export async function recordSchedulerRun(jobName: string, bangladeshDate: string): Promise<void> {
  const db = getFirestore();
  const id = `${jobName}__${bangladeshDate}`;
  await db.collection(Collections.SCHEDULER_RUNS).doc(id).set({
    jobName,
    bangladeshDate,
    executedAt: new Date().toISOString(),
  });
}

// Initialize admin account and default settings in Firestore
export async function initFirestoreDatabase(): Promise<void> {
  const db = getFirestore();

  // 1. Verify or create Admin Account
  const adminRef = db.collection(Collections.ADMIN_ACCOUNT).doc(ADMIN_EMAIL);
  const adminDoc = await adminRef.get();
  if (!adminDoc.exists) {
    const initialPass = process.env.ADMIN_INITIAL_PASSWORD || '12345';
    const hashed = bcrypt.hashSync(initialPass, 10);
    await adminRef.set({
      email: ADMIN_EMAIL,
      passwordHash: hashed,
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    });
    console.log('[Firestore] Created initial admin account with mustChangePassword = false');
  } else if (adminDoc.data()?.mustChangePassword) {
    await adminRef.update({
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    });
    console.log('[Firestore] Reset admin mustChangePassword to false');
  }

  // 2. Verify or create Settings
  const settingsRef = db.collection(Collections.SETTINGS).doc('app_settings');
  const settingsDoc = await settingsRef.get();
  if (!settingsDoc.exists) {
    await settingsRef.set(DEFAULT_SETTINGS);
  }
}
