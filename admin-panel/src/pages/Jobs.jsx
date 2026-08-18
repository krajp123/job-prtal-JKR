import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const JOBS_PER_PAGE = 10;

const COLUMNS = [
  { key: 'title', label: 'Job Title' },
  { key: 'company', label: 'Company' },
  { key: 'recruiter', label: 'Posted By' },
  { key: 'applicants', label: 'Applicants' },
  { key: 'status', label: 'Status' },
  { key: 'action', label: 'Action' },
];

function getStatus(job) {
  return job.status ? job.status.toLowerCase() : 'unknown';
}

export default function Jobs() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          status: statusFilter === 'all' ? undefined : statusFilter,
          page: currentPage,
          limit: JOBS_PER_PAGE,
        };

        // Only add search if it has a value
        if (searchTerm.trim()) {
          params.search = searchTerm.trim();
        }

        const response = await adminAxiosInstance.get('/jobs', { params });

        const payload = response.data || {};
        const realData = Array.isArray(payload.jobs) ? payload.jobs : Array.isArray(payload) ? payload : [];

        setJobs(realData);
        setTotalCount(payload.totalCount || realData.length);
        setTotalPages(payload.totalPages || Math.max(1, Math.ceil(realData.length / JOBS_PER_PAGE)));
      } catch (err) {
        console.error('Failed to load jobs:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load jobs');
        setJobs([]);
        setTotalCount(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, job: null, nextStatus: null });

  const handleJobStatusToggle = (job, event) => {
    event.stopPropagation();
    const nextStatus = getStatus(job) === 'closed' ? 'open' : 'closed';
    setConfirmModal({ isOpen: true, job, nextStatus });
  };

  const confirmJobStatusChange = async () => {
    if (!confirmModal.job) return;

    const { job, nextStatus } = confirmModal;
    const jobId = job._id;

    setConfirmModal({ isOpen: false, job: null, nextStatus: null });

    try {
      await adminAxiosInstance.patch(`/jobs/${jobId}/status`, { status: nextStatus });
      setJobs((currentJobs) =>
        currentJobs.map((item) => (item._id === jobId ? { ...item, status: nextStatus } : item))
      );
    } catch (err) {
      console.error('Failed to update job status:', err);
      setError(err.response?.data?.error || err.message || 'Failed to update job status');
    }
  };

  const cancelJobStatusChange = () => {
    setConfirmModal({ isOpen: false, job: null, nextStatus: null });
  };

  const renderCell = (job, key) => {
    if (key === 'title') {
      return <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{job.title || '—'}</span>;
    }

    if (key === 'action') {
      const isClosed = getStatus(job) === 'closed';
      return (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={(event) => handleJobStatusToggle(job, event)}
            className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
              isClosed
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-[#EBC2AE] bg-[#FFF4EF] text-[#80576A] hover:bg-[#FDE9E1]'
            }`}
            aria-label={isClosed ? 'Reopen job' : 'Close job'}
            title={isClosed ? 'Reopen job' : 'Close job'}
          >
            {isClosed ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          </button>
        </div>
      );
    }

    if (key === 'company') {
      const recruiter = job.recruiter || job.postedBy;
      return <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{recruiter?.companyName || '—'}</span>;
    }

    if (key === 'recruiter') {
      const recruiter = job.recruiter || job.postedBy;
      return <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{recruiter?.fullName || recruiter?.name || '—'}</span>;
    }

    if (key === 'applicants') {
      const applicants = job.applicantsCount ?? (Array.isArray(job.applications) ? job.applications.length : null);
      return <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{applicants ?? '—'}</span>;
    }

    if (key === 'status') {
      const status = getStatus(job);
      const styles =
        status === 'open'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : status === 'closed'
          ? 'bg-red-50 text-red-700 border-red-200'
          : status === 'draft'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-[#FFF4EF] text-[#80576A] border-[#EBC2AE]';

      return (
        <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}>
          {status}
        </span>
      );
    }

    return <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap">{job[key] || '—'}</span>;
  };

  return (
    <div className="space-y-4 w-full overflow-hidden">
      <div>
        <h1 className="text-xl font-semibold text-[#1D181A]">Jobs</h1>
        <p className="mt-1 text-sm text-[#80576A]">Browse and manage all job postings on the platform.</p>
      </div>

      <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80576A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title, recruiter, or company"
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
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-[#1D181A] bg-[#FFFDFB]">
        <table className="min-w-[760px] w-full table-fixed border-collapse text-xs sm:text-[11px]">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`border border-[#1D181A] bg-[#FFF4EF] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-[#1D181A] break-words ${
                    col.key === 'action'
                      ? 'w-[62px] min-w-[62px]'
                      : col.key === 'applicants'
                      ? 'w-[80px] min-w-[78px]'
                      : col.key === 'status'
                      ? 'w-[84px] min-w-[84px]'
                      : ''
                  }`}
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
                  Loading jobs…
                </td>
              </tr>
            ) : error && jobs.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-red-600">
                  Error: {error}
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">
                  No jobs match your current search.
                </td>
              </tr>
            ) : (
              jobs.map((job, idx) => (
                <tr
                  key={job._id}
                  onClick={() => navigate(`/jobs/${job._id}`)}
                  className={`cursor-pointer transition hover:bg-[#FFF0E8] ${idx % 2 === 0 ? 'bg-[#FFFDFB]' : 'bg-[#FFF4EF]/40'}`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`border border-[#1D181A] overflow-hidden px-2 py-1.5 align-top text-[#1D181A] break-words ${
                        col.key === 'title' ? 'font-medium' : ''
                      } ${col.key === 'action' ? 'w-[62px] align-middle' : ''}`}
                    >
                      {renderCell(job, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && jobs.length > 0 && (
        <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 text-xs font-medium text-[#80576A] md:flex-row md:items-center md:justify-between">
          <div>
            Showing {jobs.length} of {totalCount} job(s)
          </div>

          <div className="flex items-center gap-2">
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

      {confirmModal.isOpen && confirmModal.job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#F0E1D6] bg-white shadow-2xl">
            <div className="border-b border-[#F0E1D6] bg-gradient-to-r from-[#C75560]/5 to-[#D9654A]/5 px-5 py-4">
              <h2 className="text-[14px] font-bold text-[#1D181A]">
                {confirmModal.nextStatus === 'closed' ? 'Close Job' : 'Reopen Job'}
              </h2>
            </div>

            <div className="space-y-3 px-5 py-5">
              <p className="text-[13px] leading-relaxed text-[#3F3438]">
                {confirmModal.nextStatus === 'closed'
                  ? 'Are you sure you want to close this job? Recruiters will no longer be able to reopen it directly and must submit a request for admin approval.'
                  : 'Are you sure you want to reopen this job for recruiters?'}
              </p>

              <p className="rounded-lg border border-[#EBC2AE] bg-[#FFF4EF] p-3 text-[12px] text-[#80576A]">
                {confirmModal.nextStatus === 'closed'
                  ? 'This action requires the admin reopen-request flow for future access.'
                  : 'This will make the job active again on the platform.'}
              </p>
            </div>

            <div className="flex gap-2.5 border-t border-[#F0E1D6] bg-[#FFFDFB] px-5 py-4">
              <button
                type="button"
                onClick={cancelJobStatusChange}
                className="flex-1 rounded-lg border border-[#EBC2AE] bg-white px-3 py-2 text-[12px] font-bold text-[#80576A] transition hover:bg-[#FFF4EF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmJobStatusChange}
                className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-bold text-white transition ${
                  confirmModal.nextStatus === 'closed'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmModal.nextStatus === 'closed' ? 'Close Job' : 'Reopen Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}