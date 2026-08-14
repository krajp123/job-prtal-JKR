import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Briefcase,
  Calendar,
  Lock,
  Unlock,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  KeyRound,
  Download,
  Eye,
  Flag,
  StickyNote,
  Clock,
  LogIn,
  Wallet,
  Users,
  MapPin,
  Hash,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const DUMMY_RECRUITERS = {
  '1': {
    _id: '1',
    fullName: 'Rajesh Kumar',
    designation: 'HR Manager',
    uniqueId: 'REC-2026-001',
    email: 'rajesh@techcorp.com',
    emailVerified: true,
    phone: '+91 9876543210',
    phoneVerified: true,
    companyName: 'Tech Corp India',
    companyWebsite: 'https://www.techcorp.com',
    companySize: '500-1000',
    industry: 'Information Technology',
    address: 'Sector 62, Noida, Uttar Pradesh',
    gstNumber: '27AABCT1234H1Z0',
    accountStatus: 'active',
    verificationStatus: 'verified',
    createdAt: '2024-01-15',
    totalJobsPosted: 24,
    activeJobs: 9,
    totalApplications: 156,
    totalHires: 18,
    walletBalance: 4250,
    subscriptionPlan: 'Growth Plan',
    companyDescription: 'Leading IT solutions provider in India with 500+ employees',
    kycDocuments: [
      { id: 'd1', name: 'Business Registration Certificate', uploadedAt: '2024-01-16', status: 'approved' },
      { id: 'd2', name: 'GST Certificate', uploadedAt: '2024-01-16', status: 'approved' },
      { id: 'd3', name: 'Authorized Signatory ID Proof', uploadedAt: '2024-01-17', status: 'approved' },
    ],
    loginHistory: [
      { id: 'l1', ip: '103.21.45.12', device: 'Chrome / Windows', timestamp: '2026-08-12 09:14' },
      { id: 'l2', ip: '103.21.45.12', device: 'Chrome / Windows', timestamp: '2026-08-10 18:02' },
      { id: 'l3', ip: '49.36.88.201', device: 'Safari / iPhone', timestamp: '2026-08-07 11:41' },
    ],
    adminActions: [
      { id: 'a1', action: 'Verified account', admin: 'Admin: Neha', timestamp: '2024-01-18 10:22' },
      { id: 'a2', action: 'Approved GST document', admin: 'Admin: Neha', timestamp: '2024-01-18 10:20' },
    ],
    jobs: [
      { id: 'j1', title: 'Senior Frontend Developer', status: 'active', applications: 34 },
      { id: 'j2', title: 'Product Manager', status: 'active', applications: 21 },
      { id: 'j3', title: 'DevOps Engineer', status: 'closed', applications: 12 },
    ],
    transactions: [
      { id: 't1', type: 'Recharge', amount: 2000, timestamp: '2026-08-01' },
      { id: 't2', type: 'Job Posting Fee', amount: -299, timestamp: '2026-08-03' },
      { id: 't3', type: 'Featured Listing', amount: -499, timestamp: '2026-08-05' },
    ],
    flags: [],
    communicationLog: [
      { id: 'c1', type: 'Email', subject: 'Welcome to the platform', timestamp: '2024-01-15' },
    ],
    adminNotes: '',
  },
  '2': {
    _id: '2',
    fullName: 'Priya Sharma',
    designation: 'Talent Acquisition Lead',
    uniqueId: 'REC-2026-002',
    email: 'priya@innovatehub.io',
    emailVerified: true,
    phone: '+91 9876543211',
    phoneVerified: false,
    companyName: 'Innovate Hub Solutions',
    companyWebsite: 'https://www.innovatehub.io',
    companySize: '50-200',
    industry: 'AI / Machine Learning',
    address: 'Koramangala, Bengaluru, Karnataka',
    gstNumber: '18AABCT5678H2Z0',
    accountStatus: 'active',
    verificationStatus: 'pending',
    createdAt: '2024-02-10',
    totalJobsPosted: 12,
    activeJobs: 5,
    totalApplications: 89,
    totalHires: 7,
    walletBalance: 1200,
    subscriptionPlan: 'Starter Plan',
    companyDescription: 'Innovation-focused startup focusing on AI and ML solutions',
    kycDocuments: [
      { id: 'd1', name: 'Business Registration Certificate', uploadedAt: '2024-02-11', status: 'pending' },
    ],
    loginHistory: [
      { id: 'l1', ip: '117.55.23.9', device: 'Chrome / macOS', timestamp: '2026-08-13 14:02' },
    ],
    adminActions: [],
    jobs: [
      { id: 'j1', title: 'ML Engineer', status: 'active', applications: 41 },
    ],
    transactions: [
      { id: 't1', type: 'Recharge', amount: 1500, timestamp: '2026-07-20' },
    ],
    flags: [
      { id: 'f1', reason: 'Candidate reported job description mismatch', status: 'open', reportedAt: '2026-08-05' },
    ],
    communicationLog: [],
    adminNotes: '',
  },
  '3': {
    _id: '3',
    fullName: 'Amit Patel',
    designation: 'Founder',
    uniqueId: 'REC-2026-003',
    email: 'amit@globaltech.co.in',
    emailVerified: true,
    phone: '+91 9876543212',
    phoneVerified: true,
    companyName: 'Global Tech Pvt Ltd',
    companyWebsite: 'https://www.globaltech.co.in',
    companySize: '10-50',
    industry: 'IT Services',
    address: 'Andheri East, Mumbai, Maharashtra',
    gstNumber: '36AABCT9012H3Z0',
    accountStatus: 'suspended',
    verificationStatus: 'rejected',
    createdAt: '2024-01-20',
    totalJobsPosted: 8,
    activeJobs: 0,
    totalApplications: 45,
    totalHires: 1,
    walletBalance: 0,
    subscriptionPlan: 'Free Plan',
    companyDescription: 'Global technology solutions provider',
    kycDocuments: [
      { id: 'd1', name: 'Business Registration Certificate', uploadedAt: '2024-01-21', status: 'rejected' },
    ],
    loginHistory: [
      { id: 'l1', ip: '182.65.11.4', device: 'Firefox / Windows', timestamp: '2026-07-29 21:18' },
    ],
    adminActions: [
      { id: 'a1', action: 'Suspended account — multiple spam complaints', admin: 'Admin: Neha', timestamp: '2026-07-30 09:00' },
      { id: 'a2', action: 'Rejected registration document — mismatch with GST', admin: 'Admin: Rohan', timestamp: '2024-01-22 12:00' },
    ],
    jobs: [
      { id: 'j1', title: 'Data Entry Operator', status: 'flagged', applications: 5 },
    ],
    transactions: [
      { id: 't1', type: 'Recharge', amount: 500, timestamp: '2024-01-25' },
    ],
    flags: [
      { id: 'f1', reason: 'Fake job posting reported by 4 candidates', status: 'open', reportedAt: '2026-07-28' },
      { id: 'f2', reason: 'Requested payment from applicants', status: 'open', reportedAt: '2026-07-29' },
    ],
    communicationLog: [
      { id: 'c1', type: 'Email', subject: 'Account suspension notice', timestamp: '2026-07-30' },
    ],
    adminNotes: 'Watch closely — pattern matches known fake-job scam reports from Q1.',
  },
};

