import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  Sparkles,
  Lock,
  X,
  Languages,
  CheckCircle2,
} from 'lucide-react';

export default function ConsentModal({
  isOpen,
  onClose,
  onConsentGiven,
  currentLanguage = 'en',
  isGenerating = false,
}) {
  const { t } = useTranslation();
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!consentChecked) return;
    onConsentGiven(selectedLanguage);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 transition-all">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 flex-shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('explanation.consentModalTitle')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Privacy-first informed consent
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Disclosure notice */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <p className="leading-relaxed">
              {t('explanation.consentModalBody')}
            </p>
            <div className="pt-2 border-t border-slate-200 flex items-start gap-2 text-slate-500">
              <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{t('explanation.consentModalPrivacy')}</span>
            </div>
          </div>

          {/* Language selector for explanation */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-brand-600" />
              {t('explanation.changeLanguage')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'en', label: 'English' },
                { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
                { code: 'hi', label: 'हिन्दी (Hindi)' },
              ].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                    selectedLanguage === lang.code
                      ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mandatory Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-brand-200 bg-brand-50/40 cursor-pointer hover:bg-brand-50/70 transition">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              disabled={isGenerating}
              className="mt-0.5 w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-800 leading-relaxed">
              {t('explanation.consentModalCheck')}
            </span>
          </label>

          {/* Action buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
            >
              {t('explanation.consentModalDecline')}
            </button>

            <button
              type="submit"
              disabled={!consentChecked || isGenerating}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20 hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('explanation.consentModalSubmit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
