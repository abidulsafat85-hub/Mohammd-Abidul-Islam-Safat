import { Member, MealRecord, BazarExpense, Deposit, FixedExpense, MessSettings } from '../types';

export const initialSettings: MessSettings = {
  messName: 'MessMate',
  subtitle: 'Smart Mess Meal Management',
  currency: '৳',
  mealRateMode: 'bazar_only',
  defaultMealsPerDay: 2, // Lunch + Dinner
  theme: 'light',
  showBazarOption: false, // Bazar option deleted/hidden per user request
  fixedMealRate: 50,
  managerName: 'Abidul Safat',
  managerPhone: '+880 1712-345678',
  cookPhone: 'https://chat.whatsapp.com/B7X9qMessBazarGroup',
  cookName: 'মেস ও দোকানদার হোয়াটসঅ্যাপ গ্রুপ',
  whatsappGateway: {
    provider: 'none',
  },
};

export const initialMembers: Member[] = [
  {
    id: 'mem-1',
    fullName: 'Abidul Safat',
    nickname: 'Safat',
    phone: '01712345678',
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
    joinDate: '2026-04-01',
    initialDeposit: 0,
    isActive: true,
    notes: 'Room 403',
  },
];

// Helper to generate realistic meals for Sep 1 to Sep 19, 2026
export function generateInitialMeals(): MealRecord[] {
  const records: MealRecord[] = [];
  const days = 19; // Sep 1 to Sep 19
  
  for (let d = 1; d <= days; d++) {
    const dayStr = d < 10 ? `0${d}` : `${d}`;
    const date = `2026-09-${dayStr}`;

    // Safat eats mostly 2 meals
    records.push({
      id: `meal-${date}-mem-1`,
      date,
      memberId: 'mem-1',
      mealCount: d === 10 ? 1 : 2,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    // Rahim eats 2 meals, was out on Sep 5
    records.push({
      id: `meal-${date}-mem-2`,
      date,
      memberId: 'mem-2',
      mealCount: d === 5 ? 0 : 2,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    // Karim went home for a week (Sep 8-14)
    const karimMeals = (d >= 8 && d <= 14) || d === 19 ? 0 : (d % 3 === 0 ? 1 : 2);
    records.push({
      id: `meal-${date}-mem-3`,
      date,
      memberId: 'mem-3',
      mealCount: karimMeals,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    // Hasan eats regular 2 meals
    records.push({
      id: `meal-${date}-mem-4`,
      date,
      memberId: 'mem-4',
      mealCount: 2,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    // Tanvir eats 2 meals
    records.push({
      id: `meal-${date}-mem-5`,
      date,
      memberId: 'mem-5',
      mealCount: d === 12 ? 1 : 2,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });

    // Shakil had weekend offs
    const shakilMeals = (d % 7 === 5 || d === 19) ? 0 : 2;
    records.push({
      id: `meal-${date}-mem-6`,
      date,
      memberId: 'mem-6',
      mealCount: shakilMeals,
      createdAt: `${date}T12:00:00Z`,
      updatedAt: `${date}T12:00:00Z`,
    });
  }

  return records;
}

export const initialBazarExpenses: BazarExpense[] = [
  {
    id: 'baz-1',
    date: '2026-09-01',
    description: 'Miniket Rice (50kg bag) & Salt',
    category: 'Rice',
    amount: 3450,
    paidByMemberId: 'mem-1', // Safat
    note: 'From Kawran Bazar wholesale',
    createdAt: '2026-09-01T09:00:00Z',
  },
  {
    id: 'baz-2',
    date: '2026-09-02',
    description: 'Soybean Oil 5L & Mustard Oil 1L',
    category: 'Oil',
    amount: 980,
    paidByMemberId: 'mem-2', // Rahim
    note: 'Teer Brand soybean oil',
    createdAt: '2026-09-02T10:00:00Z',
  },
  {
    id: 'baz-3',
    date: '2026-09-04',
    description: 'Broiler Chicken (4kg) & Eggs (2 crates)',
    category: 'Meat',
    amount: 1480,
    paidByMemberId: 'mem-4', // Hasan
    note: 'Fresh cut chicken',
    createdAt: '2026-09-04T08:30:00Z',
  },
  {
    id: 'baz-4',
    date: '2026-09-06',
    description: 'Fresh Rui Fish (3.5kg) & Spices',
    category: 'Fish',
    amount: 1350,
    paidByMemberId: 'mem-3', // Karim
    note: 'Cleaned and sliced',
    createdAt: '2026-09-06T09:15:00Z',
  },
  {
    id: 'baz-5',
    date: '2026-09-08',
    description: 'Weekly Vegetables (Potato, Onion, Garlic, Eggplant)',
    category: 'Vegetable',
    amount: 720,
    paidByMemberId: 'mem-5', // Tanvir
    note: '10kg potato, 5kg onion',
    createdAt: '2026-09-08T07:45:00Z',
  },
  {
    id: 'baz-6',
    date: '2026-09-11',
    description: 'Beef (2kg with bone) & Biryani Spices',
    category: 'Meat',
    amount: 1650,
    paidByMemberId: 'mem-1', // Safat
    note: 'Friday special beef',
    createdAt: '2026-09-11T09:30:00Z',
  },
  {
    id: 'baz-7',
    date: '2026-09-14',
    description: 'Pangas Fish (3kg), Lentils (Dal 3kg)',
    category: 'Fish',
    amount: 890,
    paidByMemberId: 'mem-2', // Rahim
    note: 'Good quality red masoor dal',
    createdAt: '2026-09-14T08:00:00Z',
  },
  {
    id: 'baz-8',
    date: '2026-09-16',
    description: 'Green Vegetables, Green Chilies, Ginger, Turmeric',
    category: 'Vegetable',
    amount: 540,
    paidByMemberId: 'mem-6', // Shakil
    note: 'Local morning market',
    createdAt: '2026-09-16T08:15:00Z',
  },
  {
    id: 'baz-9',
    date: '2026-09-18',
    description: 'Chicken (3.5kg) & Potatoes',
    category: 'Meat',
    amount: 890,
    paidByMemberId: 'MESS_FUND',
    note: 'Paid directly from mess cash box',
    createdAt: '2026-09-18T18:00:00Z',
  },
];

export const initialDeposits: Deposit[] = [
  {
    id: 'dep-1',
    memberId: 'mem-1',
    date: '2026-09-01',
    amount: 2500,
    paymentMethod: 'bKash',
    note: 'Advance for September',
    createdAt: '2026-09-01T10:00:00Z',
  },
  {
    id: 'dep-2',
    memberId: 'mem-2',
    date: '2026-09-01',
    amount: 2500,
    paymentMethod: 'Cash',
    note: 'Handed to Safat',
    createdAt: '2026-09-01T11:00:00Z',
  },
  {
    id: 'dep-3',
    memberId: 'mem-3',
    date: '2026-09-02',
    amount: 2000,
    paymentMethod: 'Nagad',
    note: 'TrxID: 9948271',
    createdAt: '2026-09-02T14:30:00Z',
  },
  {
    id: 'dep-4',
    memberId: 'mem-4',
    date: '2026-09-01',
    amount: 2500,
    paymentMethod: 'bKash',
    note: 'Full advance deposit',
    createdAt: '2026-09-01T16:00:00Z',
  },
  {
    id: 'dep-5',
    memberId: 'mem-5',
    date: '2026-09-03',
    amount: 2500,
    paymentMethod: 'Cash',
    note: 'September meal advance',
    createdAt: '2026-09-03T19:00:00Z',
  },
  {
    id: 'dep-6',
    memberId: 'mem-6',
    date: '2026-09-02',
    amount: 2000,
    paymentMethod: 'bKash',
    note: 'First installment',
    createdAt: '2026-09-02T20:00:00Z',
  },
  {
    id: 'dep-7',
    memberId: 'mem-1',
    date: '2026-09-12',
    amount: 1000,
    paymentMethod: 'Cash',
    note: 'Mid-month top-up',
    createdAt: '2026-09-12T10:00:00Z',
  },
  {
    id: 'dep-8',
    memberId: 'mem-4',
    date: '2026-09-15',
    amount: 500,
    paymentMethod: 'Nagad',
    note: 'Additional deposit',
    createdAt: '2026-09-15T15:00:00Z',
  },
];

export const initialFixedExpenses: FixedExpense[] = [
  {
    id: 'fix-1',
    month: '2026-09',
    title: 'Gas Cylinder Refill (LP Gas)',
    amount: 1450,
    paidByMemberId: 'mem-1',
    createdAt: '2026-09-05T12:00:00Z',
  },
  {
    id: 'fix-2',
    month: '2026-09',
    title: 'Cook / Bua Salary (Advance)',
    amount: 3000,
    paidByMemberId: 'MESS_FUND',
    createdAt: '2026-09-10T12:00:00Z',
  },
  {
    id: 'fix-3',
    month: '2026-09',
    title: 'WiFi Internet Bill (Optical Fiber)',
    amount: 800,
    paidByMemberId: 'mem-2',
    createdAt: '2026-09-07T12:00:00Z',
  },
  {
    id: 'fix-4',
    month: '2026-09',
    title: 'Waste Disposal & Cleaning supplies',
    amount: 250,
    paidByMemberId: 'MESS_FUND',
    createdAt: '2026-09-03T12:00:00Z',
  },
];