const TABS = ['Overview', 'Documents', 'Jobs', 'Wallet', 'Activity Log', 'Flags', 'Notes'];

function StatusPill({ status }) {
  const map = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    banned: 'bg-red-50 text-red-700 border-red-200',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    closed: 'bg-gray-100 text-gray-600 border-gray-200',
    flagged: 'bg-red-50 text-red-700 border-red-200',
    open: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${cls}`}>
      {(status === 'active' || status === 'verified' || status === 'approved' || status === 'resolved') && <CheckCircle2 size={12} />}
      {(status === 'suspended' || status === 'banned' || status === 'rejected' || status === 'flagged') && <XCircle size={12} />}
      {status === 'pending' && <AlertCircle size={12} />}
      {status || 'Unknown'}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg bg-[#FFF9F5] border border-[#EBC2AE] p-4">
      <div className="flex items-center gap-2 text-[#80576A]">
        {Icon && <Icon size={14} />}
        <p className="text-xs uppercase font-semibold">{label}</p>
      </div>
      <p className="text-xl font-bold text-[#1D181A] mt-1">{value}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-[#EBC2AE] bg-white p-6 shadow-sm">
      {title && (
        <h3 className="font-semibold text-[#1D181A] mb-4 flex items-center gap-2">
          {Icon && <Icon size={18} className="text-[#C75560]" />}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

export default function RecruiterProfile() {
  const { recruiterId } = useParams();
  const navigate = useNavigate();
  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const response = await adminAxiosInstance.get(`/users/recruiters/${recruiterId}`);
        setRecruiter(response.data);
        setNotesDraft(response.data?.adminNotes || '');
        setError(null);
      } catch (err) {
        console.error('Failed to load recruiter:', err);
        setError(err.message);
        const fallback = DUMMY_RECRUITERS[recruiterId];
        setRecruiter(fallback);
        setNotesDraft(fallback?.adminNotes || '');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [recruiterId]);

  const patchStatus = async (path, updates) => {
    setActionLoading(true);
    try {
      await adminAxiosInstance.patch(`/users/recruiters/${recruiterId}/${path}`);
      setRecruiter((prev) => ({ ...prev, ...updates }));
    } catch (err) {
      console.error(`Failed to ${path} recruiter:`, err);
      alert(`Failed to ${path.replace('-', ' ')} recruiter`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = () => patchStatus('suspend', { accountStatus: 'suspended' });
  const handleActivate = () => patchStatus('activate', { accountStatus: 'active' });
  const handleVerify = () => patchStatus('verify', { verificationStatus: 'verified' });
  const handleRejectVerification = () => patchStatus('reject-verification', { verificationStatus: 'rejected' });

  const handleResetPassword = async () => {
    setActionLoading(true);
    try {
      await adminAxiosInstance.post(`/users/recruiters/${recruiterId}/reset-password`);
      alert('Password reset link sent to recruiter email');
    } catch (err) {
      console.error('Failed to send reset link:', err);
      alert('Failed to send password reset link');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendMessage = () => {
    navigate(`/messages/new?recruiterId=${recruiterId}`);
  };

  const handleDocumentAction = async (docId, status) => {
    setActionLoading(true);
    try {
      await adminAxiosInstance.patch(`/users/recruiters/${recruiterId}/documents/${docId}`, { status });
      setRecruiter((prev) => ({
        ...prev,
        kycDocuments: prev.kycDocuments.map((d) => (d.id === docId ? { ...d, status } : d)),
      }));
    } catch (err) {
      console.error('Failed to update document status:', err);
      alert('Failed to update document status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await adminAxiosInstance.patch(`/users/recruiters/${recruiterId}/notes`, { adminNotes: notesDraft });
      setRecruiter((prev) => ({ ...prev, adminNotes: notesDraft }));
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Failed to save admin notes');
    } finally {
      setNotesSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/recruiters')}
          className="flex items-center gap-2 text-[#C75560] hover:text-[#A0182C] transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back to Recruiters</span>
        </button>
        <div className="py-12 text-center text-[#80576A]">Loading recruiter profile…</div>
      </div>
    );
  }

  if (error && !recruiter) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/recruiters')}
          className="flex items-center gap-2 text-[#C75560] hover:text-[#A0182C] transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back to Recruiters</span>
        </button>
        <div className="py-12 text-center text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!recruiter) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/recruiters')}
          className="flex items-center gap-2 text-[#C75560] hover:text-[#A0182C] transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back to Recruiters</span>
        </button>
        <div className="py-12 text-center text-[#80576A]">Recruiter not found</div>
      </div>
    );
  }

  const openFlags = (recruiter.flags || []).filter((f) => f.status === 'open');

  return (
    <div className="space-y-6">
      {/* Top nav */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/recruiters')}
          className="flex items-center gap-2 text-[#C75560] hover:text-[#A0182C] transition"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold">Back to Recruiters</span>
        </button>
        <h1 className="text-2xl font-bold text-[#1D181A]">Recruiter Profile</h1>
        <div className="w-24" />
      </div>

      {/* Identity strip */}
      <div className="rounded-xl border border-[#EBC2AE] bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-[#FFF0E8] border border-[#EBC2AE] flex items-center justify-center text-xl font-bold text-[#C75560] shrink-0">
              {recruiter.fullName?.charAt(0) || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[#1D181A]">{recruiter.fullName}</h2>
                <StatusPill status={recruiter.accountStatus} />
                <StatusPill status={recruiter.verificationStatus} />
              </div>
              <p className="text-sm text-[#80576A] mt-0.5">
                {recruiter.designation ? `${recruiter.designation} · ` : ''}
                {recruiter.companyName} <span className="text-[#C75560]">·</span> ID: {recruiter.uniqueId}
              </p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {recruiter.verificationStatus !== 'verified' && (
              <button
                onClick={handleVerify}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <ShieldCheck size={14} /> Verify
              </button>
            )}
            {recruiter.verificationStatus !== 'rejected' && (
              <button
                onClick={handleRejectVerification}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <ShieldAlert size={14} /> Reject
              </button>
            )}
            {recruiter.accountStatus === 'active' ? (
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Lock size={14} /> Suspend
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={actionLoading}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Unlock size={14} /> Activate
              </button>
            )}
            <button
              onClick={handleSendMessage}
              className="flex items-center gap-1.5 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-2 text-xs font-semibold text-[#80576A] hover:bg-[#FFF0E8]"
            >
              <MessageSquare size={14} /> Message
            </button>
            <button
              onClick={handleResetPassword}
              disabled={actionLoading}
              className="flex items-center gap-1.5 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-2 text-xs font-semibold text-[#80576A] hover:bg-[#FFF0E8] disabled:opacity-50"
            >
              <KeyRound size={14} /> Reset Password
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-[#EBC2AE]">
          <KpiCard label="Jobs Posted" value={recruiter.totalJobsPosted ?? 0} icon={Briefcase} />
          <KpiCard label="Active Jobs" value={recruiter.activeJobs ?? 0} icon={Briefcase} />
          <KpiCard label="Applications" value={recruiter.totalApplications ?? 0} icon={Users} />
          <KpiCard label="Hires Made" value={recruiter.totalHires ?? 0} icon={CheckCircle2} />
          <KpiCard
            label="Member Since"
            value={recruiter.createdAt ? new Date(recruiter.createdAt).toLocaleDateString() : '—'}
            icon={Calendar}
          />
          <KpiCard label="Wallet Balance" value={`₹${recruiter.walletBalance ?? 0}`} icon={Wallet} />
        </div>
      </div>

      {/* Flags banner */}
      {openFlags.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
          <Flag size={18} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">
            {openFlags.length} open report{openFlags.length > 1 ? 's' : ''} against this recruiter — review the Flags tab.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#EBC2AE]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${
              activeTab === tab
                ? 'text-[#A0182C] border-b-2 border-[#C75560]'
                : 'text-[#80576A] hover:text-[#C75560]'
            }`}
          >
            {tab}
            {tab === 'Flags' && openFlags.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 text-[10px] font-bold h-4 w-4">
                {openFlags.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'Overview' && (
            <>
              <SectionCard title="Contact Information" icon={Mail}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-[#C75560] shrink-0" />
                    <div>
                      <p className="text-xs text-[#80576A] flex items-center gap-1">
                        Email {recruiter.emailVerified && <CheckCircle2 size={11} className="text-emerald-600" />}
                      </p>
                      <p className="text-sm text-[#1D181A] font-medium">{recruiter.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-[#C75560] shrink-0" />
                    <div>
                      <p className="text-xs text-[#80576A] flex items-center gap-1">
                        Phone {recruiter.phoneVerified && <CheckCircle2 size={11} className="text-emerald-600" />}
                      </p>
                      <p className="text-sm text-[#1D181A] font-medium">{recruiter.phone || '—'}</p>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Company Information" icon={Building2}>
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#80576A] uppercase font-semibold mb-1">Company Name</p>
                      <p className="text-sm text-[#1D181A] font-medium">{recruiter.companyName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#80576A] uppercase font-semibold mb-1">Industry</p>
                      <p className="text-sm text-[#1D181A] font-medium">{recruiter.industry || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#80576A] uppercase font-semibold mb-1">Company Size</p>
                      <p className="text-sm text-[#1D181A] font-medium">{recruiter.companySize || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#80576A] uppercase font-semibold mb-1 flex items-center gap-1">
                        <Hash size={11} /> GST Number
                      </p>
                      <p className="text-sm text-[#1D181A] font-mono">{recruiter.gstNumber || '—'}</p>
                    </div>
                  </div>

                  {recruiter.companyDescription && (
                    <div>
                      <p className="text-xs text-[#80576A] uppercase font-semibold mb-1">Description</p>
                      <p className="text-sm text-[#1D181A]">{recruiter.companyDescription}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-[#80576A] uppercase font-semibold mb-1">Website</p>
                    {recruiter.companyWebsite ? (
                      <a
                        href={recruiter.companyWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#C75560] hover:underline font-medium flex items-center gap-2"
                      >
                        <Globe size={14} />
                        {recruiter.companyWebsite}
                      </a>
                    ) : (
                      <p className="text-sm text-[#80576A]">—</p>
                    )}
                  </div>

                  {recruiter.address && (
                    <div>
                      <p className="text-xs text-[#80576A] uppercase font-semibold mb-1 flex items-center gap-1">
                        <MapPin size={11} /> Address
                      </p>
                      <p className="text-sm text-[#1D181A]">{recruiter.address}</p>
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="Communication Log" icon={MessageSquare}>
                {recruiter.communicationLog?.length ? (
                  <div className="space-y-3">
                    {recruiter.communicationLog.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-sm border-b border-[#EBC2AE] last:border-0 pb-3 last:pb-0">
                        <div>
                          <p className="text-[#1D181A] font-medium">{c.subject}</p>
                          <p className="text-xs text-[#80576A]">{c.type}</p>
                        </div>
                        <p className="text-xs text-[#80576A]">{c.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#80576A]">No communication logged yet.</p>
                )}
              </SectionCard>
            </>
          )}

          {activeTab === 'Documents' && (
            <SectionCard title="KYC / Verification Documents" icon={FileText}>
              {recruiter.kycDocuments?.length ? (
                <div className="space-y-3">
                  {recruiter.kycDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#EBC2AE] p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1D181A]">{doc.name}</p>
                        <p className="text-xs text-[#80576A]">Uploaded {doc.uploadedAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={doc.status} />
                        <button className="p-2 rounded-lg border border-[#EBC2AE] text-[#80576A] hover:bg-[#FFF9F5]" title="Preview">
                          <Eye size={14} />
                        </button>
                        <button className="p-2 rounded-lg border border-[#EBC2AE] text-[#80576A] hover:bg-[#FFF9F5]" title="Download">
                          <Download size={14} />
                        </button>
                        {doc.status !== 'approved' && (
                          <button
                            onClick={() => handleDocumentAction(doc.id, 'approved')}
                            disabled={actionLoading}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {doc.status !== 'rejected' && (
                          <button
                            onClick={() => handleDocumentAction(doc.id, 'rejected')}
                            disabled={actionLoading}
                            className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#80576A]">No documents uploaded yet.</p>
              )}
            </SectionCard>
          )}

          {activeTab === 'Jobs' && (
            <SectionCard title="Jobs Posted" icon={Briefcase}>
              {recruiter.jobs?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[#80576A] uppercase border-b border-[#EBC2AE]">
                        <th className="py-2 pr-4 font-semibold">Job Title</th>
                        <th className="py-2 pr-4 font-semibold">Status</th>
                        <th className="py-2 pr-4 font-semibold">Applications</th>
                        <th className="py-2 pr-4 font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {recruiter.jobs.map((job) => (
                        <tr key={job.id} className="border-b border-[#EBC2AE] last:border-0">
                          <td className="py-3 pr-4 font-medium text-[#1D181A]">{job.title}</td>
                          <td className="py-3 pr-4"><StatusPill status={job.status} /></td>
                          <td className="py-3 pr-4 text-[#1D181A]">{job.applications}</td>
                          <td className="py-3 pr-4 text-right">
                            <button
                              onClick={() => navigate(`/jobs/${job.id}`)}
                              className="text-xs font-semibold text-[#C75560] hover:text-[#A0182C] hover:underline"
                            >
                              View Job
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[#80576A]">No jobs posted yet.</p>
              )}
            </SectionCard>
          )}

          {activeTab === 'Wallet' && (
            <>
              <SectionCard title="Wallet Overview" icon={Wallet}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-[#FFF9F5] border border-[#EBC2AE] p-4">
                    <p className="text-xs text-[#80576A] uppercase font-semibold">Current Balance</p>
                    <p className="text-2xl font-bold text-[#1D181A] mt-1">₹{recruiter.walletBalance ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-[#FFF9F5] border border-[#EBC2AE] p-4">
                    <p className="text-xs text-[#80576A] uppercase font-semibold">Subscription Plan</p>
                    <p className="text-lg font-bold text-[#1D181A] mt-1">{recruiter.subscriptionPlan || '—'}</p>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Recent Transactions" icon={FileText}>
                {recruiter.transactions?.length ? (
                  <div className="space-y-3">
                    {recruiter.transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm border-b border-[#EBC2AE] last:border-0 pb-3 last:pb-0">
                        <div>
                          <p className="text-[#1D181A] font-medium">{t.type}</p>
                          <p className="text-xs text-[#80576A]">{t.timestamp}</p>
                        </div>
                        <p className={`font-semibold ${t.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {t.amount < 0 ? '-' : '+'}₹{Math.abs(t.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#80576A]">No transactions yet.</p>
                )}
              </SectionCard>
            </>
          )}

          {activeTab === 'Activity Log' && (
            <>
              <SectionCard title="Login History" icon={LogIn}>
                {recruiter.loginHistory?.length ? (
                  <div className="space-y-3">
                    {recruiter.loginHistory.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-sm border-b border-[#EBC2AE] last:border-0 pb-3 last:pb-0">
                        <div>
                          <p className="text-[#1D181A] font-medium">{l.device}</p>
                          <p className="text-xs text-[#80576A]">IP: {l.ip}</p>
                        </div>
                        <p className="text-xs text-[#80576A]">{l.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#80576A]">No login activity recorded.</p>
                )}
              </SectionCard>

              <SectionCard title="Admin Action History" icon={Clock}>
                {recruiter.adminActions?.length ? (
                  <div className="space-y-3">
                    {recruiter.adminActions.map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm border-b border-[#EBC2AE] last:border-0 pb-3 last:pb-0">
                        <div>
                          <p className="text-[#1D181A] font-medium">{a.action}</p>
                          <p className="text-xs text-[#80576A]">{a.admin}</p>
                        </div>
                        <p className="text-xs text-[#80576A]">{a.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#80576A]">No admin actions recorded yet.</p>
                )}
              </SectionCard>
            </>
          )}

          {activeTab === 'Flags' && (
            <SectionCard title="Flags / Reports" icon={Flag}>
              {recruiter.flags?.length ? (
                <div className="space-y-3">
                  {recruiter.flags.map((f) => (
                    <div key={f.id} className="rounded-lg border border-[#EBC2AE] p-4">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-sm font-medium text-[#1D181A]">{f.reason}</p>
                        <StatusPill status={f.status} />
                      </div>
                      <p className="text-xs text-[#80576A]">Reported on {f.reportedAt}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#80576A]">No reports against this recruiter.</p>
              )}
            </SectionCard>
          )}

          {activeTab === 'Notes' && (
            <SectionCard title="Admin Notes (internal only)" icon={StickyNote}>
              <p className="text-xs text-[#80576A] mb-3">
                Visible to admins only — the recruiter cannot see this.
              </p>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={6}
                placeholder="Add internal notes about this recruiter…"
                className="w-full rounded-lg border border-[#EBC2AE] p-3 text-sm text-[#1D181A] focus:outline-none focus:ring-2 focus:ring-[#C75560] focus:border-transparent"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="rounded-lg bg-[#C75560] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A0182C] disabled:opacity-50"
                >
                  {notesSaving ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right rail — quick actions + flags summary */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#EBC2AE] bg-white p-6 shadow-sm sticky top-4">
            <h3 className="font-semibold text-[#1D181A] mb-4">Quick Links</h3>
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab('Jobs')}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-sm font-semibold text-[#80576A] transition hover:bg-[#FFF0E8]"
              >
                <Briefcase size={16} />
                View Jobs
              </button>
              <button
                onClick={() => setActiveTab('Documents')}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-sm font-semibold text-[#80576A] transition hover:bg-[#FFF0E8]"
              >
                <FileText size={16} />
                Review Documents
              </button>
              <button
                onClick={() => setActiveTab('Wallet')}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-sm font-semibold text-[#80576A] transition hover:bg-[#FFF0E8]"
              >
                <Wallet size={16} />
                View Wallet
              </button>
              <button className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100">
                <Trash2 size={16} />
                Delete Account
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-[#EBC2AE]">
              <h4 className="text-sm font-semibold text-[#1D181A] mb-3 flex items-center gap-2">
                <Flag size={14} className="text-[#C75560]" />
                Flags Summary
              </h4>
              {openFlags.length > 0 ? (
                <p className="text-sm text-red-700 font-medium">{openFlags.length} open report{openFlags.length > 1 ? 's' : ''}</p>
              ) : (
                <p className="text-sm text-[#80576A]">No open reports</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


