import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const DUMMY_RECRUITERS = [
  {
    _id: '1',
    name: 'Rajesh Kumar',
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
    name: 'Priya Sharma',
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
    name: 'Amit Patel',
    uniqueId: 'REC-2026-003',
    email: 'amit@globaltech.co.in',
    phone: '+91 9876543212',
    companyName: 'Global Tech Pvt Ltd',
    companyWebsite: 'https://www.globaltech.co.in',
    gstNumber: '36AABCT9012H3Z0',
    accountStatus: 'suspended',
  },
];

export default function Recruiters() {
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Recruiters</h1>
        <p className="mt-1 text-sm text-slate-500">Manage and view all recruiter accounts on the platform.</p>
      </div>

      <div className="overflow-hidden  border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-600">
          <span>Recruiter Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Company Name</span>
          <span>Website</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading recruiters…</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-600">Error: {error}</div>
          ) : recruiters.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No recruiters found.</div>
          ) : (
            recruiters.map((recruiter) => (
              <div key={recruiter._id} className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1.2fr_0.8fr] gap-4 px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900">{recruiter.fullName || '—'}</p>
                </div>
                <div>
                  <p className="truncate text-slate-700">{recruiter.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-700">{recruiter.phone || '—'}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{recruiter.companyName || '—'}</p>
                </div>
                <div>
                  <p className="truncate text-blue-600 hover:underline">
                    {recruiter.companyWebsite ? (
                      <a href={recruiter.companyWebsite} target="_blank" rel="noopener noreferrer">
                        {recruiter.companyWebsite}
                      </a>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
                    recruiter.accountStatus === 'active' 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : recruiter.accountStatus === 'suspended'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {recruiter.accountStatus || 'unknown'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {recruiters.length > 0 && (
        <div className="mt-4 p-3 text-xs text-slate-600 bg-slate-100 rounded">
          Showing {recruiters.length} recruiter(s)
        </div>
      )}
    </div>
  );
}
