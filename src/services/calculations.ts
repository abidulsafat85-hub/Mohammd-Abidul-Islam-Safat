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

export function calculateMonthlySummary(
  month: string, // YYYY-MM
  members: Member[],
  meals: MealRecord[],
  bazar: BazarExpense[],
  deposits: Deposit[],
  fixedExpenses: FixedExpense[],
  settings: MessSettings
): MonthlyAccountingSummary {
  // 1. Filter records for the specified month
  const monthMeals = (meals || []).filter((m) => m.date && m.date.startsWith(month));
  const monthBazar = (bazar || []).filter((b) => b.date && b.date.startsWith(month));
  const monthDeposits = (deposits || []).filter((d) => d.date && d.date.startsWith(month));
  const monthFixed = (fixedExpenses || []).filter((f) => f.month === month);

  // 2. Active / Relevant members in this month
  // Include members who are active OR who have meals/deposits/bazar in this month
  const relevantMembers = (members || []).filter((m) => {
    if (m.isActive) return true;
    const hasMeals = monthMeals.some((meal) => meal.memberId === m.id && (Number(meal.mealCount) || 0) > 0);
    const hasDeposit = monthDeposits.some((dep) => dep.memberId === m.id);
    const hasBazar = monthBazar.some((b) => b.paidByMemberId === m.id);
    const hasFixed = monthFixed.some((f) => f.paidByMemberId === m.id);
    return hasMeals || hasDeposit || hasBazar || hasFixed;
  });

  const activeMemberCount = Math.max(1, relevantMembers.length);

  // 3. Totals
  const totalMeals = monthMeals.reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);
  const totalBazarCost = monthBazar.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalFixedExpenses = monthFixed.reduce((acc, f) => acc + (Number(f.amount) || 0), 0);
  const totalExpenses = totalBazarCost + totalFixedExpenses;

  // 4. Meal Rate & Fixed Expense Calculation respecting settings.mealRateMode
  const mealRateMode = settings.mealRateMode || 'bazar_only';
  let mealRate = 0;
  let sharedFixedPerMember = 0;

  if (settings.showBazarOption === false && settings.fixedMealRate && settings.fixedMealRate > 0) {
    // Fixed rate mode when bazar is disabled
    mealRate = settings.fixedMealRate;
    if (mealRateMode === 'split_fixed_equally') {
      sharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    }
  } else if (totalMeals > 0) {
    if (mealRateMode === 'bazar_and_fixed') {
      // Total expenses (bazar + fixed) divided by total meals
      mealRate = totalExpenses / totalMeals;
      sharedFixedPerMember = 0;
    } else if (mealRateMode === 'split_fixed_equally') {
      // Bazar divided by meals; Fixed expenses divided equally among active members
      mealRate = totalBazarCost / totalMeals;
      sharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    } else {
      // Default: 'bazar_only' - meal rate only includes bazar cost
      mealRate = totalBazarCost / totalMeals;
      sharedFixedPerMember = 0;
    }
  } else {
    // totalMeals === 0
    mealRate = settings.fixedMealRate && settings.fixedMealRate > 0 ? settings.fixedMealRate : 0;
    if (mealRateMode === 'split_fixed_equally') {
      sharedFixedPerMember = totalFixedExpenses / activeMemberCount;
    }
  }

  // Round mealRate & sharedFixedPerMember to 2 decimal places
  mealRate = Number(mealRate.toFixed(2));
  sharedFixedPerMember = Number(sharedFixedPerMember.toFixed(2));

  // 5. Member-wise calculations
  const memberCalculations: MemberMonthlyCalculation[] = relevantMembers.map((member) => {
    // Total meals for this member
    const memberMeals = monthMeals
      .filter((m) => m.memberId === member.id)
      .reduce((acc, m) => acc + (Number(m.mealCount) || 0), 0);

    const mealCost = Number((memberMeals * mealRate).toFixed(2));
    const sharedFixedCost = sharedFixedPerMember;
    const totalCost = Number((mealCost + sharedFixedCost).toFixed(2));

    // Direct deposits paid by member
    const directDeposits = monthDeposits
      .filter((d) => d.memberId === member.id)
      .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

    // Out-of-pocket Bazar paid by member
    const bazarPaidOutPocket = monthBazar
      .filter((b) => b.paidByMemberId === member.id)
      .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);

    // Out-of-pocket Fixed expenses paid by member
    const fixedPaidOutPocket = monthFixed
      .filter((f) => f.paidByMemberId === member.id)
      .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

    // Total Credits: Money deposited + Out-of-pocket bazar + Out-of-pocket fixed
    const totalCredits = Number((directDeposits + bazarPaidOutPocket + fixedPaidOutPocket).toFixed(2));

    // Balance: Total Credits - Total Charges
    // Positive balance = refund due to member
    // Negative balance = due payable by member
    const balance = Number((totalCredits - totalCost).toFixed(2));

    // Unified Due & Status logic
    let status: 'due' | 'refund' | 'settled' = 'settled';
    let due = 0;

    if (balance < -0.001) {
      status = 'due';
      due = Number(Math.abs(balance).toFixed(2));
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
      totalDeposits: directDeposits,
      bazarPaidOutPocket,
      fixedPaidOutPocket,
      totalCredits,
      balance,
      due,
      status,
    };
  });

  // Sort by meals descending by default
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

  const avgMealsPerMember = activeMemberCount > 0 ? Number((totalMeals / activeMemberCount).toFixed(1)) : 0;

  // 7. Cash in Mess Fund
  const totalDirectDeposits = monthDeposits.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const bazarPaidFromFund = monthBazar
    .filter((b) => b.paidByMemberId === 'MESS_FUND')
    .reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const fixedPaidFromFund = monthFixed
    .filter((f) => f.paidByMemberId === 'MESS_FUND')
    .reduce((acc, f) => acc + (Number(f.amount) || 0), 0);

  const totalFundExpenses = bazarPaidFromFund + fixedPaidFromFund;
  const remainingCashFund = totalDirectDeposits - totalFundExpenses;
  const totalMemberCredits = memberCalculations.reduce((acc, m) => acc + m.totalCredits, 0);

  // Total Due across all members with pending balance
  const totalDue = Number(
    memberCalculations
      .filter((m) => m.status === 'due')
      .reduce((acc, m) => acc + m.due, 0)
      .toFixed(2)
  );

  const totalRunningMealCost = Number((totalMeals * mealRate).toFixed(2));

  return {
    month,
    totalMeals,
    totalBazarCost,
    totalFixedExpenses,
    totalExpenses,
    mealRate,
    sharedFixedPerMember,
    totalDeposits: totalDirectDeposits,
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

export function calculateMemberAccounting(
  memberId: string,
  month: string,
  members: Member[],
  meals: MealRecord[],
  bazar: BazarExpense[],
  deposits: Deposit[],
  fixedExpenses: FixedExpense[],
  settings: MessSettings
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
  const targetMember = members.find((m) => m.id === memberId);
  const mySharedFixed = targetMember?.isActive ? summary.sharedFixedPerMember : 0;
  const myTotalCharges = mySharedFixed;
  const myBalance = -myTotalCharges;

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
    dueAmount: myBalance < -0.001 ? Math.abs(myBalance) : 0,
    refundAmount: 0,
  };
}

export function formatCurrency(amount: number, currency: string = '৳'): string {
  const rounded = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  if (amount < 0) {
    return `-${currency}${rounded}`;
  }
  return `${currency}${rounded}`;
}

export function formatRate(rate: number, currency: string = '৳'): string {
  return `${currency}${rate.toFixed(2)}`;
}
