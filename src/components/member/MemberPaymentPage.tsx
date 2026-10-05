import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Wallet,
  Calendar,
  Send,
  RefreshCw,
} from 'lucide-react';
import { MemberNav } from './MemberNav';
import { AuthUser, Deposit, PaymentMethod } from '../../types';
import { getBangladeshToday } from '../../utils/bangladeshTime';
import { useBranding } from '../../hooks/useBranding';

interface MemberPaymentPageProps {
  authUser: AuthUser | null;
  onLogout: () => void;
  isAdmin?: boolean;
}

export const MemberPaymentPage: React.FC<MemberPaymentPageProps> = ({
  authUser,
  onLogout,
  isAdmin,
}) => {
  const { currency } = useBranding();
  const memberId = authUser?.memberId || authUser?.id || '';

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [date, setDate] = useState(getBangladeshToday());
  const [note, setNote] = useState('');

  const loadDeposits = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mess/member/${memberId}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        setDeposits(json.data.deposits || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeposits();
  }, [memberId]);

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('টাকার পরিমাণ সঠিক দিন (০ এর বেশি হতে হবে)');
      return;
    }

    if (['bKash', 'Nagad', 'Rocket'].includes(paymentMethod) && (!transactionId || transactionId.trim().length < 4)) {
      setError('মোবাইল পেমেন্টের জন্য ট্রানজেকশন আইডি আবশ্যক (কমপক্ষে ৪ অক্ষর)');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/mess/deposits/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          memberId,
          amount: numAmount,
          paymentMethod,
          transactionId: transactionId.trim() || undefined,
          date,
          note: note.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'জমা রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে');
      }

      setSuccessMsg('জমা রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে! এডমিনের অনুমোদনের পর ব্যালেন্সে যোগ হবে।');
      setAmount('');
      setTransactionId('');
      setNote('');
      loadDeposits();
    } catch (err: any) {
      setError(err.message || 'রিকোয়েস্ট ব্যর্থ হয়েছে');
    } finally {
      setSubmitting(false);
    }
  };

  const approvedTotal = deposits
    .filter((d) => (d.status || 'approved') === 'approved')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  const pendingTotal = deposits
    .filter((d) => d.status === 'pending')
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-800 pb-16 font-sans">
      <MemberNav authUser={authUser} onLogout={onLogout} isAdmin={isAdmin} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Deposit Request Form Directly on Top */}
        <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-600" />
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">নতুন জমা রিকোয়েস্ট পাঠান</h1>
            </div>
            <button
              type="button"
              onClick={loadDeposits}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              title="তাজা তথ্য দেখতে রিফ্রেশ করুন"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitDeposit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">টাকার পরিমাণ (BDT): *</label>
              <input
                type="number"
                required
                min={1}
                placeholder="যেমন: ১৫০০"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পেমেন্ট মাধ্যম (Payment Method): *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none bg-white"
              >
                <option value="bKash">bKash (বিকাশ)</option>
                <option value="Nagad">Nagad (নগদ)</option>
                <option value="Rocket">Rocket (রকেট)</option>
                <option value="Bank">Bank (ব্যাংক)</option>
                <option value="Cash">Cash (ক্যাশ / নগদ)</option>
              </select>
            </div>

            {['bKash', 'Nagad', 'Rocket'].includes(paymentMethod) && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ট্রানজেকশন আইডি (Transaction ID): *
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: 9J382LK9"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none font-mono"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ (বাংলাদেশ সময়): *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              />
            </div>

            <div className={['bKash', 'Nagad', 'Rocket'].includes(paymentMethod) ? 'sm:col-span-2' : ''}>
              <label className="block text-xs font-bold text-slate-700 mb-1">নোট (ঐচ্ছিক):</label>
              <input
                type="text"
                placeholder="যেমন: অক্টোবর মাসের অগ্রিম জমা"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 outline-none"
              />
            </div>

            <div className="sm:col-span-2 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'পাঠানো হচ্ছে...' : 'রিকোয়েস্ট সাবমিট করুন'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Deposit History List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">আমার সকল জমা ও রিকোয়েস্ট তালিকা ({deposits.length})</h3>
          </div>

          {deposits.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">এখনো কোনো জমা বা রিকোয়েস্ট নেই।</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {deposits.map((d) => {
                const status = d.status || 'approved';
                return (
                  <div key={d.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-slate-900 font-mono">
                          {currency} {(Number(d.amount) || 0).toLocaleString()}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {d.paymentMethod}
                        </span>
                        {/* Status Badge */}
                        {status === 'approved' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>অনুমোদিত (Approved)</span>
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            <span>অপেক্ষমাণ (Pending)</span>
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="h-3 w-3" />
                            <span>প্রত্যাখ্যাত (Rejected)</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>তারিখ: {d.date}</span>
                        {d.transactionId && <span>TrxID: <span className="font-mono">{d.transactionId}</span></span>}
                        {d.note && <span>নোট: {d.note}</span>}
                      </div>

                      {status === 'rejected' && d.rejectionReason && (
                        <div className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
                          প্রত্যাখ্যানের কারণ: {d.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
