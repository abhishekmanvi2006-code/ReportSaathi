import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  ];

  const currentLang = i18n.language ? i18n.language.split('-')[0] : 'en';

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    try {
      localStorage.setItem('reportsaathi_language', langCode);
    } catch (e) {
      console.warn('LocalStorage unavailable for language preference:', e);
    }
  };

  return (
    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
      <div className="flex items-center pl-2 pr-1 text-slate-500" title={t('language.label')}>
        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-1" role="group" aria-label={t('language.label')}>
        {languages.map((lang) => {
          const isActive = currentLang === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                isActive
                  ? 'bg-white text-brand-700 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              aria-pressed={isActive}
            >
              <span>{lang.native}</span>
              {isActive && <Check className="w-3 h-3 text-brand-600" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
