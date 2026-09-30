import {
  Member,
  WhatsAppPollDayState,
  MealSlotPoll,
  PollVoteStatus,
  WhatsAppMessageTemplates,
  AdvanceMealChoice,
  TomorrowMealPoll,
} from '../types';

export class WhatsAppClientService {
  static async getTodayPollState(): Promise<WhatsAppPollDayState> {
    const res = await fetch('/api/whatsapp/poll/today');
    if (!res.ok) throw new Error('Failed to fetch WhatsApp poll state');
    const json = await res.json();
    return json.data;
  }

  static async syncActiveMembers(members: Member[]): Promise<WhatsAppPollDayState> {
    const active = members.filter((m) => m.isActive);
    const res = await fetch('/api/whatsapp/poll/sync-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ members: active }),
    });
    if (!res.ok) throw new Error('Failed to sync members to WhatsApp microservice');
    const json = await res.json();
    return json.data;
  }

  static async checkIncomingMessages(): Promise<{ success: boolean; processed: number; data: WhatsAppPollDayState }> {
    const res = await fetch('/api/whatsapp/poll/check-messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to check incoming WhatsApp replies');
    return await res.json();
  }

  // --- Advance Tomorrow Poll API methods ---
  static async triggerTomorrowPoll(): Promise<{
    poll: TomorrowMealPoll;
    deliveredCount?: number;
    failedCount?: number;
    deliveredNames?: string[];
    missingPhoneNames?: string[];
  }> {
    const res = await fetch('/api/whatsapp/poll/tomorrow/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to trigger tomorrow advance poll');
    const json = await res.json();
    return json.data;
  }

  static async sendTomorrowPollToSingleMember(
    memberId: string
  ): Promise<{ success: boolean; memberName?: string; phone?: string; error?: string }> {
    const res = await fetch('/api/whatsapp/poll/tomorrow/send-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) throw new Error('Failed to send WhatsApp tomorrow poll to member');
    return await res.json();
  }

  static async setTomorrowMemberChoice(
    memberId: string,
    choice: AdvanceMealChoice
  ): Promise<TomorrowMealPoll> {
    const res = await fetch('/api/whatsapp/poll/tomorrow/choice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, choice }),
    });
    if (!res.ok) throw new Error('Failed to update tomorrow member choice');
    const json = await res.json();
    return json.data;
  }

  static async autoResolveTomorrowPending(): Promise<TomorrowMealPoll> {
    const res = await fetch('/api/whatsapp/poll/tomorrow/auto-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to auto resolve tomorrow pending');
    const json = await res.json();
    return json.data;
  }

  static async finalizeTomorrowAndDispatch(): Promise<{
    poll: TomorrowMealPoll;
    previousDispatched?: any;
    message: string;
    cookPhone: string;
    delivered?: boolean;
    error?: string;
    autoRefreshed?: boolean;
  }> {
    const res = await fetch('/api/whatsapp/poll/tomorrow/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to finalize and dispatch tomorrow meal to cook');
    const json = await res.json();
    return json.data;
  }

  static async resetPoll(slot: 'tomorrow' | 'lunch' | 'dinner' = 'tomorrow'): Promise<{
    poll: any;
    state: any;
  }> {
    const res = await fetch('/api/whatsapp/poll/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot }),
    });
    if (!res.ok) throw new Error(`Failed to reset ${slot} poll`);
    const json = await res.json();
    return { poll: json.data, state: json.state };
  }

  // --- Today Lunch / Dinner Slot Polls ---
  static async triggerPoll(slot: 'lunch' | 'dinner'): Promise<{
    poll: MealSlotPoll;
    deliveredCount?: number;
    failedCount?: number;
    deliveredNames?: string[];
    missingPhoneNames?: string[];
  }> {
    const res = await fetch('/api/whatsapp/poll/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot }),
    });
    if (!res.ok) throw new Error(`Failed to trigger ${slot} poll`);
    const json = await res.json();
    if (json.data && json.data.poll) {
      return {
        poll: json.data.poll,
        deliveredCount: json.data.deliveredCount,
        failedCount: json.data.failedCount,
        deliveredNames: json.data.deliveredNames,
        missingPhoneNames: json.data.missingPhoneNames,
      };
    }
    return { poll: json.data };
  }

  static async sendPollToSingleMember(
    slot: 'lunch' | 'dinner',
    memberId: string
  ): Promise<{ success: boolean; memberName?: string; phone?: string; error?: string }> {
    const res = await fetch('/api/whatsapp/poll/send-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, memberId }),
    });
    if (!res.ok) throw new Error('Failed to send WhatsApp message to member');
    return await res.json();
  }

  static async autoResolvePending(slot: 'lunch' | 'dinner'): Promise<MealSlotPoll> {
    const res = await fetch('/api/whatsapp/poll/auto-resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot }),
    });
    if (!res.ok) throw new Error(`Failed to auto resolve ${slot}`);
    const json = await res.json();
    return json.data;
  }

  static async finalizeAndDispatch(
    slot: 'lunch' | 'dinner'
  ): Promise<{ poll: MealSlotPoll; message: string; cookPhone: string }> {
    const res = await fetch('/api/whatsapp/poll/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot }),
    });
    if (!res.ok) throw new Error(`Failed to finalize ${slot}`);
    const json = await res.json();
    return json.data;
  }

  static async setMemberVote(
    slot: 'lunch' | 'dinner',
    memberId: string,
    status: PollVoteStatus
  ): Promise<MealSlotPoll> {
    const res = await fetch('/api/whatsapp/poll/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot, memberId, status }),
    });
    if (!res.ok) throw new Error('Failed to update member vote');
    const json = await res.json();
    return json.data;
  }

  static async updateSettings(
    cookPhone: string,
    cookName?: string,
    isAutomationEnabled?: boolean
  ): Promise<WhatsAppPollDayState> {
    const res = await fetch('/api/whatsapp/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cookPhone, cookName, isAutomationEnabled }),
    });
    if (!res.ok) throw new Error('Failed to update WhatsApp settings');
    const json = await res.json();
    return json.data;
  }

  static async getTemplates(): Promise<WhatsAppMessageTemplates> {
    const res = await fetch('/api/whatsapp/templates');
    if (!res.ok) throw new Error('Failed to fetch message templates');
    const json = await res.json();
    return json.data;
  }

  static async updateTemplates(templates: Partial<WhatsAppMessageTemplates>): Promise<WhatsAppMessageTemplates> {
    const res = await fetch('/api/whatsapp/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templates }),
    });
    if (!res.ok) throw new Error('Failed to update message templates');
    const json = await res.json();
    return json.data;
  }

  static async simulateIncomingVote(
    phone: string,
    message: string
  ): Promise<{ success: boolean; member?: string; slot?: string; status?: string; reason?: string }> {
    const res = await fetch('/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    });
    return res.json();
  }

  static async updateGatewayConfig(gateway: any): Promise<any> {
    const res = await fetch('/api/whatsapp/gateway/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gateway }),
    });
    if (!res.ok) throw new Error('Failed to update WhatsApp Gateway configuration');
    const json = await res.json();
    return json.data;
  }

  static async testGatewayMessage(
    testPhone: string,
    testMessage: string
  ): Promise<{ success: boolean; error?: string; response?: any }> {
    const res = await fetch('/api/whatsapp/gateway/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testPhone, testMessage }),
    });
    return res.json();
  }
}
