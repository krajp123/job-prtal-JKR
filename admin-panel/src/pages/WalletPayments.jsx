import { useEffect, useMemo, useState, useRef } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import {
  Wallet, IndianRupee, FileDown, Download, Search, SlidersHorizontal, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, X, MoreVertical, Eye, User, Receipt, RefreshCcw, AlertTriangle, CheckCircle2,
  XCircle, Clock, FileText, Building2, UserPlus, CreditCard, TrendingUp, TrendingDown, Landmark, ShieldCheck, Calendar,
  Copy, Check, RotateCcw,
} from 'lucide-react';

const STATUS_META = {
  Success: { color: 'text-emerald-700 bg-emerald-50 ring-emerald-600/20', icon: CheckCircle2 },
  Pending: { color: 'text-[#9A671A] bg-[#FDF1DD] ring-[#9A671A]/20', icon: Clock },
  Failed: { color: 'text-red-700 bg-red-50 ring-red-600/20', icon: XCircle },
  Refunded: { color: 'text-[#0369A1] bg-[#E6F6FD] ring-[#0EA5E9]/20', icon: RefreshCcw },
  Cancelled: { color: 'text-[#1D181A] bg-[#F3DED2] ring-[#80576A]/20', icon: X },
};

const TYPE_META = {
  'Wallet Recharge': { color: '#D9654A', icon: Wallet },
  'Resume Download': { color: '#0EA5E9', icon: FileText },
  'Job Posting': { color: '#80576A', icon: Building2 },
  Subscription: { color: '#C75560', icon: ShieldCheck },
  'Candidate Registration': { color: '#0369A1', icon: UserPlus },
  Refund: { color: '#9A671A', icon: RefreshCcw },
  Other: { color: '#6B7280', icon: Receipt },
};

const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet', 'Razorpay'];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

// Compact ledger-style figures for summary cards — ₹1.2L / ₹42.5K
function formatCompactINR(n) {
  const num = Number(n || 0);
  const abs = Math.abs(num);
  if (abs >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(num / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

function formatDateTime(date) {
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Fully functional date-range resolver — presets always compute off the real "now".
function resolveDateRange(range) {
  const now = new Date();
  switch (range.preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case '30d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'thisMonth': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case 'prevMonth': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    case 'custom':
      return {
        from: range.from ? startOfDay(new Date(range.from)) : startOfDay(new Date(0)),
        to: range.to ? endOfDay(new Date(range.to)) : endOfDay(now),
      };
    default:
      return null; // 'all' — no bound
  }
}

function isWithinResolvedRange(date, resolved) {
  if (!resolved) return true;
  return date >= resolved.from && date <= resolved.to;
}

// Metric config for the revenue chart toggle — single-select, one metric plotted at a time.
const CHART_METRICS = [
  { key: 'revenue', label: 'Total Revenue', dataKey: 'revenue', color: '#C75560', icon: IndianRupee },
  { key: 'recruiterRegistration', label: 'Recruiter Registration', dataKey: 'recruiterRegistration', color: '#80576A', icon: Building2 },
  { key: 'candidateRegistration', label: 'Candidate Registration', dataKey: 'candidateRegistration', color: '#0EA5E9', icon: UserPlus },
  { key: 'recharge', label: 'Wallet Recharge', dataKey: 'recharge', color: '#D9654A', icon: Wallet },
  { key: 'resume', label: 'Resume Download', dataKey: 'resume', color: '#0369A1', icon: FileText },
  { key: 'refund', label: 'Refunds', dataKey: 'refund', color: '#9A671A', icon: RefreshCcw },
];

// Windowed pagination with ellipses — always shows first, last, current ±1.
function buildPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const withDots = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) withDots.push('…');
    withDots.push(p);
  });
  return withDots;
}

/* ------------------------------------------------------------------ */
/*  Small shared UI primitives                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Cancelled;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ring-1 ring-inset ${meta.color}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}

function TypeTag({ type }) {
  const meta = TYPE_META[type] || TYPE_META.Other;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs leading-tight text-[#1D181A]">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}1a` }}>
        <Icon size={11} style={{ color: meta.color }} />
      </span>
      {type}
    </span>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* clipboard unavailable */
        }
      }}
      title={`Copy ${label || 'value'}`}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#C75560]"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </button>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2 sm:right-6 sm:top-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className={`pointer-events-auto flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {t.type === 'error' ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ConfirmModal({ open, title, description, confirmLabel, tone = 'default', onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1D181A]/40 px-4" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-5 shadow-xl"
      >
        <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-[#FFF0E8] text-[#C75560]'}`}>
          <AlertTriangle size={20} />
        </div>
        <h3 className="text-sm font-semibold text-[#1D181A]">{title}</h3>
        <p className="mt-1.5 text-sm text-[#80576A]">{description}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-xl border border-[#EBC2AE] px-4 py-2 text-sm font-medium text-[#1D181A] hover:bg-[#FFF0E8]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#C75560] hover:bg-[#A94658]'
            }`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview cards — computed live from transactions, click-to-filter  */
/* ------------------------------------------------------------------ */

function useOverviewStats(transactions) {
  return useMemo(() => {
    const success = transactions.filter((t) => t.status === 'Success');
    const pending = transactions.filter((t) => t.status === 'Pending');
    const failed = transactions.filter((t) => t.status === 'Failed');
    const refunded = transactions.filter((t) => t.status === 'Refunded');
    const totalRevenue = success.reduce((s, t) => s + t.amount, 0);
    const walletRecharge = success.filter((t) => t.type === 'Wallet Recharge').reduce((s, t) => s + t.amount, 0);
    const resumeRevenue = success.filter((t) => t.type === 'Resume Download').reduce((s, t) => s + t.amount, 0);
    const pendingAmount = pending.reduce((s, t) => s + t.amount, 0);
    const refundAmount = refunded.reduce((s, t) => s + t.amount, 0);
    const failedAmount = failed.reduce((s, t) => s + t.amount, 0);
    const successRate = transactions.length ? Math.round((success.length / transactions.length) * 1000) / 10 : 0;
    return { totalRevenue, walletRecharge, resumeRevenue, pendingAmount, refundAmount, failedAmount, successRate };
  }, [transactions]);
}

function OverviewCards({ transactions, onCardClick }) {
  const stats = useOverviewStats(transactions);

  const cards = [
    { key: 'revenue', title: 'Total Revenue', amount: stats.totalRevenue, sub: `${transactions.filter((t) => t.status === 'Success').length} successful payments`, icon: IndianRupee, tint: 'coral', filter: { status: 'Success' } },
    { key: 'recharge', title: 'Wallet Recharge', amount: stats.walletRecharge, sub: 'added by recruiters', icon: Wallet, tint: 'rust', filter: { type: 'Wallet Recharge' } },
    { key: 'resume', title: 'Resume Download Revenue', amount: stats.resumeRevenue, sub: 'from resume unlocks', icon: FileText, tint: 'sky', filter: { type: 'Resume Download' } },
    { key: 'pending', title: 'Pending Payments', amount: stats.pendingAmount, sub: 'awaiting confirmation', icon: Clock, tint: 'amber', filter: { status: 'Pending' } },
    { key: 'refunds', title: 'Refunds', amount: stats.refundAmount, sub: 'refunded in range', icon: RefreshCcw, tint: 'rose', filter: { status: 'Refunded' } },
    { key: 'failed', title: 'Failed Transactions', amount: stats.failedAmount, sub: `${stats.successRate}% success rate`, icon: XCircle, tint: 'red', filter: { status: 'Failed' } },
  ];

  const TINTS = {
    coral: 'bg-[#FFF0E8] text-[#C75560]',
    rust: 'bg-[#FBE7DC] text-[#D9654A]',
    sky: 'bg-[#E6F6FD] text-[#0EA5E9]',
    amber: 'bg-[#FDF1DD] text-[#9A671A]',
    rose: 'bg-[#F3E7EA] text-[#80576A]',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <button
            key={c.key}
            onClick={() => onCardClick(c.filter)}
            className="group min-w-0 border border-[#EBC2AE] bg-[#FFFDFB] p-2.5 text-left transition hover:border-[#D9654A] hover:bg-[#FFF9F5]"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${TINTS[c.tint]}`}>
                <Icon size={15} />
              </span>
              <p className="min-w-0 truncate text-base font-semibold tracking-tight text-[#1D181A] tabular-nums sm:text-lg">
                {formatCompactINR(c.amount)}
              </p>
            </div>
            <p className="mt-2 truncate text-[11px] font-semibold leading-tight text-[#1D181A]">{c.title}</p>
            <p className="mt-0.5 truncate text-[10px] leading-tight text-[#80576A]">{c.sub}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue analytics (trend chart)                                    */
