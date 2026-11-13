import React from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, ShieldCheck, Heart } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-slate-900 text-slate-400 text-sm border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5 text-white">
              <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-lg font-bold tracking-tight">ReportSaathi</span>
            </div>
            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              {t('footer.about')}
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-tealbrand-500" />
              <span>English • ಕನ್ನಡ • हिन्दी Support</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              {t('footer.quickLinks')}
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <a href="#how-it-works" className="hover:text-white transition">
                  {t('nav.howItWorks')}
                </a>
              </li>
              <li>
                <a href="#supported-documents" className="hover:text-white transition">
                  {t('nav.supportedDocs')}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition">
                  {t('nav.features')}
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-white transition">
                  {t('nav.safety')}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal / Ethics */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              {t('footer.legal')}
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              {t('footer.disclaimerNotice')}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>for patient comprehension</span>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} ReportSaathi. {t('footer.rights')}</p>
          <p className="text-center sm:text-right">
            Non-diagnostic educational platform. Always consult your licensed physician.
          </p>
        </div>
      </div>
    </footer>
  );
}
