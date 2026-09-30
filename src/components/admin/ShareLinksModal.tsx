import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  Shield,
  Key,
  Users,
  Search,
  Sparkles,
} from 'lucide-react';
import { Member, MessSettings } from '../../types';
import { Modal } from '../common/Modal';

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

  const baseUrl = window.location.origin + window.location.pathname;

  const handleCopyLink = (memberId: string, memberPin: string) => {
    const url = `${baseUrl}?member=${encodeURIComponent(memberId)}`;
    navigator.clipboard.writeText(url);
    setCopiedId(memberId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyGeneralLink = () => {
    const url = `${baseUrl}?portal=member`;
    navigator.clipboard.writeText(url);
    setCopiedGeneral(true);
    setTimeout(() => setCopiedGeneral(false), 2500);
  };

  const handleSendWhatsApp = (member: Member) => {
    const url = `${baseUrl}?member=${encodeURIComponent(member.id)}`;
    const pin = member.pin || '1234';
    const text = encodeURIComponent(
      `আসসালামু আলাইকুম ${member.fullName},\n\n` +
      `আমাদের ${settings.messName || 'MessMate'} মেসের মিল এন্ট্রি ও ব্যক্তিগত হিসাবের লিংক নিচে দেওয়া হলো:\n\n` +
      `🔗 আপনার ব্যক্তিগত লিংক: ${url}\n` +
      `🔑 আপনার গোপন পিন: ${pin}\n\n` +
      `এই লিংকে ঢুকে আপনি প্রতিদিনের মিল অন/অফ করতে পারবেন এবং আপনার জমা ও ব্যালেন্স দেখতে পারবেন। আপনার তথ্য অন্য কেউ দেখতে পারবে না। ধন্যবাদ!`
    );

    let cleanPhone = (member.phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('01')) {
      cleanPhone = '88' + cleanPhone;
    }
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${text}`
      : `https://wa.me/?text=${text}`;

    window.open(waUrl, '_blank');
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
      title="মেম্বারদের ব্যক্তিগত শেয়ার লিংক (Individual Links)"
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
              প্রত্যেক মেম্বারের জন্য আলাদা ব্যক্তিগত লিংক
            </h4>
            <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
              মেম্বাররা এই লিংকে ঢুকে <strong>শুধুমাত্র নিজের মিল ও হিসাব পূরণ করতে পারবে</strong>। তারা অন্য কারো মিল, জমা বা হিসাব দেখতে পারবে না।
            </p>
          </div>
        </div>

        {/* General Link Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-700 w-full sm:w-auto">
            <span className="font-bold text-slate-900 block">সাধারণ মেম্বার পোর্টাল লিংক:</span>
            <span className="text-slate-500 font-mono text-[11px] truncate block max-w-sm">
              {baseUrl}?portal=member
            </span>
          </div>
          <button
            onClick={handleCopyGeneralLink}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors shadow-xs"
          >
            {copiedGeneral ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">কপি হয়েছে!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>সাধারণ লিংক কপি করুন</span>
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
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    {member.phone && <span>📞 {member.phone}</span>}
                    {member.nickname && <span>• ডাকনাম: {member.nickname}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                  {/* Copy Link Button */}
                  <button
                    onClick={() => handleCopyLink(member.id, pin)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="ব্যক্তিগত লিংক কপি করুন"
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

                  {/* Send to WhatsApp */}
                  <button
                    onClick={() => handleSendWhatsApp(member)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-xs"
                    title="মেম্বারকে হোয়াটসঅ্যাপে পাঠান"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  {/* Preview as Member */}
                  <button
                    onClick={() => {
                      onClose();
                      onPreviewMember(member.id);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </Modal>
  );
};
