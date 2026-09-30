import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { calculateMemberAccounting } from '../src/services/calculations';

export interface AdminAccount {
  email: string;
  passwordHash: string;
  mustChangePassword: boolean;
}

export interface MessDataStore {
  members: any[];
  meals: any[];
  bazar: any[];
  deposits: any[];
  fixedExpenses: any[];
  settings: any;
  adminPin: string; // bcrypt hash
  adminAccount: AdminAccount;
  tomorrowVotes?: Record<string, { choice: string; votedAt: string; targetDate: string }>;
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'mess_store.json');

function isBcryptHash(val: string): boolean {
  return typeof val === 'string' && (val.startsWith('$2a$') || val.startsWith('$2b$'));
}

const DEFAULT_SETTINGS = {
  appName: 'MessMate',
  messName: 'MessMate',
  logo: undefined,
  subtitle: 'Smart Mess Meal Management',
  currency: '৳',
  mealRateMode: 'bazar_only',
  defaultMealsPerDay: 2,
  theme: 'light',
  showBazarOption: false,
  fixedMealRate: 50,
  managerName: 'Abidul Safat',
  managerPhone: '01712345678',
  whatsappGateway: {
    provider: 'ultramsg',
    instanceId: 'instance192286',
  },
};

const DEFAULT_MEMBERS = [
  {
    id: 'mem-1',
    fullName: 'Abidul Safat',
    nickname: 'Safat',
    phone: '01712345678',
    email: 'abidulsafat85@gmail.com',
    password: bcrypt.hashSync('ChangeMe123!', 10),
    pin: bcrypt.hashSync('1234', 10),
    joinDate: '2026-01-01',
    initialDeposit: 0,
    isActive: true,
    notes: 'Mess Manager / Room 401',
  },
  {
    id: 'mem-2',
    fullName: 'Abdur Rahim',
    nickname: 'Rahim',
    phone: '01812345679',
    email: 'rahim@gmail.com',
    password: bcrypt.hashSync('ChangeMe123!', 10),
    pin: bcrypt.hashSync('1234', 10),
    joinDate: '2026-01-01',
    initialDeposit: 0,
    isActive: true,
    notes: 'Room 401',
  },
  {
    id: 'mem-3',
    fullName: 'Rezaul Karim',
    nickname: 'Karim',
    phone: '01912345680',
    email: 'karim@gmail.com',
    password: bcrypt.hashSync('ChangeMe123!', 10),
    pin: bcrypt.hashSync('1234', 10),
    joinDate: '2026-02-15',
    initialDeposit: 0,
    isActive: true,
    notes: 'Room 402',
  },
  {
    id: 'mem-4',
    fullName: 'Mahmudul Hasan',
    nickname: 'Hasan',
    phone: '01612345681',
    email: 'hasan@gmail.com',
    password: bcrypt.hashSync('ChangeMe123!', 10),
    pin: bcrypt.hashSync('1234', 10),
    joinDate: '2026-01-01',
    initialDeposit: 0,
    isActive: true,
    notes: 'Room 402',
  },
  {
    id: 'mem-5',
    fullName: 'Tanvir Ahmed',
    nickname: 'Tanvir',
    phone: '01512345682',
    email: 'tanvir@gmail.com',
    password: bcrypt.hashSync('ChangeMe123!', 10),
    pin: bcrypt.hashSync('1234', 10),
    joinDate: '2026-03-01',
    initialDeposit: 0,
    isActive: true,
    notes: 'Room 403',
  },
  {
    id: 'mem-6',
    fullName: 'Shakil Hossain',
    nickname: 'Shakil',
    phone: '01312345683',
    email: 'shakil@gmail.com',
    password: bcrypt.hashSync('ChangeMe123!', 10),
    pin: bcrypt.hashSync('1234', 10),
    joinDate: '2026-04-01',
    initialDeposit: 0,
    isActive: true,
    notes: 'Room 403',
  },
];

