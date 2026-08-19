import { useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Building2, IndianRupee, Briefcase, TrendingUp, TrendingDown,
  Download, ChevronDown, ArrowUpRight, ArrowDownRight, Flag, Ticket, Mail,
  MessageSquare, Clock, Award, AlertTriangle, CheckCircle2, FileSpreadsheet,
  FileText, Target, Activity,
} from 'lucide-react';

/* ---------------------------------------------------------
   Brand tokens
--------------------------------------------------------- */
const COLORS = {
  coral: '#C75560',
  rust: '#D9654A',
  amber: '#F7C56B',
  dustyRose: '#80576A',
  ivorySoft: '#FFF4EF',
  ivory: '#FFFDFB',
  border: '#EBC2AE',
  black: '#1D181A',
};
const PIE_COLORS = [COLORS.coral, COLORS.rust, COLORS.amber, COLORS.dustyRose, '#B98A79'];

/* ---------------------------------------------------------
   Mock data generators (backend wiring comes later)
--------------------------------------------------------- */
const RANGES = ['1D', '7D', '1M', '6M', '1Y'];

function seedRand(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function generateGrowthData(range) {
  const config = {
    '1D': { points: 12, labelFn: (i) => `${(i * 2).toString().padStart(2, '0')}:00`, base: 4 },
    '7D': { points: 7, labelFn: (i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], base: 60 },
    '1M': { points: 30, labelFn: (i) => `${i + 1}`, base: 55 },
    '6M': { points: 26, labelFn: (i) => `W${i + 1}`, base: 380 },
    '1Y': { points: 12, labelFn: (i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i], base: 1600 },
  }[range];

  return Array.from({ length: config.points }, (_, i) => {
    const growth = 1 + i / (config.points * 2.2);
    const candidates = Math.round(config.base * growth * (1.3 + seedRand(i + 1) * 0.6));
    const recruiters = Math.round((config.base * growth * (0.18 + seedRand(i + 21) * 0.1)));
    return { label: config.labelFn(i), candidates, recruiters };
  });
}

const REVENUE_DATA = [
  { label: 'Jan', revenue: 420000, refunds: 8200 },
  { label: 'Feb', revenue: 465000, refunds: 6100 },
  { label: 'Mar', revenue: 520000, refunds: 9400 },
  { label: 'Apr', revenue: 490000, refunds: 7300 },
  { label: 'May', revenue: 580000, refunds: 5800 },
  { label: 'Jun', revenue: 625000, refunds: 6900 },
];

const PLAN_SPLIT = [
  { name: 'Recruiter Subscriptions', value: 68 },
  { name: 'Candidate ₹9 Registration', value: 14 },
  { name: 'Featured Job Listings', value: 12 },
  { name: 'Other', value: 6 },
];

const FUNNEL_DATA = [
  { stage: 'Applied', count: 18400 },
  { stage: 'Shortlisted', count: 6900 },
  { stage: 'Interviewed', count: 3100 },
  { stage: 'Offered', count: 1250 },
  { stage: 'Hired', count: 940 },
];

const JOB_CATEGORY_DATA = [
  { name: 'IT & Software', value: 34 },
  { name: 'Sales & Marketing', value: 21 },
  { name: 'Finance', value: 16 },
  { name: 'Operations', value: 15 },
  { name: 'Others', value: 14 },
];

const TOP_RECRUITERS = [
  { company: 'Wexford Analytics', jobsPosted: 42, hires: 31, avgResponse: '3h', score: 96 },
  { company: 'Nimbus Retail Pvt Ltd', jobsPosted: 37, hires: 24, avgResponse: '5h', score: 91 },
  { company: 'Solstice Fintech', jobsPosted: 29, hires: 22, avgResponse: '2h', score: 89 },
  { company: 'Kavya Textiles', jobsPosted: 25, hires: 15, avgResponse: '9h', score: 78 },
  { company: 'BrightPath Logistics', jobsPosted: 21, hires: 12, avgResponse: '11h', score: 72 },
];

const KPI_CARDS = [
  { label: "Today's Candidates", value: '146', change: '+12.4%', up: true, icon: UserPlus },
  { label: "Today's Recruiters", value: '18', change: '+4.1%', up: true, icon: Building2 },
  { label: 'Revenue (30D)', value: '₹6.25L', change: '+7.8%', up: true, icon: IndianRupee },
  { label: 'Active Job Posts', value: '2,184', change: '-2.3%', up: false, icon: Briefcase },
];

const DELIVERY_STATS = [
  { label: 'Email (Nodemailer)', sent: '48,210', success: 98.4, icon: Mail },
  { label: 'SMS / OTP (Twilio)', sent: '21,940', success: 96.1, icon: MessageSquare },
  { label: 'Chat Response (Socket.io)', sent: '9,320 msgs', success: 99.2, icon: Activity },
];

const MODERATION_STATS = [
  { label: 'Flagged Job Posts', value: 14, icon: Flag, tone: 'warn' },
  { label: 'Open Support Tickets', value: 27, icon: Ticket, tone: 'warn' },
  { label: 'Resolved This Week', value: 63, icon: CheckCircle2, tone: 'good' },
  { label: 'Suspected Fraud Flags', value: 3, icon: AlertTriangle, tone: 'bad' },
];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'growth', label: 'Growth & Registrations' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'jobs', label: 'Jobs & Applications' },
  { id: 'recruiters', label: 'Recruiter Performance' },
  { id: 'health', label: 'Platform Health' },
];

