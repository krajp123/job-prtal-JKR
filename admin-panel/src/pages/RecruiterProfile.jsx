import { useEffect, useMemo, useState } from 'react';
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
  AlertTriangle,
  XCircle,
  Briefcase,
  Calendar,
  Lock,
  Unlock,
  Ban,
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
  MapPin,
  Hash,
  LayoutGrid,
  Plus,
  Minus,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Users,
  Copy,
  Check,
  ChevronRight,
  BarChart3,
  RefreshCcw,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

/* ------------------------------------------------------------------ */
/* Dummy fallback data — used only if the API call fails (dev/preview) */
/* ------------------------------------------------------------------ */
const DUMMY_RECRUITERS = {
  '1': {
    _id: '1',
    fullName: 'Rajesh Kumar',
    designation: 'HR Manager',
    uniqueId: 'REC-2026-001',
    email: 'rajesh@techcorp.com',
    phone: '+91 9876543210',
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
    companyDescription: 'Leading IT solutions provider in India with 500+ employees, focused on enterprise cloud migration and platform engineering.',
    kycDocuments: [
      { id: 'd1', name: 'Business Registration Certificate', uploadedAt: '2024-01-16', status: 'approved' },
      { id: 'd2', name: 'GST Certificate', uploadedAt: '2024-01-16', status: 'approved' },
      { id: 'd3', name: 'Authorized Signatory ID Proof', uploadedAt: '2024-01-17', status: 'approved' },
    ],
    loginHistory: [
      { id: 'l1', ip: '103.21.45.12', device: 'Chrome · Windows', timestamp: '2026-08-12 09:14' },
      { id: 'l2', ip: '103.21.45.12', device: 'Chrome · Windows', timestamp: '2026-08-10 18:02' },
      { id: 'l3', ip: '49.36.88.201', device: 'Safari · iPhone', timestamp: '2026-08-07 11:41' },
    ],
    adminActions: [
      { id: 'a1', action: 'Verified account', admin: 'Neha Sinha', reason: '', timestamp: '2024-01-18 10:22' },
      { id: 'a2', action: 'Approved GST document', admin: 'Neha Sinha', reason: '', timestamp: '2024-01-18 10:20' },
    ],
    jobs: [
      { id: 'j1', title: 'Senior Frontend Developer', status: 'active', applications: 34 },
      { id: 'j2', title: 'Product Manager', status: 'active', applications: 21 },
      { id: 'j3', title: 'DevOps Engineer', status: 'closed', applications: 12 },
    ],
    transactions: [
      { id: 't1', type: 'Wallet Recharge', amount: 2000, timestamp: '2026-08-01 14:22' },
      { id: 't2', type: 'Job Posting Fee', amount: -299, timestamp: '2026-08-03 09:10' },
      { id: 't3', type: 'Featured Listing', amount: -499, timestamp: '2026-08-05 16:45' },
    ],
    flags: [],
    adminNotes: '',
  },
  '2': {
    _id: '2',
    fullName: 'Amit Patel',
    designation: 'Founder',
    uniqueId: 'REC-2026-003',
    email: 'amit@globaltech.co.in',
    phone: '+91 9876543212',
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
    companyDescription: 'Global technology solutions provider.',
    kycDocuments: [
      { id: 'd1', name: 'Business Registration Certificate', uploadedAt: '2024-01-21', status: 'rejected' },
    ],
    loginHistory: [
      { id: 'l1', ip: '182.65.11.4', device: 'Firefox · Windows', timestamp: '2026-07-29 21:18' },
    ],
    adminActions: [
      { id: 'a1', action: 'Suspended account', admin: 'Neha Sinha', reason: 'Multiple spam complaints from candidates', timestamp: '2026-07-30 09:00' },
      { id: 'a2', action: 'Rejected registration document', admin: 'Rohan Verma', reason: 'Mismatch with GST records', timestamp: '2024-01-22 12:00' },
    ],
    jobs: [{ id: 'j1', title: 'Data Entry Operator', status: 'flagged', applications: 5 }],
    transactions: [{ id: 't1', type: 'Wallet Recharge', amount: 500, timestamp: '2024-01-25 11:00' }],
    flags: [
      { id: 'f1', reason: 'Fake job posting reported by 4 candidates', status: 'open', reportedAt: '2026-07-28' },
      { id: 'f2', reason: 'Requested payment from applicants', status: 'open', reportedAt: '2026-07-29' },
    ],
    adminNotes: 'Watch closely — pattern matches known fake-job scam reports from Q1.',
  },
};

const TABS = [
  { key: 'jobs', label: 'Jobs Posted', icon: Briefcase },
  { key: 'wallet', label: 'Wallet & Billing', icon: Wallet },
  { key: 'activity', label: 'Activity Log', icon: Clock },
  { key: 'kyc', label: 'KYC & Documents', icon: FileText },
  { key: 'flags', label: 'Flags & Reports', icon: Flag },
  { key: 'notes', label: 'Admin Notes', icon: StickyNote },
];

