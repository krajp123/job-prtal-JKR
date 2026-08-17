import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const DUMMY_RECRUITERS = [
  {
    _id: '1',
    fullName: 'Rajesh Kumar',
    uniqueId: 'REC-2026-001',
    email: 'rajesh@techcorp.com',
    phone: '+91 9876543210',
    companyName: 'Tech Corp India',
    companyWebsite: 'https://www.techcorp.com',
    gstNumber: '27AABCT1234H1Z0',
    accountStatus: 'active',
  },
  {
    _id: '2',
    fullName: 'Priya Sharma',
    uniqueId: 'REC-2026-002',
    email: 'priya@innovatehub.io',
    phone: '+91 9876543211',
    companyName: 'Innovate Hub Solutions',
    companyWebsite: 'https://www.innovatehub.io',
    gstNumber: '18AABCT5678H2Z0',
    accountStatus: 'active',
  },
  {
    _id: '3',
    fullName: 'Amit Patel',
    uniqueId: 'REC-2026-003',
    email: 'amit@globaltech.co.in',
    phone: '+91 9876543212',
    companyName: 'Global Tech Pvt Ltd',
    companyWebsite: 'https://www.globaltech.co.in',
    gstNumber: '36AABCT9012H3Z0',
    accountStatus: 'suspended',
  },
];

const RECRUITERS_PER_PAGE = 10;

const COLUMNS = [
  { key: 'fullName', label: 'Recruiter Name' },
  { key: 'uniqueId', label: 'Recruiter ID' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'companyName', label: 'Company Name' },
  { key: 'companyWebsite', label: 'Website' },
  { key: 'gstNumber', label: 'GST Number' },
  { key: 'accountStatus', label: 'Status' },
];

export default function Recruiters() {
  const navigate = useNavigate();
  const [recruiters, setRecruiters] = useState([]);
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

        const response = await adminAxiosInstance.get('/users/recruiters', {
          params: {
            search: searchTerm.trim(),
            status: statusFilter === 'all' ? undefined : statusFilter,
            page: currentPage,
            limit: RECRUITERS_PER_PAGE,
          },
        });

        const payload = response.data || {};
        const realData = Array.isArray(payload.recruiters) ? payload.recruiters : payload.recruiters || [];

        setRecruiters(realData);
        setTotalCount(payload.totalCount || realData.length);
        setTotalPages(payload.totalPages || Math.max(1, Math.ceil(realData.length / RECRUITERS_PER_PAGE)));
      } catch (error) {
        console.error('Failed to load recruiters:', error);
        setError(error.message);
        setRecruiters(DUMMY_RECRUITERS);
        setTotalCount(DUMMY_RECRUITERS.length);
        setTotalPages(Math.max(1, Math.ceil(DUMMY_RECRUITERS.length / RECRUITERS_PER_PAGE)));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const renderCell = (recruiter, key) => {
    if (key === 'companyWebsite') {
      return recruiter.companyWebsite ? (
        <a
          href={recruiter.companyWebsite}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#C75560] underline decoration-[#EBC2AE] underline-offset-2 hover:text-[#D9654A]"
        >
          {recruiter.companyWebsite}
        </a>
      ) : (
        '—'
      );
    }

    if (key === 'accountStatus') {
      const status = recruiter.accountStatus || 'unknown';
      const styles =
        status === 'active'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : status === 'suspended'
          ? 'bg-red-50 text-red-700 border-red-200'
          : 'bg-[#FFF4EF] text-[#80576A] border-[#EBC2AE]';

      return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles}`}>
          {status}
        </span>
      );
    }

    return recruiter[key] || '—';
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#1D181A]">Recruiters</h1>
        <p className="mt-1 text-sm text-[#80576A]">Manage and view all recruiter accounts on the platform.</p>
      </div>

      <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#80576A]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by name, email, company, phone"
            className="w-full border border-[#1D181A] bg-[#FFFDFB] py-2 pl-9 pr-3 text-xs text-[#1D181A] outline-none placeholder:text-[#80576A]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#1D181A]">
          <label htmlFor="statusFilter" className="font-medium">
            Status
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="border border-[#1D181A] bg-[#FFFDFB] px-2 py-2 text-xs text-[#1D181A] outline-none"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      <div className="border border-[#1D181A] bg-[#FFFDFB]">
        <table className="w-full table-fixed border-collapse text-xs">
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
                  Loading recruiters…
                </td>
              </tr>
            ) : error && recruiters.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-red-600">
                  Error: {error}
                </td>
              </tr>
            ) : recruiters.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="border border-[#1D181A] px-2 py-6 text-center text-[#80576A]">
                  No recruiters match your current search.
                </td>
              </tr>
            ) : (
              recruiters.map((recruiter, idx) => (
                <tr
                  key={recruiter._id}
                  onClick={() => navigate(`/recruiters/${recruiter._id}`)}
                  className={`cursor-pointer transition hover:bg-[#FFF0E8] ${idx % 2 === 0 ? 'bg-[#FFFDFB]' : 'bg-[#FFF4EF]/40'}`}
                >
                  {COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className={`border border-[#1D181A] px-2 py-2 text-[#1D181A] break-words ${
                        col.key === 'fullName' || col.key === 'companyName' ? 'font-medium' : ''
                      }`}
                    >
                      {renderCell(recruiter, col.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {!loading && recruiters.length > 0 && (
        <div className="flex flex-col gap-3 border border-[#EBC2AE] bg-[#FFF4EF] p-3 text-xs font-medium text-[#80576A] md:flex-row md:items-center md:justify-between">
          <div>
            Showing {recruiters.length} of {totalCount} recruiter(s)
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