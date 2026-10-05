import { describe, it, expect } from 'vitest';
import {
  calculateMonthlySummary,
  calculateMemberAccounting,
  roundMoney,
} from './calculations';
import { Member, MealRecord, BazarExpense, Deposit, FixedExpense, MessSettings } from '../types';

describe('Shared Accounting Calculations (Part A)', () => {
  const baseSettings: MessSettings = {
    messName: 'MessMate',
    subtitle: 'Smart Mess',
    currency: '৳',
    mealRateMode: 'bazar_only',
    defaultMealsPerDay: 2,
    theme: 'light',
    fixedMealRate: 50,
  };

  const members: Member[] = [
    { id: 'm1', fullName: 'Abidul Safat', phone: '01711111111', joinDate: '2026-01-01', isActive: true, initialDeposit: 0 },
    { id: 'm2', fullName: 'Rahim Karim', phone: '01722222222', joinDate: '2026-01-01', isActive: true, initialDeposit: 0 },
  ];

  it('1. Normal Month: Calculates correct meal rate, costs, credits, and balance', () => {
    const meals: MealRecord[] = [
      { id: 'ml1', date: '2026-10-01', memberId: 'm1', mealCount: 20, createdAt: '', updatedAt: '' },
      { id: 'ml2', date: '2026-10-01', memberId: 'm2', mealCount: 30, createdAt: '', updatedAt: '' },
    ];
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-10-02', description: 'Grocery', category: 'Grocery', amount: 2500, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];
    const deposits: Deposit[] = [
      { id: 'd1', date: '2026-10-01', memberId: 'm1', amount: 1500, paymentMethod: 'Cash', status: 'approved', createdAt: '' },
      { id: 'd2', date: '2026-10-01', memberId: 'm2', amount: 1200, paymentMethod: 'Cash', status: 'approved', createdAt: '' },
    ];
    const fixed: FixedExpense[] = [
      { id: 'f1', month: '2026-10', title: 'WiFi', amount: 600, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];

    // Total meals = 50. Total bazar = 2500. Total fixed = 600.
    // mealRateMode = bazar_only -> mealRate = 2500 / 50 = 50.
    // Shared fixed per member = 600 / 2 = 300.
    const res = calculateMonthlySummary('2026-10', members, meals, bazar, deposits, fixed, baseSettings);

    expect(res.totalMeals).toBe(50);
    expect(res.mealRate).toBe(50);
    expect(res.sharedFixedPerMember).toBe(300);

    const m1 = res.memberCalculations.find((m) => m.member.id === 'm1')!;
    // m1: meals = 20 -> mealCost = 1000. sharedFixed = 300. totalCost = 1300.
    // deposits = 1500. credits = 1500. balance = 1500 - 1300 = +200 (refund).
    expect(m1.mealCost).toBe(1000);
    expect(m1.totalCost).toBe(1300);
    expect(m1.totalCredits).toBe(1500);
    expect(m1.balance).toBe(200);
    expect(m1.status).toBe('refund');
    expect(m1.due).toBe(0);

    const m2 = res.memberCalculations.find((m) => m.member.id === 'm2')!;
    // m2: meals = 30 -> mealCost = 1500. sharedFixed = 300. totalCost = 1800.
    // deposits = 1200. credits = 1200. balance = 1200 - 1800 = -600 (due).
    expect(m2.mealCost).toBe(1500);
    expect(m2.totalCost).toBe(1800);
    expect(m2.totalCredits).toBe(1200);
    expect(m2.balance).toBe(-600);
    expect(m2.status).toBe('due');
    expect(m2.due).toBe(600);
  });

  it('2. Zero Bazar: Uses documented fallback meal rate and does not crash or return NaN', () => {
    const meals: MealRecord[] = [
      { id: 'ml1', date: '2026-10-01', memberId: 'm1', mealCount: 10, createdAt: '', updatedAt: '' },
    ];
    const settings: MessSettings = { ...baseSettings, fixedMealRate: 55 };
    const res = calculateMonthlySummary('2026-10', members, meals, [], [], [], settings);

    expect(res.totalBazarCost).toBe(0);
    expect(res.mealRate).toBe(55); // fallback rate
    const m1 = res.memberCalculations.find((m) => m.member.id === 'm1')!;
    expect(m1.mealCost).toBe(550);
  });

  it('3. Member with Zero Meals: Pays 0 meal cost but still pays their share of fixed expenses', () => {
    const meals: MealRecord[] = [
      { id: 'ml1', date: '2026-10-01', memberId: 'm1', mealCount: 20, createdAt: '', updatedAt: '' },
      // m2 has zero meals
    ];
    const fixed: FixedExpense[] = [
      { id: 'f1', month: '2026-10', title: 'Cook', amount: 1000, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-10-01', description: 'Fish', category: 'Fish', amount: 1000, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];

    const res = calculateMonthlySummary('2026-10', members, meals, bazar, [], fixed, baseSettings);
    const m2 = res.memberCalculations.find((m) => m.member.id === 'm2')!;

    expect(m2.totalMeals).toBe(0);
    expect(m2.mealCost).toBe(0);
    expect(m2.sharedFixedCost).toBe(500); // 1000 / 2 active members
    expect(m2.totalCost).toBe(500);
    expect(m2.balance).toBe(-500);
    expect(m2.status).toBe('due');
    expect(m2.due).toBe(500);
  });

  it('4. Member Who Paid Bazar Out of Pocket: Out-of-pocket amount is credited to member', () => {
    const meals: MealRecord[] = [
      { id: 'ml1', date: '2026-10-01', memberId: 'm1', mealCount: 10, createdAt: '', updatedAt: '' },
    ];
    const bazar: BazarExpense[] = [
      // m1 paid 800 out of pocket
      { id: 'b1', date: '2026-10-02', description: 'Rice & Oil', category: 'Grocery', amount: 800, paidByMemberId: 'm1', createdAt: '' },
    ];

    const res = calculateMonthlySummary('2026-10', members, meals, bazar, [], [], baseSettings);
    const m1 = res.memberCalculations.find((m) => m.member.id === 'm1')!;

    expect(m1.bazarPaidOutPocket).toBe(800);
    expect(m1.totalCredits).toBe(800);
    // mealRate = 800 / 10 = 80. mealCost = 800.
    // balance = 800 credits - 800 costs = 0 (settled)
    expect(m1.balance).toBe(0);
    expect(m1.status).toBe('settled');
    expect(m1.due).toBe(0);
  });

  it('5. Each mealRateMode: bazar_only, bazar_and_fixed, split_fixed_equally', () => {
    const meals: MealRecord[] = [
      { id: 'ml1', date: '2026-10-01', memberId: 'm1', mealCount: 20, createdAt: '', updatedAt: '' },
      { id: 'ml2', date: '2026-10-01', memberId: 'm2', mealCount: 20, createdAt: '', updatedAt: '' },
    ];
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-10-01', description: 'Bazar', category: 'Grocery', amount: 2000, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];
    const fixed: FixedExpense[] = [
      { id: 'f1', month: '2026-10', title: 'WiFi', amount: 400, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];

    // Mode A: bazar_only -> mealRate = 2000 / 40 = 50. fixed per member = 400 / 2 = 200.
    const resA = calculateMonthlySummary('2026-10', members, meals, bazar, [], fixed, {
      ...baseSettings,
      mealRateMode: 'bazar_only',
    });
    expect(resA.mealRate).toBe(50);
    expect(resA.sharedFixedPerMember).toBe(200);

    // Mode B: bazar_and_fixed -> mealRate = (2000 + 400) / 40 = 60. sharedFixedPerMember = 0.
    const resB = calculateMonthlySummary('2026-10', members, meals, bazar, [], fixed, {
      ...baseSettings,
      mealRateMode: 'bazar_and_fixed',
    });
    expect(resB.mealRate).toBe(60);
    expect(resB.sharedFixedPerMember).toBe(0);

    // Mode C: split_fixed_equally -> mealRate = 2000 / 40 = 50. fixed per member = 400 / 2 = 200.
    const resC = calculateMonthlySummary('2026-10', members, meals, bazar, [], fixed, {
      ...baseSettings,
      mealRateMode: 'split_fixed_equally',
    });
    expect(resC.mealRate).toBe(50);
    expect(resC.sharedFixedPerMember).toBe(200);
  });

  it('6. Pending vs Approved Deposits: Pending and Rejected deposits are NEVER credited', () => {
    const deposits: Deposit[] = [
      { id: 'd1', date: '2026-10-01', memberId: 'm1', amount: 1000, paymentMethod: 'Cash', status: 'approved', createdAt: '' },
      { id: 'd2', date: '2026-10-02', memberId: 'm1', amount: 500, paymentMethod: 'bKash', status: 'pending', createdAt: '' },
      { id: 'd3', date: '2026-10-03', memberId: 'm1', amount: 300, paymentMethod: 'Nagad', status: 'rejected', createdAt: '' },
    ];

    const res = calculateMonthlySummary('2026-10', members, [], [], deposits, [], baseSettings);
    const m1 = res.memberCalculations.find((m) => m.member.id === 'm1')!;

    // Only approved deposit (1000) should be counted
    expect(m1.totalDeposits).toBe(1000);
    expect(m1.totalCredits).toBe(1000);
  });

  it('7. Rounding: Correctly rounds to two decimals without accumulation error', () => {
    expect(roundMoney(10.555)).toBe(10.56);
    expect(roundMoney(10.554)).toBe(10.55);
    expect(roundMoney(0.0001)).toBe(0);

    const meals: MealRecord[] = [
      { id: 'ml1', date: '2026-10-01', memberId: 'm1', mealCount: 3, createdAt: '', updatedAt: '' },
    ];
    // Bazar 100 Tk for 3 meals -> meal rate = 33.333333333333336 -> 33.33
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-10-01', description: 'Eggs', category: 'Grocery', amount: 100, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];

    const res = calculateMonthlySummary('2026-10', members, meals, bazar, [], [], baseSettings);
    expect(res.mealRate).toBe(33.33);
    const m1 = res.memberCalculations.find((m) => m.member.id === 'm1')!;
    // 3 * 33.33 = 99.99
    expect(m1.mealCost).toBe(99.99);
  });

  it('8. Single member accounting isolation returns identical figures', () => {
    const meals: MealRecord[] = [
      { id: 'ml1', date: '2026-10-01', memberId: 'm1', mealCount: 15, createdAt: '', updatedAt: '' },
    ];
    const bazar: BazarExpense[] = [
      { id: 'b1', date: '2026-10-01', description: 'Meat', category: 'Meat', amount: 1500, paidByMemberId: 'MESS_FUND', createdAt: '' },
    ];
    const deposits: Deposit[] = [
      { id: 'd1', date: '2026-10-01', memberId: 'm1', amount: 1000, paymentMethod: 'Cash', status: 'approved', createdAt: '' },
    ];

    const memberAccounting = calculateMemberAccounting('m1', '2026-10', members, meals, bazar, deposits, [], baseSettings);
    expect(memberAccounting.myTotalMeals).toBe(15);
    expect(memberAccounting.mealRate).toBe(100);
    expect(memberAccounting.myMealCost).toBe(1500);
    expect(memberAccounting.myTotalCredits).toBe(1000);
    expect(memberAccounting.myBalance).toBe(-500);
    expect(memberAccounting.status).toBe('due');
    expect(memberAccounting.dueAmount).toBe(500);
  });
});
