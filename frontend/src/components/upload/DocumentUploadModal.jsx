import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ShieldCheck, RefreshCw } from 'lucide-react';
import { documentsApi } from '../../api/client';

export default function DocumentUploadModal({ isOpen, onClose, onUploadSuccess }) {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('LAB_REPORT');
  const [language, setLanguage] = useState(i18n.language ? i18n.language.split('-')[0] : 'en');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
  const maxBytes = 10 * 1024 * 1024; // 10MB

  const handleSelectedFile = (selected) => {
    setError(null);
    if (!selected) return;

    const ext = selected.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      setError(t('uploadModal.errorType'));
      return;
    }

    if (selected.size > maxBytes) {
      setError(t('uploadModal.errorSize'));
      return;
    }

    setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a medical document to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_category', category);
    formData.append('selected_language', language);

    try {
      const result = await documentsApi.upload(formData);
      onUploadSuccess?.(result);
      onClose();
    } catch (err) {
      console.error('Upload failed:', err);
      const detail = err.response?.data?.file?.[0] ||
                     err.response?.data?.detail ||
                     'Failed to upload document. Please ensure it is a valid PDF or image.';
      setError(detail);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{t('uploadModal.modalTitle')}</h3>
              <p className="text-xs text-slate-500">{t('uploadModal.modalSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-brand-500 bg-brand-50/50'
                : file
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-brand-400 bg-slate-50/50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => handleSelectedFile(e.target.files?.[0])}
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-emerald-600" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-900 truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-500 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">{t('uploadModal.dropzoneText')}</p>
                <p className="text-xs text-slate-500">{t('uploadModal.dropzoneSubtext')}</p>
              </div>
            )}
          </div>

          {/* Form Options: Category & Language */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('uploadModal.categoryLabel')}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              >
                <option value="LAB_REPORT">{t('uploadModal.categoryLab')}</option>
                <option value="PRESCRIPTION">{t('uploadModal.categoryRx')}</option>
                <option value="DISCHARGE_SUMMARY">{t('uploadModal.categoryDischarge')}</option>
                <option value="OTHER">{t('uploadModal.categoryOther')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('uploadModal.languageLabel')}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              >
                <option value="en">English</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Files are stored privately in non-public storage. Only you can view this file.</span>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              {t('uploadModal.cancel')}
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {uploading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{uploading ? t('uploadModal.uploading') : t('uploadModal.submitUpload')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
