import { useEffect, useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, UserPlus, Building2, IndianRupee, Briefcase, TrendingUp, TrendingDown,
  Download, ChevronDown, ArrowUpRight, ArrowDownRight, Flag, Ticket, Mail,
  MessageSquare, Clock, Award, AlertTriangle, CheckCircle2, FileSpreadsheet,
  Target, Activity,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

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
const RANGES = [
  { value: '1D', label: '1D' },
  { value: '7D', label: '1 Week' },
  { value: '1M', label: '1M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: '5Y', label: '5Y' },
];

function seedRand(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

function formatHourLabel(hour) {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function getTodayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

function generateGrowthData(range) {
  const selectedRange = range === 'custom' ? '1M' : range;
  const config = {
    '1D': { points: 24, labelFn: formatHourLabel, base: 4 },
    '7D': { points: 7, labelFn: (i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], base: 60 },
    '1M': { points: 30, labelFn: (i) => `${i + 1}`, base: 55 },
    '6M': { points: 6, labelFn: (i) => ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i], base: 380 },
    '1Y': { points: 12, labelFn: (i) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i], base: 1600 },
    '5Y': { points: 5, labelFn: (i) => `${2021 + i}`, base: 5200 },
  }[selectedRange] || { points: 7, labelFn: (i) => `Day ${i + 1}`, base: 60 };

  return Array.from({ length: config.points }, (_, i) => {
    const growth = 1 + i / (config.points * 2.2);
    const candidates = Math.round(config.base * growth * (1.3 + seedRand(i + 1) * 0.6));
    const recruiters = Math.round((config.base * growth * (0.18 + seedRand(i + 21) * 0.1)));
    return { label: config.labelFn(i), candidates, recruiters };
  });
}

function generateRevenueData(range) {
  const selectedRange = range === 'custom' ? '1M' : range;
  const config = {
    '1D': { points: 24, labelFn: formatHourLabel, base: 18000 },
    '7D': { points: 7, labelFn: (i) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], base: 52000 },
    '1M': { points: 4, labelFn: (i) => `Week ${i + 1}`, base: 220000 },
    '6M': { points: 6, labelFn: (i) => ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i], base: 470000 },
    '1Y': { points: 12, labelFn: (i) => ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i], base: 500000 },
    '5Y': { points: 5, labelFn: (i) => `${2021 + i}`, base: 560000 },
  }[selectedRange] || { points: 7, labelFn: (i) => `Day ${i + 1}`, base: 52000 };

  return Array.from({ length: config.points }, (_, i) => ({
    label: config.labelFn(i),
    revenue: Math.round(config.base * (1 + i / (config.points * 2.4)) * (1.02 + seedRand(i + 50) * 0.16)),
    refunds: Math.round(config.base * 0.014 * (1 + seedRand(i + 80) * 0.25)),
  }));
}

function getRangeLabel(range, customDates) {
  if (range === 'custom') return `${customDates.from || 'Start'} to ${customDates.to || 'End'}`;
  if (range === '5Y') return 'Last 5 years';
  return RANGES.find((item) => item.value === range)?.label || range;
}

