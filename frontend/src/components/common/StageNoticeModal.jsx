import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, X, ArrowRight } from 'lucide-react';

export default function StageNoticeModal({ isOpen, onClose }) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Stage 2 Active</h3>
              <p className="text-xs text-slate-500">UI/UX Shell & Multilingual Foundation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          The multilingual landing page, language selector (English, ಕನ್ನಡ, हिन्दी), and responsive layout are fully working in <strong>Stage 2</strong>.
        </p>
        <p className="text-sm text-slate-600 leading-relaxed bg-brand-50/50 p-3 rounded-xl border border-brand-100">
          <strong>Next Step (Stage 3):</strong> User registration, secure login, dashboard, and private encrypted document uploads.
        </p>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-xs"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
