import React from 'react';
import { Download, X, Smartphone, Globe, Check, Share2, PlusSquare } from 'lucide-react';
import { useBranding } from '../../hooks/useBranding';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNativeInstall?: () => void;
  onMarkInstalled?: () => void;
  hasNativePrompt?: boolean;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  onNativeInstall,
  onMarkInstalled,
  hasNativePrompt,
}) => {
  const { appName, logo } = useBranding();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-stone-200 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Top App Icon & Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-1">
          <div className="h-16 w-16 rounded-2xl bg-white p-1 border border-stone-200 shadow-md flex items-center justify-center overflow-hidden">
            <img
              src={logo || '/ghorer_shadh_logo.svg'}
              alt={appName}
              className="h-full w-full object-contain rounded-xl bg-white"
            />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">{appName} অ্যাপ ইনস্টল করুন</h3>
            <p className="text-xs text-slate-500 mt-1">
              এক ক্লিকে মোবাইল বা কম্পিউটারের হোমস্ক্রিনে অ্যাপের মতো সহজে ব্যবহার করুন
            </p>
          </div>
        </div>

        {/* Native 1-Click Install Button if supported */}
        {hasNativePrompt && onNativeInstall && (
          <div className="mt-5">
            <button
              onClick={() => {
                onNativeInstall();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>সরাসরি ইনস্টল করুন (Install Now)</span>
            </button>
          </div>
        )}

        {/* Device Guide */}
        <div className="mt-5 space-y-3.5">
          {/* Android Guide */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Android / Chrome ব্যবহারকারীদের জন্য:</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px] pl-6">
              ব্রাউজারের ওপরের ডানপাশের <span className="font-bold">তিন ডট (⋮)</span> মেনুতে চাপ দিন এবং <span className="font-bold text-emerald-800">'Install app'</span> বা <span className="font-bold text-emerald-800">'Add to Home screen'</span> সিলেক্ট করুন।
            </p>
          </div>

          {/* iPhone / iOS Guide */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Share2 className="h-4 w-4 text-blue-600 shrink-0" />
              <span>iPhone / Safari ব্যবহারকারীদের জন্য:</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px] pl-6">
              সাফারি ব্রাউজারের নিচে <span className="font-bold text-blue-600">Share (<Share2 className="inline h-3 w-3" />)</span> বাটনে চাপ দিন, এরপর নিচে স্ক্রল করে <span className="font-bold text-slate-900">'Add to Home Screen' (<PlusSquare className="inline h-3 w-3" />)</span> সিলেক্ট করুন।
            </p>
          </div>

          {/* Desktop Guide */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-950 flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-[11px]">
              কম্পিউটারে ক্রোম ব্রাউজারের অ্যাড্রেস বারের ডানে <span className="font-bold">ইনস্টল আইকনে</span> ক্লিক করুন।
            </span>
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-around text-[11px] text-slate-500 font-semibold">
          <div className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>দ্রুত ওপেন</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>কোনো ডাউনলোড চার্জ নেই</span>
          </div>
          <div className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5 text-emerald-600" />
            <span>অফলাইন সুবিধা</span>
          </div>
        </div>

        {onMarkInstalled && (
          <div className="mt-3 pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                onMarkInstalled();
                onClose();
              }}
              className="text-xs text-stone-500 hover:text-emerald-700 underline font-medium cursor-pointer"
            >
              ইতিমধ্যে ইনস্টল করেছি
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
