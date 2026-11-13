import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { documentsApi } from '../api/client';
import {
  ArrowLeft,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Save,
  X,
  FileCheck,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export default function ExtractionVerificationPage({ documentId, onBack, onNavigateExplain }) {
  const { t } = useTranslation();
  const [document, setDocument] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showRawText, setShowRawText] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [confirmingReview, setConfirmingReview] = useState(false);
  const [showStage5Notice, setShowStage5Notice] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(null);

  // Load document metadata and extraction data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const docData = await documentsApi.get(documentId);
      setDocument(docData);

      try {
        const extData = await documentsApi.getExtraction(documentId);
        setExtraction(extData);
      } catch (extErr) {
        // Not extracted yet or 404
        setExtraction(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to load document information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (documentId) {
      loadData();
    }
  }, [documentId]);

  // Authenticated preview stream loader using Blob & ObjectURL
  useEffect(() => {
    let activeUrl = null;
    let isMounted = true;

    const fetchPreview = async () => {
      if (!documentId) return;
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const blob = await documentsApi.getPreviewBlob(documentId);
        if (!isMounted) return;
        activeUrl = URL.createObjectURL(blob);
        setPreviewUrl(activeUrl);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load authenticated preview:', err);
        setPreviewError('Unable to load document preview. Ensure you have valid access permissions.');
      } finally {
        if (isMounted) {
          setPreviewLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [documentId]);

  // Trigger extraction
  const handleTriggerExtraction = async () => {
    setExtracting(true);
    setError(null);
    try {
      const extData = await documentsApi.extract(documentId);
      setExtraction(extData);
      // Reload document metadata to update status
      const updatedDoc = await documentsApi.get(documentId);
      setDocument(updatedDoc);
    } catch (err) {
      setError(err.response?.data?.error || 'Extraction failed. Please check file format.');
    } finally {
      setExtracting(false);
    }
  };

  // Start editing an item
  const handleStartEdit = (item) => {
    setEditingItemId(item.id);
    setEditValue(item.reported_value || item.medicine_name || '');
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditValue('');
  };

  // Save correction
  const handleSaveCorrection = async (item) => {
    if (!editValue.trim()) return;
    setSavingCorrection(true);
    setError(null);

    const fieldName = document?.document_category === 'PRESCRIPTION' ? 'medicine_name' : 'reported_value';

    try {
      const updatedExt = await documentsApi.verifyItem(documentId, {
        item_id: item.id,
        corrected_value: editValue.trim(),
        correction_field: fieldName,
      });
      setExtraction(updatedExt);
      setEditingItemId(null);
      setEditValue('');
      setSuccessMessage('Correction saved successfully while preserving original extracted value.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save correction.');
    } finally {
      setSavingCorrection(false);
    }
  };

  // Confirm review
  const handleConfirmReview = async () => {
    setConfirmingReview(true);
    setError(null);
    try {
      const updatedExt = await documentsApi.verifyItem(documentId, {});
      setExtraction(updatedExt);
      const updatedDoc = await documentsApi.get(documentId);
      setDocument(updatedDoc);
      setShowStage5Notice(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm review.');
    } finally {
      setConfirmingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <RefreshCw className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-800">{t('extraction.loading')}</h2>
      </div>
    );
  }

  const items = extraction?.structured_data?.items || [];
  const hasUncertainties = extraction?.has_uncertainties;
  const isReviewed = extraction?.is_reviewed_by_patient || document?.status === 'REVIEWED';
  const confidencePercent = Math.round((extraction?.overall_extraction_confidence || 0) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-brand-600 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('extraction.backToDashboard')}
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-brand-600" />
            {t('extraction.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">{t('extraction.subtitle')}</p>
        </div>

        {/* Status Badge & Explain Action */}
        <div className="flex items-center gap-3">
          {onNavigateExplain && (
            <button
              type="button"
              onClick={onNavigateExplain}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 border border-brand-200 text-xs font-bold text-brand-700 hover:bg-brand-100 transition shadow-xs"
              title="Proceed to plain-language explanation"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              <span>{t('dashboard.explainButton')}</span>
            </button>
          )}

          {isReviewed ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {t('extraction.statusReviewed')}
            </span>
          ) : extraction ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              {t('extraction.statusExtracted')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <FileText className="w-4 h-4 text-slate-500" />
              {t('dashboard.statusUploaded')}
            </span>
          )}
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Notice: </span>
            {error}
          </div>
          <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{successMessage}</div>
          <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stage 5 Explanations Notice Modal / Card */}
      {showStage5Notice && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-brand-50 to-teal-50 border border-brand-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-6 h-6 text-brand-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-base font-bold text-brand-900">{t('extraction.reviewConfirmedSuccess')}</h3>
              <p className="text-xs text-brand-700 mt-1 max-w-2xl">{t('explanation.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateExplain && (
              <button
                type="button"
                onClick={onNavigateExplain}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('dashboard.explainButton')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowStage5Notice(false)}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Document Preview (Left) + Extracted Findings (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Secure In-Browser Preview */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-600" />
              {t('extraction.documentPreview')}
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              {document?.file_type} • {document?.original_filename}
            </span>
          </div>

          <div className="relative w-full h-[520px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 flex items-center justify-center">
            {previewLoading ? (
              <div className="text-center p-6 space-y-2">
                <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-semibold">Loading secure preview...</p>
              </div>
            ) : previewError ? (
              <div className="text-center p-6 space-y-2 text-rose-600">
                <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
                <p className="text-xs font-semibold">{previewError}</p>
              </div>
            ) : previewUrl ? (
              document?.file_type === 'PDF' ? (
                <iframe
                  src={`${previewUrl}#toolbar=0`}
                  className="w-full h-full"
                  title="Document Preview"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Medical document"
                  className="max-h-full max-w-full object-contain p-2"
                />
              )
            ) : (
              <div className="text-center p-6 text-slate-400 text-xs">
                No preview available
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 justify-center">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Encrypted private stream. Document preview is authenticated and ownership-checked.
          </div>
        </div>

        {/* Right Column: Structured Findings & Corrections */}
        <div className="lg:col-span-7 space-y-5">
          {/* If not extracted yet, offer Extraction Trigger */}
          {!extraction ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm space-y-4">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-800">Text has not been extracted yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Click below to extract printed medical values, test names, and reference ranges using our private local engine.
                </p>
              </div>
              <button
                type="button"
                onClick={handleTriggerExtraction}
                disabled={extracting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-md transition disabled:opacity-50"
              >
                {extracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t('extraction.extracting')}
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    {t('extraction.extractButton')}
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Extraction Metadata Pill / Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {t('extraction.opticalConfidence')}
                    </div>
                    <div className="text-lg font-bold text-slate-800 flex items-center gap-1.5">
                      {confidencePercent}%
                      <span className="text-[11px] font-normal text-slate-500">
                        ({extraction.extraction_method === 'PYMUPDF_DIGITAL' ? t('extraction.methodPyMuPDF') : t('extraction.methodOCR')})
                      </span>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                  <div>
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {t('extraction.pagesProcessed')}
                    </div>
                    <div className="text-sm font-bold text-slate-700">
                      {extraction.page_count} page{extraction.page_count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmReview}
                    disabled={confirmingReview}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
                  >
                    {confirmingReview ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {t('extraction.confirmReview')}
                  </button>
                </div>
              </div>

              {/* Confidence Notice Banner (Required: Legibility != Medical Accuracy) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-2.5 text-xs">
                <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">Clarity Metric: </span>
                  {t('extraction.confidenceNotice')}
                </div>
              </div>

              {/* Uncertainty Alert Banner */}
              {hasUncertainties && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-amber-900">{t('extraction.uncertaintyBannerTitle')}</div>
                    <p className="mt-0.5 text-amber-800">{t('extraction.uncertaintyBannerDesc')}</p>
                  </div>
                </div>
              )}

              {/* Warnings from extraction engine */}
              {extraction.extraction_warnings && extraction.extraction_warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs space-y-1">
                  {extraction.extraction_warnings.map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Structured Clinical Items List */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-brand-600" />
                    {t('extraction.extractedFindings')} ({items.length})
                  </h3>
                  <span className="text-xs text-slate-400">
                    Click 'Correct Value' if any number or text is inaccurate
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    {t('extraction.emptyItems')}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const isEditing = editingItemId === item.id;
                      const isUncertain = item.is_uncertain;
                      const isCorrected = item.is_corrected;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 transition ${
                            isUncertain
                              ? 'bg-amber-50/40 hover:bg-amber-50/70'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Test / Drug Info */}
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-slate-900">
                                  {item.test_name || item.medicine_name}
                                </span>

                                {isUncertain && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    Review Needed
                                  </span>
                                )}

                                {isCorrected && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    {t('extraction.correctedOn')}
                                  </span>
                                )}
                              </div>

                              {/* Detailed values or prescription schedule */}
                              {item.test_name ? (
                                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                                  <span>
                                    <strong className="text-slate-700">{t('extraction.resultValue')}:</strong>{' '}
                                    <span className="font-mono text-slate-900 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                      {item.reported_value} {item.unit !== 'Not Specified' ? item.unit : ''}
                                    </span>
                                  </span>

                                  <span>
                                    <strong className="text-slate-700">{t('extraction.referenceRange')}:</strong>{' '}
                                    {item.printed_reference_range === 'NOT_SPECIFIED' ? (
                                      <span className="text-amber-700 font-semibold italic bg-amber-100/70 px-1.5 py-0.5 rounded">
                                        {t('extraction.notSpecified')}
                                      </span>
                                    ) : (
                                      <span className="font-mono text-slate-700">
                                        {item.printed_reference_range} {item.unit !== 'Not Specified' ? item.unit : ''}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3">
                                  <span>
                                    <strong className="text-slate-700">Schedule:</strong> {item.schedule}
                                  </span>
                                  <span>
                                    <strong className="text-slate-700">Timing:</strong> {item.food_instruction}
                                  </span>
                                  <span>
                                    <strong className="text-slate-700">Duration:</strong> {item.duration}
                                  </span>
                                </div>
                              )}

                              {/* Uncertainty reason explanation */}
                              {isUncertain && item.uncertainty_reason && (
                                <p className="text-[11px] text-amber-700 italic">
                                  ⚠️ {item.uncertainty_reason}
                                </p>
                              )}

                              {/* Preserved original value notice */}
                              {isCorrected && item.original_value && (
                                <p className="text-[11px] text-slate-500 font-mono">
                                  {t('extraction.originalValue')} "{item.original_value}"
                                </p>
                              )}
                            </div>

                            {/* Action: Edit / Save inline */}
                            <div className="flex-shrink-0">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    className="px-2.5 py-1 text-xs border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                                    placeholder="Enter accurate value"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCorrection(item)}
                                    disabled={savingCorrection}
                                    className="p-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
                                    title={t('extraction.saveCorrection')}
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition"
                                    title={t('extraction.cancel')}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition border border-slate-200 bg-white"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  {t('extraction.edit')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Raw Text Accordion */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowRawText(!showRawText)}
                  className="w-full px-5 py-3.5 text-left flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {showRawText ? t('extraction.hideRawText') : t('extraction.showRawText')}
                  </span>
                  {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRawText && (
                  <div className="p-4 border-t border-slate-200 bg-slate-900 text-slate-100 text-xs font-mono max-h-64 overflow-y-auto whitespace-pre-wrap rounded-b-2xl">
                    {extraction.raw_text || 'No text extracted.'}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
