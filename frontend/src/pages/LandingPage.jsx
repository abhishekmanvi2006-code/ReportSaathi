import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  Pill,
  Hospital,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  BookOpen,
  Lock,
  ChevronDown,
  Sparkles,
  HeartHandshake,
  Stethoscope
} from 'lucide-react';

export default function LandingPage({ onUploadClick }) {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
  ];

  return (
    <div className="space-y-24 py-10 sm:py-16">
      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Text & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {t('hero.title')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-tealbrand-600 block mt-1">
                {t('hero.highlight')}
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {t('hero.subtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <button
                type="button"
                onClick={onUploadClick}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition shadow-lg shadow-brand-500/25 cursor-pointer"
              >
                <span>{t('hero.ctaUpload')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold text-slate-700 hover:text-brand-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-xs"
              >
                <span>{t('hero.ctaLearn')}</span>
              </a>
            </div>

            {/* Trust Badges */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{t('hero.trust1')}</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <Lock className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <span>{t('hero.trust2')}</span>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-2">
                <ShieldCheck className="w-4 h-4 text-tealbrand-600 flex-shrink-0" />
                <span>{t('hero.trust3')}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Visual Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-tealbrand-500 rounded-3xl blur-xl opacity-20 transform -rotate-1"></div>
              
              <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-semibold text-slate-500 ml-2">Live Sample Analysis</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 px-2 py-0.5 rounded-md">
                    Educational Preview
                  </span>
                </div>

                {/* Original Snippet */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {t('interactivePreview.originalHeader')}
                  </div>
                  <div className="flex items-center justify-between font-mono bg-white p-2.5 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-800">{t('interactivePreview.testName')}</span>
                    <span className="text-rose-600 font-bold">{t('interactivePreview.testValue')}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Laboratory Reference: {t('interactivePreview.printedRange')}</span>
                    <span className="text-amber-700 font-medium">{t('interactivePreview.statusBelow')}</span>
                  </div>
                </div>

                {/* ReportSaathi Explanation */}
                <div className="bg-brand-50/50 rounded-xl p-4 border border-brand-100 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-900 text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                      {t('interactivePreview.explainerHeader')}
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                      Below Range
                    </span>
                  </div>

                  <p className="text-slate-700 leading-relaxed">
                    {t('interactivePreview.simpleExplain')}
                  </p>
                  <p className="text-slate-600 font-medium">
                    {t('interactivePreview.rangeNote')}
                  </p>

                  <div className="p-2.5 bg-white rounded-lg border border-brand-200 text-brand-900 font-medium">
                    💬 {t('interactivePreview.suggestedQuestion')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('howItWorks.title')}
          </h2>
          <p className="text-base text-slate-600">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
            <span className="text-4xl font-extrabold text-brand-100 block mb-4">
              {t('howItWorks.step1Number')}
            </span>
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-5">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t('howItWorks.step1Title')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('howItWorks.step1Desc')}
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
            <span className="text-4xl font-extrabold text-tealbrand-100 block mb-4">
              {t('howItWorks.step2Number')}
            </span>
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-tealbrand-600 flex items-center justify-center mb-5">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t('howItWorks.step2Title')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('howItWorks.step2Desc')}
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative">
            <span className="text-4xl font-extrabold text-brand-100 block mb-4">
              {t('howItWorks.step3Number')}
            </span>
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-5">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {t('howItWorks.step3Title')}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {t('howItWorks.step3Desc')}
            </p>
          </div>
        </div>
      </section>

      {/* 3. SUPPORTED DOCUMENTS */}
      <section id="supported-documents" className="bg-slate-100/70 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('supportedDocs.title')}
            </h2>
            <p className="text-base text-slate-600">
              {t('supportedDocs.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Lab Reports */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('supportedDocs.labTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('supportedDocs.labDesc')}
              </p>
            </div>

            {/* Prescriptions */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-tealbrand-600 flex items-center justify-center">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('supportedDocs.rxTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('supportedDocs.rxDesc')}
              </p>
            </div>

            {/* Discharge Summaries */}
            <div className="bg-white rounded-2xl p-7 border border-slate-200 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Hospital className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {t('supportedDocs.dischargeTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('supportedDocs.dischargeDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES GRID */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('features.title')}
          </h2>
          <p className="text-base text-slate-600">
            {t('features.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('features.f1Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t('features.f1Desc')}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-tealbrand-600 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('features.f2Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t('features.f2Desc')}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('features.f3Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t('features.f3Desc')}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">{t('features.f4Title')}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{t('features.f4Desc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MEDICAL SAFETY & ETHICS SECTION */}
      <section id="safety" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
          <div className="max-w-3xl space-y-4 mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-tealbrand-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('safety.badge')}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {t('safety.title')}
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {t('safety.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{t('safety.neverDiagnoseTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('safety.neverDiagnoseDesc')}
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{t('safety.neverPrescribeTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('safety.neverPrescribeDesc')}
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-tealbrand-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>{t('safety.groundedTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('safety.groundedDesc')}
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-brand-400 font-bold text-sm">
                <HeartHandshake className="w-5 h-5" />
                <span>{t('safety.doctorQuestionsTitle')}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {t('safety.doctorQuestionsDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('faq.title')}
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-semibold text-slate-900 hover:text-brand-600 transition"
                  aria-expanded={isOpen}
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-5 h-5 text-brand-500 flex-shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      isOpen ? 'transform rotate-180 text-brand-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. BOTTOM CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-brand-600 to-tealbrand-600 rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight max-w-2xl mx-auto">
            Ready to Understand Your Healthcare Documents?
          </h2>
          <p className="text-sm sm:text-base text-brand-100 max-w-xl mx-auto">
            Available in English, ಕನ್ನಡ, and हिन्दी. Completely educational, strictly confidential.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-brand-700 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl transition shadow-lg cursor-pointer"
            >
              <span>{t('hero.ctaUpload')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
