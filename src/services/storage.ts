import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
} from '../types';
import {
  initialMembers,
  generateInitialMeals,
  initialBazarExpenses,
  initialDeposits,
  initialFixedExpenses,
  initialSettings,
} from './sampleData';

const STORAGE_KEYS = {
  MEMBERS: 'messmate_members_v1',
  MEALS: 'messmate_meals_v1',
  BAZAR: 'messmate_bazar_v1',
  DEPOSITS: 'messmate_deposits_v1',
  FIXED_EXPENSES: 'messmate_fixed_v1',
  SETTINGS: 'messmate_settings_v1',
};

export class StorageService {
  static getMembers(): Member[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (!data) {
        this.saveMembers(initialMembers);
        return initialMembers;
      }
      return JSON.parse(data);
    } catch {
      return initialMembers;
    }
  }

  static saveMembers(members: Member[]): void {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }

  static getMeals(): MealRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEALS);
      if (!data) {
        const initial = generateInitialMeals();
        this.saveMeals(initial);
        return initial;
      }
      return JSON.parse(data);
    } catch {
      return generateInitialMeals();
    }
  }

  static saveMeals(meals: MealRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
  }

  static getBazar(): BazarExpense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BAZAR);
      if (!data) {
        this.saveBazar(initialBazarExpenses);
        return initialBazarExpenses;
      }
      return JSON.parse(data);
    } catch {
      return initialBazarExpenses;
    }
  }

  static saveBazar(bazar: BazarExpense[]): void {
    localStorage.setItem(STORAGE_KEYS.BAZAR, JSON.stringify(bazar));
  }

  static getDeposits(): Deposit[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DEPOSITS);
      if (!data) {
        this.saveDeposits(initialDeposits);
        return initialDeposits;
      }
      return JSON.parse(data);
    } catch {
      return initialDeposits;
    }
  }

  static saveDeposits(deposits: Deposit[]): void {
    localStorage.setItem(STORAGE_KEYS.DEPOSITS, JSON.stringify(deposits));
  }

  static getFixedExpenses(): FixedExpense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FIXED_EXPENSES);
      if (!data) {
        this.saveFixedExpenses(initialFixedExpenses);
        return initialFixedExpenses;
      }
      return JSON.parse(data);
    } catch {
      return initialFixedExpenses;
    }
  }

  static saveFixedExpenses(fixed: FixedExpense[]): void {
    localStorage.setItem(STORAGE_KEYS.FIXED_EXPENSES, JSON.stringify(fixed));
  }

  static getSettings(): MessSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (!data) {
        this.saveSettings(initialSettings);
        return initialSettings;
      }
      const parsed = JSON.parse(data);
      return {
        ...initialSettings,
        ...parsed,
        showBazarOption: parsed.showBazarOption ?? false,
      };
    } catch {
      return initialSettings;
    }
  }

  static saveSettings(settings: MessSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // Check if member has dependencies before deleting
  static canDeleteMember(
    memberId: string,
    meals: MealRecord[],
    bazarOrDeposits: BazarExpense[] | Deposit[],
    deposits?: Deposit[]
  ): { canDelete: boolean; warning?: string; counts: { meals: number; deposits: number } } {
    const mealCount = meals.filter((m) => m.memberId === memberId && m.mealCount > 0).length;
    
    // Support either (memberId, meals, deposits) or (memberId, meals, bazar, deposits)
    const actualDeposits: Deposit[] = deposits 
      ? deposits 
      : (bazarOrDeposits as Deposit[]);
    
    const depositCount = actualDeposits.filter((d) => d.memberId === memberId).length;

    const totalDeps = mealCount + depositCount;
    if (totalDeps > 0) {
      return {
        canDelete: true,
        warning: `Member has ${mealCount} meals and ${depositCount} deposits recorded.`,
        counts: { meals: mealCount, deposits: depositCount },
      };
    }

    return {
      canDelete: true,
      counts: { meals: 0, deposits: 0 },
    };
  }

  // Complete Database Backup (JSON export)
  static createBackup(): string {
    const backup = {
      version: 1,
      appName: 'MessMate',
      exportedAt: new Date().toISOString(),
      data: {
        members: this.getMembers(),
        meals: this.getMeals(),
        bazar: this.getBazar(),
        deposits: this.getDeposits(),
        fixedExpenses: this.getFixedExpenses(),
        settings: this.getSettings(),
      },
    };
    return JSON.stringify(backup, null, 2);
  }

  // Restore from JSON string
  static restoreBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) {
        return { success: false, message: 'Invalid backup file format.' };
      }
      const { members, meals, bazar, deposits, fixedExpenses, settings } = parsed.data;

      if (Array.isArray(members)) this.saveMembers(members);
      if (Array.isArray(meals)) this.saveMeals(meals);
      if (Array.isArray(bazar)) this.saveBazar(bazar);
      if (Array.isArray(deposits)) this.saveDeposits(deposits);
      if (Array.isArray(fixedExpenses)) this.saveFixedExpenses(fixedExpenses);
      if (settings) this.saveSettings(settings);

      return { success: true, message: 'Data restored successfully!' };
    } catch (e) {
      return { success: false, message: `Failed to restore: ${(e as Error).message}` };
    }
  }

  // Reset to default sample data
  static resetToSampleData(): void {
    this.saveMembers(initialMembers);
    this.saveMeals(generateInitialMeals());
    this.saveBazar(initialBazarExpenses);
    this.saveDeposits(initialDeposits);
    this.saveFixedExpenses(initialFixedExpenses);
    this.saveSettings(initialSettings);
  }

  // Clear all data (starts fresh)
  static clearAllData(): void {
    this.saveMembers([]);
    this.saveMeals([]);
    this.saveBazar([]);
    this.saveDeposits([]);
    this.saveFixedExpenses([]);
  }
}
