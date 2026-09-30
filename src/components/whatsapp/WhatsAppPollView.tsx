import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Phone,
  Zap,
  ExternalLink,
  Copy,
  Check,
  Settings,
  Users,
  X,
  Edit2,
  Save,
  Sun,
  Moon,
  Calendar,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import {
  Member,
  MessSettings,
  WhatsAppPollDayState,
  MealSlotPoll,
  PollVoteStatus,
  WhatsAppMessageTemplates,
  AdvanceMealChoice,
  TomorrowMealPoll,
} from '../../types';
import { WhatsAppClientService } from '../../services/whatsappClientService';
import {
  formatPhoneDisplay,
  formatWhatsAppTargetDisplay,
  getWhatsAppDirectUrl,
  cleanInternationalPhone,
  cleanWhatsAppTarget,
  isWhatsAppGroupTarget,
} from '../../utils/phoneUtils';
import { MessTimePicker, getBengaliTimeLabel } from './MessTimePicker';

interface WhatsAppPollViewProps {
  members: Member[];
  settings: MessSettings;
  onUpdateSettings?: (newSettings: MessSettings) => void;
  onApplyPollToMeals?: (slot: 'lunch' | 'dinner', votes: Record<string, PollVoteStatus>) => void;
}

type PollTab = 'tomorrow' | 'lunch' | 'dinner';

