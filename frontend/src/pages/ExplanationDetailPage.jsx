import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { documentsApi } from '../api/client';
import ConsentModal from '../components/explanation/ConsentModal';
import {
  ArrowLeft,
  Sparkles,
  FileCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Languages,
  Clock,
  Cpu,
  Layers,
  ChevronRight,
  Info,
  HeartHandshake,
} from 'lucide-react';

export default function ExplanationDetailPage({
  documentId,
  onBack,
  onNavigateVerify,
}) {
  const { t, i18n } = useTranslation();
  const [document, setDocument] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [explaining, setExplaining] = useState(false);
  const [error, setError] = useState(null);
  const [consentModalOpen, setConsentModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const docData = await documentsApi.get(documentId);
      setDocument(docData);

      try {
        const expData = await documentsApi.getExplanation(documentId);
        setExplanation(expData);
      } catch (expErr) {
        setExplanation(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load document details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      loadData();
    }
  }, [documentId]);

  const handleGenerateExplanation = async (targetLang) => {
    setExplaining(true);
    setError(null);
    try {
      const expData = await documentsApi.explain(documentId, {
        consent_given: true,
        language: targetLang,
      });
      setExplanation(expData);
      setConsentModalOpen(false);
      // Reload document metadata to update status
      const updatedDoc = await documentsApi.get(documentId);
      setDocument(updatedDoc);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Failed to generate explanation. Please verify server Gemini configuration.'
      );
    } finally {
      setExplaining(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">
          {t('explanation.loading')}
        </h2>
      </div>
    );
  }

  const structured = explanation?.structured_explanation || {};
  const explainedItems = structured.items || [];
  const doctorQuestions = explanation?.doctor_questions || [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('explanation.backToDashboard')}
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-brand-600" />
            {t('explanation.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            {t('explanation.subtitle')}
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {onNavigateVerify && (
            <button
              type="button"
              onClick={onNavigateVerify}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            >
              <FileCheck className="w-3.5 h-3.5 text-brand-600" />
              {t('explanation.viewExtraction')}
            </button>
          )}

          {explanation && (
            <button
              type="button"
              onClick={() => setConsentModalOpen(true)}
              disabled={explaining}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-100 transition shadow-xs disabled:opacity-50"
            >
              <Languages className="w-3.5 h-3.5 text-brand-600" />
              {t('explanation.regenerate')}
            </button>
          )}
        </div>
      </div>

      {/* Error feedback */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Mandatory Medical Safety Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Medical Safety Reminder: </span>
          {t('explanation.safetyDisclaimer')}
        </div>
      </div>

      {/* If No Explanation Yet, Show Generate Action Card */}
      {!explanation ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto border border-brand-100 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-800">
              {t('explanation.noExplanationYet')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transform clinical abbreviations and laboratory measurements into clear, everyday explanations in English, Kannada, or Hindi.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setConsentModalOpen(true)}
              disabled={explaining}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition disabled:opacity-50"
            >
              {explaining ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t('explanation.explaining')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('explanation.generateCta')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Metadata Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Languages className="w-4 h-4 text-brand-600" />
                Language: <span className="uppercase text-brand-700 font-bold">{explanation.language}</span>
              </span>

              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-slate-400" />
                {t('explanation.modelLabel')} <span className="font-mono text-slate-600">{explanation.ai_model}</span>
              </span>

              {explanation.processing_time_ms > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {t('explanation.processingTime')} {(explanation.processing_time_ms / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Consent Verified ({explanation.consent_text_version || 'v1.0'})
            </span>
          </div>

          {/* Executive Summary Card */}
          <div className="bg-gradient-to-br from-brand-50/70 via-white to-teal-50/50 border border-brand-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-brand-900 font-bold text-base">
              <Info className="w-5 h-5 text-brand-600" />
              <h2>{t('explanation.summaryTitle')}</h2>
            </div>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
              {explanation.summary}
            </p>
          </div>

          {/* Itemized Clinical Findings & Plain Explanations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-brand-600" />
                {t('explanation.findingsTitle')} ({explainedItems.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {explainedItems.map((item, idx) => {
                const rangeStatus = item.range_status;
                const isCorrected = item.is_patient_corrected;
                const isUncertain = item.is_uncertain;

                return (
                  <div
                    key={idx}
                    className={`bg-white border rounded-2xl p-5 shadow-xs transition hover:shadow-sm space-y-3 ${
                      isUncertain ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                    }`}
                  >
                    {/* Top Row: Name and Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {item.item_name}
                        </h3>

                        {/* Range Status Badge */}
                        {rangeStatus === 'WITHIN_RANGE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {t('explanation.statusWithinRange')}
                          </span>
                        )}
                        {rangeStatus === 'BELOW_RANGE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200">
                            {t('explanation.statusBelowRange')}
                          </span>
                        )}
                        {rangeStatus === 'ABOVE_RANGE' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {t('explanation.statusAboveRange')}
                          </span>
                        )}
                        {rangeStatus === 'NOT_SPECIFIED' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50/80 text-amber-900 border border-amber-300 italic">
                            {t('explanation.statusNotSpecified')}
                          </span>
                        )}

                        {/* Patient Corrected Badge */}
                        {isCorrected && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900">
                            {t('explanation.patientCorrected')}
                          </span>
                        )}
                      </div>

                      {/* Value Display */}
                      <div className="text-xs sm:text-sm font-mono font-bold text-slate-800 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 self-start sm:self-auto">
                        {item.reported_value}
                        {item.printed_reference_range &&
                          item.printed_reference_range !== 'NOT_SPECIFIED' && (
                            <span className="text-slate-400 font-normal ml-2">
                              (Printed Ref: {item.printed_reference_range})
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Plain Language Explanation Body */}
                    <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                      <p>{item.plain_explanation}</p>

                      {/* Uncertainty note */}
                      {item.uncertainty_note && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>{item.uncertainty_note}</span>
                        </div>
                      )}

                      {/* Preserved original value notice if patient corrected */}
                      {isCorrected && item.original_value && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          {t('explanation.originalExtracted')} "{item.original_value}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Questions for Doctor Consultation */}
          {doctorQuestions.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <HelpCircle className="w-5 h-5 text-brand-600" />
                  <h2>{t('explanation.questionsTitle')}</h2>
                </div>
                <p className="text-xs text-slate-500">
                  {t('explanation.questionsSubtitle')}
                </p>
              </div>

              <div className="space-y-2.5">
                {doctorQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 flex items-start gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center flex-shrink-0 text-xs mt-0.5">
                      {qIdx + 1}
                    </span>
                    <span className="flex-1 font-medium leading-relaxed">{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="p-4 rounded-2xl bg-slate-100/60 border border-slate-200 text-slate-600 text-xs flex items-center justify-center gap-2 text-center">
            <HeartHandshake className="w-4 h-4 text-brand-600 flex-shrink-0" />
            <span>{t('explanation.consultDoctorAdvice')}</span>
          </div>
        </div>
      )}

      {/* Patient Consent Modal */}
      <ConsentModal
        isOpen={consentModalOpen}
        onClose={() => setConsentModalOpen(false)}
        onConsentGiven={handleGenerateExplanation}
        currentLanguage={document?.selected_language || i18n.language || 'en'}
        isGenerating={explaining}
      />
    </div>
  );
}
