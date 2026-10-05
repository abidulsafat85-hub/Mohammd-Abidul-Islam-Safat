import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Utensils,
  ShoppingBag,
  Phone,
  MapPin,
  Menu as MenuIcon,
  X,
  CreditCard,
  Download,
  LogIn,
  UserPlus,
  Lock,
  User,
  Mail,
  GraduationCap,
  AlertCircle,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import { useBranding } from '../hooks/useBranding';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { PwaInstallModal } from '../components/common/PwaInstallModal';
import { AuthUser } from '../types';

interface HomePageProps {
  authUser: AuthUser | null;
  onLoginSuccess?: (user: AuthUser) => void;
}

const WEEKLY_MENU_ROUTINE = [
  {
    day: 'শনিবার',
    lunch: 'ভাত + মাছ + শাক/ভর্তা + ডাল',
    dinner: 'চিকেন খিচুড়ি + সালাদ',
  },
  {
    day: 'রবিবার',
    lunch: 'ভাত + ডিম + শাক/ভর্তা + ডাল',
    dinner: 'ভাত + মাছ + ভাজি/ভর্তা + ডাল',
  },
  {
    day: 'সোমবার',
    lunch: 'বিরিয়ানি + শেজরানী ডাল + সালাদ',
    dinner: 'ভাত + ডিম + ভাজি/ভর্তা + ডাল',
  },
  {
    day: 'মঙ্গলবার',
    lunch: 'ভাত + মাছ + শাক/ভর্তা + ডাল',
    dinner: 'ভাত + মাছ + ভাজি/ভর্তা + ডাল',
  },
  {
    day: 'বুধবার',
    lunch: 'ভাত + মুরগী + শাক/ভর্তা + ডাল',
    dinner: 'ভাত + ছোট মাছ + ভাজি/ভর্তা + ডাল',
  },
  {
    day: 'বৃহস্পতিবার',
    lunch: 'ভাত + মাছ + শাক/ভর্তা + ডাল',
    dinner: 'খিচুড়ি + ডিম ভুনা + ভর্তা/ভাজি সালাদ',
  },
  {
    day: 'শুক্রবার',
    lunch: 'পোলাও + চিকেন কোরমা / বিরিয়ানি + সালাদ',
    dinner: 'ভাত + ভাজি + ভর্তা + ডাল',
  },
];

const DELIVERY_AREAS = [
  'খাগান বাজার',
  'কাজল গার্ডেন্স',
  'সিটি ইউনিভার্সিটি',
  'মানারাত ইউনিভার্সিটি',
  'ড্যাফোডিল ইউনিভার্সিটি',
  'দত্তপাড়া',
  'ইস্টার্ন ইউনিভার্সিটি',
  'ব্র্যাক ইউনিভার্সিটি',
];