/* ------------------------------------------------------------------ */
/* Fonts + tokens — a three-way type system: serif for identity/large   */
/* numerals, grotesk sans for UI text, monospace for data & ledgers.    */
/* ------------------------------------------------------------------ */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
      .rc-root { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; letter-spacing: -0.011em; }
      .rc-identity { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.012em; }
      .rc-serif { font-family: 'Fraunces', ui-serif, Georgia, serif; font-feature-settings: 'ss01' 1; }
      .rc-mono { font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
      .rc-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
      .rc-scrollbar::-webkit-scrollbar-thumb { background: #EAD6C9; border-radius: 4px; }
      .rc-rail-glow {
        background: radial-gradient(120% 90% at 20% -10%, rgba(199,85,96,0.10), transparent 55%),
                    radial-gradient(90% 70% at 100% 0%, rgba(247,197,107,0.14), transparent 60%);
      }
    `}</style>
  );
}

/* ------------------------------------------------------------------ */
/* Presentational primitives                                           */
/* ------------------------------------------------------------------ */

const STATUS_DOT = {
  active: '#1f9d63', verified: '#1f9d63', approved: '#1f9d63', resolved: '#1f9d63',
  suspended: '#C0392B', banned: '#C0392B', rejected: '#C0392B', flagged: '#C0392B',
  pending: '#C7891F', open: '#1f9d63', closed: '#C0392B',
};

const STATUS_LIGHT_BG = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  verified: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  banned: 'bg-red-50 text-red-700 ring-red-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  flagged: 'bg-red-50 text-red-700 ring-red-600/20',
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  closed: 'bg-red-50 text-red-700 ring-red-600/20',
};

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function StatusPill({ status, size = 'md' }) {
  const cls = STATUS_LIGHT_BG[status] || 'bg-gray-100 text-gray-600 ring-gray-500/20';
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-bold capitalize ring-1 ring-inset ${pad} ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_DOT[status] || '#8A8A8A' }} />
      {status || 'unknown'}
    </span>
  );
}

/** Tiny copy-to-clipboard control used next to IDs, emails, GST numbers etc. */
function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button onClick={copy} className="inline-flex items-center text-[#C2A99E] hover:text-[#C75560] transition" title="Copy">
      {copied ? <Check size={11} /> : <Copy size={11} />}
    </button>
  );
}

/** Signature element — a trust scorecard: gauge + the factors that built it. */
function TrustScorecard({ score, factors }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = clamped >= 75 ? '#1f9d63' : clamped >= 45 ? '#C7891F' : '#C0392B';

  return (
    <div className="rounded-xl border border-[#F0E1D6] bg-white p-3">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} stroke="#F3E9E3" strokeWidth={stroke} fill="none" />
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="rc-serif text-lg font-semibold text-[#1D181A] leading-none">{clamped}</span>
            <span className="text-[7px] font-bold text-[#A08A93] uppercase tracking-[0.14em] mt-0.5">Trust</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase font-bold tracking-[0.08em] text-[#C75560]">Composite Score</p>
          <p className="text-[10px] text-[#80576A] leading-relaxed mt-0.5">Verification, reports &amp; KYC combined.</p>
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-[#F3E9E3] space-y-1">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center justify-between text-[10px]">
            <span className="text-[#5B4A50]">{f.label}</span>
            <span className={`rc-mono font-bold flex items-center gap-0.5 ${f.delta > 0 ? 'text-emerald-600' : f.delta < 0 ? 'text-red-600' : 'text-[#A08A93]'}`}>
              {f.delta > 0 ? <TrendingUp size={11} /> : f.delta < 0 ? <TrendingDown size={11} /> : null}
              {f.delta > 0 ? `+${f.delta}` : f.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function computeTrustScore(r) {
  if (!r) return { score: 0, factors: [] };
  let score = 60;
  const factors = [{ label: 'Baseline', delta: 60 }];

  if (r.verificationStatus === 'verified') { score += 20; factors.push({ label: 'Verified account', delta: 20 }); }
  else if (r.verificationStatus === 'pending') { score += 4; factors.push({ label: 'Verification pending', delta: 4 }); }
  else if (r.verificationStatus === 'rejected') { score -= 25; factors.push({ label: 'Verification rejected', delta: -25 }); }

  if (r.accountStatus === 'suspended') { score -= 20; factors.push({ label: 'Account suspended', delta: -20 }); }
  if (r.accountStatus === 'banned') { score -= 45; factors.push({ label: 'Account banned', delta: -45 }); }

  const openFlags = (r.flags || []).filter((f) => f.status === 'open').length;
  if (openFlags) { score -= openFlags * 12; factors.push({ label: `${openFlags} open report${openFlags > 1 ? 's' : ''}`, delta: -openFlags * 12 }); }

  const docs = r.kycDocuments || [];
  if (docs.length) {
    const approved = docs.filter((d) => d.status === 'approved').length;
    const bonus = Math.round((approved / docs.length) * 10);
    score += bonus;
    factors.push({ label: 'KYC completeness', delta: bonus });
  }
  if ((r.totalHires || 0) >= 10) { score += 5; factors.push({ label: 'Strong hiring record', delta: 5 }); }

  return { score: Math.max(0, Math.min(100, Math.round(score))), factors };
}

function KpiCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-xl border border-[#F0E1D6] bg-white p-2.5 flex gap-2 flex-1 min-w-[100px]">
      <div className="h-6 w-6 rounded-lg bg-[#FFF0E8] text-[#C75560] flex items-center justify-center shrink-0">
        {Icon && <Icon size={12} />}
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="rc-serif text-base font-semibold text-[#1D181A] leading-none">{value}</p>
        <p className="text-[8px] uppercase font-bold tracking-[0.07em] text-[#A08A93]">{label}</p>
      </div>
    </div>
  );
}

function SectionCard({ eyebrow, title, icon: Icon, action, children }) {
  return (
    <div className="rounded-xl border border-[#F0E1D6] bg-white shadow-[0_1px_2px_rgba(29,24,26,0.04),0_10px_28px_-16px_rgba(29,24,26,0.10)]">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 pt-3 pb-2.5 border-b border-[#F3E9E3]">
          <div>
            {eyebrow && <p className="text-[9px] uppercase font-bold tracking-[0.1em] text-[#C75560] mb-0.5">{eyebrow}</p>}
            <h3 className="font-bold text-[#1D181A] flex items-center gap-2 text-[14px]">
              {Icon && <Icon size={15} className="text-[#80576A]" />}
              {title}
            </h3>
          </div>
          {action}
        </div>
      )}
      <div className="p-3.5 sm:p-4">{children}</div>
    </div>
  );
}

function EmptyState({ label }) {
  return <p className="text-xs text-[#A08A93] py-8 text-center">{label}</p>;
}

function ConfirmModal({ open, title, description, confirmLabel = 'Confirm', danger = false, requireReason = false, reason, setReason, onConfirm, onClose, loading }) {
  if (!open) return null;
  return (
    <div className="rc-root fixed inset-0 z-50 flex items-center justify-center bg-[#1D181A]/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-[#F0E1D6] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-1">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-red-50 text-red-600' : 'bg-[#FFF0E8] text-[#C75560]'}`}>
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="font-bold text-[#1D181A] text-[13px]">{title}</h3>
            <p className="text-[11px] text-[#80576A] mt-1 leading-relaxed">{description}</p>
          </div>
        </div>
        {requireReason && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason for this action (required — saved to the audit log)…"
            className="w-full rounded-lg border border-[#F0E1D6] bg-[#FFFBF9] p-2.5 text-[12px] mt-3 focus:outline-none focus:ring-2 focus:ring-[#C75560]/40 focus:border-[#C75560] transition"
          />
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#80576A] hover:bg-[#FFF4EF] transition">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || (requireReason && !reason.trim())}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40 transition shadow-sm ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#C75560] hover:bg-[#A0182C]'}`}
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recruiter Analytics Chart Component                                 */
/* ------------------------------------------------------------------ */

const METRICS = [
  { key: 'jobs_posted', label: 'Jobs Posted', unit: '', color: '#C75560' },
  { key: 'shortlisted', label: 'Shortlisted', unit: '', color: '#3B7A6B' },
  { key: 'selected', label: 'Selected', unit: '', color: '#2E7D32' },
  { key: 'resume_downloads', label: 'Resume Downloads', unit: '', color: '#5B6FBF' },
  { key: 'resume_spend', label: 'Resume Spend', unit: '₹', color: '#B8863F' },
  { key: 'rejected', label: 'Rejected', unit: '', color: '#B0413E' },
];

const TIME_RANGES = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
];

// Generate dummy analytics data for demo
function generateDummyAnalyticsData(metricKey, days) {
  const data = [];
  const ranges = {
    jobs_posted: [0, 5],
    shortlisted: [0, 30],
    selected: [0, 15],
    resume_downloads: [0, 50],
    resume_spend: [0, 5000],
    rejected: [0, 20],
  };
  const [min, max] = ranges[metricKey] || [0, 10];

  for (let i = days; i > 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      value,
    });
  }
  return data;
}

