import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, RefreshCcw, ShieldAlert, XCircle } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const STATUS_LABELS = {
  pending: 'Pending',
  under_review: 'Under Review',
  valid: 'Valid',
  rejected: 'Rejected',
};

function statusClass(status) {
  if (status === 'valid') return 'bg-green-50 text-green-700';
  if (status === 'rejected') return 'bg-slate-100 text-slate-600';
  if (status === 'under_review') return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export default function JobReports() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [drafts, setDrafts] = useState({});

  async function loadReports() {
    setLoading(true);
    setError('');
    try {
      const { data } = await adminAxiosInstance.get('/moderation/reports', { params: statusFilter ? { status: statusFilter } : {} });
      setReports(data.reports || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to load job reports.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadReports(); }, [statusFilter]);

  function updateDraft(id, field, value) {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function reviewReport(report) {
    const draft = drafts[report._id] || {};
    if (!draft.status) return;
    setSavingId(report._id);
    setError('');
    try {
      await adminAxiosInstance.patch(`/moderation/reports/${report._id}`, {
        status: draft.status,
        action: draft.action || 'none',
        reviewNotes: draft.reviewNotes || '',
      });
      await loadReports();
      setDrafts((current) => ({ ...current, [report._id]: {} }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update this report.');
    } finally {
      setSavingId('');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#1D181A]">Job Reports</h1>
          <p className="mt-0.5 text-xs text-[#80576A]">Review reported jobs and take moderation action.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="border border-[#EBC2AE] bg-white px-3 py-2 text-xs text-[#1D181A] outline-none">
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="button" onClick={loadReports} className="flex items-center gap-1.5 border border-[#EBC2AE] px-3 py-2 text-xs font-semibold text-[#80576A] hover:bg-[#FFF4EF]"><RefreshCcw size={13} /> Refresh</button>
        </div>
      </div>

      {error && <p className="border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
      {loading ? <p className="border border-[#EBC2AE] bg-white px-4 py-8 text-center text-xs text-[#80576A]">Loading job reports...</p> : reports.length === 0 ? <p className="border border-[#EBC2AE] bg-white px-4 py-8 text-center text-xs text-[#80576A]">No job reports found.</p> : (
        <div className="space-y-3">
          {reports.map((report) => {
            const draft = drafts[report._id] || {};
            const job = report.job;
            return (
              <article key={report._id} className="border border-[#EBC2AE] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold text-[#1D181A]">{job?.title || 'Job removed'}</h2>
                      <span className={`px-2 py-0.5 text-[10px] font-bold ${statusClass(report.status)}`}>{STATUS_LABELS[report.status] || report.status}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#80576A]">Reported {new Date(report.createdAt).toLocaleString('en-IN')} by {report.reportedBy?.name || report.reportedBy?.fullName || report.reportedBy?.email || report.reportedByType}</p>
                    <p className="mt-3 text-xs leading-5 text-[#1D181A]"><span className="font-semibold">Reason:</span> {report.reason}</p>
                  </div>
                  {report.status === 'pending' && <AlertTriangle size={18} className="shrink-0 text-[#C75560]" />}
                  {report.status === 'valid' && <CheckCircle2 size={18} className="shrink-0 text-green-600" />}
                  {report.status === 'rejected' && <XCircle size={18} className="shrink-0 text-slate-400" />}
                </div>
                {report.status === 'pending' || report.status === 'under_review' ? (
                  <div className="mt-4 grid gap-2 border-t border-[#EBC2AE]/60 pt-3 md:grid-cols-[150px_180px_1fr_auto]">
                    <select value={draft.status || ''} onChange={(event) => updateDraft(report._id, 'status', event.target.value)} className="border border-[#EBC2AE] bg-[#FFFDFB] px-2 py-2 text-xs outline-none">
                      <option value="">Review status</option>
                      <option value="under_review">Under Review</option>
                      <option value="valid">Valid</option>
                      <option value="rejected">Rejected</option>
                    </select>
                    <select value={draft.action || 'none'} onChange={(event) => updateDraft(report._id, 'action', event.target.value)} className="border border-[#EBC2AE] bg-[#FFFDFB] px-2 py-2 text-xs outline-none">
                      <option value="none">No action</option>
                      <option value="warn_recruiter">Warn recruiter</option>
                      <option value="close_job">Close job</option>
                      <option value="suspend_recruiter">Suspend recruiter</option>
                      <option value="remove_job">Remove job</option>
                    </select>
                    <input value={draft.reviewNotes || ''} onChange={(event) => updateDraft(report._id, 'reviewNotes', event.target.value)} placeholder="Review note for recruiter (optional)" className="border border-[#EBC2AE] bg-[#FFFDFB] px-2 py-2 text-xs outline-none focus:border-[#C75560]" />
                    <button type="button" onClick={() => reviewReport(report)} disabled={!draft.status || savingId === report._id} className="flex items-center justify-center gap-1.5 bg-[#C75560] px-3 py-2 text-xs font-semibold text-white hover:bg-[#D9654A] disabled:opacity-50"><Eye size={13} /> {savingId === report._id ? 'Saving...' : 'Apply review'}</button>
                  </div>
                ) : (
                  <p className="mt-3 border-t border-[#EBC2AE]/60 pt-3 text-[11px] text-[#80576A]">Action: {report.action || 'none'}{report.reviewNotes ? ` · ${report.reviewNotes}` : ''}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
