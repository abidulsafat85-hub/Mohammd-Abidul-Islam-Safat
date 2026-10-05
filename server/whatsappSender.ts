import { Repository } from './repository';

export function normalizeBangladeshPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  delivered?: boolean;
}

export async function sendUltraMsgMessage(
  toPhone: string,
  messageText: string,
  messageType: string = 'general',
  memberId?: string
): Promise<SendWhatsAppResult> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  const normalizedPhone = normalizeBangladeshPhone(toPhone);

  if (!instanceId || !token) {
    const errorMsg = 'হোয়াটসঅ্যাপ গেটওয়ে কনফিগার করা নেই (ULTRAMSG_INSTANCE_ID বা ULTRAMSG_TOKEN অনুপস্থিত)';
    await Repository.logWhatsAppMessage({
      memberId,
      phone: normalizedPhone,
      messageType,
      status: 'failed',
      error: errorMsg,
      text: messageText,
    });
    return { success: false, error: errorMsg };
  }

  if (normalizedPhone.length < 11) {
    const errorMsg = 'ভুল মোবাইল নম্বর ফরম্যাট (৮৮০১৭XXXXXXXX হতে হবে)';
    await Repository.logWhatsAppMessage({
      memberId,
      phone: normalizedPhone,
      messageType,
      status: 'failed',
      error: errorMsg,
      text: messageText,
    });
    return { success: false, error: errorMsg };
  }

  try {
    const params = new URLSearchParams();
    params.append('token', token);
    params.append('to', normalizedPhone);
    params.append('body', messageText);

    const res = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data: any = await res.json().catch(() => ({}));

    if (res.ok && (data.sent === 'true' || data.id || data.success)) {
      await Repository.logWhatsAppMessage({
        memberId,
        phone: normalizedPhone,
        messageType,
        status: 'sent',
        text: messageText,
      });
      return { success: true, messageId: String(data.id || '') };
    }

    let errorBangla = 'মেসেজ পাঠানো ব্যর্থ হয়েছে।';
    const rawError = String(data.error || data.message || '');
    if (rawError.includes('token') || rawError.includes('auth')) {
      errorBangla = 'অবৈধ গেটওয়ে টোকেন (Invalid Token)';
    } else if (rawError.includes('balance') || rawError.includes('credit')) {
      errorBangla = 'গেটওয়ে ব্যালেন্স শেষ (Insufficient Balance)';
    } else if (rawError.includes('instance') || rawError.includes('not connected')) {
      errorBangla = 'হোয়াটসঅ্যাপ ইনস্ট্যান্স কানেক্টেড নেই (Instance Not Connected)';
    } else if (rawError.includes('phone') || rawError.includes('number')) {
      errorBangla = 'অবৈধ প্রাপক নম্বর (Invalid Number)';
    }

    await Repository.logWhatsAppMessage({
      memberId,
      phone: normalizedPhone,
      messageType,
      status: 'failed',
      error: `${errorBangla}: ${rawError}`,
      text: messageText,
    });

    return { success: false, error: errorBangla };
  } catch (err: any) {
    const errorMsg = `নেটওয়ার্ক বা গেটওয়ে ত্রুটি: ${err.message}`;
    await Repository.logWhatsAppMessage({
      memberId,
      phone: normalizedPhone,
      messageType,
      status: 'failed',
      error: errorMsg,
      text: messageText,
    });
    return { success: false, error: errorMsg };
  }
}

export async function checkGatewayStatus(): Promise<{
  connected: boolean;
  status: string;
  reason?: string;
  instanceId?: string;
}> {
  const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
  const token = process.env.ULTRAMSG_TOKEN;

  if (!instanceId || !token) {
    return {
      connected: false,
      status: 'not_configured',
      reason: 'হোয়াটসঅ্যাপ গেটওয়ে কনফিগার করা হয়নি (ULTRAMSG_INSTANCE_ID বা ULTRAMSG_TOKEN অনুপস্থিত)',
    };
  }

  try {
    const res = await fetch(`https://api.ultramsg.com/${instanceId}/instance/status?token=${token}`);
    const data: any = await res.json().catch(() => ({}));
    if (res.ok && data.status?.account_status === 'authenticated') {
      return {
        connected: true,
        status: 'connected',
        instanceId,
      };
    }
    return {
      connected: false,
      status: data.status?.account_status || 'disconnected',
      reason: data.status?.account_status === 'got qr code' ? 'QR কোড স্ক্যান করা আবশ্যক' : 'ইনস্ট্যান্স কানেক্টেড নেই',
      instanceId,
    };
  } catch (err: any) {
    return {
      connected: false,
      status: 'error',
      reason: `গেটওয়ে সার্ভারে সংযোগ করা যায়নি: ${err.message}`,
      instanceId,
    };
  }
}
