import React, { useState } from 'react';
import { Lock, CheckCircle2, ArrowRight, Eye, EyeOff, LogOut, ArrowLeft } from 'lucide-react';
import { ApiService } from '../../services/apiService';
import { AuthUser } from '../../types';

interface AdminForcePasswordChangeProps {
  authUser: AuthUser;
  onPasswordChanged: (updatedUser: AuthUser) => void;
  onLogout: () => void;
  onDismiss?: () => void;
}

export const AdminForcePasswordChange: React.FC<AdminForcePasswordChangeProps> = ({
  authUser,
  onPasswordChanged,
  onLogout,
  onDismiss,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanNew.length < 8) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে (At least 8 characters required)');
      return;
    }

    if (cleanNew === '12345') {
      setError("পাসওয়ার্ড '12345' হওয়া যাবে না। একটি শক্তিশালী পাসওয়ার্ড দিন।");
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setError('দুই পাসওয়ার্ড মিলছে না! পুনরায় চেক করুন (Passwords do not match)');
      return;
    }

    setLoading(true);
    try {
      const res = await ApiService.adminFirstChangePassword(cleanNew);
      if (res.success) {
        const updatedUser: AuthUser = {
          ...authUser,
          mustChangePassword: false,
        };
        onPasswordChanged(updatedUser);
      } else {
        setError(res.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে');
      }
    } catch (err: any) {
      setError(err?.message || 'পাসওয়ার্ড পরিবর্তনে ত্রুটি হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-rose-100 relative">
        {/* Top Header */}
        <div className="flex flex-col items-center text-center space-y-2 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-200 mb-1">
            <Lock className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-black text-slate-900">এডমিন পাসওয়ার্ড পরিবর্তন</h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
            নিরাপত্তার স্বার্থে এডমিন অ্যাকাউন্টের জন্য একটি শক্তিশালী পাসওয়ার্ড সেট করুন।
          </p>
        </div>

        {/* Requirements Box */}
        <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1.5 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${newPassword.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>কমপক্ষে ৮ অক্ষরের দৈর্ঘ্য (At least 8 characters)</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${newPassword && newPassword !== '12345' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>ডিফল্ট পাসওয়ার্ড ('12345') হওয়া যাবে না</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${newPassword && newPassword === confirmPassword ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>কনফার্ম পাসওয়ার্ডের সাথে হুবহু মিল</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              নতুন পাসওয়ার্ড (New Password): <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="কমপক্ষে ৮ অক্ষর লিখুন"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              পাসওয়ার্ড নিশ্চিত করুন (Confirm New Password): <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                placeholder="পাসওয়ার্ড পুনরায় লিখুন"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-900 outline-none transition-all font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl text-white font-bold text-sm bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>সংরক্ষণ করা হচ্ছে...</span>
            ) : (
              <>
                <span>পাসওয়ার্ড পরিবর্তন করুন</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2.5 px-4 rounded-xl text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>পরে পরিবর্তন করব (ড্যাশবোর্ডে যান)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 text-center text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>লগআউট করে বের হয়ে যান</span>
          </button>
        </form>
      </div>
    </div>
  );
};
