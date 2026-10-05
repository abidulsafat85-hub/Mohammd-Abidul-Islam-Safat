import {
  Member,
  MealRecord,
  BazarExpense,
  Deposit,
  FixedExpense,
  MessSettings,
  MonthlyAccountingSummary,
  MemberMonthlyCalculation,
} from '../types';

export interface MemberAccountingResult {
  month: string;
  mealRate: number;
  myTotalMeals: number;
  myMealCost: number;
  mySharedFixedCost: number;
  myTotalDeposits: number;
  myBazarCredits: number;
  myFixedCredits: number;
  myTotalCharges: number;
  myTotalCredits: number;
  myBalance: number;
  status: 'due' | 'refund' | 'settled';
  dueAmount: number;
  refundAmount: number;
}

/**
 * Standard rounding helper: 2 decimals, round once at the end so totals add up
 */
export function roundMoney(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

/**
 * Helper to determine if a deposit is approved.
 * Only APPROVED deposits count towards balance/dues.
 * Legacy/direct admin deposits without status default to approved.
 */
export function isApprovedDeposit(d: Deposit): boolean {
  if (!d) return false;
  if (!d.status) return true;
  return d.status === 'approved';
}

/**
 * Helper to check if a bazar/fixed expense was paid by a specific member out of pocket.
 */
export function isPaidByMember(paidBy: string | undefined, member: Member): boolean {
  if (!paidBy || paidBy === 'MESS_FUND') return false;
  return Boolean(
    paidBy === member.id ||
    paidBy === member.phone ||
    paidBy === member.fullName ||
    (member.nickname && paidBy === member.nickname)
  );
}

/**
 * Shared monthly calculation used by both client and server.
 */
export function calculateMonthlySummary(
  month: string, // YYYY-MM
  members: Member[] = [],
  meals: MealRecord[] = [],
  bazar: BazarExpense[] = [],
  deposits: Deposit[] = [],
  fixedExpenses: FixedExpense[] = [],
  settings?: MessSettings
): MonthlyAccountingSummary {
  // Safe defaults
  const safeMembers = members || [];
  const safeMeals = meals || [];
  const safeBazar = bazar || [];
  const safeDeposits = deposits || [];
  const safeFixed = fixedExpenses || [];
  const safeSettings = settings || {
    messName: 'MessMate',
    subtitle: 'Smart Mess Meal Management',
    currency: '৳',
    mealRateMode: 'bazar_only',
    defaultMealsPerDay: 2,
    theme: 'light',
  };

  // 1. Filter records for the specified month
  const monthMeals = safeMeals.filter((m) => m.date && m.date.startsWith(month));
  const monthBazar = safeBazar.filter((b) => b.date && b.date.startsWith(month));
  // CRITICAL: Only APPROVED deposits count. Pending and rejected deposits are ignored.
  const monthApprovedDeposits = safeDeposits.filter(
    (d) => d.date && d.date.startsWith(month) && isApprovedDeposit(d)
  );
  const monthFixed = safeFixed.filter((f) => f.month === month);

  // 2. Active / Relevant members in this month
  const relevantMembers = safeMembers.filter((m) => {
    if (m.isActive) return true;
    const hasMeals = monthMeals.some((meal) => meal.memberId === m.id && (Number(meal.mealCount) || 0) > 0);
    const hasDeposit = monthApprovedDeposits.some((dep) => dep.memberId === m.id);
    const hasBazar = monthBazar.some((b) => isPaidByMember(b.paidByMemberId, m));
    const hasFixed = monthFixed.some((f) => isPaidByMember(f.paidByMemberId, m));
    return Boolean(hasMeals || hasDeposit || hasBazar || hasFixed);
  });

  const activeMembers = relevantMembers.filter((m) => m.isActive);
  const activeMemberCount = Math.max(1, activeMembers.length > 0 ? activeMembers.length : relevantMembers.length);

  // 3. Totals
  const totalMeals = monthMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);
  const totalBazarCost = monthBazar.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalFixedExpenses = monthFixed.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  const totalExpenses = totalBazarCost + totalFixedExpenses;

  // 4. Meal Rate calculation respecting settings.mealRateMode
  const mealRateMode = safeSettings.mealRateMode || 'bazar_only';
  const fallbackRate = Number(safeSettings.fixedMealRate) > 0 ? Number(safeSettings.fixedMealRate) : 50;

  let rawMealRate = 0;
  let rawSharedFixedPerMember = 0;

  if (safeSettings.showBazarOption === false && Number(safeSettings.fixedMealRate) > 0) {
    rawMealRate = Number(safeSettings.fixedMealRate);
    if (mealRateMode === 'split_fixed_equally' || mealRateMode === 'bazar_only') {
      rawSharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    }
  } else if (totalMeals > 0) {
    if (mealRateMode === 'bazar_and_fixed') {
      // Total expenses (bazar + fixed) divided by total meals
      if (totalExpenses > 0) {
        rawMealRate = totalExpenses / totalMeals;
      } else {
        rawMealRate = fallbackRate;
      }
      rawSharedFixedPerMember = 0;
    } else {
      // 'bazar_only' or 'split_fixed_equally'
      if (totalBazarCost > 0) {
        rawMealRate = totalBazarCost / totalMeals;
      } else {
        rawMealRate = fallbackRate; // zero bazar fallback rate
      }
      rawSharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    }
  } else {
    // totalMeals === 0
    rawMealRate = fallbackRate;
    if (mealRateMode === 'split_fixed_equally' || mealRateMode === 'bazar_only') {
      rawSharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    }
  }

  const mealRate = roundMoney(rawMealRate);
  const sharedFixedPerMember = roundMoney(rawSharedFixedPerMember);

  // 5. Member-wise calculations
  const memberCalculations: MemberMonthlyCalculation[] = relevantMembers.map((member) => {
    const memberMeals = monthMeals
      .filter((m) => m.memberId === member.id)
      .reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);

    const mealCost = roundMoney(memberMeals * mealRate);
    // Inactive members who only had past activity pay 0 share of monthly fixed cost
    const sharedFixedCost = member.isActive ? sharedFixedPerMember : 0;
    const totalCost = roundMoney(mealCost + sharedFixedCost);

    // Direct APPROVED deposits paid by member
    const directDeposits = monthApprovedDeposits
      .filter((d) => d.memberId === member.id)
      .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

    // Out-of-pocket Bazar paid by member
    const bazarPaidOutPocket = monthBazar
      .filter((b) => isPaidByMember(b.paidByMemberId, member))
      .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

    // Out-of-pocket Fixed expenses paid by member
    const fixedPaidOutPocket = monthFixed
      .filter((f) => isPaidByMember(f.paidByMemberId, member))
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

    // Total Credits: Money deposited + Out-of-pocket bazar + Out-of-pocket fixed
    const totalCredits = roundMoney(directDeposits + bazarPaidOutPocket + fixedPaidOutPocket);

    // Balance = Approved deposits + out of pocket - total cost
    const balance = roundMoney(totalCredits - totalCost);

    // Unified Due & Status:
    // due = max(0, -balance)
    // status derived from balance only
    let status: 'due' | 'refund' | 'settled' = 'settled';
    let due = 0;

    if (balance < -0.001) {
      status = 'due';
      due = roundMoney(Math.abs(balance));
    } else if (balance > 0.001) {
      status = 'refund';
      due = 0;
    } else {
      status = 'settled';
      due = 0;
    }

    return {
      member,
      totalMeals: memberMeals,
      mealCost,
      sharedFixedCost,
      totalCost,
      totalDeposits: roundMoney(directDeposits),
      bazarPaidOutPocket: roundMoney(bazarPaidOutPocket),
      fixedPaidOutPocket: roundMoney(fixedPaidOutPocket),
      totalCredits,
      balance,
      due,
      status,
    };
  });

  // Sort by meals descending
  memberCalculations.sort((a, b) => b.totalMeals - a.totalMeals);

  // 6. Statistics
  const membersWithMeals = memberCalculations.filter((m) => m.totalMeals > 0);
  const highestMealMember =
    membersWithMeals.length > 0
      ? {
          memberName: membersWithMeals[0].member.nickname || membersWithMeals[0].member.fullName,
          meals: membersWithMeals[0].totalMeals,
        }
      : undefined;

  const lowestMealMember =
    membersWithMeals.length > 0
      ? {
          memberName:
            membersWithMeals[membersWithMeals.length - 1].member.nickname ||
            membersWithMeals[membersWithMeals.length - 1].member.fullName,
          meals: membersWithMeals[membersWithMeals.length - 1].totalMeals,
        }
      : undefined;

  const avgMealsPerMember = activeMemberCount > 0 ? roundMoney(totalMeals / activeMemberCount) : 0;

  // 7. Cash in Mess Fund
  const totalDirectApprovedDeposits = monthApprovedDeposits.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const bazarPaidFromFund = monthBazar
    .filter((b) => !b.paidByMemberId || b.paidByMemberId === 'MESS_FUND')
    .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const fixedPaidFromFund = monthFixed
    .filter((f) => !f.paidByMemberId || f.paidByMemberId === 'MESS_FUND')
    .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

  const totalFundExpenses = roundMoney(bazarPaidFromFund + fixedPaidFromFund);
  const remainingCashFund = roundMoney(totalDirectApprovedDeposits - totalFundExpenses);
  const totalMemberCredits = roundMoney(memberCalculations.reduce((acc, m) => acc + m.totalCredits, 0));

  const totalDue = roundMoney(
    memberCalculations
      .filter((m) => m.status === 'due')
      .reduce((acc, m) => acc + m.due, 0)
  );

  const totalRunningMealCost = roundMoney(totalMeals * mealRate);

  return {
    month,
    totalMeals,
    totalBazarCost: roundMoney(totalBazarCost),
    totalFixedExpenses: roundMoney(totalFixedExpenses),
    totalExpenses: roundMoney(totalExpenses),
    mealRate,
    sharedFixedPerMember,
    totalDeposits: roundMoney(totalDirectApprovedDeposits),
    totalMemberCredits,
    remainingCashFund,
    activeMemberCount,
    memberCalculations,
    highestMealMember,
    lowestMealMember,
    avgMealsPerMember,
    totalDue,
    totalRunningMealCost,
  };
}

