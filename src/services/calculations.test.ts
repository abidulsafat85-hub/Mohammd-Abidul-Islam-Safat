import { describe, it, expect } from 'vitest';
import { calculateMonthlySummary, calculateMemberAccounting } from './calculations';
import { Member, MealRecord, BazarExpense, Deposit, FixedExpense, MessSettings } from '../types';

describe('Shared Accounting Calculations', () => {
  const baseSettings: MessSettings = {
    appName: 'MessMate',
    messName: 'MessMate',
    subtitle: 'Smart Mess',
    currency: '৳',
    mealRateMode: 'split_fixed_equally',
    defaultMealsPerDay: 2,
    theme: 'light',
  };

  const members: Member[] = [
    { id: 'm1', fullName: 'Alice', joinDate: '2026-01-01', isActive: true, initialDeposit: 0 },
    { id: 'm2', fullName: 'Bob', joinDate: '2026-01-01', isActive: true, initialDeposit: 0 },
  ];

  it('1. Normal Month with meals, bazar, and equal fixed expense split', () => {
    const meals: MealRecord[] = [
      { id: '1', date: '2026-09-01', memberId: 'm1', mealCount: 20, createdAt: '', updatedAt: '' },
      { id: '2', date: '2026-09-01', memberId: 'm2', mealCount: 30, createdAt: '', updatedAt: '' },
    ];
    // Total meals = 50. Total bazar = 2500 -> mealRate = 50
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-09-02', description: 'Grocery', category: 'Grocery', amount: 2500, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];
    // Fixed expenses = 1000 split across 2 members -> 500 each
    const fixedExpenses: FixedExpense[] = [
      { id: 'f1', month: '2026-09', title: 'WiFi', amount: 1000, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];
    // Deposits: m1 paid 2000, m2 paid 1500
    const deposits: Deposit[] = [
      { id: 'd1', memberId: 'm1', date: '2026-09-01', amount: 2000, paymentMethod: 'bKash', createdAt: '' },
      { id: 'd2', memberId: 'm2', date: '2026-09-01', amount: 1500, paymentMethod: 'Cash', createdAt: '' },
    ];

    const summary = calculateMonthlySummary('2026-09', members, meals, bazar, deposits, fixedExpenses, baseSettings);

    expect(summary.totalMeals).toBe(50);
    expect(summary.mealRate).toBe(50);
    expect(summary.sharedFixedPerMember).toBe(500);

    // m1: meals = 20 * 50 = 1000. fixed = 500. totalCost = 1500. deposits = 2000. balance = +500 (refund)
    const m1 = summary.memberCalculations.find((m) => m.member.id === 'm1')!;
    expect(m1.mealCost).toBe(1000);
    expect(m1.totalCost).toBe(1500);
    expect(m1.balance).toBe(500);
    expect(m1.status).toBe('refund');
    expect(m1.due).toBe(0);

    // m2: meals = 30 * 50 = 1500. fixed = 500. totalCost = 2000. deposits = 1500. balance = -500 (due)
    const m2 = summary.memberCalculations.find((m) => m.member.id === 'm2')!;
    expect(m2.mealCost).toBe(1500);
    expect(m2.totalCost).toBe(2000);
    expect(m2.balance).toBe(-500);
    expect(m2.status).toBe('due');
    expect(m2.due).toBe(500);

    // Client and Server return exact same accounting for m2
    const m2Isolated = calculateMemberAccounting('m2', '2026-09', members, meals, bazar, deposits, fixedExpenses, baseSettings);
    expect(m2Isolated.myBalance).toBe(-500);
    expect(m2Isolated.dueAmount).toBe(500);
    expect(m2Isolated.status).toBe('due');
  });

  it('2. Zero Bazar month (defaults to 0 or fixed rate per meal)', () => {
    const meals: MealRecord[] = [
      { id: '1', date: '2026-09-01', memberId: 'm1', mealCount: 10, createdAt: '', updatedAt: '' },
    ];
    const settingsWithFixedRate: MessSettings = {
      ...baseSettings,
      fixedMealRate: 60,
    };

    const summary = calculateMonthlySummary('2026-09', members, meals, [], [], [], settingsWithFixedRate);
    expect(summary.totalBazarCost).toBe(0);
    expect(summary.mealRate).toBe(0); // With zero bazar and showBazarOption true, rate is 0
  });

  it('3. One member with zero meals', () => {
    const meals: MealRecord[] = [
      { id: '1', date: '2026-09-01', memberId: 'm1', mealCount: 20, createdAt: '', updatedAt: '' },
      // m2 has 0 meals!
    ];
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-09-02', description: 'Bazar', category: 'Grocery', amount: 1000, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];
    const fixedExpenses: FixedExpense[] = [
      { id: 'f1', month: '2026-09', title: 'Cook', amount: 600, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];

    const summary = calculateMonthlySummary('2026-09', members, meals, bazar, [], fixedExpenses, baseSettings);
    const m2 = summary.memberCalculations.find((m) => m.member.id === 'm2')!;

    expect(m2.totalMeals).toBe(0);
    expect(m2.mealCost).toBe(0);
    expect(m2.sharedFixedCost).toBe(300); // 600 / 2 members
    expect(m2.totalCost).toBe(300);
    expect(m2.balance).toBe(-300);
    expect(m2.status).toBe('due');
    expect(m2.due).toBe(300);
  });

  it('4. Member who paid bazar out of pocket is credited', () => {
    const meals: MealRecord[] = [
      { id: '1', date: '2026-09-01', memberId: 'm1', mealCount: 20, createdAt: '', updatedAt: '' },
      { id: '2', date: '2026-09-01', memberId: 'm2', mealCount: 20, createdAt: '', updatedAt: '' },
    ];
    // m1 paid 2000 BDT out of pocket for bazar!
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-09-02', description: 'Meat & Veggies', category: 'Meat', amount: 2000, paidByMemberId: 'm1', createdAt: '' },
    ];
    // No direct cash deposits
    const summary = calculateMonthlySummary('2026-09', members, meals, bazar, [], [], baseSettings);

    const m1 = summary.memberCalculations.find((m) => m.member.id === 'm1')!;
    // Total meals = 40. Bazar = 2000 -> meal rate = 50.
    // m1 meal cost = 20 * 50 = 1000.
    // m1 credits = 2000 (out of pocket bazar).
    // m1 balance = 2000 - 1000 = +1000 (refund due to m1)!
    expect(m1.bazarPaidOutPocket).toBe(2000);
    expect(m1.totalCredits).toBe(2000);
    expect(m1.mealCost).toBe(1000);
    expect(m1.balance).toBe(1000);
    expect(m1.status).toBe('refund');
    expect(m1.due).toBe(0);
  });
});
