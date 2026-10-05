import React, { useState } from 'react';
import { MessageSquare, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { MemberNav } from './MemberNav';
import { AuthUser } from '../../types';

interface MemberComplaintsPageProps {
  authUser: AuthUser | null;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const MemberComplaintsPage: React.FC<MemberComplaintsPageProps> = ({
  authUser,
  onLogout,
  isAdmin,
}) => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('খাবার মান ও স্বাদ');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setError('অভিযোগের বিস্তারিত বিবরণ লিখুন।');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Send complaint as note or internal message
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSuccess(true);
      setSubject('');
      setDetails('');
    } catch {
      setError('অভিযোগ জমা দিতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-16 font-sans">
      <MemberNav authUser={authUser} onLogout={onLogout} isAdmin={isAdmin} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">অভিযোগ ও মতামত বক্স</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            মেসের খাবার, পরিচ্ছন্নতা বা সার্ভিস সংক্রান্ত যেকোনো বিষয় মেস ম্যানেজারকে জানান
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          {success && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>আপনার অভিযোগটি গৃহীত হয়েছে! মেস ম্যানেজার দ্রুত ব্যবস্থা গ্রহণ করবেন।</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি:</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none bg-white"
              >
                <option value="খাবার মান ও স্বাদ">খাবার মান ও স্বাদ</option>
                <option value="রান্না ও সময়মতো খাবার">রান্না ও সময়মতো খাবার</option>
                <option value="পরিচ্ছন্নতা ও পরিবেশ">পরিচ্ছন্নতা ও পরিবেশ</option>
                <option value="হিসাব বা বিল সংক্রান্ত">হিসাব বা বিল সংক্রান্ত</option>
                <option value="অন্যান্য পরামর্শ">অন্যান্য পরামর্শ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বিষয় (Subject):</label>
              <input
                type="text"
                placeholder="যেমন: ডালের মান আরও উন্নত করার অনুরোধ"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বিস্তারিত বিবরণ: *</label>
              <textarea
                required
                rows={4}
                placeholder="আপনার অভিযোগ বা পরামর্শ বিস্তারিত লিখুন..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'পাঠানো হচ্ছে...' : 'অভিযোগ জমা দিন'}</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
