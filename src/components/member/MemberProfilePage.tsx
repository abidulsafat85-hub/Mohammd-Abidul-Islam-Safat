import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Lock,
  LogOut,
  Save,
  AlertCircle,
  CheckCircle2,
  Edit3,
  X,
  ShieldCheck,
} from 'lucide-react';
import { MemberNav } from './MemberNav';
import { AuthUser } from '../../types';

interface MemberProfilePageProps {
  authUser: AuthUser | null;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const MemberProfilePage: React.FC<MemberProfilePageProps> = ({
  authUser,
  onLogout,
  isAdmin,
}) => {
  const navigate = useNavigate();
  const memberId = authUser?.memberId || authUser?.id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [origPhone, setOrigPhone] = useState('');
  const [address, setAddress] = useState('');
  const [studentId, setStudentId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');

  useEffect(() => {
    if (!memberId) return;
    setLoading(true);
    fetch(`/api/mess/member/${memberId}/profile`, { credentials: 'include' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const m = json.data;
          setFullName(m.fullName || '');
          setEmail(m.email || authUser?.email || '');
          setPhone(m.phone || '');
          setOrigPhone(m.phone || '');
          setAddress(m.address || m.location || '');
          setStudentId(m.studentId || m.universityId || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [memberId, authUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const isPhoneChanged = phone.trim() !== origPhone.trim();
    if (isPhoneChanged && !currentPassword.trim()) {
      setError('মোবাইল নম্বর পরিবর্তন করতে বর্তমান পাসওয়ার্ড দেওয়া আবশ্যক।');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/mess/member/${memberId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          studentId: studentId.trim(),
          currentPassword: currentPassword.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'প্রোফাইল আপডেট করতে ব্যর্থ হয়েছে');
      }

      setSuccess('প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
      setOrigPhone(phone.trim());
      setCurrentPassword('');
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || 'আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSaving(false);
    }
  };

  const handleSimpleLogout = async () => {
    await onLogout();
  };

  const initials = fullName ? fullName.slice(0, 2).toUpperCase() : 'মে';

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-20 font-sans">
      <MemberNav authUser={authUser} onLogout={onLogout} isAdmin={isAdmin} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* Header Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">আমার প্রোফাইল ও নিরাপত্তা</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            আপনার অ্যাকাউন্টের ব্যক্তিগত তথ্য ও নিরাপত্তা বিবরণী
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* 1. Member Profile Banner Card */}
        <div className="bg-gradient-to-br from-[#0f3934] to-[#175249] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-black text-2xl shadow-inner shrink-0">
                {initials}
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {fullName || 'মেম্বার'}
                </h2>
                <p className="text-xs text-emerald-200/90 font-medium mt-0.5">{email}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[11px] font-bold text-emerald-100">
                    <ShieldCheck className="h-3 w-3" />
                    সক্রিয় মেম্বার
                  </span>
                  {address && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-emerald-100">
                      📍 {address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-[#0f3934] hover:bg-emerald-50 text-xs font-black shadow-xs transition-colors cursor-pointer"
            >
              {isEditing ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span>বাতিল</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>তথ্য এডিট</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Organized Information Grid (সুন্দর করে সাজানো ইনফরমেশন) */}
        {!isEditing ? (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">ব্যক্তিগত তথ্যাবলী</h3>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">নিরাপদ ও সংরক্ষিত</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Name Tile */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold mb-1">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  <span>পূর্ণ নাম (Full Name)</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{fullName || '—'}</div>
              </div>

              {/* Email Tile */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Mail className="h-3.5 w-3.5 text-emerald-600" />
                    <span>ইমেইল অ্যাড্রেস</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">পরিবর্তনযোগ্য নয়</span>
                </div>
                <div className="text-sm font-bold text-slate-900 break-all">{email || '—'}</div>
              </div>

              {/* Phone Tile */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold mb-1">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>মোবাইল নম্বর (Phone)</span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">{phone || '—'}</div>
              </div>

              {/* Address / Room Tile */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold mb-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                  <span>ঠিকানা / মেসের রুম নং</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{address || 'মেস'}</div>
              </div>

              {/* Student ID Tile */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 sm:col-span-2">
                <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold mb-1">
                  <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
                  <span>স্টুডেন্ট / ভার্সিটি আইডি</span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">{studentId || 'দেওয়া হয়নি'}</div>
              </div>
            </div>
          </div>
        ) : (
          /* Profile Edit Form */
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">তথ্য পরিবর্তন করুন</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণ নাম (Full Name): *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেইল অ্যাড্রেস (পরিবর্তনযোগ্য নয়):
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-500 text-sm outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর (Phone): *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঠিকানা / মেসের রুম নং (Address / Room): *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">স্টুডেন্ট আইডি (Student ID):</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              {phone.trim() !== origPhone.trim() && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    বর্তমান পাসওয়ার্ড (নিরাপত্তা যাচাই): *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="password"
                      required
                      placeholder="বর্তমান পাসওয়ার্ড লিখুন"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-amber-300 bg-amber-50/30 text-sm focus:border-amber-600 outline-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. Simple & Clean Logout Option (User Requested: aita baddio simple logout option thakbe) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">লগআউট</h3>
              <p className="text-xs text-slate-500 font-medium">অ্যাকাউন্ট থেকে নিরাপদে বের হয়ে হোমপেজে যান</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSimpleLogout}
            className="px-5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </main>
    </div>
  );
};
