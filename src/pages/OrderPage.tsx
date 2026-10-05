import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Phone,
  ArrowRight,
  Calendar,
  UtensilsCrossed,
  ArrowLeft,
} from 'lucide-react';
import { useBranding } from '../hooks/useBranding';
import { getBangladeshTomorrow, getBangladeshToday } from '../utils/bangladeshTime';

export const OrderPage: React.FC = () => {
  const { appName, logo } = useBranding();

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryArea, setDeliveryArea] = useState('মিরপুর');
  const [mealType, setMealType] = useState<'lunch' | 'dinner' | 'both'>('lunch');
  const [deliveryDate, setDeliveryDate] = useState(getBangladeshTomorrow());
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState('দুপুর ১:০০ - ১:৩০');
  const [portions, setPortions] = useState(5);
  const [menuChoice, setMenuChoice] = useState('ভাত, মুরগি ভুনা, সবজি ও ডাল');
  const [note, setNote] = useState('');
  const [honeypot, setHoneypot] = useState(''); // Anti-spam hidden field

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<any | null>(null);

  // Configuration from server
  const [settings, setSettings] = useState<{
    orderAreas?: string[];
    bkashNagadNumber?: string;
  }>({
    orderAreas: ['মিরপুর', 'উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মোহাম্মদপুর', 'অন্যান্য'],
    bkashNagadNumber: '০১৭১২৩৪৫৬৭৮',
  });

  useEffect(() => {
    fetch('/api/mess/home-content')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.settings) {
          setSettings((prev) => ({ ...prev, ...res.settings }));
        }
      })
      .catch(() => {});
  }, []);

  // Price estimate (e.g. 120 BDT per portion)
  const pricePerPortion = mealType === 'both' ? 220 : 120;
  const estimatedPrice = portions * pricePerPortion;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (honeypot) {
      return; // Bot detected
    }

    if (!customerName.trim() || !phone.trim() || !deliveryAddress.trim()) {
      setError('দয়া করে আপনার নাম, মোবাইল নম্বর এবং সম্পূর্ণ ঠিকানা লিখুন।');
      return;
    }

    if (!/^(\+?880|0)?1[3-9]\d{8}$/.test(phone.trim())) {
      setError('সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নম্বর দিন (০১৭XXXXXXXX)।');
      return;
    }

    if (deliveryDate <= getBangladeshToday()) {
      setError('ডেলিভারির তারিখ অবশ্যই আগামীকালের অথবা ভবিষ্যতের হতে হবে।');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/mess/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone,
          deliveryAddress,
          deliveryArea,
          mealType,
          deliveryDate,
          deliveryTimeSlot,
          portions: Number(portions),
          menuChoice,
          estimatedPrice,
          note,
          honeypot,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || 'অর্ডার সাবমিট করা যায়নি।');
      }

      setSuccessOrder(json.data);
    } catch (err: any) {
      setError(err.message || 'অর্ডার করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-slate-800 font-sans pb-24 selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="bg-[#0f3934] text-white py-5 px-4 sm:px-8 border-b border-emerald-950 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
            to="/order/status"
            className="text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <span>অর্ডারের অবস্থা দেখুন</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">
        {successOrder ? (
          // Success Screen
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-xl text-center space-y-6">
            <div className="h-16 w-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">অর্ডার সফলভাবে গ্রহণ করা হয়েছে!</h2>
              <p className="text-sm text-stone-600">
                ধন্যবাদ! খুব শীঘ্রই আমাদের প্রতিনিধি আপনার নম্বরে ফোন করে অর্ডারটি চূড়ান্ত নিশ্চিত করবেন।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 inline-block text-left space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-6 pb-2 border-b border-stone-200 font-bold">
                <span className="text-stone-500">অর্ডার নম্বর:</span>
                <span className="text-emerald-800 text-base font-black font-mono">{successOrder.orderId}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-stone-500">ডেলিভারির তারিখ:</span>
                <span className="font-semibold">{successOrder.deliveryDate}</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-stone-500">মিল সংখ্যা:</span>
                <span className="font-semibold">{successOrder.portions} টি</span>
              </div>
              <div className="flex items-center justify-between gap-6">
                <span className="text-stone-500">আনুমানিক বিল:</span>
                <span className="font-bold text-slate-900">৳{successOrder.estimatedPrice?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/order/status"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0f3934] hover:bg-[#134e4a] text-white font-bold text-sm text-center shadow-md transition-all"
              >
                অর্ডার ট্র্যাক করুন
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm text-center transition-all"
              >
                হোম পেজে ফিরুন
              </Link>
            </div>
          </div>
        ) : (
          // Order Form
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200/90 shadow-xl space-y-8">
            <div>
              <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">
                <ShoppingBag className="h-4 w-4" />
                <span>এককালীন ক্যাটারিং অর্ডার</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ঘরোয়া খাবারের অর্ডার দিন
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                মেস সদস্য না হয়েও সরাসরি ফ্রেশ ও স্বাস্থ্যসম্মত খাবারের অর্ডার করুন।
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot field (hidden from real users, tricks spam bots) */}
              <input
                type="text"
                name="honeypot"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Section 1: Customer Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-stone-100">
                  ১. যোগাযোগের তথ্য
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      আপনার পূর্ণ নাম <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. আবরার হাসান"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      মোবাইল নম্বর <span className="text-rose-500">*</span>
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
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    সম্পূর্ণ ডেলিভারি ঠিকানা <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={2}
                    placeholder="বাড়ি নং, রোড নং, ফ্ল্যাট, এলাকা ইত্যাদি বিস্তারিত লিখুন"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ডেলিভারি এলাকা <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={deliveryArea}
                    onChange={(e) => setDeliveryArea(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white cursor-pointer"
                  >
                    {(settings.orderAreas || ['মিরপুর', 'উত্তরা', 'ধানমন্ডি', 'গুলশান', 'বনানী', 'মোহাম্মদপুর']).map(
                      (area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      )
                    )}
                    <option value="অন্যান্য">অন্যান্য (অতিরিক্ত চার্জ প্রযোজ্য হতে পারে)</option>
                  </select>
                  {deliveryArea === 'অন্যান্য' && (
                    <p className="text-[11px] text-amber-700 mt-1 font-medium">
                      ⚠️ আপনার এলাকা ডেলিভারি জোনের বাইরে হলে দূরত্ব অনুযায়ী ডেলিভারি ফি বাড়তে পারে।
                    </p>
                  )}
                </div>
              </div>

              {/* Section 2: Meal Details */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-stone-100">
                  ২. খাবারের বিবরণ ও সময়সূচী
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      খাবারের ধরন <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'lunch', label: 'লাঞ্চ' },
                        { id: 'dinner', label: 'ডিনার' },
                        { id: 'both', label: 'উভয়' },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setMealType(type.id as any)}
                          className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            mealType === type.id
                              ? 'bg-[#134e4a] text-white border-[#134e4a] shadow-xs'
                              : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      ডেলিভারির তারিখ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      min={getBangladeshTomorrow()}
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      সম্ভাব্য সময় স্লট
                    </label>
                    <select
                      value={deliveryTimeSlot}
                      onChange={(e) => setDeliveryTimeSlot(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none bg-white cursor-pointer"
                    >
                      <option value="দুপুর ১:০০ - ১:৩০">দুপুর ১:০০ - ১:৩০ (লাঞ্চ)</option>
                      <option value="দুপুর ১:৩০ - ২:০০">দুপুর ১:৩০ - ২:০০ (লাঞ্চ)</option>
                      <option value="রাত ৮:০০ - ৮:৩০">রাত ৮:০০ - ৮:৩০ (ডিনার)</option>
                      <option value="রাত ৮:৩০ - ৯:০০">রাত ৮:৩০ - ৯:০০ (ডিনার)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      মিল সংখ্যা (Portions) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={portions}
                      onChange={(e) => setPortions(Math.max(1, Number(e.target.value)))}
                      className="w-full px-4 py-2.5 rounded-xl border border-stone-300 text-sm font-bold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    পছন্দের মেনু আইটেম
                  </label>
                  <input
                    type="text"
                    value={menuChoice}
                    onChange={(e) => setMenuChoice(e.target.value)}
                    placeholder="e.g. ভাত, চিকেন ভুনা, ডাল, সালাদ"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    বিশেষ কোনো নির্দেশনা (Optional)
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. ঝাল কম হবে, পার্সেল আলাদা হবে ইত্যাদি"
                    className="w-full px-4 py-3 rounded-xl border border-stone-300 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                  />
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm space-y-2">
                <div className="flex items-center justify-between font-bold text-emerald-950">
                  <span>আনুমানিক মোট বিল:</span>
                  <span className="text-lg font-black text-emerald-800">
                    ৳{estimatedPrice.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/80 leading-relaxed font-normal">
                  * চূড়ান্ত মূল্য এবং ডেলিভারি চার্জ অর্ডার গ্রহণের পর অ্যাডমিন ফোন করে নিশ্চিত করবেন।
                  মূল্য ক্যাশ অন ডেলিভারি অথবা বিকাশ/নগদে (
                  <span className="font-bold">{settings.bkashNagadNumber}</span>) পরিশোধ করা যাবে।
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-[#0f3934] hover:bg-[#134e4a] text-white font-black text-base shadow-lg shadow-emerald-950/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>প্রসেস হচ্ছে...</span>
                ) : (
                  <>
                    <span>অর্ডার কনফার্ম করুন</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
