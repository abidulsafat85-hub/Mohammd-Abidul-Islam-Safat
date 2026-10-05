import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { useBranding } from '../hooks/useBranding';

export const NotFoundPage: React.FC = () => {
  const { appName } = useBranding();

  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col items-center justify-center p-6 text-center text-slate-800 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl space-y-5">
        <div className="h-16 w-16 rounded-3xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900">৪০৪ - পেজ পাওয়া যায়নি</h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            আপনি যে পেজটি খুঁজছেন তা মুছে ফেলা হয়েছে বা ঠিকানাটি সঠিক নয়।
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0f3934] hover:bg-[#134e4a] text-white font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>হোম পেজে ফিরে যান</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
