import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, ChevronLeft, ChevronRight, Loader2, Trash2 } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import RecruiterNavbar from '../../components/RecruiterNavbar';

const GlassCard = ({ className = '', children, ...props }) => (
  <div
    className={`rounded-[28px] border backdrop-blur-xl shadow-[0_26px_60px_-40px_rgba(29,24,26,0.24)] ${className}`}
    style={{ background: '#FFFDF9', borderColor: '#F1E7E0' }}
    {...props}
  >
    {children}
  </div>
);

const PAGE_SIZE = 10;

async function getAxiosErrorMessage(err, fallback) {
  const responseData = err?.response?.data;
  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);
      return parsed?.error || fallback;
    } catch {
      return fallback;
    }
  }

  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData);
      return parsed?.error || responseData || fallback;
    } catch {
      return responseData || fallback;
    }
  }

  return responseData?.error || fallback;
}

export default function ResumeDownloadsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentPage = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);

  const [downloads, setDownloads] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState('');

  const fetchDownloads = async (page = currentPage) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/recruiter/resume-downloads', {
        params: { page, limit: PAGE_SIZE },
      });

      setDownloads(data.items || []);
      setPagination({
        page: data.pagination?.page || page,
        limit: data.pagination?.limit || PAGE_SIZE,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.totalPages || 1,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load resume history.');
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadResume = async (paymentId, filename = 'resume.pdf') => {
    setDownloadError('');
    try {
      const response = await axiosInstance.get(`/recruiter/resume-downloads/${paymentId}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: response.data.type || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = await getAxiosErrorMessage(err, 'Could not download saved resume.');
      if (message === 'No resume available.') {
        setDownloadError(message);
        return;
      }
      setDownloadError(message);
    }
  };

  const deleteResumeRecord = async (paymentId) => {
    setDownloadError('');
    setDeletingId(paymentId);

    try {
      await axiosInstance.delete(`/recruiter/resume-downloads/${paymentId}`);
      setConfirmDeleteId('');

      if (downloads.length === 1 && pagination.page > 1) {
        goToPage(pagination.page - 1);
      } else {
        await fetchDownloads(currentPage);
      }
    } catch (err) {
      const message = await getAxiosErrorMessage(err, 'Could not delete saved resume.');
      setDownloadError(message);
    } finally {
      setDeletingId('');
    }
  };

  useEffect(() => {
    fetchDownloads(currentPage);
  }, [currentPage]);

  const pageNumbers = useMemo(() => {
    const totalPages = pagination.totalPages || 1;
    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    let start = Math.max(currentPage - halfWindow, 1);
    let end = Math.min(start + windowSize - 1, totalPages);
    start = Math.max(end - windowSize + 1, 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, pagination.totalPages]);

  const goToPage = (page) => {
    setSearchParams({ page: String(Math.max(page, 1)) });
  };

  return (
    <div className="min-h-screen w-full text-[#1D181A]" style={{ background: '#F8F5F0' }}>
      <RecruiterNavbar />
      <div className="recruiter-page mx-auto w-full max-w-[1400px] px-3 py-3 sm:px-5 sm:py-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/recruiter/dashboard')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back to dashboard
          </button>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Recruiter history</p>
            <h1 className="text-2xl font-bold text-slate-900">Resume downloads</h1>
          </div>
        </div>

        <GlassCard className="p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">All saved resume downloads</p>
              <p className="text-xs text-slate-400">Loaded in pages of {PAGE_SIZE} for faster browsing.</p>
            </div>
            <p className="text-xs text-slate-400">{pagination.total} total downloads</p>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading resume history...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : downloads.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No saved resume downloads found.
            </div>
          ) : (
            <>
              {downloadError ? (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {downloadError}
                </div>
              ) : null}

              <div className="space-y-3">
                {downloads.map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-900">{item.candidateName || 'Candidate'}</p>
                        <p className="truncate text-sm text-slate-500">
                          {item.candidateUniqueId ? `ID: ${item.candidateUniqueId}` : 'Candidate ID unavailable'}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Downloaded {new Date(item.downloadedAt).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => downloadResume(item.id, item.resumeFilename || 'resume.pdf')}
                          className="inline-flex items-center gap-2 rounded-full bg-[#F8F5F3] px-4 py-2 text-sm font-semibold text-[#80576A] hover:bg-[#EFE3DA]"
                        >
                          <Download size={16} />
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          title="Delete from saved history"
                          aria-label="Delete from saved history"
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Prev
                  </button>

                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      disabled={loading}
                      className={`h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition ${
                        page === pagination.page
                          ? 'bg-[#80576A] text-white'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || loading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </GlassCard>
      </div>

      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#F1E7E0] bg-[#FFFDF9] p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-900">Delete saved resume?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will remove the resume from your saved download history only.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId('')}
                disabled={deletingId === confirmDeleteId}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteResumeRecord(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingId === confirmDeleteId ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}