import fs from 'fs';
import path from 'path';

let cronModule: any = null;
function getCron(): any {
  if (!cronModule) {
    try {
      const req = typeof require !== 'undefined' ? require : null;
      if (req) {
        cronModule = req('node-cron');
      }
    } catch {
      // In serverless environments, cron is safely disabled
    }
  }
  return cronModule;
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
  noneCount: number; // 4. কোনো মিল চলবে না (মিল অফ)
  pendingCount: number;
  totalLunchMeals: number; // bothCount + lunchOnlyCount
  totalDinnerMeals: number; // bothCount + dinnerOnlyCount
  votes: Record<string, TomorrowMemberVote>;
  cookMessageSent?: string;
  lastDispatchedSummary?: {
    dispatchedAt: string;
    targetDate: string;
    pollDate: string;
    lunchCount: number;
    dinnerCount: number;
    message: string;
    delivered?: boolean;
    error?: string;
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

export interface WhatsAppMessageTemplates {
  tomorrowPollMessage: string;
  lunchPollMessage: string;
  dinnerPollMessage: string;
  cookTomorrowNotificationTemplate: string;
  cookNotificationTemplate: string;
  advancePollTime?: string; // Default: '20:00' (Night 8 PM)
  advanceCutoffTime?: string; // Default: '22:30' (Night 10:30 PM)
  morningPollTime?: string; // Default '08:00'
  afternoonPollTime?: string; // Default '14:00'
  lunchCutoffTime?: string; // Default '11:00'
  dinnerCutoffTime?: string; // Default '17:00'
  enableLunchPoll?: boolean; // When false, the separate daily lunch poll is deleted/disabled
  enableDinnerPoll?: boolean; // When false, the separate daily dinner poll is deleted/disabled
  enableAdvancePoll?: boolean; // When true (default), the 1-day advance poll runs
}

export interface WhatsAppPollDayState {
  date: string;
  tomorrow?: TomorrowMealPoll;
  lunch: MealSlotPoll;
  dinner: MealSlotPoll;
  cookPhone: string;
  cookName?: string;
  isAutomationEnabled: boolean;
  gateway?: {
    provider: 'none' | 'ultramsg' | 'meta_cloud' | 'custom_webhook';
    instanceId?: string;
    token?: string;
    phoneId?: string;
    webhookUrl?: string;
  };
  gatewayLastError?: string;
  templates?: WhatsAppMessageTemplates;
  lastSyncAt: string;
  logs: { timestamp: string; message: string; type: 'info' | 'success' | 'warning' }[];
}

export interface ActiveMemberInfo {
  id: string;
  fullName: string;
  phone?: string;
  isActive: boolean;
}

export function normalizeBdPhoneNumber(toPhone: string): string {
  let clean = toPhone.replace(/\D/g, '');
  if (!clean) return '';
  // 11 digits starting with 01 (e.g. 01874278012) -> 8801874278012
  if (clean.length === 11 && clean.startsWith('01')) {
    return '88' + clean;
  }
  // 10 digits starting with 1 (e.g. 1874278012) -> 8801874278012
  if (clean.length === 10 && clean.startsWith('1')) {
    return '880' + clean;
  }
  // 14 digits starting with 88001 (e.g. 88001874278012) -> 8801874278012
  if (clean.length === 14 && clean.startsWith('88001')) {
    return '8801' + clean.slice(5);
  }
  return clean;
}

export function getBangladeshNow(): {
  dateStr: string;
  tomorrowDateStr: string;
  timeStr: string;
  hour: number;
  minute: number;
  totalMinutes: number;
} {
  const now = new Date();
  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const year = bdTime.getUTCFullYear();
  const month = String(bdTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bdTime.getUTCDate()).padStart(2, '0');
  const hour = bdTime.getUTCHours();
  const minute = bdTime.getUTCMinutes();
  const dateStr = `${year}-${month}-${day}`;

  const tomorrowBd = new Date(bdTime.getTime() + 24 * 60 * 60 * 1000);
  const tYear = tomorrowBd.getUTCFullYear();
  const tMonth = String(tomorrowBd.getUTCMonth() + 1).padStart(2, '0');
  const tDay = String(tomorrowBd.getUTCDate()).padStart(2, '0');
  const tomorrowDateStr = `${tYear}-${tMonth}-${tDay}`;

  const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const totalMinutes = hour * 60 + minute;
  return { dateStr, tomorrowDateStr, timeStr, hour, minute, totalMinutes };
}

export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map((s) => parseInt(s, 10) || 0);
  return h * 60 + m;
}

/**
 * Universal WhatsApp Sender Helper
 * Supports UltraMsg, Meta WhatsApp Cloud API, and Custom Webhooks
 */
export async function sendHttpWhatsApp(
  gateway: WhatsAppPollDayState['gateway'] | undefined,
  toTarget: string,
  message: string
): Promise<{ success: boolean; error?: string; response?: any }> {
  if (!gateway || gateway.provider === 'none') {
    return {
      success: false,
      error: 'WhatsApp Gateway Provider is not configured. Use the 1-Click WhatsApp links to send messages.',
    };
  }

  const raw = (toTarget || '').trim();
  const isGroupLink = raw.includes('chat.whatsapp.com/');
  const isGroupJid = raw.includes('@g.us');

  let cleanRecipient = '';
  if (isGroupJid) {
    cleanRecipient = raw.replace(/\s+/g, '');
  } else if (!isGroupLink) {
    cleanRecipient = normalizeBdPhoneNumber(raw);
    if (!cleanRecipient) {
      return { success: false, error: 'Recipient phone number is missing or invalid' };
    }
  }

  try {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID || '';
    const token = process.env.ULTRAMSG_TOKEN || '';

    if (gateway.provider === 'ultramsg' || gateway.provider === 'custom_webhook') {
      if (!instanceId || !token) {
        return { success: false, error: 'ULTRAMSG_INSTANCE_ID এবং ULTRAMSG_TOKEN পরিবেশ ভ্যারিয়েবল কনফিগার করা নেই' };
      }

      // If target is a WhatsApp Group invite link, try joining group to resolve group JID
      if (isGroupLink) {
        const match = raw.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
        const inviteCode = match ? match[1] : '';
        if (inviteCode) {
          try {
            const joinRes = await fetch(`https://api.ultramsg.com/${gateway.instanceId}/groups/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                token: token,
                code: inviteCode,
              }),
            });
            const joinData: any = await joinRes.json().catch(() => ({}));
            if (joinData.group_id) {
              cleanRecipient = joinData.group_id;
            }
          } catch (joinErr) {
            console.warn('UltraMsg group join attempt:', joinErr);
          }
        }
        if (!cleanRecipient) {
          cleanRecipient = match ? match[1] : raw;
        }
      }

      const url = `https://api.ultramsg.com/${gateway.instanceId}/messages/chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: token,
          to: cleanRecipient,
          body: message,
        }),
      });
      const rawText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        if (rawText.includes('Stopped due to non-payment')) {
          return {
            success: false,
            error:
              'UltraMsg অ্যাকাউন্টটি বকেয়া পেমেন্ট বা সাবস্ক্রিপশন শেষ হওয়ার কারণে স্থগিত (Non-payment error: Your instance has been Stopped due to non-payment)। UltraMsg রিনিউ করুন অথবা সরাসরি WhatsApp মোড ব্যবহার করুন।',
          };
        }
        return { success: false, error: 'UltraMsg returned invalid response' };
      }
      if (
        rawText.includes('Stopped due to non-payment') ||
        (data.error && String(data.error).includes('Stopped due to non-payment'))
      ) {
        return {
          success: false,
          error:
            'UltraMsg অ্যাকাউন্টটি বকেয়া পেমেন্ট বা সাবস্ক্রিপশন শেষ হওয়ার কারণে স্থগিত (Non-payment error: Your instance has been Stopped due to non-payment)। UltraMsg রিনিউ করুন অথবা সরাসরি WhatsApp মোড ব্যবহার করুন।',
        };
      }
      if (res.ok && (data.sent === 'true' || data.sent === true || data.id)) {
        return { success: true, response: data };
      }
      return { success: false, error: data.message || data.error || 'Failed to send via UltraMsg' };
    }

    if (gateway.provider === 'meta_cloud') {
      if (!cleanRecipient || isGroupLink || isGroupJid) {
        return {
          success: false,
          error: 'Meta Cloud API supports individual numbers only. Use WhatsApp Web/App 1-Click link for WhatsApp group.',
        };
      }
      if (!gateway.phoneId || !token) {
        return { success: false, error: 'Meta Cloud API Phone Number ID and Token are required' };
      }
      const url = `https://graph.facebook.com/v19.0/${gateway.phoneId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanRecipient,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      });
      const data = await res.json();
      if (res.ok && data.messages) {
        return { success: true, response: data };
      }
      return { success: false, error: data.error?.message || 'Failed to send via Meta Cloud API' };
    }

    if (gateway.provider === 'custom_webhook') {
      if (!gateway.webhookUrl) {
        return { success: false, error: 'Custom webhook URL is required' };
      }
      const res = await fetch(gateway.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          to: cleanRecipient || raw,
          phone: cleanRecipient || raw,
          message: message,
          timestamp: new Date().toISOString(),
        }),
      });
      const data = await res.text();
      return { success: res.ok, response: data };
    }

    return { success: false, error: 'Unsupported gateway provider' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error calling WhatsApp Gateway' };
  }
}

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'whatsapp_polls.json');
const MEMBERS_FILE = path.join(DATA_DIR, 'whatsapp_members.json');

function getTodayString(): string {
  const now = new Date();
  // Bangladesh is UTC+6
  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const year = bdTime.getUTCFullYear();
  const month = String(bdTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bdTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTomorrowString(): string {
  const now = new Date();
  // Bangladesh is UTC+6
  const bdTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  bdTime.setUTCDate(bdTime.getUTCDate() + 1);
  const year = bdTime.getUTCFullYear();
  const month = String(bdTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(bdTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNextDayString(fromDateStr: string): string {
  try {
    const parts = fromDateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      d.setUTCDate(d.getUTCDate() + 1);
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}
  return getTomorrowString();
}

export class WhatsAppAutomationService {
  private static instance: WhatsAppAutomationService;
  private state: WhatsAppPollDayState;
  private activeMembers: ActiveMemberInfo[] = [];
  private cronTasks: any[] = [];
  private pollIntervalTimer: NodeJS.Timeout | null = null;
  private processedMessageIds: Set<string> = new Set();
  private isCheckingAutomations: boolean = false;
  private isTriggeringTomorrowPoll: boolean = false;
  private isFinalizingTomorrow: boolean = false;

  private constructor() {
    this.ensureDataDir();
    this.loadSavedMembers();
    this.state = this.loadState();
    this.repopulateMembersIfAvailable();
    this.initDefaultCronJobs();
    this.startIncomingMessagePoller();
  }

  public static getInstance(): WhatsAppAutomationService {
    if (!WhatsAppAutomationService.instance) {
      WhatsAppAutomationService.instance = new WhatsAppAutomationService();
    }
    return WhatsAppAutomationService.instance;
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.error('Failed to create data directory:', e);
      }
    }
  }

  private loadSavedMembers() {
    try {
      if (fs.existsSync(MEMBERS_FILE)) {
        const raw = fs.readFileSync(MEMBERS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.activeMembers = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read saved members file:', e);
    }
  }

  private saveSavedMembers() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(MEMBERS_FILE, JSON.stringify(this.activeMembers, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save members file:', e);
    }
  }

  public getDefaultTemplates(): WhatsAppMessageTemplates {
    return {
      tomorrowPollMessage: `📢 *মেস মিল পোল (আগামীকালের মিল)*
তারিখ: {tomorrowDate}

দোকানদারের নিয়ম অনুযায়ী ১ দিন আগেই মিল অন/অফ জানাতে হবে।
কাল আপনার কয়টি মিল চলবে?

উত্তর দিতে নিচের যেকোনো একটি নম্বর লিখে রিপ্লাই দিন:
১ = দুপুর ও রাত (দুটোই অন)
২ = শুধু দুপুর (দুপুর চলবে, রাত অফ)
৩ = শুধু রাত (রাত চলবে, দুপুর অফ)
৪ = কোনো মিল চলবে না (মিল অফ)

⚠️ (রাত ১০:০০ টা এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`,
      lunchPollMessage: `📢 *মেস মিল পোল (দুপুরের মিল)*
আজ দুপুরের কি আপনার মিল চলবে?

উত্তর দিতে মেসেজ করুন:
১ = হ্যাঁ (মিল অন)
২ = না (মিল অফ)

⚠️ (সকাল ১১:০০ টা এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`,
      dinnerPollMessage: `📢 *মেস মিল পোল (রাতের মিল)*
আজ রাতের কি আপনার মিল চলবে?

উত্তর দিতে মেসেজ করুন:
১ = হ্যাঁ (মিল অন)
২ = না (মিল অফ)

⚠️ (বিকাল ০৫:০০ টা এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`,
      cookTomorrowNotificationTemplate: `📢 *আগামীকালের মেস মিলের তালিকা ({tomorrowDate})*
দোকানদার ভাই / বাবুর্চি, আগামীকাল আমাদের মেসের মোট মিলের হিসেব:

🍛 দুপুরের মিল: {lunchCount} জন
🍲 রাতের মিল: {dinnerCount} জন

📋 মেম্বার চয়েস বিবরণ:
• ১. দুপুর ও রাত: {bothCount} জন
• ২. শুধু দুপুর: {lunchOnlyCount} জন
• ৩. শুধু রাত: {dinnerOnlyCount} জন
• ৪. মিল অফ: {noneCount} জন

ধন্যবাদ!
- মেস ম্যানেজার`,
      cookNotificationTemplate: `আজ {slot} মোট {count} জনের মিল রান্না করবেন`,
      advancePollTime: '20:00',
      advanceCutoffTime: '22:30',
      morningPollTime: '08:00',
      afternoonPollTime: '14:00',
      lunchCutoffTime: '11:00',
      dinnerCutoffTime: '17:00',
      enableLunchPoll: false, // 1-Day Advance rule is active, so daily morning lunch poll is deleted/disabled
      enableDinnerPoll: false,
      enableAdvancePoll: true,
    };
  }

  public getFormattedTomorrowPollMessage(targetDate?: string): string {
    const defaultTemplates = this.getDefaultTemplates();
    const tpl = this.state.templates || defaultTemplates;
    const template = tpl.tomorrowPollMessage || defaultTemplates.tomorrowPollMessage;
    const dateStr = targetDate || (this.state.tomorrow?.targetDate || getTomorrowString());
    return template
      .replace(/\{tomorrowDate\}/gi, dateStr)
      .replace(/\{tomorrow_date\}/gi, dateStr)
      .replace(/\{date\}/gi, dateStr);
  }

  public getFormattedCookTomorrowMessage(): string {
    const defaultTemplates = this.getDefaultTemplates();
    const tpl = this.state.templates || defaultTemplates;
    const template = tpl.cookTomorrowNotificationTemplate || defaultTemplates.cookTomorrowNotificationTemplate;
    const tomorrow = this.state.tomorrow;
    const dateStr = tomorrow?.targetDate || getTomorrowString();
    const lunchCount = tomorrow?.totalLunchMeals ?? 0;
    const dinnerCount = tomorrow?.totalDinnerMeals ?? 0;
    const totalCount = lunchCount + dinnerCount;
    const bothCount = tomorrow?.bothCount ?? 0;
    const lunchOnlyCount = tomorrow?.lunchOnlyCount ?? 0;
    const dinnerOnlyCount = tomorrow?.dinnerOnlyCount ?? 0;
    const noneCount = tomorrow?.noneCount ?? 0;

    let memberBreakdown = '';
    if (tomorrow?.votes) {
      const votes = Object.values(tomorrow.votes);
      const both = votes.filter((v) => v.choice === 'BOTH').map((v) => v.memberName);
      const lunchOnly = votes.filter((v) => v.choice === 'LUNCH_ONLY').map((v) => v.memberName);
      const dinnerOnly = votes.filter((v) => v.choice === 'DINNER_ONLY').map((v) => v.memberName);
      const none = votes.filter((v) => v.choice === 'NONE').map((v) => v.memberName);

      const lines: string[] = [];
      if (both.length > 0) lines.push(`• দুপুর ও রাত: ${both.join(', ')}`);
      if (lunchOnly.length > 0) lines.push(`• শুধু দুপুর: ${lunchOnly.join(', ')}`);
      if (dinnerOnly.length > 0) lines.push(`• শুধু রাত: ${dinnerOnly.join(', ')}`);
      if (none.length > 0) lines.push(`• মিল অফ: ${none.join(', ')}`);
      memberBreakdown = lines.join('\n');
    }

    return template
      .replace(/\{tomorrowDate\}/gi, dateStr)
      .replace(/\{tomorrow_date\}/gi, dateStr)
      .replace(/\{date\}/gi, dateStr)
      .replace(/\{lunchCount\}/gi, lunchCount.toString())
      .replace(/\{lunch_count\}/gi, lunchCount.toString())
      .replace(/\{dinnerCount\}/gi, dinnerCount.toString())
      .replace(/\{dinner_count\}/gi, dinnerCount.toString())
      .replace(/\{totalCount\}/gi, totalCount.toString())
      .replace(/\{total_count\}/gi, totalCount.toString())
      .replace(/\{bothCount\}/gi, bothCount.toString())
      .replace(/\{both_count\}/gi, bothCount.toString())
      .replace(/\{lunchOnlyCount\}/gi, lunchOnlyCount.toString())
      .replace(/\{lunch_only_count\}/gi, lunchOnlyCount.toString())
      .replace(/\{dinnerOnlyCount\}/gi, dinnerOnlyCount.toString())
      .replace(/\{dinner_only_count\}/gi, dinnerOnlyCount.toString())
      .replace(/\{noneCount\}/gi, noneCount.toString())
      .replace(/\{none_count\}/gi, noneCount.toString())
      .replace(/\{memberBreakdown\}/gi, memberBreakdown)
      .replace(/\{member_breakdown\}/gi, memberBreakdown);
  }

  public getFormattedPollMessage(slot: 'lunch' | 'dinner'): string {
    const defaultTemplates = this.getDefaultTemplates();
    const tpl = this.state.templates || defaultTemplates;
    if (slot === 'lunch') {
      return tpl.lunchPollMessage || defaultTemplates.lunchPollMessage;
    }
    return tpl.dinnerPollMessage || defaultTemplates.dinnerPollMessage;
  }

  public getFormattedCookMessage(slot: 'lunch' | 'dinner', count: number): string {
    const defaultTemplates = this.getDefaultTemplates();
    const tpl = this.state.templates || defaultTemplates;
    const template = tpl.cookNotificationTemplate || defaultTemplates.cookNotificationTemplate;
    const slotBangla = slot === 'lunch' ? 'দুপুরে' : 'রাতে';
    return template.replace(/\{slot\}/g, slotBangla).replace(/\{count\}/g, count.toString());
  }

  private createFreshTomorrowPoll(targetDate: string, pollDate: string, previous?: Partial<TomorrowMealPoll>): TomorrowMealPoll {
    const votes: Record<string, TomorrowMemberVote> = {};
    if (this.activeMembers && this.activeMembers.length > 0) {
      this.activeMembers.forEach((m) => {
        votes[m.id] = {
          memberId: m.id,
          memberName: m.fullName,
          phone: m.phone,
          choice: 'PENDING',
          lunchStatus: 'PENDING',
          dinnerStatus: 'PENDING',
          votedAt: undefined,
          manualOverride: false,
          isAutoResolved: false,
        };
      });
    }

    const poll: TomorrowMealPoll = {
      targetDate,
      pollDate,
      question: 'আগামীকাল আপনার কয়টা মিল চলবে? ১=দুপুর ও রাত, ২=শুধু দুপুর, ৩=শুধু রাত, ৪=মিল অফ',
      status: 'SCHEDULED',
      totalActiveMembers: Object.keys(votes).length,
      bothCount: 0,
      lunchOnlyCount: 0,
      dinnerOnlyCount: 0,
      noneCount: 0,
      pendingCount: Object.keys(votes).length,
      totalLunchMeals: 0,
      totalDinnerMeals: 0,
      votes,
      lastDispatchedSummary: previous?.lastDispatchedSummary,
    };
    this.recalculateTomorrowCounts(poll);
    return poll;
  }

  private recalculateTomorrowCounts(poll: TomorrowMealPoll) {
    let both = 0;
    let lunchOnly = 0;
    let dinnerOnly = 0;
    let none = 0;
    let pending = 0;

    Object.values(poll.votes).forEach((v) => {
      if (v.choice === 'BOTH') both++;
      else if (v.choice === 'LUNCH_ONLY') lunchOnly++;
      else if (v.choice === 'DINNER_ONLY') dinnerOnly++;
      else if (v.choice === 'NONE') none++;
      else pending++;
    });

    poll.bothCount = both;
    poll.lunchOnlyCount = lunchOnly;
    poll.dinnerOnlyCount = dinnerOnly;
    poll.noneCount = none;
    poll.pendingCount = pending;
    poll.totalLunchMeals = both + lunchOnly;
    poll.totalDinnerMeals = both + dinnerOnly;
    poll.totalActiveMembers = Object.keys(poll.votes).length;
  }

  private loadState(): WhatsAppPollDayState {
    const today = getTodayString();
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.date === today) {
          if (!parsed.gateway) {
            parsed.gateway = {
              provider: 'none',
            };
          }
          if (!parsed.templates) {
            parsed.templates = this.getDefaultTemplates();
          }
          if (!parsed.tomorrow) {
            parsed.tomorrow = this.createFreshTomorrowPoll(getTomorrowString(), today);
          }
          if (
            !parsed.cookPhone ||
            parsed.cookPhone === '8801812345679' ||
            parsed.cookPhone === '8801812345678'
          ) {
            parsed.cookPhone = 'https://chat.whatsapp.com/B7X9qMessBazarGroup';
            parsed.cookName = 'দোকানদার / বাবুর্চির হোয়াটসঅ্যাপ গ্রুপ';
          }
          return parsed;
        }
        return this.createFreshDayState(today, parsed);
      }
    } catch (e) {
      console.warn('Could not read existing state file, initializing fresh:', e);
    }

    return this.createFreshDayState(today);
  }

  private createFreshDayState(date: string, previousState?: Partial<WhatsAppPollDayState>): WhatsAppPollDayState {
    const tomorrowDate = getTomorrowString();
    const prevCookPhone = previousState?.cookPhone;
    const defaultCookGroup =
      prevCookPhone &&
      prevCookPhone !== '8801812345679' &&
      prevCookPhone !== '8801812345678'
        ? prevCookPhone
        : 'https://chat.whatsapp.com/B7X9qMessBazarGroup';

    return {
      date,
      tomorrow: this.createFreshTomorrowPoll(tomorrowDate, date, previousState?.tomorrow),
      lunch: {
        slot: 'lunch',
        date,
        question: 'আজ দুপুরে কি আপনার মিল চলবে?',
        status: 'SCHEDULED',
        totalActiveMembers: 0,
        yesCount: 0,
        noCount: 0,
        pendingCount: 0,
        votes: {},
      },
      dinner: {
        slot: 'dinner',
        date,
        question: 'আজ রাতে কি আপনার মিল চলবে?',
        status: 'SCHEDULED',
        totalActiveMembers: 0,
        yesCount: 0,
        noCount: 0,
        pendingCount: 0,
        votes: {},
      },
      cookPhone: defaultCookGroup,
      cookName: previousState?.cookName || 'দোকানদার / বাবুর্চির হোয়াটসঅ্যাপ গ্রুপ',
      isAutomationEnabled: previousState?.isAutomationEnabled ?? true,
      gateway: previousState?.gateway || {
        provider: 'none',
      },
      templates: previousState?.templates || this.getDefaultTemplates(),
      lastSyncAt: new Date().toISOString(),
      logs: [
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          message: `WhatsApp Poll Automation System initialized for ${date}`,
          type: 'info',
        },
      ],
    };
  }

  private saveState() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save state to disk:', e);
    }
  }

  private addLog(message: string, type: 'info' | 'success' | 'warning' = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.state.logs.unshift({ timestamp, message, type });
    if (this.state.logs.length > 50) {
      this.state.logs.pop();
    }
    console.log(`[WhatsAppService][${type.toUpperCase()}] ${message}`);
  }

  /**
   * Initialize cron jobs with explicit Asia/Dhaka (Bangladesh) timezone
   */
  public initDefaultCronJobs() {
    this.cronTasks.forEach((t) => t.stop());
    this.cronTasks = [];

    const cron = getCron();
    if (!cron) {
      console.log('[WhatsAppService] Cron scheduler inactive in serverless mode.');
      return;
    }

    const morningTime = this.state?.templates?.morningPollTime || '08:00';
    const afternoonTime = this.state?.templates?.afternoonPollTime || '14:00';
    const lunchCutoff = this.state?.templates?.lunchCutoffTime || '11:00';
    const dinnerCutoff = this.state?.templates?.dinnerCutoffTime || '17:00';

    const [mHour, mMin] = morningTime.split(':').map((s) => parseInt(s, 10) || 0);
    const [aHour, aMin] = afternoonTime.split(':').map((s) => parseInt(s, 10) || 0);
    const [lcHour, lcMin] = lunchCutoff.split(':').map((s) => parseInt(s, 10) || 0);
    const [dcHour, dcMin] = dinnerCutoff.split(':').map((s) => parseInt(s, 10) || 0);

    // 1-3. Morning Lunch Poll & Cutoff & Dispatch (Only if enableLunchPoll is true)
    const isLunchEnabled = this.state?.templates?.enableLunchPoll === true;
    if (isLunchEnabled) {
      const taskLunchPoll = cron.schedule(
        `${mMin} ${mHour} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.addLog(`[AUTO-CRON ${morningTime}] সকালের স্বয়ংক্রিয় লাঞ্চ পোল শুরু হচ্ছে...`, 'info');
          this.sendPollToAllMembers('lunch', `Auto Cron ${morningTime}`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      const taskLunchResolve = cron.schedule(
        `${lcMin} ${lcHour} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.autoResolvePendingLunch(`Auto Cron ${lunchCutoff}`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      const taskLunchDispatch = cron.schedule(
        `${(lcMin + 5) % 60} ${lcHour + Math.floor((lcMin + 5) / 60)} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.dispatchLunchToCook(`Auto Cron Cook Dispatch`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      this.cronTasks.push(taskLunchPoll, taskLunchResolve, taskLunchDispatch);
    }

    // 4-6. Afternoon Dinner Poll & Cutoff & Dispatch (Only if enableDinnerPoll is true)
    const isDinnerEnabled = this.state?.templates?.enableDinnerPoll === true;
    if (isDinnerEnabled) {
      const taskDinnerPoll = cron.schedule(
        `${aMin} ${aHour} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.addLog(`[AUTO-CRON ${afternoonTime}] দুপুরের স্বয়ংক্রিয় ডিনার পোল শুরু হচ্ছে...`, 'info');
          this.sendPollToAllMembers('dinner', `Auto Cron ${afternoonTime}`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      const taskDinnerResolve = cron.schedule(
        `${dcMin} ${dcHour} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.autoResolvePendingDinner(`Auto Cron ${dinnerCutoff}`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      const taskDinnerDispatch = cron.schedule(
        `${(dcMin + 5) % 60} ${dcHour + Math.floor((dcMin + 5) / 60)} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.dispatchDinnerToCook(`Auto Cron Cook Dispatch`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      this.cronTasks.push(taskDinnerPoll, taskDinnerResolve, taskDinnerDispatch);
    }

    // 7. Advance Tomorrow Poll (Night 08:00 PM / 20:00 default) - Active by default
    const isAdvanceEnabled = this.state?.templates?.enableAdvancePoll !== false;
    const advPollTime = this.state?.templates?.advancePollTime || '20:00';
    const advCutoff = this.state?.templates?.advanceCutoffTime || '22:30';
    const [apHour, apMin] = advPollTime.split(':').map((s) => parseInt(s, 10) || 0);
    const [acHour, acMin] = advCutoff.split(':').map((s) => parseInt(s, 10) || 0);

    if (isAdvanceEnabled) {
      const taskTomorrowPoll = cron.schedule(
        `${apMin} ${apHour} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.addLog(`[AUTO-CRON ${advPollTime}] রাতের স্বয়ংক্রিয় আগামীকালের মিল পোল শুরু হচ্ছে...`, 'info');
          this.triggerTomorrowPoll(`Auto Cron ${advPollTime}`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      // 8. Advance Tomorrow Auto-resolve & Dispatch to Shopkeeper/Cook
      const taskTomorrowDispatch = cron.schedule(
        `${acMin} ${acHour} * * *`,
        () => {
          this.checkAndRolloverDate();
          this.addLog(`[AUTO-CRON ${advCutoff}] আগামীকালের মিল তালিকা দোকানদারকে পাঠানোর সময় হয়েছে...`, 'info');
          this.finalizeTomorrowAndDispatch(`Auto Cron Advance Cutoff ${advCutoff}`);
        },
        { timezone: 'Asia/Dhaka' }
      );

      this.cronTasks.push(taskTomorrowPoll, taskTomorrowDispatch);
    }

    console.log(
      `[WhatsAppService] Scheduled automated cron tasks (${this.cronTasks.length} active in Asia/Dhaka). Advance Poll: ${
        isAdvanceEnabled ? advPollTime : 'DISABLED'
      }, Lunch Poll: ${isLunchEnabled ? morningTime : 'DELETED/DISABLED'}, Dinner Poll: ${
        isDinnerEnabled ? afternoonTime : 'DELETED/DISABLED'
      }`
    );

    // Immediate background schedule check
    this.checkAndTriggerDueAutomations().catch((err) =>
      console.warn('[WhatsAppService] Error in initial schedule check:', err.message)
    );
  }

  /**
   * Active Schedule Ticker:
   * Runs continuously in background every 10 seconds and on API requests.
   * Compares Bangladesh time with scheduled times and triggers any pending auto messages immediately!
   */
  public async checkAndTriggerDueAutomations(): Promise<void> {
    if (this.isCheckingAutomations) return;
    this.isCheckingAutomations = true;
    try {
      this.checkAndRolloverDate();
      if (this.state.isAutomationEnabled === false) return;

      const bd = getBangladeshNow();
      const currentMinutes = bd.totalMinutes;
      const tpl = this.state.templates || this.getDefaultTemplates();

      // 1. Advance Tomorrow Poll Automation (1-Day Advance Rule)
      const isAdvanceEnabled = tpl.enableAdvancePoll !== false;
      if (isAdvanceEnabled) {
        if (!this.state.tomorrow) {
          this.state.tomorrow = this.createFreshTomorrowPoll(getTomorrowString(), this.state.date);
        }
        const tomorrow = this.state.tomorrow;
        const advPollTime = tpl.advancePollTime || '20:00';
        const advCutoffTime = tpl.advanceCutoffTime || '22:30';
        const pollMinutes = parseTimeToMinutes(advPollTime);
        const cutoffMinutes = parseTimeToMinutes(advCutoffTime);

        // Check if poll is due and not yet sent
        if (tomorrow.status === 'SCHEDULED' && !this.isTriggeringTomorrowPoll) {
          if (currentMinutes >= pollMinutes && currentMinutes < cutoffMinutes) {
            this.isTriggeringTomorrowPoll = true;
            this.addLog(
              `[AUTO-SCHEDULE ${advPollTime}] সময় হয়েছে (বর্তমান সময়: ${bd.timeStr})। স্বয়ংক্রিয়ভাবে আগামীকালের WhatsApp পোল পাঠানো শুরু হচ্ছে...`,
              'info'
            );
            try {
              await this.triggerTomorrowPoll(`Auto Schedule (${advPollTime})`);
            } finally {
              this.isTriggeringTomorrowPoll = false;
            }
          }
        }

        // Check if cutoff is due and not yet finalized (only if poll was actually sent)
        if (tomorrow.status === 'POLL_SENT' && !this.isFinalizingTomorrow) {
          if (currentMinutes >= cutoffMinutes) {
            this.isFinalizingTomorrow = true;
            this.addLog(
              `[AUTO-SCHEDULE ${advCutoffTime}] কাটঅফ সময় অতিক্রান্ত (বর্তমান সময়: ${bd.timeStr})। অপশনবিহীনদের অন করে দোকানদারকে হিসাব পাঠানো হচ্ছে...`,
              'info'
            );
            try {
              await this.finalizeTomorrowAndDispatch(`Auto Schedule Cutoff (${advCutoffTime})`);
            } finally {
              this.isFinalizingTomorrow = false;
            }
          }
        }
      }

      // 2. Today Lunch Poll (if enabled)
      if (tpl.enableLunchPoll === true) {
        const lunch = this.state.lunch;
        const morningTime = tpl.morningPollTime || '08:00';
        const lunchCutoff = tpl.lunchCutoffTime || '11:00';
        const mMin = parseTimeToMinutes(morningTime);
        const cMin = parseTimeToMinutes(lunchCutoff);

        if (lunch.status === 'SCHEDULED' && currentMinutes >= mMin && currentMinutes < cMin) {
          this.addLog(
            `[AUTO-SCHEDULE ${morningTime}] সময় হয়েছে (বর্তমান সময়: ${bd.timeStr})। আজকের দুপুরের WhatsApp পোল পাঠানো হচ্ছে...`,
            'info'
          );
          await this.sendPollToAllMembers('lunch', `Auto Schedule (${morningTime})`);
        }

        if (lunch.status === 'POLL_SENT' && currentMinutes >= cMin) {
          this.addLog(
            `[AUTO-SCHEDULE ${lunchCutoff}] দুপুরের কাটঅফ সময়। বাবুর্চিকে পাঠানো হচ্ছে...`,
            'info'
          );
          this.autoResolvePendingLunch(`Auto Schedule (${lunchCutoff})`);
          this.dispatchLunchToCook(`Auto Schedule (${lunchCutoff})`);
        }
      }

      // 3. Today Dinner Poll (if enabled)
      if (tpl.enableDinnerPoll === true) {
        const dinner = this.state.dinner;
        const afternoonTime = tpl.afternoonPollTime || '14:00';
        const dinnerCutoff = tpl.dinnerCutoffTime || '17:00';
        const aMin = parseTimeToMinutes(afternoonTime);
        const cMin = parseTimeToMinutes(dinnerCutoff);

        if (dinner.status === 'SCHEDULED' && currentMinutes >= aMin && currentMinutes < cMin) {
          this.addLog(
            `[AUTO-SCHEDULE ${afternoonTime}] সময় হয়েছে (বর্তমান সময়: ${bd.timeStr})। আজকের রাতের WhatsApp পোল পাঠানো হচ্ছে...`,
            'info'
          );
          await this.sendPollToAllMembers('dinner', `Auto Schedule (${afternoonTime})`);
        }

        if (dinner.status === 'POLL_SENT' && currentMinutes >= cMin) {
          this.addLog(
            `[AUTO-SCHEDULE ${dinnerCutoff}] রাতের কাটঅফ সময়। বাবুর্চিকে পাঠানো হচ্ছে...`,
            'info'
          );
          this.autoResolvePendingDinner(`Auto Schedule (${dinnerCutoff})`);
          this.dispatchDinnerToCook(`Auto Schedule (${dinnerCutoff})`);
        }
      }
    } catch (err: any) {
      console.error('[WhatsAppService] Error in checkAndTriggerDueAutomations:', err);
    } finally {
      this.isCheckingAutomations = false;
    }
  }

  /**
   * Automatically polls WhatsApp Gateway (UltraMsg) for new replies from members every 10 seconds,
   * AND executes the schedule ticker.
   */
  public startIncomingMessagePoller() {
    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
      this.pollIntervalTimer = null;
    }

    // Run immediately once, then every 10 seconds
    this.pollUltraMsgIncomingMessages().catch((e) =>
      console.warn('[WhatsAppService] Initial poll check error:', e.message)
    );
    this.checkAndTriggerDueAutomations().catch((e) =>
      console.warn('[WhatsAppService] Initial schedule check error:', e.message)
    );

    this.pollIntervalTimer = setInterval(() => {
      this.pollUltraMsgIncomingMessages().catch((e) =>
        console.warn('[WhatsAppService] Background poll check error:', e.message)
      );
      this.checkAndTriggerDueAutomations().catch((e) =>
        console.warn('[WhatsAppService] Background schedule check error:', e.message)
      );
    }, 10000);
  }

  public findMemberByPhone(phone: string): ActiveMemberInfo | null {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 6) return null;

    // 1. Search in activeMembers
    const foundInActive = this.activeMembers.find((m) => {
      if (!m.phone) return false;
      const memPhone = m.phone.replace(/\D/g, '');
      return (
        memPhone === cleanPhone ||
        memPhone.endsWith(cleanPhone) ||
        cleanPhone.endsWith(memPhone) ||
        cleanPhone.slice(-10) === memPhone.slice(-10)
      );
    });
    if (foundInActive) return foundInActive;

    // 2. Search in votes from today's lunch or dinner
    const allVotes = [
      ...Object.values(this.state.lunch?.votes || {}),
      ...Object.values(this.state.dinner?.votes || {}),
    ];
    const foundInVotes = allVotes.find((v) => {
      if (!v.phone) return false;
      const vPhone = v.phone.replace(/\D/g, '');
      return (
        vPhone === cleanPhone ||
        vPhone.endsWith(cleanPhone) ||
        cleanPhone.endsWith(vPhone) ||
        cleanPhone.slice(-10) === vPhone.slice(-10)
      );
    });
    if (foundInVotes) {
      return {
        id: foundInVotes.memberId,
        fullName: foundInVotes.memberName,
        phone: foundInVotes.phone,
        isActive: true,
      };
    }

    return null;
  }

  public async pollUltraMsgIncomingMessages(): Promise<number> {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;
    if (!instanceId || !token) return 0;

    try {
      // 1. Fetch recent incoming chats/messages from UltraMsg
      const url = `https://api.ultramsg.com/${instanceId}/chats?token=${token}&limit=25`;
      const res = await fetch(url);
      if (!res.ok) return 0;

      const chats = await res.json();
      if (!Array.isArray(chats)) return 0;

      let processedCount = 0;

      // Filter chats that match our members
      for (const chat of chats) {
        const rawChatId = chat.id || '';
        const phone = rawChatId.replace(/@.*$/, '').replace(/\D/g, '');
        if (!phone || phone.length < 6) continue;

        // Check if this chat belongs to one of our active members
        const member = this.findMemberByPhone(phone);
        if (!member) continue;

        // Fetch recent messages for this chat (latest 10)
        try {
          const msgUrl = `https://api.ultramsg.com/${instanceId}/chats/messages?token=${token}&chatId=${encodeURIComponent(rawChatId)}&limit=10`;
          const msgRes = await fetch(msgUrl);
          if (!msgRes.ok) continue;

          const msgs = await msgRes.json();
          if (!Array.isArray(msgs)) continue;

          // Find inbound messages from member (fromMe === false)
          for (const msg of msgs) {
            if (msg.fromMe === true) continue;
            const msgId = String(msg.id || '');
            if (!msgId || this.processedMessageIds.has(msgId)) continue;

            const text = (msg.body || '').trim();
            if (!text) continue;

            const senderPhone = (msg.from || phone).replace(/@.*$/, '');
            const result = this.handleIncomingVote(senderPhone, text);
            if (result.success) {
              this.processedMessageIds.add(msgId);
              processedCount++;
            }
          }
        } catch (chatErr: any) {
          console.warn(`[WhatsAppService] Error fetching chat messages for ${rawChatId}:`, chatErr.message);
        }
      }

      return processedCount;
    } catch (err: any) {
      console.warn('[WhatsAppService] Error polling UltraMsg messages:', err.message);
      return 0;
    }
  }

  private checkAndRolloverDate() {
    const today = getTodayString();
    if (this.state.date !== today) {
      this.state = this.createFreshDayState(today, this.state);
      this.repopulateMembersIfAvailable();
      this.saveState();
    }
  }

  public syncActiveMembers(members: ActiveMemberInfo[]) {
    this.checkAndRolloverDate();
    const prevCount = this.activeMembers.length;
    this.activeMembers = members.filter((m) => m.isActive);
    this.saveSavedMembers();
    this.repopulateMembersIfAvailable();
    if (prevCount !== this.activeMembers.length) {
      this.addLog(`Synced ${this.activeMembers.length} active members from database`);
    }
    this.saveState();
    this.checkAndTriggerDueAutomations().catch(() => {});
  }

  private repopulateMembersIfAvailable() {
    if (this.activeMembers.length === 0) return;

    ['lunch', 'dinner'].forEach((slotKey) => {
      const poll = slotKey === 'lunch' ? this.state.lunch : this.state.dinner;
      poll.totalActiveMembers = this.activeMembers.length;

      this.activeMembers.forEach((m) => {
        if (!poll.votes[m.id]) {
          poll.votes[m.id] = {
            memberId: m.id,
            memberName: m.fullName,
            phone: m.phone,
            status: 'PENDING',
          };
        } else {
          poll.votes[m.id].memberName = m.fullName;
          poll.votes[m.id].phone = m.phone;
        }
      });

      this.recalculateCounts(poll);
    });

    // Also populate tomorrow advance poll
    if (!this.state.tomorrow) {
      this.state.tomorrow = this.createFreshTomorrowPoll(getTomorrowString(), this.state.date);
    }
    const tomorrow = this.state.tomorrow;
    tomorrow.totalActiveMembers = this.activeMembers.length;
    this.activeMembers.forEach((m) => {
      if (!tomorrow.votes[m.id]) {
        tomorrow.votes[m.id] = {
          memberId: m.id,
          memberName: m.fullName,
          phone: m.phone,
          choice: 'PENDING',
          lunchStatus: 'PENDING',
          dinnerStatus: 'PENDING',
        };
      } else {
        tomorrow.votes[m.id].memberName = m.fullName;
        tomorrow.votes[m.id].phone = m.phone;
      }
    });
    this.recalculateTomorrowCounts(tomorrow);
  }

  private recalculateCounts(poll: MealSlotPoll) {
    let yes = 0;
    let no = 0;
    let pending = 0;

    Object.values(poll.votes).forEach((v) => {
      if (v.status === 'YES' || v.status === 'AUTO_YES') {
        yes++;
      } else if (v.status === 'NO') {
        no++;
      } else {
        pending++;
      }
    });

    poll.yesCount = yes;
    poll.noCount = no;
    poll.pendingCount = pending;
    poll.totalActiveMembers = Object.keys(poll.votes).length;
  }

  // --- LUNCH FLOW ---

  public triggerLunchPoll(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const poll = this.state.lunch;
    poll.status = 'POLL_SENT';
    poll.pollSentAt = new Date().toISOString();

    // Set all members to PENDING unless they were manually locked
    Object.keys(poll.votes).forEach((mId) => {
      if (!poll.votes[mId].manualOverride) {
        poll.votes[mId].status = 'PENDING';
      }
    });

    this.recalculateCounts(poll);
    this.addLog(
      `[LUNCH] Poll activated for ${poll.totalActiveMembers} active members: "${poll.question}" (Source: ${triggerSource})`,
      'success'
    );
    this.saveState();

    // If a gateway is configured, automatically send messages via API
    if (this.state.gateway && this.state.gateway.provider !== 'none') {
      this.dispatchPollViaGateway(poll.question, 'lunch');
    } else {
      this.addLog(
        `[LUNCH] Direct 1-Click WhatsApp links ready for ${poll.totalActiveMembers} members. Configure WhatsApp Gateway in settings for fully automated background delivery.`,
        'info'
      );
    }

    return poll;
  }

  public autoResolvePendingLunch(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    const poll = this.state.lunch;
    poll.status = 'AUTO_RESOLVED';
    poll.autoResolvedAt = new Date().toISOString();

    let autoYesCount = 0;
    Object.keys(poll.votes).forEach((mId) => {
      const v = poll.votes[mId];
      if (v.status === 'PENDING') {
        v.status = 'AUTO_YES';
        v.isAutoResolved = true;
        v.votedAt = new Date().toISOString();
        autoYesCount++;
      }
    });

    this.recalculateCounts(poll);
    this.addLog(
      `[LUNCH 11:00 AM] Auto-resolved ${autoYesCount} pending members to YES (মিল অন) (Source: ${triggerSource})`,
      'info'
    );
    this.saveState();
    return poll;
  }

  public dispatchLunchToCook(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    const poll = this.state.lunch;
    this.recalculateCounts(poll);

    poll.status = 'DISPATCHED_TO_COOK';
    poll.dispatchedAt = new Date().toISOString();

    const totalCount = poll.yesCount;
    const message = this.getFormattedCookMessage('lunch', totalCount);
    poll.cookMessageSent = message;

    this.addLog(
      `[LUNCH 11:05 AM] Cook notification prepared for ${this.state.cookPhone}: "${message}" (Source: ${triggerSource})`,
      'success'
    );
    this.saveState();

    if (this.state.gateway && this.state.gateway.provider !== 'none' && this.state.cookPhone) {
      sendHttpWhatsApp(this.state.gateway, this.state.cookPhone, message).then((res) => {
        if (res.success) {
          this.addLog(`[LUNCH] Direct WhatsApp message delivered to Cook (${this.state.cookPhone}) via Gateway`, 'success');
        } else {
          this.addLog(`[LUNCH] WhatsApp Gateway delivery to Cook failed: ${res.error}. Use 1-Click link.`, 'warning');
        }
        this.saveState();
      });
    }

    return { poll, message, cookPhone: this.state.cookPhone };
  }

  // --- DINNER FLOW ---

  public triggerDinnerPoll(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const poll = this.state.dinner;
    poll.status = 'POLL_SENT';
    poll.pollSentAt = new Date().toISOString();

    Object.keys(poll.votes).forEach((mId) => {
      if (!poll.votes[mId].manualOverride) {
        poll.votes[mId].status = 'PENDING';
      }
    });

    this.recalculateCounts(poll);
    this.addLog(
      `[DINNER] Poll activated for ${poll.totalActiveMembers} active members: "${poll.question}" (Source: ${triggerSource})`,
      'success'
    );
    this.saveState();

    if (this.state.gateway && this.state.gateway.provider !== 'none') {
      this.dispatchPollViaGateway(poll.question, 'dinner');
    } else {
      this.addLog(
        `[DINNER] Direct 1-Click WhatsApp links ready for ${poll.totalActiveMembers} members. Configure WhatsApp Gateway in settings for fully automated background delivery.`,
        'info'
      );
    }

    return poll;
  }

  public autoResolvePendingDinner(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    const poll = this.state.dinner;
    poll.status = 'AUTO_RESOLVED';
    poll.autoResolvedAt = new Date().toISOString();

    let autoYesCount = 0;
    Object.keys(poll.votes).forEach((mId) => {
      const v = poll.votes[mId];
      if (v.status === 'PENDING') {
        v.status = 'AUTO_YES';
        v.isAutoResolved = true;
        v.votedAt = new Date().toISOString();
        autoYesCount++;
      }
    });

    this.recalculateCounts(poll);
    this.addLog(
      `[DINNER 05:00 PM] Auto-resolved ${autoYesCount} pending members to YES (মিল অন) (Source: ${triggerSource})`,
      'info'
    );
    this.saveState();
    return poll;
  }

  public dispatchDinnerToCook(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    const poll = this.state.dinner;
    this.recalculateCounts(poll);

    poll.status = 'DISPATCHED_TO_COOK';
    poll.dispatchedAt = new Date().toISOString();

    const totalCount = poll.yesCount;
    const message = this.getFormattedCookMessage('dinner', totalCount);
    poll.cookMessageSent = message;

    this.addLog(
      `[DINNER 05:05 PM] Cook notification prepared for ${this.state.cookPhone}: "${message}" (Source: ${triggerSource})`,
      'success'
    );
    this.saveState();

    if (this.state.gateway && this.state.gateway.provider !== 'none' && this.state.cookPhone) {
      sendHttpWhatsApp(this.state.gateway, this.state.cookPhone, message).then((res) => {
        if (res.success) {
          this.addLog(`[DINNER] Direct WhatsApp message delivered to Cook (${this.state.cookPhone}) via Gateway`, 'success');
        } else {
          this.addLog(`[DINNER] WhatsApp Gateway delivery to Cook failed: ${res.error}. Use 1-Click link.`, 'warning');
        }
        this.saveState();
      });
    }

    return { poll, message, cookPhone: this.state.cookPhone };
  }

  // --- ADVANCE TOMORROW POLL FLOW (1 DAY ADVANCE SHOPKEEPER RULE) ---

  public async triggerTomorrowPoll(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const tomorrow = this.state.tomorrow!;
    tomorrow.status = 'POLL_SENT';
    tomorrow.pollSentAt = new Date().toISOString();
    tomorrow.cookMessageSent = undefined;
    tomorrow.dispatchedAt = undefined;
    tomorrow.autoResolvedAt = undefined;

    // Reset member choices to PENDING so every new poll starts 100% fresh and clean
    Object.keys(tomorrow.votes).forEach((mId) => {
      const v = tomorrow.votes[mId];
      if (!v.manualOverride) {
        v.choice = 'PENDING';
        v.lunchStatus = 'PENDING';
        v.dinnerStatus = 'PENDING';
        v.isAutoResolved = false;
        v.votedAt = undefined;
        v.rawResponse = undefined;
      }
    });
    this.recalculateTomorrowCounts(tomorrow);

    const message = this.getFormattedTomorrowPollMessage(tomorrow.targetDate);
    this.addLog(
      `[TOMORROW POLL] দোকানদারের ১ দিন পূর্বের নিয়মে আগামীকালের ৪-পছন্দ পোল শুরু হয়েছে (${tomorrow.targetDate}). Source: ${triggerSource}`,
      'info'
    );

    let deliveredCount = 0;
    let failedCount = 0;
    const deliveredNames: string[] = [];
    const missingPhoneNames: string[] = [];

    for (const member of this.activeMembers) {
      if (!member.phone || member.phone.replace(/\D/g, '').length < 6) {
        missingPhoneNames.push(member.fullName);
        continue;
      }

      const res = await sendHttpWhatsApp(this.state.gateway, member.phone, message);
      if (res.success) {
        deliveredCount++;
        deliveredNames.push(member.fullName);
        this.addLog(`[TOMORROW POLL] হোয়াটসঅ্যাপ পোল পাঠানো হয়েছে: ${member.fullName} (${member.phone})`, 'success');
      } else {
        failedCount++;
        this.addLog(`[TOMORROW POLL] পাঠাতে ব্যর্থ: ${member.fullName} (${member.phone}) - ${res.error}`, 'warning');
      }
    }

    this.saveState();
    return {
      poll: tomorrow,
      deliveredCount,
      failedCount,
      deliveredNames,
      missingPhoneNames,
    };
  }

  public async sendTomorrowPollToSingleMember(memberId: string) {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const member = this.activeMembers.find((m) => m.id === memberId);
    if (!member) return { success: false, error: 'Member not found' };
    if (!member.phone) return { success: false, error: 'Member phone missing' };

    const message = this.getFormattedTomorrowPollMessage(this.state.tomorrow?.targetDate);
    const res = await sendHttpWhatsApp(this.state.gateway, member.phone, message);
    if (res.success) {
      this.addLog(`[TOMORROW POLL] হোয়াটসঅ্যাপ পোল পাঠানো হয়েছে: ${member.fullName} (${member.phone})`, 'success');
    } else {
      this.addLog(`[TOMORROW POLL] পাঠাতে ব্যর্থ: ${member.fullName} - ${res.error}`, 'warning');
    }
    return {
      success: res.success,
      memberName: member.fullName,
      phone: member.phone,
      error: res.error,
    };
  }

  public setTomorrowMemberChoice(memberId: string, choice: AdvanceMealChoice): TomorrowMealPoll {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const tomorrow = this.state.tomorrow!;
    const member = this.activeMembers.find((m) => m.id === memberId);
    const memberName = member ? member.fullName : 'সদস্য';

    const lunchStatus: PollVoteStatus = (choice === 'BOTH' || choice === 'LUNCH_ONLY') ? 'YES' : 'NO';
    const dinnerStatus: PollVoteStatus = (choice === 'BOTH' || choice === 'DINNER_ONLY') ? 'YES' : 'NO';

    tomorrow.votes[memberId] = {
      memberId,
      memberName,
      phone: member?.phone,
      choice,
      lunchStatus: choice === 'PENDING' ? 'PENDING' : lunchStatus,
      dinnerStatus: choice === 'PENDING' ? 'PENDING' : dinnerStatus,
      votedAt: new Date().toISOString(),
      manualOverride: true,
      isAutoResolved: false,
    };

    // Keep lunch & dinner slots synchronized
    if (this.state.lunch.votes[memberId]) {
      this.state.lunch.votes[memberId].status = choice === 'PENDING' ? 'PENDING' : lunchStatus;
      this.state.lunch.votes[memberId].manualOverride = true;
    }
    if (this.state.dinner.votes[memberId]) {
      this.state.dinner.votes[memberId].status = choice === 'PENDING' ? 'PENDING' : dinnerStatus;
      this.state.dinner.votes[memberId].manualOverride = true;
    }

    this.recalculateTomorrowCounts(tomorrow);
    this.recalculateCounts(this.state.lunch);
    this.recalculateCounts(this.state.dinner);

    const choiceLabel =
      choice === 'BOTH'
        ? '১ = দুপুর ও রাত (দুটোই অন)'
        : choice === 'LUNCH_ONLY'
        ? '২ = শুধু দুপুর'
        : choice === 'DINNER_ONLY'
        ? '৩ = শুধু রাত'
        : choice === 'NONE'
        ? '৪ = কোনো মিল চলবে না (মিল অফ)'
        : 'পেন্ডিং';

    this.addLog(`[ADMIN OVERRIDE] ${memberName}-এর আগামীকালের মিল নির্ধারণ করা হয়েছে: "${choiceLabel}"`, 'info');
    this.saveState();
    return tomorrow;
  }

  public autoResolveTomorrowPending(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const tomorrow = this.state.tomorrow!;
    tomorrow.status = 'AUTO_RESOLVED';
    tomorrow.autoResolvedAt = new Date().toISOString();

    let autoResolvedCount = 0;
    Object.values(tomorrow.votes).forEach((v) => {
      if (v.choice === 'PENDING') {
        v.choice = 'BOTH';
        v.lunchStatus = 'AUTO_YES';
        v.dinnerStatus = 'AUTO_YES';
        v.isAutoResolved = true;
        v.votedAt = new Date().toISOString();
        autoResolvedCount++;
      }
    });

    this.recalculateTomorrowCounts(tomorrow);
    this.addLog(
      `[TOMORROW POLL] অপশনে উত্তর না দেওয়া ${autoResolvedCount} জন মেম্বারের মিল স্বয়ংক্রিয়ভাবে "১ = দুপুর ও রাত" হিসেবে ধার্য করা হয়েছে। Source: ${triggerSource}`,
      'info'
    );
    this.saveState();
    return tomorrow;
  }

  public async finalizeTomorrowAndDispatch(triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const tomorrow = this.state.tomorrow!;

    // Auto resolve any pending
    Object.values(tomorrow.votes).forEach((v) => {
      if (v.choice === 'PENDING') {
        v.choice = 'BOTH';
        v.lunchStatus = 'AUTO_YES';
        v.dinnerStatus = 'AUTO_YES';
        v.isAutoResolved = true;
      }
    });
    this.recalculateTomorrowCounts(tomorrow);

    tomorrow.status = 'DISPATCHED_TO_COOK';
    tomorrow.dispatchedAt = new Date().toISOString();
    const message = this.getFormattedCookTomorrowMessage();
    tomorrow.cookMessageSent = message;

    this.addLog(
      `[TOMORROW DISPATCH] দোকানদার / রান্নার হোয়াটসঅ্যাপ গ্রুপে (${this.state.cookPhone}) আগামীকালের মিলের তালিকা প্রস্তুত। Source: ${triggerSource}`,
      'success'
    );
    this.saveState();

    let sendResult: { success: boolean; error?: string; response?: any } = {
      success: false,
      error: 'WhatsApp group link/number is missing',
    };
    if (this.state.cookPhone) {
      sendResult = await sendHttpWhatsApp(this.state.gateway, this.state.cookPhone, message);
      if (sendResult.success) {
        this.state.gatewayLastError = undefined;
        this.addLog(`[TOMORROW DISPATCH] হোয়াটসঅ্যাপ গ্রুপে বার্তা সফলভাবে পাঠানো হয়েছে (${this.state.cookPhone})`, 'success');
      } else {
        this.state.gatewayLastError = sendResult.error;
        this.addLog(`[TOMORROW DISPATCH] হোয়াটসঅ্যাপ গ্রুপে পাঠাতে ব্যর্থ: ${sendResult.error}`, 'warning');
      }
    }

    const summary = {
      dispatchedAt: new Date().toISOString(),
      targetDate: tomorrow.targetDate,
      pollDate: tomorrow.pollDate,
      lunchCount: tomorrow.totalLunchMeals,
      dinnerCount: tomorrow.totalDinnerMeals,
      message,
      delivered: sendResult.success,
      error: sendResult.error,
    };

    // User requirement: Once message has gone to the group, the poll automatically refreshes into completely fresh/new state!
    const nextTargetDate = getNextDayString(tomorrow.targetDate);
    const freshVotes: Record<string, TomorrowMemberVote> = {};
    if (this.activeMembers && this.activeMembers.length > 0) {
      this.activeMembers.forEach((m) => {
        freshVotes[m.id] = {
          memberId: m.id,
          memberName: m.fullName,
          phone: m.phone,
          choice: 'PENDING',
          lunchStatus: 'PENDING',
          dinnerStatus: 'PENDING',
          votedAt: undefined,
          manualOverride: false,
          isAutoResolved: false,
        };
      });
    }

    const freshNewPoll: TomorrowMealPoll = {
      targetDate: nextTargetDate,
      pollDate: getTodayString(),
      question: 'আগামীকাল আপনার কয়টা মিল চলবে? ১=দুপুর ও রাত, ২=শুধু দুপুর, ৩=শুধু রাত, ৪=মিল অফ',
      status: 'SCHEDULED',
      totalActiveMembers: Object.keys(freshVotes).length,
      bothCount: 0,
      lunchOnlyCount: 0,
      dinnerOnlyCount: 0,
      noneCount: 0,
      pendingCount: Object.keys(freshVotes).length,
      totalLunchMeals: 0,
      totalDinnerMeals: 0,
      votes: freshVotes,
      lastDispatchedSummary: summary,
    };

    this.state.tomorrow = freshNewPoll;
    this.addLog(
      `[TOMORROW DISPATCH] গ্রুপে মিলের হিসাব (${summary.lunchCount} লাঞ্চ, ${summary.dinnerCount} ডিনার) সম্পন্ন! পোলটি স্বয়ংক্রিয়ভাবে রিফ্রেশ হয়ে একদম নতুন (${nextTargetDate}) প্রস্তুত হয়েছে।`,
      'success'
    );
    this.saveState();

    return {
      poll: freshNewPoll,
      previousDispatched: summary,
      message,
      cookPhone: this.state.cookPhone,
      delivered: sendResult.success,
      error: sendResult.error,
      autoRefreshed: true,
    };
  }

  public resetPoll(slot: 'tomorrow' | 'lunch' | 'dinner') {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();

    if (slot === 'tomorrow') {
      const tomorrow = this.state.tomorrow!;
      tomorrow.status = 'SCHEDULED';
      tomorrow.pollSentAt = undefined;
      tomorrow.dispatchedAt = undefined;
      tomorrow.autoResolvedAt = undefined;
      tomorrow.cookMessageSent = undefined;

      Object.keys(tomorrow.votes).forEach((mId) => {
        tomorrow.votes[mId] = {
          memberId: mId,
          memberName: tomorrow.votes[mId]?.memberName || 'সদস্য',
          phone: tomorrow.votes[mId]?.phone,
          choice: 'PENDING',
          lunchStatus: 'PENDING',
          dinnerStatus: 'PENDING',
          isAutoResolved: false,
          manualOverride: false,
        };
      });
      this.recalculateTomorrowCounts(tomorrow);
      this.addLog(`[POLL RESET] আগামীকালের পোল সম্পূর্ণ ফ্রেশ ও নতুন করে রিসেট করা হয়েছে। সকল সদস্য 'অপেক্ষা (PENDING)' অবস্থায় আছে।`, 'info');
      this.saveState();
      return tomorrow;
    } else {
      const poll = slot === 'lunch' ? this.state.lunch : this.state.dinner;
      poll.status = 'SCHEDULED';
      poll.pollSentAt = undefined;
      poll.dispatchedAt = undefined;
      poll.autoResolvedAt = undefined;
      poll.cookMessageSent = undefined;

      Object.keys(poll.votes).forEach((mId) => {
        poll.votes[mId] = {
          memberId: mId,
          memberName: poll.votes[mId]?.memberName || 'সদস্য',
          phone: poll.votes[mId]?.phone,
          status: 'PENDING',
          isAutoResolved: false,
          manualOverride: false,
        };
      });
      this.recalculateCounts(poll);
      this.addLog(`[POLL RESET] আজকের ${slot === 'lunch' ? 'দুপুরের' : 'রাতের'} পোল সম্পূর্ণ নতুন করে রিসেট করা হয়েছে।`, 'info');
      this.saveState();
      return poll;
    }
  }

  // --- MANUAL OVERRIDE (ADMIN DASHBOARD) ---

  public setMemberVoteManual(
    slot: 'lunch' | 'dinner',
    memberId: string,
    newStatus: PollVoteStatus
  ) {
    this.checkAndRolloverDate();
    const poll = slot === 'lunch' ? this.state.lunch : this.state.dinner;

    if (!poll.votes[memberId]) {
      const mem = this.activeMembers.find((m) => m.id === memberId);
      poll.votes[memberId] = {
        memberId,
        memberName: mem ? mem.fullName : 'Member',
        phone: mem?.phone,
        status: newStatus,
        manualOverride: true,
        votedAt: new Date().toISOString(),
      };
    } else {
      poll.votes[memberId].status = newStatus;
      poll.votes[memberId].manualOverride = true;
      poll.votes[memberId].votedAt = new Date().toISOString();
      poll.votes[memberId].isAutoResolved = false;
    }

    this.recalculateCounts(poll);
    this.addLog(
      `[MANAGER OVERRIDE] ${poll.votes[memberId].memberName}'s ${slot} status updated to ${newStatus} by Admin`,
      'info'
    );
    this.saveState();
    return poll;
  }

  // --- INCOMING WHATSAPP POLL VOTE WEBHOOK LISTENER ---

  public handleIncomingVote(phone: string, text: string, requestedSlot?: 'lunch' | 'dinner') {
    this.checkAndRolloverDate();
    const foundMember = this.findMemberByPhone(phone);

    if (!foundMember) {
      this.addLog(`[WHATSAPP WEBHOOK] অচেনা নম্বর থেকে মেসেজ এসেছে: ${phone} (টেক্সট: "${text}")`, 'warning');
      return { success: false, reason: `Member phone not recognized: ${phone}` };
    }

    const raw = text.trim();
    const lower = raw.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF\s]/g, ' ').replace(/\s+/g, ' ').trim();

    // 1. Check Choice 4: কোনো মিল চলবে না (মিল অফ)
    const isChoice4 =
      raw === '4' ||
      raw === '৪' ||
      raw.startsWith('4') ||
      raw.startsWith('৪') ||
      raw === '0' ||
      raw === '০' ||
      lower === '4' ||
      lower === '0' ||
      lower === 'off' ||
      lower === 'na' ||
      lower === 'no' ||
      lower === 'none' ||
      lower === 'bondho' ||
      lower.includes('kono meal') ||
      lower.includes('khabona') ||
      lower.includes('khabo na') ||
      lower.includes('habena') ||
      lower.includes('habe na') ||
      lower.includes('hobe na') ||
      lower.includes('cholbe na') ||
      lower.includes('off thakbe') ||
      raw === 'না' ||
      raw === 'অফ' ||
      raw.includes('খাব না') ||
      raw.includes('খাবনা') ||
      raw.includes('হবে না') ||
      raw.includes('চলবে না') ||
      raw.includes('মিল অফ');

    // 2. Check Choice 3: শুধু রাত
    const isChoice3 =
      !isChoice4 &&
      (raw === '3' ||
        raw === '৩' ||
        raw.startsWith('3') ||
        raw.startsWith('৩') ||
        lower === '3' ||
        lower.includes('shodo rate') ||
        lower.includes('shudo rate') ||
        lower.includes('shudo rat') ||
        lower.includes('shudu rat') ||
        lower.includes('shodo rat') ||
        lower.includes('only dinner') ||
        lower.includes('only rat') ||
        raw.includes('শুধু রাত') ||
        raw.includes('শুধু রাতে') ||
        raw.includes('রাতের মিল'));

    // 3. Check Choice 2: শুধু দুপুর
    const isChoice2 =
      !isChoice4 &&
      !isChoice3 &&
      (raw === '2' ||
        raw === '২' ||
        raw.startsWith('2') ||
        raw.startsWith('২') ||
        lower === '2' ||
        lower.includes('shodo dupore') ||
        lower.includes('shudo dupur') ||
        lower.includes('shudu dupur') ||
        lower.includes('shodo dupur') ||
        lower.includes('only lunch') ||
        lower.includes('only dupur') ||
        raw.includes('শুধু দুপুর') ||
        raw.includes('শুধু দুপুরে') ||
        raw.includes('দুপুরের মিল'));

    // 4. Check Choice 1: দুপুর ও রাত (দুটোই)
    const isChoice1 =
      !isChoice4 &&
      !isChoice3 &&
      !isChoice2 &&
      (raw === '1' ||
        raw === '১' ||
        raw.startsWith('1') ||
        raw.startsWith('১') ||
        lower === '1' ||
        lower.includes('dupre and rate') ||
        lower.includes('dupur and rat') ||
        lower.includes('dupur o rat') ||
        lower.includes('dupur r rat') ||
        lower.includes('both') ||
        lower.includes('dutoi') ||
        lower.includes('duto') ||
        lower === 'ha' ||
        lower === 'yes' ||
        lower === 'y' ||
        lower === 'on' ||
        lower === 'khabo' ||
        lower === 'achi' ||
        lower === 'cholbe' ||
        lower.startsWith('ha ') ||
        lower.includes('ha ans') ||
        raw === 'হা' ||
        raw === 'হ্যা' ||
        raw === 'হ্যাঁ' ||
        raw.includes('দুটোই') ||
        raw.includes('উভয়') ||
        raw.includes('দুপুর ও রাত') ||
        raw.includes('সব') ||
        raw.includes('হ্যাঁ') ||
        raw.includes('হা') ||
        raw.includes('খাব') ||
        raw.includes('খাবো') ||
        raw.includes('চলবে'));

    if (!isChoice1 && !isChoice2 && !isChoice3 && !isChoice4) {
      this.addLog(
        `[WHATSAPP VOTE] ${foundMember.fullName} (${phone})-এর মেসেজ বুঝতে পারেনি: "${text}". Expected ১ (দুপুর ও রাত), ২ (শুধু দুপুর), ৩ (শুধু রাত), বা ৪ (মিল অফ)`,
        'warning'
      );
      return {
        success: false,
        reason: 'Invalid option. Expected ১ (দুপুর ও রাত), ২ (শুধু দুপুর), ৩ (শুধু রাত), or ৪ (মিল অফ)',
        receivedText: text,
      };
    }

    // Resolve advance tomorrow choice
    let choice: AdvanceMealChoice = 'BOTH';
    let banglaChoice = '১ = দুপুর ও রাত (দুটোই অন)';
    let lunchStatus: PollVoteStatus = 'YES';
    let dinnerStatus: PollVoteStatus = 'YES';

    if (isChoice4) {
      choice = 'NONE';
      banglaChoice = '৪ = কোনো মিল চলবে না (মিল অফ)';
      lunchStatus = 'NO';
      dinnerStatus = 'NO';
    } else if (isChoice3) {
      choice = 'DINNER_ONLY';
      banglaChoice = '৩ = শুধু রাত (রাত অন, দুপুর অফ)';
      lunchStatus = 'NO';
      dinnerStatus = 'YES';
    } else if (isChoice2) {
      choice = 'LUNCH_ONLY';
      banglaChoice = '২ = শুধু দুপুর (দুপুর অন, রাত অফ)';
      lunchStatus = 'YES';
      dinnerStatus = 'NO';
    } else {
      choice = 'BOTH';
      banglaChoice = '১ = দুপুর ও রাত (দুটোই অন)';
      lunchStatus = 'YES';
      dinnerStatus = 'YES';
    }

    // Update tomorrow poll
    if (!this.state.tomorrow) {
      this.state.tomorrow = this.createFreshTomorrowPoll(getTomorrowString(), this.state.date);
    }
    const tomorrow = this.state.tomorrow;
    tomorrow.votes[foundMember.id] = {
      memberId: foundMember.id,
      memberName: foundMember.fullName,
      phone: foundMember.phone,
      choice,
      lunchStatus,
      dinnerStatus,
      rawResponse: text,
      votedAt: new Date().toISOString(),
      isAutoResolved: false,
      manualOverride: false,
    };
    this.recalculateTomorrowCounts(tomorrow);

    // Also synchronize today's/tomorrow's lunch and dinner slots
    if (this.state.lunch.votes[foundMember.id]) {
      this.state.lunch.votes[foundMember.id].status = lunchStatus;
      this.state.lunch.votes[foundMember.id].votedAt = new Date().toISOString();
      this.state.lunch.votes[foundMember.id].isAutoResolved = false;
    }
    if (this.state.dinner.votes[foundMember.id]) {
      this.state.dinner.votes[foundMember.id].status = dinnerStatus;
      this.state.dinner.votes[foundMember.id].votedAt = new Date().toISOString();
      this.state.dinner.votes[foundMember.id].isAutoResolved = false;
    }
    this.recalculateCounts(this.state.lunch);
    this.recalculateCounts(this.state.dinner);

    this.addLog(
      `[WHATSAPP ADVANCE VOTE] ✅ ${foundMember.fullName} (${foundMember.phone}) আগামীকালের জন্য "${banglaChoice}" বেছে নিয়েছেন!`,
      'success'
    );
    this.saveState();

    // Send auto reply confirmation to member
    if (this.state.gateway && this.state.gateway.provider !== 'none' && foundMember.phone) {
      const confirmationMsg = `✅ ধন্যবাদ ${foundMember.fullName}!\nদোকানদারের নিয়ম অনুযায়ী আগামীকালের (${tomorrow.targetDate}) জন্য আপনার মিল রেকর্ড করা হয়েছে:\n👉 *${banglaChoice}*`;
      sendHttpWhatsApp(this.state.gateway, foundMember.phone, confirmationMsg).catch((err) => {
        console.warn('Auto reply confirmation failed:', err);
      });
    }

    return {
      success: true,
      member: foundMember.fullName,
      phone: foundMember.phone,
      choice,
      banglaChoice,
      lunchStatus,
      dinnerStatus,
      targetDate: tomorrow.targetDate,
    };
  }

  public updateGateway(gateway: WhatsAppPollDayState['gateway']) {
    const existingToken = this.state.gateway?.token;
    this.state.gateway = {
      provider: gateway?.provider || 'none',
      instanceId: gateway?.instanceId,
      phoneId: gateway?.phoneId,
      webhookUrl: gateway?.webhookUrl,
      token: gateway?.token || existingToken,
    };
    this.addLog(
      `WhatsApp Gateway configured: ${gateway?.provider || 'none'}`,
      gateway?.provider && gateway.provider !== 'none' ? 'success' : 'info'
    );
    this.saveState();
    return {
      provider: this.state.gateway?.provider,
      instanceId: this.state.gateway?.instanceId,
      phoneId: this.state.gateway?.phoneId,
      webhookUrl: this.state.gateway?.webhookUrl,
    };
  }

  public async testGateway(toPhone: string, testMessage: string) {
    if (!this.state.gateway || this.state.gateway.provider === 'none') {
      return {
        success: false,
        error: 'No WhatsApp Gateway configured. Please select UltraMsg, Meta Cloud API, or Custom Webhook and save your credentials first.',
      };
    }

    const msg = testMessage || 'আসসালামু আলাইকুম! এটি মেস ম্যানেজমেন্ট WhatsApp Poll গেটওয়ে থেকে টেস্ট মেসেজ।';
    const result = await sendHttpWhatsApp(this.state.gateway, toPhone, msg);
    if (result.success) {
      this.addLog(`Test WhatsApp message sent successfully to ${toPhone}`, 'success');
    } else {
      this.addLog(`Test WhatsApp message failed to ${toPhone}: ${result.error}`, 'warning');
    }
    this.saveState();
    return result;
  }

  private async dispatchPollViaGateway(question: string, slot: 'lunch' | 'dinner') {
    if (!this.state.gateway || this.state.gateway.provider === 'none') return;

    const activeWithPhone = this.activeMembers.filter((m) => m.phone && m.phone.trim().length > 6);
    this.addLog(
      `[${slot.toUpperCase()}] Starting automated background WhatsApp delivery to ${activeWithPhone.length} members via ${this.state.gateway.provider}...`,
      'info'
    );

    let sent = 0;
    let failed = 0;

    for (const mem of activeWithPhone) {
      const pollText = `${question}\n১=হ্যাঁ (মিল চলবে)\n২=না (মিল অফ)`;
      try {
        const res = await sendHttpWhatsApp(this.state.gateway, mem.phone!, pollText);
        if (res.success) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
      // Small pause to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    this.addLog(
      `[${slot.toUpperCase()}] WhatsApp delivery complete: ${sent} delivered, ${failed} failed.`,
      sent > 0 ? 'success' : 'warning'
    );
    this.saveState();
  }

  public async sendPollToAllMembers(slot: 'lunch' | 'dinner', triggerSource: string = 'Manual') {
    this.checkAndRolloverDate();
    this.repopulateMembersIfAvailable();
    const poll = slot === 'lunch' ? this.state.lunch : this.state.dinner;
    poll.status = 'POLL_SENT';
    poll.pollSentAt = new Date().toISOString();

    // Reset non-manually overridden votes to PENDING
    Object.keys(poll.votes).forEach((mId) => {
      if (!poll.votes[mId].manualOverride) {
        poll.votes[mId].status = 'PENDING';
      }
    });
    this.recalculateCounts(poll);

    // Identify all members with phone numbers from both activeMembers and poll.votes
    const recipientMap = new Map<string, { memberId: string; memberName: string; phone: string }>();

    Object.values(poll.votes).forEach((v) => {
      const cleanPhone = v.phone ? v.phone.replace(/[^0-9]/g, '') : '';
      if (cleanPhone.length >= 10) {
        recipientMap.set(v.memberId, { memberId: v.memberId, memberName: v.memberName, phone: v.phone!.trim() });
      }
    });

    this.activeMembers.forEach((m) => {
      const cleanPhone = m.phone ? m.phone.replace(/[^0-9]/g, '') : '';
      if (cleanPhone.length >= 10 && m.phone) {
        recipientMap.set(m.id, { memberId: m.id, memberName: m.fullName, phone: m.phone.trim() });
      }
    });

    const recipients = Array.from(recipientMap.values());
    const withoutPhone = Object.values(poll.votes).filter(
      (v) => !v.phone || v.phone.replace(/[^0-9]/g, '').length < 10
    );

    let delivered = 0;
    let failed = 0;
    const deliveredNames: string[] = [];
    const failedNames: string[] = [];

    const gateway =
      this.state.gateway && this.state.gateway.provider !== 'none'
        ? this.state.gateway
        : undefined;

    const messageToSend = this.getFormattedPollMessage(slot);

    for (const mem of recipients) {
      try {
        const res = await sendHttpWhatsApp(gateway, mem.phone, messageToSend);
        if (res.success) {
          delivered++;
          deliveredNames.push(mem.memberName);
        } else {
          failed++;
          failedNames.push(`${mem.memberName} (${res.error || 'error'})`);
        }
      } catch (err: any) {
        failed++;
        failedNames.push(`${mem.memberName} (${err.message})`);
      }
      // Small pause to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    const logMsg = `[${slot.toUpperCase()}] অটো পোল ডেলিভারি সম্পন্ন: ${delivered} জনের ফোনে পাঠানো হয়েছে (${deliveredNames.join(', ')}), ব্যর্থ: ${failed}.`;
    this.addLog(logMsg, delivered > 0 ? 'success' : 'warning');
    this.saveState();

    return {
      success: true,
      slot,
      poll,
      totalRecipients: recipients.length,
      deliveredCount: delivered,
      failedCount: failed,
      deliveredNames,
      failedNames,
      missingPhoneNames: withoutPhone.map((m) => m.memberName),
    };
  }

  public async sendPollToSingleMember(slot: 'lunch' | 'dinner', memberId: string) {
    this.checkAndRolloverDate();
    const poll = slot === 'lunch' ? this.state.lunch : this.state.dinner;
    const vote = poll.votes[memberId];
    const memberObj = this.activeMembers.find((m) => m.id === memberId);
    const phone = vote?.phone || memberObj?.phone;
    const memberName = vote?.memberName || memberObj?.fullName || 'সদস্য';

    if (!phone || phone.replace(/[^0-9]/g, '').length < 10) {
      return { success: false, error: `${memberName}-এর কোনো বৈধ হোয়াটসঅ্যাপ নম্বর পাওয়া যায়নি।` };
    }

    const gateway =
      this.state.gateway && this.state.gateway.provider !== 'none'
        ? this.state.gateway
        : undefined;

    const messageToSend = this.getFormattedPollMessage(slot);

    const res = await sendHttpWhatsApp(gateway, phone, messageToSend);
    if (res.success) {
      this.addLog(`[${slot.toUpperCase()}] হোয়াটসঅ্যাপ পোল সফলভাবে পাঠানো হয়েছে: ${memberName} (${phone})`, 'success');
      this.saveState();
      return { success: true, memberName, phone, message: 'Message delivered via WhatsApp Gateway' };
    } else {
      this.addLog(`[${slot.toUpperCase()}] ডেলিভারি ব্যর্থ: ${memberName} - ${res.error}`, 'warning');
      this.saveState();
      return { success: false, error: res.error || 'ডেলিভারি ব্যর্থ হয়েছে' };
    }
  }

  public updateTemplates(newTemplates: Partial<WhatsAppMessageTemplates>) {
    const current = this.state.templates || this.getDefaultTemplates();
    this.state.templates = {
      ...current,
      ...newTemplates,
    };
    this.addLog('মেসেজ টেমপ্লেট এবং শিডিউল সফলভাবে আপডেট করা হয়েছে।', 'success');
    this.saveState();
    // Re-initialize cron jobs in case schedule times were modified
    this.initDefaultCronJobs();
    this.checkAndTriggerDueAutomations().catch(() => {});
    return this.state.templates;
  }

  public updateSettings(cookPhone: string, cookName?: string, isAutomationEnabled?: boolean) {
    if (cookPhone) this.state.cookPhone = cookPhone.trim();
    if (cookName) this.state.cookName = cookName.trim();
    if (isAutomationEnabled !== undefined) this.state.isAutomationEnabled = isAutomationEnabled;
    this.addLog(`Settings updated. Cook phone: ${this.state.cookPhone}`);
    this.saveState();
    this.checkAndTriggerDueAutomations().catch(() => {});
    return this.getState();
  }

  public getState(): WhatsAppPollDayState {
    this.checkAndRolloverDate();
    this.checkAndTriggerDueAutomations().catch(() => {});
    const stateCopy: any = JSON.parse(JSON.stringify(this.state));
    if (stateCopy.gateway) {
      delete stateCopy.gateway.token;
    }
    return stateCopy;
  }
}
