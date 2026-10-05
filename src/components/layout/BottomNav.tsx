import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  MoreHorizontal,
  Wallet,
  ShoppingBag,
  TrendingUp,
  Settings,
  X,
  MessageCircle,
  LogOut,
} from 'lucide-react';
import { MessSettings } from '../../types';

interface BottomNavProps {
  todayMealCount: number;
  memberCount?: number;
  newOrdersCount?: number;
  settings?: MessSettings;
  onLogout?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  todayMealCount,
  memberCount,
  newOrdersCount = 0,
  onLogout,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const location = useLocation();

  const mainItems: { to: string; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { to: '/admin/meals', label: 'Meal', icon: UtensilsCrossed, badge: todayMealCount > 0 ? `${todayMealCount}` : undefined },
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/deposits', label: 'Deposit', icon: Wallet },
    { to: '/admin/members', label: 'Members', icon: Users, badge: memberCount !== undefined ? `${memberCount}` : undefined },
  ];

  const moreItems: { to: string; label: string; desc: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    {
      to: '/admin/orders',
      label: 'Orders',
      desc: 'Catering & meal delivery orders',
      icon: ShoppingBag,
      badge: newOrdersCount > 0 ? `${newOrdersCount} New` : undefined,
    },
    { to: '/admin/whatsapp', label: 'WhatsApp Polls', desc: 'Auto daily poll, resolutions & cook dispatch', icon: MessageCircle },
    { to: '/admin/bazar', label: 'Bazar Expenses', desc: 'Daily groceries & shared expense logs', icon: TrendingUp },
    { to: '/admin/settings', label: 'Settings', desc: 'Mess name, rates, Excel import, backup', icon: Settings },
  ];

  const isMoreActive = ['/admin/orders', '/admin/whatsapp', '/admin/bazar', '/admin/settings'].some((p) =>
    location.pathname.startsWith(p)
  );

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-1 shadow-lg no-print">
        <div className="flex items-center justify-around">
          {mainItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setShowMoreMenu(false)}
                className={({ isActive }) =>
                  `relative flex flex-col items-center py-2 px-3 min-w-[64px] min-h-[48px] justify-center transition-colors rounded-xl ${
                    isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="relative">
                      <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                      {item.badge && (
                        <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] mt-1">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          {/* More button */}
          <button
            id="mobile-nav-more"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center py-2 px-3 min-w-[64px] min-h-[48px] justify-center transition-colors rounded-xl cursor-pointer ${
              isMoreActive || showMoreMenu ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className="relative">
              <MoreHorizontal className="h-5 w-5" />
              {newOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                  •
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* More Menu Drawer/Modal */}
      {showMoreMenu && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/50 backdrop-blur-xs">
          <div
            className="flex-1"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="bg-white rounded-t-3xl p-6 shadow-2xl border-t border-slate-100 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">অতিরিক্ত মেনু</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 pt-4 pb-6">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setShowMoreMenu(false)}
                    className={({ isActive }) =>
                      `flex items-start gap-4 p-3.5 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                      }`
                    }
                  >
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shrink-0">
                      <Icon className="h-5 w-5 text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </NavLink>
                );
              })}

              {/* Logout Option inside More Menu for Phone */}
              {onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onLogout();
                  }}
                  className="flex items-start gap-4 p-3.5 rounded-2xl border border-rose-100 bg-rose-50/50 hover:bg-rose-100/70 text-rose-700 transition-all text-left cursor-pointer mt-1"
                >
                  <div className="p-2.5 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                    <LogOut className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-rose-700">লগআউট (Logout)</span>
                    <p className="text-xs text-rose-500 mt-0.5">অ্যাকাউন্ট থেকে নিরাপদে বের হয়ে যান</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