function generateSeedMeals(): any[] {
  const records: any[] = [];
  const days = 19;
  for (let d = 1; d <= days; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const date = `2026-09-${dayStr}`;

    records.push({
      id: `meal-${date}-mem-1`,
      date,
      memberId: 'mem-1',
      mealCount: d === 10 ? 1 : 2,
      lunch: true,
      dinner: d !== 10,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    records.push({
      id: `meal-${date}-mem-2`,
      date,
      memberId: 'mem-2',
      mealCount: d === 5 ? 0 : 2,
      lunch: d !== 5,
      dinner: d !== 5,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    const karimMeals = (d >= 8 && d <= 14) || d === 19 ? 0 : (d % 3 === 0 ? 1 : 2);
    records.push({
      id: `meal-${date}-mem-3`,
      date,
      memberId: 'mem-3',
      mealCount: karimMeals,
      lunch: karimMeals >= 1,
      dinner: karimMeals >= 2,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    records.push({
      id: `meal-${date}-mem-4`,
      date,
      memberId: 'mem-4',
      mealCount: d % 4 === 0 ? 1 : 2,
      lunch: true,
      dinner: d % 4 !== 0,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    records.push({
      id: `meal-${date}-mem-5`,
      date,
      memberId: 'mem-5',
      mealCount: 2,
      lunch: true,
      dinner: true,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    records.push({
      id: `meal-${date}-mem-6`,
      date,
      memberId: 'mem-6',
      mealCount: d === 12 ? 0 : 2,
      lunch: d !== 12,
      dinner: d !== 12,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });
  }
  return records;
}

export class MessStore {
  private static instance: MessStore;
  private state: MessDataStore;

  private constructor() {
    this.state = this.loadFromFile();
  }

  public static getInstance(): MessStore {
    if (!MessStore.instance) {
      MessStore.instance = new MessStore();
    }
    return MessStore.instance;
  }

  private loadFromFile(): MessDataStore {
    let hasChanges = false;
    const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || '12345';

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed: any = JSON.parse(raw);

        // 1. Admin Account Initialization & Migration
        if (!parsed.adminAccount) {
          parsed.adminAccount = {
            email: 'abidulsafat85@gmail.com',
            passwordHash: bcrypt.hashSync(initialAdminPassword, 10),
            mustChangePassword: true,
          };
          hasChanges = true;
        } else if (!isBcryptHash(parsed.adminAccount.passwordHash)) {
          parsed.adminAccount.passwordHash = bcrypt.hashSync(parsed.adminAccount.passwordHash || initialAdminPassword, 10);
          hasChanges = true;
        }

        // 2. Member Passwords and PINs Migration (Hash plaintext with bcrypt)
        if (Array.isArray(parsed.members)) {
          const defaultEmails: Record<string, string> = {
            'mem-1': 'abidulsafat85@gmail.com',
            'mem-2': 'rahim@gmail.com',
            'mem-3': 'karim@gmail.com',
            'mem-4': 'hasan@gmail.com',
            'mem-5': 'tanvir@gmail.com',
            'mem-6': 'shakil@gmail.com',
          };

          parsed.members.forEach((m: any) => {
            if (!m.email) {
              m.email = defaultEmails[m.id] || `${m.id}@messmate.app`;
              hasChanges = true;
            }
            if (m.password && !isBcryptHash(m.password)) {
              m.password = bcrypt.hashSync(String(m.password), 10);
              hasChanges = true;
            } else if (!m.password) {
              m.password = bcrypt.hashSync('ChangeMe123!', 10);
              hasChanges = true;
            }
            if (m.pin && !isBcryptHash(m.pin)) {
              m.pin = bcrypt.hashSync(String(m.pin), 10);
              hasChanges = true;
            } else if (!m.pin) {
              m.pin = bcrypt.hashSync('1234', 10);
              hasChanges = true;
            }
          });
        }

        // 3. Admin PIN Migration
        if (parsed.adminPin && !isBcryptHash(parsed.adminPin)) {
          parsed.adminPin = bcrypt.hashSync(String(parsed.adminPin), 10);
          hasChanges = true;
        } else if (!parsed.adminPin) {
          parsed.adminPin = bcrypt.hashSync('1234', 10);
          hasChanges = true;
        }

        // 4. Ensure settings adminPin is removed or synced
        if (parsed.settings?.adminPin) {
          delete parsed.settings.adminPin;
          hasChanges = true;
        }

        if (hasChanges) {
          this.saveToFile(parsed);
        }

        return parsed;
      }
    } catch (e) {
      console.error('[MessStore] Error reading store file:', e);
    }

    // Default Seed on very first launch
    const initialStore: MessDataStore = {
      adminAccount: {
        email: 'abidulsafat85@gmail.com',
        passwordHash: bcrypt.hashSync(initialAdminPassword, 10),
        mustChangePassword: true,
      },
      members: DEFAULT_MEMBERS,
      meals: generateSeedMeals(),
      bazar: [],
      deposits: [
        {
          id: 'dep-sep-1-mem-1',
          memberId: 'mem-1',
          date: '2026-09-01',
          amount: 3000,
          paymentMethod: 'bKash',
          note: 'September Initial Deposit',
          createdAt: '2026-09-01T10:00:00Z',
        },
        {
          id: 'dep-sep-1-mem-2',
          memberId: 'mem-2',
          date: '2026-09-01',
          amount: 2500,
          paymentMethod: 'Cash',
          note: 'September Initial Deposit',
          createdAt: '2026-09-01T10:30:00Z',
        },
        {
          id: 'dep-sep-1-mem-3',
          memberId: 'mem-3',
          date: '2026-09-02',
          amount: 2000,
          paymentMethod: 'Nagad',
          note: 'September Initial Deposit',
          createdAt: '2026-09-02T14:00:00Z',
        },
        {
          id: 'dep-sep-1-mem-4',
          memberId: 'mem-4',
          date: '2026-09-01',
          amount: 2500,
          paymentMethod: 'Cash',
          note: 'September Initial Deposit',
          createdAt: '2026-09-01T11:00:00Z',
        },
        {
          id: 'dep-sep-1-mem-5',
          memberId: 'mem-5',
          date: '2026-09-03',
          amount: 2500,
          paymentMethod: 'bKash',
          note: 'September Initial Deposit',
          createdAt: '2026-09-03T09:00:00Z',
        },
        {
          id: 'dep-sep-1-mem-6',
          memberId: 'mem-6',
          date: '2026-09-01',
          amount: 2500,
          paymentMethod: 'Cash',
          note: 'September Initial Deposit',
          createdAt: '2026-09-01T11:30:00Z',
        },
      ],
      fixedExpenses: [
        {
          id: 'fix-sep-1',
          month: '2026-09',
          title: 'Cook / Bua Bill',
          amount: 4500,
          paidByMemberId: 'MESS_FUND',
          createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'fix-sep-2',
          month: '2026-09',
          title: 'WiFi Internet',
          amount: 800,
          paidByMemberId: 'MESS_FUND',
          createdAt: '2026-09-01T00:00:00Z',
        },
        {
          id: 'fix-sep-3',
          month: '2026-09',
          title: 'Waste & Cleaning',
          amount: 200,
          paidByMemberId: 'MESS_FUND',
          createdAt: '2026-09-01T00:00:00Z',
        },
      ],
      settings: DEFAULT_SETTINGS,
      adminPin: bcrypt.hashSync('1234', 10),
      tomorrowVotes: {},
      lastUpdated: new Date().toISOString(),
    };

    this.saveToFile(initialStore);
    return initialStore;
  }

  private saveToFile(data?: MessDataStore): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const toWrite = data || this.state;
      toWrite.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DATA_FILE, JSON.stringify(toWrite, null, 2), 'utf-8');
    } catch (e) {
      console.error('[MessStore] Error writing store file:', e);
    }
  }

  // Internal raw access for server-side logic
  public getRawState(): MessDataStore {
    return this.state;
  }

  // Sanitized state for client-facing API responses (Never exposes passwords, PINs, or gateway tokens)
  public getSanitizedState(): any {
    const safeMembers = (this.state.members || []).map((m: any) => {
      // Exclude password and pin
      const { password, pin, ...safe } = m;
      return safe;
    });

    const branding = this.getBranding();
    const safeSettings = { ...this.state.settings };
    safeSettings.appName = branding.appName;
    safeSettings.messName = branding.appName;
    safeSettings.logo = branding.logo;
    delete safeSettings.adminPin;
    if (safeSettings.whatsappGateway) {
      safeSettings.whatsappGateway = {
        provider: safeSettings.whatsappGateway.provider,
        instanceId: safeSettings.whatsappGateway.instanceId,
        hasToken: Boolean(process.env.WHATSAPP_GATEWAY_TOKEN || process.env.ULTRAMSG_TOKEN),
      };
    }

    return {
      members: safeMembers,
      meals: this.state.meals,
      bazar: this.state.bazar,
      deposits: this.state.deposits,
      fixedExpenses: this.state.fixedExpenses,
      settings: safeSettings,
      tomorrowVotes: this.state.tomorrowVotes,
      lastUpdated: this.state.lastUpdated,
      adminAccount: {
        email: this.state.adminAccount?.email || 'abidulsafat85@gmail.com',
        mustChangePassword: Boolean(this.state.adminAccount?.mustChangePassword),
      },
    };
  }

  // Branding: Read central App Name and Logo
  public getBranding(): { appName: string; logo?: string } {
    const appName = this.state.settings?.appName || this.state.settings?.messName || 'MessMate';
    return {
      appName,
      logo: this.state.settings?.logo || undefined,
    };
  }

  // Branding: Update central App Name and Logo (Admin only)
  public updateBranding(appName?: string, logo?: string | null): { appName: string; logo?: string } {
    const cleanName = (appName || '').trim() || 'MessMate';
    if (!this.state.settings) {
      this.state.settings = { ...DEFAULT_SETTINGS };
    }
    this.state.settings.appName = cleanName;
    this.state.settings.messName = cleanName;

    if (logo === null || logo === '') {
      delete this.state.settings.logo;
    } else if (logo !== undefined) {
      this.state.settings.logo = logo;
    }

    this.saveToFile();
    return this.getBranding();
  }

  public setState(newState: Partial<MessDataStore>): any {
    // If incoming members array has any new member without bcrypt hash, hash their credentials
    let processedMembers = this.state.members;
    if (Array.isArray(newState.members)) {
      processedMembers = newState.members.map((incomingMember: any) => {
        const existing = this.state.members.find((m) => m.id === incomingMember.id);
        let password = incomingMember.password || existing?.password || bcrypt.hashSync('ChangeMe123!', 10);
        let pin = incomingMember.pin || existing?.pin || bcrypt.hashSync('1234', 10);

        if (!isBcryptHash(password)) {
          password = bcrypt.hashSync(String(password), 10);
        }
        if (!isBcryptHash(pin)) {
          pin = bcrypt.hashSync(String(pin), 10);
        }

        return {
          ...incomingMember,
          password,
          pin,
        };
      });
    }

    this.state = {
      ...this.state,
      ...newState,
      members: processedMembers,
      lastUpdated: new Date().toISOString(),
    };
    this.saveToFile();
    return this.getSanitizedState();
  }

  // Update a single member's meal for a specific date
  public updateMemberMeal(date: string, memberId: string, mealCount: number, lunch?: boolean, dinner?: boolean): any {
    const existingIndex = this.state.meals.findIndex((m) => m.date === date && m.memberId === memberId);
    const updatedRecord = {
      id: existingIndex >= 0 ? this.state.meals[existingIndex].id : `meal-${date}-${memberId}`,
      date,
      memberId,
      mealCount,
      lunch: lunch !== undefined ? lunch : mealCount >= 1,
      dinner: dinner !== undefined ? dinner : mealCount >= 2,
      createdAt: existingIndex >= 0 ? this.state.meals[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.state.meals[existingIndex] = updatedRecord;
    } else {
      this.state.meals.push(updatedRecord);
    }

    this.saveToFile();
    return updatedRecord;
  }

  // Record a deposit made by a member
  public addDeposit(deposit: any): any {
    const newDep = {
      id: deposit.id || `dep-${Date.now()}`,
      memberId: deposit.memberId,
      date: deposit.date || new Date().toISOString().split('T')[0],
      amount: Number(deposit.amount) || 0,
      paymentMethod: deposit.paymentMethod || 'bKash',
      note: deposit.note || 'Self-submitted Deposit',
      createdAt: new Date().toISOString(),
    };

    this.state.deposits = [newDep, ...this.state.deposits];
    this.saveToFile();
    return newDep;
  }

  // Record a bazar expense made by a member
  public addBazar(bazar: any): any {
    const newBazar = {
      id: bazar.id || `bazar-${Date.now()}`,
      date: bazar.date || new Date().toISOString().split('T')[0],
      description: bazar.description || 'Bazar items',
      category: bazar.category || 'Grocery',
      amount: Number(bazar.amount) || 0,
      paidByMemberId: bazar.paidByMemberId,
      note: bazar.note || '',
      createdAt: new Date().toISOString(),
    };

    this.state.bazar = [newBazar, ...this.state.bazar];
    this.saveToFile();
    return newBazar;
  }

  // Update member advance meal vote for tomorrow
  public setTomorrowVote(memberId: string, choice: string, targetDate: string): any {
    if (!this.state.tomorrowVotes) {
      this.state.tomorrowVotes = {};
    }
    this.state.tomorrowVotes[memberId] = {
      choice,
      targetDate,
      votedAt: new Date().toISOString(),
    };

    // Also auto-update the meal record for targetDate
    let lunch = false;
    let dinner = false;
    let mealCount = 0;

    if (choice === 'BOTH') {
      lunch = true;
      dinner = true;
      mealCount = 2;
    } else if (choice === 'LUNCH_ONLY') {
      lunch = true;
      dinner = false;
      mealCount = 1;
    } else if (choice === 'DINNER_ONLY') {
      lunch = false;
      dinner = true;
      mealCount = 1;
    } else if (choice === 'NONE') {
      lunch = false;
      dinner = false;
      mealCount = 0;
    }

    this.updateMemberMeal(targetDate, memberId, mealCount, lunch, dinner);
    this.saveToFile();
    return this.state.tomorrowVotes[memberId];
  }

  // Member PIN update (Requires correct old PIN)
  public updateMemberPin(memberId: string, oldPin: string, newPin: string): { success: boolean; error?: string } {
    const member = this.state.members.find((m) => m.id === memberId);
    if (!member) {
      return { success: false, error: 'মেম্বার খুঁজে পাওয়া যায়নি।' };
    }

    if (!oldPin) {
      return { success: false, error: 'বর্তমান পিন দেওয়া আবশ্যক (Old PIN is required)' };
    }

    if (!member.pin || !bcrypt.compareSync(String(oldPin).trim(), member.pin)) {
      return { success: false, error: 'বর্তমান পিন ভুল হয়েছে (Current PIN is incorrect)' };
    }

    const trimmedNewPin = String(newPin || '').trim();
    if (trimmedNewPin.length < 4) {
      return { success: false, error: 'নতুন পিন কমপক্ষে ৪ ডিজিটের হতে হবে।' };
    }

    member.pin = bcrypt.hashSync(trimmedNewPin, 10);
    this.saveToFile();
    return { success: true };
  }

  // Admin PIN update (Requires correct old PIN)
  public updateAdminPin(oldPin: string, newPin: string): { success: boolean; error?: string } {
    if (!oldPin) {
      return { success: false, error: 'বর্তমান এডমিন পিন দেওয়া আবশ্যক।' };
    }

    if (!bcrypt.compareSync(String(oldPin).trim(), this.state.adminPin)) {
      return { success: false, error: 'বর্তমান এডমিন পিন ভুল।' };
    }

    const trimmedNewPin = String(newPin || '').trim();
    if (trimmedNewPin.length < 4) {
      return { success: false, error: 'এডমিন পিন কমপক্ষে ৪ ডিজিটের হতে হবে।' };
    }

    this.state.adminPin = bcrypt.hashSync(trimmedNewPin, 10);
    this.saveToFile();
    return { success: true };
  }

  // Verify Admin PIN
  public verifyAdminPin(pin: string): boolean {
    if (!pin) return false;
    return bcrypt.compareSync(String(pin).trim(), this.state.adminPin);
  }

  // Verify Member PIN
  public verifyMemberPin(memberId: string, pin: string): { verified: boolean; member?: any } {
    const member = this.state.members.find((m) => m.id === memberId);
    if (!member || !member.pin) return { verified: false };
    const matches = bcrypt.compareSync(String(pin).trim(), member.pin);
    return { verified: matches, member: matches ? member : undefined };
  }

  // Admin First Login: Forced Password Change
  public adminFirstChangePassword(newPassword: string): { success: boolean; error?: string } {
    const trimmed = String(newPassword || '').trim();
    if (trimmed.length < 8) {
      return { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে (At least 8 characters required).' };
    }
    if (trimmed === '12345') {
      return { success: false, error: "নতুন পাসওয়ার্ড '12345' হওয়া যাবে না।" };
    }

    this.state.adminAccount.passwordHash = bcrypt.hashSync(trimmed, 10);
    this.state.adminAccount.mustChangePassword = false;
    this.saveToFile();
    return { success: true };
  }

  // Admin Change Password from Settings
  public adminChangePassword(currentPassword: string, newPassword: string): { success: boolean; error?: string } {
    const currentTrimmed = String(currentPassword || '').trim();
    if (!bcrypt.compareSync(currentTrimmed, this.state.adminAccount.passwordHash)) {
      return { success: false, error: 'বর্তমান পাসওয়ার্ড ভুল হয়েছে (Current password is incorrect).' };
    }

    const newTrimmed = String(newPassword || '').trim();
    if (newTrimmed.length < 8) {
      return { success: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে (At least 8 characters required).' };
    }
    if (newTrimmed === '12345') {
      return { success: false, error: "নতুন পাসওয়ার্ড '12345' হওয়া যাবে না।" };
    }

    this.state.adminAccount.passwordHash = bcrypt.hashSync(newTrimmed, 10);
    this.state.adminAccount.mustChangePassword = false;
    this.saveToFile();
    return { success: true };
  }

  // Get strictly isolated data for a member: CANNOT see others! Never sends password or PIN!
  public getIsolatedMemberData(memberId: string, selectedMonth: string): any {
    const member = this.state.members.find((m) => m.id === memberId);
    if (!member) {
      return null;
    }

    const myMeals = this.state.meals.filter((m) => m.memberId === memberId);
    const myDeposits = this.state.deposits.filter((d) => d.memberId === memberId);
    const myBazar = this.state.bazar.filter((b) => b.paidByMemberId === memberId);

    // Call unified shared accounting calculation (100% consistent with Admin Dashboard)
    const accounting = calculateMemberAccounting(
      memberId,
      selectedMonth,
      this.state.members,
      this.state.meals,
      this.state.bazar,
      this.state.deposits,
      this.state.fixedExpenses,
      this.state.settings
    );

    const branding = this.getBranding();
    const safeSettings = {
      appName: branding.appName,
      messName: branding.appName,
      logo: branding.logo,
      subtitle: this.state.settings?.subtitle || 'Smart Mess Meal Management',
      currency: this.state.settings?.currency || '৳',
      managerName: this.state.settings?.managerName || 'Abidul Safat',
      managerPhone: this.state.settings?.managerPhone || '01712345678',
      showBazarOption: this.state.settings?.showBazarOption ?? false,
      defaultMealsPerDay: this.state.settings?.defaultMealsPerDay || 2,
    };

    return {
      member: {
        id: member.id,
        fullName: member.fullName,
        nickname: member.nickname,
        phone: member.phone,
        notes: member.notes,
        isActive: member.isActive,
      },
      meals: myMeals,
      deposits: myDeposits,
      bazar: myBazar,
      tomorrowVote: this.state.tomorrowVotes?.[memberId] || null,
      accounting,
      settings: safeSettings,
    };
  }

  // Email and Password Login
  public loginUser(
    email: string,
    password?: string
  ): {
    success: boolean;
    role: 'admin' | 'member';
    memberId?: string;
    mustChangePassword?: boolean;
    user: any;
    error?: string;
  } {
    const normEmail = String(email || '').trim().toLowerCase();

    if (!normEmail) {
      return { success: false, role: 'member', user: null, error: 'ইমেইল অ্যাড্রেস লিখুন' };
    }

    // ADMIN CHECK: abidulsafat85@gmail.com
    if (normEmail === 'abidulsafat85@gmail.com') {
      const trimmedPass = String(password || '').trim();
      if (!trimmedPass) {
        return { success: false, role: 'admin', user: null, error: 'এডমিন পাসওয়ার্ড দিন।' };
      }

      const isMatch = bcrypt.compareSync(trimmedPass, this.state.adminAccount.passwordHash);
      if (!isMatch) {
        return {
          success: false,
          role: 'admin',
          user: null,
          error: 'এডমিন পাসওয়ার্ড ভুল হয়েছে! সঠিক পাসওয়ার্ড দিন।',
        };
      }

      const adminMember = this.state.members.find(
        (m: any) => m.id === 'mem-1' || m.email?.toLowerCase() === 'abidulsafat85@gmail.com'
      );

      return {
        success: true,
        role: 'admin',
        mustChangePassword: Boolean(this.state.adminAccount.mustChangePassword),
        memberId: adminMember?.id || 'mem-1',
        user: {
          id: adminMember?.id || 'mem-1',
          email: 'abidulsafat85@gmail.com',
          name: adminMember?.fullName || 'Abidul Safat',
          role: 'admin',
          mustChangePassword: Boolean(this.state.adminAccount.mustChangePassword),
        },
      };
    }

    // ALL OTHER EMAILS: Member Panel
    // Auto-registration on login is removed: Unknown emails get a 'not registered' error
    const member = this.state.members.find(
      (m: any) => m.email && m.email.trim().toLowerCase() === normEmail
    );

    if (!member) {
      return {
        success: false,
        role: 'member',
        user: null,
        error: 'আপনার ইমেইলটি নিবন্ধিত নয়। মেস এডমিনের সাথে যোগাযোগ করুন (Email not registered).',
      };
    }

    // Verify member password if required
    if (member.password) {
      const inputPass = String(password || '').trim();
      const isPassValid = bcrypt.compareSync(inputPass, member.password);
      if (!isPassValid) {
        return {
          success: false,
          role: 'member',
          user: null,
          error: 'পাসওয়ার্ড ভুল হয়েছে! সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।',
        };
      }
    }

    return {
      success: true,
      role: 'member',
      memberId: member.id,
      user: {
        id: member.id,
        email: member.email || normEmail,
        name: member.fullName,
        role: 'member',
      },
    };
  }
}
