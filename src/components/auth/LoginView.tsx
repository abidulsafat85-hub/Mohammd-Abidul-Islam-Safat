import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Mail,
  Lock,
  ArrowRight,
  User,
  Phone,
  GraduationCap,
  Users,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  CheckCircle2,
  FileText,
  MapPin,
  Compass,
} from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { AuthUser } from '../../types';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [universityId, setUniversityId] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Auto/Manual GPS location detector
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('আপনার ব্রাউজারে লোকেশন সার্ভিস সাপোর্ট করছে না। নিজে লিখে দিন।');
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetectingLocation(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        const autoText = `GPS: (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        if (!location) {
          setLocation(autoText);
        } else if (!location.includes('GPS:')) {
          setLocation(`${location} [${autoText}]`);
        }
      },
      (err) => {
        setDetectingLocation(false);
        // If permission denied or error, user can still type room/address
        console.warn('Geolocation error:', err.message);
      },
      { timeout: 8000 }
    );
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal / message state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError('ইমেইল অ্যাড্রেস লিখুন');
      return;
    }

    if (authMode === 'register') {
      if (!name.trim()) {
        setError('আপনার পুরো নাম লিখুন');
        return;
      }
      if (!universityId.trim()) {
        setError('ভার্সিটি আইডি নং লিখুন');
        return;
      }
      if (!phone.trim()) {
        setError('আপনার পারসোনাল নাম্বার লিখুন');
        return;
      }
      if (!parentPhone.trim()) {
        setError('আপনার মা অথবা বাবার যে কোনো একজনের নাম্বার লিখুন');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (authMode === 'login') {
        const result = await ApiService.loginWithEmail(cleanEmail, password);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setError(result?.error || 'লগইন ব্যর্থ হয়েছে। সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।');
        }
      } else {
        setError('মেম্বারদের এডমিন প্যানেল থেকে মেস ম্যানেজার সরাসরি যুক্ত করবেন। আপনার ইমেইল যুক্ত করতে মেস ম্যানেজারের সাথে যোগাযোগ করুন।');
      }
    } catch (err: any) {
      setError(err?.message || 'লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  // Google Login Handler (Prompts for credentials without hardcoded bypass)
  const handleGoogleLogin = async () => {
    setError(null);
    const googleEmail = prompt('আপনার গুগল একাউন্টের ইমেইল লিখুন:', email || 'abidulsafat85@gmail.com');
    if (!googleEmail || !googleEmail.trim()) {
      return;
    }
    const cleanEmail = googleEmail.trim().toLowerCase();
    setEmail(cleanEmail);

    const pass = prompt('আপনার একাউন্টের পাসওয়ার্ড দিন:');
    if (!pass || !pass.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await ApiService.loginWithEmail(cleanEmail, pass.trim());
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(result?.error || 'লগইন ব্যর্থ হয়েছে। সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।');
      }
    } catch (err: any) {
      setError(err?.message || 'লগইন ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotMsg(
      `পাসওয়ার্ড রিসেট সংক্রান্ত অনুরোধ মেস ম্যানেজারকে পাঠানো হয়েছে। মেস ম্যানেজার (০১৭১২৩৪৫৬৭৮) এর সাথে যোগাযোগ করুন।`
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-emerald-500 selection:text-white">
      {/* Container Box */}
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-8 border border-slate-100 relative overflow-hidden my-4">
        {/* Top Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2 pb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-1">
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">MessMate</h1>
          <p className="text-xs text-slate-500 font-medium">
            স্মার্ট মেস মিল ও আর্থিক হিসাব ব্যবস্থাপনা
          </p>
        </div>

        {/* Tab Toggle: Login vs Register */}
        <div className="mt-4 mb-4 p-1 bg-slate-100 rounded-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'login'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>লগইন (Login)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              authMode === 'register'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>রেজিস্ট্রেশন (Register)</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* REGISTRATION SPECIFIC FIELDS */}
          {authMode === 'register' && (
            <>
              {/* Full Name field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  আপনার পুরো নাম (Full Name): <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="যেমন: Abidul Safat"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Requirement / Condition Badge */}
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-2xl">
                <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs mb-2">
                  <FileText className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>শর্তাবলী ও প্রয়োজনীয় তথ্যাবলী (Documents) 🤔🤔</span>
                </div>

                {/* 1. ভার্সিটি আইডি নং */}
                <div className="mb-2.5">
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    ১. ভার্সিটি আইডি নং: <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2 h-4 w-4 text-amber-600" />
                    <input
                      type="text"
                      required
                      placeholder="যেমন: 2022-1-60-001"
                      value={universityId}
                      onChange={(e) => {
                        setUniversityId(e.target.value);
                        setError(null);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-300 focus:border-amber-600 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 2. আপনার পারসোনাল নাম্বার */}
                <div className="mb-2.5">
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    ২. আপনার পারসোনাল নাম্বার: <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2 h-4 w-4 text-amber-600" />
                    <input
                      type="tel"
                      required
                      placeholder="যেমন: 017XXXXXXXX"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setError(null);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-300 focus:border-amber-600 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 3. আপনার মা বাবা যে কোনো একজনের নাম্বার */}
                <div className="mb-2.5">
                  <label className="block text-[11px] font-bold text-amber-950 mb-1">
                    ৩. আপনার মা বাবা যে কোনো একজনের নাম্বার: <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-2 h-4 w-4 text-amber-600" />
                    <input
                      type="tel"
                      required
                      placeholder="অভিভাবকের মোবাইল নম্বর"
                      value={parentPhone}
                      onChange={(e) => {
                        setParentPhone(e.target.value);
                        setError(null);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-300 focus:border-amber-600 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 4. আপনার বর্তমান লোকেশন / ঠিকানা / রুম নং */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-amber-950">
                      ৪. আপনার বর্তমান লোকেশন / মেসের রুম নং:
                    </label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={detectingLocation}
                      className="text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-300 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                      title="GPS দিয়ে স্বয়ংক্রিয় লোকেশন খুঁজুন"
                    >
                      <Compass className={`h-3 w-3 ${detectingLocation ? 'animate-spin' : ''}`} />
                      <span>{detectingLocation ? 'খোঁজা হচ্ছে...' : '📍 অটো লোকেশন'}</span>
                    </button>
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2 h-4 w-4 text-amber-600" />
                    <input
                      type="text"
                      placeholder="যেমন: রুম নং ২০৪, ২য় তলা অথবা এলাকা"
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setError(null);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-amber-300 focus:border-amber-600 rounded-xl text-xs font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Email Address Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ইমেইল অ্যাড্রেস (Email Address): <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                পাসওয়ার্ড (Password): <span className="text-rose-500">*</span>
              </label>
              {authMode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                    setForgotMsg(null);
                  }}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  ফরগেট পাসওয়ার্ড?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
          >
            {loading ? (
              <span>প্রসেস হচ্ছে...</span>
            ) : (
              <>
                <span>{authMode === 'login' ? 'লগইন করুন' : 'রেজিস্ট্রেশন করুন'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider with OR */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
            <span className="bg-white px-3 text-slate-400 font-bold">অথবা</span>
          </div>
        </div>

        {/* Google Login Option */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2.5 shadow-2xs cursor-pointer hover:border-slate-300"
        >
          {/* Official Google 'G' Logo SVG */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>গুগল দিয়ে লগইন করুন (Continue with Google)</span>
        </button>

        {/* Bottom Switcher */}
        <div className="mt-4 text-center">
          {authMode === 'login' ? (
            <p className="text-xs text-slate-500">
              নতুন মেম্বার?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setError(null);
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                নতুন একাউন্ট তৈরি করুন
              </button>
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              ইতিমধ্যে একাউন্ট আছে?{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setError(null);
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer"
              >
                লগইন করুন
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 relative">
            <h3 className="text-base font-black text-slate-900 mb-1">পাসওয়ার্ড পুনরুদ্ধার (Forgot Password)</h3>
            <p className="text-xs text-slate-500 mb-4">
              আপনার নিবন্ধিত ইমেইল ঠিকানা দিন। মেস ম্যানেজারের কাছে রিকোয়েস্ট পাঠানো হবে।
            </p>

            {forgotMsg ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{forgotMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  ঠিক আছে
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ইমেইল অ্যাড্রেস:
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    রিকোয়েস্ট পাঠান
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
