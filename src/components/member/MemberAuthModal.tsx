import React, { useState, useEffect } from 'react';
import { Users, Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { Member } from '../../types';

interface MemberAuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSelectMember: (memberId: string) => void;
  onOpenAdminLogin: () => void;
  initialMemberId?: string | null;
  membersList?: Member[];
}

export const MemberAuthModal: React.FC<MemberAuthModalProps> = ({
  isOpen,
  onClose,
  onSelectMember,
  onOpenAdminLogin,
  initialMemberId = null,
  membersList = [],
}) => {
  const [members, setMembers] = useState<{ id: string; name: string; fullName?: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialMemberId || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (membersList.length > 0) {
      setMembers(
        membersList
          .filter((m) => m.isActive)
          .map((m) => ({ id: m.id, name: m.fullName || m.nickname || 'Member' }))
      );
      if (!selectedId && membersList.length > 0) {
        setSelectedId(initialMemberId || membersList[0].id);
      }
    } else {
      ApiService.getPublicMembers()
        .then((list) => {
          setMembers(list);
          if (!selectedId && list.length > 0) {
            setSelectedId(initialMemberId || list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [membersList, initialMemberId]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setError('দয়া করে আপনার নাম সিলেক্ট করুন');
      return;
    }
    if (!pin.trim()) {
      setError('আপনার ৪ ডিজিটের পিন দিন');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await ApiService.verifyMember(selectedId, pin.trim());
      if (res.verified) {
        onSelectMember(selectedId);
      } else {
        setError('ভুল পিন কোড! আপনার ৪ ডিজিটের পিন দিন।');
      }
    } catch (err: any) {
      setError(err?.message || 'ভুল পিন কোড! আপনার ৪ ডিজিটের পিন দিন।');
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = members.find((m) => m.id === selectedId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 text-slate-900 border border-slate-100 relative">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-14 w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-black text-slate-900">মেম্বার পোর্টালে লগইন</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            আপনার নাম ও ৪ ডিজিটের পিন দিয়ে প্রবেশ করুন। আপনার তথ্য অন্য কেউ দেখতে পারবে না।
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {/* Member Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              আপনার নাম নির্বাচন করুন:
            </label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setError(null);
              }}
              className="w-full py-2.5 px-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.fullName || 'Member'}
                </option>
              ))}
            </select>
          </div>

          {/* PIN Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                আপনার গোপন পিন (PIN):
              </label>
              <span className="text-[11px] text-slate-400">ডিফল্ট: 1234</span>
            </div>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(null);
                }}
                className="w-full text-center tracking-[0.4em] text-2xl font-black py-3 px-4 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition-all"
              />
              <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-slate-400" />
            </div>
            {error && (
              <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span>প্রবেশ হচ্ছে...</span>
            ) : (
              <>
                <span>আমার পোর্টালে ঢুকুন</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Admin */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <span className="text-slate-500">মেস ম্যানেজার বা এডমিন?</span>
          <button
            onClick={onOpenAdminLogin}
            className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>এডমিন প্যানেলে লগইন</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
