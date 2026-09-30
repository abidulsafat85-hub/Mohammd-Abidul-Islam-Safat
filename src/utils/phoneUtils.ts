/**
 * International Phone Number & WhatsApp utilities
 * Ensures Bangladesh and international numbers are cleanly formatted as 8801XXXXXXXXX,
 * while supporting WhatsApp Group Links (chat.whatsapp.com/...) and Group IDs (@g.us).
 */

export function isWhatsAppGroupTarget(raw?: string): boolean {
  if (!raw) return false;
  const trimmed = raw.trim();
  return (
    trimmed.includes('chat.whatsapp.com/') ||
    trimmed.includes('whatsapp.com/invite/') ||
    trimmed.includes('@g.us')
  );
}

export function cleanInternationalPhone(rawPhone?: string): string {
  if (!rawPhone) return '';
  // If it's already a group link or group JID, keep it
  if (isWhatsAppGroupTarget(rawPhone)) {
    return cleanWhatsAppTarget(rawPhone);
  }

  // Remove all non-numeric characters except leading +
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // If starts with 01 (e.g. 01712345678 -> 8801712345678)
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '88' + cleaned;
  } else if (cleaned.startsWith('1') && cleaned.length === 10) {
    cleaned = '880' + cleaned;
  }

  return cleaned;
}

export function cleanWhatsAppTarget(raw?: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // If WhatsApp Group invite link
  if (trimmed.includes('chat.whatsapp.com/')) {
    const match = trimmed.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
      return `https://chat.whatsapp.com/${match[1]}`;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  // If WhatsApp group JID (e.g. 120363025298403816@g.us)
  if (trimmed.includes('@g.us')) {
    return trimmed.replace(/\s+/g, '');
  }

  return cleanInternationalPhone(trimmed);
}

export function formatPhoneDisplay(rawPhone?: string): string {
  if (!rawPhone) return 'কোনো লিঙ্ক বা নম্বর নেই';
  const trimmed = rawPhone.trim();

  if (trimmed.includes('chat.whatsapp.com/')) {
    const code = trimmed.split('chat.whatsapp.com/')[1]?.split('?')[0] || '';
    return `WhatsApp গ্রুপ লিংক (${code})`;
  }

  if (trimmed.includes('@g.us')) {
    return `WhatsApp গ্রুপ আইডি (${trimmed.slice(0, 14)}...)`;
  }

  const cleaned = cleanInternationalPhone(rawPhone);
  if (!cleaned) return 'কোনো নম্বর নেই';
  if (cleaned.startsWith('8801') && cleaned.length === 13) {
    // 880 1712-345678
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  return `+${cleaned}`;
}

export function formatWhatsAppTargetDisplay(rawTarget?: string): string {
  if (!rawTarget) return 'কোনো গ্রুপ লিংক বা নম্বর দেওয়া নেই';
  const trimmed = rawTarget.trim();

  if (trimmed.includes('chat.whatsapp.com/')) {
    const code = trimmed.split('chat.whatsapp.com/')[1]?.split('?')[0] || '';
    return `WhatsApp গ্রুপ (chat.whatsapp.com/${code})`;
  }

  if (trimmed.includes('@g.us')) {
    return `WhatsApp গ্রুপ (${trimmed})`;
  }

  return formatPhoneDisplay(trimmed);
}

export function getWhatsAppGroupInviteCode(raw?: string): string {
  if (!raw) return '';
  const match = raw.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
  return match && match[1] ? match[1] : '';
}

export function isValidInternationalPhone(rawPhone?: string): boolean {
  if (!rawPhone) return false;
  if (isWhatsAppGroupTarget(rawPhone)) {
    return true;
  }
  const cleaned = cleanInternationalPhone(rawPhone);
  // Valid Bangladeshi mobile is 13 digits starting with 8801[3-9]
  if (cleaned.startsWith('8801') && cleaned.length === 13) {
    return true;
  }
  // Generic international minimum 10 digits, maximum 15 digits
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function getWhatsAppDirectUrl(rawTarget: string, messageText?: string): string {
  if (!rawTarget) return '#';
  const trimmed = rawTarget.trim();

  // If it's a WhatsApp Group link
  if (trimmed.includes('chat.whatsapp.com/')) {
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }

  const cleaned = cleanInternationalPhone(rawTarget);
  if (!cleaned) return '#';
  const textParam = messageText ? `?text=${encodeURIComponent(messageText)}` : '';
  return `https://wa.me/${cleaned}${textParam}`;
}

