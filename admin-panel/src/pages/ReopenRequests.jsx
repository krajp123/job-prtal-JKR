import { useEffect, useMemo, useState } from 'react';
import { Check, X, Search, RefreshCcw, X as CloseIcon } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function truncateMessage(message = '', limit = 110) {
  const text = String(message || '').trim();
  if (!text) return '—';
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trimEnd()}...`;
}

export default function ReopenRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    async function loadRequests() {
      setLoading(true);
      setError('');
      try {
        const { data } = await adminAxiosInstance.get('/jobs/reopen-requests');
        setRequests(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Unable to load reopen requests. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((request) => request.status === filter);
  }, [requests, filter]);

  const openRequestDetails = (request) => {
    setSelectedRequest(request);
  };

  async function handleDecision(requestId, action) {
    try {
      const { data } = await adminAxiosInstance.patch(`/jobs/reopen-requests/${requestId}/${action}`);
      setRequests((current) => current.map((req) => (req._id === requestId ? data.request : req)));
      window.dispatchEvent(new CustomEvent('reopenRequestsUpdated'));
    } catch (err) {
      window.alert(err.response?.data?.error || `Failed to ${action} request. Please try again.`);
    }
  }

  const renderStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return String(status || 'Unknown').toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Reopen Requests</h1>
          <p className="mt-1 text-sm text-slate-500">Review and respond to recruiter requests to reopen admin-closed jobs.</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${filter === item.key ? 'bg-[#C75560] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="overflow-hidden -3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Job</span>
          <span>Recruiter</span>
          <span>Message</span>
          <span>Status</span>
          <span>Requested</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading requests…</div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No reopen requests found.</div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request._id} className="grid grid-cols-[1.2fr_1fr_1fr_0.8fr_0.8fr_1fr] gap-3 px-5 py-4 text-sm text-slate-700 hover:bg-slate-50">
                <div className="space-y-1">
                  <p className="font-medium text-slate-900">{request.job?.title || 'Unknown job'}</p>
                  <p className="text-xs text-slate-500">Closed by admin: {request.job?.adminClosed ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{request.recruiter?.companyName || request.recruiter?.fullName || 'Unknown recruiter'}</p>
                  <p className="text-xs text-slate-500">{request.recruiter?.email || 'No email'}</p>
                </div>
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => openRequestDetails(request)}
                    className="max-w-full cursor-pointer bg-transparent px-0 py-0 text-left text-slate-700 transition hover:text-slate-900"
                    title={request.message || 'View full message'}
                  >
                    <span className="block truncate">{truncateMessage(request.message, 110)}</span>
                  </button>
                </div>
                <div className="uppercase text-xs font-semibold text-slate-600">{renderStatusLabel(request.status)}</div>
                <div className="text-slate-500">{formatDate(request.createdAt)}</div>
                <div className="flex justify-end gap-2">
                  {request.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDecision(request._id, 'approve')}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(request._id, 'reject')}
                        className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  ) : (
                    <span className={`inline-flex items-center rounded-full px-3 py-2 text-xs font-semibold ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {renderStatusLabel(request.status)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-xl font-semibold text-slate-900">{selectedRequest.job?.title || 'Job reopen request'}</h2>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Close message"
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="mb-6 max-h-96 overflow-y-auto">
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {selectedRequest.message || 'No message provided.'}
              </p>
            </div>

            {selectedRequest.status === 'pending' && (
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    handleDecision(selectedRequest._id, 'reject');
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                >
                  <X size={16} /> Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequest(null);
                    handleDecision(selectedRequest._id, 'approve');
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Check size={16} /> Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
