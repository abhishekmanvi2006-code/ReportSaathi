import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { documentsApi } from '../api/client';
import DocumentUploadModal from '../components/upload/DocumentUploadModal';
import DeleteConfirmModal from '../components/common/DeleteConfirmModal';
import {
  FileText,
  Pill,
  Hospital,
  UploadCloud,
  Trash2,
  ExternalLink,
  Sparkles,
  RefreshCw,
  FolderOpen,
  Filter,
  CheckCircle2,
  Calendar,
  Layers,
  AlertCircle,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

export default function DashboardPage({ onExplainDocument, onVerifyDocument }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = async (category = activeCategory) => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentsApi.list(category);
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError('Unable to load your medical records. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(activeCategory);
  }, [activeCategory]);

  const handleDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await documentsApi.delete(docToDelete.id);
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      console.error('Delete document failed:', err);
      alert('Failed to delete document.');
    } finally {
      setDeleting(false);
    }
  };

  // Metrics
  const labCount = documents.filter((d) => d.document_category === 'LAB_REPORT').length;
  const rxCount = documents.filter((d) => d.document_category === 'PRESCRIPTION').length;
  const dischargeCount = documents.filter((d) => d.document_category === 'DISCHARGE_SUMMARY').length;

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'LAB_REPORT':
        return <FileText className="w-5 h-5 text-brand-600" />;
      case 'PRESCRIPTION':
        return <Pill className="w-5 h-5 text-tealbrand-600" />;
      case 'DISCHARGE_SUMMARY':
        return <Hospital className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-slate-600" />;
    }
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'LAB_REPORT':
        return t('dashboard.filterLab');
      case 'PRESCRIPTION':
        return t('dashboard.filterRx');
      case 'DISCHARGE_SUMMARY':
        return t('dashboard.filterDischarge');
      default:
        return 'Medical Document';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header & Welcome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
              {t('dashboard.title')}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Language: <strong className="text-slate-800">{user?.profile?.preferred_language?.toUpperCase() || 'EN'}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('dashboard.welcomePatient')}, {user?.username}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl transition shadow-md shadow-brand-500/20 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{t('dashboard.uploadNewButton')}</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t('dashboard.totalDocuments')}</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t('dashboard.labReports')}</span>
            <FileText className="w-4 h-4 text-brand-500" />
          </div>
          <p className="text-2xl font-bold text-brand-700">{labCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t('dashboard.prescriptions')}</span>
            <Pill className="w-4 h-4 text-tealbrand-500" />
          </div>
          <p className="text-2xl font-bold text-tealbrand-700">{rxCount}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">{t('dashboard.dischargeSummaries')}</span>
            <Hospital className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-700">{dischargeCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: '', label: t('dashboard.filterAll') },
            { id: 'LAB_REPORT', label: t('dashboard.filterLab') },
            { id: 'PRESCRIPTION', label: t('dashboard.filterRx') },
            { id: 'DISCHARGE_SUMMARY', label: t('dashboard.filterDischarge') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchDocuments(activeCategory)}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Document Content List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Loading your medical records...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 rounded-2xl p-6 border border-rose-200 flex items-center gap-3 text-rose-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">{t('dashboard.emptyTitle')}</h3>
            <p className="text-xs text-slate-500 leading-relaxed">{t('dashboard.emptyDesc')}</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition shadow-sm cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t('dashboard.emptyUploadCta')}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      {getCategoryIcon(doc.document_category)}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {getCategoryLabel(doc.document_category)}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 truncate max-w-[200px]" title={doc.original_filename}>
                        {doc.original_filename}
                      </h4>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {doc.file_type}
                    </span>
                    {doc.status === 'EXPLAINED' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        {t('dashboard.statusExplained')}
                      </span>
                    ) : doc.status === 'REVIEWED' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {t('dashboard.statusReviewed')}
                      </span>
                    ) : doc.status === 'EXTRACTED' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        {t('dashboard.statusExtracted')}
                      </span>
                    ) : doc.status === 'FAILED' ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        {t('dashboard.statusFailed')}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {t('dashboard.statusUploaded')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right font-mono">
                    {doc.file_size_formatted}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={`/api/documents/${doc.id}/download/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-brand-600 transition"
                  title="View / Download file"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('dashboard.downloadButton')}</span>
                </a>

                <div className="flex items-center gap-2">
                  {/* Extract & Review Action (Stage 4) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onVerifyDocument) {
                        onVerifyDocument(doc);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                    title="Extract text and review clinical findings"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>
                      {doc.status === 'REVIEWED' || doc.status === 'EXPLAINED'
                        ? t('extraction.reviewButton')
                        : t('dashboard.extractButton')}
                    </span>
                  </button>

                  {/* Stage 5: Explain Document Action */}
                  <button
                    type="button"
                    onClick={() => {
                      if (onExplainDocument) {
                        onExplainDocument(doc);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition shadow-sm"
                    title="Plain-language educational explanation"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {doc.status === 'EXPLAINED'
                        ? 'View Explanation'
                        : t('dashboard.explainButton')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDocToDelete(doc)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title={t('dashboard.deleteButton')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploadSuccess={() => fetchDocuments(activeCategory)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!docToDelete}
        filename={docToDelete?.original_filename}
        onConfirm={handleDelete}
        onCancel={() => setDocToDelete(null)}
        isDeleting={deleting}
      />
    </div>
  );
}
