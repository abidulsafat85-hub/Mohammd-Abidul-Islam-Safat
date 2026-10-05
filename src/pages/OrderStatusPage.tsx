import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, AlertCircle, CheckCircle2, Clock, Truck, XCircle, ArrowLeft } from 'lucide-react';
import { useBranding } from '../hooks/useBranding';

export const OrderStatusPage: React.FC = () => {
  const { appName, logo } = useBranding();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      setError('অর্ডার নম্বর এবং ফোন নম্বর দুটিই লিখুন।');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(`/api/mess/orders/status?orderId=${encodeURIComponent(orderId.trim())}&phone=${encodeURIComponent(phone.trim())}`);
      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'অর্ডার পাওয়া যায়নি। নম্বর দুটি যাচাই করুন।');
      }
      setOrder(json.data);
    } catch (err: any) {
      setError(err.message || 'অর্ডারের তথ্য পাওয়া যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
            <Clock className="h-3.5 w-3.5" />
            <span>অপেক্ষমান (New / Reviewing)</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>নিশ্চিত করা হয়েছে (Confirmed)</span>
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <Truck className="h-3.5 w-3.5" />
            <span>ডেলিভারি সম্পন্ন (Delivered)</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
            <XCircle className="h-3.5 w-3.5" />
            <span>বাতিল (Cancelled)</span>
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-slate-800 font-sans pb-24 selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="bg-[#0f3934] text-white py-5 px-4 sm:px-8 border-b border-emerald-950 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-full bg-white p-0.5 border border-emerald-800 shadow-2xs flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={logo || '/ghorer_shadh_logo.svg'}
                alt={appName}
                className="h-full w-full object-contain rounded-full bg-white"
              />
            </div>
            <span className="text-xl font-black text-white">{appName}</span>
          </Link>
          <Link
            to="/order"
            className="text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>নতুন অর্ডার দিন</span>
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl font-black text-slate-900">অর্ডারের অবস্থা জানুন</h1>
            <p className="text-xs sm:text-sm text-stone-500">
              আপনার অর্ডারের সময় পাওয়া অর্ডার নম্বর ও ফোন নম্বর দিয়ে ট্র্যাক করুন।
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                অর্ডার নম্বর (Order ID)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ORD-123456-789"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm font-mono focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                অর্ডারকৃত মোবাইল নম্বর
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 017XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-[#0f3934] hover:bg-[#134e4a] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span>{loading ? 'অনুসন্ধান চলছে...' : 'অবস্থা দেখুন'}</span>
            </button>
          </form>

          {order && (
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="text-xs text-stone-500 font-bold">বর্তমান স্ট্যাটাস:</span>
                {getStatusBadge(order.status)}
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">অর্ডার নম্বর:</span>
                  <span className="font-mono font-bold">{order.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">ডেলিভারির তারিখ:</span>
                  <span className="font-semibold">{order.deliveryDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">সময় স্লট:</span>
                  <span>{order.deliveryTimeSlot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">মিল সংখ্যা:</span>
                  <span className="font-semibold">{order.portions} টি</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-stone-200 font-bold">
                  <span>চূড়ান্ত বিল:</span>
                  <span className="text-emerald-800 text-base">৳{order.finalPrice?.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