/**
 * Single member accounting result helper.
 */
export function calculateMemberAccounting(
  memberId: string,
  month: string,
  members: Member[] = [],
  meals: MealRecord[] = [],
  bazar: BazarExpense[] = [],
  deposits: Deposit[] = [],
  fixedExpenses: FixedExpense[] = [],
  settings?: MessSettings
): MemberAccountingResult {
  const summary = calculateMonthlySummary(month, members, meals, bazar, deposits, fixedExpenses, settings);
  const memberCalc = summary.memberCalculations.find((m) => m.member.id === memberId);

  if (memberCalc) {
    return {
      month,
      mealRate: summary.mealRate,
      myTotalMeals: memberCalc.totalMeals,
      myMealCost: memberCalc.mealCost,
      mySharedFixedCost: memberCalc.sharedFixedCost,
      myTotalDeposits: memberCalc.totalDeposits,
      myBazarCredits: memberCalc.bazarPaidOutPocket,
      myFixedCredits: memberCalc.fixedPaidOutPocket || 0,
      myTotalCharges: memberCalc.totalCost,
      myTotalCredits: memberCalc.totalCredits,
      myBalance: memberCalc.balance,
      status: memberCalc.status,
      dueAmount: memberCalc.due,
      refundAmount: memberCalc.balance > 0 ? memberCalc.balance : 0,
    };
  }

  // Fallback if member has no meals or transactions
  const targetMember = (members || []).find((m) => m.id === memberId);
  const mySharedFixed = targetMember?.isActive ? summary.sharedFixedPerMember : 0;
  const myTotalCharges = roundMoney(mySharedFixed);
  const myBalance = roundMoney(-myTotalCharges);

  return {
    month,
    mealRate: summary.mealRate,
    myTotalMeals: 0,
    myMealCost: 0,
    mySharedFixedCost: mySharedFixed,
    myTotalDeposits: 0,
    myBazarCredits: 0,
    myFixedCredits: 0,
    myTotalCharges,
    myTotalCredits: 0,
    myBalance,
    status: myBalance < -0.001 ? 'due' : 'settled',
    dueAmount: myBalance < -0.001 ? roundMoney(Math.abs(myBalance)) : 0,
    refundAmount: 0,
  };
}

export function formatCurrency(amount: number, currency: string = '৳'): string {
  const rounded = Math.abs(roundMoney(amount)).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (amount < -0.001) {
    return `-${currency}${rounded}`;
  }
  return `${currency}${rounded}`;
}

export function formatRate(rate: number, currency: string = '৳'): string {
  return `${currency}${roundMoney(rate).toFixed(2)}`;
}
