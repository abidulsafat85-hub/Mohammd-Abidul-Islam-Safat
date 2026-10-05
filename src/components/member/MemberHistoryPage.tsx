import React, { useState, useEffect } from 'react';
import { Calendar, Utensils, RefreshCw, ShoppingBag, Clock } from 'lucide-react';
import { MemberNav } from './MemberNav';
import { AuthUser, MemberPortalData } from '../../types';
import { getCurrentMonthString, formatMonthBangla } from '../../utils/dateUtils';
import { useBranding } from '../../hooks/useBranding';

interface MemberHistoryPageProps {
  authUser: AuthUser | null;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const MemberHistoryPage: React.FC<MemberHistoryPageProps> = ({
  authUser,
  onLogout,
  isAdmin,
}) => {
  const { currency } = useBranding();
  const memberId = authUser?.memberId || authUser?.id || '';
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [portalData, setPortalData] = useState<MemberPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mess/member/${memberId}?month=${selectedMonth}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        setPortalData(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId, selectedMonth]);

  const meals = portalData?.meals || [];
  meals.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-16 font-sans">
      <MemberNav authUser={authUser} onLogout={onLogout} isAdmin={isAdmin} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              মাসের প্রতিদিনের লাঞ্চ ও ডিনারের সম্পূর্ণ বিবরণী
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none"
            />
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Meal Records Table */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              {formatMonthBangla(selectedMonth)} এর মিল রেকর্ড ({meals.length} দিন)
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              মোট মিল: {meals.reduce((sum, m) => sum + (Number(m.mealCount) || 0), 0)} টি
            </span>
          </div>

          {meals.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">এই মাসে কোনো মিলের রেকর্ড পাওয়া যায়নি।</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3 text-center">দুপুর (Lunch)</th>
                    <th className="py-2.5 px-3 text-center">রাত (Dinner)</th>
                    <th className="py-2.5 px-3 text-center">মিল সংখ্যা</th>
                    <th className="py-2.5 px-3">উৎস (Source)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {meals.map((m) => {
                    const isLunch = m.lunch ?? m.mealCount >= 1;
                    const isDinner = m.dinner ?? m.mealCount >= 2;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {m.date}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isLunch ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isLunch ? 'চালু (১)' : 'বন্ধ (০)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isDinner ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isDinner ? 'চালু (১)' : 'বন্ধ (০)'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center font-bold font-mono text-slate-900">
                          {m.mealCount}
                        </td>
                        <td className="py-3 px-3">
                          {m.source === 'admin' ? (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                              এডমিন পরিবর্তন
                            </span>
                          ) : m.source === 'default' ? (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                              অটো ডিফল্ট
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                              মেম্বার চয়েস
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
