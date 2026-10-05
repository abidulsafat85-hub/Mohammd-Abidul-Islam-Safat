import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { useBranding } from '../../hooks/useBranding';
import { AuthUser, MemberPortalData } from '../../types';
import { UpcomingMealCards } from './UpcomingMealCards';
import { MemberNav } from './MemberNav';

interface MemberMealPageProps {
  authUser: AuthUser | null;
  onLogout: () => void;
}

export const MemberMealPage: React.FC<MemberMealPageProps> = ({ authUser, onLogout }) => {
  const navigate = useNavigate();
  const { appName } = useBranding();
  const [portalData, setPortalData] = useState<MemberPortalData | null>(null);
  const [loading, setLoading] = useState(true);

  const memberId = authUser?.memberId || authUser?.id || '';

  const loadMemberData = async () => {
    if (!memberId) return;
    try {
      const res = await fetch(`/api/mess/member/${memberId}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPortalData(json.data);
      }
    } catch {
      // offline / cache
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemberData();
  }, [memberId]);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-16 font-sans">
      {/* Top Header & Navigation */}
      <MemberNav authUser={authUser} onLogout={onLogout} />

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Title & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            মিল অন/অফ করুন
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal">
            প্রতিদিন রাত ১১:৫৯ (বাংলাদেশ সময়) এর মধ্যে পরদিনের মিল পরিবর্তন করা যাবে। এরপর সেই দিনের মিল লক হয়ে যাবে।
          </p>
        </div>

        {/* 7-Day Window Upcoming Meal Cards with Today (locked) */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 font-bold text-sm">তথ্য লোড হচ্ছে...</div>
        ) : (
          <UpcomingMealCards
            memberId={memberId}
            meals={portalData?.meals || []}
            showToday={true}
            onMealUpdated={loadMemberData}
          />
        )}
      </main>
    </div>
  );
};
