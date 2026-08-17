import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const APPLICANTS_PER_PAGE = 10;

export default function JobApplicants() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'total';

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadJobAndApplications = async () => {
      try {
        setLoading(true);
        setError(null);

        const [jobResponse, appsResponse] = await Promise.all([
          adminAxiosInstance.get(`/jobs/${jobId}`),
          adminAxiosInstance.get(`/applications?jobId=${jobId}`),
        ]);

        setJob(jobResponse.data || null);
        setApplications(Array.isArray(appsResponse.data) ? appsResponse.data : []);
      } catch (err) {
        console.error('Failed to load job applicants:', err);
        setError(err.response?.data?.error || 'Failed to load applicants');
      } finally {
        setLoading(false);
      }
    };

    if (jobId) loadJobAndApplications();
  }, [jobId]);

  const filteredApplicants = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const byStatus = applications.filter((application) => {
      const status = (application.status || '').toLowerCase();

      if (statusFilter === 'total') return true;
      if (statusFilter === 'shortlisted') return status === 'shortlisted';
      if (statusFilter === 'hired') return status === 'hired' || status === 'accepted';
      if (statusFilter === 'interviewed') return status === 'interviewed';
      if (statusFilter === 'rejected') return status === 'rejected';
      return true;
    });

    if (!normalizedQuery) return byStatus;

    return byStatus.filter((application) => {
      const candidate = application.candidate || {};
      const searchable = [candidate.name, candidate.email, candidate.phone].join(' ').toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [applications, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredApplicants.length / APPLICANTS_PER_PAGE));

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const currentPageApplicants = useMemo(() => {
    const start = (page - 1) * APPLICANTS_PER_PAGE;
    return filteredApplicants.slice(start, start + APPLICANTS_PER_PAGE);
  }, [filteredApplicants, page]);

  return (
    <div className="rc-root max-w-[1280px] mx-auto bg-[#FFFDFB] p-4 md:p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/jobs/${jobId}`)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <div>
              <h1 className="text-[22px] font-semibold text-[#1D181A]">
                {job?.title || 'Job'}
              </h1>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#F0E1D6] bg-white shadow-[0_1px_2px_rgba(29,24,26,0.04)] overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[#F3E9E3] bg-[#FFF9F5] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80576A]" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search candidate by name, email or mobile"
                className="w-full rounded-full border border-[#1D181A] bg-[#FFFDFB] py-2.5 pl-9 pr-3 text-[12px] text-[#1D181A] placeholder:text-[#A08A93] outline-none shadow-sm"
              />
            </div>
            <p className="text-[11px] font-medium text-[#80576A]">
              Showing {filteredApplicants.length} candidate(s)
            </p>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-[12px] text-[#80576A]">Loading applicants…</div>
          ) : error ? (
            <div className="px-4 py-12 text-center text-[12px] text-red-600">{error}</div>
          ) : currentPageApplicants.length === 0 ? (
            <div className="px-4 py-12 text-center text-[12px] text-[#80576A]">No candidates found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="bg-[#FFFBF9]">
                    <tr className="border-b border-[#F3E9E3]">
                      <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[#A08A93]">Name</th>
                      <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[#A08A93]">Email</th>
                      <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[#A08A93]">Mobile</th>
                      <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[#A08A93]">Status</th>
                      <th className="px-4 py-2.5 text-left text-[9px] font-bold uppercase tracking-[0.08em] text-[#A08A93]">Applied On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPageApplicants.map((application) => {
                      const candidate = application.candidate || {};
                      const initials = (candidate.name || '?')
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0]?.toUpperCase() || '')
                        .join('') || '?';

                      return (
                        <tr key={application._id} className="border-b border-[#F3E9E3] last:border-0 hover:bg-[#FFF9F5]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F3E9E3] text-[9px] font-bold text-[#80576A]">
                                {initials}
                              </div>
                              <span className="text-[12px] font-semibold text-[#1D181A]">{candidate.name || '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-[#5B4A50] break-all">{candidate.email || '—'}</td>
                          <td className="px-4 py-3 text-[12px] text-[#5B4A50]">{candidate.phone || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-bold capitalize ring-1 ring-inset ${
                              (application.status || '').toLowerCase() === 'shortlisted'
                                ? 'bg-violet-50 text-violet-700 ring-violet-600/20'
                                : (application.status || '').toLowerCase() === 'hired' || (application.status || '').toLowerCase() === 'accepted'
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : (application.status || '').toLowerCase() === 'interviewed'
                                ? 'bg-cyan-50 text-cyan-700 ring-cyan-600/20'
                                : (application.status || '').toLowerCase() === 'rejected'
                                ? 'bg-red-50 text-red-700 ring-red-600/20'
                                : 'bg-blue-50 text-blue-700 ring-blue-600/20'
                            }`}>
                              {(application.status || 'Applied').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-[#5B4A50]">
                            {new Date(application.createdAt || Date.now()).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-[#F3E9E3] bg-[#FFF9F5] px-4 py-3 md:flex-row md:items-center md:justify-between">
                <p className="text-[11px] font-medium text-[#80576A]">
                  Page {page} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 border border-[#1D181A] bg-[#FFFDFB] px-2 py-1.5 text-[11px] font-medium text-[#1D181A] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={12} /> Prev
                  </button>

                  <span className="min-w-[90px] text-center text-[11px] font-medium text-[#1D181A]">
                    {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 border border-[#1D181A] bg-[#FFFDFB] px-2 py-1.5 text-[11px] font-medium text-[#1D181A] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