/* ---------------------------------------------------------
   Small building blocks
--------------------------------------------------------- */
function Card({ title, subtitle, children, className = '' }) {
  return (
    <section
      className={`rounded-lg border p-3 shadow-sm ${className}`}
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivory }}
    >
      {(title || subtitle) && (
        <div className="mb-1">
          {title && <h2 className="text-sm font-semibold" style={{ color: COLORS.black }}>{title}</h2>}
          {subtitle && <p className="mt-0.5 text-[11px]" style={{ color: COLORS.dustyRose }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function KpiCard({ label, value, change, up, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-lg border p-2.5"
      style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivory }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
            style={{ backgroundColor: COLORS.ivorySoft, color: COLORS.coral }}
          >
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-semibold leading-none tracking-tight" style={{ color: COLORS.black }}>{value}</p>
            <p className="mt-1 truncate text-[11px] leading-tight" style={{ color: COLORS.dustyRose }}>{label}</p>
          </div>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
          style={{
            backgroundColor: up ? '#E7F5EC' : '#FBEAEA',
            color: up ? '#1E8A4C' : '#C63D3D',
          }}
        >
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </span>
      </div>
    </motion.div>
  );
}

function TimeRangeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className="relative rounded-md px-2.5 py-1 text-[11px] font-semibold outline-none transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C75560]"
          style={{ color: value === r ? COLORS.ivory : COLORS.dustyRose }}
        >
          {value === r && (
            <motion.span
              layoutId="range-pill"
              className="absolute inset-0 rounded-md"
              style={{ backgroundColor: COLORS.coral }}
              transition={{ type: 'spring', duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{r}</span>
        </button>
      ))}
    </div>
  );
}

function ExportMenu() {
  const [open, setOpen] = useState(false);
  const options = [
    { label: 'Export as CSV', icon: FileSpreadsheet },
    { label: 'Export as Excel', icon: FileSpreadsheet },
    { label: 'Export as PDF', icon: FileText },
  ];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold outline-none focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C75560]"
        style={{ borderColor: COLORS.border, color: COLORS.black, backgroundColor: COLORS.ivory }}
      >
        <Download size={15} />
        Export
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-lg border shadow-lg"
            style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivory }}
          >
            {options.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs outline-none hover:bg-[#FFF4EF] focus:outline-none focus-visible:bg-[#FFF4EF]"
                style={{ color: COLORS.black }}
              >
                <Icon size={14} style={{ color: COLORS.coral }} />
                {label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border px-3 py-2 text-xs shadow-lg" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivory }}>
      <p className="mb-1 font-medium" style={{ color: COLORS.black }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{p.value.toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------
   Tab content sections
--------------------------------------------------------- */
function OverviewTab({ growthData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Signups Trend" subtitle="Candidates vs recruiters, selected period">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={growthData} margin={{ left: -12, right: 12, top: 8 }}>
              <defs>
                <linearGradient id="candGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.coral} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={COLORS.coral} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.amber} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={COLORS.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Area type="monotone" dataKey="candidates" name="Candidates" stroke={COLORS.coral} fill="url(#candGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="recruiters" name="Recruiters" stroke={COLORS.amber} fill="url(#recGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Application Funnel" subtitle="Applied → Hired conversion, last 30 days">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={FUNNEL_DATA} layout="vertical" margin={{ left: 8, right: 24, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" width={90} tick={{ fontSize: 12, fill: COLORS.black }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Bar dataKey="count" name="Candidates" radius={[0, 8, 8, 0]}>
                {FUNNEL_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Monthly Revenue" subtitle="Gross revenue for the last six months" className="lg:col-span-2">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE_DATA} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Bar dataKey="revenue" name="Revenue (₹)" fill={COLORS.coral} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function GrowthTab({ range, onRangeChange, growthData }) {
  const totalCandidates = growthData.reduce((s, d) => s + d.candidates, 0);
  const totalRecruiters = growthData.reduce((s, d) => s + d.recruiters, 0);
  const peak = growthData.reduce((max, d) => (d.candidates > max.candidates ? d : max), growthData[0]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: COLORS.dustyRose }}>Registration activity for the selected period</p>
        <TimeRangeToggle value={range} onChange={onRangeChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
          <p className="text-xs font-medium" style={{ color: COLORS.dustyRose }}>New Candidates ({range})</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: COLORS.black }}>{totalCandidates.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
          <p className="text-xs font-medium" style={{ color: COLORS.dustyRose }}>New Recruiters ({range})</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: COLORS.black }}>{totalRecruiters.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
          <p className="text-xs font-medium" style={{ color: COLORS.dustyRose }}>Peak Registration</p>
          <p className="mt-1 text-2xl font-semibold" style={{ color: COLORS.black }}>{peak.label}</p>
        </div>
      </div>

      <Card title="Registration Trend" subtitle="Bucketed by hour, day, week, or month based on the selected range">
        <div className="mt-4 h-64 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="candidates" name="Candidates" stroke={COLORS.coral} strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="recruiters" name="Recruiters" stroke={COLORS.amber} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function RevenueTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Revenue vs Refunds" subtitle="Last six months">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={REVENUE_DATA} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue (₹)" fill={COLORS.coral} radius={[8, 8, 0, 0]} />
              <Bar dataKey="refunds" name="Refunds (₹)" fill={COLORS.dustyRose} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Revenue by Source" subtitle="Share of total revenue this quarter">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={PLAN_SPLIT} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {PLAN_SPLIT.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-2" title="Payment Gateway Health" subtitle="Razorpay transaction outcomes, last 30 days">
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Successful Payments', value: '96.8%', tone: 'good' },
            { label: 'Failed Payments', value: '2.4%', tone: 'bad' },
            { label: 'Pending / Retried', value: '0.8%', tone: 'warn' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
              <p className="text-xs" style={{ color: COLORS.dustyRose }}>{s.label}</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: COLORS.black }}>{s.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function JobsTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Jobs by Category" subtitle="Active listings distribution">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={JOB_CATEGORY_DATA} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 11 }}>
                {JOB_CATEGORY_DATA.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip cursor={false} content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Average Time-to-Fill" subtitle="Days from job posted to position filled">
        <div className="mt-4 flex h-64 flex-col justify-center gap-4">
          {[
            { label: 'IT & Software', days: 18 },
            { label: 'Sales & Marketing', days: 12 },
            { label: 'Finance', days: 21 },
            { label: 'Operations', days: 15 },
          ].map((row) => (
            <div key={row.label}>
              <div className="mb-1 flex justify-between text-xs" style={{ color: COLORS.dustyRose }}>
                <span>{row.label}</span>
                <span className="font-medium" style={{ color: COLORS.black }}>{row.days}d</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: COLORS.ivorySoft }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(row.days / 25) * 100}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: COLORS.coral }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-2" title="Application Funnel Detail" subtitle="Stage-wise conversion with drop-off">
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {FUNNEL_DATA.map((s, i) => {
            const prev = i > 0 ? FUNNEL_DATA[i - 1].count : s.count;
            const dropOff = i > 0 ? (((prev - s.count) / prev) * 100).toFixed(0) : null;
            return (
              <div key={s.stage} className="rounded-lg border p-3 text-center" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
                <p className="text-xs" style={{ color: COLORS.dustyRose }}>{s.stage}</p>
                <p className="mt-1 text-xl font-semibold" style={{ color: COLORS.black }}>{s.count.toLocaleString()}</p>
                {dropOff && (
                  <p className="mt-1 flex items-center justify-center gap-1 text-xs" style={{ color: '#C63D3D' }}>
                    <TrendingDown size={12} /> {dropOff}%
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function RecruitersTab() {
  return (
    <Card title="Top Recruiters" subtitle="Ranked by hiring success and responsiveness, last 30 days">
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr style={{ color: COLORS.dustyRose }} className="text-xs uppercase tracking-wide">
              <th className="pb-3 font-medium">Company</th>
              <th className="pb-3 font-medium">Jobs Posted</th>
              <th className="pb-3 font-medium">Hires</th>
              <th className="pb-3 font-medium">Avg. Response</th>
              <th className="pb-3 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {TOP_RECRUITERS.map((r, i) => (
              <tr key={r.company} className="border-t" style={{ borderColor: COLORS.border }}>
                <td className="py-3 font-medium" style={{ color: COLORS.black }}>
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: i === 0 ? COLORS.amber : COLORS.ivorySoft, color: i === 0 ? COLORS.black : COLORS.dustyRose }}>
                    {i + 1}
                  </span>
                  {r.company}
                </td>
                <td className="py-3" style={{ color: COLORS.black }}>{r.jobsPosted}</td>
                <td className="py-3" style={{ color: COLORS.black }}>{r.hires}</td>
                <td className="py-3" style={{ color: COLORS.black }}>{r.avgResponse}</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                    style={{ backgroundColor: COLORS.ivorySoft, color: COLORS.coral }}>
                    <Award size={12} /> {r.score}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HealthTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Notification Delivery" subtitle="Email, SMS/OTP and chat health">
        <div className="mt-6 space-y-4">
          {DELIVERY_STATS.map((d) => (
            <div key={d.label} className="flex items-center justify-between rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: COLORS.ivory, color: COLORS.coral }}>
                  <d.icon size={16} />
                </span>
                <div>
                  <p className="text-sm font-medium" style={{ color: COLORS.black }}>{d.label}</p>
                  <p className="text-xs" style={{ color: COLORS.dustyRose }}>{d.sent} sent</p>
                </div>
              </div>
              <span className="text-sm font-semibold" style={{ color: COLORS.black }}>{d.success}%</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Moderation & Support" subtitle="Flags, tickets and resolutions this week">
        <div className="mt-6 grid grid-cols-2 gap-4">
          {MODERATION_STATS.map((m) => {
            const toneColor = m.tone === 'good' ? '#1E8A4C' : m.tone === 'bad' ? '#C63D3D' : COLORS.rust;
            return (
              <div key={m.label} className="rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: COLORS.ivory, color: toneColor }}>
                  <m.icon size={16} />
                </span>
                <p className="mt-3 text-2xl font-semibold" style={{ color: COLORS.black }}>{m.value}</p>
                <p className="text-xs" style={{ color: COLORS.dustyRose }}>{m.label}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="lg:col-span-2" title="Profile Completion & Engagement" subtitle="Candidate side health check">
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Avg. Profile Completion', value: 74, icon: Target },
            { label: 'Weekly Active Candidates', value: 62, icon: Users },
            { label: 'Applied vs Saved Ratio', value: 58, icon: Clock },
          ].map((s) => (
            <div key={s.label}>
              <div className="mb-2 flex items-center gap-2 text-xs" style={{ color: COLORS.dustyRose }}>
                <s.icon size={14} /> {s.label}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: COLORS.ivorySoft }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.value}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: COLORS.coral }}
                />
              </div>
              <p className="mt-1 text-sm font-semibold" style={{ color: COLORS.black }}>{s.value}%</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */
export default function Reports() {
  const [activeTab, setActiveTab] = useState('overview');
  const [range, setRange] = useState('7D');
  const growthData = useMemo(() => generateGrowthData(range), [range]);

  return (
    <div className="reports-page min-w-0 w-full max-w-full space-y-4 overflow-x-clip">
      <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COLORS.coral }}>Analytics</p>
          <h1 className="mt-0.5 text-lg font-semibold" style={{ color: COLORS.black }}>Reports</h1>
          <p className="mt-0.5 text-xs" style={{ color: COLORS.dustyRose }}>Platform performance, growth and financial health.</p>
        </div>
        <ExportMenu />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((k, i) => <KpiCard key={k.label} {...k} delay={i * 0.05} />)}
      </div>

      <div className="flex min-w-0 gap-0.5 overflow-x-auto border border-[#EBC2AE] bg-[#FFFDFB] p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative whitespace-nowrap rounded-md px-2.5 py-1.5 text-[11px] font-semibold outline-none transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C75560]"
            style={{ color: activeTab === tab.id ? COLORS.ivory : COLORS.dustyRose }}
          >
            {activeTab === tab.id && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 rounded-md"
                style={{ backgroundColor: COLORS.coral }}
                transition={{ type: 'spring', duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && <OverviewTab growthData={growthData} />}
          {activeTab === 'growth' && <GrowthTab range={range} onRangeChange={setRange} growthData={growthData} />}
          {activeTab === 'revenue' && <RevenueTab />}
          {activeTab === 'jobs' && <JobsTab />}
          {activeTab === 'recruiters' && <RecruitersTab />}
          {activeTab === 'health' && <HealthTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}