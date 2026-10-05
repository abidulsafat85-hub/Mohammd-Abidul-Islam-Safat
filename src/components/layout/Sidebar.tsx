import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  Wallet,
  FileSpreadsheet,
  Calendar,
  Settings,
  ShoppingBag,
  TrendingUp,
  MessageCircle,
  Share2,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { MessSettings, AuthUser } from '../../types';

export type NavTab =
  | 'dashboard'
  | 'meals'
  | 'members'
  | 'bazar'
  | 'deposits'
  | 'reports'
  | 'history'
  | 'whatsapp'
  | 'settings'
  | 'orders';

interface SidebarProps {
  settings: MessSettings;
  mealRate?: number;
  todayMealCount: number;
  memberCount?: number;
  newOrdersCount?: number;
  onOpenShareLinks?: () => void;
  onSwitchToMemberView?: () => void;
  authUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  settings,
  todayMealCount,
  memberCount,
  newOrdersCount = 0,
  onOpenShareLinks,
  onSwitchToMemberView,
  authUser,
  onLogout,
}) => {
  const navItems: { to: string; label: string; icon: React.FC<{ className?: string }>; badge?: string; badgeColor?: string }[] = [
    { to: '/admin/meals', label: 'Meal Entry', icon: UtensilsCrossed, badge: `${todayMealCount} today` },
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/members', label: 'Members', icon: Users, badge: memberCount !== undefined ? `${memberCount}` : undefined },
    { to: '/admin/deposits', label: 'Deposits', icon: Wallet },
    {
      to: '/admin/orders',
      label: 'Orders',
      icon: ShoppingBag,
      badge: newOrdersCount > 0 ? `${newOrdersCount} New` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { to: '/admin/whatsapp', label: 'WhatsApp Polls', icon: MessageCircle, badge: 'Auto' },
    { to: '/admin/bazar', label: 'Bazar Expenses', icon: TrendingUp },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-slate-200 bg-white shadow-xs select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
        <div className="h-11 w-11 rounded-full bg-white p-0.5 border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
          <img
            src={settings.logo || '/ghorer_shadh_logo.svg'}
            alt={settings.appName || 'ঘরের স্বাদ'}
            className="h-full w-full object-contain rounded-full bg-white"
          />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">
              {settings.appName || settings.messName || 'ঘরের স্বাদ'}
            </h1>
            <span className="text-[9px] font-black bg-slate-900 text-emerald-400 px-1.5 py-0.5 rounded-md">
              ADMIN
            </span>
          </div>
          <p className="text-xs font-medium text-emerald-600">{settings.subtitle || 'ঘরের স্বাদ'}</p>
        </div>
      </div>

      {/* Share Links Quick Action Bar */}
      {onOpenShareLinks && (
        <div className="px-3 pt-3">
          <button
            onClick={onOpenShareLinks}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-colors shadow-2xs cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-teal-600" />
            <span>মেম্বারদের লিংক শেয়ার</span>
          </button>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        item.badgeColor || (isActive ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-100 text-slate-600')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Switch to Member View button */}
      {onSwitchToMemberView && (
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={onSwitchToMemberView}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
          >
            <Users className="h-4 w-4 text-emerald-600" />
            <span>মেম্বার পোর্টাল দেখুন</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
        {authUser && (
          <div className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200/80">
            <div className="truncate">
              <span className="font-bold text-slate-900 block text-[11px] truncate">
                {authUser.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono block truncate">
                {authUser.email}
              </span>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                title="লগআউট"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 font-medium text-slate-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <span>Server Sync & Auto Backup</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">
          Version 2.0.0 • Multi-User Isolated
        </p>
      </div>
    </aside>
  );
};
