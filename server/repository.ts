import bcrypt from 'bcryptjs';
import {
  getFirestore,
  Collections,
  ADMIN_EMAIL,
  DEFAULT_SETTINGS,
  DEFAULT_APP_NAME,
  DEFAULT_LOGO,
  invalidateMonthlyCache,
  getNextMemberId,
  reserveUniqueLookup,
  releaseUniqueLookup,
} from './db';
import { calculateMonthlySummary, calculateMemberAccounting, roundMoney } from '../src/shared/calculations';
import { isMealDayLocked, getBangladeshToday } from '../src/utils/bangladeshTime';
import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
} from '../src/types';

export { ADMIN_EMAIL };

export interface RepositoryMember extends Member {
  registered: boolean;
  address?: string;
  studentId?: string;
  lastLogin?: string;
  password?: string;
  pin?: string;
}

export class Repository {
  // ---------------------------------------------------------------------------
  // Settings & Branding
  // ---------------------------------------------------------------------------
  static async getSettings(): Promise<MessSettings> {
    const db = getFirestore();
    const doc = await db.collection(Collections.SETTINGS).doc('app_settings').get();
    if (!doc.exists) {
      return { ...DEFAULT_SETTINGS } as any;
    }
    return { ...DEFAULT_SETTINGS, ...doc.data() } as any;
  }

  static async updateSettings(settings: Partial<MessSettings>): Promise<MessSettings> {
    const db = getFirestore();
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await db.collection(Collections.SETTINGS).doc('app_settings').set(updated);
    invalidateMonthlyCache();
    return updated;
  }

  static async getBranding(): Promise<{ appName: string; logo?: string }> {
    const settings = await this.getSettings();
    return {
      appName: settings.appName || settings.messName || DEFAULT_APP_NAME,
      logo: settings.logo || DEFAULT_LOGO,
    };
  }

  static async updateBranding(appName: string, logo?: string | null): Promise<{ appName: string; logo?: string }> {
    const cleanName = (appName || '').trim() || DEFAULT_APP_NAME;
    const settings = await this.getSettings();
    settings.appName = cleanName;
    settings.messName = cleanName;
    if (logo === null || logo === '') {
      settings.logo = DEFAULT_LOGO;
    } else if (logo !== undefined) {
      settings.logo = logo;
    }
    await this.updateSettings(settings);
    return { appName: cleanName, logo: settings.logo };
  }

  // ---------------------------------------------------------------------------
  // Admin Account & Authentication
  // ---------------------------------------------------------------------------
  static async getAdminAccount() {
    const db = getFirestore();
    const doc = await db.collection(Collections.ADMIN_ACCOUNT).doc(ADMIN_EMAIL).get();
    if (!doc.exists) return null;
    return doc.data();
  }

  static async verifyAdminPassword(password: string): Promise<boolean> {
    const admin = await this.getAdminAccount();
    if (!admin || !admin.passwordHash) return false;
    return bcrypt.compareSync(password, admin.passwordHash);
  }

  static async changeAdminPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    const clean = newPassword.trim();
    if (clean.length < 8) {
      return { success: false, error: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' };
    }
    if (clean === '12345') {
      return { success: false, error: "নতুন পাসওয়ার্ড '12345' হওয়া যাবে না।" };
    }

    const db = getFirestore();
    const hashed = bcrypt.hashSync(clean, 10);
    await db.collection(Collections.ADMIN_ACCOUNT).doc(ADMIN_EMAIL).update({
      passwordHash: hashed,
      mustChangePassword: false,
      updatedAt: new Date().toISOString(),
    });
    // Invalidate other sessions for admin
    await this.deleteAllSessionsForUser(ADMIN_EMAIL);
    return { success: true };
  }

  static async updateAdminPasswordWithCurrent(currentPass: string, newPass: string): Promise<{ success: boolean; error?: string }> {
    const isValid = await this.verifyAdminPassword(currentPass);
    if (!isValid) {
      return { success: false, error: 'বর্তমান পাসওয়ার্ড ভুল হয়েছে।' };
    }
    return this.changeAdminPassword(newPass);
  }

