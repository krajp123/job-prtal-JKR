import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const CANDIDATES_PER_PAGE = 10;

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'accountStatus', label: 'Status' },
];

export default function Candidates() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
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

        const response = await adminAxiosInstance.get('/users/candidates', {
          params: {
            search: searchTerm.trim(),
            status: statusFilter === 'all' ? undefined : statusFilter,
            page: currentPage,
            limit: CANDIDATES_PER_PAGE,
          },
        });

        const payload = response.data || {};
        const realData = Array.isArray(payload.candidates)
          ? payload.candidates
          : Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
          ? payload
          : [];

        setCandidates(realData);
        setTotalCount(payload.totalCount || realData.length);
        setTotalPages(payload.totalPages || Math.max(1, Math.ceil(realData.length / CANDIDATES_PER_PAGE)));
      } catch (err) {
        console.error('Failed to load candidates:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load candidates');
        setCandidates([]);
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

  const renderCell = (candidate, key) => {
    if (key === 'accountStatus') {
      const status = candidate.accountStatus || 'unknown';
      const styles =
        status === 'active'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : status === 'suspended'
          ? 'bg-red-50 text-red-700 border-red-200'
          : status === 'banned'
          ? 'bg-[#FDE7E7] text-[#B42318] border-[#F6B9BA]'
          : 'bg-[#FFF4EF] text-[#80576A] border-[#EBC2AE]';

      return (
        <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}>
          {status}
        </span>
      );
    }

    return <span className="block max-w-full break-words whitespace-normal">{candidate[key] || '—'}</span>;
  };

  return (
    <div className="min-w-0 w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#1D181A]">Candidates</h1>
        <p className="mt-1 text-sm text-[#80576A]">Browse and manage candidate registrations.</p>
      </div>

      <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80576A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, phone"
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
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
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
                  Loading candidates…
                </td>
              </tr>
            ) : error && candidates.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-red-600">
                  Error: {error}
                </td>
              </tr>
            ) : candidates.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">
                  No candidates match your current search.
                </td>
              </tr>
            ) : (
              candidates.map((candidate, idx) => (
                <tr
                  key={candidate._id}
                  onClick={() => navigate(`/candidates/${candidate._id}`)}
                  className={`cursor-pointer transition hover:bg-[#FFF0E8] ${idx % 2 === 0 ? 'bg-[#FFFDFB]' : 'bg-[#FFF4EF]/40'}`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`border border-[#1D181A] overflow-hidden px-2 py-2 align-top text-[#1D181A] break-words ${
                        col.key === 'name' ? 'font-medium' : ''
                      }`}
                    >
                      {renderCell(candidate, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && candidates.length > 0 && (
        <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 text-xs font-medium text-[#80576A] md:flex-row md:items-center md:justify-between">
          <div>
            Showing {candidates.length} of {totalCount} candidate(s)
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
    </div>
  );
}
