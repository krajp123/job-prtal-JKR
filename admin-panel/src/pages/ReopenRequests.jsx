import { useEffect, useMemo, useState } from 'react';
import { Check, X, Search, X as CloseIcon } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
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
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesFilter = filter === 'all' || request.status === filter;
      const searchableText = [
        request.job?.title,
        request.recruiter?.companyName,
        request.recruiter?.fullName,
        request.recruiter?.email,
        request.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesFilter && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
  }, [requests, filter, searchTerm]);

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

  const renderStatus = (status) => {
    const styles =
      status === 'approved'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : status === 'rejected'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-[#FFF4EF] text-[#80576A] border-[#EBC2AE]';

    return (
      <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}>
        {renderStatusLabel(status)}
      </span>
    );
  };

  return (
    <div className="min-w-0 w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#1D181A]">Reopen Requests</h1>
        <p className="mt-1 text-sm text-[#80576A]">Review and respond to recruiter requests to reopen admin-closed jobs.</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80576A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by job, recruiter, email, message"
            className="w-full border border-[#1D181A] bg-[#FFFDFB] py-2 pl-9 pr-3 text-xs text-[#1D181A] outline-none placeholder:text-[#80576A]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#1D181A] md:justify-end">
          <label htmlFor="requestStatusFilter" className="font-medium whitespace-nowrap">Status</label>
          <select
            id="requestStatusFilter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="w-full border border-[#1D181A] bg-[#FFFDFB] px-2 py-2 text-xs text-[#1D181A] outline-none md:w-auto"
          >
            {STATUS_FILTERS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
          </select>
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto border border-[#1D181A] bg-[#FFFDFB]">
        <table className="min-w-[980px] w-full table-fixed border-collapse text-xs sm:text-[11px]">
          <thead>
            <tr>
              {['Job', 'Recruiter', 'Message', 'Status', 'Requested', 'Actions'].map((label) => (
                <th key={label} className="border border-[#1D181A] bg-[#FFF4EF] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[#1D181A] break-words">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
          {loading ? (
            <tr><td colSpan="6" className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">Loading requests…</td></tr>
          ) : filteredRequests.length === 0 ? (
            <tr><td colSpan="6" className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">No reopen requests found.</td></tr>
          ) : (
            filteredRequests.map((request, index) => (
              <tr key={request._id} className={`transition hover:bg-[#FFF0E8] ${index % 2 === 0 ? 'bg-[#FFFDFB]' : 'bg-[#FFF4EF]/40'}`}>
                <td className="border border-[#1D181A] px-2 py-2 align-top text-[#1D181A] break-words">
                  <p className="font-medium">{request.job?.title || 'Unknown job'}</p>
                  <p className="mt-1 text-[10px] text-[#80576A]">Closed by admin: {request.job?.adminClosed ? 'Yes' : 'No'}</p>
                </td>
                <td className="border border-[#1D181A] px-2 py-2 align-top text-[#1D181A] break-words">
                  <p className="font-medium">{request.recruiter?.companyName || request.recruiter?.fullName || 'Unknown recruiter'}</p>
                  <p className="mt-1 text-[10px] text-[#80576A]">{request.recruiter?.email || 'No email'}</p>
                </td>
                <td className="border border-[#1D181A] px-2 py-2 align-top text-[#1D181A] break-words">
                  <button
                    type="button"
                    onClick={() => openRequestDetails(request)}
                    className="max-w-full cursor-pointer bg-transparent px-0 py-0 text-left text-[#1D181A] transition hover:text-[#C75560]"
                    title={request.message || 'View full message'}
                  >
                    <span className="block truncate">{truncateMessage(request.message, 110)}</span>
                  </button>
                </td>
                <td className="border border-[#1D181A] px-2 py-2 align-top">{renderStatus(request.status)}</td>
                <td className="border border-[#1D181A] px-2 py-2 align-top text-[#80576A]">{formatDate(request.createdAt)}</td>
                <td className="border border-[#1D181A] px-2 py-2 align-top">
                  <div className="flex flex-wrap gap-2">
                  {request.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDecision(request._id, 'approve')}
                        className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecision(request._id, 'reject')}
                        className="inline-flex items-center gap-1 border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <X size={14} /> Reject
                      </button>
                    </>
                  ) : (
                    renderStatus(request.status)
                  )}
                  </div>
                </td>
              </tr>
            ))
          )}
          </tbody>
        </table>
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