const REVENUE_DATA = [
  { label: 'Jan', revenue: 420000, refunds: 8200 },
  { label: 'Feb', revenue: 465000, refunds: 6100 },
  { label: 'Mar', revenue: 520000, refunds: 9400 },
  { label: 'Apr', revenue: 490000, refunds: 7300 },
  { label: 'May', revenue: 580000, refunds: 5800 },
  { label: 'Jun', revenue: 625000, refunds: 6900 },
  { label: 'Jul', revenue: 648000, refunds: 6200 },
  { label: 'Aug', revenue: 672000, refunds: 7100 },
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
  { label: 'Email', sent: '48,210', success: 98.4, icon: Mail },
  { label: 'SMS / OTP', sent: '21,940', success: 96.1, icon: MessageSquare },
  { label: 'Chat Response', sent: '9,320 msgs', success: 99.2, icon: Activity },
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
function Card({ title, subtitle, children, className = '', compact = false }) {
  return (
    <section
      className={`rounded-lg border ${compact ? 'p-2.5' : 'p-3'} shadow-sm ${className}`}
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
        {change && (
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
        )}
      </div>
    </motion.div>
  );
}

function TimeRangeToggle({ value, onChange, customDates, onCustomDatesChange }) {
  const today = getTodayInputValue();

  const handleStartDateChange = (event) => {
    const from = event.target.value;
    if (customDates.to && from > customDates.to) {
      onCustomDatesChange({ from, to: '' });
    } else {
      onCustomDatesChange({ ...customDates, from });
    }
    onChange('custom');
  };

  const handleEndDateChange = (event) => {
    const to = event.target.value;
    if (customDates.from && to < customDates.from) return;
    onCustomDatesChange({ ...customDates, to });
    onChange('custom');
  };

  const DateField = ({ value: dateValue, min, max, onChange, ariaLabel }) => (
    <label className="block">
      <input
        type="date"
        value={dateValue}
        min={min}
        max={max}
        onChange={onChange}
        className="h-8 w-[132px] rounded border bg-white px-2 text-[12px] font-normal text-[#1D181A] outline-none focus:border-[#C75560] focus:ring-1 focus:ring-[#C75560]"
        style={{ borderColor: COLORS.border }}
        aria-label={ariaLabel}
      />
    </label>
  );

  return (
    <div className="flex w-full max-w-full flex-wrap items-center gap-2">
      <div className="inline-flex rounded-md border p-0.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
      {RANGES.map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          className="relative rounded-md px-2.5 py-1 text-[11px] font-semibold outline-none transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C75560]"
          style={{ color: value === range.value ? COLORS.ivory : COLORS.dustyRose }}
        >
          {value === range.value && (
            <motion.span
              layoutId="range-pill"
              className="absolute inset-0 rounded-md"
              style={{ backgroundColor: COLORS.coral }}
              transition={{ type: 'spring', duration: 0.4 }}
            />
          )}
          <span className="relative z-10">{range.label}</span>
        </button>
      ))}
    </div>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <DateField
          value={customDates.from}
          max={customDates.to || today}
          onChange={handleStartDateChange}
          ariaLabel="Custom start date"
        />
        <span className="text-[11px] font-medium text-[#80576A]">to</span>
        <DateField
          value={customDates.to}
          min={customDates.from || undefined}
          max={today}
          onChange={handleEndDateChange}
          ariaLabel="Custom end date"
        />
      </div>
    </div>
  );
}

function DateRangeControl({ range, setRange, customDates, setCustomDates }) {
  return (
    <div className="flex flex-wrap items-center justify-start gap-2 rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] px-2.5 py-2">
      <TimeRangeToggle value={range} onChange={setRange} customDates={customDates} onCustomDatesChange={setCustomDates} />
    </div>
  );
}