  // ---------------------------------------------------------------------------
  // Sessions (Part G)
  // ---------------------------------------------------------------------------
  static async createSession(
    sessionId: string,
    userId: string,
    role: 'admin' | 'member',
    email: string,
    memberId?: string
  ): Promise<void> {
    const db = getFirestore();
    // 12 hours for admin, 30 days for members
    const durationMs = role === 'admin' ? 12 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    await db.collection(Collections.SESSIONS).doc(sessionId).set({
      sessionId,
      userId,
      role,
      email,
      memberId: memberId || null,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + durationMs).toISOString(),
    });
  }

  static async getSession(sessionId: string): Promise<any | null> {
    const db = getFirestore();
    const doc = await db.collection(Collections.SESSIONS).doc(sessionId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    if (new Date(data.expiresAt).getTime() < Date.now()) {
      await db.collection(Collections.SESSIONS).doc(sessionId).delete();
      return null;
    }
    return data;
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const db = getFirestore();
    await db.collection(Collections.SESSIONS).doc(sessionId).delete();
  }

  static async deleteAllSessionsForUser(userId: string): Promise<void> {
    const db = getFirestore();
    const snap = await db.collection(Collections.SESSIONS).where('userId', '==', userId).get();
    const batch = db.batch();
    snap.docs.forEach((doc: any) => {
      batch.delete(db.collection(Collections.SESSIONS).doc(doc.id));
    });
    await batch.commit();
  }

  // ---------------------------------------------------------------------------
  // Members Management
  // ---------------------------------------------------------------------------
  static async getAllMembers(includeSecrets = false): Promise<any[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.MEMBERS).get();
    const members = snap.docs.map((doc: any) => {
      const d = doc.data();
      const res: any = {
        id: doc.id,
        fullName: d.fullName || '',
        nickname: d.nickname || '',
        phone: d.phone || '',
        email: d.email || '',
        joinDate: d.joinDate || '2026-01-01',
        initialDeposit: Number(d.initialDeposit) || 0,
        isActive: d.isActive !== false,
        notes: d.notes || '',
        registered: Boolean(d.registered),
        address: d.address || '',
        studentId: d.studentId || '',
        lastLogin: d.lastLogin || null,
        createdAt: d.createdAt || null,
      };
      if (includeSecrets) {
        res.password = d.password;
        res.pin = d.pin;
      }
      return res;
    });

    members.sort((a: any, b: any) => (a.fullName || '').localeCompare(b.fullName || ''));
    return members;
  }

  static async getPublicMembersList(): Promise<{ id: string; name: string }[]> {
    const all = await this.getAllMembers(false);
    return all.filter((m) => m.isActive).map((m) => ({
      id: m.id,
      name: m.nickname ? `${m.fullName} (${m.nickname})` : m.fullName,
    }));
  }

  static async getMemberById(id: string, includeSecrets = false): Promise<any | null> {
    const db = getFirestore();
    const doc = await db.collection(Collections.MEMBERS).doc(id).get();
    if (!doc.exists) return null;
    const d = doc.data();
    const res: any = {
      id: doc.id,
      fullName: d.fullName || '',
      nickname: d.nickname || '',
      phone: d.phone || '',
      email: d.email || '',
      joinDate: d.joinDate || '2026-01-01',
      initialDeposit: Number(d.initialDeposit) || 0,
      isActive: d.isActive !== false,
      notes: d.notes || '',
      registered: Boolean(d.registered),
      address: d.address || '',
      studentId: d.studentId || '',
      lastLogin: d.lastLogin || null,
      createdAt: d.createdAt || null,
    };
    if (includeSecrets) {
      res.password = d.password;
      res.pin = d.pin;
    }
    return res;
  }

  static async getMemberByEmail(email: string): Promise<any | null> {
    const db = getFirestore();
    const norm = email.trim().toLowerCase();
    const snap = await db.collection(Collections.MEMBERS).where('email', '==', norm).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  static async registerMember(data: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    studentId?: string;
    parentPhone?: string;
    password: string;
    pin?: string;
  }): Promise<{ success: boolean; member?: any; error?: string }> {
    const normEmail = data.email.trim().toLowerCase();
    if (normEmail === ADMIN_EMAIL.toLowerCase()) {
      return { success: false, error: 'এই ইমেইল দিয়ে রেজিস্ট্রেশন অনুমোদিত নয়। এটি এডমিন অ্যাকাউন্ট।' };
    }

    const db = getFirestore();
    const newId = await getNextMemberId();

    try {
      // Enforce unique email, phone, and optional student ID using Firestore lookups
      await reserveUniqueLookup('email', normEmail, newId, 'এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।');
      await reserveUniqueLookup('phone', data.phone, newId, 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা হয়েছে।');
      if (data.studentId && data.studentId.trim()) {
        await reserveUniqueLookup('studentId', data.studentId.trim(), newId, 'এই স্টুডেন্ট আইডি ইতিমধ্যে নিবন্ধিত রয়েছে।');
      }

      const hashedPass = bcrypt.hashSync(data.password, 10);
      const hashedPin = bcrypt.hashSync(data.pin || '1234', 10);
      const today = getBangladeshToday();

      const memberDoc = {
        fullName: data.fullName.trim(),
        phone: data.phone.trim(),
        email: normEmail,
        address: data.address.trim(),
        location: data.address.trim(),
        studentId: data.studentId ? data.studentId.trim() : '',
        universityId: data.studentId ? data.studentId.trim() : '',
        parentPhone: data.parentPhone ? data.parentPhone.trim() : '',
        password: hashedPass,
        pin: hashedPin,
        joinDate: today,
        initialDeposit: 0,
        isActive: true,
        registered: true,
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.collection(Collections.MEMBERS).doc(newId).set(memberDoc);
      invalidateMonthlyCache();

      return {
        success: true,
        member: { id: newId, ...memberDoc, password: undefined, pin: undefined },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'নিবন্ধন সম্পন্ন করতে ব্যর্থ হয়েছে।' };
    }
  }

  static async updateMemberProfile(
    memberId: string,
    data: { fullName?: string; phone?: string; address?: string; studentId?: string; currentPassword?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const member = await this.getMemberById(memberId, true);
    if (!member) return { success: false, error: 'মেম্বার পাওয়া যায়নি।' };

    // If changing mobile phone, verify password
    if (data.phone && data.phone.trim() !== member.phone) {
      if (!data.currentPassword || !bcrypt.compareSync(data.currentPassword, member.password || '')) {
        return { success: false, error: 'মোবাইল নম্বর পরিবর্তনের জন্য সঠিক পাসওয়ার্ড দিন।' };
      }
      try {
        await releaseUniqueLookup('phone', member.phone);
        await reserveUniqueLookup('phone', data.phone, memberId, 'এই মোবাইল নম্বর ইতিমধ্যে অন্য মেম্বারের অ্যাকাউন্টে ব্যবহৃত।');
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    if (data.studentId && data.studentId.trim() !== member.studentId) {
      try {
        if (member.studentId) await releaseUniqueLookup('studentId', member.studentId);
        await reserveUniqueLookup('studentId', data.studentId.trim(), memberId, 'এই স্টুডেন্ট আইডি ইতিমধ্যে ব্যবহৃত।');
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const db = getFirestore();
    const updates: any = { updatedAt: new Date().toISOString() };
    if (data.fullName) updates.fullName = data.fullName.trim();
    if (data.phone) updates.phone = data.phone.trim();
    if (data.address !== undefined) updates.address = data.address.trim();
    if (data.studentId !== undefined) updates.studentId = data.studentId.trim();

    await db.collection(Collections.MEMBERS).doc(memberId).update(updates);
    return { success: true };
  }

  static async addMemberDirect(data: any): Promise<any> {
    const db = getFirestore();
    const id = data.id || (await getNextMemberId());
    const hashedPass = data.password ? (data.password.startsWith('$2') ? data.password : bcrypt.hashSync(data.password, 10)) : '';
    const hashedPin = data.pin ? (data.pin.startsWith('$2') ? data.pin : bcrypt.hashSync(data.pin, 10)) : '';

    const memberDoc = {
      fullName: data.fullName || '',
      nickname: data.nickname || '',
      phone: data.phone || '',
      email: data.email || '',
      password: hashedPass,
      pin: hashedPin,
      joinDate: data.joinDate || getBangladeshToday(),
      initialDeposit: Number(data.initialDeposit) || 0,
      isActive: data.isActive !== false,
      notes: data.notes || '',
      registered: Boolean(data.registered),
      address: data.address || '',
      studentId: data.studentId || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.collection(Collections.MEMBERS).doc(id).set(memberDoc);
    invalidateMonthlyCache();
    return { id, ...memberDoc, password: undefined, pin: undefined };
  }

  static async updateMember(id: string, updates: any): Promise<any> {
    const db = getFirestore();
    const cleanUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (cleanUpdates.password && !cleanUpdates.password.startsWith('$2')) {
      cleanUpdates.password = bcrypt.hashSync(cleanUpdates.password, 10);
      await this.deleteAllSessionsForUser(id);
    }
    if (cleanUpdates.pin && !cleanUpdates.pin.startsWith('$2')) {
      cleanUpdates.pin = bcrypt.hashSync(cleanUpdates.pin, 10);
      await this.deleteAllSessionsForUser(id);
    }
    await db.collection(Collections.MEMBERS).doc(id).update(cleanUpdates);
    invalidateMonthlyCache();
    return this.getMemberById(id);
  }

  static async checkMemberBazarEntries(memberId: string): Promise<any[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.BAZAR).where('paidByMemberId', '==', memberId).get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }

  static async deleteMember(id: string): Promise<{ success: boolean; error?: string }> {
    const db = getFirestore();
    const member = await this.getMemberById(id);
    if (!member) return { success: false, error: 'মেম্বার পাওয়া যায়নি।' };

    // Release lookups
    if (member.email) await releaseUniqueLookup('email', member.email);
    if (member.phone) await releaseUniqueLookup('phone', member.phone);
    if (member.studentId) await releaseUniqueLookup('studentId', member.studentId);

    // Delete member and invalidate sessions
    await db.collection(Collections.MEMBERS).doc(id).delete();
    await this.deleteAllSessionsForUser(id);
    invalidateMonthlyCache();
    return { success: true };
  }

  static async deleteAllUnregisteredMembers(): Promise<{ deletedCount: number }> {
    const db = getFirestore();
    const snap = await db.collection(Collections.MEMBERS).where('registered', '==', false).get();
    let count = 0;
    const batch = db.batch();
    snap.docs.forEach((d: any) => {
      batch.delete(db.collection(Collections.MEMBERS).doc(d.id));
      count++;
    });
    await batch.commit();
    invalidateMonthlyCache();
    return { deletedCount: count };
  }

  // ---------------------------------------------------------------------------
  // Meals (Minimizing reads via monthly member docs: ${memberId}_${month})
  // ---------------------------------------------------------------------------
  static async getMonthMeals(month: string): Promise<MealRecord[]> {
    const db = getFirestore();
    // Query monthly meal docs that end with or have month == month
    const snap = await db.collection(Collections.MEALS).where('month', '==', month).get();
    const records: MealRecord[] = [];

    snap.docs.forEach((doc: any) => {
      const d = doc.data();
      const memberId = d.memberId;
      const days = d.days || {};
      for (const [date, info] of Object.entries<any>(days)) {
        records.push({
          id: `${memberId}_${date}`,
          date,
          memberId,
          mealCount: Number(info.mealCount) || 0,
          lunch: Boolean(info.lunch),
          dinner: Boolean(info.dinner),
          notes: info.notes || '',
          source: info.source || 'default',
          createdAt: info.createdAt || '',
          updatedAt: info.updatedAt || '',
        });
      }
    });

    return records;
  }

  static async saveMealEntry(entry: {
    date: string;
    memberId: string;
    mealCount: number;
    lunch?: boolean;
    dinner?: boolean;
    notes?: string;
    source?: 'default' | 'member' | 'admin';
  }): Promise<void> {
    const month = entry.date.substring(0, 7);
    const db = getFirestore();
    const docId = `${entry.memberId}__${month}`;
    const docRef = db.collection(Collections.MEALS).doc(docId);

    await db.runTransaction(async (t: any) => {
      const snap = await t.get(docRef);
      const prevDays = snap.exists ? snap.data().days || {} : {};
      prevDays[entry.date] = {
        mealCount: entry.mealCount,
        lunch: entry.lunch ?? false,
        dinner: entry.dinner ?? false,
        notes: entry.notes || '',
        source: entry.source || 'member',
        updatedAt: new Date().toISOString(),
      };

      t.set(
        docRef,
        {
          memberId: entry.memberId,
          month,
          days: prevDays,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });

    invalidateMonthlyCache(month);
  }

  static async logAudit(data: {
    action: string;
    performedBy: string;
    target?: string;
    details: any;
  }): Promise<void> {
    const db = getFirestore();
    const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.collection(Collections.AUDIT_LOG).doc(id).set({
      ...data,
      timestamp: new Date().toISOString(),
      bangladeshTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
    });
  }

  // ---------------------------------------------------------------------------
  // Bazar (Admin Only)
  // ---------------------------------------------------------------------------
  static async getMonthBazar(month: string): Promise<BazarExpense[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.BAZAR).get();
    return snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((b: any) => b.date && b.date.startsWith(month));
  }

  static async addBazar(data: any): Promise<BazarExpense> {
    const db = getFirestore();
    const id = data.id || `baz_${Date.now()}`;
    const record: BazarExpense = {
      id,
      date: data.date,
      description: data.description,
      category: data.category || 'Grocery',
      amount: roundMoney(Number(data.amount) || 0),
      paidByMemberId: data.paidByMemberId || 'MESS_FUND',
      note: data.note || '',
      createdAt: new Date().toISOString(),
    };
    await db.collection(Collections.BAZAR).doc(id).set(record);
    invalidateMonthlyCache(data.date.substring(0, 7));
    return record;
  }

  static async updateBazar(id: string, updates: any): Promise<BazarExpense> {
    const db = getFirestore();
    const docRef = db.collection(Collections.BAZAR).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('বাজার এন্ট্রি পাওয়া যায়নি।');
    const prev = snap.data();
    const updated = { ...prev, ...updates };
    await docRef.update(updated);
    invalidateMonthlyCache();
    return { id, ...updated };
  }

  static async deleteBazar(id: string): Promise<void> {
    const db = getFirestore();
    await db.collection(Collections.BAZAR).doc(id).delete();
    invalidateMonthlyCache();
  }

  // ---------------------------------------------------------------------------
  // Deposits (Part E: Approval Workflow, Unique Txn ID, Atomic Transactions)
  // ---------------------------------------------------------------------------
  static async getMonthDeposits(month: string): Promise<Deposit[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.DEPOSITS).get();
    return snap.docs
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((d: any) => d.date && d.date.startsWith(month));
  }

  static async getAllDeposits(): Promise<Deposit[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.DEPOSITS).get();
    const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }

  static async getMemberDeposits(memberId: string): Promise<Deposit[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.DEPOSITS).where('memberId', '==', memberId).get();
    const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }

  static async createDepositRequest(data: {
    memberId: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
    date: string;
    note?: string;
  }): Promise<Deposit> {
    const db = getFirestore();
    const id = `dep_${Date.now()}`;

    // If mobile payment method, ensure unique transactionId
    if (data.transactionId && data.transactionId.trim()) {
      const cleanTxn = data.transactionId.trim();
      await reserveUniqueLookup('txn', `${data.paymentMethod}__${cleanTxn}`, id, 'এই ট্রানজেকশন আইডি ইতিমধ্যে ব্যবহৃত হয়েছে।');
    }

    const record: Deposit = {
      id,
      memberId: data.memberId,
      date: data.date,
      amount: roundMoney(data.amount),
      requestedAmount: roundMoney(data.amount),
      paymentMethod: data.paymentMethod as any,
      transactionId: data.transactionId?.trim() || undefined,
      status: 'pending',
      note: data.note || '',
      createdAt: new Date().toISOString(),
    };

    await db.collection(Collections.DEPOSITS).doc(id).set(record);
    return record;
  }

  static async approveDeposit(
    depositId: string,
    approvedAmount?: number,
    adminName: string = 'Admin'
  ): Promise<{ success: boolean; deposit?: Deposit; error?: string }> {
    const db = getFirestore();
    const docRef = db.collection(Collections.DEPOSITS).doc(depositId);

    try {
      const res = await db.runTransaction(async (t: any) => {
        const snap = await t.get(docRef);
        if (!snap.exists) throw new Error('জমা রিকোয়েস্ট পাওয়া যায়নি।');
        const d = snap.data();
        if (d.status === 'approved') {
          return { success: false, error: 'এই জমা ইতিমধ্যে অনুমোদিত হয়েছে।' };
        }

        const finalAmount = approvedAmount !== undefined ? roundMoney(approvedAmount) : d.amount;
        const updatedDoc = {
          ...d,
          amount: finalAmount,
          status: 'approved',
          approvedBy: adminName,
          approvedAt: new Date().toISOString(),
        };

        t.set(docRef, updatedDoc);
        return { success: true, deposit: updatedDoc };
      });

      if (res.success) {
        invalidateMonthlyCache();
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async rejectDeposit(depositId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const db = getFirestore();
    const docRef = db.collection(Collections.DEPOSITS).doc(depositId);
    const snap = await docRef.get();
    if (!snap.exists) return { success: false, error: 'জমা রিকোয়েস্ট পাওয়া যায়নি।' };
    await docRef.update({
      status: 'rejected',
      rejectionReason: reason || 'বাতিল করা হয়েছে',
      rejectedAt: new Date().toISOString(),
    });
    return { success: true };
  }

  static async addDirectDeposit(data: any): Promise<Deposit> {
    const db = getFirestore();
    const id = data.id || `dep_${Date.now()}`;
    const record: Deposit = {
      id,
      memberId: data.memberId,
      date: data.date,
      amount: roundMoney(Number(data.amount) || 0),
      paymentMethod: data.paymentMethod || 'Cash',
      status: 'approved',
      approvedBy: 'Admin',
      approvedAt: new Date().toISOString(),
      note: data.note || '',
      createdAt: new Date().toISOString(),
    };
    await db.collection(Collections.DEPOSITS).doc(id).set(record);
    invalidateMonthlyCache(data.date.substring(0, 7));
    return record;
  }

  static async deleteDeposit(id: string): Promise<void> {
    const db = getFirestore();
    await db.collection(Collections.DEPOSITS).doc(id).delete();
    invalidateMonthlyCache();
  }

  // ---------------------------------------------------------------------------
  // Fixed Expenses
  // ---------------------------------------------------------------------------
  static async getMonthFixedExpenses(month: string): Promise<FixedExpense[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.FIXED_EXPENSES).where('month', '==', month).get();
    return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
  }

  static async addFixedExpense(data: any): Promise<FixedExpense> {
    const db = getFirestore();
    const id = data.id || `fix_${Date.now()}`;
    const record: FixedExpense = {
      id,
      month: data.month,
      title: data.title,
      amount: roundMoney(Number(data.amount) || 0),
      paidByMemberId: data.paidByMemberId || 'MESS_FUND',
      createdAt: new Date().toISOString(),
    };
    await db.collection(Collections.FIXED_EXPENSES).doc(id).set(record);
    invalidateMonthlyCache(data.month);
    return record;
  }

  static async updateFixedExpense(id: string, updates: any): Promise<FixedExpense> {
    const db = getFirestore();
    const docRef = db.collection(Collections.FIXED_EXPENSES).doc(id);
    const snap = await docRef.get();
    if (!snap.exists) throw new Error('ফিক্সড খরচ পাওয়া যায়নি।');
    const prev = snap.data();
    const updated = { ...prev, ...updates };
    await docRef.update(updated);
    invalidateMonthlyCache();
    return { id, ...updated };
  }

  static async deleteFixedExpense(id: string): Promise<void> {
    const db = getFirestore();
    await db.collection(Collections.FIXED_EXPENSES).doc(id).delete();
    invalidateMonthlyCache();
  }

  // ---------------------------------------------------------------------------
  // Tomorrow Votes
  // ---------------------------------------------------------------------------
  static async getTomorrowVotes(): Promise<Record<string, any>> {
    const db = getFirestore();
    const snap = await db.collection(Collections.TOMORROW_VOTES).get();
    const result: Record<string, any> = {};
    snap.docs.forEach((doc: any) => {
      result[doc.id] = doc.data();
    });
    return result;
  }

  static async saveTomorrowVote(memberId: string, choice: string, targetDate: string): Promise<void> {
    const db = getFirestore();
    await db.collection(Collections.TOMORROW_VOTES).doc(memberId).set({
      choice,
      targetDate,
      votedAt: new Date().toISOString(),
    });
  }

  // ---------------------------------------------------------------------------
  // Orders (Catering Orders)
  // ---------------------------------------------------------------------------
  static async getOrders(): Promise<any[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.ORDERS).get();
    const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return list;
  }

  static async createOrder(data: any): Promise<any> {
    const db = getFirestore();
    const id = `ord_${Date.now()}`;
    const orderDoc = {
      ...data,
      id,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    await db.collection(Collections.ORDERS).doc(id).set(orderDoc);
    return orderDoc;
  }

  static async updateOrderStatus(
    id: string,
    status?: string,
    internalNote?: string,
    finalPrice?: number
  ): Promise<any> {
    const db = getFirestore();
    const updates: any = { updatedAt: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (internalNote !== undefined) updates.internalNote = internalNote;
    if (finalPrice !== undefined) updates.finalPrice = Number(finalPrice);
    await db.collection(Collections.ORDERS).doc(id).update(updates);
    const snap = await db.collection(Collections.ORDERS).doc(id).get();
    return { id, ...snap.data() };
  }

  // ---------------------------------------------------------------------------
  // WhatsApp Message Logs (Part D)
  // ---------------------------------------------------------------------------
  static async logWhatsAppMessage(data: {
    memberId?: string;
    phone: string;
    messageType: string;
    status: 'sent' | 'failed';
    error?: string;
    text?: string;
  }): Promise<void> {
    const db = getFirestore();
    const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.collection(Collections.WHATSAPP_MESSAGES).doc(id).set({
      ...data,
      timestamp: new Date().toISOString(),
      bangladeshTime: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }),
    });
  }

  static async getWhatsAppLogs(limitVal: number = 50): Promise<any[]> {
    const db = getFirestore();
    const snap = await db.collection(Collections.WHATSAPP_MESSAGES).limit(limitVal).get();
    const list = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    list.sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''));
    return list;
  }

  // ---------------------------------------------------------------------------
  // Monthly Summary & Member Isolated Portal Data
  // ---------------------------------------------------------------------------
  static async getMonthlySummary(month: string) {
    const allMembers = await this.getAllMembers();
    const monthMeals = await this.getMonthMeals(month);
    const monthBazar = await this.getMonthBazar(month);
    const monthDeposits = await this.getMonthDeposits(month);
    const monthFixed = await this.getMonthFixedExpenses(month);
    const settings = await this.getSettings();

    return calculateMonthlySummary(
      month,
      allMembers,
      monthMeals,
      monthBazar,
      monthDeposits,
      monthFixed,
      settings
    );
  }

  static async getIsolatedMemberData(memberId: string, month: string) {
    const member = await this.getMemberById(memberId);
    if (!member) return null;

    const allMembers = await this.getAllMembers();
    const monthMeals = await this.getMonthMeals(month);
    const monthBazar = await this.getMonthBazar(month);
    const monthDeposits = await this.getMonthDeposits(month);
    const monthFixed = await this.getMonthFixedExpenses(month);
    const settings = await this.getSettings();

    const accounting = calculateMemberAccounting(
      memberId,
      month,
      allMembers,
      monthMeals,
      monthBazar,
      monthDeposits,
      monthFixed,
      settings
    );

    const myMeals = monthMeals.filter((m) => m.memberId === memberId);
    const myDeposits = monthDeposits.filter((d) => d.memberId === memberId);

    const db = getFirestore();
    const voteDoc = await db.collection(Collections.TOMORROW_VOTES).doc(memberId).get();
    const tomorrowVote = voteDoc.exists ? voteDoc.data() : null;

    return {
      member: {
        id: member.id,
        fullName: member.fullName,
        nickname: member.nickname,
        phone: member.phone,
        email: member.email,
        address: member.address,
        studentId: member.studentId,
        notes: member.notes,
        isActive: member.isActive,
      },
      meals: myMeals,
      deposits: myDeposits,
      tomorrowVote,
      accounting,
    };
  }
}
