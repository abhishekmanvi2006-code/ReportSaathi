import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

export default function DisclaimerBanner() {
  const { t } = useTranslation();

  return (
    <aside
      aria-label="Medical safety notice"
      className="bg-amber-50 border-b border-amber-200 text-amber-950 px-4 py-2.5 text-xs sm:text-sm font-medium sticky top-0 z-30 shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center sm:text-left">
        <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" aria-hidden="true" />
        <p className="leading-snug">
          <strong className="font-semibold text-amber-900">{t('disclaimer.title')}:</strong>{' '}
          <span className="text-amber-800">{t('disclaimer.body')}</span>
        </p>
      </div>
    </aside>
  );
}
