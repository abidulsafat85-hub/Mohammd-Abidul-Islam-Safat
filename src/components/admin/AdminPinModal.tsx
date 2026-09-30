import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, X, AlertCircle } from 'lucide-react';
import { ApiService } from '../../services/apiService';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPin?: string;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  correctPin = '1234',
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError('এডমিন পিন প্রবেশ করান');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First try server verification, fallback to client pin check
      try {
        const verified = await ApiService.verifyAdmin(pin.trim());
        if (verified) {
          setPin('');
          onSuccess();
          return;
        }
      } catch {
        // Fallback to local check
        if (pin.trim() === String(correctPin).trim()) {
          setPin('');
          onSuccess();
          return;
        }
      }

      setError('ভুল এডমিন পিন! ডিফল্ট পিন: 1234');
    } catch (err: any) {
      setError(err.message || 'ভুল এডমিন পিন!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-slate-900 border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
            <Lock className="h-7 w-7" />
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-900">এডমিন প্যানেলে প্রবেশ</h3>
            <p className="text-xs text-slate-500 mt-1">
              মেস ম্যানেজার বা এডমিন প্যানেলে যেতে ৪ ডিজিটের এডমিন পিন দিন
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={8}
              autoFocus
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              className="w-full text-center tracking-[0.5em] text-2xl font-black py-3.5 px-4 bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 focus:bg-white rounded-2xl outline-none transition-all"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-rose-600 flex items-center justify-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}
            <p className="text-[11px] text-center text-slate-400 mt-2">
              (ডিফল্ট এডমিন পিন: <strong>1234</strong>)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>যাচাই হচ্ছে...</span>
            ) : (
              <>
                <span>প্রবেশ করুন</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