// Round a range up to "nice" tick values (1/2/5 × 10^n), evenly spaced
function niceTicks(maxValue, tickCount = 4) {
  const safeMax = Math.max(maxValue, 1);
  const rawStep = safeMax / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const normalized = rawStep / magnitude;
  let niceStep;
  if (normalized <= 1) niceStep = 1 * magnitude;
  else if (normalized <= 2) niceStep = 2 * magnitude;
  else if (normalized <= 5) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMax = Math.ceil(safeMax / niceStep) * niceStep;
  const ticks = [];
  for (let v = 0; v <= niceMax + 1e-9; v += niceStep) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function formatMetricValue(unit, value) {
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? rounded.toLocaleString('en-IN') : rounded.toLocaleString('en-IN');
  return unit === '₹' ? `₹${display}` : display;
}

function RecruiterAnalyticsChart({ recruiterId }) {
  const [selectedMetric, setSelectedMetric] = useState('jobs_posted');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const currentMetric = METRICS.find((m) => m.key === selectedMetric);
  const currentRange = TIME_RANGES.find((t) => t.key === selectedTimeRange);

  // Fetch analytics data from backend
  useEffect(() => {
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const response = await adminAxiosInstance.get(
          `/users/recruiters/${recruiterId}/analytics`,
          { params: { metric: selectedMetric, days: currentRange.days } }
        );
        setAnalyticsData(response.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        setAnalyticsData(generateDummyAnalyticsData(selectedMetric, currentRange.days));
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [selectedMetric, selectedTimeRange, recruiterId]);

  const chartData = analyticsData.length > 0 ? analyticsData : generateDummyAnalyticsData(selectedMetric, currentRange.days);

  // Chart geometry — compact height, extra left padding for currency labels which run wider
  const chartWidth = 680;
  const chartHeight = 148;
  const padding = useMemo(
    () => ({ top: 10, right: 10, bottom: 20, left: currentMetric.unit === '₹' ? 48 : 32 }),
    [currentMetric]
  );
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const values = chartData.map((d) => d.value);
  const dataMax = Math.max(...values, 0);
  const ticks = useMemo(() => niceTicks(dataMax, 3), [dataMax]);
  const yMax = ticks[ticks.length - 1] || 1;

  // Bar geometry — slim bars, slot per data point with generous spacing
  const slotWidth = innerWidth / (chartData.length || 1);
  const barWidth = Math.max(2, Math.min(slotWidth * 0.32, 14));

  const points = chartData.map((d, i) => {
    const barHeight = (d.value / yMax) * innerHeight;
    return {
      x: padding.left + slotWidth * i + slotWidth / 2,
      y: padding.top + innerHeight - barHeight,
      barHeight,
      value: d.value,
      date: d.date,
      fullDate: d.fullDate,
    };
  });

  // Trend: compare the average of the second half of the range vs. the first half
  const trend = useMemo(() => {
    if (values.length < 2) return { pct: 0, direction: 'flat' };
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    if (firstAvg === 0) {
      if (secondAvg === 0) return { pct: 0, direction: 'flat' };
      return { pct: 100, direction: 'up' };
    }
    const pct = ((secondAvg - firstAvg) / firstAvg) * 100;
    return { pct: Math.round(Math.abs(pct)), direction: pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat' };
  }, [values]);

  const total = values.reduce((a, b) => a + b, 0);

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;
  // Clamp tooltip so it never clips past the chart edges
  const tooltipWidth = 88;
  const tooltipX = hovered ? Math.min(Math.max(hovered.x, padding.left + tooltipWidth / 2), chartWidth - padding.right - tooltipWidth / 2) : 0;

  return (
    <div className="rounded-xl border border-[#F0E1D6] bg-white shadow-[0_1px_2px_rgba(29,24,26,0.04),0_10px_28px_-16px_rgba(29,24,26,0.10)] overflow-hidden">
      {/* Header */}
      <div className="px-3.5 sm:px-4 pt-3 pb-2 border-b border-[#F3E9E3]">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <p className="text-[8px] uppercase font-bold tracking-[0.1em] text-[#C75560] mb-0.5">Analytics</p>
            <h3 className="font-bold text-[#1D181A] flex items-center gap-1.5 text-[12.5px]">
              <BarChart3 size={13} className="text-[#80576A]" />
              Recruiter Analytics
            </h3>
          </div>

          {/* KPI headline — current metric total for the selected range, with trend */}
          <div className="text-right shrink-0">
            <p className="rc-mono text-[15px] sm:text-[16px] font-bold text-[#1D181A] leading-none">
              {formatMetricValue(currentMetric.unit, total)}
            </p>
            <div
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                trend.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : trend.direction === 'down'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-[#F3E9E3] text-[#80576A]'
              }`}
            >
              {trend.direction === 'up' && <TrendingUp size={10} />}
              {trend.direction === 'down' && <TrendingDown size={10} />}
              {trend.direction === 'flat' ? 'Flat' : `${trend.pct}%`}
              <span className="font-medium opacity-70">vs prior period</span>
            </div>
          </div>
        </div>

        {/* Metric tabs — scrollable on mobile */}
        <div className="overflow-x-auto rc-scrollbar -mx-3.5 sm:-mx-4 px-3.5 sm:px-4">
          <div className="flex gap-1.5 min-w-max">
            {METRICS.map((metric) => (
              <button
                key={metric.key}
                onClick={() => {
                  setSelectedMetric(metric.key);
                  setHoveredIndex(null);
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition flex items-center gap-1 ${
                  selectedMetric === metric.key
                    ? 'bg-[#C75560] text-white'
                    : 'border border-[#F0E1D6] text-[#5B4A50] hover:bg-[#FFF4EF]'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: selectedMetric === metric.key ? 'rgba(255,255,255,0.85)' : metric.color }}
                />
                {metric.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-3.5 sm:p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold text-[#80576A]">
            {currentMetric.label} · {currentRange.label === '7D' ? 'Last 7 days' : currentRange.label === '30D' ? 'Last 30 days' : currentRange.label === '6M' ? 'Last 6 months' : 'Last 12 months'}
          </p>
          <div className="flex gap-0.5 rounded-md border border-[#F0E1D6] p-0.5">
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                onClick={() => {
                  setSelectedTimeRange(range.key);
                  setHoveredIndex(null);
                }}
                className={`px-2 py-0.5 rounded text-[9px] font-bold transition ${
                  selectedTimeRange === range.key ? 'bg-[#1D181A] text-white' : 'text-[#80576A] hover:bg-[#FFF4EF]'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rc-scrollbar">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full min-w-[520px]"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Horizontal gridlines with nice, evenly-spaced tick values */}
            {ticks.map((tick, i) => {
              const y = padding.top + innerHeight - (tick / yMax) * innerHeight;
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#F3E9E3"
                    strokeWidth="1"
                    strokeDasharray={i === 0 ? '0' : '3 3'}
                  />
                  <text x={padding.left - 8} y={y + 3} textAnchor="end" className="text-[9px] fill-[#A08A93] rc-mono">
                    {formatMetricValue(currentMetric.unit, tick)}
                  </text>
                </g>
              );
            })}

            {/* X-axis date labels, thinned out so they never overlap */}
            {points.map((p, i) => {
              const maxLabels = 7;
              const skip = Math.max(1, Math.ceil(points.length / maxLabels));
              if (i % skip !== 0 && i !== points.length - 1) return null;
              return (
                <text
                  key={`label-${i}`}
                  x={p.x}
                  y={chartHeight - padding.bottom + 18}
                  textAnchor="middle"
                  className="text-[9px] fill-[#80576A]"
                >
                  {p.date}
                </text>
              );
            })}

            {/* Bars */}
            <defs>
              <linearGradient id="bar-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={currentMetric.color} stopOpacity="1" />
                <stop offset="100%" stopColor={currentMetric.color} stopOpacity="0.72" />
              </linearGradient>
            </defs>
            {points.map((p, i) => (
              <g key={`bar-${i}`}>
                {/* Wider invisible hit-area so thin bars are still easy to hover */}
                <rect
                  x={p.x - Math.max(barWidth, slotWidth * 0.9) / 2}
                  y={padding.top}
                  width={Math.max(barWidth, slotWidth * 0.9)}
                  height={innerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIndex(i)}
                  style={{ cursor: 'pointer' }}
                />
                <rect
                  x={p.x - barWidth / 2}
                  y={p.y}
                  width={barWidth}
                  height={Math.max(p.barHeight, p.value > 0 ? 2 : 0)}
                  rx={2}
                  fill={hoveredIndex === i ? currentMetric.color : 'url(#bar-gradient)'}
                  opacity={hoveredIndex === null || hoveredIndex === i ? 1 : 0.55}
                  style={{ transition: 'opacity 120ms ease' }}
                />
              </g>
            ))}

            {/* Tooltip drawn last so it sits above everything else */}
            {hovered && (
              <g transform={`translate(${tooltipX}, ${Math.max(hovered.y - 38, padding.top)})`}>
                <rect x={-tooltipWidth / 2} y="0" width={tooltipWidth} height="32" rx="6" fill="#1D181A" />
                <text x="0" y="13" textAnchor="middle" className="text-[9px] fill-[#D9C4B8] font-semibold">
                  {hovered.fullDate}
                </text>
                <text x="0" y="25" textAnchor="middle" className="text-[12px] fill-white font-bold rc-mono">
                  {formatMetricValue(currentMetric.unit, hovered.value)}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                            */
/* ------------------------------------------------------------------ */

export default function RecruiterProfile() {
  const { recruiterId } = useParams();
  const navigate = useNavigate();

  const [recruiter, setRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('jobs');
  const [jobsPage, setJobsPage] = useState(1);
  const JOBS_PER_PAGE = 5;

  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);

  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const [walletModal, setWalletModal] = useState(null);
  const [walletAmount, setWalletAmount] = useState('');

  const [notification, setNotification] = useState(null);

  // Function to load recruiter data
  const loadRecruiter = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await adminAxiosInstance.get(`/users/recruiters/${recruiterId}`);
      const payload = response.data || {};
      const normalized = {
        ...payload,
        walletBalance: Number(payload.walletBalance ?? 0),
        jobs: payload.jobs || [],
        transactions: payload.transactions || [],
        adminActions: payload.adminActions || [],
        loginHistory: payload.loginHistory || [],
        kycDocuments: payload.kycDocuments || [],
        flags: payload.flags || [],
        adminNotes: payload.adminNotes || '',
      };
      setRecruiter(normalized);
      setNotesDraft(normalized?.adminNotes || '');
      setError(null);
    } catch (err) {
      console.error('Failed to load recruiter:', err);
      setError(err.response?.data?.error || err.message);
      const fallback = DUMMY_RECRUITERS[recruiterId];
      setRecruiter(fallback || null);
      setNotesDraft(fallback?.adminNotes || '');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  };

  useEffect(() => {
    loadRecruiter(false);
  }, [recruiterId]);

  const { score: trustScore, factors: trustFactors } = useMemo(() => computeTrustScore(recruiter), [recruiter]);
  const openFlags = useMemo(() => (recruiter?.flags || []).filter((f) => f.status === 'open'), [recruiter]);
  const pendingDocs = useMemo(() => (recruiter?.kycDocuments || []).filter((d) => d.status === 'pending'), [recruiter]);

  const attentionItems = useMemo(() => {
    const items = [];
    if (recruiter?.verificationStatus === 'pending') items.push({ label: 'Verification pending review', tab: 'kyc' });
    if (pendingDocs.length) items.push({ label: `${pendingDocs.length} document${pendingDocs.length > 1 ? 's' : ''} awaiting review`, tab: 'kyc' });
    if (openFlags.length) items.push({ label: `${openFlags.length} open report${openFlags.length > 1 ? 's' : ''}`, tab: 'flags' });
    return items;
  }, [recruiter, pendingDocs, openFlags]);

  const jobsTotalPages = Math.max(1, Math.ceil((recruiter?.jobs?.length || 0) / JOBS_PER_PAGE));
  const jobsPageSafe = Math.min(jobsPage, jobsTotalPages);
  const paginatedJobs = useMemo(() => {
    const jobs = recruiter?.jobs || [];
    const start = (jobsPageSafe - 1) * JOBS_PER_PAGE;
    return jobs.slice(start, start + JOBS_PER_PAGE);
  }, [recruiter?.jobs, jobsPageSafe]);
  const paddedJobs = useMemo(() => {
    const fillerCount = Math.max(0, JOBS_PER_PAGE - paginatedJobs.length);
    return [...paginatedJobs, ...Array.from({ length: fillerCount }, (_, index) => ({
      __placeholder: true,
      id: `placeholder-${index}-${jobsPageSafe}`,
    }))];
  }, [paginatedJobs, jobsPageSafe]);

  useEffect(() => {
    setJobsPage(1);
  }, [recruiterId, recruiter?.jobs?.length]);

  useEffect(() => {
    if (jobsPage > jobsTotalPages) {
      setJobsPage(jobsTotalPages);
    }
  }, [jobsPage, jobsTotalPages]);

  /* ---------------- API helpers ---------------- */

  const closeModal = () => { setModal(null); setReason(''); };
  const openModal = (config) => { setReason(''); setModal(config); };

  const runPatch = async (path, body, updates) => {
    setModalLoading(true);
    try {
      await adminAxiosInstance.patch(`/users/recruiters/${recruiterId}/${path}`, body);
      setRecruiter((prev) => ({ ...prev, ...updates }));
      closeModal();
      // Success notification
      const actionName = path.replace(/-/g, ' ').toUpperCase();
      setNotification({ type: 'success', message: `✓ ${actionName} completed successfully` });
      setTimeout(() => setNotification(null), 3000);
      console.log(`✓ ${actionName} completed successfully`);
    } catch (err) {
      console.error(`Failed: ${path}`, err);
      const errorMsg = err.response?.data?.error || path.replace(/-/g, ' ');
      setNotification({ type: 'error', message: `✗ Action failed: ${errorMsg}` });
      setTimeout(() => setNotification(null), 4000);
      alert(`Action failed: ${errorMsg}`);
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerify = () =>
    openModal({
      title: 'Verify this recruiter?',
      description: 'The account will be marked verified and unlock full posting privileges.',
      confirmLabel: 'Verify account',
      run: () => runPatch('verify', {}, { verificationStatus: 'verified' }),
    });

  const handleRejectVerification = () =>
    openModal({
      title: 'Reject verification',
      description: 'The recruiter will be notified and asked to re-submit documents.',
      confirmLabel: 'Reject verification',
      danger: true,
      requireReason: true,
      run: () => runPatch('reject-verification', { reason }, { verificationStatus: 'rejected' }),
    });

  const handleSuspend = () =>
    openModal({
      title: 'Suspend this account?',
      description: 'Recruiter loses access immediately. This is reversible from this page.',
      confirmLabel: 'Suspend account',
      danger: true,
      requireReason: true,
      run: () => runPatch('suspend', { reason }, { accountStatus: 'suspended' }),
    });

  const handleActivate = () =>
    openModal({
      title: 'Reactivate this account?',
      description: 'The recruiter regains full access to the platform.',
      confirmLabel: 'Reactivate account',
      run: () => runPatch('activate', {}, { accountStatus: 'active' }),
    });

  const handleBan = () =>
    openModal({
      title: 'Permanently ban this recruiter?',
      description: 'Hard block — the recruiter cannot log in or re-register with this email. This cannot be undone from this page.',
      confirmLabel: 'Ban permanently',
      danger: true,
      requireReason: true,
      // NOTE: /ban endpoint doesn't exist in the backend yet — confirm route + schema before wiring this up for real.
      run: () => runPatch('ban', { reason }, { accountStatus: 'banned' }),
    });

  const handleResetPassword = () =>
    openModal({
      title: 'Send password reset link?',
      description: `A reset link will be emailed to ${recruiter?.email}.`,
      confirmLabel: 'Send reset link',
      run: async () => {
        setModalLoading(true);
        try {
          await adminAxiosInstance.post(`/users/recruiters/${recruiterId}/reset-password`);
          closeModal();
        } catch (err) {
          console.error('Failed to send reset link:', err);
          alert('Failed to send password reset link');
        } finally {
          setModalLoading(false);
        }
      },
    });

  const handleSendMessage = () => navigate(`/messages/new?recruiterId=${recruiterId}`);

  const handleDocumentAction = async (docId, status) => {
    try {
      await adminAxiosInstance.patch(`/users/recruiters/${recruiterId}/documents/${docId}`, { status });
      setRecruiter((prev) => ({
        ...prev,
        kycDocuments: prev.kycDocuments.map((d) => (d.id === docId ? { ...d, status } : d)),
      }));
      console.log(`✓ Document ${status} successfully`);
    } catch (err) {
      console.error('Failed to update document status:', err);
      alert(`Failed to update document status: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await adminAxiosInstance.patch(`/users/recruiters/${recruiterId}/notes`, { adminNotes: notesDraft });
      setRecruiter((prev) => ({ ...prev, adminNotes: notesDraft }));
      console.log('✓ Notes saved successfully');
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert(`Failed to save admin notes: ${err.response?.data?.error || err.message}`);
    } finally {
      setNotesSaving(false);
    }
  };

  const handleWalletSubmit = () => {
    const amt = Number(walletAmount);
    if (!amt || amt <= 0) return;
    const mode = walletModal.mode;
    openModal({
      title: `${mode === 'credit' ? 'Credit' : 'Debit'} ₹${amt} ${mode === 'credit' ? 'to' : 'from'} wallet?`,
      description: 'This adjustment is recorded in the transaction ledger and activity log.',
      confirmLabel: mode === 'credit' ? 'Add funds' : 'Deduct funds',
      danger: mode === 'debit',
      requireReason: true,
      // NOTE: manual wallet adjustment endpoint doesn't exist yet — confirm route + schema before wiring this up for real.
      run: () =>
        runPatch(
          'wallet/adjust',
          { amount: mode === 'credit' ? amt : -amt, reason },
          { walletBalance: (recruiter.walletBalance || 0) + (mode === 'credit' ? amt : -amt) }
        ),
    });
    setWalletModal(null);
    setWalletAmount('');
  };

  /* ---------------- loading / error states ---------------- */

  if (loading) {
    return <div className="rc-root min-h-[60vh] flex items-center justify-center text-[#80576A] text-xs">Loading recruiter profile…</div>;
  }

  if (!recruiter) {
    return (
      <div className="rc-root space-y-4">
        <GlobalStyle />
        <button onClick={() => navigate('/recruiters')} className="flex items-center gap-2 text-[#C75560] hover:text-[#A0182C] transition text-xs font-semibold">
          <ArrowLeft size={16} /> Back to Recruiters
        </button>
        <div className="py-16 text-center text-[#80576A]">{error ? `Error: ${error}` : 'Recruiter not found'}</div>
      </div>
    );
  }

  const accountAgeDays = Math.max(0, Math.round((Date.now() - new Date(recruiter.createdAt).getTime()) / 86400000));
  const currentTabMeta = TABS.find((t) => t.key === activeTab);

  // Notification Toast
  const NotificationToast = () => {
    if (!notification) return null;
    const isSuccess = notification.type === 'success';
    return (
      <div className={`fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-50 ${
        isSuccess ? 'bg-emerald-600' : 'bg-red-600'
      }`}>
        {notification.message}
      </div>
    );
  };

  return (
    <div className="rc-root max-w-[1360px] mx-auto bg-[#FFFDFB]">
      <GlobalStyle />
      <NotificationToast />

      <button onClick={() => navigate('/recruiters')} className="flex items-center gap-1.5 text-[#A08A93] hover:text-[#C75560] transition text-[13px] font-semibold mb-3">
        <ArrowLeft size={15} /> Recruiters
      </button>

      <div className="flex flex-col lg:flex-row gap-3 pb-8">
        {/* ================= LEFT COMMAND RAIL ================= */}
        <aside className="lg:w-[280px] shrink-0">
          <div className="lg:sticky lg:top-4 space-y-3">
            {/* Identity card */}
            <div className="rc-rail-glow rc-identity rounded-xl border border-[#F0E1D6] bg-white overflow-hidden">
              <div className="p-3.5">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shadow-md overflow-hidden ${recruiter.profilePictureUrl ? 'bg-gray-100' : 'bg-gradient-to-br from-[#C75560] to-[#D9654A] shadow-[#C75560]/20'}`}>
                  {recruiter.profilePictureUrl ? (
                    <>
                      <img
                        src={recruiter.profilePictureUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement?.querySelector('.fallback-avatar')?.classList.remove('hidden');
                        }}
                      />
                      <span className="fallback-avatar rc-serif hidden text-lg font-semibold text-white h-full w-full items-center justify-center bg-gradient-to-br from-[#C75560] to-[#D9654A]">
                        {recruiter.fullName?.charAt(0) || '?'}
                      </span>
                    </>
                  ) : (
                    <span className="rc-serif text-lg font-semibold text-white flex h-full w-full items-center justify-center bg-gradient-to-br from-[#C75560] to-[#D9654A]">
                      {recruiter.fullName?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
                <h1 className="text-[17px] font-extrabold tracking-tight text-[#1D181A] leading-tight mt-2">{recruiter.fullName}</h1>
                <p className="text-[11px] font-medium text-[#80576A] mt-1">
                  {recruiter.designation || 'Designation not provided'}
                </p>
                <p className="text-[11px] font-semibold text-[#A08A93] mt-0.5">
                  {recruiter.companyName || 'Company not provided'}
                </p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  <StatusPill status={recruiter.accountStatus} size="sm" />
                  <StatusPill status={recruiter.verificationStatus} size="sm" />
                </div>

                <div className="mt-3 pt-3 border-t border-[#F3E9E3] space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#A08A93]"><Hash size={12} /> ID</span>
                    <span className="text-[#1D181A] font-semibold flex items-center gap-1.5">{recruiter.uniqueId}<CopyField value={recruiter.uniqueId} /></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#A08A93]"><Mail size={12} /> Email</span>
                    <span className="text-[#1D181A] font-semibold flex items-center gap-1.5 truncate max-w-[150px]">{recruiter.email}<CopyField value={recruiter.email} /></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#A08A93]"><Phone size={12} /> Phone</span>
                    <span className="text-[#1D181A] font-semibold flex items-center gap-1.5">{recruiter.phone}<CopyField value={recruiter.phone} /></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#A08A93]"><Calendar size={12} /> Joined</span>
                    <span className="text-[#1D181A] font-medium">{recruiter.createdAt ? new Date(recruiter.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 gap-1.5 px-3.5 pb-3.5">
                <button 
                  onClick={() => loadRecruiter(true)} 
                  disabled={refreshing}
                  className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-600 px-3 py-2 text-[11px] font-semibold hover:bg-slate-100 transition disabled:opacity-60"
                >
                  <RefreshCcw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing…' : 'Refresh Data'}
                </button>
                {recruiter.verificationStatus !== 'verified' && (
                  <button onClick={handleVerify} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-[#C75560] text-white px-3 py-2 text-[11px] font-bold hover:bg-[#A0182C] transition">
                    <ShieldCheck size={14} /> Verify Account
                  </button>
                )}
                {recruiter.verificationStatus !== 'rejected' && (
                  <button onClick={handleRejectVerification} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#F0E1D6] px-3 py-2 text-[11px] font-semibold text-[#5B4A50] hover:bg-[#FFF4EF] transition">
                    <ShieldAlert size={13} /> Reject
                  </button>
                )}
                <button onClick={handleSendMessage} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#F0E1D6] px-3 py-2 text-[11px] font-semibold text-[#5B4A50] hover:bg-[#FFF4EF] transition">
                  <MessageSquare size={13} /> Message
                </button>
                <button onClick={handleResetPassword} className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-[#F0E1D6] px-3 py-2 text-[11px] font-semibold text-[#5B4A50] hover:bg-[#FFF4EF] transition">
                  <KeyRound size={13} /> Reset Password
                </button>
              </div>
            </div>

            {/* Trust scorecard */}
            <TrustScorecard score={trustScore} factors={trustFactors} />
          </div>
        </aside>

        {/* ================= RIGHT CONTENT ================= */}
        <main className="flex-1 min-w-0 space-y-3.5">
          {/* Mobile tab bar — hidden, using the new tab navigation below Company Details instead */}

          {/* Company Profile Card — always visible */}
          <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
                <div className="flex items-start gap-3 pb-4">
                  {/* Company Logo */}
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-md overflow-hidden ${recruiter.companyLogoUrl ? 'bg-gray-100' : 'bg-gradient-to-br from-[#C75560] to-[#D9654A]'}`}>
                    {recruiter.companyLogoUrl ? (
                      <img src={recruiter.companyLogoUrl} alt="Company Logo" className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : null}
                    <span className="rc-serif text-base font-bold text-white" style={{ display: recruiter.companyLogoUrl ? 'none' : 'block' }}>{getInitials(recruiter.companyName)}</span>
                  </div>
                  {/* Company Name */}
                  <div className="flex-1 min-w-0">
                    <h2 className="rc-serif text-[16px] font-semibold text-[#1D181A]">{recruiter.companyName}</h2>
                    <p className="text-[12px] text-[#80576A] mt-0.5">{recruiter.email.split('@')[1] || 'N/A'}</p>
                  </div>
                </div>
                
                {/* Company Info Grid - 5 items */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-[#F3E9E3] pt-3">
                  {/* 1. Company Website */}
                  <div className="flex items-start gap-2.5">
                    <Globe size={14} className="text-[#C7891F] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[#A08A93] text-[10px] uppercase font-bold tracking-wide">Website</p>
                      <a href={recruiter.companyWebsite} target="_blank" rel="noreferrer" className="text-[#C75560] font-semibold text-[12px] mt-0.5 hover:underline truncate block">
                        {recruiter.companyWebsite?.replace('https://', '').replace('http://', '') || 'N/A'}
                      </a>
                    </div>
                  </div>

                  {/* 2. Industry Type */}
                  <div className="flex items-start gap-2.5">
                    <Briefcase size={14} className="text-[#C7891F] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#A08A93] text-[10px] uppercase font-bold tracking-wide">Industry Type</p>
                      <p className="text-[#1D181A] font-semibold text-[12px] mt-0.5">{recruiter.industry || 'N/A'}</p>
                    </div>
                  </div>

                  {/* 3. Company Location */}
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-[#C7891F] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#A08A93] text-[10px] uppercase font-bold tracking-wide">Location</p>
                      <p className="text-[#1D181A] font-semibold text-[12px] mt-0.5 truncate">{recruiter.location || 'N/A'}</p>
                    </div>
                  </div>

                  {/* 4. Company Type */}
                  <div className="flex items-start gap-2.5">
                    <Users size={14} className="text-[#C7891F] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#A08A93] text-[10px] uppercase font-bold tracking-wide">Company Type</p>
                      <p className="text-[#1D181A] font-semibold text-[12px] mt-0.5">{recruiter.companyType || recruiter.companySize || 'N/A'}</p>
                    </div>
                  </div>

                  {/* 5. GST Number */}
                  <div className="flex items-start gap-2.5">
                    <Hash size={14} className="text-[#C7891F] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[#A08A93] text-[10px] uppercase font-bold tracking-wide">GST Number</p>
                      <p className="rc-mono text-[#1D181A] font-semibold text-[12px] mt-0.5 flex items-center gap-1.5">
                        {recruiter.companyGst || 'N/A'} 
                        {recruiter.companyGst && <CopyField value={recruiter.companyGst} />}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

          {/* Recruiter Analytics Chart */}
          <RecruiterAnalyticsChart recruiterId={recruiterId} />

          {/* Horizontal tab navigation — below company section */}
          <nav className="overflow-x-auto rc-scrollbar rounded-xl border border-[#F0E1D6] bg-white">
            <div className="flex gap-1 min-w-max">
              {TABS.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11px] font-semibold whitespace-nowrap transition ${
                      active ? 'bg-[#C75560] text-white' : 'text-[#5B4A50] hover:bg-[#FFF4EF]'
                    }`}
                  >
                    <Icon size={14} /> {t.label}
                    {t.key === 'flags' && openFlags.length > 0 && (
                      <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-bold ${active ? 'bg-white/25' : 'bg-red-100 text-red-700'}`}>{openFlags.length}</span>
                    )}
                    {t.key === 'kyc' && pendingDocs.length > 0 && (
                      <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-bold ${active ? 'bg-white/25' : 'bg-amber-100 text-amber-700'}`}>{pendingDocs.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Tab content */}
          {activeTab === 'kyc' && (
            <SectionCard eyebrow="Compliance" title="KYC Documents" icon={FileText}>
              {recruiter.kycDocuments?.length ? (
                <div className="divide-y divide-[#F3E9E3]">
                  {recruiter.kycDocuments.map((d) => (
                    <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-xs font-semibold text-[#1D181A]">{d.name}</p>
                        <p className="text-[11px] text-[#A08A93] mt-0.5">Uploaded {d.uploadedAt}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill status={d.status} />
                        <button className="flex items-center gap-1 rounded-lg border border-[#F0E1D6] px-2.5 py-1.5 text-[11px] font-semibold text-[#80576A] hover:bg-[#FFF4EF] transition">
                          <Eye size={13} /> View
                        </button>
                        <button className="flex items-center gap-1 rounded-lg border border-[#F0E1D6] px-2.5 py-1.5 text-[11px] font-semibold text-[#80576A] hover:bg-[#FFF4EF] transition">
                          <Download size={13} />
                        </button>
                        {d.status !== 'approved' && (
                          <button onClick={() => handleDocumentAction(d.id, 'approved')} className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition">
                            Approve
                          </button>
                        )}
                        {d.status !== 'rejected' && (
                          <button onClick={() => handleDocumentAction(d.id, 'rejected')} className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100 transition">
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No documents uploaded yet." />
              )}
            </SectionCard>
          )}

          {activeTab === 'jobs' && (
            <SectionCard eyebrow="Listings" title="Jobs Posted" icon={Briefcase}>
              {recruiter.jobs?.length ? (
                <>
                  <div className="overflow-x-auto rc-scrollbar -mx-1">
                    <table className="w-full text-xs min-w-[520px]">
                      <thead>
                        <tr className="text-left text-[9px] text-[#A08A93] uppercase tracking-wide border-b border-[#F3E9E3]">
                          <th className="py-2 px-3 font-bold">Title</th>
                          <th className="py-2 px-3 font-bold">Status</th>
                          <th className="py-2 px-3 font-bold text-right">Applications</th>
                          <th className="py-2 px-3 font-bold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paddedJobs.map((job, i) => (
                          job.__placeholder ? (
                            <tr key={job.id} className="border-b border-[#F3E9E3] last:border-0 bg-transparent">
                              <td className="py-2 px-3" colSpan={4}>&nbsp;</td>
                            </tr>
                          ) : (
                            <tr key={job.id} className={`border-b border-[#F3E9E3] last:border-0 ${i % 2 ? 'bg-[#FFFBF8]' : ''}`}>
                              <td className="py-2 px-3 font-semibold text-[11px] text-[#1D181A]">{job.title}</td>
                              <td className="py-2 px-3"><StatusPill status={job.status} size="sm" /></td>
                              <td className="py-2 px-3 rc-mono text-right text-[11px] text-[#1D181A]">{job.applications}</td>
                              <td className="py-2 px-3 text-right">
                                <button onClick={() => navigate(`/jobs/${job.id}`)} className="text-[10px] font-bold text-[#C75560] hover:text-[#A0182C] hover:underline">
                                  View →
                                </button>
                              </td>
                            </tr>
                          )
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {jobsTotalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#F3E9E3] pt-3">
                      <button
                        type="button"
                        onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                        disabled={jobsPageSafe === 1}
                        className="rounded-lg border border-[#F0E1D6] px-3 py-1.5 text-[10px] font-bold text-[#80576A] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#FFF4EF] transition"
                      >
                        Previous
                      </button>

                      <p className="text-[10px] text-[#80576A] font-semibold">
                        Page <span className="text-[#1D181A]">{jobsPageSafe}</span> of <span className="text-[#1D181A]">{jobsTotalPages}</span>
                      </p>

                      <button
                        type="button"
                        onClick={() => setJobsPage((p) => Math.min(jobsTotalPages, p + 1))}
                        disabled={jobsPageSafe === jobsTotalPages}
                        className="rounded-lg border border-[#F0E1D6] px-3 py-1.5 text-[10px] font-bold text-[#80576A] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[#FFF4EF] transition"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <EmptyState label="No jobs posted yet." />
              )}
            </SectionCard>
          )}

          {activeTab === 'wallet' && (
            <>
              <SectionCard
                eyebrow="Billing"
                title="Wallet Overview"
                icon={Wallet}
                action={
                  <div className="flex gap-2">
                    <button onClick={() => setWalletModal({ mode: 'credit' })} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition">
                      <Plus size={12} /> Add Funds
                    </button>
                    <button onClick={() => setWalletModal({ mode: 'debit' })} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-bold text-red-700 hover:bg-red-100 transition">
                      <Minus size={12} /> Deduct
                    </button>
                  </div>
                }
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-[#FFF9F5] border border-[#F0E1D6] p-3">
                    <p className="text-[10px] text-[#A08A93] uppercase font-bold tracking-wide">Current Balance</p>
                    <p className="rc-serif text-lg font-semibold text-[#1D181A] mt-1">₹{recruiter.walletBalance ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-[#FFF9F5] border border-[#F0E1D6] p-3">
                    <p className="text-[10px] text-[#A08A93] uppercase font-bold tracking-wide">Subscription Plan</p>
                    <p className="text-[13px] font-bold text-[#1D181A] mt-1">{recruiter.subscriptionPlan || '—'}</p>
                  </div>
                </div>

                {walletModal && (
                  <div className="mt-3 rounded-xl border border-[#F0E1D6] bg-[#FFF4EF] p-3 flex items-center gap-2">
                    <span className="rc-mono text-[12px] font-bold text-[#1D181A]">₹</span>
                    <input
                      type="number"
                      autoFocus
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder="Amount"
                      className="rc-mono flex-1 rounded-lg border border-[#F0E1D6] px-2.5 py-1.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-[#C75560]/40"
                    />
                    <button
                      onClick={handleWalletSubmit}
                      className={`rounded-lg px-4 py-2 text-xs font-bold text-white transition ${walletModal.mode === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                      Continue
                    </button>
                    <button onClick={() => { setWalletModal(null); setWalletAmount(''); }} className="text-xs text-[#80576A] font-semibold px-2">
                      Cancel
                    </button>
                  </div>
                )}
              </SectionCard>

              <SectionCard eyebrow="Ledger" title="Recent Transactions" icon={FileText}>
                {recruiter.transactions?.length ? (
                  <div className="divide-y divide-[#F3E9E3]">
                    {recruiter.transactions.map((t) => {
                      const displayLabel = (t.description && t.description !== 'Wallet Recharge') ? t.description : (t.type || 'Wallet transaction');
                      return (
                        <div key={t.id} className="flex items-center justify-between text-xs py-3 first:pt-0 last:pb-0">
                          <div>
                            <p className="text-[#1D181A] font-semibold">{displayLabel}</p>
                            <p className="rc-mono text-[11px] text-[#A08A93]">{t.timestamp}</p>
                          </div>
                          <p className={`rc-mono font-bold ${t.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {t.amount < 0 ? '-' : '+'}₹{Math.abs(t.amount)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState label="No transactions yet." />
                )}
              </SectionCard>
            </>
          )}

          {activeTab === 'activity' && (
            <>
              <SectionCard eyebrow="Security" title="Login History" icon={LogIn}>
                {recruiter.loginHistory?.length ? (
                  <div className="divide-y divide-[#F3E9E3]">
                    {recruiter.loginHistory.map((l) => (
                      <div key={l.id} className="flex items-center justify-between text-xs py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-[#1D181A] font-semibold">{l.device}</p>
                          <p className="rc-mono text-[11px] text-[#A08A93]">IP {l.ip}</p>
                        </div>
                        <p className="rc-mono text-[11px] text-[#A08A93]">{l.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No login activity recorded." />
                )}
              </SectionCard>

              <SectionCard eyebrow="Audit" title="Admin Action History" icon={Clock}>
                {recruiter.adminActions?.length ? (
                  <div className="divide-y divide-[#F3E9E3]">
                    {recruiter.adminActions.map((a) => (
                      <div key={a.id} className="flex items-start justify-between gap-3 text-xs py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-[#1D181A] font-semibold">{a.action}</p>
                          {a.reason && <p className="text-[11px] text-[#80576A] mt-0.5 italic">"{a.reason}"</p>}
                          <p className="text-[11px] text-[#A08A93] mt-0.5">{a.admin}</p>
                        </div>
                        <p className="rc-mono text-[11px] text-[#A08A93] shrink-0">{a.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="No admin actions recorded yet." />
                )}
              </SectionCard>
            </>
          )}

          {activeTab === 'flags' && (
            <SectionCard eyebrow="Trust & Safety" title="Flags & Reports" icon={Flag}>
              {recruiter.flags?.length ? (
                <div className="space-y-3">
                  {recruiter.flags.map((f) => (
                    <div key={f.id} className="rounded-xl border border-[#F0E1D6] p-4">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <p className="text-xs font-semibold text-[#1D181A]">{f.reason}</p>
                        <StatusPill status={f.status} />
                      </div>
                      <p className="rc-mono text-[11px] text-[#A08A93]">Reported {f.reportedAt}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState label="No reports against this recruiter." />
              )}
            </SectionCard>
          )}

          {activeTab === 'notes' && (
            <SectionCard eyebrow="Internal" title="Admin Notes" icon={StickyNote}>
              <p className="text-[10px] text-[#A08A93] mb-2.5">Visible to admins only — the recruiter never sees this.</p>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={5}
                placeholder="Add internal notes about this recruiter…"
                className="w-full rounded-lg border border-[#F0E1D6] bg-[#FFFBF9] p-2.5 text-[12px] text-[#1D181A] focus:outline-none focus:ring-2 focus:ring-[#C75560]/40 focus:border-[#C75560] transition"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="rounded-lg bg-[#C75560] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#A0182C] disabled:opacity-50 transition"
                >
                  {notesSaving ? 'Saving…' : 'Save Notes'}
                </button>
              </div>
            </SectionCard>
          )}

          {/* Danger zone — always visible, deliberately separated */}
          <div className="rounded-xl border border-red-200 bg-red-50/40 overflow-hidden">
            <div className="px-3.5 sm:px-4 pt-3 pb-2.5 border-b border-red-200/70">
            <p className="text-[10px] uppercase font-bold tracking-[0.1em] text-red-600 mb-0.5">Irreversible &amp; Destructive</p>
              <h3 className="font-bold text-[#1D181A] text-[14px]">Danger Zone</h3>
            </div>
            <div className="divide-y divide-red-200/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-4 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-[#1D181A]">
                    {recruiter.accountStatus === 'active' ? 'Suspend this account' : 'Reactivate this account'}
                  </p>
                  <p className="text-[11px] text-[#80576A] mt-0.5">
                    {recruiter.accountStatus === 'active' ? 'Temporarily blocks login and job posting. Fully reversible.' : 'Restores full platform access for this recruiter.'}
                  </p>
                </div>
                {recruiter.accountStatus === 'active' ? (
                  <button onClick={handleSuspend} className="rounded-xl border border-red-300 bg-white px-4 py-2 text-[11px] font-bold text-red-700 hover:bg-red-50 transition shrink-0">
                    <Lock size={13} className="inline mr-1.5 -mt-0.5" /> Suspend
                  </button>
                ) : (
                  recruiter.accountStatus !== 'banned' && (
                    <button onClick={handleActivate} className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 transition shrink-0">
                      <Unlock size={13} className="inline mr-1.5 -mt-0.5" /> Reactivate
                    </button>
                  )
                )}
              </div>
              {recruiter.accountStatus !== 'banned' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4">
                  <div>
                    <p className="text-xs font-semibold text-[#1D181A]">Permanently ban this recruiter</p>
                    <p className="text-[11px] text-[#80576A] mt-0.5">Hard block — cannot log in or re-register with this email. Cannot be undone here.</p>
                  </div>
                  <button onClick={handleBan} className="rounded-xl bg-red-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-red-700 transition shrink-0">
                    <Ban size={13} className="inline mr-1.5 -mt-0.5" /> Ban Permanently
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <ConfirmModal
        open={!!modal}
        title={modal?.title}
        description={modal?.description}
        confirmLabel={modal?.confirmLabel}
        danger={modal?.danger}
        requireReason={modal?.requireReason}
        reason={reason}
        setReason={setReason}
        loading={modalLoading}
        onClose={closeModal}
        onConfirm={() => modal?.run()}
      />
    </div>
  );
}