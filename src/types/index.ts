export type PaymentMethod = 'Cash' | 'bKash' | 'Nagad' | 'Bank' | 'Rocket' | 'Other';

export type BazarCategory =
  | 'Rice'
  | 'Vegetable'
  | 'Fish'
  | 'Meat'
  | 'Grocery'
  | 'Gas'
  | 'Spices'
  | 'Oil'
  | 'Other';

export interface Member {
  id: string;
  fullName: string;
  nickname?: string;
  phone?: string;
  universityId?: string; // ভার্সিটি আইডি নং
  parentPhone?: string; // মা/বাবার নাম্বার
  location?: string; // মেম্বারের বর্তমান অবস্থান/ঠিকানা (যেমন: রুম নং, ফ্লোর বা এলাকা)
  latitude?: number;
  longitude?: number;
  email?: string; // e.g. 'abidulsafat85@gmail.com' or 'rahim@gmail.com'
  password?: string;
  pin?: string; // 4-digit individual access PIN (e.g. '1234')
  joinDate: string; // YYYY-MM-DD
  initialDeposit: number;
  isActive: boolean;
  notes?: string;
}

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  memberId?: string;
  mustChangePassword?: boolean;
}

export interface MealRecord {
  id: string;
  date: string; // YYYY-MM-DD
  memberId: string;
  mealCount: number; // 0, 0.5, 1, 1.5, 2, etc. (Default: 1 or 2)
  lunch?: boolean;
  dinner?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DailyMealEntry {
  date: string;
  meals: { [memberId: string]: number };
}

export interface BazarExpense {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  category: BazarCategory;
  amount: number;
  paidByMemberId: string; // Member ID or 'MESS_FUND'
  note?: string;
  createdAt: string;
}

export interface Deposit {
  id: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
  createdAt: string;
}

export interface FixedExpense {
  id: string;
  month: string; // YYYY-MM
  title: string; // Cook/Bua, WiFi, Gas Cylinder, Waste, House Rent
  amount: number;
  paidByMemberId: string; // Member ID or 'MESS_FUND'
  createdAt: string;
}

export type MealRateMode = 'bazar_only' | 'bazar_and_fixed' | 'split_fixed_equally';

export interface MessSettings {
  messName: string;
  subtitle: string;
  currency: string;
  mealRateMode: MealRateMode;
  defaultMealsPerDay: number;
  theme: 'light' | 'dark' | 'system';
  showBazarOption?: boolean; // When false, the Bazar option is deleted/hidden
  fixedMealRate?: number; // Optional fixed rate per meal if bazar is disabled
  managerName?: string;
  managerPhone?: string;
  adminPin?: string; // Mess Admin Panel access PIN (default: '1234')
  cookPhone?: string; // Shopkeeper / Cook WhatsApp number (88018XXXXXXXX)
  cookName?: string;
  isWhatsAppAutomationEnabled?: boolean;
  whatsappGateway?: WhatsAppGatewayConfig;
  pollTemplates?: WhatsAppMessageTemplates;
}

export interface WhatsAppMessageTemplates {
  tomorrowPollMessage: string;
  lunchPollMessage: string;
  dinnerPollMessage: string;
  cookTomorrowNotificationTemplate: string;
  cookNotificationTemplate: string;
  advancePollTime?: string; // Default: '20:00' (Night 8 PM)
  advanceCutoffTime?: string; // Default: '22:30' (Night 10:30 PM)
  morningPollTime?: string; // Default: '08:00'
  afternoonPollTime?: string; // Default: '14:00'
  lunchCutoffTime?: string; // Default: '11:00'
  dinnerCutoffTime?: string; // Default: '17:00'
  enableLunchPoll?: boolean; // When false, the separate daily lunch poll is deleted/disabled
  enableDinnerPoll?: boolean; // When false, the separate daily dinner poll is deleted/disabled
  enableAdvancePoll?: boolean; // When true (default), the 1-day advance poll runs
}

export interface WhatsAppGatewayConfig {
  provider: 'none' | 'ultramsg' | 'meta_cloud' | 'custom_webhook';
  instanceId?: string; // UltraMsg instance ID (e.g. instance12345)
  token?: string;      // Token or Meta Bearer Token
  phoneId?: string;    // Meta Cloud API Phone Number ID
  webhookUrl?: string; // Custom endpoint
}

export type PollVoteStatus = 'YES' | 'NO' | 'PENDING' | 'AUTO_YES';

export type AdvanceMealChoice = 'BOTH' | 'LUNCH_ONLY' | 'DINNER_ONLY' | 'NONE' | 'PENDING';

export interface TomorrowMemberVote {
  memberId: string;
  memberName: string;
  phone?: string;
  choice: AdvanceMealChoice;
  lunchStatus: PollVoteStatus;
  dinnerStatus: PollVoteStatus;
  rawResponse?: string;
  votedAt?: string;
  isAutoResolved?: boolean;
  manualOverride?: boolean;
}

export interface TomorrowMealPoll {
  targetDate: string; // Tomorrow's date YYYY-MM-DD
  pollDate: string;   // Today's date YYYY-MM-DD
  question: string;
  status: 'SCHEDULED' | 'POLL_SENT' | 'AUTO_RESOLVED' | 'DISPATCHED_TO_COOK';
  pollSentAt?: string;
  autoResolvedAt?: string;
  dispatchedAt?: string;
  totalActiveMembers: number;
  bothCount: number; // 1. দুপুর ও রাত
  lunchOnlyCount: number; // 2. শুধু দুপুর
  dinnerOnlyCount: number; // 3. শুধু রাত
  noneCount: number; // 4. কোনো মিল নেই (মিল অফ)
  pendingCount: number;
  totalLunchMeals: number; // bothCount + lunchOnlyCount
  totalDinnerMeals: number; // bothCount + dinnerOnlyCount
  votes: Record<string, TomorrowMemberVote>;
  cookMessageSent?: string;
  lastDispatchedSummary?: {
    dispatchedAt: string;
    targetDate: string;
    totalLunch?: number;
    totalDinner?: number;
    lunchCount: number;
    dinnerCount: number;
    cookPhone: string;
    message?: string;
    previewText?: string;
  };
}

export interface MemberPollVote {
  memberId: string;
  memberName: string;
  phone?: string;
  status: PollVoteStatus;
  votedAt?: string;
  isAutoResolved?: boolean;
  manualOverride?: boolean;
}

export interface MealSlotPoll {
  slot: 'lunch' | 'dinner';
  date: string; // YYYY-MM-DD
  question: string;
  status: 'SCHEDULED' | 'POLL_SENT' | 'AUTO_RESOLVED' | 'DISPATCHED_TO_COOK';
  pollSentAt?: string;
  autoResolvedAt?: string;
  dispatchedAt?: string;
  totalActiveMembers: number;
  yesCount: number;
  noCount: number;
  pendingCount: number;
  votes: Record<string, MemberPollVote>;
  cookMessageSent?: string;
}

export interface WhatsAppPollDayState {
  date: string; // YYYY-MM-DD
  tomorrow?: TomorrowMealPoll;
  lunch: MealSlotPoll;
  dinner: MealSlotPoll;
  cookPhone: string;
  cookName?: string;
  isAutomationEnabled: boolean;
  gateway?: WhatsAppGatewayConfig;
  gatewayLastError?: string;
  templates?: WhatsAppMessageTemplates;
  lastSyncAt: string;
  logs: { timestamp: string; message: string; type: 'info' | 'success' | 'warning' }[];
}

export interface MemberMonthlyCalculation {
  member: Member;
  totalMeals: number;
  mealCost: number;
  sharedFixedCost: number;
  totalCost: number;
  totalDeposits: number;
  bazarPaidOutPocket: number;
  totalCredits: number;
  balance: number; // > 0: Refund (+৳), < 0: Due (-৳)
  due: number; // mealCost > deposit ? mealCost - deposit : 0
  status: 'due' | 'refund' | 'settled';
}

export interface MonthlyAccountingSummary {
  month: string; // YYYY-MM
  totalMeals: number;
  totalBazarCost: number;
  totalFixedExpenses: number;
  totalExpenses: number;
  mealRate: number;
  sharedFixedPerMember: number;
  totalDeposits: number;
  totalMemberCredits: number;
  remainingCashFund: number;
  activeMemberCount: number;
  memberCalculations: MemberMonthlyCalculation[];
  highestMealMember?: { memberName: string; meals: number };
  lowestMealMember?: { memberName: string; meals: number };
  avgMealsPerMember: number;
  totalDue: number;
  totalRunningMealCost: number;
}

export interface MemberPortalData {
  member: {
    id: string;
    fullName: string;
    nickname?: string;
    phone?: string;
    notes?: string;
    isActive: boolean;
  };
  meals: MealRecord[];
  deposits: Deposit[];
  bazar: BazarExpense[];
  tomorrowVote?: {
    choice: AdvanceMealChoice;
    targetDate: string;
    votedAt: string;
  } | null;
  accounting: {
    month: string;
    mealRate: number;
    myTotalMeals: number;
    myMealCost: number;
    mySharedFixedCost: number;
    myTotalDeposits: number;
    myBazarCredits: number;
    myTotalCharges: number;
    myTotalCredits: number;
    myBalance: number;
    status: 'due' | 'refund' | 'settled';
    dueAmount: number;
    refundAmount: number;
  };
  settings: {
    messName: string;
    subtitle: string;
    currency: string;
    managerName?: string;
    managerPhone?: string;
    showBazarOption?: boolean;
    defaultMealsPerDay: number;
  };
}
