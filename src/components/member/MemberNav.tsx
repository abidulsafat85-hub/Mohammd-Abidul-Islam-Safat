import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  LayoutDashboard,
  CreditCard,
  MessageSquare,
  User,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { useBranding } from '../../hooks/useBranding';
import { AuthUser } from '../../types';
import { MemberBottomNav } from './MemberBottomNav';

interface MemberNavProps {
  authUser: AuthUser | null;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const MemberNav: React.FC<MemberNavProps> = ({ authUser, onLogout, isAdmin }) => {
  const navigate = useNavigate();
  const { appName, logo } = useBranding();

  const links = [
    { to: '/member/home', label: 'মিল এন্ট্রি', icon: UtensilsCrossed },
    { to: '/member/history', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/member/payment', label: 'পেমেন্ট ও জমা', icon: CreditCard },
    { to: '/member/complaints', label: 'অভিযোগ', icon: MessageSquare },
    { to: '/member/profile', label: 'প্রোফাইল', icon: User },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-3">
            {/* Logo & Brand */}
            <NavLink to="/member/home" className="flex items-center gap-2.5 min-w-0">
              <div className="h-10 w-10 rounded-full bg-white p-0.5 border border-slate-200/80 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={logo || '/ghorer_shadh_logo.svg'}
                  alt={appName}
                  className="h-full w-full object-contain rounded-full bg-white"
                />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black text-slate-900 tracking-tight truncate">{appName}</span>
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                    MEMBER
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{authUser?.name || (authUser as any)?.fullName || 'মেম্বার'}</p>
              </div>
            </NavLink>

            {/* Right Action buttons: Admin return (if admin) & Logout */}
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin/dashboard')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-amber-700" />
                  <span>এডমিন প্যানেলে ফিরুন</span>
                </button>
              )}

              <button
                onClick={onLogout}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                title="লগআউট"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">লগআউট</span>
              </button>
            </div>
          </div>

          {/* Member Navigation Tabs: Hidden on mobile (bottom nav is used), visible on desktop */}
          <nav className="hidden md:flex items-center gap-1 overflow-x-auto py-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none border-t border-slate-100">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Fixed Soft RGB Animated Bottom Navigation Bar on Mobile Phone */}
      <MemberBottomNav />
    </>
  );
};
