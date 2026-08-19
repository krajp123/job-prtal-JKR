import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const APPLICATIONS_PER_PAGE = 10;

const COLUMNS = [
  { key: 'candidate', label: 'Candidate' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'job', label: 'Job Title' },
  { key: 'status', label: 'Status' },
];

function getStatusColor(status) {
  if (!status) return 'text-slate-600';
  
  const statusLower = status.toLowerCase().replace(/\s+/g, '_');
  const statusMap = {
    applied: 'text-blue-700',
    interview_scheduled: 'text-amber-700',
    interviewed: 'text-cyan-700',
    hired: 'text-green-700',
    accepted: 'text-green-700',
    rejected: 'text-red-700',
  };
  return statusMap[statusLower] || 'text-slate-600';
}

function formatStatusText(status) {
  if (!status) return 'Unknown';
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Applications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams(location.search);
        const jobId = params.get('jobId');

        const response = await adminAxiosInstance.get('/applications', {
          params: {
            jobId: jobId || undefined,
            search: searchTerm.trim(),
            status: statusFilter === 'all' ? undefined : statusFilter,
            page: currentPage,
            limit: APPLICATIONS_PER_PAGE,
          },
        });

        const payload = response.data || {};
        const realData = Array.isArray(payload.applications)
          ? payload.applications
          : Array.isArray(payload)
          ? payload
          : [];

        setApplications(realData);
        setTotalCount(payload.totalCount || realData.length);
        setTotalPages(payload.totalPages || Math.max(1, Math.ceil(realData.length / APPLICATIONS_PER_PAGE)));
      } catch (err) {
        console.error('Failed to load applications:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load applications');
        setApplications([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, currentPage, location.search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const renderCell = (application, key) => {
    if (key === 'candidate') {
      return (
        <button
          type="button"
          onClick={() => navigate(`/candidates/${application.candidate?._id}`)}
          className="block max-w-full cursor-pointer break-words text-left font-medium"
          title={application.candidate?.name || '—'}
        >
          {application.candidate?.name || '—'}
        </button>
      );
    }

    if (key === 'email') {
      return <span className="block max-w-full break-words whitespace-normal">{application.candidate?.email || '—'}</span>;
    }

    if (key === 'phone') {
      return <span className="block max-w-full break-words whitespace-normal">{application.candidate?.phone || '—'}</span>;
    }

    if (key === 'job') {
      return (
        <button
          type="button"
          onClick={() => navigate(`/jobs/${application.job?._id}`)}
          className="block max-w-full cursor-pointer break-words text-left font-medium"
          title={application.job?.title || '—'}
        >
          {application.job?.title || '—'}
        </button>
      );
    }

    if (key === 'status') {
      const status = application.status;
      const colorClass = getStatusColor(status);

      return (
        <span className={`block max-w-full break-words whitespace-normal font-semibold uppercase tracking-wide ${colorClass}`} title={formatStatusText(status)}>
          {formatStatusText(status)}
        </span>
      );
    }

    return '—';
  };

  return (
    <div className="min-w-0 w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#1D181A]">Applications</h1>
        <p className="mt-1 text-sm text-[#80576A]">Track and manage all candidate applications across jobs.</p>
      </div>

      <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80576A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, phone, or job"
            className="w-full border border-[#1D181A] bg-[#FFFDFB] py-2 pl-9 pr-3 text-xs text-[#1D181A] outline-none placeholder:text-[#80576A]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#1D181A] md:justify-end">
          <label htmlFor="statusFilter" className="font-medium whitespace-nowrap">
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full border border-[#1D181A] bg-[#FFFDFB] px-2 py-2 text-xs text-[#1D181A] outline-none md:w-auto"
          >
            <option value="all">All</option>
            <option value="applied">Applied</option>
            <option value="interview_scheduled">Interview Scheduled</option>
            <option value="interviewed">Interviewed</option>
            <option value="hired">Hired</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="w-full max-w-full overflow-x-auto border border-[#1D181A] bg-[#FFFDFB]">
        <table className="min-w-[760px] w-full table-fixed border-collapse text-xs sm:text-[11px]">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="border border-[#1D181A] bg-[#FFF4EF] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[#1D181A] break-words"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">
                  Loading applications…
                </td>
              </tr>
            ) : error && applications.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-red-600">
                  Error: {error}
                </td>
              </tr>
            ) : applications.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">
                  No applications match your current search.
                </td>
              </tr>
            ) : (
              applications.map((application, idx) => (
                <tr
                  key={application._id}
                  className={`transition hover:bg-[#FFF0E8] ${idx % 2 === 0 ? 'bg-[#FFFDFB]' : 'bg-[#FFF4EF]/40'}`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="border border-[#1D181A] overflow-hidden px-2 py-2 align-top text-[#1D181A] break-words"
                    >
                      {renderCell(application, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && applications.length > 0 && (
        <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 text-xs font-medium text-[#80576A] md:flex-row md:items-center md:justify-between">
          <div>
            Showing {applications.length} of {totalCount} application(s)
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 border border-[#1D181A] bg-[#FFFDFB] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>

            <span className="min-w-[90px] text-center text-[#1D181A]">
              Page {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 border border-[#1D181A] bg-[#FFFDFB] px-2 py-1 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
