import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
} from '../types';
import { DEFAULT_APP_NAME } from '../constants/branding';

const PREF_KEYS = {
  THEME: 'messmate_pref_theme',
  LANG: 'messmate_pref_lang',
};

/**
 * StorageService:
 * Strictly limited to harmless UI preferences (theme, language) per Section 4c.
 * Business data (members, meals, bazar, deposits) is never stored in browser localStorage.
 */
export class StorageService {
  // Theme preference
  static getTheme(): 'light' | 'dark' {
    try {
      const val = localStorage.getItem(PREF_KEYS.THEME);
      return val === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  static setTheme(theme: 'light' | 'dark'): void {
    try {
      localStorage.setItem(PREF_KEYS.THEME, theme);
    } catch {}
  }

  // Language preference
  static getLanguage(): 'bn' | 'en' {
    try {
      const val = localStorage.getItem(PREF_KEYS.LANG);
      return val === 'en' ? 'en' : 'bn';
    } catch {
      return 'bn';
    }
  }

  static setLanguage(lang: 'bn' | 'en'): void {
    try {
      localStorage.setItem(PREF_KEYS.LANG, lang);
    } catch {}
  }

  // Helper to format JSON export for Admin backup download
  static createBackupFromState(data: {
    members: Member[];
    meals: MealRecord[];
    bazar: BazarExpense[];
    deposits: Deposit[];
    fixedExpenses?: FixedExpense[];
    settings?: MessSettings;
  }): string {
    const backup = {
      version: 1,
      appName: data.settings?.appName || DEFAULT_APP_NAME,
      exportedAt: new Date().toISOString(),
      data: {
        members: data.members || [],
        meals: data.meals || [],
        bazar: data.bazar || [],
        deposits: data.deposits || [],
        fixedExpenses: data.fixedExpenses || [],
        settings: data.settings || {},
      },
    };
    return JSON.stringify(backup, null, 2);
  }

  // Legacy compatibility placeholder
  static createBackup(): string {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: {} }, null, 2);
  }

  static restoreBackup(_jsonString: string): { success: boolean; message: string } {
    return { success: true, message: 'Restore should be processed via Server API.' };
  }

  static resetToSampleData(): void {}
  static clearAllData(): void {}
}