export const WhatsAppPollView: React.FC<WhatsAppPollViewProps> = ({
  members,
  settings,
  onUpdateSettings,
  onApplyPollToMeals,
}) => {
  const [pollState, setPollState] = useState<WhatsAppPollDayState | null>(null);
  const [activeSlot, setActiveSlot] = useState<PollTab>('tomorrow');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cookPhone, setCookPhone] = useState<string>(
    settings.cookPhone && settings.cookPhone !== '8801812345679' && settings.cookPhone !== '8801812345678'
      ? settings.cookPhone
      : 'https://chat.whatsapp.com/B7X9qMessBazarGroup'
  );
  const [cookName, setCookName] = useState<string>(settings.cookName || 'দোকানদার / বাবুর্চির হোয়াটসঅ্যাপ গ্রুপ');
  const [isEditingCook, setIsEditingCook] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Delivery confirmation report
  const [lastDeliveryReport, setLastDeliveryReport] = useState<{
    deliveredCount: number;
    deliveredNames: string[];
    missingPhoneNames: string[];
    time: string;
    slot: PollTab;
  } | null>(null);

  const [copiedGroupText, setCopiedGroupText] = useState(false);

  // Gateway Configuration Modal
  const [showGatewayConfig, setShowGatewayConfig] = useState(false);
  const [gatewayProvider, setGatewayProvider] = useState<'none' | 'ultramsg' | 'meta_cloud' | 'custom_webhook'>(
    settings.whatsappGateway?.provider || 'ultramsg'
  );
  const [gatewayInstanceId, setGatewayInstanceId] = useState(
    settings.whatsappGateway?.instanceId || 'instance192286'
  );
  const [gatewayToken, setGatewayToken] = useState(
    settings.whatsappGateway?.token || 'j1rumux3r9i4jb0t'
  );
  const [isSavingGateway, setIsSavingGateway] = useState(false);

  // Message Templates & Schedule Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isSavingTemplates, setIsSavingTemplates] = useState(false);
  const isTemplateModalOpenRef = useRef(false);
  const isGatewayModalOpenRef = useRef(false);

  const initialDefaultTemplates: WhatsAppMessageTemplates = {
    tomorrowPollMessage: `📢 *মেস মিল পোল (আগামীকালের মিল)*
তারিখ: {tomorrow_date}

দোকানদারের নিয়ম অনুযায়ী ১ দিন আগেই মিল অন/অফ জানাতে হবে।
কাল আপনার কয়টি মিল চলবে?

উত্তর দিতে নিচের যেকোনো একটি নম্বর লিখে পাঠান:
১ = দুপুর ও রাত (দুটোই অন)
২ = শুধু দুপুর (দুপুর চলবে, রাত অফ)
৩ = শুধু রাত (রাত চলবে, দুপুর অফ)
৪ = কোনো মিল চলবে না (মিল অফ)

⚠️ (রাত ১০:৩০ টা এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`,
    lunchPollMessage: `📢 *মেস মিল পোল (আজ দুপুরের মিল)*
আজ দুপুরের কি আপনার মিল চলবে?

উত্তর দিতে মেসেজ করুন:
১ = হ্যাঁ (মিল অন)
২ = না (মিল অফ)

⚠️ (সকাল ১১:০০ টা এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`,
    dinnerPollMessage: `📢 *মেস মিল পোল (আজ রাতের মিল)*
আজ রাতের কি আপনার মিল চলবে?

উত্তর দিতে মেসেজ করুন:
১ = হ্যাঁ (মিল অন)
২ = না (মিল অফ)

⚠️ (বিকাল ০৫:০০ টা এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`,
    cookTomorrowNotificationTemplate: `📢 *আগামীকালের মেস মিলের তালিকা ({tomorrow_date})*

দোকানদার ভাই, কালকের মিলের হিসাব:
🍛 দুপুরের মিল: {lunch_count} জন
🍲 রাতের মিল: {dinner_count} জন
👥 মোট সদস্য: {total_count} জন

সদস্যদের বিস্তারিত:
{member_breakdown}`,
    cookNotificationTemplate: `আজ {slot} মোট {count} জনের মিল রান্না করবেন`,
    morningPollTime: '08:00',
    afternoonPollTime: '14:00',
    lunchCutoffTime: '11:00',
    dinnerCutoffTime: '17:00',
    advancePollTime: '20:00',
    advanceCutoffTime: '22:30',
    enableLunchPoll: false,
    enableDinnerPoll: false,
    enableAdvancePoll: true,
  };

  const [templates, setTemplates] = useState<WhatsAppMessageTemplates>(initialDefaultTemplates);
  // Dedicated local editable draft for the modal so background polling never overwrites user's edits!
  const [editingTemplates, setEditingTemplates] = useState<WhatsAppMessageTemplates>(initialDefaultTemplates);

  const activeMembers = members.filter((m) => m.isActive);
  const membersWithPhone = activeMembers.filter((m) => m.phone && m.phone.replace(/[^0-9]/g, '').length >= 10);
  const membersWithoutPhone = activeMembers.filter((m) => !m.phone || m.phone.replace(/[^0-9]/g, '').length < 10);

  const fetchPollState = useCallback(async (isInitial: boolean = false) => {
    if (isInitial) setIsLoading(true);
    try {
      const synced = await WhatsAppClientService.syncActiveMembers(members);
      setPollState(synced);
      if (synced.cookPhone && !isEditingCook) setCookPhone(synced.cookPhone);
      if (synced.cookName && !isEditingCook) setCookName(synced.cookName);
      if (synced.gateway && !isGatewayModalOpenRef.current) {
        if (synced.gateway.provider) setGatewayProvider(synced.gateway.provider);
        if (synced.gateway.instanceId) setGatewayInstanceId(synced.gateway.instanceId);
        if (synced.gateway.token) setGatewayToken(synced.gateway.token);
      }
      if (synced.templates && !isTemplateModalOpenRef.current) {
        setTemplates((prev) => ({ ...prev, ...synced.templates }));
      }

      // Automatically sync incoming WhatsApp YES/NO votes into today's mess meals
      if (onApplyPollToMeals && synced) {
        if (synced.lunch?.votes && Object.keys(synced.lunch.votes).length > 0) {
          const lunchVotes: Record<string, PollVoteStatus> = {};
          Object.values(synced.lunch.votes).forEach((v) => {
            lunchVotes[v.memberId] = v.status;
          });
          onApplyPollToMeals('lunch', lunchVotes);
        }
        if (synced.dinner?.votes && Object.keys(synced.dinner.votes).length > 0) {
          const dinnerVotes: Record<string, PollVoteStatus> = {};
          Object.values(synced.dinner.votes).forEach((v) => {
            dinnerVotes[v.memberId] = v.status;
          });
          onApplyPollToMeals('dinner', dinnerVotes);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch from backend, retrying direct get:', e);
      try {
        const state = await WhatsAppClientService.getTodayPollState();
        setPollState(state);
        if (state.templates && !isTemplateModalOpenRef.current) {
          setTemplates((prev) => ({ ...prev, ...state.templates }));
        }
      } catch (err) {
        console.error('Failed to get poll state:', err);
      }
    } finally {
      if (isInitial) setIsLoading(false);
    }
  }, [members, onApplyPollToMeals]);

  useEffect(() => {
    fetchPollState(true);
    // Poll every 4 seconds for real-time status update of WhatsApp replies
    const interval = setInterval(() => fetchPollState(false), 4000);
    return () => clearInterval(interval);
  }, [fetchPollState]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4500);
  };

  // --- Tomorrow Advance Poll Handlers ---
  const handleSendTomorrowPollToAll = async () => {
    setActionLoading('trigger-tomorrow');
    try {
      const res = await WhatsAppClientService.triggerTomorrowPoll();
      setPollState((prev) => (prev ? { ...prev, tomorrow: res.poll } : prev));

      const deliveredCount = res.deliveredCount ?? membersWithPhone.length;
      const deliveredNames = res.deliveredNames ?? membersWithPhone.map((m) => m.fullName);
      const missingNames = res.missingPhoneNames ?? membersWithoutPhone.map((m) => m.fullName);

      setLastDeliveryReport({
        deliveredCount,
        deliveredNames,
        missingPhoneNames: missingNames,
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        slot: 'tomorrow',
      });

      if (deliveredCount > 0) {
        showToast(`✅ ${deliveredCount} জন সদস্যের ফোনে আগামীকালের ৪-পছন্দ মিল পোল পাঠানো হয়েছে!`);
      } else {
        handleCopyGroupMessage('tomorrow', true);
        showToast('📢 পোল বার্তা কপি করা হয়েছে এবং WhatsApp গ্রুপ খোলা হয়েছে — পেস্ট করে মেস গ্রুপে দিন!');
      }
      await fetchPollState();
    } catch (e: any) {
      handleCopyGroupMessage('tomorrow', true);
      showToast('📢 পোল বার্তা কপি করা হয়েছে এবং WhatsApp খোলা হয়েছে!');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendTomorrowToSingleMember = async (member: Member) => {
    if (!member.phone || member.phone.replace(/[^0-9]/g, '').length < 10) {
      alert(`${member.fullName}-এর কোনো হোয়াটসঅ্যাপ নম্বর নেই।`);
      return;
    }
    setActionLoading(`send-tomorrow-${member.id}`);
    const pollText = getGroupPollText('tomorrow');
    try {
      const res = await WhatsAppClientService.sendTomorrowPollToSingleMember(member.id);
      if (res.success) {
        showToast(`✅ ${member.fullName}-এর ফোনে আগামীকালের পোল মেসেজ পাঠানো হয়েছে!`);
      } else {
        // Fallback to direct WhatsApp link so sending NEVER fails even if gateway is stopped
        const directUrl = getWhatsAppDirectUrl(member.phone, pollText);
        window.open(directUrl, '_blank');
        try {
          await navigator.clipboard.writeText(pollText);
        } catch {}
        showToast(`📱 ${member.fullName}-এর জন্য WhatsApp খোলা হয়েছে এবং মেসেজ কপি হয়েছে!`);
      }
    } catch (err: any) {
      const directUrl = getWhatsAppDirectUrl(member.phone, pollText);
      window.open(directUrl, '_blank');
      showToast(`📱 WhatsApp খোলা হয়েছে!`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleTomorrowChoiceOverride = async (memberId: string, choice: AdvanceMealChoice) => {
    setActionLoading(`vote-tomorrow-${memberId}`);
    try {
      const updated = await WhatsAppClientService.setTomorrowMemberChoice(memberId, choice);
      setPollState((prev) => (prev ? { ...prev, tomorrow: updated } : prev));
      const choiceLabels: Record<AdvanceMealChoice, string> = {
        BOTH: '১ = দুপুর ও রাত (দুটোই অন)',
        LUNCH_ONLY: '২ = শুধু দুপুর',
        DINNER_ONLY: '৩ = শুধু রাত',
        NONE: '৪ = মিল অফ (কোনো মিল নেই)',
        PENDING: 'পেন্ডিং',
      };
      showToast(`আগামীকালের পছন্দ "${choiceLabels[choice]}" সেট করা হয়েছে!`);
      await fetchPollState();
    } catch (e: any) {
      alert(`Failed to update choice: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoResolveTomorrow = async () => {
    setActionLoading('resolve-tomorrow');
    try {
      const updated = await WhatsAppClientService.autoResolveTomorrowPending();
      setPollState((prev) => (prev ? { ...prev, tomorrow: updated } : prev));
      showToast('বাকি সকল সদস্যের মিল স্বয়ংক্রিয়ভাবে "১ = দুপুর ও রাত" হিসেবে সেট করা হয়েছে!');
      await fetchPollState();
    } catch (e: any) {
      alert(`Failed to auto-resolve: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalizeTomorrowAndDispatch = async () => {
    setActionLoading('finalize-tomorrow');
    try {
      const targetPhoneOrLink = cookPhone || settings.cookPhone || pollState?.cookPhone;
      const res = await WhatsAppClientService.finalizeTomorrowAndDispatch();

      // Update state with the newly created clean/refreshed poll
      setPollState((prev) => (prev ? { ...prev, tomorrow: res.poll } : prev));

      // 1. Always copy the finalized cook message to clipboard
      if (res.message) {
        try {
          await navigator.clipboard.writeText(res.message);
        } catch {}
      }

      // 2. Open WhatsApp group link or direct chat
      if (targetPhoneOrLink) {
        if (targetPhoneOrLink.includes('chat.whatsapp.com/')) {
          window.open(targetPhoneOrLink, '_blank');
        } else {
          const directUrl = getWhatsAppDirectUrl(targetPhoneOrLink, res.message);
          window.open(directUrl, '_blank');
        }
      }

      if (res.delivered) {
        showToast('✅ মিলের হিসাব গ্রুপে পাঠানো হয়েছে এবং পোলটি স্বয়ংক্রিয়ভাবে রিফ্রেশ হয়ে একদম নতুন হয়েছে!');
      } else {
        showToast('📋 মিলের হিসাব কপি করা হয়েছে এবং WhatsApp গ্রুপ খোলা হয়েছে — পেস্ট করে পাঠিয়ে দিন! (পোল রিফ্রেশ হয়ে একদম নতুন হয়েছে)');
      }

      await fetchPollState();
    } catch (e: any) {
      alert(`Error dispatching tomorrow: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPoll = async (slot: PollTab) => {
    setActionLoading(`reset-${slot}`);
    try {
      const res = await WhatsAppClientService.resetPoll(slot as any);
      if (res.state) {
        setPollState(res.state);
      } else {
        await fetchPollState();
      }
      showToast('✅ পোল সম্পূর্ণ ফ্রেশ ও নতুন করে রিসেট করা হয়েছে! সকল সদস্য এখন অপেক্ষা (Pending) অবস্থায় রয়েছে।');
    } catch (e: any) {
      alert(`পোল রিসেট করতে সমস্যা হয়েছে: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // --- Today Lunch / Dinner Slot Handlers ---
  const handleSendPollToAll = async (slot: 'lunch' | 'dinner') => {
    setActionLoading(`trigger-${slot}`);
    try {
      const res = await WhatsAppClientService.triggerPoll(slot);
      setPollState((prev) => (prev ? { ...prev, [slot]: res.poll } : prev));

      const deliveredCount = res.deliveredCount ?? membersWithPhone.length;
      const deliveredNames = res.deliveredNames ?? membersWithPhone.map((m) => m.fullName);
      const missingNames = res.missingPhoneNames ?? membersWithoutPhone.map((m) => m.fullName);

      setLastDeliveryReport({
        deliveredCount,
        deliveredNames,
        missingPhoneNames: missingNames,
        time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
        slot,
      });

      showToast(`✅ ${deliveredCount} জন সদস্যের ফোনে সরাসরি হোয়াটসঅ্যাপ পোল মেসেজ পাঠানো হয়েছে!`);
      await fetchPollState();
    } catch (e: any) {
      alert(`Error sending poll: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendToSingleMember = async (member: Member) => {
    if (!member.phone || member.phone.replace(/[^0-9]/g, '').length < 10) {
      alert(`${member.fullName}-এর কোনো হোয়াটসঅ্যাপ নম্বর নেই।`);
      return;
    }
    if (activeSlot === 'tomorrow') {
      return handleSendTomorrowToSingleMember(member);
    }
    setActionLoading(`send-${member.id}`);
    const pollText = getGroupPollText(activeSlot);
    try {
      const res = await WhatsAppClientService.sendPollToSingleMember(activeSlot, member.id);
      if (res.success) {
        showToast(`✅ ${member.fullName}-এর ফোনে পোল মেসেজ পাঠানো হয়েছে!`);
      } else {
        const directUrl = getWhatsAppDirectUrl(member.phone, pollText);
        window.open(directUrl, '_blank');
        try {
          await navigator.clipboard.writeText(pollText);
        } catch {}
        showToast(`📱 ${member.fullName}-এর জন্য WhatsApp খোলা হয়েছে এবং মেসেজ কপি হয়েছে!`);
      }
    } catch (err: any) {
      const directUrl = getWhatsAppDirectUrl(member.phone, pollText);
      window.open(directUrl, '_blank');
      showToast(`📱 WhatsApp খোলা হয়েছে!`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleVoteOverride = async (slot: 'lunch' | 'dinner', memberId: string, newStatus: PollVoteStatus) => {
    setActionLoading(`vote-${memberId}-${slot}`);
    try {
      const updated = await WhatsAppClientService.setMemberVote(slot, memberId, newStatus);
      setPollState((prev) => (prev ? { ...prev, [slot]: updated } : prev));
      if (onApplyPollToMeals && updated.votes) {
        const voteStatuses: Record<string, PollVoteStatus> = {};
        Object.values(updated.votes).forEach((v) => {
          voteStatuses[v.memberId] = v.status;
        });
        onApplyPollToMeals(slot, voteStatuses);
      }
      const banglaStatus = newStatus === 'YES' ? 'হ্যাঁ (ON)' : newStatus === 'NO' ? 'না (OFF)' : 'পেন্ডিং';
      showToast(`মেম্বারের মিল স্ট্যাটাস "${banglaStatus}" করা হয়েছে এবং চার্টে আপডেট হয়েছে।`);
    } catch (e: any) {
      alert(`Failed to update vote: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinalizeAndDispatch = async (slot: 'lunch' | 'dinner') => {
    setActionLoading(`finalize-${slot}`);
    try {
      const res = await WhatsAppClientService.finalizeAndDispatch(slot);
      setPollState((prev) => (prev ? { ...prev, [slot]: res.poll } : prev));
      if (onApplyPollToMeals && res.poll?.votes) {
        const voteStatuses: Record<string, PollVoteStatus> = {};
        Object.values(res.poll.votes).forEach((v: any) => {
          voteStatuses[v.memberId] = v.status;
        });
        onApplyPollToMeals(slot, voteStatuses);
      }

      const msg =
        res.message ||
        (slot === 'lunch'
          ? `আজ দুপুরে মোট ${res.poll?.yesCount || 0} জনের মিল রান্না করবেন`
          : `আজ রাতে মোট ${res.poll?.yesCount || 0} জনের মিল রান্না করবেন`);

      try {
        await navigator.clipboard.writeText(msg);
      } catch {}

      const target = cookPhone || settings.cookPhone || pollState?.cookPhone;
      if (target) {
        if (target.includes('chat.whatsapp.com/')) {
          window.open(target, '_blank');
        } else {
          window.open(getWhatsAppDirectUrl(target, msg), '_blank');
        }
      }

      showToast(`মোট মিলের হিসাব (${slot === 'lunch' ? 'দুপুর' : 'রাত'}) কপি হয়েছে এবং WhatsApp গ্রুপ খোলা হয়েছে!`);
      await fetchPollState();
    } catch (e: any) {
      alert(`Error dispatching: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveCookSettings = async () => {
    const cleaned = cleanWhatsAppTarget(cookPhone);
    try {
      await WhatsAppClientService.updateSettings(cleaned, cookName, true);
      setCookPhone(cleaned);
      setIsEditingCook(false);
      showToast('দোকানদার / রান্নার হোয়াটসঅ্যাপ গ্রুপ লিংক সফলভাবে সংরক্ষিত হয়েছে!');
      if (onUpdateSettings) {
        onUpdateSettings({ ...settings, cookPhone: cleaned, cookName });
      }
      await fetchPollState();
    } catch (e: any) {
      alert(`Failed to save settings: ${e.message}`);
    }
  };

  const getGroupPollText = (slot: PollTab) => {
    if (slot === 'tomorrow') {
      const tomorrowDate = pollState?.tomorrow?.targetDate || 'আগামীকাল';
      if (templates.tomorrowPollMessage) {
        return templates.tomorrowPollMessage.replace('{tomorrow_date}', tomorrowDate);
      }
      return `📢 *মেস মিল পোল (আগামীকালের মিল)*
তারিখ: ${tomorrowDate}

দোকানদারের নিয়ম অনুযায়ী ১ দিন আগেই মিল অন/অফ জানাতে হবে।
কাল আপনার কয়টি মিল চলবে?

উত্তর দিতে নিচের যেকোনো একটি নম্বর লিখে পাঠান:
১ = দুপুর ও রাত (দুটোই অন)
২ = শুধু দুপুর (দুপুর চলবে, রাত অফ)
৩ = শুধু রাত (রাত চলবে, দুপুর অফ)
৪ = কোনো মিল চলবে না (মিল অফ)

⚠️ (রাত ${templates.advanceCutoffTime || '১০:৩০'} এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`;
    }
    if (slot === 'lunch' && templates.lunchPollMessage) {
      return templates.lunchPollMessage;
    }
    if (slot === 'dinner' && templates.dinnerPollMessage) {
      return templates.dinnerPollMessage;
    }
    const timeLabel = slot === 'lunch' ? 'আজ দুপুরের' : 'আজ রাতের';
    const cutoff = slot === 'lunch' ? 'সকাল ১১:০০ টা' : 'বিকাল ০৫:০০ টা';
    return `📢 *মেস মিল পোল (${slot === 'lunch' ? 'দুপুর' : 'রাত'})*
${timeLabel} কি আপনার মিল চলবে?

উত্তর দিতে মেসেজ করুন:
১ = হ্যাঁ (মিল অন)
২ = না (মিল অফ)

⚠️ (${cutoff} এর মধ্যে না জানালে মিল স্বয়ংক্রিয়ভাবে অন হিসেবে গণ্য হবে)`;
  };

  const handleCopyGroupMessage = (slot: PollTab, openGroupIfAvailable: boolean = true) => {
    const text = getGroupPollText(slot);
    try {
      navigator.clipboard.writeText(text);
    } catch {}
    setCopiedGroupText(true);
    const target = cookPhone || settings.cookPhone || pollState?.cookPhone;
    if (openGroupIfAvailable && target && target.includes('chat.whatsapp.com/')) {
      window.open(target, '_blank');
      showToast('📋 গ্রুপ পোল মেসেজ কপি হয়েছে এবং WhatsApp গ্রুপ খোলা হয়েছে — পেস্ট করুন!');
    } else {
      showToast('📋 গ্রুপ পোল মেসেজ কপি হয়েছে! WhatsApp গ্রুপে পেস্ট করুন।');
    }
    setTimeout(() => setCopiedGroupText(false), 3000);
  };

  const handleOpenTemplateModal = () => {
    isTemplateModalOpenRef.current = true;
    const current = pollState?.templates || templates;
    setTemplates(current);
    setEditingTemplates({ ...current });
    setShowTemplateModal(true);
  };

  const handleCloseTemplateModal = () => {
    isTemplateModalOpenRef.current = false;
    setShowTemplateModal(false);
  };

  const handleSaveTemplates = async () => {
    setIsSavingTemplates(true);
    try {
      const updated = await WhatsAppClientService.updateTemplates(editingTemplates);
      setTemplates(updated);
      setEditingTemplates(updated);
      setPollState((prev) => (prev ? { ...prev, templates: updated } : prev));
      isTemplateModalOpenRef.current = false;
      const pollTimeDesc = getBengaliTimeLabel(editingTemplates.advancePollTime) || editingTemplates.advancePollTime;
      const cutoffTimeDesc = getBengaliTimeLabel(editingTemplates.advanceCutoffTime) || editingTemplates.advanceCutoffTime;
      showToast(`পোল মেসেজ ও শিডিউল সফলভাবে সেভ হয়েছে! (পোল: ${pollTimeDesc}, কাটঅফ: ${cutoffTimeDesc})`);
      setShowTemplateModal(false);
      await fetchPollState();
    } catch (err: any) {
      alert(`টেমপ্লেট সেভ করতে সমস্যা হয়েছে: ${err.message}`);
    } finally {
      setIsSavingTemplates(false);
    }
  };

  const handleResetTemplates = () => {
    if (window.confirm('আপনি কি সত্যিই ডিফল্ট টেমপ্লেট ও সময়সূচীতে রিসেট করতে চান?')) {
      setEditingTemplates(initialDefaultTemplates);
    }
  };

  const handleSaveGateway = async () => {
    setIsSavingGateway(true);
    try {
      const gatewayConfig = {
        provider: gatewayProvider,
        instanceId: gatewayInstanceId.trim(),
        token: gatewayToken.trim(),
      };
      await WhatsAppClientService.updateGatewayConfig(gatewayConfig);
      if (onUpdateSettings) {
        onUpdateSettings({
          ...settings,
          whatsappGateway: gatewayConfig,
        });
      }
      showToast('WhatsApp Gateway সফলভাবে কনফিগার ও সংরক্ষিত হয়েছে!');
      setShowGatewayConfig(false);
      await fetchPollState();
    } catch (err: any) {
      alert(`Failed to save gateway: ${err.message}`);
    } finally {
      setIsSavingGateway(false);
    }
  };

  const currentPoll: MealSlotPoll | undefined =
    pollState ? (activeSlot === 'lunch' ? pollState.lunch : activeSlot === 'dinner' ? pollState.dinner : undefined) : undefined;
  const tomorrowPoll: TomorrowMealPoll | undefined = pollState?.tomorrow;

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto" id="whatsapp-poll-root">
      {/* Toast Notification */}
      {successToast && (
        <div
          id="whatsapp-poll-toast"
          className="fixed top-5 right-5 z-50 bg-emerald-800 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-bold animate-in fade-in slide-in-from-top-3 border border-emerald-600"
        >
          <CheckCircle2 className="h-5 w-5 text-emerald-300 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              হোয়াটসঅ্যাপ মিল পোল (WhatsApp Meal Poll)
            </h2>
            {gatewayProvider === 'none' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black flex items-center gap-1">
                <MessageCircle className="h-3 w-3 text-emerald-600" />
                <span>সরাসরি WhatsApp মোড (1-Click & Group)</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                <Zap className="h-3 w-3 text-emerald-600" />
                <span>অটো গেটওয়ে ({gatewayProvider})</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            দোকানদারের নিয়ম অনুযায়ী ১ দিন আগে অথবা দৈনিক পোল চালিয়ে স্বয়ংক্রিয়ভাবে মিল সংগ্রহ করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-open-template-settings"
            onClick={handleOpenTemplateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="মেসেজ টেমপ্লেট ও সময়সূচী এডিট করুন"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>মেসেজ ও শিডিউল এডিট</span>
          </button>

          <button
            type="button"
            id="btn-sync-poll-state"
            onClick={() => fetchPollState(true)}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="লাইভ পোল ও ভোট রিফ্রেশ করুন"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>

          <button
            type="button"
            id="btn-open-gateway-settings"
            onClick={() => setShowGatewayConfig(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
            title="UltraMsg API কনফিগারেশন দেখুন"
          >
            <Settings className="h-3.5 w-3.5 text-slate-600" />
            <span>গেটওয়ে সেটিংস</span>
          </button>
        </div>
      </div>

      {/* Gateway Alert Banner if error occurred */}
      {pollState?.gatewayLastError && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-black text-amber-900">গেটওয়ে নোটিশ / সংযোগ তথ্য:</h4>
              <p className="text-xs text-amber-800 mt-0.5">{pollState.gatewayLastError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                try {
                  await WhatsAppClientService.updateGatewayConfig({ provider: 'none' });
                  setGatewayProvider('none');
                  showToast('সরাসরি WhatsApp 1-Click মোড চালু হয়েছে!');
                  await fetchPollState();
                } catch (e: any) {
                  alert(e.message);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer"
            >
              সরাসরি WhatsApp মোডে চালান
            </button>
            <button
              type="button"
              onClick={() => setShowGatewayConfig(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-100/50 font-bold text-xs cursor-pointer"
            >
              ক্রেডেনশিয়াল পরিবর্তন
            </button>
          </div>
        </div>
      )}

      {/* 🌟 Tab Navigation (1-Day Advance Rule Prominent) */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-100/90 p-1.5 rounded-2xl">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tomorrow 1-Day Advance Tab */}
          <button
            type="button"
            id="tab-slot-tomorrow"
            onClick={() => setActiveSlot('tomorrow')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              activeSlot === 'tomorrow'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-700/20'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>আগামীকালের মিল (১ দিন আগের নিয়ম)</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                activeSlot === 'tomorrow' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              ৪-অপশন পোল
            </span>
          </button>

          {/* Today Lunch Tab - Only show if enableLunchPoll is true */}
          {templates.enableLunchPoll ? (
            <button
              type="button"
              id="tab-slot-lunch"
              onClick={() => setActiveSlot('lunch')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
                activeSlot === 'lunch'
                  ? 'bg-white text-emerald-800 shadow-md shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Sun className="h-4 w-4 text-amber-500" />
              <span>আজকের দুপুর (Lunch)</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                কাটঅফ: {templates.lunchCutoffTime || '১১:০০'} AM
              </span>
            </button>
          ) : null}

          {/* Today Dinner Tab - Only show if enableDinnerPoll is true */}
          {templates.enableDinnerPoll ? (
            <button
              type="button"
              id="tab-slot-dinner"
              onClick={() => setActiveSlot('dinner')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
                activeSlot === 'dinner'
                  ? 'bg-white text-emerald-800 shadow-md shadow-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Moon className="h-4 w-4 text-indigo-500" />
              <span>আজকের রাত (Dinner)</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                কাটঅফ: {templates.dinnerCutoffTime || '১৭:০০'}
              </span>
            </button>
          ) : null}

          {/* If lunch poll is deleted, show a notification pill */}
          {!templates.enableLunchPoll && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-bold">
              <span>🗑️ দুপুরের আলাদা পোল ডিলিট করা হয়েছে</span>
              <button
                type="button"
                onClick={handleOpenTemplateModal}
                className="text-emerald-700 hover:text-emerald-900 underline ml-0.5 cursor-pointer font-extrabold"
              >
                [শিডিউল দেখুন]
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs px-2">
          <span className="font-black text-emerald-900 bg-emerald-50/90 border border-emerald-200/90 px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              {activeSlot === 'tomorrow'
                ? `অটো শিডিউল: ${getBengaliTimeLabel(templates.advancePollTime) || 'রাত ৮:০০ PM'} টায় WhatsApp পোল এবং ${getBengaliTimeLabel(templates.advanceCutoffTime) || 'রাত ১০:৩০ PM'} টায় হোয়াটসঅ্যাপ গ্রুপে যাবে`
                : `অটো শিডিউল: সকাল ${templates.morningPollTime || '০৮:০০'} ও দুপুর ${templates.afternoonPollTime || '১৪:০০'} টায় পোল`}
            </span>
          </span>
        </div>
      </div>

      {/* 🌟 1-DAY ADVANCE NOTICE BANNER (WHEN ON TOMORROW TAB) */}
      {activeSlot === 'tomorrow' && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50/60 border-2 border-amber-300 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs animate-in fade-in">
          <div className="p-2.5 rounded-2xl bg-amber-500 text-white shrink-0 mt-0.5">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-amber-950 text-base tracking-tight">
                দোকানদারের নিয়ম: মিল অন বা অফ করতে হলে ১ দিন আগে জানাতে হবে
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 text-xs font-black">
                কালকের তারিখ: {tomorrowPoll?.targetDate || 'আগামীকাল'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              দোকানদারের নতুন নিয়ম অনুযায়ী <strong>কাল দুপুরে বা রাতে মিল চলবে কি না তা আজ রাতেই জানাতে হয়</strong>। তাই হোয়াটসঅ্যাপে সদস্যদের কাছে ১টি পোলে ৪টি পছন্দ পাঠানো হয়:
              <span className="font-extrabold text-amber-950"> ১ (দুটোই), ২ (শুধু দুপুর), ৩ (শুধু রাত), ৪ (মিল অফ)</span>। মেম্বার রিপ্লাই দিলে স্বয়ংক্রিয়ভাবে মিল তালিকা ও চার্ট আপডেট হয়ে রাত ১০:৩০ টায় হোয়াটসঅ্যাপ গ্রুপে পাঠিয়ে দেওয়া হবে।
            </p>
          </div>
        </div>
      )}

      {/* Delivery Feedback Banner (When triggered) */}
      {lastDeliveryReport && (
        <div
          id="poll-delivery-alert"
          className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-emerald-950">
                সফল ডেলিভারি: {lastDeliveryReport.deliveredCount} জন সদস্যের ফোনে হোয়াটসঅ্যাপ পোল পাঠানো হয়েছে!
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                সরাসরি মেসেজ পৌঁছেছে: <strong>{lastDeliveryReport.deliveredNames.join(', ') || 'সদস্যগণ'}</strong> ({lastDeliveryReport.time})
              </p>
              {lastDeliveryReport.missingPhoneNames.length > 0 && (
                <p className="text-xs text-amber-800 mt-1 font-semibold">
                  ⚠️ ফোন নম্বর নেই ({lastDeliveryReport.missingPhoneNames.length} জন): {lastDeliveryReport.missingPhoneNames.join(', ')} — নিচের তালিকা থেকে এদের মিল অন/অফ করতে পারেন।
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastDeliveryReport(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg hover:bg-emerald-100/60 cursor-pointer shrink-0"
            title="বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🚀 TAB 1: TOMORROW 4-CHOICE ADVANCE POLL VIEW */}
      {/* ======================================================== */}
      {activeSlot === 'tomorrow' && (
        <div className="space-y-6">
          {/* Primary Send Poll Card */}
          <div
            id="tomorrow-poll-action-card"
            className="bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-2 border-emerald-500/60 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-600 text-white">
                    <Send className="h-4 w-4" />
                  </span>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    আগামীকালের মিল পোল পাঠানোর অপশন (১ দিন আগের অগ্রিম নিয়ম)
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  সবাইকে ১টি পোলেই ৪টি অপশন দিয়ে মেসেজ পাঠিয়ে দিন। মেম্বাররা শুধু <strong>১, ২, ৩ বা ৪</strong> রিপ্লাই দিলেই মিল অন/অফ হবে।
                </p>
              </div>

              {/* Quick status count */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>নম্বর আছে: {membersWithPhone.length} জন</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 font-extrabold flex items-center gap-1.5 shadow-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>নম্বর নেই: {membersWithoutPhone.length} জন</span>
                </span>
              </div>
            </div>

            {/* Recipient names pill bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-bold">📱 যাদের ফোনে মেসেজ যাবে:</span>
                {membersWithPhone.map((m) => (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-900 font-bold text-[11px]"
                  >
                    {m.fullName}
                  </span>
                ))}
              </div>
              {membersWithoutPhone.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  (বাকিদের মিল নিচে ম্যানুয়ালি সেট করতে পারবেন)
                </div>
              )}
            </div>

            {/* Message Preview Accordion/Box */}
            <div className="bg-white/90 border border-emerald-200 rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>যে মেসেজটি সবার কাছে যাবে:</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenTemplateModal}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>মেসেজটি এডিট করুন</span>
                </button>
              </div>
              <pre className="text-xs font-mono font-medium text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {getGroupPollText('tomorrow')}
              </pre>
            </div>

            {/* Big Action Buttons for Tomorrow */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Main Giant Button: Send 4-choice poll to all */}
              <button
                type="button"
                id="btn-send-tomorrow-poll-all"
                onClick={handleSendTomorrowPollToAll}
                disabled={actionLoading === 'trigger-tomorrow'}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-700/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading === 'trigger-tomorrow' ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>সবার ফোনে আগামীকালের পোল পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>🚀 সবার ফোনে আগামীকালের ৪-পছন্দ পোল পাঠান</span>
                  </>
                )}
              </button>

              {/* Copy to Mess WhatsApp Group */}
              <button
                type="button"
                id="btn-copy-tomorrow-group-poll"
                onClick={() => handleCopyGroupMessage('tomorrow')}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors shadow-xs cursor-pointer"
                title="মেস WhatsApp গ্রুপে দিতে মেসেজ কপি করুন"
              >
                {copiedGroupText ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                <span>{copiedGroupText ? 'কপি হয়েছে!' : '📢 মেস গ্রুপে দিন'}</span>
              </button>

              {/* Auto Resolve Pending to BOTH */}
              <button
                type="button"
                id="btn-resolve-tomorrow-pending"
                onClick={handleAutoResolveTomorrow}
                disabled={actionLoading === 'resolve-tomorrow'}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="যারা এখনো উত্তর দেয়নি তাদের ডিফল্ট '১. দুটোই খাবে' হিসেবে অন করুন"
              >
                <Zap className="h-4 w-4 text-amber-600" />
                <span>{actionLoading === 'resolve-tomorrow' ? 'হচ্ছে...' : '⚡ বাকিদের "দুটোই অন"'}</span>
              </button>

              {/* Finalize & Dispatch Tomorrow to Group */}
              <button
                type="button"
                id="btn-dispatch-tomorrow-cook"
                onClick={handleFinalizeTomorrowAndDispatch}
                disabled={actionLoading === 'finalize-tomorrow'}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="আগামীকালের মোট হিসাব হোয়াটসঅ্যাপ গ্রুপে পাঠান"
              >
                <Users className="h-4 w-4 text-emerald-600" />
                <span>
                  {actionLoading === 'finalize-tomorrow' ? 'পাঠানো হচ্ছে...' : '📤 গ্রুপে পাঠান'}
                </span>
              </button>

              {/* Reset Tomorrow Poll to Clean State */}
              <button
                type="button"
                id="btn-reset-tomorrow-poll"
                onClick={() => handleResetPoll('tomorrow')}
                disabled={actionLoading === 'reset-tomorrow'}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="পোল রিসেট করে সম্পূর্ণ ফ্রেশ/নতুন করুন (সকল মেম্বার আবার অপেক্ষা/পেন্ডিং হবে)"
              >
                <RotateCcw className={`h-4 w-4 text-slate-600 ${actionLoading === 'reset-tomorrow' ? 'animate-spin' : ''}`} />
                <span>{actionLoading === 'reset-tomorrow' ? 'রিসেট হচ্ছে...' : '🔄 নতুন পোল রিসেট'}</span>
              </button>
            </div>
          </div>

          {/* Tomorrow Metrics Summary Strip */}
          {tomorrowPoll && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-bold">
                <span>📊 আগামীকালের মোট মিল ও পছন্দের সারাংশ:</span>
                <span>তারিখ: {tomorrowPoll.targetDate}</span>
              </div>

              {/* Primary meal count badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs font-bold text-amber-100 flex items-center gap-1">
                      <Sun className="h-3.5 w-3.5" />
                      <span>কাল দুপুরের মিল</span>
                    </div>
                    <div className="text-3xl font-black mt-0.5">{tomorrowPoll.totalLunchMeals} জন</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                    🍛
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-xs font-bold text-indigo-100 flex items-center gap-1">
                      <Moon className="h-3.5 w-3.5" />
                      <span>কাল রাতের মিল</span>
                    </div>
                    <div className="text-3xl font-black mt-0.5">{tomorrowPoll.totalDinnerMeals} জন</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                    🍲
                  </div>
                </div>

                <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-emerald-800">১. দুটোই অন (Lunch+Dinner)</div>
                    <div className="text-2xl font-black text-emerald-950 mt-0.5">{tomorrowPoll.bothCount} জন</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    ✓
                  </div>
                </div>

                <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-rose-800">৪. মিল অফ (কোনো মিল নেই)</div>
                    <div className="text-2xl font-black text-rose-950 mt-0.5">{tomorrowPoll.noneCount} জন</div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                    ✕
                  </div>
                </div>
              </div>

              {/* Secondary breakdowns */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-sky-800">২. শুধু দুপুর (Lunch Only)</div>
                    <div className="text-lg font-black text-sky-950">{tomorrowPoll.lunchOnlyCount} জন</div>
                  </div>
                  <span className="text-base">☀️</span>
                </div>

                <div className="bg-purple-50/80 border border-purple-200 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-purple-800">৩. শুধু রাত (Dinner Only)</div>
                    <div className="text-lg font-black text-purple-950">{tomorrowPoll.dinnerOnlyCount} জন</div>
                  </div>
                  <span className="text-base">🌙</span>
                </div>

                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-amber-800">পেন্ডিং (উত্তর দেয়নি)</div>
                    <div className="text-lg font-black text-amber-950">{tomorrowPoll.pendingCount} জন</div>
                  </div>
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </div>
            </div>
          )}

          {/* Tomorrow Cook Message Notice (If finalized & dispatched) */}
          {tomorrowPoll?.cookMessageSent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>দোকানদার / বাবুর্চির হোয়াটসঅ্যাপ গ্রুপে পাঠানো চূড়ান্ত তালিকা:</span>
                </div>
                <pre className="text-xs font-mono font-medium text-slate-900 bg-white/95 px-3.5 py-2 rounded-xl border border-emerald-200 whitespace-pre-wrap">
                  {tomorrowPoll.cookMessageSent}
                </pre>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (tomorrowPoll.cookMessageSent) {
                      navigator.clipboard.writeText(tomorrowPoll.cookMessageSent);
                      showToast('📋 মিল তালিকা কপি হয়েছে! WhatsApp গ্রুপ খোলা হচ্ছে...');
                      const directUrl = getWhatsAppDirectUrl(cookPhone, tomorrowPoll.cookMessageSent);
                      window.open(directUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  title="কপি করে হোয়াটসঅ্যাপ গ্রুপে যান"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp গ্রুপে দেখুন</span>
                  <ExternalLink className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => handleResetPoll('tomorrow')}
                  disabled={actionLoading === 'reset-tomorrow'}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-extrabold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  title="গ্রুপে হিসাব দেওয়া শেষ হলে পরবর্তী পোলের জন্য ফ্রেশ রিসেট করুন"
                >
                  <RotateCcw className={`h-4 w-4 text-emerald-700 ${actionLoading === 'reset-tomorrow' ? 'animate-spin' : ''}`} />
                  <span>🔄 নতুন পোল রিসেট (Auto Refresh)</span>
                </button>
              </div>
            </div>
          )}

          {/* Last Dispatched Summary Card (When auto-refreshed to clean new poll) */}
          {tomorrowPoll?.lastDispatchedSummary && (
            <div className="bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="space-y-1">
                <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>পূর্ববর্তী মিল তালিকা গ্রুপে পাঠানো সম্পন্ন হয়েছে ({tomorrowPoll.lastDispatchedSummary.targetDate}):</span>
                </div>
                <div className="text-xs text-emerald-950 font-bold flex items-center gap-3 flex-wrap">
                  <span className="bg-emerald-100/80 px-2 py-0.5 rounded-md text-emerald-900">🍛 দুপুর: {tomorrowPoll.lastDispatchedSummary.lunchCount} জন</span>
                  <span className="bg-emerald-100/80 px-2 py-0.5 rounded-md text-emerald-900">🍲 রাত: {tomorrowPoll.lastDispatchedSummary.dinnerCount} জন</span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    (পাঠানোর সময়: {new Date(tomorrowPoll.lastDispatchedSummary.dispatchedAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700">
                  🔄 পোলটি স্বয়ংক্রিয়ভাবে রিফ্রেশ হয়ে একদম নতুন হয়েছে ({tomorrowPoll.targetDate})।
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (tomorrowPoll.lastDispatchedSummary?.message) {
                      navigator.clipboard.writeText(tomorrowPoll.lastDispatchedSummary.message);
                      showToast('📋 পূর্ববর্তী পাঠানো মিল মেসেজ কপি হয়েছে!');
                      if (cookPhone && cookPhone.includes('chat.whatsapp.com/')) {
                        window.open(cookPhone, '_blank');
                      }
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-bold text-xs cursor-pointer"
                  title="পূর্ববর্তী মেসেজ কপি করে গ্রুপে যান"
                >
                  <Copy className="h-3.5 w-3.5 text-emerald-600" />
                  <span>মেসেজ কপি</span>
                </button>
                {cookPhone && (
                  <button
                    type="button"
                    onClick={() => {
                      if (cookPhone.includes('chat.whatsapp.com/')) {
                        window.open(cookPhone, '_blank');
                      } else {
                        window.open(getWhatsAppDirectUrl(cookPhone), '_blank');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>WhatsApp গ্রুপ</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tomorrow Member Response List & Quick Switchers */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-lg text-slate-900">
                  আগামীকালের মিল পছন্দ ও ম্যানেজার ওভাররাইড (৪ অপশন)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  সদস্য WhatsApp-এ ১, ২, ৩ বা ৪ রিপ্লাই দিলে এখানে নিজে থেকেই আপডেট হয়। এছাড়াও যেকোনো অপশনে ক্লিক করে পরিবর্তন করতে পারেন:
                </p>
              </div>

              <div className="text-xs font-bold px-3 py-1 rounded-xl bg-slate-100 text-slate-700">
                তারিখ: {tomorrowPoll?.targetDate || 'আগামীকাল'}
              </div>
            </div>

            {/* Member rows */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {activeMembers.map((member) => {
                const vote = tomorrowPoll?.votes[member.id];
                const choice: AdvanceMealChoice = vote ? vote.choice : 'PENDING';
                const hasPhone = Boolean(member.phone && member.phone.replace(/[^0-9]/g, '').length >= 10);

                const isBoth = choice === 'BOTH';
                const isLunchOnly = choice === 'LUNCH_ONLY';
                const isDinnerOnly = choice === 'DINNER_ONLY';
                const isNone = choice === 'NONE';
                const isPending = choice === 'PENDING';

                return (
                  <div
                    key={member.id}
                    id={`tomorrow-member-row-${member.id}`}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Left: Avatar & Details */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                          isBoth
                            ? 'bg-emerald-100 text-emerald-800'
                            : isLunchOnly
                            ? 'bg-sky-100 text-sky-800'
                            : isDinnerOnly
                            ? 'bg-purple-100 text-purple-800'
                            : isNone
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {member.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <span>{member.fullName}</span>
                          {vote?.manualOverride && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                              ম্যানেজার সেট
                            </span>
                          )}
                          {vote?.isAutoResolved && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              অটো (Auto)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {hasPhone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              <span>{formatPhoneDisplay(member.phone!)}</span>
                            </span>
                          ) : (
                            <span className="text-rose-500 font-bold text-[11px] flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>হোয়াটসঅ্যাপ নম্বর নেই</span>
                            </span>
                          )}
                          {vote?.votedAt && (
                            <span className="text-slate-400">
                              • রিপ্লাই:{' '}
                              {new Date(vote.votedAt).toLocaleTimeString('bn-BD', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Direct Send + Status Badge + 4 Option Switches */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {/* Individual Send */}
                      {hasPhone && (
                        <button
                          type="button"
                          id={`btn-send-tomorrow-${member.id}`}
                          onClick={() => handleSendTomorrowToSingleMember(member)}
                          disabled={actionLoading === `send-tomorrow-${member.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          title={`${member.fullName}-এর ফোনে আগামীকালের পোল পাঠান`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>
                            {actionLoading === `send-tomorrow-${member.id}` ? 'পাঠাচ্ছে...' : 'পোল পাঠান'}
                          </span>
                        </button>
                      )}

                      {/* Current Status Badge */}
                      <div
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                          isBoth
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : isLunchOnly
                            ? 'bg-sky-100 text-sky-900 border border-sky-200'
                            : isDinnerOnly
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : isNone
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {isBoth && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {isLunchOnly && <Sun className="h-3.5 w-3.5 text-sky-600" />}
                        {isDinnerOnly && <Moon className="h-3.5 w-3.5 text-purple-600" />}
                        {isNone && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {isPending && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>
                          {isBoth
                            ? '১. দুটোই অন'
                            : isLunchOnly
                            ? '২. শুধু দুপুর'
                            : isDinnerOnly
                            ? '৩. শুধু রাত'
                            : isNone
                            ? '৪. মিল অফ'
                            : 'পেন্ডিং'}
                        </span>
                      </div>

                      {/* 4-Option Segmented Switcher */}
                      <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleTomorrowChoiceOverride(member.id, 'BOTH')}
                          disabled={actionLoading === `vote-tomorrow-${member.id}`}
                          className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            isBoth
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                          }`}
                          title="১. দুপুর ও রাত দুটোই অন"
                        >
                          ১. দুটোই
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTomorrowChoiceOverride(member.id, 'LUNCH_ONLY')}
                          disabled={actionLoading === `vote-tomorrow-${member.id}`}
                          className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            isLunchOnly
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-sky-700 hover:bg-white'
                          }`}
                          title="২. শুধু দুপুর চলবে"
                        >
                          ২. দুপুর
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTomorrowChoiceOverride(member.id, 'DINNER_ONLY')}
                          disabled={actionLoading === `vote-tomorrow-${member.id}`}
                          className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            isDinnerOnly
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-purple-700 hover:bg-white'
                          }`}
                          title="৩. শুধু রাত চলবে"
                        >
                          ৩. রাত
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTomorrowChoiceOverride(member.id, 'NONE')}
                          disabled={actionLoading === `vote-tomorrow-${member.id}`}
                          className={`px-2 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            isNone
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-rose-700 hover:bg-white'
                          }`}
                          title="৪. কোনো মিল চলবে না (মিল অফ)"
                        >
                          ৪. অফ
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTomorrowChoiceOverride(member.id, 'PENDING')}
                          disabled={actionLoading === `vote-tomorrow-${member.id}`}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isPending
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-500 hover:text-amber-700 hover:bg-white'
                          }`}
                          title="পেন্ডিং রাখুন"
                        >
                          অপেক্ষা
                        </button>
                      </div>

                      {/* Test WhatsApp Incoming Reply simulation for tomorrow */}
                      {member.phone && (
                        <div
                          className="flex items-center gap-1 bg-emerald-50/80 px-2 py-1 rounded-xl border border-emerald-200/80"
                          title="সদস্য WhatsApp-এ রিপ্লাই পাঠালে কি হবে তা টেস্ট করুন"
                        >
                          <span className="text-[10px] font-bold text-emerald-800">টেস্ট:</span>
                          {(['১', '২', '৩', '৪'] as const).map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await WhatsAppClientService.simulateIncomingVote(member.phone!, num);
                                  if (res.success) {
                                    showToast(`✅ ${member.fullName} WhatsApp-এ '${num}' রিপ্লাই দিয়েছে!`);
                                    await fetchPollState();
                                  } else {
                                    alert(res.reason || 'টেস্ট ব্যর্থ');
                                  }
                                } catch (e: any) {
                                  alert(e.message);
                                }
                              }}
                              className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] cursor-pointer"
                              title={`সদস্য '${num}' লিখে পাঠালে টেস্ট করুন`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ☀️ / 🌙 TAB 2 & 3: TODAY LUNCH / DINNER SLOT VIEW */}
      {/* ======================================================== */}
      {activeSlot !== 'tomorrow' && (
        <div className="space-y-6">
          {/* Send Poll Card */}
          <div
            id="send-message-option-card"
            className="bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 border-2 border-emerald-500/50 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-emerald-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-600 text-white">
                    <Send className="h-4 w-4" />
                  </span>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    {activeSlot === 'lunch' ? 'আজ দুপুরের' : 'আজ রাতের'} মিল পোল
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed">
                  নিচের বাটনে ক্লিক করলেই <strong>যাদের নম্বর যুক্ত আছে সবার ফোনে এক ক্লিকে সরাসরি</strong> পোল চলে যাবে।
                </p>
              </div>

              {/* Quick status count */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-extrabold flex items-center gap-1.5 shadow-xs">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>নম্বর আছে: {membersWithPhone.length} জন</span>
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-800 font-extrabold flex items-center gap-1.5 shadow-xs">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span>নম্বর নেই: {membersWithoutPhone.length} জন</span>
                </span>
              </div>
            </div>

            {/* Recipient names pill bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-bold">📱 যাদের ফোনে মেসেজ যাবে:</span>
                {membersWithPhone.map((m) => (
                  <span
                    key={m.id}
                    className="px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-900 font-bold text-[11px]"
                  >
                    {m.fullName}
                  </span>
                ))}
              </div>
              {membersWithoutPhone.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  (বাকিদের মিল নিচে ম্যানুয়ালি সেট করতে পারবেন)
                </div>
              )}
            </div>

            {/* Message Preview Accordion/Box */}
            <div className="bg-white/80 border border-emerald-200/90 rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>যে মেসেজটি পাঠানো হবে ({activeSlot === 'lunch' ? 'দুপুর' : 'রাত'}):</span>
                </span>
                <button
                  type="button"
                  onClick={handleOpenTemplateModal}
                  className="text-[11px] text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>মেসেজটি এডিট করুন</span>
                </button>
              </div>
              <pre className="text-xs font-mono font-medium text-slate-700 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                {activeSlot === 'lunch' ? templates.lunchPollMessage : templates.dinnerPollMessage}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                id="btn-send-poll-to-all"
                onClick={() => handleSendPollToAll(activeSlot as 'lunch' | 'dinner')}
                disabled={actionLoading === `trigger-${activeSlot}`}
                className="flex-1 flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading === `trigger-${activeSlot}` ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>সবার ফোনে মেসেজ পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    <span>
                      🚀 সবার ফোনে অটো পোল পাঠান ({activeSlot === 'lunch' ? 'দুপুরের মিল' : 'রাতের মিল'})
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-copy-group-poll"
                onClick={() => handleCopyGroupMessage(activeSlot)}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors shadow-xs cursor-pointer"
                title="মেস WhatsApp গ্রুপে দিতে মেসেজ কপি করুন"
              >
                {copiedGroupText ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-slate-500" />}
                <span>{copiedGroupText ? 'কপি হয়েছে!' : '📢 মেস গ্রুপে দিন'}</span>
              </button>

              <button
                type="button"
                id="btn-dispatch-cook"
                onClick={() => handleFinalizeAndDispatch(activeSlot as 'lunch' | 'dinner')}
                disabled={actionLoading === `finalize-${activeSlot}`}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="মোট হিসাব হোয়াটসঅ্যাপ গ্রুপে পাঠান"
              >
                <Users className="h-4 w-4 text-emerald-600" />
                <span>
                  {actionLoading === `finalize-${activeSlot}` ? 'পাঠানো হচ্ছে...' : '📤 গ্রুপে পাঠান'}
                </span>
              </button>

              <button
                type="button"
                id={`btn-reset-${activeSlot}-poll`}
                onClick={() => handleResetPoll(activeSlot)}
                disabled={actionLoading === `reset-${activeSlot}`}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                title="পোল রিসেট করে সম্পূর্ণ ফ্রেশ/নতুন করুন"
              >
                <RotateCcw className={`h-4 w-4 text-slate-600 ${actionLoading === `reset-${activeSlot}` ? 'animate-spin' : ''}`} />
                <span>{actionLoading === `reset-${activeSlot}` ? 'রিসেট হচ্ছে...' : '🔄 নতুন পোল রিসেট'}</span>
              </button>

              {onApplyPollToMeals && currentPoll && (
                <button
                  type="button"
                  id="btn-sync-to-meals"
                  onClick={() => {
                    const voteStatuses: Record<string, PollVoteStatus> = {};
                    Object.values(currentPoll.votes).forEach((v) => {
                      voteStatuses[v.memberId] = v.status;
                    });
                    onApplyPollToMeals(activeSlot as 'lunch' | 'dinner', voteStatuses);
                    showToast(`✅ আজকের ${activeSlot === 'lunch' ? 'দুপুরের' : 'রাতের'} মিল চার্টে সিঙ্ক করা হয়েছে!`);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 transition-colors shadow-xs cursor-pointer"
                  title="এই পোলের হ্যাঁ/না ফলাফল সরাসরি মূল মিল তালিকায় যুক্ত করুন"
                >
                  <Zap className="h-4 w-4 text-blue-600" />
                  <span>মিল চার্টে যুক্ত করুন</span>
                </button>
              )}
            </div>
          </div>

          {/* Metrics Summary Strip (YES, NO, PENDING, TOTAL) */}
          {currentPoll && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800">মিল খাবে (YES)</div>
                  <div className="text-2xl font-black text-emerald-950 mt-0.5">{currentPoll.yesCount} জন</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  ✓
                </div>
              </div>

              <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-rose-800">মিল অফ (NO)</div>
                  <div className="text-2xl font-black text-rose-950 mt-0.5">{currentPoll.noCount} জন</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                  ✕
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-800">পেন্ডিং (Pending)</div>
                  <div className="text-2xl font-black text-amber-950 mt-0.5">{currentPoll.pendingCount} জন</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                  <Clock className="h-5 w-5" />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-700">মোট সক্রিয় সদস্য</div>
                  <div className="text-2xl font-black text-slate-900 mt-0.5">{activeMembers.length} জন</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>
          )}

          {/* Cook Message Notice */}
          {currentPoll?.cookMessageSent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>দোকানদার / বাবুর্চির হোয়াটসঅ্যাপ গ্রুপে পাঠানো মেসেজ:</span>
                </div>
                <p className="text-sm font-extrabold text-slate-900 bg-white/90 px-3 py-1.5 rounded-xl border border-emerald-200">
                  "{currentPoll.cookMessageSent}"
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (currentPoll.cookMessageSent) {
                      navigator.clipboard.writeText(currentPoll.cookMessageSent);
                      showToast('📋 মিলের হিসাব কপি হয়েছে! WhatsApp গ্রুপ খোলা হচ্ছে...');
                      const directUrl = getWhatsAppDirectUrl(cookPhone, currentPoll.cookMessageSent);
                      window.open(directUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp গ্রুপে দেখুন</span>
                  <ExternalLink className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => handleResetPoll(activeSlot)}
                  disabled={actionLoading === `reset-${activeSlot}`}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-extrabold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
                  title="গ্রুপে হিসাব দেওয়া শেষ হলে পরবর্তী পোলের জন্য ফ্রেশ রিসেট করুন"
                >
                  <RotateCcw className={`h-4 w-4 text-emerald-700 ${actionLoading === `reset-${activeSlot}` ? 'animate-spin' : ''}`} />
                  <span>🔄 নতুন পোল রিসেট (Auto Refresh)</span>
                </button>
              </div>
            </div>
          )}

          {/* Member Response & Override Table for Today */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-lg text-slate-900">
                  মেম্বার রেসপন্স ও ম্যানুয়াল ম্যানেজার ওভাররাইড
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  কেউ ব্যক্তিগতভাবে কল বা মেসেজ দিলে সরাসরি নিচের সুইচে ক্লিক করে স্ট্যাটাস পরিবর্তন করুন:
                </p>
              </div>

              <div className="text-xs text-slate-400">
                {activeSlot === 'lunch' ? '☀️ দুপুরের ভোট' : '🌙 রাতের ভোট'}
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {activeMembers.map((member) => {
                const vote = currentPoll?.votes[member.id];
                const status: PollVoteStatus = vote ? vote.status : 'PENDING';
                const isPending = status === 'PENDING';
                const isYes = status === 'YES' || status === 'AUTO_YES';
                const isNo = status === 'NO';
                const hasPhone = Boolean(member.phone && member.phone.replace(/[^0-9]/g, '').length >= 10);

                return (
                  <div
                    key={member.id}
                    id={`member-row-${member.id}`}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Left: Avatar & Details */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                          isYes
                            ? 'bg-emerald-100 text-emerald-800'
                            : isNo
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {member.fullName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                          <span>{member.fullName}</span>
                          {vote?.manualOverride && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                              ম্যানেজার ওভাররাইড
                            </span>
                          )}
                          {vote?.isAutoResolved && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              অটো হ্যাঁ (Auto)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          {hasPhone ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              <span>{formatPhoneDisplay(member.phone!)}</span>
                            </span>
                          ) : (
                            <span className="text-rose-500 font-bold text-[11px] flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>হোয়াটসঅ্যাপ নম্বর নেই</span>
                            </span>
                          )}
                          {vote?.votedAt && (
                            <span className="text-slate-400">
                              • রেসপন্স:{' '}
                              {new Date(vote.votedAt).toLocaleTimeString('bn-BD', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Direct Send + Status + Switches */}
                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                      {hasPhone && (
                        <button
                          type="button"
                          id={`btn-send-single-${member.id}`}
                          onClick={() => handleSendToSingleMember(member)}
                          disabled={actionLoading === `send-${member.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          title={`${member.fullName}-এর ফোনে সরাসরি WhatsApp পোল পাঠান`}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span>{actionLoading === `send-${member.id}` ? 'পাঠাচ্ছে...' : 'WhatsApp পাঠান'}</span>
                        </button>
                      )}

                      <div
                        className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                          isYes
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : isNo
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}
                      >
                        {isYes && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                        {isNo && <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                        {isPending && <Clock className="h-3.5 w-3.5 text-amber-600" />}
                        <span>
                          {status === 'AUTO_YES'
                            ? 'হ্যাঁ (Auto)'
                            : status === 'YES'
                            ? 'হ্যাঁ (খাবে)'
                            : status === 'NO'
                            ? 'না (অফ)'
                            : 'পেন্ডিং'}
                        </span>
                      </div>

                      <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200">
                        <button
                          type="button"
                          id={`btn-override-pending-${member.id}`}
                          onClick={() => handleVoteOverride(activeSlot as 'lunch' | 'dinner', member.id, 'PENDING')}
                          disabled={actionLoading === `vote-${member.id}-${activeSlot}`}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isPending
                              ? 'bg-amber-500 text-white shadow-xs'
                              : 'text-slate-600 hover:text-amber-700 hover:bg-white'
                          }`}
                          title="পেন্ডিং করুন"
                        >
                          পেন্ডিং
                        </button>

                        <button
                          type="button"
                          id={`btn-override-yes-${member.id}`}
                          onClick={() => handleVoteOverride(activeSlot as 'lunch' | 'dinner', member.id, 'YES')}
                          disabled={actionLoading === `vote-${member.id}-${activeSlot}`}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            isYes
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-emerald-700 hover:bg-white'
                          }`}
                          title="মিল চালু করুন"
                        >
                          হ্যাঁ (ON)
                        </button>

                        <button
                          type="button"
                          id={`btn-override-no-${member.id}`}
                          onClick={() => handleVoteOverride(activeSlot as 'lunch' | 'dinner', member.id, 'NO')}
                          disabled={actionLoading === `vote-${member.id}-${activeSlot}`}
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                            isNo
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-rose-700 hover:bg-white'
                          }`}
                          title="মিল বন্ধ করুন"
                        >
                          না (OFF)
                        </button>
                      </div>

                      {/* Test simulation */}
                      {member.phone && (
                        <div
                          className="flex items-center gap-1 bg-emerald-50/80 px-2 py-1 rounded-xl border border-emerald-200/80"
                          title="সদস্যের ফোন থেকে WhatsApp মেসেজ আসার টেস্ট"
                        >
                          <span className="text-[10px] font-bold text-emerald-800">টেস্ট রিপ্লাই:</span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await WhatsAppClientService.simulateIncomingVote(member.phone!, '১');
                                if (res.success) {
                                  showToast(`✅ ${member.fullName} '১' (মিল অন) রিপ্লাই দিয়েছে!`);
                                  await fetchPollState();
                                } else {
                                  alert(res.reason || 'টেস্ট ব্যর্থ');
                                }
                              } catch (e: any) {
                                alert(e.message);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] cursor-pointer"
                            title="সদস্য WhatsApp-এ '১' পাঠালে টেস্ট করুন"
                          >
                            ১ (হ্যাঁ)
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await WhatsAppClientService.simulateIncomingVote(member.phone!, '২');
                                if (res.success) {
                                  showToast(`❌ ${member.fullName} '২' (মিল অফ) রিপ্লাই দিয়েছে!`);
                                  await fetchPollState();
                                } else {
                                  alert(res.reason || 'টেস্ট ব্যর্থ');
                                }
                              } catch (e: any) {
                                alert(e.message);
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] cursor-pointer"
                            title="সদস্য WhatsApp-এ '২' পাঠালে টেস্ট করুন"
                          >
                            ২ (না)
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Shopkeeper WhatsApp Group Info Bar */}
      <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-slate-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-slate-900 text-sm">
                দোকানদার / রান্নার হোয়াটসঅ্যাপ গ্রুপ লিংক:
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                WhatsApp Group
              </span>
            </div>

            {isEditingCook ? (
              <div className="space-y-1.5 pt-1 max-w-lg">
                <input
                  type="text"
                  value={cookPhone}
                  onChange={(e) => setCookPhone(e.target.value)}
                  placeholder="https://chat.whatsapp.com/... (WhatsApp গ্রুপ লিংক বা নম্বর)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500">
                  দোকানদার বা রান্নার মেস হোয়াটসঅ্যাপ গ্রুপের ইনভাইট লিংক (যেমন: https://chat.whatsapp.com/...) দিন।
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <a
                  href={getWhatsAppDirectUrl(cookPhone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-50 hover:underline flex items-center gap-1.5 truncate max-w-xs sm:max-w-md"
                  title="WhatsApp গ্রুপ ওপেন করুন"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{cookPhone || 'কোনো গ্রুপ লিংক নেই'}</span>
                </a>
              </div>
            )}

            <div className="text-slate-500 text-[11px]">
              ফাইনাল মিলের হিসাব স্বয়ংক্রিয়ভাবে এই হোয়াটসঅ্যাপ গ্রুপে পাঠানো হবে
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {isEditingCook ? (
            <>
              <button
                type="button"
                onClick={handleSaveCookSettings}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer shadow-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>সংরক্ষণ করুন</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCookPhone(pollState?.cookPhone || settings.cookPhone || 'https://chat.whatsapp.com/B7X9qMessBazarGroup');
                  setIsEditingCook(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 cursor-pointer"
              >
                বাতিল
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(cookPhone);
                  showToast('হোয়াটসঅ্যাপ গ্রুপ লিংক কপি করা হয়েছে!');
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer shadow-2xs"
                title="গ্রুপ লিংক কপি করুন"
              >
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>কপি</span>
              </button>

              <a
                href={getWhatsAppDirectUrl(cookPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer shadow-xs"
                title="WhatsApp গ্রুপে প্রবেশ করুন"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>গ্রুপে যান</span>
              </a>

              <button
                type="button"
                onClick={() => setIsEditingCook(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer shadow-2xs"
                title="গ্রুপ লিংক পরিবর্তন করুন"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                <span>লিংক পরিবর্তন</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Gateway API Settings Modal */}
      {showGatewayConfig && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-600" />
                <h3 className="font-black text-lg text-slate-900">WhatsApp Gateway সেটিংস</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGatewayConfig(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              সরাসরি মেম্বারদের ফোনে WhatsApp মেসেজ পাঠানোর জন্য আপনার UltraMsg ক্রেডেনশিয়ালস:
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">প্রোভাইডার</label>
                <select
                  value={gatewayProvider}
                  onChange={(e: any) => setGatewayProvider(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="ultramsg">UltraMsg (ডিফল্ট সক্রিয়)</option>
                  <option value="meta_cloud">Meta Cloud API</option>
                  <option value="none">নিষ্ক্রিয়</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">UltraMsg Instance ID</label>
                <input
                  type="text"
                  value={gatewayInstanceId}
                  onChange={(e) => setGatewayInstanceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold"
                  placeholder="instance192286"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">UltraMsg Token</label>
                <input
                  type="password"
                  value={gatewayToken}
                  onChange={(e) => setGatewayToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
                  placeholder="token..."
                />
              </div>

              {/* Webhook Callback URL helper */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 space-y-1">
                <div className="text-xs font-black text-emerald-900">
                  🔗 UltraMsg Webhook URL (স্বয়ংক্রিয় রিপ্লাই আসার জন্য)
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/whatsapp/webhook`}
                    className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-[11px] font-mono font-bold text-emerald-950"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp/webhook`);
                      showToast('Webhook URL কপি হয়েছে!');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 cursor-pointer"
                  >
                    কপি করুন
                  </button>
                </div>
                <div className="text-[11px] text-emerald-800 font-medium">
                  💡 <strong>কিভাবে সেট করবেন:</strong> আপনার UltraMsg ড্যাশবোর্ডে গিয়ে <strong>Webhook</strong> অপশনে এই URL-টি দিয়ে <strong>message_received</strong> চেকবক্স অন করে Save করুন।
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGatewayConfig(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveGateway}
                disabled={isSavingGateway}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSavingGateway ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Templates & Schedule Edit Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-5 border border-slate-200 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    মেসেজ টেমপ্লেট ও শিডিউল এডিট (Poll Settings)
                  </h3>
                  <p className="text-xs text-slate-500">
                    আগামীকাল ও আজকের পোল মেসেজ, দোকানদারের নোটিফিকেশন এবং অটো পাঠানোর সময় নির্ধারণ করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseTemplateModal}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Schedule Section */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span>অটোমেটিক মেসেজ পাঠানোর সময়সূচী (Cron Schedule)</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
                  সরাসরি সার্ভার শিডিউলার
                </span>
              </div>
              
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200 text-xs text-slate-700 leading-relaxed">
                💡 <strong>কখন এডিট করবেন:</strong> আপনি যেকোনো সময় সুবিধামতো সময়সূচী পরিবর্তন করতে পারবেন। সময় সিলেক্ট করে নিচে <strong>"সেভ ও শিডিউল আপডেট করুন"</strong> বাটনে ক্লিক করলেই সাথে সাথে নতুন সময়ে পোল চালু হয়ে যাবে।
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* 1-Day Advance Times: Poll Time */}
                <MessTimePicker
                  label="🌟 আগামীকালের পোল পাঠানোর সময় (রাত)"
                  badge="সক্রিয়"
                  value={editingTemplates.advancePollTime || '20:00'}
                  onChange={(val) =>
                    setEditingTemplates((prev) => ({ ...prev, advancePollTime: val }))
                  }
                  presets={[
                    { label: 'সন্ধ্যা ৭:০০', val: '19:00' },
                    { label: 'সন্ধ্যা ৭:৩০', val: '19:30' },
                    { label: 'রাত ৮:০০', val: '20:00' },
                    { label: 'রাত ৮:৩০', val: '20:30' },
                    { label: 'রাত ৯:০০', val: '21:00' },
                    { label: 'রাত ৯:৩০', val: '21:30' },
                    { label: 'রাত ১০:০০', val: '22:00' },
                  ]}
                  helperText="এই সময়ে সকল সক্রিয় সদস্যের WhatsApp-এ আগামীকালের মিল পোল মেসেজ পাঠানো হবে।"
                />

                {/* 1-Day Advance Times: Cutoff & Group Dispatch */}
                <MessTimePicker
                  label="⏱️ কাটঅফ ও গ্রুপে হিসাব পাঠানো"
                  badge="অটো নোটিফিকেশন"
                  value={editingTemplates.advanceCutoffTime || '22:30'}
                  onChange={(val) =>
                    setEditingTemplates((prev) => ({ ...prev, advanceCutoffTime: val }))
                  }
                  presets={[
                    { label: 'রাত ৯:০০', val: '21:00' },
                    { label: 'রাত ৯:৩০', val: '21:30' },
                    { label: 'রাত ১০:০০', val: '22:00' },
                    { label: 'রাত ১০:৩০', val: '22:30' },
                    { label: 'রাত ১১:০০', val: '23:00' },
                    { label: 'রাত ১১:৩০', val: '23:30' },
                  ]}
                  helperText="কাটঅফ সময়ে অনির্ধারিত সদস্যদের মিল অন হবে এবং হোয়াটসঅ্যাপ গ্রুপে স্বয়ংক্রিয়ভাবে মোট তালিকা পাঠানো হবে।"
                />

                {/* Today Lunch Poll - Can be Deleted/Turned off */}
                <MessTimePicker
                  label="☀️ আজকের দুপুরের পোল (সকাল)"
                  badge="দৈনিক পোল"
                  value={editingTemplates.morningPollTime || '08:00'}
                  onChange={(val) =>
                    setEditingTemplates((prev) => ({ ...prev, morningPollTime: val }))
                  }
                  isDeleted={!editingTemplates.enableLunchPoll}
                  onDelete={() => setEditingTemplates((prev) => ({ ...prev, enableLunchPoll: false }))}
                  onRestore={() => setEditingTemplates((prev) => ({ ...prev, enableLunchPoll: true }))}
                  deleteNoticeTitle="আজকের দুপুরের পোল: ডিলিট করা হয়েছে"
                  deleteNoticeDesc="দোকানদারের ১ দিন আগের নিয়মে রাতের পোলেই কালকের দুপুরের মিল নির্ধারিত হয়ে যায়। তাই সকালে মেম্বারদের কাছে আর কোনো অতিরিক্ত মেসেজ যাবে না।"
                  presets={[
                    { label: 'সকাল ৭:০০', val: '07:00' },
                    { label: 'সকাল ৭:৩০', val: '07:30' },
                    { label: 'সকাল ৮:০০', val: '08:00' },
                    { label: 'সকাল ৮:৩০', val: '08:30' },
                    { label: 'সকাল ৯:০০', val: '09:00' },
                  ]}
                />

                {/* Today Dinner Poll - Can be Deleted/Turned off */}
                <MessTimePicker
                  label="🌙 আজকের রাতের পোল (দুপুর)"
                  badge="দৈনিক পোল"
                  value={editingTemplates.afternoonPollTime || '14:00'}
                  onChange={(val) =>
                    setEditingTemplates((prev) => ({ ...prev, afternoonPollTime: val }))
                  }
                  isDeleted={!editingTemplates.enableDinnerPoll}
                  onDelete={() => setEditingTemplates((prev) => ({ ...prev, enableDinnerPoll: false }))}
                  onRestore={() => setEditingTemplates((prev) => ({ ...prev, enableDinnerPoll: true }))}
                  deleteNoticeTitle="আজকের রাতের পোল: ডিলিট / বন্ধ"
                  deleteNoticeDesc="১ দিন আগের রাতের পোলেই আগামীকালের দুপুরের পাশাপাশি রাতের হিসাবও নির্ধারিত হয়।"
                  presets={[
                    { label: 'দুপুর ১:০০', val: '13:00' },
                    { label: 'দুপুর ১:৩০', val: '13:30' },
                    { label: 'দুপুর ২:০০', val: '14:00' },
                    { label: 'দুপুর ২:৩০', val: '14:30' },
                    { label: 'বিকাল ৩:০০', val: '15:00' },
                  ]}
                />
              </div>
            </div>

            {/* Template Inputs */}
            <div className="space-y-4">
              {/* Advance Tomorrow Template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-emerald-900">
                    🌟 আগামীকালের ৪-পছন্দ পোল মেসেজ টেমপ্লেট
                  </label>
                  <span className="text-[11px] text-emerald-700 font-extrabold bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
                    {getBengaliTimeLabel(editingTemplates.advancePollTime) || 'রাত ০৮:০০ PM'} টায় যাবে
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={editingTemplates.tomorrowPollMessage}
                  onChange={(e) =>
                    setEditingTemplates((prev) => ({ ...prev, tomorrowPollMessage: e.target.value }))
                  }
                  className="w-full p-3 rounded-xl border-2 border-emerald-300 text-xs font-mono font-medium text-slate-800 leading-relaxed focus:ring-2 focus:ring-emerald-500"
                  placeholder="আগামীকালের ৪-পছন্দ পোল মেসেজ..."
                />
              </div>

              {/* Cook Tomorrow Notification Template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black text-emerald-900">
                    👨‍🍳 দোকানদার / বাবুর্চির হোয়াটসঅ্যাপ গ্রুপে আগামীকালের মিলের হিসাব
                  </label>
                  <span className="text-[11px] text-slate-500">
                    ভ্যারিয়েবল: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">{'{tomorrow_date}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">{'{lunch_count}'}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700 font-bold">{'{dinner_count}'}</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={editingTemplates.cookTomorrowNotificationTemplate}
                  onChange={(e) =>
                    setEditingTemplates((prev) => ({
                      ...prev,
                      cookTomorrowNotificationTemplate: e.target.value,
                    }))
                  }
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-800 leading-relaxed focus:ring-2 focus:ring-emerald-500"
                  placeholder="গ্রুপে পাঠানোর ফরম্যাট..."
                />
              </div>

              {/* Only show Daily Lunch Template if enableLunchPoll is true */}
              {editingTemplates.enableLunchPoll ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-800">
                      📢 আজকের দুপুরের পোল মেসেজ টেমপ্লেট
                    </label>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      সকাল {editingTemplates.morningPollTime || '08:00'} টায় যাবে
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editingTemplates.lunchPollMessage}
                    onChange={(e) =>
                      setEditingTemplates((prev) => ({ ...prev, lunchPollMessage: e.target.value }))
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-800 leading-relaxed focus:ring-2 focus:ring-emerald-500"
                    placeholder="দুপুরের মিল পোল মেসেজ..."
                  />
                </div>
              ) : null}

              {/* Only show Daily Dinner Template if enableDinnerPoll is true */}
              {editingTemplates.enableDinnerPoll ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black text-slate-800">
                      📢 আজকের রাতের পোল মেসেজ টেমপ্লেট
                    </label>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      দুপুর {editingTemplates.afternoonPollTime || '14:00'} টায় যাবে
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editingTemplates.dinnerPollMessage}
                    onChange={(e) =>
                      setEditingTemplates((prev) => ({ ...prev, dinnerPollMessage: e.target.value }))
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono font-medium text-slate-800 leading-relaxed focus:ring-2 focus:ring-emerald-500"
                    placeholder="রাতের মিল পোল মেসেজ..."
                  />
                </div>
              ) : null}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetTemplates}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                title="ডিফল্ট মেসেজে ফিরিয়ে নিন"
              >
                ডিফল্টে রিসেট করুন
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseTemplateModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  id="btn-save-templates-confirm"
                  onClick={handleSaveTemplates}
                  disabled={isSavingTemplates}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingTemplates ? 'সংরক্ষণ হচ্ছে...' : 'সেভ ও শিডিউল আপডেট করুন'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
