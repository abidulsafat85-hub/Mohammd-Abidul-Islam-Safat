import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { UtensilsCrossed, LayoutDashboard, CreditCard, User } from 'lucide-react';

export const MemberBottomNav: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { to: '/member/home', label: 'মিল এন্ট্রি', icon: UtensilsCrossed },
    { to: '/member/history', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/member/payment', label: 'পেমেন্ট', icon: CreditCard },
    { to: '/member/profile', label: 'প্রোফাইল', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/70 shadow-lg no-print">
      {/* Internal Animated Soft RGB Line (Inside the box, no outer bleeding) */}
      <div className="rgb-nav-border h-[2.5px] w-full" />

      {/* Internal Navigation Items Bar */}
      <div className="max-w-md mx-auto px-2 pt-1.5 pb-2.5 sm:pb-3 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.to ||
            (item.to === '/member/home' && (location.pathname === '/member' || location.pathname === '/member/'));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 min-w-[64px] rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-emerald-700 font-black'
                  : 'text-slate-500 hover:text-slate-800 font-semibold'
              }`}
            >
              {/* Active Indicator background pill inside the bar */}
              {isActive && (
                <div className="absolute inset-0 bg-emerald-50/90 rounded-xl -z-10 border border-emerald-200/60 shadow-2xs" />
              )}

              <Icon
                className={`h-5 w-5 transition-transform duration-150 ${
                  isActive ? 'scale-110 text-emerald-600 stroke-[2.5]' : 'stroke-2'
                }`}
              />
              <span className="text-[11px] mt-0.5 tracking-tight leading-tight">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
