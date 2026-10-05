import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Calendar,
  Phone,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const OrdersView: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mess/admin/orders', { credentials: 'include' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setOrders(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/mess/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePriceAndNote = async (id: string) => {
    try {
      const res = await fetch(`/api/mess/admin/orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ finalPrice: editPrice, internalNote: editNote }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, finalPrice: editPrice, internalNote: editNote } : o))
        );
        setEditingOrderId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const exportOrdersExcel = () => {
    const rows = orders.map((o) => ({
      'Order ID': o.id,
      Customer: o.customerName,
      Phone: o.phone,
      Address: o.deliveryAddress,
      Area: o.deliveryArea,
      'Meal Type': o.mealType,
      'Delivery Date': o.deliveryDate,
      'Time Slot': o.deliveryTimeSlot,
      Portions: o.portions,
      'Estimated Price': o.estimatedPrice,
      'Final Price': o.finalPrice,
      Status: o.status,
      Note: o.note || '',
      'Internal Note': o.internalNote || '',
      'Ordered At': o.createdAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `Catering_Orders_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.customerName?.toLowerCase().includes(q) ||
        o.phone?.includes(q) ||
        o.id?.toLowerCase().includes(q) ||
        o.deliveryArea?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900">ক্যাটারিং ও স্পেশাল অর্ডার</h1>
            {newOrdersCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-xs animate-pulse">
                {newOrdersCount} নতুন অর্ডার
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            পাবলিক পেজ থেকে আসা এককালীন খাবারের অর্ডার পরিচালনা করুন
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchOrders}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>রিফ্রেশ</span>
          </button>
          <button
            onClick={exportOrdersExcel}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Excel এক্সপোর্ট</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="নাম, ফোন বা অর্ডার নম্বর খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'সব অর্ডার' },
            { id: 'new', label: 'নতুন (New)' },
            { id: 'confirmed', label: 'নিশ্চিত' },
            { id: 'delivered', label: 'ডেলিভার্ড' },
            { id: 'cancelled', label: 'বাতিল' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Cards */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
            <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-base">কোনো অর্ডার পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400">নতুন কোনো অর্ডার আসলে এখানে প্রদর্শিত হবে।</p>
          </div>
        ) : (
          filteredOrders.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all space-y-4"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-black text-slate-900">{o.id}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600">
                    {new Date(o.createdAt).toLocaleDateString('bn-BD')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-bold">স্ট্যাটাস:</span>
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none cursor-pointer"
                  >
                    <option value="new">🟡 নতুন (New)</option>
                    <option value="confirmed">🔵 নিশ্চিত (Confirmed)</option>
                    <option value="delivered">🟢 ডেলিভার্ড (Delivered)</option>
                    <option value="cancelled">🔴 বাতিল (Cancelled)</option>
                  </select>
                </div>
              </div>

              {/* Customer details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-slate-400 text-xs font-medium block">গ্রাহকের নাম:</span>
                  <span className="font-bold text-slate-900">{o.customerName}</span>
                  <div className="mt-1">
                    <a
                      href={`tel:${o.phone}`}
                      className="inline-flex items-center gap-1.5 text-emerald-700 font-bold hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>{o.phone}</span>
                    </a>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 text-xs font-medium block">ডেলিভারির তারিখ ও সময়:</span>
                  <span className="font-bold text-slate-900">{o.deliveryDate}</span>
                  <span className="text-slate-500 block text-xs">{o.deliveryTimeSlot}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-xs font-medium block">মিল সংখ্যা ও এলাকা:</span>
                  <span className="font-bold text-slate-900">{o.portions} টি মিল ({o.mealType === 'both' ? 'উভয়' : o.mealType})</span>
                  <span className="text-slate-500 block text-xs">{o.deliveryArea} - {o.deliveryAddress}</span>
                </div>
              </div>

              {/* Price & Notes */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-700">মেনু চয়েস: </span>
                  <span className="text-xs text-slate-600">{o.menuChoice || 'সাধারণ মেনু'}</span>
                  {o.note && (
                    <div className="text-xs text-amber-800 mt-0.5">
                      <span className="font-bold">গ্রাহকের নোট: </span>
                      <span>{o.note}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block text-right font-medium">চূড়ান্ত বিল:</span>
                    <span className="text-base font-black text-emerald-800">৳{o.finalPrice?.toLocaleString('en-IN')}</span>
                  </div>

                  <button
                    onClick={() => {
                      setEditingOrderId(o.id);
                      setEditPrice(o.finalPrice || o.estimatedPrice);
                      setEditNote(o.internalNote || '');
                    }}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                    title="মূল্য ও অভ্যন্তরীণ নোট এডিট করুন"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Editing Box */}
              {editingOrderId === o.id && (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">চূড়ান্ত মূল্য (৳):</label>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">এডমিন নোট (Internal):</label>
                      <input
                        type="text"
                        placeholder="e.g. ৫০০ টাকা অ্যাডভান্স নিয়েছে"
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingOrderId(null)}
                      className="px-3 py-1 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      বাতিল
                    </button>
                    <button
                      onClick={() => handleSavePriceAndNote(o.id)}
                      className="px-4 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>সেভ করুন</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