/* ------------------------------------------------------------------ */

const PERIODS = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
];

function RevenueAnalytics({ analytics }) {
  const [period, setPeriod] = useState('30d');
  const [metric, setMetric] = useState('revenue');
  const series = analytics?.[period] || [];
  const active = CHART_METRICS.find((m) => m.key === metric) || CHART_METRICS[0];

  const total = series.reduce((s, p) => s + p[active.dataKey], 0);

  // Period-over-period change — compares the newer half of the series vs the older half.
  const mid = Math.floor(series.length / 2) || 1;
  const firstHalf = series.slice(0, mid).reduce((s, p) => s + p[active.dataKey], 0);
  const secondHalf = series.slice(mid).reduce((s, p) => s + p[active.dataKey], 0);
  const change = firstHalf === 0 ? 0 : Math.round(((secondHalf - firstHalf) / firstHalf) * 1000) / 10;
  const isUp = change >= 0;

  return (
    <div className="h-auto rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] p-3 shadow-sm lg:h-full">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[#1D181A]">Revenue Trend</h2>
          <p className="text-[11px] text-[#80576A]">Select one metric to view its trend</p>
        </div>
        <div className="flex rounded-md border border-[#EBC2AE] bg-[#FFF0E8] p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                period === p.key ? 'bg-[#FFFDFB] text-[#C75560] shadow-sm' : 'text-[#80576A] hover:text-[#1D181A]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex max-w-full gap-1 overflow-x-auto overscroll-x-contain border border-[#EBC2AE] bg-[#FFF0E8] p-1" role="radiogroup" aria-label="Revenue trend metric">
        {CHART_METRICS.map((m) => {
          const Icon = m.icon;
          const isActive = metric === m.key;
          return (
            <label
              key={m.key}
              className={`flex shrink-0 cursor-pointer items-center gap-1 px-2.5 py-1 text-[11px] font-semibold transition ${
                isActive ? 'text-white shadow-sm' : 'text-[#80576A] hover:bg-[#FFFDFB]'
              }`}
              style={isActive ? { backgroundColor: m.color, borderColor: m.color } : undefined}
            >
              <input
                type="radio"
                name="revenueTrendMetric"
                value={m.key}
                checked={isActive}
                onChange={() => setMetric(m.key)}
                className="sr-only"
              />
              <Icon size={12} />
              {m.label}
            </label>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-2 border-t border-[#F3DED2] pt-2">
        <div>
          <p className="text-xl font-semibold tracking-tight text-[#1D181A] tabular-nums">{formatINR(total)}</p>
          <p className="text-[11px] text-[#80576A]">{active.label} · selected period</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {isUp ? '+' : ''}{change}% vs earlier in period
        </span>
      </div>

      <div className="relative mt-1 h-40 min-h-[160px] w-full min-w-0 overflow-hidden sm:h-52">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <AreaChart data={series} margin={{ left: -20, right: 10, top: 10 }}>
            <defs>
              <linearGradient id="metricFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={active.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={active.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3DED2" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#80576A' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#80576A' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactINR(v)} />
            <Tooltip formatter={(v) => formatINR(v)} labelFormatter={(l) => `${active.label} · ${l}`} contentStyle={{ borderRadius: 12, border: '1px solid #EBC2AE', fontSize: 12 }} />
            <Area
              key={active.key}
              type="monotone"
              dataKey={active.dataKey}
              name={active.label}
              stroke={active.color}
              fill="url(#metricFill)"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={350}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TypeBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const map = {};
    transactions.forEach((t) => { map[t.type] = (map[t.type] || 0) + t.amount; });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .map(([type, amount]) => ({ type, amount, pct: Math.round((amount / total) * 1000) / 10 }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div className="h-auto rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-4 shadow-sm lg:h-full">
        <h2 className="text-sm font-semibold text-[#1D181A]">Transaction Type Breakdown</h2>
        <p className="mt-6 pb-4 text-center text-xs text-[#80576A]">No transactions in the selected date range.</p>
      </div>
    );
  }

  return (
    <div className="h-auto rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-3 shadow-sm lg:h-full">
      <h2 className="text-sm font-semibold text-[#1D181A]">Transaction Type Breakdown</h2>
      <p className="text-xs text-[#80576A]">Share of total transaction value by type</p>

      <div className="mt-2 flex flex-col gap-1">
        <div className="relative h-28 min-h-[112px] w-full min-w-0 overflow-hidden sm:h-32">
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <PieChart>
              <Pie data={breakdown} dataKey="amount" nameKey="type" innerRadius={34} outerRadius={50} paddingAngle={2}>
                {breakdown.map((b) => <Cell key={b.type} fill={(TYPE_META[b.type] || TYPE_META.Other).color} />)}
              </Pie>
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 0, border: '1px solid #EBC2AE', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-1.5">
          {breakdown.map((b) => (
            <div key={b.type} className="border-b border-[#F3DED2] pb-1.5 text-xs last:border-b-0">
              <div className="flex min-w-0 items-start gap-1.5">
                <span className="mt-1 h-2 w-2 shrink-0" style={{ backgroundColor: (TYPE_META[b.type] || TYPE_META.Other).color }} />
                <span className="min-w-0 break-words font-medium leading-tight text-[#1D181A]">{b.type}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-3 pl-3.5">
                <span className="font-medium tabular-nums text-[#1D181A]">{formatINR(b.amount)}</span>
                <span className="text-[10px] text-[#80576A]">{b.pct}% of total</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Functional Date Range picker                                       */
/* ------------------------------------------------------------------ */

const DATE_PRESETS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'prevMonth', label: 'Previous Month' },
  { key: 'custom', label: 'Custom Range' },
];

function DateRangePicker({ range, setRange }) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(range.from || '');
  const [draftTo, setDraftTo] = useState(range.to || '');
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const activeLabel = DATE_PRESETS.find((p) => p.key === range.preset)?.label || 'All Time';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs font-medium text-[#1D181A] hover:bg-[#FFF0E8]"
      >
        <Calendar size={13} /> {activeLabel}
        {range.preset === 'custom' && range.from && range.to && (
          <span className="hidden text-[#80576A] sm:inline">({range.from} → {range.to})</span>
        )}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] p-2 shadow-xl">
          {DATE_PRESETS.filter((p) => p.key !== 'custom').map((p) => (
            <button
              key={p.key}
              onClick={() => { setRange({ preset: p.key, from: null, to: null }); setOpen(false); }}
              className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                range.preset === p.key ? 'bg-[#FFF0E8] font-semibold text-[#C75560]' : 'text-[#1D181A] hover:bg-[#FFF0E8]'
              }`}
            >
              {p.label}
              {range.preset === p.key && <Check size={14} />}
            </button>
          ))}
          <div className="mt-1 border-t border-[#F3DED2] p-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#80576A]">Custom Range</p>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
              <input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                aria-label="Start date"
                className="min-w-0 w-full rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] px-2 py-2 text-xs text-[#1D181A] focus:border-[#D9654A] focus:outline-none"
              />
              <span className="text-xs font-medium text-[#80576A]">to</span>
              <input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                aria-label="End date"
                className="min-w-0 w-full rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] px-2 py-2 text-xs text-[#1D181A] focus:border-[#D9654A] focus:outline-none"
              />
            </div>
            <button
              disabled={!draftFrom || !draftTo}
              onClick={() => { setRange({ preset: 'custom', from: draftFrom, to: draftTo }); setOpen(false); }}
              className="mt-2 w-full bg-[#C75560] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Functional Filter drawer                                           */
/* ------------------------------------------------------------------ */

const EMPTY_ADVANCED_FILTERS = {
  type: 'All',
  status: 'All',
  method: 'All',
  minAmount: '',
  maxAmount: '',
  refundableOnly: false,
  walletOnly: false,
};

function FilterDrawer({ open, onClose, filters, setFilters }) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => { if (open) setDraft(filters); }, [open, filters]);

  const activeCount = Object.entries(EMPTY_ADVANCED_FILTERS).filter(([k, v]) => filters[k] !== v).length;

  return (
    <>
      {activeCount > 0 && (
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C75560] text-[9px] font-bold text-white">
          {activeCount}
        </span>
      )}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[9999] flex justify-end bg-[#1D181A]/40">
            <div className="absolute inset-0 z-0" onClick={onClose} />
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="wallet-drawer-surface relative z-10 flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-[#EBC2AE] bg-[#FFFDFB] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#F3DED2] px-4 py-2.5">
                <h3 className="text-sm font-semibold text-[#1D181A]">Filter Transactions</h3>
                <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8]">
                  <X size={15} />
                </button>
              </div>

              <div className="flex-1 space-y-3 px-4 py-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#80576A]">Transaction Type</label>
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                    className="w-full rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs text-[#1D181A] focus:border-[#D9654A] focus:outline-none"
                  >
                    <option value="All">All Types</option>
                    {Object.keys(TYPE_META).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#80576A]">Status</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                    className="w-full rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs text-[#1D181A] focus:border-[#D9654A] focus:outline-none"
                  >
                    <option value="All">All Status</option>
                    {Object.keys(STATUS_META).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#80576A]">Payment Method</label>
                  <select
                    value={draft.method}
                    onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
                    className="w-full rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs text-[#1D181A] focus:border-[#D9654A] focus:outline-none"
                  >
                    <option value="All">All Methods</option>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#80576A]">Amount Range (₹)</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      placeholder="Min"
                      value={draft.minAmount}
                      onChange={(e) => setDraft((d) => ({ ...d, minAmount: e.target.value }))}
                      className="w-full rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs text-[#1D181A] focus:border-[#D9654A] focus:outline-none"
                    />
                    <span className="text-[#80576A]">–</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Max"
                      value={draft.maxAmount}
                      onChange={(e) => setDraft((d) => ({ ...d, maxAmount: e.target.value }))}
                      className="w-full rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs text-[#1D181A] focus:border-[#D9654A] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 rounded-xl bg-[#FFF0E8] p-2.5">
                  <label className="flex items-center gap-2 text-xs text-[#1D181A]">
                    <input
                      type="checkbox"
                      checked={draft.refundableOnly}
                      onChange={(e) => setDraft((d) => ({ ...d, refundableOnly: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-[#C75560]"
                    />
                    Refundable transactions only
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#1D181A]">
                    <input
                      type="checkbox"
                      checked={draft.walletOnly}
                      onChange={(e) => setDraft((d) => ({ ...d, walletOnly: e.target.checked }))}
                      className="h-3.5 w-3.5 accent-[#C75560]"
                    />
                    Wallet transactions only
                  </label>
                </div>
              </div>

              <div className="flex gap-2 border-t border-[#F3DED2] px-4 py-3">
                <button
                  onClick={() => {
                    setDraft({ ...EMPTY_ADVANCED_FILTERS });
                    setFilters((current) => ({ ...current, ...EMPTY_ADVANCED_FILTERS }));
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-[#EBC2AE] px-3 py-1.5 text-xs font-medium text-[#1D181A] hover:bg-[#FFF0E8]"
                >
                  <RotateCcw size={13} /> Clear
                </button>
                <button
                  onClick={() => { setFilters((f) => ({ ...f, ...draft })); onClose(); }}
                  className="flex-1 rounded-xl bg-[#C75560] py-1.5 text-xs font-semibold text-white hover:bg-[#A94658]"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Export menu                                                       */
/* ------------------------------------------------------------------ */

function exportCSV(rows, notify) {
  const header = ['Transaction ID', 'Recruiter', 'Company', 'Type', 'Amount', 'Method', 'Status', 'Date'];
  const lines = rows.map((t) => [t.id, t.recruiter.name, t.recruiter.company, t.type, t.amount, t.paymentMethod, t.status, formatDateTime(t.date)]);
  const csv = [header, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  notify(`Exported ${rows.length} transactions as CSV`);
}

function ExportMenu({ transactions, notify }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"
      >
        <FileDown size={13} /> Export <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] py-1 shadow-lg">
            <button onClick={() => { exportCSV(transactions, notify); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <Download size={14} /> CSV (current filters)
            </button>
            <button onClick={() => { notify('Excel export needs a backend export job — see notes below the page.'); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => { notify('PDF export needs a backend export job — see notes below the page.'); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <Download size={14} /> PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page header                                                       */
/* ------------------------------------------------------------------ */

function PageHeader({ transactions, notify, dateRange, setDateRange }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#C75560]">Admin Account Center</p>
        <h1 className="mt-0.5 text-lg font-semibold text-[#1D181A]">Account &amp; Transactions</h1>
        <p className="mt-0.5 text-xs text-[#80576A]">Monitor payments, wallet activity, resume downloads, refunds and settlements.</p>
      </div>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto md:justify-end">
        <DateRangePicker range={dateRange} setRange={setDateRange} />
        <ExportMenu transactions={transactions} notify={notify} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: 'all', label: 'All Transactions' },
  { key: 'wallet', label: 'Wallet Transactions' },
  { key: 'resume', label: 'Resume Downloads' },
  { key: 'refunds', label: 'Refunds' },
  { key: 'settlements', label: 'Settlements' },
];

/* ------------------------------------------------------------------ */
/*  Pagination                                                        */
/* ------------------------------------------------------------------ */

function Pagination({ page, setPage, pageSize, setPageSize, total }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageList = buildPageList(Math.min(page, totalPages), totalPages);

  return (
    <div className="flex flex-col gap-2 border-t border-[#F3DED2] px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-[11px] text-[#80576A] sm:text-xs">
        <span>
          {total === 0 ? '0 results' : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
        </span>
        <span className="flex items-center gap-1.5">
          Rows:
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] px-2 py-1 text-[11px] focus:outline-none sm:text-xs"
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </span>
      </div>
      <div className="flex items-center gap-0.5 overflow-x-auto">
        <button disabled={page === 1} onClick={() => setPage(1)} className="hidden h-7 w-7 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A] disabled:opacity-40 sm:flex">
          <ChevronsLeft size={14} />
        </button>
        <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A] disabled:opacity-40">
          <ChevronLeft size={14} />
        </button>
        {pageList.map((p, i) =>
          p === '…' ? (
            <span key={`dots-${i}`} className="px-1 text-[#80576A]">…</span>
          ) : (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-7 w-7 rounded-lg text-xs font-medium ${page === p ? 'bg-[#C75560] text-white' : 'text-[#80576A] hover:bg-[#FFF0E8]'}`}
            >
              {p}
            </button>
          )
        )}
        <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A] disabled:opacity-40">
          <ChevronRight size={14} />
        </button>
        <button disabled={page === totalPages} onClick={() => setPage(totalPages)} className="hidden h-7 w-7 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A] disabled:opacity-40 sm:flex">
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Action menu                                                       */
/* ------------------------------------------------------------------ */

function ActionMenu({ txn, onView, onViewRecruiter, onProcessRefund, notify }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#1D181A]">
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] py-1 shadow-lg">
            <button onClick={() => { onView(txn); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <Eye size={14} /> View Details
            </button>
            <button onClick={() => { onViewRecruiter(txn.recruiter); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <User size={14} /> View Recruiter
            </button>
            <button onClick={() => { notify('Downloading invoice…'); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <FileDown size={14} /> Download Invoice
            </button>
            {txn.refundable && (
              <button onClick={() => { onProcessRefund(txn); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                <RefreshCcw size={14} /> Process Refund
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table skeleton / empty state                                      */
/* ------------------------------------------------------------------ */

function TableSkeleton({ cols = 8, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-3 py-4"><div className="h-3.5 w-full max-w-[110px] animate-pulse rounded-full bg-[#F3DED2]" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ label, cols = 10 }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#80576A]"><Receipt size={20} /></div>
        <p className="mt-3 text-sm font-medium text-[#80576A]">{label}</p>
        <p className="text-xs text-[#80576A]">Try adjusting your date range or filters.</p>
      </td>
    </tr>
  );
}

function EmptyCardState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#EBC2AE] bg-[#FFF0E8]/40 px-4 py-10 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#80576A]"><Receipt size={18} /></div>
      <p className="mt-3 text-sm font-medium text-[#80576A]">{label}</p>
      <p className="text-xs text-[#80576A]">Try adjusting your date range or filters.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile transaction card                                           */
/* ------------------------------------------------------------------ */

function TransactionCard({ t, onView, onViewRecruiter, onProcessRefund, notify }) {
  const meta = TYPE_META[t.type] || TYPE_META.Other;
  const Icon = meta.icon;
  return (
    <div className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-3.5 shadow-sm active:bg-[#FFF0E8]" onClick={() => onView(t)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${meta.color}1a` }}>
            <Icon size={16} style={{ color: meta.color }} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#1D181A]">{t.recruiter.name}</p>
            <p className="truncate text-xs text-[#80576A]">{t.recruiter.company}</p>
          </div>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <ActionMenu txn={t} onView={onView} onViewRecruiter={onViewRecruiter} onProcessRefund={onProcessRefund} notify={notify} />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] text-[#80576A]">{t.id}</p>
          <p className="mt-0.5 text-[11px] leading-tight text-[#80576A]">{formatDateTime(t.date)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold tabular-nums text-[#1D181A]">{formatINR(t.amount)}</p>
          <div className="mt-1"><StatusBadge status={t.status} /></div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Transaction details drawer                                        */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value, copyValue }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5 text-xs leading-tight">
      <span className="shrink-0 text-[#80576A]">{label}</span>
      <span className="flex min-w-0 items-center gap-1 truncate font-medium text-[#1D181A]">
        <span className="truncate text-xs">{value}</span>
        {copyValue && <CopyButton value={copyValue} label={label} />}
      </span>
    </div>
  );
}

function TransactionDrawer({ txn, onClose }) {
  if (!txn) return null;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[#1D181A]/40">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="wallet-drawer-surface relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[#EBC2AE] bg-[#FFFDFB] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#F3DED2] px-3 py-2">
          <div>
            <p className="text-[11px] text-[#80576A]">Transaction</p>
            <h3 className="text-sm font-semibold text-[#1D181A]">{txn.id}</h3>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8]"><X size={15} /></button>
        </div>

        <div className="space-y-2 px-3 py-2">
          <div>
            <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#80576A]"><Receipt size={11} /> Transaction Information</div>
            <DetailRow label="Payment ID" value={txn.paymentId} copyValue={txn.paymentId} />
            <DetailRow label="Order ID" value={txn.orderId} copyValue={txn.orderId} />
            <DetailRow label="Type" value={<TypeTag type={txn.type} />} />
            <DetailRow label="Amount" value={formatINR(txn.amount)} />
            <DetailRow label="Status" value={<StatusBadge status={txn.status} />} />
            <DetailRow label="Date & Time" value={formatDateTime(txn.date)} />
          </div>

          <div>
            <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#80576A]"><User size={11} /> Recruiter Information</div>
            <DetailRow label="Name" value={txn.recruiter.name} />
            <DetailRow label="Recruiter ID" value={txn.recruiter.id} />
            <DetailRow label="Company" value={txn.recruiter.company} />
            <DetailRow label="Email" value={txn.recruiter.email} />
            <DetailRow label="Phone" value={txn.recruiter.phone} />
          </div>

          <div>
            <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#80576A]"><CreditCard size={11} /> Payment Information</div>
            <DetailRow label="Method" value={txn.paymentMethod} />
            <DetailRow label="Gateway" value={txn.gateway} />
            <DetailRow label="Gateway Txn ID" value={txn.gatewayTxnId} copyValue={txn.gatewayTxnId} />
            <DetailRow label="Payment Status" value={<StatusBadge status={txn.status} />} />
          </div>

          {txn.wallet && (
            <div className="bg-[#FFF0E8] p-2">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#80576A]"><Wallet size={11} /> Wallet Ledger Entry</div>
              <DetailRow label="Opening Balance" value={formatINR(txn.wallet.previousBalance)} />
              <DetailRow label="Change" value={`${txn.wallet.change > 0 ? '+' : ''}${formatINR(txn.wallet.change)}`} />
              <DetailRow label="Closing Balance" value={formatINR(txn.wallet.newBalance)} />
            </div>
          )}

          {txn.candidate && (
            <div>
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#80576A]"><FileText size={11} /> Candidate Information</div>
              <DetailRow label="Candidate Name" value={txn.candidate.name} />
              <DetailRow label="Candidate ID" value={txn.candidate.id} />
              <DetailRow label="Resume ID" value={txn.candidate.resumeId} />
              <DetailRow label="Download Time" value={formatDateTime(txn.date)} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wallet history drawer                                             */
/* ------------------------------------------------------------------ */

function WalletHistoryDrawer({ recruiter, transactions, onClose, resolvedRange }) {
  if (!recruiter) return null;
  const history = transactions
    .filter((t) => t.recruiter.id === recruiter.id && t.wallet && isWithinResolvedRange(t.date, resolvedRange))
    .sort((a, b) => b.date - a.date);
  const totalRecharge = history.filter((t) => t.wallet.change > 0).reduce((s, t) => s + t.wallet.change, 0);
  const totalSpent = history.filter((t) => t.wallet.change < 0).reduce((s, t) => s + Math.abs(t.wallet.change), 0);
  const resumeDownloads = history.filter((t) => t.type === 'Resume Download').length;
  const currentBalance = history[0]?.wallet.newBalance ?? 0;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[#1D181A]/40">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="wallet-drawer-surface relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[#EBC2AE] bg-[#FFFDFB] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#F3DED2] px-3 py-2">
          <div>
            <p className="text-[11px] text-[#80576A]">Wallet Ledger — {recruiter.company}</p>
            <h3 className="text-sm font-semibold text-[#1D181A]">{recruiter.name}</h3>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8]"><X size={15} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-3 py-3">
          <div className="bg-[#FFF0E8] p-2.5">
            <p className="text-[11px] font-medium text-[#C75560]">Current Balance</p>
            <p className="text-base font-semibold tabular-nums text-[#A94658]">{formatINR(currentBalance)}</p>
          </div>
          <div className="bg-emerald-50 p-2.5">
            <p className="text-[11px] font-medium text-emerald-600">Total Recharge</p>
            <p className="text-base font-semibold tabular-nums text-emerald-700">{formatINR(totalRecharge)}</p>
          </div>
          <div className="bg-[#FFF0E8] p-2.5">
            <p className="text-[11px] font-medium text-[#80576A]">Total Spent</p>
            <p className="text-base font-semibold tabular-nums text-[#1D181A]">{formatINR(totalSpent)}</p>
          </div>
          <div className="bg-cyan-50 p-2.5">
            <p className="text-[11px] font-medium text-cyan-600">Resume Downloads</p>
            <p className="text-base font-semibold tabular-nums text-cyan-700">{resumeDownloads}</p>
          </div>
        </div>

        <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#80576A]">Complete Ledger History</div>
        <div className="divide-y divide-[#F3DED2] px-3 pb-4">
          {history.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 py-2 text-xs">
              <div>
                <p className="font-medium text-[#1D181A]">{t.description}</p>
                <p className="text-[11px] text-[#80576A]">{formatDateTime(t.date)}</p>
              </div>
              <span className={`font-semibold tabular-nums ${t.wallet.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {t.wallet.change > 0 ? '+' : ''}{formatINR(t.wallet.change)}
              </span>
            </div>
          ))}
          {history.length === 0 && <p className="py-6 text-center text-sm text-[#80576A]">No wallet activity yet.</p>}
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  All Transactions tab                                              */
/* ------------------------------------------------------------------ */

function AllTransactionsTab({ transactions, loading, onView, onViewRecruiter, onProcessRefund, notify, filters, setFilters, filterDrawerOpen, setFilterDrawerOpen }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const min = filters.minAmount ? Number(filters.minAmount) : null;
    const max = filters.maxAmount ? Number(filters.maxAmount) : null;
    return transactions.filter((t) => {
      if (filters.type !== 'All' && t.type !== filters.type) return false;
      if (filters.status !== 'All' && t.status !== filters.status) return false;
      if (filters.method !== 'All' && t.paymentMethod !== filters.method) return false;
      if (min !== null && t.amount < min) return false;
      if (max !== null && t.amount > max) return false;
      if (filters.refundableOnly && !t.refundable) return false;
      if (filters.walletOnly && !t.wallet) return false;
      if (q) {
        const hay = `${t.id} ${t.recruiter.name} ${t.recruiter.company} ${t.paymentId} ${t.candidate?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  useEffect(() => setPage(1), [filters, transactions]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeAdvancedCount = Object.entries(EMPTY_ADVANCED_FILTERS).filter(([k, v]) => filters[k] !== v).length;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] shadow-sm">
      <div className="flex flex-col gap-2 border-b border-[#F3DED2] bg-[#FFFDFB] p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full min-w-0 sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#80576A]" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search transaction, recruiter, company, payment ID…"
            className="w-full rounded-xl border border-[#EBC2AE] bg-[#FFF0E8] py-1.5 pl-9 pr-3 text-xs placeholder:text-[#80576A] focus:border-[#D9654A] focus:bg-[#FFFDFB] focus:outline-none focus:ring-2 focus:ring-[#FFF0E8] sm:text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {activeAdvancedCount > 0 && (
            <button onClick={() => setFilters({ search: '', ...EMPTY_ADVANCED_FILTERS })} className="flex items-center gap-1 text-xs font-medium text-[#C75560] hover:underline">
              <RotateCcw size={12} /> Clear {activeAdvancedCount} filter{activeAdvancedCount > 1 ? 's' : ''}
            </button>
          )}
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="relative flex items-center gap-1.5 rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] px-2.5 py-1.5 text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"
          >
            <SlidersHorizontal size={13} /> Filters
            {activeAdvancedCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C75560] text-[9px] font-bold text-white">{activeAdvancedCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Desktop table — sticky first + action columns */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[1230px] table-fixed text-left text-xs leading-tight">
          <colgroup>
            <col className="w-[180px]" />
            <col className="w-[125px]" />
            <col className="w-[145px]" />
            <col className="w-[135px]" />
            <col className="w-[170px]" />
            <col className="w-[78px]" />
            <col className="w-[95px]" />
            <col className="w-[95px]" />
            <col className="w-[150px]" />
            <col className="w-[58px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-[10px] font-bold uppercase tracking-wide text-[#80576A]">
              <th className="sticky left-0 z-10 bg-[#FFF0E8] px-2 py-2">Transaction ID</th>
              <th className="px-2 py-2">Recruiter</th>
              <th className="px-2 py-2">Company</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Method</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Date &amp; Time</th>
              <th className="sticky right-0 z-10 bg-[#FFF0E8] px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3DED2] text-xs">
            {loading ? (
              <TableSkeleton cols={10} />
            ) : paged.length === 0 ? (
              <EmptyState label="No transactions match your filters" />
            ) : (
              paged.map((t) => (
                <tr key={t.id} className="group hover:bg-[#FFF0E8]">
                  <td className="sticky left-0 z-10 break-all bg-[#FFFDFB] px-1.5 py-1.5 align-top text-[11px] font-medium leading-tight text-[#1D181A] group-hover:bg-[#FFF0E8]">{t.id}</td>
                  <td className="break-words px-1.5 py-1.5 align-top leading-tight text-[#1D181A]">{t.recruiter.name}</td>
                  <td className="break-words px-1.5 py-1.5 align-top leading-tight text-[#1D181A]">{t.recruiter.company}</td>
                  <td className="px-1.5 py-1.5 align-top"><TypeTag type={t.type} /></td>
                  <td className="px-1.5 py-1.5 align-top leading-tight text-[#80576A] break-words">{t.description}</td>
                  <td className="px-1.5 py-1.5 align-top font-semibold tabular-nums text-[#1D181A]">{formatINR(t.amount)}</td>
                  <td className="px-1.5 py-1.5 align-top leading-tight text-[#1D181A] break-words">{t.paymentMethod}</td>
                  <td className="px-1.5 py-1.5 align-top"><StatusBadge status={t.status} /></td>
                  <td className="px-1.5 py-1.5 align-top whitespace-normal leading-tight text-[#80576A]">{formatDateTime(t.date)}</td>
                  <td className="sticky right-0 z-10 bg-[#FFFDFB] px-1.5 py-1.5 align-top text-right group-hover:bg-[#FFF0E8]">
                    <ActionMenu txn={t} onView={onView} onViewRecruiter={onViewRecruiter} onProcessRefund={onProcessRefund} notify={notify} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2.5 p-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-[#F3DED2]" />)
        ) : paged.length === 0 ? (
          <EmptyCardState label="No transactions match your filters" />
        ) : (
          paged.map((t) => (
            <TransactionCard key={t.id} t={t} onView={onView} onViewRecruiter={onViewRecruiter} onProcessRefund={onProcessRefund} notify={notify} />
          ))
        )}
      </div>

      <Pagination page={safePage} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} />

      <FilterDrawer open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} filters={filters} setFilters={setFilters} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wallet Transactions tab                                           */
/* ------------------------------------------------------------------ */

function WalletTransactionsTab({ transactions, onViewWallet }) {
  const summaries = useMemo(() => {
    const recruiters = [...new Map(transactions.map((transaction) => [transaction.recruiter.id, transaction.recruiter])).values()];
    return recruiters.map((r) => {
      const history = transactions.filter((t) => t.recruiter.id === r.id && t.wallet).sort((a, b) => b.date - a.date);
      const added = history.filter((t) => t.wallet.change > 0).reduce((s, t) => s + t.wallet.change, 0);
      const used = history.filter((t) => t.wallet.change < 0).reduce((s, t) => s + Math.abs(t.wallet.change), 0);
      const current = history[0]?.wallet.newBalance ?? 0;
      const previous = history[history.length - 1]?.wallet.previousBalance ?? 0;
      return { recruiter: r, previous, added, used, current, lastTxn: history[0]?.date, status: history[0]?.status || 'Success' };
    });
  }, [transactions]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] shadow-sm">
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[900px] table-fixed text-left text-xs">
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-[10px] font-bold uppercase tracking-wide text-[#80576A]">
              <th className="sticky left-0 z-10 bg-[#FFF0E8] px-2 py-2">Recruiter</th>
              <th className="px-2 py-2">Company</th>
              <th className="px-2 py-2">Previous Balance</th>
              <th className="px-2 py-2">Amount Added</th>
              <th className="px-2 py-2">Amount Used</th>
              <th className="px-2 py-2">Current Balance</th>
              <th className="px-2 py-2">Last Transaction</th>
              <th className="px-2 py-2">Status</th>
              <th className="sticky right-0 z-10 bg-[#FFF0E8] px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3DED2] text-xs">
            {summaries.map((s) => (
              <tr key={s.recruiter.id} className="group hover:bg-[#FFF0E8]">
                <td className="sticky left-0 z-10 bg-[#FFFDFB] px-2 py-2 align-top font-medium leading-tight text-[#1D181A] group-hover:bg-[#FFF0E8]">{s.recruiter.name}</td>
                <td className="px-2 py-2 align-top leading-tight text-[#1D181A] break-words">{s.recruiter.company}</td>
                <td className="px-2 py-2 align-top text-[#80576A]">{formatINR(s.previous)}</td>
                <td className="px-2 py-2 align-top font-medium text-emerald-600">+{formatINR(s.added)}</td>
                <td className="px-2 py-2 align-top font-medium text-red-600">-{formatINR(s.used)}</td>
                <td className="px-2 py-2 align-top font-semibold tabular-nums text-[#1D181A]">{formatINR(s.current)}</td>
                <td className="px-2 py-2 align-top whitespace-normal leading-tight text-[#80576A]">{s.lastTxn ? formatDateTime(s.lastTxn) : '—'}</td>
                <td className="px-2 py-2 align-top"><StatusBadge status={s.status} /></td>
                <td className="sticky right-0 z-10 bg-[#FFFDFB] px-2 py-2 align-top text-right group-hover:bg-[#FFF0E8]">
                  <button onClick={() => onViewWallet(s.recruiter)} className="rounded-lg border border-[#EBC2AE] px-3 py-1.5 text-xs font-semibold text-[#C75560] hover:bg-[#FFF0E8]">
                    View Wallet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2.5 p-3 sm:hidden">
        {summaries.map((s) => (
          <div key={s.recruiter.id} className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1D181A]">{s.recruiter.name}</p>
                <p className="text-xs text-[#80576A]">{s.recruiter.company}</p>
              </div>
              <p className="text-base font-bold tabular-nums text-[#1D181A]">{formatINR(s.current)}</p>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-emerald-600">+{formatINR(s.added)} added</span>
              <span className="text-red-600">-{formatINR(s.used)} used</span>
            </div>
            <button onClick={() => onViewWallet(s.recruiter)} className="mt-3 w-full rounded-xl border border-[#EBC2AE] py-2 text-xs font-semibold text-[#C75560] hover:bg-[#FFF0E8]">
              View Wallet Ledger
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Resume Downloads tab                                              */
/* ------------------------------------------------------------------ */

function ResumeDownloadsTab({ transactions, onView }) {
  const rows = transactions.filter((t) => t.type === 'Resume Download');
  return (
    <div className="overflow-hidden rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] shadow-sm">
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[1150px] table-fixed text-left text-xs">
          <colgroup>
            <col className="w-[190px]" />
            <col className="w-[130px]" />
            <col className="w-[140px]" />
            <col className="w-[130px]" />
            <col className="w-[80px]" />
            <col className="w-[180px]" />
            <col className="w-[150px]" />
            <col className="w-[95px]" />
            <col className="w-[58px]" />
          </colgroup>
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-[10px] font-bold uppercase tracking-wide text-[#80576A]">
              <th className="sticky left-0 z-10 bg-[#FFF0E8] px-2 py-2">Transaction ID</th>
              <th className="px-2 py-2">Recruiter</th>
              <th className="px-2 py-2">Candidate</th>
              <th className="px-2 py-2">Resume ID</th>
              <th className="px-2 py-2">Amount</th>
              <th className="px-2 py-2">Wallet Balance</th>
              <th className="px-2 py-2">Date &amp; Time</th>
              <th className="px-2 py-2">Status</th>
              <th className="sticky right-0 z-10 bg-[#FFF0E8] px-2 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3DED2] text-xs">
            {rows.length === 0 ? (
              <EmptyState label="No resume downloads yet" cols={9} />
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="group hover:bg-[#FFF0E8]">
                  <td className="sticky left-0 z-10 break-all bg-[#FFFDFB] px-2 py-2 align-top text-[11px] font-medium leading-tight text-[#1D181A] group-hover:bg-[#FFF0E8]">{t.id}</td>
                  <td className="break-words px-2 py-2 align-top leading-tight text-[#1D181A]">{t.recruiter.name}</td>
                  <td className="break-words px-2 py-2 align-top leading-tight text-[#1D181A]">{t.candidate?.name}</td>
                  <td className="break-all px-2 py-2 align-top text-[#80576A]">{t.candidate?.resumeId}</td>
                  <td className="px-2 py-2 align-top font-semibold text-red-600">-{formatINR(t.amount)}</td>
                  <td className="px-2 py-2 align-top whitespace-normal leading-tight text-[#80576A]">{formatINR(t.wallet?.previousBalance)} → {formatINR(t.wallet?.newBalance)}</td>
                  <td className="px-2 py-2 align-top whitespace-normal leading-tight text-[#80576A]">{formatDateTime(t.date)}</td>
                  <td className="px-2 py-2 align-top"><StatusBadge status={t.status} /></td>
                  <td className="sticky right-0 z-10 bg-[#FFFDFB] px-2 py-2 align-top text-right group-hover:bg-[#FFF0E8]">
                    <button onClick={() => onView(t)} className="rounded-lg p-2 text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#1D181A]"><Eye size={15} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2.5 p-3 sm:hidden">
        {rows.length === 0 ? (
          <EmptyCardState label="No resume downloads yet" />
        ) : (
          rows.map((t) => (
            <div key={t.id} className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-3.5" onClick={() => onView(t)}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-[#1D181A]">{t.candidate?.name}</p>
                <p className="text-sm font-bold text-red-600">-{formatINR(t.amount)}</p>
              </div>
              <p className="text-xs text-[#80576A]">unlocked by {t.recruiter.name}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-[#80576A]">
                <span>{formatDateTime(t.date)}</span>
                <StatusBadge status={t.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Refunds tab                                                       */
/* ------------------------------------------------------------------ */

const REFUND_STATUS_META = {
  Pending: 'text-[#9A671A] bg-[#FDF1DD] ring-[#9A671A]/20',
  Approved: 'text-[#0369A1] bg-[#E6F6FD] ring-[#0EA5E9]/20',
  Processing: 'text-[#A94658] bg-[#FFF0E8] ring-[#C75560]/20',
  Completed: 'text-emerald-700 bg-emerald-50 ring-emerald-600/20',
  Rejected: 'text-red-700 bg-red-50 ring-red-600/20',
};

function RefundsTab({ refunds, setRefunds, notify, onUpdateStatus, resolvedRange }) {
  const [confirmState, setConfirmState] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const visibleRefunds = refunds.filter((refund) => isWithinResolvedRange(refund.requestedDate, resolvedRange));

  async function runAction() {
    if (!confirmState) return;
    const { refund, action } = confirmState;
    setActionLoading(true);
    try {
      await onUpdateStatus(refund, action);
      setRefunds((list) => list.map((r) => (r.id === refund.id ? { ...r, status: action === 'approve' ? 'Completed' : 'Rejected' } : r)));
      notify(action === 'approve' ? `Refund ${refund.id} approved` : `Refund ${refund.id} rejected`, action === 'approve' ? 'success' : 'error');
      setConfirmState(null);
    } catch (error) {
      notify(error.response?.data?.error || 'Unable to update refund', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] shadow-sm">
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[1000px] table-fixed text-left text-xs">
            <thead>
              <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-[10px] font-bold uppercase tracking-wide text-[#80576A]">
                <th className="sticky left-0 z-10 bg-[#FFF0E8] px-2 py-2">Refund ID</th>
                <th className="px-2 py-2">Transaction ID</th>
                <th className="px-2 py-2">Recruiter</th>
                <th className="px-2 py-2">Refund Amount</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Requested</th>
                <th className="px-2 py-2">Status</th>
                <th className="sticky right-0 z-10 bg-[#FFF0E8] px-2 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3DED2] text-xs">
              {visibleRefunds.map((r) => (
                <tr key={r.id} className="group hover:bg-[#FFF0E8]">
                  <td className="sticky left-0 z-10 bg-[#FFFDFB] px-2 py-2 align-top font-medium leading-tight text-[#1D181A] group-hover:bg-[#FFF0E8]">{r.id}</td>
                  <td className="px-2 py-2 align-top text-[#1D181A]">{r.txnId}</td>
                  <td className="px-2 py-2 align-top leading-tight text-[#1D181A] break-words">{r.recruiter.name}<span className="block text-[10px] text-[#80576A]">{r.recruiter.company}</span></td>
                  <td className="px-2 py-2 align-top font-semibold text-[#1D181A]">{formatINR(r.refundAmount)}</td>
                  <td className="max-w-[220px] px-2 py-2 align-top leading-tight text-[#80576A] break-words">{r.reason}</td>
                  <td className="px-2 py-2 align-top whitespace-normal leading-tight text-[#80576A]">{formatDateTime(r.requestedDate)}</td>
                  <td className="px-2 py-2 align-top"><span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${REFUND_STATUS_META[r.status]}`}>{r.status}</span></td>
                  <td className="sticky right-0 z-10 bg-[#FFFDFB] px-2 py-2 align-top text-right group-hover:bg-[#FFF0E8]">
                    {r.status === 'Pending' ? (
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setConfirmState({ refund: r, action: 'approve' })} className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50">Approve</button>
                        <button onClick={() => setConfirmState({ refund: r, action: 'reject' })} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">Reject</button>
                      </div>
                    ) : <span className="text-xs text-[#80576A]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2.5 p-3 sm:hidden">
          {visibleRefunds.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#80576A]">{r.id}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${REFUND_STATUS_META[r.status]}`}>{r.status}</span>
              </div>
              <p className="mt-1 text-sm font-semibold text-[#1D181A]">{r.recruiter.name} — {r.recruiter.company}</p>
              <p className="mt-1 text-xs text-[#80576A]">{r.reason}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-bold text-[#1D181A]">{formatINR(r.refundAmount)}</p>
                {r.status === 'Pending' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setConfirmState({ refund: r, action: 'approve' })} className="rounded-lg border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-600">Approve</button>
                    <button onClick={() => setConfirmState({ refund: r, action: 'reject' })} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600">Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.action === 'approve' ? 'Approve this refund?' : 'Reject this refund?'}
        description={confirmState ? `${confirmState.refund.id} for ${formatINR(confirmState.refund.refundAmount)} to ${confirmState.refund.recruiter.name}. This action cannot be undone.` : ''}
        confirmLabel={confirmState?.action === 'approve' ? 'Approve Refund' : 'Reject Refund'}
        tone={confirmState?.action === 'approve' ? 'default' : 'danger'}
        onConfirm={runAction}
        onCancel={() => setConfirmState(null)}
        loading={actionLoading}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Settlements tab                                                   */
/* ------------------------------------------------------------------ */

function SettlementsTab({ settlements }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-4">
      {settlements.map((s) => (
        <div key={s.gateway} className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#C75560]"><Landmark size={20} /></span>
              <div>
                <h3 className="font-semibold text-[#1D181A]">{s.gateway}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600"><CheckCircle2 size={11} /> {s.status}</span>
              </div>
            </div>
            <button onClick={() => setSelected(s)} className="rounded-xl border border-[#EBC2AE] px-4 py-2 text-sm font-semibold text-[#1D181A] hover:bg-[#FFF0E8]">View Settlement Details</button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div><p className="text-xs text-[#80576A]">Total Transactions</p><p className="text-sm font-semibold text-[#1D181A]">{s.totalTxns}</p></div>
            <div><p className="text-xs text-[#80576A]">Successful</p><p className="text-base font-semibold text-emerald-600">{s.successful}</p></div>
            <div><p className="text-xs text-[#80576A]">Failed</p><p className="text-base font-semibold text-red-600">{s.failed}</p></div>
            <div><p className="text-xs text-[#80576A]">Net Settlement</p><p className="text-sm font-semibold text-[#1D181A]">{formatINR(s.net)}</p></div>
          </div>
        </div>
      ))}

      {settlements.length === 0 && <EmptyCardState label="No settlement data available" />}

      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1D181A]/40 px-4" onClick={() => setSelected(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#1D181A]">{selected.gateway} Settlement</h3>
              <button onClick={() => setSelected(null)} className="text-[#80576A] hover:text-[#1D181A]"><X size={18} /></button>
            </div>
            <p className="mt-1 text-xs text-[#80576A]">Money received from recruiters via gateway — separate from wallet balances.</p>
            <div className="mt-4 space-y-2 rounded-2xl bg-[#FFF0E8] p-4">
              <DetailRow label="Gross Amount" value={formatINR(selected.totalAmount)} />
              <DetailRow label="Gateway Fee" value={<span className="text-red-600">-{formatINR(selected.fee)}</span>} />
              <DetailRow label="Net Settlement" value={<span className="text-emerald-600">{formatINR(selected.net)}</span>} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [activeTxn, setActiveTxn] = useState(null);
  const [activeWalletRecruiter, setActiveWalletRecruiter] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [dateRange, setDateRange] = useState({ preset: '30d', from: null, to: null });
  const [filters, setFilters] = useState({ search: '', ...EMPTY_ADVANCED_FILTERS });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  function notify(message, type = 'success') {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }

  async function loadData() {
      try {
        const { data } = await adminAxiosInstance.get('/payments/overview');
        const normalizeDates = (rows = []) => rows.map((row) => ({ ...row, date: new Date(row.date) }));
        const normalizeRefunds = (rows = []) => rows.map((row) => ({ ...row, requestedDate: new Date(row.requestedDate) }));
        setTransactions(normalizeDates(data.transactions));
        setWalletTransactions(normalizeDates(data.walletTransactions));
        setRefunds(normalizeRefunds(data.refunds));
        setSettlements(data.settlements || []);
        setAnalytics(data.analytics || {});
      } catch (error) {
        notify(error.response?.data?.error || 'Unable to load payment data', 'error');
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function processRefund(txn) {
    try {
      if (!txn.paymentRecordId) throw new Error('Payment record is unavailable for this transaction');
      await adminAxiosInstance.post(`/payments/${txn.paymentRecordId}/refund`);
      await loadData();
      notify(`Refund processed for ${txn.id}`);
    } catch (error) {
      notify(error.response?.data?.error || error.message || 'Unable to process refund', 'error');
    }
  }

  async function updateRefundStatus(refund, action) {
    await adminAxiosInstance.patch(`/payments/refunds/${refund.transactionId}/status`, { status: action });
  }

  // Header date range is the single source of truth — drives stats, charts and the table.
  const resolvedRange = useMemo(() => resolveDateRange(dateRange), [dateRange]);
  const rangedTransactions = useMemo(
    () => transactions.filter((t) => isWithinResolvedRange(t.date, resolvedRange)),
    [transactions, resolvedRange]
  );

  function handleCardClick(filterPatch) {
    setTab('all');
    setFilters((f) => ({ ...EMPTY_ADVANCED_FILTERS, search: f.search, ...filterPatch }));
  }

  return (
    <div className="wallet-payments-page min-w-0 w-full max-w-full space-y-4 overflow-x-clip [&_*]:!rounded-none">
      <Toasts toasts={toasts} />

      <PageHeader
        transactions={rangedTransactions}
        notify={notify}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />

      <OverviewCards transactions={rangedTransactions} onCardClick={handleCardClick} />

      <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-3 xl:gap-4">
        <div className="min-w-0 lg:col-span-2"><RevenueAnalytics analytics={analytics} /></div>
        <div className="min-w-0"><TypeBreakdown transactions={rangedTransactions} /></div>
      </div>

      <div className="flex gap-0.5 overflow-x-auto border border-[#EBC2AE] bg-[#FFFDFB] p-0.5 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap px-2.5 py-1.5 text-[11px] font-semibold transition ${
              tab === t.key ? 'bg-[#C75560] text-white shadow-sm' : 'text-[#80576A] hover:bg-[#FFF0E8]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <AllTransactionsTab
          transactions={rangedTransactions}
          loading={loading}
          onView={setActiveTxn}
          onViewRecruiter={setActiveWalletRecruiter}
          onProcessRefund={processRefund}
          notify={notify}
          filters={filters}
          setFilters={setFilters}
          filterDrawerOpen={filterDrawerOpen}
          setFilterDrawerOpen={setFilterDrawerOpen}
        />
      )}
      {tab === 'wallet' && <WalletTransactionsTab transactions={walletTransactions.filter((t) => isWithinResolvedRange(t.date, resolvedRange))} onViewWallet={setActiveWalletRecruiter} />}
      {tab === 'resume' && <ResumeDownloadsTab transactions={rangedTransactions} onView={setActiveTxn} />}
      {tab === 'refunds' && <RefundsTab refunds={refunds} setRefunds={setRefunds} notify={notify} onUpdateStatus={updateRefundStatus} resolvedRange={resolvedRange} />}
      {tab === 'settlements' && <SettlementsTab settlements={settlements} />}

      <AnimatePresence>{activeTxn && <TransactionDrawer txn={activeTxn} onClose={() => setActiveTxn(null)} />}</AnimatePresence>
      <AnimatePresence>
        {activeWalletRecruiter && (
          <WalletHistoryDrawer recruiter={activeWalletRecruiter} transactions={walletTransactions} resolvedRange={resolvedRange} onClose={() => setActiveWalletRecruiter(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}