export const HomePage: React.FC<HomePageProps> = ({ authUser, onLoginSuccess }) => {
  const navigate = useNavigate();
  const { appName, logo } = useBranding();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [copiedMenu, setCopiedMenu] = useState(false);

  const handleCopyWeeklyMenu = () => {
    const text = `সাপ্তাহিক মেনুর নমুনা:\n\n` +
      WEEKLY_MENU_ROUTINE.map((item) => `${item.day}:\n  দুপুর: ${item.lunch}\n  রাত: ${item.dinner}`).join('\n\n') +
      `\n\nমাসে ২ দিন গরুর মাংস আছে। ভিন্ন ধর্মাবলম্বীদের জন্য রয়েছে বিশেষ ব্যবস্থা`;
    navigator.clipboard.writeText(text);
    setCopiedMenu(true);
    setTimeout(() => setCopiedMenu(false), 2000);
  };

  const [homeData, setHomeData] = useState<{
    badge?: string;
    headline?: string;
    paragraph?: string;
    storyTitle?: string;
    storyText?: string;
    bgImage?: string;
    phone?: string;
    address?: string;
  }>({
    badge: 'ঘরোয়া স্বাদে স্বাস্থ্যকর খাবারের নির্ভরযোগ্য ঠিকানা',
    headline: 'প্রতিদিনের পুষ্টিকর ও সুস্বাদু খাবার',
    paragraph: 'হোস্টেল, মেস ও ব্যাচেলরদের জন্য ঘরোয়া পরিবেশ ও পরিচ্ছন্নতায় তৈরি খাবার পৌঁছে দিচ্ছি আপনার দ্বারে।',
    storyTitle: 'আমাদের গল্প',
    storyText: `আমরা বিশ্বাস করি স্বাস্থ্যকর খাবার কোনো বিলাসিতা নয়, দৈনন্দিন প্রয়োজন। হোস্টেল ও মেসে থাকা ভাই-বোনদের কথা ভেবেই ${appName}-এর যাত্রা শুরু। মায়ের হাতের রান্নার সেই চেনা অনুভূতি ফিরিয়ে দিতে আমরা ব্যবহার করি খাঁটি মসলা ও টাটকা উপাদান।`,
    phone: '০১৭১২৩৪৫৬৭৮',
    address: 'বাড়ি ১২, রোড ৪, ব্লক সি, মিরপুর ১০, ঢাকা',
  });

  useEffect(() => {
    fetch('/api/mess/home-content')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.content) {
          setHomeData((prev) => ({ ...prev, ...res.content }));
        }
      })
      .catch(() => {});
  }, []);

  const { deferredPrompt, promptInstall, isInstalled, markAsInstalled } = usePwaInstall();
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  const heroRef = useRef<HTMLElement>(null);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      const outcome = await promptInstall();
      if (outcome !== 'accepted') {
        setIsPwaModalOpen(true);
      }
    } else {
      setIsPwaModalOpen(true);
    }
  };

  // Hero section in-place form toggle ('logo' | 'register' | 'login')
  const [heroFormMode, setHeroFormMode] = useState<'logo' | 'register' | 'login'>('logo');

  // Registration state inside Hero
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Login state inside Hero
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const onAuthSuccessDirect = (user: AuthUser, role?: string) => {
    try {
      localStorage.setItem('messmate_auth_user', JSON.stringify(user));
    } catch {}
    if (onLoginSuccess) {
      onLoginSuccess(user);
    } else {
      if (role === 'admin' || user.email?.toLowerCase() === 'abidulsafat85@gmail.com') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/member/home', { replace: true });
      }
    }
  };

  const handleHeroRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    const normEmail = regEmail.trim().toLowerCase();
    if (normEmail === 'abidulsafat85@gmail.com') {
      setRegError('এই ইমেইলটি এডমিন অ্যাকাউন্ট। এডমিন হিসেবে লগইন করুন।');
      return;
    }

    if (!regAddress.trim()) {
      setRegError('ঠিকানা বা মেসের রুম নম্বর আবশ্যক।');
      return;
    }

    if (regPassword.length < 4) {
      setRegError('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের হতে হবে।');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('পাসওয়ার্ড ও কনফার্ম পাসওয়ার্ড দুটি একই হতে হবে।');
      return;
    }

    setRegLoading(true);

    try {
      const res = await fetch('/api/mess/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName.trim(),
          email: normEmail,
          phone: regPhone.trim(),
          address: regAddress.trim(),
          studentId: regStudentId.trim() || undefined,
          password: regPassword,
          pin: regPassword.slice(0, 4),
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
      }

      const authUser: AuthUser = json.user || {
        id: json.memberId,
        email: normEmail,
        name: regName.trim(),
        role: 'member',
        memberId: json.memberId,
      };

      onAuthSuccessDirect(authUser, 'member');
    } catch (err: any) {
      setRegError(err.message || 'রেজিস্ট্রেশন করা যায়নি। আবার চেষ্টা করুন।');
    } finally {
      setRegLoading(false);
    }
  };

  const handleHeroLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await fetch('/api/mess/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'লগইন ব্যর্থ হয়েছে।');
      }

      const authUser: AuthUser = json.user || {
        id: json.memberId || json.userId,
        email: loginEmail.trim().toLowerCase(),
        name: json.name || 'মেম্বার',
        role: json.role || 'member',
        memberId: json.memberId,
      };

      onAuthSuccessDirect(authUser, json.role);
    } catch (err: any) {
      setLoginError(err.message || 'লগইন করা যায়নি। সঠিক তথ্য দিন।');
    } finally {
      setLoginLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-slate-800 font-sans selection:bg-emerald-600 selection:text-white">
      {/* 1. Sticky Navigation Header - Hidden on phone screen per user request */}
      <header className="hidden md:block sticky top-0 z-50 bg-[#0f3934]/95 backdrop-blur-md text-white border-b border-emerald-900/40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-11 w-11 rounded-full bg-white p-0.5 ring-2 ring-emerald-400/40 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={logo || '/ghorer_shadh_logo.svg'}
                alt={appName}
                className="h-full w-full object-contain rounded-full bg-white"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                {appName}
              </span>
              <span className="text-[10px] text-emerald-300/80 font-medium tracking-wide">স্মার্ট মেস ও ক্যাটারিং</span>
            </div>
          </Link>

          {/* Desktop Nav Links & Action Buttons - Right-aligned */}
          <div className="hidden md:flex items-center gap-7">
            <nav className="flex items-center gap-7 text-sm font-semibold text-emerald-100/90">
              {[
                { id: 'home', label: 'হোম' },
                { id: 'services', label: 'সার্ভিস' },
                { id: 'delivery-areas', label: 'ডেলিভারি এলাকা' },
                { id: 'menu', label: 'মেনু' },
                { id: 'contact', label: 'যোগাযোগ' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`transition-all hover:text-white cursor-pointer py-1 relative ${
                    activeSection === item.id ? 'text-white font-bold' : ''
                  }`}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-400 rounded-full" />
                  )}
                </button>
              ))}
            </nav>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white border border-emerald-400/30 text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 backdrop-blur-xs shadow-xs shrink-0"
                title="অ্যাপ ইনস্টল করুন (PWA)"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>ইনস্টল করুন</span>
              </button>
            )}
          </div>

          {/* Mobile Right Controls: Install (if not installed) + Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-2.5 py-1.5 rounded-full bg-white/10 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="অ্যাপ ইনস্টল"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                <span>ইনস্টল</span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-xl text-emerald-200 hover:text-white focus:outline-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#0d2f2b] px-4 pt-3 pb-6 border-t border-emerald-900/50 space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {['home', 'services', 'menu', 'pricing', 'contact'].map((sec) => (
              <button
                key={sec}
                onClick={() => scrollToSection(sec)}
                className="block w-full text-left py-2 px-3 rounded-lg text-emerald-100 hover:bg-emerald-900/40 font-semibold text-sm"
              >
                {sec === 'home' && 'হোম'}
                {sec === 'services' && 'সার্ভিস'}
                {sec === 'menu' && 'মেনু'}
                {sec === 'pricing' && 'মূল্য'}
                {sec === 'contact' && 'যোগাযোগ'}
              </button>
            ))}
            <div className="pt-2 flex flex-col gap-2 border-t border-emerald-800/40">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setHeroFormMode('register');
                  if (heroRef.current) {
                    heroRef.current.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 text-white font-bold text-center text-xs flex items-center justify-center gap-2 shadow-xs"
              >
                <UserPlus className="h-4 w-4" />
                <span>নতুন অ্যাকাউন্ট খুলুন (রেজিস্ট্রেশন)</span>
              </button>
              {!isInstalled && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleInstallClick();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/10 text-emerald-200 font-bold text-center text-xs flex items-center justify-center gap-2 border border-emerald-500/30"
                >
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>অ্যাপ ইনস্টল করুন (PWA)</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section (Clean White Background with Ambient Soft RGB Animation across the entire white area) */}
      <section
        ref={heroRef}
        id="home"
        className="relative bg-white text-slate-900 pt-16 pb-14 sm:py-20 lg:py-28 overflow-hidden min-h-[520px] flex items-center border-b border-stone-200 cursor-default"
      >
        {/* Soft Ambient RGB Animation across the entire white section (onek soft but buja jabe) */}
        <div className="rgb-full-white-ambient">
          {/* Subtle continuous flowing color wash */}
          <div className="rgb-gradient-wash" />
          {/* Gentle floating multi-color ambient meshes */}
          <div className="rgb-mesh-1" />
          <div className="rgb-mesh-2" />
          <div className="rgb-mesh-3" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
          {/* ======================================================== */}
          {/* MOBILE SCREEN LAYOUT (lg:hidden):                       */}
          {/* 1. Generous top spacing (user requested red box area)   */}
          {/* 2. Logo with soft RGB animation                         */}
          {/* 3. Action Box (Below Logo: Login with Register & Order) */}
          {/* 4. Below Box: Remaining text (badge, headline, desc)    */}
          {/* ======================================================== */}
          <div className="flex lg:hidden flex-col items-center gap-5 sm:gap-6 w-full pt-4 sm:pt-0">
            {/* 1. Logo with Soft RGB Animation on Mobile */}
            <div className="flex justify-center items-center w-full">
              <div className="relative flex items-center justify-center">
                {/* Soft RGB Ambient Aura */}
                <div className="absolute -inset-6 sm:-inset-8 rounded-full rgb-aura pointer-events-none opacity-85" />

                {/* Soft RGB Halo Border Ring */}
                <div className="absolute -inset-1 sm:-inset-1.5 rounded-full rgb-halo p-1" />

                {/* Inner Main Circle Badge with white background directly beneath logo */}
                <div
                  className="relative h-56 w-56 sm:h-64 sm:w-64 rounded-full bg-white border-4 border-emerald-400/40 shadow-2xl flex flex-col items-center justify-center p-3 text-center overflow-hidden z-10 cursor-pointer group"
                  onClick={() => setHeroFormMode('login')}
                  title="লগইন বা রেজিস্ট্রেশন করতে ক্লিক করুন"
                >
                  <img
                    src={logo || '/ghorer_shadh_logo.svg'}
                    alt={appName}
                    className="h-full w-full object-contain rounded-full bg-white group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              </div>
            </div>

            {/* 2. Action Box (Below Logo): Login (with Register inside) & One-time Order */}
            <div className="w-full max-w-md">
              {heroFormMode === 'register' ? (
                /* Registration Form (Integrated inside Login) on mobile */
                <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-emerald-200/90 shadow-2xl relative z-20 animate-in fade-in zoom-in-95 duration-200 text-left">
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={logo || '/ghorer_shadh_logo.svg'} alt={appName} className="h-full w-full object-contain rounded-full bg-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">নতুন অ্যাকাউন্ট খুলুন</h3>
                        <p className="text-[11px] text-emerald-700 font-semibold">{appName} মেম্বার রেজিস্ট্রেশন</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('logo')}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="বন্ধ করুন"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Top Mode Toggle Tab: Login vs Register */}
                  <div className="flex rounded-xl bg-slate-100 p-1 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('login')}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800"
                    >
                      লগইন
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('register')}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-xs"
                    >
                      নতুন রেজিস্ট্রেশন
                    </button>
                  </div>

                  {regError && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="mt-2.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">পূর্ণ নাম (Full Name): *</label>
                  </div>

                  <form onSubmit={handleHeroRegisterSubmit} className="mt-1 space-y-2.5">
                    <div>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="আপনার পুরো নাম লিখুন"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">ইমেইল: *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="email"
                            required
                            placeholder="name@gmail.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">মোবাইল নম্বর: *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="tel"
                            required
                            placeholder="017XXXXXXXX"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">রুম নং / ঠিকানা: *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="রুম ২০৪, ২য় তলা"
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">স্টুডেন্ট আইডি:</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="2022-1-60-001"
                            value={regStudentId}
                            onChange={(e) => setRegStudentId(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm Password (4+ chars, must match) */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">পাসওয়ার্ড (৪+ অক্ষর): *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="password"
                            required
                            minLength={4}
                            placeholder="পাসওয়ার্ড লিখুন"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">কনফার্ম পাসওয়ার্ড: *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="password"
                            required
                            minLength={4}
                            placeholder="পুনরায় লিখুন"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {regLoading ? <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span> : <span>রেজিস্ট্রেশন সম্পন্ন করুন</span>}
                    </button>
                  </form>

                  <div className="mt-3 pt-2 text-center border-t border-slate-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('login')}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন
                    </button>
                  </div>
                </div>
              ) : heroFormMode === 'login' ? (
                /* Login Form (with Registration Tab Inside) on mobile */
                <div className="w-full bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-emerald-200/90 shadow-2xl relative z-20 animate-in fade-in zoom-in-95 duration-200 text-left">
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={logo || '/ghorer_shadh_logo.svg'} alt={appName} className="h-full w-full object-contain rounded-full bg-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">লগইন করুন</h3>
                        <p className="text-[11px] text-emerald-700 font-semibold">{appName} মেম্বার পোর্টাল</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('logo')}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="বন্ধ করুন"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Top Mode Toggle Tab: Login vs Register */}
                  <div className="flex rounded-xl bg-slate-100 p-1 mt-2.5">
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('login')}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-slate-900 shadow-xs"
                    >
                      লগইন
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('register')}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-500 hover:text-slate-800"
                    >
                      নতুন রেজিস্ট্রেশন
                    </button>
                  </div>

                  {loginError && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleHeroLoginSubmit} className="mt-3 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ইমেইল ঠিকানা:</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="name@gmail.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">পাসওয়ার্ড:</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          placeholder="পাসওয়ার্ড লিখুন"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loginLoading ? <span>লগইন হচ্ছে...</span> : <span>লগইন করুন</span>}
                    </button>
                  </form>

                  <div className="mt-3 pt-2 text-center border-t border-slate-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('register')}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      নতুন অ্যাকাউন্ট নেই? রেজিস্ট্রেশন করুন
                    </button>
                  </div>
                </div>
              ) : (
                /* 2 Harmonious, Beautifully Coordinated Buttons Below Logo */
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs sm:max-w-sm mx-auto px-1 animate-in fade-in zoom-in-95 duration-200">
                  {/* 1. Login Button (Registration integrated inside) */}
                  <button
                    type="button"
                    onClick={() => setHeroFormMode('login')}
                    className="py-2.5 px-3 rounded-2xl bg-[#0f3934] hover:bg-[#164e46] active:bg-[#0a2723] text-white font-black text-xs sm:text-sm shadow-md border border-emerald-700/50 text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="h-4 w-4 text-emerald-400" />
                    <span>লগইন</span>
                  </button>

                  {/* 2. One-time Order Button */}
                  <Link
                    to="/order"
                    className="py-2.5 px-3 rounded-2xl bg-white hover:bg-stone-50 active:bg-emerald-50 text-[#0f3934] font-black text-xs sm:text-sm shadow-xs border border-emerald-900/20 text-center transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <ShoppingBag className="h-4 w-4 text-emerald-700" />
                    <span>এককালীন অর্ডার</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Below 2nd Box: The rest of the writings (baki lheka gola) */}
            <div className="space-y-4 text-center max-w-xl mx-auto px-2">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs sm:text-sm font-bold shadow-xs">
                <span>{homeData.badge}</span>
              </div>

              {/* Big Headline */}
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight tracking-tight">
                {homeData.headline}
              </h1>

              {/* Paragraph */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                {homeData.paragraph}
              </p>

              {/* Checknote */}
              <p className="text-xs text-emerald-800 pt-1 font-semibold">
                ✓ প্রতিদিন টাটকা বাজার &nbsp; ✓ স্বাস্থ্যসম্মত রান্না &nbsp; ✓ সময়মতো ডেলিভারি
              </p>
            </div>
          </div>

          {/* ======================================================== */}
          {/* DESKTOP SCREEN LAYOUT (hidden lg:grid):                 */}
          {/* Left Column (col-span-7): Badge, Headline, Paragraph,    */}
          {/*   Dynamic Action Buttons (অ্যাকাউন্ট খুলুন / লগইন করুন),*/}
          {/*   Order Button, Quality Checknotes                      */}
          {/* Right Column (col-span-5): Logo or In-place Form        */}
          {/* ======================================================== */}
          <div className="hidden lg:grid grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="col-span-7 space-y-6 text-left">
              {/* Badge */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-800 text-xs sm:text-sm font-bold shadow-xs">
                <span>{homeData.badge}</span>
              </div>

              {/* Big Headline */}
              <h1 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">
                {homeData.headline}
              </h1>

              {/* Paragraph */}
              <p className="text-base text-slate-600 max-w-xl leading-relaxed font-normal">
                {homeData.paragraph}
              </p>

              {/* Action Buttons: Toggles dynamically between "অ্যাকাউন্ট খুলুন" and "লগইন করুন" */}
              <div className="pt-2 flex items-center gap-3.5">
                {heroFormMode === 'register' ? (
                  <button
                    type="button"
                    onClick={() => setHeroFormMode('login')}
                    className="px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg shadow-emerald-700/25 text-center transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>লগইন করুন</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHeroFormMode('register')}
                    className="px-8 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-lg shadow-emerald-700/25 text-center transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>অ্যাকাউন্ট খুলুন</span>
                  </button>
                )}

                <Link
                  to="/order"
                  className="px-8 py-3.5 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 text-slate-800 font-bold text-base text-center transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="h-4 w-4 text-emerald-600" />
                  <span>এককালীন অর্ডার</span>
                </Link>
              </div>

              {/* Checknote */}
              <p className="text-xs text-emerald-800 pt-1 font-semibold">
                ✓ প্রতিদিন টাটকা বাজার &nbsp; ✓ স্বাস্থ্যসম্মত রান্না &nbsp; ✓ সময়মতো ডেলিভারি
              </p>
            </div>

            {/* Right Column: Logo or Registration/Login Form */}
            <div className="col-span-5 flex justify-center items-center w-full">
              {heroFormMode === 'logo' ? (
                /* Circular Logo with Soft RGB Animation */
                <div className="relative flex items-center justify-center">
                  {/* Soft RGB Ambient Aura */}
                  <div className="absolute -inset-6 sm:-inset-8 rounded-full rgb-aura pointer-events-none opacity-85" />

                  {/* Soft RGB Halo Border Ring */}
                  <div className="absolute -inset-1 sm:-inset-1.5 rounded-full rgb-halo p-1" />

                  {/* Inner Main Circle Badge with white background directly beneath logo */}
                  <div
                    className="relative h-72 w-72 lg:h-80 lg:w-80 rounded-full bg-white border-4 border-emerald-400/40 shadow-2xl flex flex-col items-center justify-center p-3 text-center overflow-hidden z-10 cursor-pointer group"
                    onClick={() => setHeroFormMode('register')}
                    title="অ্যাকাউন্ট খুলতে ক্লিক করুন"
                  >
                    <img
                      src={logo || '/ghorer_shadh_logo.svg'}
                      alt={appName}
                      className="h-full w-full object-contain rounded-full bg-white group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              ) : heroFormMode === 'register' ? (
                /* In-place Registration Form replacing the logo box */
                <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-2xl relative z-20 animate-in fade-in zoom-in-95 duration-300 text-left">
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={logo || '/ghorer_shadh_logo.svg'} alt={appName} className="h-full w-full object-contain rounded-full bg-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">নতুন অ্যাকাউন্ট খুলুন</h3>
                        <p className="text-[11px] text-emerald-700 font-semibold">{appName} মেম্বার রেজিস্ট্রেশন</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('logo')}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="লোগোতে ফিরে যান"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {regError && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{regError}</span>
                    </div>
                  )}

                  <div className="mt-2.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">পূর্ণ নাম (Full Name): *</label>
                  </div>

                  <form onSubmit={handleHeroRegisterSubmit} className="mt-1 space-y-2.5">
                    <div>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="আপনার পুরো নাম লিখুন"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">ইমেইল: *</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="email"
                            required
                            placeholder="name@gmail.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">মোবাইল নম্বর: *</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="tel"
                            required
                            placeholder="017XXXXXXXX"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">রুম নং / ঠিকানা: *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            required
                            placeholder="রুম ২০৪, ২য় তলা"
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">স্টুডেন্ট আইডি:</label>
                        <div className="relative">
                          <GraduationCap className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="2022-1-60-001"
                            value={regStudentId}
                            onChange={(e) => setRegStudentId(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password & Confirm Password (4+ chars, must match) */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">পাসওয়ার্ড (৪+ অক্ষর): *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="password"
                            required
                            minLength={4}
                            placeholder="পাসওয়ার্ড লিখুন"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">কনফার্ম পাসওয়ার্ড: *</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="password"
                            required
                            minLength={4}
                            placeholder="পুনরায় লিখুন"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="w-full pl-9 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {regLoading ? <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span> : <span>রেজিস্ট্রেশন সম্পন্ন করুন</span>}
                    </button>
                  </form>

                  <div className="mt-3 pt-2 text-center border-t border-slate-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('login')}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন
                    </button>
                  </div>
                </div>
              ) : (
                /* In-place Login Form */
                <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-2xl relative z-20 animate-in fade-in zoom-in-95 duration-300 text-left">
                  <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-emerald-50 border border-emerald-200 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={logo || '/ghorer_shadh_logo.svg'} alt={appName} className="h-full w-full object-contain rounded-full bg-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-slate-900 leading-tight">লগইন করুন</h3>
                        <p className="text-[11px] text-emerald-700 font-semibold">{appName} মেম্বার ও এডমিন পোর্টাল</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('logo')}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="লোগোতে ফিরে যান"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {loginError && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handleHeroLoginSubmit} className="mt-3 space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">ইমেইল ঠিকানা:</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="name@gmail.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">পাসওয়ার্ড:</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          placeholder="পাসওয়ার্ড লিখুন"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-emerald-500 focus:bg-white outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loginLoading ? <span>লগইন হচ্ছে...</span> : <span>লগইন করুন</span>}
                    </button>
                  </form>

                  <div className="mt-3 pt-2 text-center border-t border-slate-100 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setHeroFormMode('register')}
                      className="text-emerald-700 font-bold hover:underline cursor-pointer"
                    >
                      নতুন অ্যাকাউন্ট খুলুন
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Story Section (Matching Screenshot 2) */}
      <section className="py-16 sm:py-20 bg-[#f4f1ea] border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-4">
              <h2 className="text-2xl sm:text-3xl font-black text-[#0f3934] tracking-tight">
                {homeData.storyTitle}
              </h2>
              <div className="h-1.5 w-16 bg-emerald-600 rounded-full mt-2.5" />
            </div>
            <div className="md:col-span-8">
              <p className="text-stone-700 leading-relaxed text-sm sm:text-base font-normal">
                {homeData.storyText}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Services Section (সার্ভিস) */}
      <section id="services" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-3xl font-black text-[#0f3934]">আমাদের সেবাসমূহ</h2>
          <p className="text-stone-600 text-sm mt-2">মেস মিল ও খাবার ব্যবস্থাপনার সহজ সমাধান</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-4">
              <Utensils className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">প্রতিদিনের মেস মিল</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              স্বচ্ছ ও নির্ভুল মিল ট্র্যাকিং। দুপুর ও রাতের মিল ১ ক্লিকেই অন/অফ করুন যেকোনো সময়।
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-4">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">এককালীন ক্যাটারিং অর্ডার</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              মেস সদস্য না হয়েও যেকোনো অনুষ্ঠানের জন্য স্বাস্থ্যসম্মত খাবার সরাসরি অর্ডার করুন।
            </p>
          </div>

          <div className="bg-white p-7 rounded-3xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold mb-4">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">স্বয়ংক্রিয় হিসাব ও ব্যালেন্স</h3>
            <p className="text-stone-600 text-sm leading-relaxed">
              মিল রেট, মোট খরচ, জমা ও বকেয়া তাৎক্ষণিক দেখুন। কোনো লুকানো চার্জ বা গরমিল নেই।
            </p>
          </div>
        </div>
      </section>

      {/* 5. Delivery Areas Section (আমরা যেসব এলাকায় ডেলিভারি দিই) - Matching Screenshot */}
      <section id="delivery-areas" className="py-16 sm:py-20 bg-[#f4f7f5] border-t border-stone-200 text-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-1 rounded-full bg-emerald-100/70 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-semibold mb-3 shadow-2xs">
            <span>ডেলিভারি এলাকা</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl font-black text-[#0f3934] tracking-tight mb-8">
            আমরা যেসব এলাকায় ডেলিভারি দিই
          </h2>

          {/* Delivery Area Pills matching user screenshot */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 max-w-4xl mx-auto">
            {DELIVERY_AREAS.map((area) => (
              <div
                key={area}
                className="inline-flex items-center gap-2 px-4 py-2 sm:py-2.5 rounded-full bg-white border border-amber-200/80 shadow-xs hover:shadow-sm hover:border-emerald-300 transition-all text-xs sm:text-sm font-semibold text-slate-800 cursor-default"
              >
                {/* Target / Bullseye pinpoint icon matching screenshot */}
                <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-emerald-700/80 flex items-center justify-center shrink-0">
                  <span className="h-1 w-1 rounded-full bg-emerald-700" />
                </span>
                <span>{area}</span>
              </div>
            ))}
          </div>

          {/* Inquiry / Contact Footer note */}
          <p className="mt-8 text-xs sm:text-sm text-stone-600">
            আপনার এলাকা তালিকায় নেই?{' '}
            <button
              type="button"
              onClick={() => scrollToSection('contact')}
              className="font-bold text-[#0f3934] underline hover:text-emerald-700 cursor-pointer"
            >
              আমাদের জানান
            </button>{' '}
            — আমরা চেষ্টা করব।
          </p>
        </div>
      </section>

      {/* 6. Menu Highlights (সাপ্তাহিক মেনুর নমুনা) */}
      <section id="menu" className="py-16 sm:py-20 bg-[#f4f1ea] border-y border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-[#0f3934]">সাপ্তাহিক মেনুর নমুনা</h2>
            <p className="text-stone-600 text-sm mt-2">প্রতিদিন পুষ্টিকর, টাটকা ও বৈচিত্র্যময় খাদ্যতালিকা</p>
          </div>

          {/* Table Container - Sleek Dark Aesthetic matching user screenshot */}
          <div className="bg-black text-white rounded-3xl border border-stone-800 shadow-2xl overflow-hidden">
            {/* Top Bar with Copy Button */}
            <div className="px-5 sm:px-7 py-3.5 bg-[#0d1513] border-b border-stone-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold text-stone-200 tracking-wide">
                  সাপ্তাহিক মিল চার্ট
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyWeeklyMenu}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-stone-200 transition-colors cursor-pointer border border-white/10 active:scale-95"
                title="মেনু কপি করুন"
              >
                {copiedMenu ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">কপি হয়েছে!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-stone-300" />
                    <span className="hidden xs:inline">কপি করুন</span>
                  </>
                )}
              </button>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[580px]">
                <thead>
                  <tr className="border-b border-stone-800 text-white font-bold bg-[#09110f]">
                    <th scope="col" className="py-4 px-5 sm:px-6 w-1/4 text-stone-100 font-extrabold text-sm sm:text-base">দিন</th>
                    <th scope="col" className="py-4 px-5 sm:px-6 w-3/8 text-stone-100 font-extrabold text-sm sm:text-base">দুপুরের খাবার</th>
                    <th scope="col" className="py-4 px-5 sm:px-6 w-3/8 text-stone-100 font-extrabold text-sm sm:text-base">রাতের খাবার</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800 font-normal">
                  {WEEKLY_MENU_ROUTINE.map((item, idx) => (
                    <tr
                      key={item.day}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        idx % 2 === 0 ? 'bg-black' : 'bg-[#080d0c]'
                      }`}
                    >
                      <td className="py-3.5 px-5 sm:px-6 font-bold text-white whitespace-nowrap text-xs sm:text-sm">
                        {item.day}
                      </td>
                      <td className="py-3.5 px-5 sm:px-6 text-stone-200 text-xs sm:text-sm leading-relaxed">
                        {item.lunch}
                      </td>
                      <td className="py-3.5 px-5 sm:px-6 text-stone-200 text-xs sm:text-sm leading-relaxed">
                        {item.dinner}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Special Notice Box Directly Underneath the Table as requested */}
            <div className="p-4 sm:p-5 bg-[#091210] border-t border-stone-800 flex items-center justify-center text-center">
              <p className="text-xs sm:text-sm font-bold text-emerald-300 leading-relaxed">
                মাসে ২ দিন গরুর মাংস আছে। ভিন্ন ধর্মাবলম্বীদের জন্য রয়েছে বিশেষ ব্যবস্থা
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Contact & Footer (যোগাযোগ) */}
      <footer id="contact" className="bg-[#0b2420] text-stone-300 pt-16 pb-12 border-t border-emerald-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 pb-12 border-b border-emerald-900/40">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-10 w-10 rounded-full bg-white p-0.5 shadow-xs flex items-center justify-center overflow-hidden shrink-0 border border-emerald-900/40">
                  <img
                    src={logo || '/ghorer_shadh_logo.svg'}
                    alt={appName}
                    className="h-full w-full object-contain rounded-full bg-white"
                  />
                </div>
                <span className="text-xl font-black text-white">{appName}</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                পরম যত্নে তৈরি ঘরোয়া খাবার এবং আধুনিক স্মার্ট মেস ম্যানেজমেন্ট সিস্টেম।
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-4">যোগাযোগের ঠিকানা</h4>
              <div className="space-y-2.5 text-xs text-stone-400">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{homeData.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{homeData.phone}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-sm mb-4">দ্রুত লিংক</h4>
              <div className="flex flex-col gap-2 text-xs text-stone-400">
                <Link to="/order" className="hover:text-emerald-300 transition-colors">
                  এককালীন ক্যাটারিং অর্ডার
                </Link>
                <Link to="/order/status" className="hover:text-emerald-300 transition-colors">
                  অর্ডারের বর্তমান অবস্থা জানুন
                </Link>
                <Link to="/login" className="hover:text-emerald-300 transition-colors">
                  মেম্বার ও এডমিন লগইন
                </Link>
                <Link to="/register" className="hover:text-emerald-300 transition-colors">
                  নতুন অ্যাকাউন্ট রেজিস্ট্রেশন
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-8 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span>© {new Date().getFullYear()} {appName}. সর্বস্বত্ব সংরক্ষিত।</span>
            <span>Built with care for smart mess and bachelor living.</span>
          </div>
        </div>
      </footer>

      {/* PWA Install Modal (Triggered from 1st Box in Navbar) */}
      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        onNativeInstall={promptInstall}
        onMarkInstalled={markAsInstalled}
        hasNativePrompt={Boolean(deferredPrompt)}
      />
    </div>
  );
};