function ExportMenu({ open, setOpen, onExport }) {
  const options = [
    { label: 'Export as CSV', icon: FileSpreadsheet },
    { label: 'Export as Excel', icon: FileSpreadsheet },
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
                onClick={() => onExport(label.includes('CSV') ? 'csv' : label.includes('Excel') ? 'excel' : 'pdf')}
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
function OverviewTab({ growthData, revenueData, funnel, rangeLabel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Signups Trend" subtitle={`Candidates vs recruiters, ${rangeLabel}`}>
        <div className="mt-4 h-40 sm:h-48">
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

      <Card title="Application Funnel" subtitle={`Applied to hired conversion, ${rangeLabel}`}>
        <div className="mt-4 h-40 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={funnel} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="stage" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Line type="monotone" dataKey="count" name="Candidates" stroke={COLORS.coral} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.coral }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Revenue Trend" subtitle={`Gross revenue, ${rangeLabel}`} className="lg:col-span-2">
        <div className="mt-4 h-40 sm:h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke={COLORS.coral} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.coral }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function GrowthTab({ range, growthData, rangeLabel }) {
  const totalCandidates = growthData.reduce((s, d) => s + d.candidates, 0);
  const totalRecruiters = growthData.reduce((s, d) => s + d.recruiters, 0);
  const peak = growthData.reduce((max, d) => (d.candidates > max.candidates ? d : max), growthData[0]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: COLORS.dustyRose }}>Registration activity for {rangeLabel}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-2.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
          <p className="text-[11px] font-medium" style={{ color: COLORS.dustyRose }}>New Candidates ({range})</p>
          <p className="mt-0.5 text-lg font-semibold leading-tight" style={{ color: COLORS.black }}>{totalCandidates.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-2.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
          <p className="text-[11px] font-medium" style={{ color: COLORS.dustyRose }}>New Recruiters ({range})</p>
          <p className="mt-0.5 text-lg font-semibold leading-tight" style={{ color: COLORS.black }}>{totalRecruiters.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border p-2.5" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
          <p className="text-[11px] font-medium" style={{ color: COLORS.dustyRose }}>Peak Registration</p>
          <p className="mt-0.5 text-lg font-semibold leading-tight" style={{ color: COLORS.black }}>{peak.label}</p>
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

function RevenueTab({ revenueData, revenueSources, health, rangeLabel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Revenue vs Refunds" subtitle={rangeLabel}>
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: COLORS.dustyRose }} axisLine={false} tickLine={false} />
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke={COLORS.coral} strokeWidth={2.5} dot={{ r: 3, fill: COLORS.coral }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="refunds" name="Refunds (₹)" stroke={COLORS.dustyRose} strokeWidth={2} dot={{ r: 3, fill: COLORS.dustyRose }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Revenue by Source" subtitle="Successful payments in selected period">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={revenueSources} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {revenueSources.map((item, i) => <Cell key={`${item.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip cursor={false} content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="lg:col-span-2" title="Payment Gateway Health" subtitle="Recorded payment outcomes in selected period">
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Successful Payments', value: health.paymentHealth?.success || 0, tone: 'good' },
            { label: 'Failed Payments', value: health.paymentHealth?.failed || 0, tone: 'bad' },
            { label: 'Pending Payments', value: health.paymentHealth?.pending || 0, tone: 'warn' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border p-3" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
              <p className="text-xs" style={{ color: COLORS.dustyRose }}>{s.label}</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: COLORS.black }}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function JobsTab({ jobs, funnel }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Jobs by Category" subtitle="Active listings distribution">
        <div className="mt-4 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={jobs} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 11 }}>
                {jobs.map((item, i) => <Cell key={`${item.name}-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip cursor={false} content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Application Conversion" subtitle="Real application status counts">
        <div className="mt-4 flex h-64 flex-col justify-center gap-4">
          {funnel.map((row) => (
            <div key={row.stage}>
              <div className="mb-1 flex justify-between text-xs" style={{ color: COLORS.dustyRose }}>
                <span>{row.stage}</span>
                <span className="font-medium" style={{ color: COLORS.black }}>{row.count.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: COLORS.ivorySoft }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${funnel[0]?.count ? (row.count / funnel[0].count) * 100 : 0}%` }}
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
          {funnel.map((s, i) => {
            const prev = i > 0 ? funnel[i - 1].count : s.count;
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

function RecruitersTab({ recruiters }) {
  return (
    <Card compact title="Top Recruiters" subtitle="Ranked by hiring success and responsiveness, last 30 days">
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr style={{ color: COLORS.dustyRose }} className="text-[10px] uppercase tracking-wide">
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 font-medium">Jobs Posted</th>
              <th className="pb-2 font-medium">Hires</th>
              <th className="pb-2 font-medium">Avg. Response</th>
              <th className="pb-2 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {recruiters.map((r, i) => (
              <tr key={r.company} className="border-t" style={{ borderColor: COLORS.border }}>
                <td className="py-2 font-medium" style={{ color: COLORS.black }}>
                  <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: i === 0 ? COLORS.amber : COLORS.ivorySoft, color: i === 0 ? COLORS.black : COLORS.dustyRose }}>
                    {i + 1}
                  </span>
                  {r.company}
                </td>
                <td className="py-2" style={{ color: COLORS.black }}>{r.jobsPosted}</td>
                <td className="py-2" style={{ color: COLORS.black }}>{r.hires}</td>
                <td className="py-2" style={{ color: COLORS.black }}>{r.avgResponse}</td>
                <td className="py-2">
                  <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: COLORS.ivorySoft, color: COLORS.coral }}>
                    <Award size={11} /> {r.score}
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

function HealthTab({ health }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card compact title="Notification Delivery">
        <div className="mt-3 space-y-2">
          {[{ label: 'Notifications recorded', sent: health.notifications, success: null, icon: Activity }].map((d) => (
            <div key={d.label} className="flex items-center justify-between rounded-md border p-2" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: COLORS.ivory, color: COLORS.coral }}>
                  <d.icon size={14} />
                </span>
                <div>
                  <p className="text-xs font-medium" style={{ color: COLORS.black }}>{d.label}</p>
                  <p className="text-[10px]" style={{ color: COLORS.dustyRose }}>{(d.sent || 0).toLocaleString()} records</p>
                </div>
              </div>
              <span className="text-[10px] font-semibold" style={{ color: COLORS.dustyRose }}>Tracked</span>
            </div>
          ))}
        </div>
      </Card>

      <Card compact title="Moderation & Support" subtitle="Flags, tickets and resolutions this week">
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: 'Open Support Tickets', value: health.disputes.open || 0, icon: Ticket, tone: 'warn' },
            { label: 'In Review', value: health.disputes.in_review || 0, icon: Activity, tone: 'warn' },
            { label: 'Resolved', value: health.disputes.resolved || 0, icon: CheckCircle2, tone: 'good' },
            { label: 'Rejected', value: health.disputes.rejected || 0, icon: AlertTriangle, tone: 'bad' },
          ].map((m) => {
            const toneColor = m.tone === 'good' ? '#1E8A4C' : m.tone === 'bad' ? '#C63D3D' : COLORS.rust;
            return (
              <div key={m.label} className="flex min-h-[58px] items-center gap-2 rounded-md border px-2.5 py-2" style={{ borderColor: COLORS.border, backgroundColor: COLORS.ivorySoft }}>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: COLORS.ivory, color: toneColor }}>
                  <m.icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-none" style={{ color: COLORS.black }}>{m.value}</p>
                  <p className="mt-1 truncate text-[10px]" style={{ color: COLORS.dustyRose }}>{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card compact className="lg:col-span-2" title="Profile Completion & Engagement" subtitle="Candidate side health check">
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Candidates in Period', value: health.candidates || 0, icon: Users },
            { label: 'Applications in Period', value: health.applications || 0, icon: Target },
            { label: 'Notifications Recorded', value: health.notifications || 0, icon: Activity },
          ].map((s) => (
            <div key={s.label}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px]" style={{ color: COLORS.dustyRose }}>
                <s.icon size={12} /> {s.label}
              </div>
              <p className="mt-2 text-lg font-semibold" style={{ color: COLORS.black }}>{s.value.toLocaleString()}</p>
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
  const [customDates, setCustomDates] = useState({ from: '', to: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const growthData = report?.growth || [];
  const revenueData = report?.revenue || [];
  const rangeLabel = getRangeLabel(range, customDates);

  useEffect(() => {
    if (range === 'custom' && (!customDates.from || !customDates.to)) return;
    let active = true;
    setLoading(true);
    setError('');
    const params = { range };
    if (range === 'custom') {
      params.from = customDates.from;
      params.to = customDates.to;
    }
    adminAxiosInstance.get('/reports', { params })
      .then(({ data }) => { if (active) setReport(data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.error || 'Unable to load report data'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, customDates.from, customDates.to]);

  const exportReport = (format) => {
    if (!report) return;
    const rows = report.growth.map((item, index) => ({
      date: item.label,
      candidates: item.candidates,
      recruiters: item.recruiters,
      revenue: report.revenue[index]?.revenue || 0,
      refunds: report.revenue[index]?.refunds || 0,
    }));
    const columns = [
      { key: 'date', label: 'Date' },
      { key: 'candidates', label: 'Candidates' },
      { key: 'recruiters', label: 'Recruiters' },
      { key: 'revenue', label: 'Revenue' },
      { key: 'refunds', label: 'Refunds' },
    ];
    const headers = columns.map((column) => column.label);
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const extension = format === 'excel' ? 'xls' : 'csv';
    let fileContent;
    let mimeType;

    if (format === 'excel') {
      // Excel opens UTF-16 tab-separated text into separate columns reliably.
      const lines = [headers, ...rows.map((row) => columns.map((column) => row[column.key]))];
      fileContent = `\uFEFF${lines.map((line) => line.map((value) => String(value ?? '').replaceAll('\t', ' ')).join('\t')).join('\r\n')}`;
      mimeType = 'application/vnd.ms-excel;charset=utf-16le;';
    } else {
      fileContent = [headers.join(','), ...rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(','))].join('\r\n');
      mimeType = 'text/csv;charset=utf-8;';
    }

    const fileParts = format === 'excel'
      ? [new Uint8Array([...fileContent].flatMap((character) => {
        const code = character.charCodeAt(0);
        return [code & 0xff, code >> 8];
      }))]
      : [fileContent];
    const blob = new Blob(fileParts, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${rangeLabel.replaceAll(' ', '-')}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  return (
    <div className="reports-page min-w-0 w-full max-w-full space-y-4 overflow-x-clip">
      {/* Recharts adds tabIndex to its SVG wrapper for accessibility, which triggers
          the browser's default focus outline (shows as a black border) on click.
          This strips that outline from every chart on this page. */}
      <style>{`
        .reports-page,
        .reports-page * {
          border-radius: 0 !important;
        }

        .reports-page .recharts-wrapper:focus,
        .reports-page .recharts-wrapper:focus-visible,
        .reports-page .recharts-surface:focus,
        .reports-page .recharts-surface:focus-visible,
        .reports-page .recharts-wrapper *:focus,
        .reports-page .recharts-wrapper *:focus-visible {
          outline: none !important;
        }
      `}</style>
      <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: COLORS.coral }}>Analytics</p>
          <h1 className="mt-0.5 text-lg font-semibold" style={{ color: COLORS.black }}>Reports</h1>
          <p className="mt-0.5 text-xs" style={{ color: COLORS.dustyRose }}>Platform performance, growth and financial health.</p>
        </div>
        <ExportMenu open={exportOpen} setOpen={setExportOpen} onExport={exportReport} />
      </div>

      <DateRangeControl range={range} setRange={setRange} customDates={customDates} setCustomDates={setCustomDates} />

      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {loading && <div className="rounded-md border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-2 text-xs text-[#80576A]">Loading report data...</div>}

      <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((k, i) => <KpiCard key={k.label} {...k} value={k.label === "Today's Candidates" ? (report?.kpis.candidates || 0).toLocaleString() : k.label === "Today's Recruiters" ? (report?.kpis.recruiters || 0).toLocaleString() : k.label === 'Revenue (30D)' ? `₹${(report?.kpis.revenue || 0).toLocaleString()}` : (report?.kpis.activeJobs || 0).toLocaleString()} change="" delay={i * 0.05} />)}
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
          {activeTab === 'overview' && <OverviewTab growthData={growthData} revenueData={revenueData} funnel={report?.funnel || []} rangeLabel={rangeLabel} />}
          {activeTab === 'growth' && <GrowthTab range={range} growthData={growthData} rangeLabel={rangeLabel} />}
          {activeTab === 'revenue' && <RevenueTab revenueData={revenueData} revenueSources={report?.revenueSources || []} health={report?.health || {}} rangeLabel={rangeLabel} />}
          {activeTab === 'jobs' && <JobsTab jobs={report?.jobs || []} funnel={report?.funnel || []} />}
          {activeTab === 'recruiters' && <RecruitersTab recruiters={report?.recruitersPerformance || []} />}
          {activeTab === 'health' && <HealthTab health={report?.health || { disputes: {} }} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}