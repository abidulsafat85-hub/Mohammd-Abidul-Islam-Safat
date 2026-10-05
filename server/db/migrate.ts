import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getFirestore, Collections, ADMIN_EMAIL, DEFAULT_SETTINGS } from './index';

const DATA_DIR = path.join(process.cwd(), 'data');
const JSON_BACKUP = path.join(DATA_DIR, 'mess_store.json');

export async function runMigration(): Promise<{ [key: string]: number }> {
  console.log('[Migration] Starting idempotent Firestore migration...');
  const db = getFirestore();
  const counts: { [key: string]: number } = {
    admin_account: 0,
    settings: 0,
    members: 0,
    meals: 0,
    bazar: 0,
    deposits: 0,
    fixed_expenses: 0,
    tomorrow_votes: 0,
  };

  // 1. Admin account
  const initialAdminPass = process.env.ADMIN_INITIAL_PASSWORD || '12345';
  const hashedAdminPass = bcrypt.hashSync(initialAdminPass, 10);
  const adminRef = db.collection(Collections.ADMIN_ACCOUNT).doc(ADMIN_EMAIL);
  const adminSnap = await adminRef.get();
  if (!adminSnap.exists) {
    await adminRef.set({
      email: ADMIN_EMAIL,
      passwordHash: hashedAdminPass,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    });
  }
  counts.admin_account = 1;

  // 2. Settings
  const settingsRef = db.collection(Collections.SETTINGS).doc('app_settings');
  const settingsSnap = await settingsRef.get();
  if (!settingsSnap.exists) {
    await settingsRef.set(DEFAULT_SETTINGS);
  }
  counts.settings = 1;

  // 3. Migrate from JSON file if available
  if (fs.existsSync(JSON_BACKUP)) {
    try {
      const raw = fs.readFileSync(JSON_BACKUP, 'utf-8');
      const data = JSON.parse(raw);

      // Members
      if (Array.isArray(data.members)) {
        for (const m of data.members) {
          const docRef = db.collection(Collections.MEMBERS).doc(m.id);
          const snap = await docRef.get();
          if (!snap.exists) {
            await docRef.set({
              fullName: m.fullName || '',
              nickname: m.nickname || '',
              phone: m.phone || '',
              email: m.email || '',
              password: m.password || '',
              pin: m.pin || '',
              joinDate: m.joinDate || '2026-01-01',
              initialDeposit: Number(m.initialDeposit) || 0,
              isActive: m.isActive !== false,
              registered: Boolean(m.registered),
              address: m.address || '',
              studentId: m.studentId || '',
              notes: m.notes || '',
              createdAt: m.createdAt || new Date().toISOString(),
              updatedAt: m.updatedAt || new Date().toISOString(),
            });
          }
          counts.members++;
        }
      }

      // Meals: Group into monthly docs per member (${memberId}__${month})
      if (Array.isArray(data.meals)) {
        const memberMonthMeals: Record<string, { memberId: string; month: string; days: Record<string, any> }> = {};
        for (const meal of data.meals) {
          if (!meal.date || !meal.memberId) continue;
          const month = meal.date.substring(0, 7);
          const key = `${meal.memberId}__${month}`;
          if (!memberMonthMeals[key]) {
            memberMonthMeals[key] = { memberId: meal.memberId, month, days: {} };
          }
          memberMonthMeals[key].days[meal.date] = {
            mealCount: Number(meal.mealCount) || 0,
            lunch: Boolean(meal.lunch),
            dinner: Boolean(meal.dinner),
            notes: meal.notes || '',
            updatedAt: meal.updatedAt || new Date().toISOString(),
          };
        }

        for (const [key, item] of Object.entries(memberMonthMeals)) {
          const docRef = db.collection(Collections.MEALS).doc(key);
          await docRef.set(item, { merge: true });
          counts.meals++;
        }
      }

      // Bazar
      if (Array.isArray(data.bazar)) {
        for (const b of data.bazar) {
          const docRef = db.collection(Collections.BAZAR).doc(b.id);
          const snap = await docRef.get();
          if (!snap.exists) {
            await docRef.set({
              date: b.date,
              description: b.description || '',
              category: b.category || 'Grocery',
              amount: Number(b.amount) || 0,
              paidByMemberId: b.paidByMemberId || 'MESS_FUND',
              note: b.note || '',
              createdAt: b.createdAt || new Date().toISOString(),
            });
          }
          counts.bazar++;
        }
      }

      // Deposits
      if (Array.isArray(data.deposits)) {
        for (const d of data.deposits) {
          const docRef = db.collection(Collections.DEPOSITS).doc(d.id);
          const snap = await docRef.get();
          if (!snap.exists) {
            await docRef.set({
              memberId: d.memberId,
              date: d.date,
              amount: Number(d.amount) || 0,
              paymentMethod: d.paymentMethod || 'Cash',
              status: d.status || 'approved',
              approvedBy: d.approvedBy || 'Admin',
              approvedAt: d.approvedAt || new Date().toISOString(),
              note: d.note || '',
              createdAt: d.createdAt || new Date().toISOString(),
            });
          }
          counts.deposits++;
        }
      }

      // Fixed Expenses
      if (Array.isArray(data.fixedExpenses)) {
        for (const f of data.fixedExpenses) {
          const docRef = db.collection(Collections.FIXED_EXPENSES).doc(f.id);
          const snap = await docRef.get();
          if (!snap.exists) {
            await docRef.set({
              month: f.month,
              title: f.title,
              amount: Number(f.amount) || 0,
              paidByMemberId: f.paidByMemberId || 'MESS_FUND',
              createdAt: f.createdAt || new Date().toISOString(),
            });
          }
          counts.fixed_expenses++;
        }
      }

      // Tomorrow Votes
      if (data.tomorrowVotes && typeof data.tomorrowVotes === 'object') {
        for (const [memId, v] of Object.entries<any>(data.tomorrowVotes)) {
          await db.collection(Collections.TOMORROW_VOTES).doc(memId).set(v);
          counts.tomorrow_votes++;
        }
      }

      console.log('[Migration] Successfully migrated JSON data into Firestore:');
      for (const [col, count] of Object.entries(counts)) {
        console.log(`  - ${col}: ${count} documents`);
      }
    } catch (err: any) {
      console.error('[Migration] Error migrating from JSON file:', err.message);
    }
  } else {
    console.log('[Migration] No JSON backup file found, defaults applied.');
  }

  return counts;
}

// Run standalone if called directly
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.endsWith('migrate.ts')) {
  runMigration().then(() => {
    console.log('[Migration] Complete.');
    process.exit(0);
  });
}
