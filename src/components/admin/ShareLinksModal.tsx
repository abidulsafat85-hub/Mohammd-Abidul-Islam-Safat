import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Key,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Member, MessSettings } from '../../types';
import { Modal } from '../common/Modal';
import { DEFAULT_APP_NAME } from '../../constants/branding';

interface ShareLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  settings: MessSettings;
  onPreviewMember: (memberId: string) => void;
}

export const ShareLinksModal: React.FC<ShareLinksModalProps> = ({
  isOpen,
  onClose,
  members,
  settings,
  onPreviewMember,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGeneral, setCopiedGeneral] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{ [id: string]: { status: 'sent' | 'failed'; message: string } }>({});

  const baseUrl = window.location.origin;

  const handleCopyLink = (memberId: string) => {
    // Normal route requiring login (Section 1d)
    const url = `${baseUrl}/member/meal`;
    navigator.clipboard.writeText(url);
    setCopiedId(memberId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyGeneralLink = () => {
    const url = `${baseUrl}/member/home`;
    navigator.clipboard.writeText(url);
    setCopiedGeneral(true);
    setTimeout(() => setCopiedGeneral(false), 2500);
  };

  const handleSendWhatsAppServer = async (member: Member) => {
    if (!member.phone) {
      alert('এই মেম্বারের কোনো ফোন নম্বর সেট করা নেই।');
      return;
    }

    const url = `${baseUrl}/member/meal`;
    const pin = member.pin || '1234';
    const appTitle = settings.appName || settings.messName || DEFAULT_APP_NAME;
    const text =
      `আসসালামু আলাইকুম ${member.fullName},\n\n` +
      `আমাদের ${appTitle} মেসের মিল এন্ট্রি ও ব্যক্তিগত হিসাবের লিংক নিচে দেওয়া হলো:\n\n` +
      `🔗 পোর্টাল লিংক: ${url}\n` +
      `🔑 আপনার গোপন পিন: ${pin}\n\n` +
      `এই লিংকে ঢুকে লগইন করে আপনি প্রতিদিনের মিল অন/অফ করতে পারবেন এবং আপনার জমা ও ব্যালেন্স দেখতে পারবেন। ধন্যবাদ!`;

    setSendingId(member.id);
    try {
      const res = await fetch('/api/whatsapp/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone: member.phone,
          message: text,
          messageType: 'member_link_invite',
          memberId: member.id,
          forceDuplicate: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        setSendResult((prev) => ({
          ...prev,
          [member.id]: { status: 'failed', message: json.error || 'পাঠানো ব্যর্থ হয়েছে' },
        }));
      } else {
        setSendResult((prev) => ({
          ...prev,
          [member.id]: { status: 'sent', message: 'সফলভাবে পাঠানো হয়েছে' },
        }));
      }
    } catch (err: any) {
      setSendResult((prev) => ({
        ...prev,
        [member.id]: { status: 'failed', message: err.message || 'নেটওয়ার্ক ত্রুটি' },
      }));
    } finally {
      setSendingId(null);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.isActive &&
      (m.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.phone && m.phone.includes(searchTerm)))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="মেম্বারদের পোর্টাল লিংক ও আমন্ত্রণ (Share Links)"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Info Banner */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-950">
              নিরাপদ মেম্বার পোর্টাল লিংক
            </h4>
            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
              মেম্বাররা এই লিংকে ঢুকে লগইন করে <strong>শুধুমাত্র নিজের মিল ও হিসাব দেখতে ও পরিবর্তন করতে পারবে</strong>। স্বয়ংক্রিয়ভাবে মেসেজ পাঠাতে "Send" বাটনে ক্লিক করুন।
            </p>
          </div>
        </div>

        {/* General Link Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-700 w-full sm:w-auto">
            <span className="font-bold text-slate-900 block">সাধারণ মেম্বার পোর্টাল লিংক:</span>
            <span className="text-slate-500 font-mono text-[11px] truncate block max-w-sm">
              {baseUrl}/member/meal
            </span>
          </div>
          <button
            onClick={handleCopyGeneralLink}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-colors cursor-pointer"
          >
            {copiedGeneral ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>কপি হয়েছে</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                <span>কপি করুন</span>
              </>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="মেম্বারের নাম বা ফোন দিয়ে খুঁজুন..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Member Links List */}
        <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1">
          {filteredMembers.map((member) => {
            const pin = member.pin || '1234';
            const isCopied = copiedId === member.id;
            const isSending = sendingId === member.id;
            const result = sendResult[member.id];

            // Manual wa.me fallback link
            let cleanPhone = (member.phone || '').replace(/\D/g, '');
            if (cleanPhone.startsWith('01')) cleanPhone = '88' + cleanPhone;
            const manualWaUrl = `https://wa.me/${cleanPhone}`;

            return (
              <div
                key={member.id}
                className="bg-white border border-slate-200/90 hover:border-emerald-300 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors shadow-2xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{member.fullName}</span>
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                      <Key className="h-3 w-3 text-amber-600" />
                      PIN: <strong>{pin}</strong>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                    {member.phone && <span>📞 {member.phone}</span>}
                    {member.nickname && <span>• ডাকনাম: {member.nickname}</span>}
                    {/* Optional Manual WhatsApp Link (Section 2a) */}
                    {member.phone && (
                      <a
                        href={manualWaUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-[11px] text-teal-700 hover:underline flex items-center gap-0.5"
                      >
                        (ম্যানুয়ালি খুলুন)
                      </a>
                    )}
                  </div>
                  {result && (
                    <div
                      className={`text-[11px] font-bold flex items-center gap-1 mt-1 ${
                        result.status === 'sent' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {result.status === 'sent' ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-rose-600" />
                      )}
                      <span>{result.message}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  {/* Copy Link Button */}
                  <button
                    onClick={() => handleCopyLink(member.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                    title="পোর্টাল লিংক কপি করুন"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span>কপি হয়েছে</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>লিংক কপি</span>
                      </>
                    )}
                  </button>

                  {/* Send via UltraMsg Server API */}
                  <button
                    onClick={() => handleSendWhatsAppServer(member)}
                    disabled={isSending || !member.phone}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    title="হোয়াটসঅ্যাপ গেটওয়ে দিয়ে পাঠান"
                  >
                    {isSending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <MessageCircle className="h-3.5 w-3.5" />
                    )}
                    <span>{isSending ? 'পাঠাচ্ছে...' : 'Send WhatsApp'}</span>
                  </button>

                  {/* Preview as Member */}
                  <button
                    onClick={() => {
                      onClose();
                      onPreviewMember(member.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200 cursor-pointer"
                    title="মেম্বার পোর্টাল প্রিভিউ দেখুন"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>প্রিভিউ</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              কোনো মেম্বার পাওয়া যায়নি
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </Modal>
  );
};
