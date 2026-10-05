import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Lock, KeyRound, Mail, Phone, User, AlertCircle, ArrowRight, Zap } from 'lucide-react';
import { useBranding } from '../hooks/useBranding';
import { AuthUser } from '../types';

interface RegisterPageProps {
  onRegisterSuccess: (user: AuthUser) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onRegisterSuccess }) => {
  const navigate = useNavigate();
  const { appName, logo } = useBranding();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick 0000 Test Auto-Registration & Auto-Entry
  const triggerQuickTestRegister = async () => {
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const testName = `টেস্ট মেম্বার (০০০০)`;
    const testEmail = `test0000_${suffix}@gmail.com`;
    const testPhone = `0171${Math.floor(1000000 + Math.random() * 9000000)}`;
    const testAddress = 'রুম ২০৪, টেস্ট মেস';
    const testStudentId = 'TEST-0000';
    const testPass = 'password0000';

    setFullName(testName);
    setEmail(testEmail);
    setPhone(testPhone);
    setAddress(testAddress);
    setStudentId(testStudentId);
    setPassword(testPass);
    setConfirmPassword(testPass);
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/mess/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: testName,
          email: testEmail,
          phone: testPhone,
          address: testAddress,
          studentId: testStudentId,
          password: testPass,
          pin: '0000',
          isTest: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
      }

      if (json.user) {
        try {
          localStorage.setItem('messmate_auth_user', JSON.stringify(json.user));
        } catch {}
      }
      onRegisterSuccess(json.user);
      navigate('/member/home', { replace: true });
    } catch (err: any) {
      setError(err.message || 'রেজিস্ট্রেশন করা যায়নি। আবার চেষ্টা করুন।');
      setLoading(false);
    }
  };

  const checkAndHandle0000 = async (val: string) => {
    const trimmed = val.trim();
    if (trimmed === '0000' || trimmed === '০০০০' || trimmed.includes('0000') || trimmed.includes('০০০০')) {
      try {
        setLoading(true);
        const res = await fetch('/api/mess/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: '0000', password: '0000' }),
        });
        const json = await res.json();
        if (json.success && json.user) {
          try {
            localStorage.setItem('messmate_auth_user', JSON.stringify(json.user));
          } catch {}
          onRegisterSuccess(json.user);
          navigate('/member/home', { replace: true });
          return true;
        }
      } catch {}
      await triggerQuickTestRegister();
      return true;
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const normEmail = email.trim().toLowerCase();
    if (normEmail === 'abidulsafat85@gmail.com') {
      setError('এই ইমেইলটি এডমিন অ্যাকাউন্ট। রেজিস্ট্রেশন নিষিদ্ধ। এডমিন হিসেবে সরাসরি লগইন করুন।');
      return;
    }

    if (!address.trim()) {
      setError('ঠিকানা বা মেসের রুম নম্বর আবশ্যক।');
      return;
    }

    if (password.length < 4) {
      setError('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }

    if (password !== confirmPassword) {
      setError('পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড দুটি একই হতে হবে।');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/mess/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email: normEmail,
          phone,
          address: address.trim(),
          studentId: studentId.trim() || undefined,
          password,
          pin: password.slice(0, 4),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
      }

      if (json.user) {
        try {
          localStorage.setItem('messmate_auth_user', JSON.stringify(json.user));
        } catch {}
      }
      onRegisterSuccess(json.user);
      navigate('/member/home', { replace: true });
    } catch (err: any) {
      setError(err.message || 'রেজিস্ট্রেশন করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 font-sans selection:bg-emerald-600 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <div className="h-11 w-11 rounded-full bg-white p-0.5 border border-stone-200 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={logo || '/ghorer_shadh_logo.svg'}
                alt={appName}
                className="h-full w-full object-contain rounded-full bg-white"
              />
            </div>
            <span className="text-2xl font-black text-slate-900">{appName}</span>
          </Link>
          <p className="text-xs text-stone-500 font-medium">নতুন মেম্বার অ্যাকাউন্ট খুলুন</p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">পূর্ণ নাম (Full Name):</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="text"
                required
                placeholder="আপনার পুরো নাম লিখুন"
                value={fullName}
                onChange={(e) => {
                  const val = e.target.value;
                  setFullName(val);
                  checkAndHandle0000(val);
                }}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল ঠিকানা (Email):</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর (Phone):</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
              <input
                type="tel"
                required
                placeholder="017XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ঠিকানা / মেসের রুম নং (Address):</label>
            <input
              type="text"
              required
              placeholder="রুম ২০৪, ২য় তলা অথবা মেসের ঠিকানা"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">স্টুডেন্ট আইডি (ঐচ্ছিক):</label>
            <input
              type="text"
              placeholder="e.g. 2022-1-60-001 (প্রযোজ্য না হলে খালি রাখুন)"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পাসওয়ার্ড (৪+ অক্ষর):</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="পাসওয়ার্ড লিখুন"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">কনফার্ম পাসওয়ার্ড:</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0f3934] hover:bg-[#134e4a] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span> : <span>রেজিস্ট্রেশন সম্পন্ন করুন</span>}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-stone-500">
            ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
            <Link to="/login" className="text-emerald-700 font-bold hover:underline">
              লগইন করুন
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
