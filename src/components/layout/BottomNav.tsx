import React, { useState } from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  MoreHorizontal,
  Wallet,
  FileSpreadsheet,
  Calendar,
  Settings,
  X,
  MessageCircle,
} from 'lucide-react';
import { MessSettings } from '../../types';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  todayMealCount: number;
  memberCount?: number;
  settings?: MessSettings;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  todayMealCount,
  memberCount,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'meals', label: 'Meal', icon: UtensilsCrossed, badge: todayMealCount > 0 ? `${todayMealCount}` : undefined },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deposits', label: 'Deposit', icon: Wallet },
    { id: 'members', label: 'Members', icon: Users, badge: memberCount !== undefined ? `${memberCount}` : undefined },
  ];

  const moreItems: { id: NavTab; label: string; desc: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'whatsapp', label: 'WhatsApp Polls', desc: 'Auto daily poll, resolutions & cook dispatch', icon: MessageCircle },
    { id: 'reports', label: 'Monthly Report', desc: 'Summary sheet, balances, Excel export', icon: FileSpreadsheet },
    { id: 'calendar', label: 'Daily History', desc: 'Past meal logs & daily records', icon: Calendar },
    { id: 'settings', label: 'Settings', desc: 'Mess name, rates, Excel import, backup', icon: Settings },
  ];

  const isMoreActive = ['whatsapp', 'reports', 'calendar', 'settings'].includes(currentTab);

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-1 shadow-lg no-print">
        <div className="flex items-center justify-around">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id && !showMoreMenu;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => {
                  setShowMoreMenu(false);
                  onSelectTab(item.id);
                }}
                className={`relative flex flex-col items-center py-2 px-3 min-w-[64px] min-h-[48px] justify-center transition-colors rounded-xl ${
                  isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1">{item.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            id="mobile-nav-more"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center py-2 px-3 min-w-[64px] min-h-[48px] justify-center transition-colors rounded-xl ${
              isMoreActive || showMoreMenu ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
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
              <h3 className="font-bold text-slate-900 text-lg">Additional Modules</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-4">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`more-menu-item-${item.id}`}
                    onClick={() => {
                      onSelectTab(item.id);
                      setShowMoreMenu(false);
                    }}
                    className={`flex items-center gap-3.5 p-3.5 rounded-2xl text-left transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-xl ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
