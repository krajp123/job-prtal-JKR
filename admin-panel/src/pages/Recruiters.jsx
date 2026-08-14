import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    async function load() {
      try {
        const response = await adminAxiosInstance.get('/users/recruiters');
        const realData = response.data || [];

        console.log('Real recruiters from API:', realData);

        // Use only real data, not dummy
        setRecruiters(realData);
        setError(null);
      } catch (error) {
        console.error('Failed to load recruiters:', error);
        setError(error.message);
        // Fallback to dummy data if API fails
        setRecruiters(DUMMY_RECRUITERS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
                  No recruiters found.
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

      {recruiters.length > 0 && (
        <div className="p-3 text-xs font-medium text-[#80576A] bg-[#FFF4EF] border border-[#EBC2AE] rounded">
          Showing {recruiters.length} recruiter(s)
        </div>
      )}
    </div>
  );
}