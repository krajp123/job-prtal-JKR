import { useEffect, useMemo, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  IndianRupee,
  FileDown,
  Download,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  MoreVertical,
  Eye,
  User,
  Receipt,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Building2,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Landmark,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Mock data — replace with real API responses once wired up          */
/* ------------------------------------------------------------------ */

const RECRUITERS = [
  { id: 'REC-1042', name: 'Rahul Sharma', company: 'ABC Technologies', email: 'rahul.sharma@abctech.in', phone: '+91 98765 43210' },
  { id: 'REC-1088', name: 'Priya Menon', company: 'Skyline Software', email: 'priya.menon@skylinesw.com', phone: '+91 90123 45678' },
  { id: 'REC-1121', name: 'Aditya Verma', company: 'NovaWorks Pvt Ltd', email: 'aditya.verma@novaworks.io', phone: '+91 91234 56780' },
  { id: 'REC-1156', name: 'Sneha Kapoor', company: 'BrightPath Consulting', email: 'sneha.kapoor@brightpath.co', phone: '+91 99887 76655' },
  { id: 'REC-1203', name: 'Karan Malhotra', company: 'Quantica Systems', email: 'karan.malhotra@quantica.dev', phone: '+91 97654 32109' },
  { id: 'REC-1247', name: 'Ishita Rao', company: 'Vertex Analytics', email: 'ishita.rao@vertexan.com', phone: '+91 93456 78901' },
];

const CANDIDATES = [
  { id: 'CAND-8821', name: 'Amit Joshi', resumeId: 'RES-4471' },
  { id: 'CAND-8845', name: 'Neha Gupta', resumeId: 'RES-4502' },
  { id: 'CAND-8902', name: 'Vikram Singh', resumeId: 'RES-4560' },
  { id: 'CAND-8961', name: 'Ritu Nair', resumeId: 'RES-4611' },
];

const STATUS_META = {
  Success: { color: 'text-emerald-700 bg-emerald-50 ring-emerald-600/20', icon: CheckCircle2 },
  Pending: { color: 'text-[#9A671A] bg-[#FDF1DD] ring-[#9A671A]/20', icon: Clock },
  Failed: { color: 'text-red-700 bg-red-50 ring-red-600/20', icon: XCircle },
  Refunded: { color: 'text-[#0369A1] bg-[#E6F6FD] ring-[#0EA5E9]/20', icon: RefreshCcw },
  Cancelled: { color: 'text-[#1D181A] bg-[#F3DED2] ring-[#80576A]/20', icon: X },
};

/* Categorical palette for transaction types — brand warm tones (rust, coral, dusty
   rose, amber) plus one premium sky blue for contrast, no orange repeats. */
const TYPE_META = {
  'Wallet Recharge': { color: '#D9654A', icon: Wallet },      // Rust — secondary accent
  'Resume Download': { color: '#0EA5E9', icon: FileText },    // Sky blue
  'Job Posting': { color: '#80576A', icon: Building2 },       // Dusty Rose
  Subscription: { color: '#C75560', icon: ShieldCheck },      // Coral Primary
  Refund: { color: '#9A671A', icon: RefreshCcw },             // Amber Dark
  Other: { color: '#6B7280', icon: Receipt },                 // neutral gray
};

const PAYMENT_METHODS = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet'];

function pad(n) {
  return String(n).padStart(3, '0');
}

function buildMockTransactions() {
  const rows = [];
  const types = ['Wallet Recharge', 'Resume Download', 'Job Posting', 'Subscription', 'Refund'];
  const statuses = ['Success', 'Success', 'Success', 'Pending', 'Failed', 'Refunded', 'Cancelled'];
  const now = new Date('2026-08-13T10:32:00');

  let idx = 1;
  for (let d = 0; d < 18; d++) {
    const perDay = d % 3 === 0 ? 3 : 2;
    for (let i = 0; i < perDay; i++) {
      const recruiter = RECRUITERS[(d + i) % RECRUITERS.length];
      const type = types[(d + i * 2) % types.length];
      const status = statuses[(d + i) % statuses.length];
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(9 + i * 2, 15 + i * 7, 0);

      let amount, description, candidate = null, wallet = null;

      if (type === 'Wallet Recharge') {
        amount = [500, 1000, 2000, 5000][(d + i) % 4];
        description = 'Wallet recharge';
        const prev = 350 + (d * 37) % 900;
        wallet = { previousBalance: prev, change: amount, newBalance: prev + amount };
      } else if (type === 'Resume Download') {
        amount = 9;
        const cand = CANDIDATES[(d + i) % CANDIDATES.length];
        candidate = cand;
        description = `Resume unlock — ${cand.name}`;
        const prev = 100 + (d * 53) % 900;
        wallet = { previousBalance: prev, change: -amount, newBalance: prev - amount };
      } else if (type === 'Job Posting') {
        amount = [299, 499, 799][(d + i) % 3];
        description = 'Featured job listing fee';
      } else if (type === 'Subscription') {
        amount = [1999, 4999, 9999][(d + i) % 3];
        description = 'Recruiter subscription renewal';
      } else {
        amount = [9, 500, 1000][(d + i) % 3];
        description = 'Refund issued for failed service';
      }

      rows.push({
        id: `TXN-20260813-${pad(idx)}`,
        recruiter,
        type,
        description,
        amount,
        paymentMethod: PAYMENT_METHODS[(d + i) % PAYMENT_METHODS.length],
        status,
        date,
        paymentId: `pay_${Math.random().toString(36).slice(2, 12)}`,
        orderId: `order_${Math.random().toString(36).slice(2, 12)}`,
        gateway: 'Razorpay',
        gatewayTxnId: `rzp_${Math.random().toString(36).slice(2, 10)}`,
        candidate,
        wallet,
        refundable: status === 'Success' && type !== 'Refund',
      });
      idx += 1;
    }
  }
  return rows;
}

const MOCK_TRANSACTIONS = buildMockTransactions();

function buildMockRefunds() {
  const reasons = [
    'Duplicate payment charged',
    'Failed resume unlock, amount not credited',
    'Recruiter cancelled subscription within trial',
    'Payment gateway timeout, amount debited twice',
    'Job posting removed due to policy violation',
  ];
  const statuses = ['Pending', 'Approved', 'Processing', 'Completed', 'Rejected'];
  return Array.from({ length: 8 }).map((_, i) => {
    const recruiter = RECRUITERS[i % RECRUITERS.length];
    const original = [499, 999, 1999, 9, 5000][i % 5];
    const date = new Date('2026-08-13T10:00:00');
    date.setDate(date.getDate() - i * 2);
    return {
      id: `REF-2026-${pad(i + 1)}`,
      txnId: `TXN-20260813-${pad(i + 4)}`,
      recruiter,
      originalAmount: original,
      refundAmount: original,
      reason: reasons[i % reasons.length],
      requestedDate: date,
      status: statuses[i % statuses.length],
    };
  });
}

const MOCK_REFUNDS = buildMockRefunds();

const SETTLEMENTS = [
  {
    gateway: 'Razorpay',
    totalTxns: 486,
    successful: 452,
    failed: 34,
    totalAmount: 150000,
    fee: 2500,
    net: 147500,
    status: 'Settled',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatINR(n) {
  return `₹${Number(n).toLocaleString('en-IN')}`;
}

function formatDateTime(date) {
  return date.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function isWithinRange(date, range) {
  const now = new Date('2026-08-13T23:59:59');
  const diffDays = (now - date) / (1000 * 60 * 60 * 24);
  if (range === 'today') return diffDays < 1;
  if (range === 'yesterday') return diffDays >= 1 && diffDays < 2;
  if (range === '7d') return diffDays <= 7;
  if (range === '30d') return diffDays <= 30;
  return true;
}

function buildRevenueSeries(period) {
  const points = { '7d': 7, '30d': 30, '3m': 12, '6m': 6, '1y': 12 }[period];
  const labelFn = {
    '7d': (i) => `Day ${i + 1}`,
    '30d': (i) => `${i + 1}`,
    '3m': (i) => `W${i + 1}`,
    '6m': (i) => ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i],
    '1y': (i) => ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][i],
  }[period];
  return Array.from({ length: points }).map((_, i) => {
    const seed = (i + 1) * 17;
    return {
      label: labelFn(i),
      revenue: 1200 + (seed % 11) * 340,
      recharge: 800 + (seed % 7) * 260,
      resume: 150 + (seed % 5) * 60,
      refund: 40 + (seed % 4) * 35,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Small shared UI primitives                                        */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.Cancelled;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.color}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

function TypeTag({ type }) {
  const meta = TYPE_META[type] || TYPE_META.Other;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-[#1D181A]">
      <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}1a` }}>
        <Icon size={13} style={{ color: meta.color }} />
      </span>
      {type}
    </span>
  );
}

function Toasts({ toasts }) {
  return (
    <div className="pointer-events-none fixed right-6 top-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className={`pointer-events-auto flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${
              t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
/*  Overview cards                                                    */
/* ------------------------------------------------------------------ */

const OVERVIEW_CARDS = [
  { key: 'revenue', title: 'Total Revenue', amount: 245680, change: '+12.5%', up: true, sub: 'compared to previous month', icon: IndianRupee, tint: 'indigo' },
  { key: 'recharge', title: 'Wallet Recharge', amount: 150000, change: '+8.2%', up: true, sub: 'total amount added by recruiters', icon: Wallet, tint: 'blue' },
  { key: 'resume', title: 'Resume Download Revenue', amount: 78450, change: '+5.1%', up: true, sub: 'revenue from resume downloads', icon: FileText, tint: 'cyan' },
  { key: 'pending', title: 'Pending Payments', amount: 12350, change: '-2.4%', up: false, sub: 'transactions awaiting confirmation', icon: Clock, tint: 'amber' },
  { key: 'refunds', title: 'Refunds', amount: 8250, change: '+1.1%', up: false, sub: 'total refunded this month', icon: RefreshCcw, tint: 'purple' },
  { key: 'failed', title: 'Failed Transactions', amount: 4680, change: '-3.6%', up: true, sub: 'total failed payment amount', icon: XCircle, tint: 'red' },
];

const TINTS = {
  indigo: 'bg-[#FFF0E8] text-[#C75560]',   // revenue — Coral
  blue: 'bg-[#FBE7DC] text-[#D9654A]',     // wallet recharge — Rust
  cyan: 'bg-[#E6F6FD] text-[#0EA5E9]',     // resume revenue — Sky
  amber: 'bg-[#FDF1DD] text-[#9A671A]',    // pending — Amber Dark
  purple: 'bg-[#F3E7EA] text-[#80576A]',   // refunds — Dusty Rose
  red: 'bg-red-50 text-red-600',           // failed — kept semantic red
};

function OverviewCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {OVERVIEW_CARDS.map((c) => (
        <div key={c.key} className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TINTS[c.tint]}`}>{c.title.split(' ')[0]}</span>
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${c.up ? 'text-emerald-600' : 'text-red-500'}`}>
              {c.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {c.change}
            </span>
          </div>
          <p className="mt-2.5 text-lg font-semibold tracking-tight text-[#1D181A]">{formatINR(c.amount)}</p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-[#80576A]">{c.title}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Revenue analytics (line chart) — lazy-load recharts so the file    */
/*  still works if the package isn't installed yet.                    */
/* ------------------------------------------------------------------ */

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';

const PERIODS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '3m', label: '3 Months' },
  { key: '6m', label: '6 Months' },
  { key: '1y', label: '1 Year' },
];

function RevenueAnalytics() {
  const [period, setPeriod] = useState('30d');
  const series = useMemo(() => buildRevenueSeries(period), [period]);

  return (
    <div className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#1D181A]">Revenue Overview</h2>
          <p className="text-xs text-[#80576A]">Revenue, recharge, resume downloads & refunds over time</p>
        </div>
        <div className="flex rounded-lg border border-[#EBC2AE] bg-[#FFF0E8] p-0.5">
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

      <div className="mt-3 grid grid-cols-3 gap-3 sm:w-max">
        <div>
          <p className="text-[11px] font-medium text-[#80576A]">Total Revenue</p>
          <p className="text-sm font-semibold text-[#1D181A]">₹2,45,680</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#80576A]">This Month</p>
          <p className="text-sm font-semibold text-[#1D181A]">₹42,500</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-[#80576A]">Last Month</p>
          <p className="text-sm font-semibold text-[#1D181A]">₹37,800</p>
        </div>
      </div>

      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ left: -20, right: 10, top: 10 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C75560" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#C75560" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3DED2" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#80576A' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#80576A' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
            <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 12, border: '1px solid #EBC2AE', fontSize: 12 }} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#C75560" fill="url(#revFill)" strokeWidth={2} />
            <Area type="monotone" dataKey="recharge" name="Wallet Recharge" stroke="#D9654A" fill="transparent" strokeWidth={1.5} />
            <Area type="monotone" dataKey="resume" name="Resume Downloads" stroke="#0EA5E9" fill="transparent" strokeWidth={1.5} />
            <Area type="monotone" dataKey="refund" name="Refunds" stroke="#9A671A" fill="transparent" strokeWidth={1.5} strokeDasharray="4 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TypeBreakdown({ transactions }) {
  const breakdown = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      map[t.type] = (map[t.type] || 0) + t.amount;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map)
      .map(([type, amount]) => ({ type, amount, pct: Math.round((amount / total) * 1000) / 10 }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  return (
    <div className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-[#1D181A]">Transaction Type Breakdown</h2>
      <p className="text-xs text-[#80576A]">Share of total transaction value by type</p>

      <div className="mt-3 grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={breakdown} dataKey="amount" nameKey="type" innerRadius={42} outerRadius={62} paddingAngle={2}>
                {breakdown.map((b) => (
                  <Cell key={b.type} fill={(TYPE_META[b.type] || TYPE_META.Other).color} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatINR(v)} contentStyle={{ borderRadius: 10, border: '1px solid #EBC2AE', fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-1.5">
          {breakdown.map((b) => (
            <div key={b.type} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[#1D181A]">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: (TYPE_META[b.type] || TYPE_META.Other).color }} />
                {b.type}
              </span>
              <span className="font-medium text-[#1D181A]">{formatINR(b.amount)}</span>
              <span className="w-10 text-right text-[10px] text-[#80576A]">{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filters bar                                                       */
/* ------------------------------------------------------------------ */

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] py-2 pl-3 pr-8 text-sm text-[#1D181A] focus:border-[#D9654A] focus:outline-none focus:ring-2 focus:ring-[#FFF0E8]"
      >
        <option value="All">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#80576A]" />
    </div>
  );
}

function FiltersBar({ filters, setFilters }) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-[#F3DED2] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#80576A]" />
        <input
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          placeholder="Search transaction, recruiter, company, payment ID…"
          className="w-full rounded-xl border border-[#EBC2AE] bg-[#FFF0E8] py-2 pl-9 pr-3 text-sm placeholder:text-[#80576A] focus:border-[#D9654A] focus:bg-[#FFFDFB] focus:outline-none focus:ring-2 focus:ring-[#FFF0E8]"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterSelect
          placeholder="All Types"
          value={filters.type}
          onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
          options={Object.keys(TYPE_META)}
        />
        <FilterSelect
          placeholder="All Status"
          value={filters.status}
          onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
          options={Object.keys(STATUS_META)}
        />
        <FilterSelect
          placeholder="All Methods"
          value={filters.method}
          onChange={(v) => setFilters((f) => ({ ...f, method: v }))}
          options={PAYMENT_METHODS}
        />
        <FilterSelect
          placeholder="Any Date"
          value={filters.date}
          onChange={(v) => setFilters((f) => ({ ...f, date: v }))}
          options={['today', 'yesterday', '7d', '30d']}
        />
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
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#1D181A]"
      >
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
            <button onClick={() => { notify('Downloading receipt…'); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <Receipt size={14} /> Download Receipt
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
/*  Pagination                                                        */
/* ------------------------------------------------------------------ */

function Pagination({ page, setPage, pageSize, setPageSize, total }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pages = Array.from({ length: totalPages }).slice(0, 5).map((_, i) => i + 1);

  return (
    <div className="flex flex-col gap-2.5 border-t border-[#F3DED2] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-[#80576A]">
        Rows per page:
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          className="rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] px-2 py-1 text-sm focus:outline-none"
        >
          {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A] disabled:opacity-40"
        >
          <ChevronLeft size={14} />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            className={`h-8 w-8 rounded-lg text-sm font-medium ${page === p ? 'bg-[#C75560] text-white' : 'text-[#80576A] hover:bg-[#FFF0E8]'}`}
          >
            {p}
          </button>
        ))}
        {totalPages > 5 && <span className="px-1 text-[#80576A]">…</span>}
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A] disabled:opacity-40"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Transaction details drawer                                        */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-[#80576A]">{label}</span>
      <span className="font-medium text-[#1D181A]">{value}</span>
    </div>
  );
}

function TransactionDrawer({ txn, onClose }) {
  if (!txn) return null;
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[#1D181A]/40">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[#EBC2AE] bg-[#FFFDFB] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#F3DED2] px-5 py-3.5">
          <div>
            <p className="text-xs text-[#80576A]">Transaction</p>
            <h3 className="font-semibold text-[#1D181A]">{txn.id}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8]">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#80576A]">
              <Receipt size={13} /> Transaction Information
            </div>
            <DetailRow label="Payment ID" value={txn.paymentId} />
            <DetailRow label="Order ID" value={txn.orderId} />
            <DetailRow label="Type" value={<TypeTag type={txn.type} />} />
            <DetailRow label="Amount" value={formatINR(txn.amount)} />
            <DetailRow label="Status" value={<StatusBadge status={txn.status} />} />
            <DetailRow label="Date & Time" value={formatDateTime(txn.date)} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#80576A]">
              <User size={13} /> Recruiter Information
            </div>
            <DetailRow label="Name" value={txn.recruiter.name} />
            <DetailRow label="Recruiter ID" value={txn.recruiter.id} />
            <DetailRow label="Company" value={txn.recruiter.company} />
            <DetailRow label="Email" value={txn.recruiter.email} />
            <DetailRow label="Phone" value={txn.recruiter.phone} />
          </div>

          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#80576A]">
              <CreditCard size={13} /> Payment Information
            </div>
            <DetailRow label="Method" value={txn.paymentMethod} />
            <DetailRow label="Gateway" value={txn.gateway} />
            <DetailRow label="Gateway Txn ID" value={txn.gatewayTxnId} />
            <DetailRow label="Payment Status" value={<StatusBadge status={txn.status} />} />
          </div>

          {txn.wallet && (
            <div className="rounded-2xl bg-[#FFF0E8] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#80576A]">
                <Wallet size={13} /> Wallet Information
              </div>
              <DetailRow label="Previous Balance" value={formatINR(txn.wallet.previousBalance)} />
              <DetailRow
                label={txn.type === 'Resume Download' ? 'Resume Download' : 'Transaction Amount'}
                value={
                  <span className={txn.wallet.change > 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {txn.wallet.change > 0 ? '+' : ''}{formatINR(txn.wallet.change)}
                  </span>
                }
              />
              <DetailRow label="New Balance" value={formatINR(txn.wallet.newBalance)} />
            </div>
          )}

          {txn.candidate && (
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#80576A]">
                <FileText size={13} /> Candidate Information
              </div>
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

function WalletHistoryDrawer({ recruiter, transactions, onClose }) {
  if (!recruiter) return null;
  const history = transactions.filter((t) => t.recruiter.id === recruiter.id && t.wallet).sort((a, b) => b.date - a.date);
  const totalRecharge = history.filter((t) => t.wallet.change > 0).reduce((s, t) => s + t.wallet.change, 0);
  const totalSpent = history.filter((t) => t.wallet.change < 0).reduce((s, t) => s + Math.abs(t.wallet.change), 0);
  const resumeDownloads = history.filter((t) => t.type === 'Resume Download').length;
  const refunds = transactions.filter((t) => t.recruiter.id === recruiter.id && t.type === 'Refund').length;
  const currentBalance = history[0]?.wallet.newBalance ?? 0;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-[#1D181A]/40">
      <div className="absolute inset-0" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[#EBC2AE] bg-[#FFFDFB] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#F3DED2] px-5 py-3.5">
          <div>
            <p className="text-xs text-[#80576A]">Wallet — {recruiter.company}</p>
            <h3 className="font-semibold text-[#1D181A]">{recruiter.name}</h3>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8]">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 px-5 py-4">
          <div className="rounded-2xl bg-[#FFF0E8] p-4">
            <p className="text-xs font-medium text-[#C75560]">Current Balance</p>
            <p className="text-lg font-semibold text-[#A94658]">{formatINR(currentBalance)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-600">Total Recharge</p>
            <p className="text-lg font-semibold text-emerald-700">{formatINR(totalRecharge)}</p>
          </div>
          <div className="rounded-2xl bg-[#FFF0E8] p-4">
            <p className="text-xs font-medium text-[#80576A]">Total Spent</p>
            <p className="text-lg font-semibold text-[#1D181A]">{formatINR(totalSpent)}</p>
          </div>
          <div className="rounded-2xl bg-cyan-50 p-4">
            <p className="text-xs font-medium text-cyan-600">Resume Downloads</p>
            <p className="text-lg font-semibold text-cyan-700">{resumeDownloads}</p>
          </div>
        </div>

        <div className="px-6 pb-2 text-xs font-semibold uppercase tracking-wide text-[#80576A]">
          Complete Wallet History · {refunds} refund{refunds !== 1 ? 's' : ''}
        </div>
        <div className="divide-y divide-[#F3DED2] px-6 pb-6">
          {history.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p className="font-medium text-[#1D181A]">{t.description}</p>
                <p className="text-xs text-[#80576A]">{formatDateTime(t.date)}</p>
              </div>
              <span className={`font-semibold ${t.wallet.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
/*  Table skeleton / empty state                                      */
/* ------------------------------------------------------------------ */

function TableSkeleton({ cols = 8, rows = 6 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((__, c) => (
            <td key={c} className="px-4 py-4">
              <div className="h-3.5 w-full max-w-[110px] animate-pulse rounded-full bg-[#F3DED2]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function EmptyState({ label }) {
  return (
    <tr>
      <td colSpan={12} className="px-4 py-14 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#80576A]">
          <Receipt size={20} />
        </div>
        <p className="mt-3 text-sm font-medium text-[#80576A]">{label}</p>
        <p className="text-xs text-[#80576A]">Try adjusting your search or filters.</p>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  All Transactions tab                                              */
/* ------------------------------------------------------------------ */

function AllTransactionsTab({ transactions, loading, onView, onViewRecruiter, onProcessRefund, notify }) {
  const [filters, setFilters] = useState({ search: '', type: 'All', status: 'All', method: 'All', date: 'All' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filters.type !== 'All' && t.type !== filters.type) return false;
      if (filters.status !== 'All' && t.status !== filters.status) return false;
      if (filters.method !== 'All' && t.paymentMethod !== filters.method) return false;
      if (filters.date !== 'All' && !isWithinRange(t.date, filters.date)) return false;
      if (q) {
        const hay = `${t.id} ${t.recruiter.name} ${t.recruiter.company} ${t.paymentId} ${t.candidate?.name || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [transactions, filters]);

  useEffect(() => setPage(1), [filters]);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] shadow-sm">
      <FiltersBar filters={filters} setFilters={setFilters} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-xs font-semibold uppercase tracking-wide text-[#80576A]">
              <th className="px-3 py-2">Transaction ID</th>
              <th className="px-3 py-2">Recruiter</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Date & Time</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3DED2] text-sm">
            {loading ? (
              <TableSkeleton cols={10} />
            ) : paged.length === 0 ? (
              <EmptyState label="No transactions match your filters" />
            ) : (
              paged.map((t) => (
                <tr key={t.id} className="hover:bg-[#FFF0E8]">
                  <td className="px-3 py-2.5 font-medium text-[#1D181A]">{t.id}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{t.recruiter.name}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{t.recruiter.company}</td>
                  <td className="px-3 py-2.5"><TypeTag type={t.type} /></td>
                  <td className="px-3 py-2.5 text-[#80576A]">{t.description}</td>
                  <td className="px-3 py-2.5 font-semibold text-[#1D181A]">{formatINR(t.amount)}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{t.paymentMethod}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[#80576A]">{formatDateTime(t.date)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <ActionMenu txn={t} onView={onView} onViewRecruiter={onViewRecruiter} onProcessRefund={onProcessRefund} notify={notify} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={filtered.length} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wallet Transactions tab                                           */
/* ------------------------------------------------------------------ */

function WalletTransactionsTab({ transactions, onViewWallet }) {
  const summaries = useMemo(() => {
    return RECRUITERS.map((r) => {
      const history = transactions.filter((t) => t.recruiter.id === r.id && t.wallet).sort((a, b) => b.date - a.date);
      const added = history.filter((t) => t.wallet.change > 0).reduce((s, t) => s + t.wallet.change, 0);
      const used = history.filter((t) => t.wallet.change < 0).reduce((s, t) => s + Math.abs(t.wallet.change), 0);
      const current = history[0]?.wallet.newBalance ?? 0;
      const previous = history[history.length - 1]?.wallet.previousBalance ?? 0;
      return {
        recruiter: r,
        previous,
        added,
        used,
        current,
        lastTxn: history[0]?.date,
        status: history[0]?.status || 'Success',
      };
    });
  }, [transactions]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-xs font-semibold uppercase tracking-wide text-[#80576A]">
              <th className="px-3 py-2">Recruiter</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Previous Balance</th>
              <th className="px-3 py-2">Amount Added</th>
              <th className="px-3 py-2">Amount Used</th>
              <th className="px-3 py-2">Current Balance</th>
              <th className="px-3 py-2">Last Transaction</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3DED2] text-sm">
            {summaries.map((s) => (
              <tr key={s.recruiter.id} className="hover:bg-[#FFF0E8]">
                <td className="px-3 py-2.5 font-medium text-[#1D181A]">{s.recruiter.name}</td>
                <td className="px-3 py-2.5 text-[#1D181A]">{s.recruiter.company}</td>
                <td className="px-3 py-2.5 text-[#80576A]">{formatINR(s.previous)}</td>
                <td className="px-3 py-2.5 font-medium text-emerald-600">+{formatINR(s.added)}</td>
                <td className="px-3 py-2.5 font-medium text-red-600">-{formatINR(s.used)}</td>
                <td className="px-3 py-2.5 font-semibold text-[#1D181A]">{formatINR(s.current)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-[#80576A]">{s.lastTxn ? formatDateTime(s.lastTxn) : '—'}</td>
                <td className="px-3 py-2.5"><StatusBadge status={s.status} /></td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    onClick={() => onViewWallet(s.recruiter)}
                    className="rounded-lg border border-[#EBC2AE] px-3 py-1.5 text-xs font-semibold text-[#C75560] hover:bg-[#FFF0E8]"
                  >
                    View Wallet
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-left">
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-xs font-semibold uppercase tracking-wide text-[#80576A]">
              <th className="px-3 py-2">Transaction ID</th>
              <th className="px-3 py-2">Recruiter</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Candidate</th>
              <th className="px-3 py-2">Resume ID</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Wallet Balance</th>
              <th className="px-3 py-2">Date & Time</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3DED2] text-sm">
            {rows.length === 0 ? (
              <EmptyState label="No resume downloads yet" />
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="hover:bg-[#FFF0E8]">
                  <td className="px-3 py-2.5 font-medium text-[#1D181A]">{t.id}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{t.recruiter.name}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{t.recruiter.company}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{t.candidate?.name}</td>
                  <td className="px-3 py-2.5 text-[#80576A]">{t.candidate?.resumeId}</td>
                  <td className="px-3 py-2.5 font-semibold text-red-600">-{formatINR(t.amount)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[#80576A]">
                    {formatINR(t.wallet?.previousBalance)} → {formatINR(t.wallet?.newBalance)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[#80576A]">{formatDateTime(t.date)}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={t.status} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <button onClick={() => onView(t)} className="rounded-lg p-2 text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#1D181A]">
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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

function RefundsTab({ refunds, setRefunds, notify }) {
  const [confirmState, setConfirmState] = useState(null); // { refund, action }

  function runAction() {
    if (!confirmState) return;
    const { refund, action } = confirmState;
    setRefunds((list) =>
      list.map((r) => (r.id === refund.id ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' } : r))
    );
    notify(action === 'approve' ? `Refund ${refund.id} approved` : `Refund ${refund.id} rejected`, action === 'approve' ? 'success' : 'error');
    setConfirmState(null);
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead>
              <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-xs font-semibold uppercase tracking-wide text-[#80576A]">
                <th className="px-3 py-2">Refund ID</th>
                <th className="px-3 py-2">Transaction ID</th>
                <th className="px-3 py-2">Recruiter</th>
                <th className="px-3 py-2">Original Amount</th>
                <th className="px-3 py-2">Refund Amount</th>
                <th className="px-3 py-2">Reason</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3DED2] text-sm">
              {refunds.map((r) => (
                <tr key={r.id} className="hover:bg-[#FFF0E8]">
                  <td className="px-3 py-2.5 font-medium text-[#1D181A]">{r.id}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{r.txnId}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">
                    {r.recruiter.name}
                    <span className="block text-xs text-[#80576A]">{r.recruiter.company}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[#80576A]">{formatINR(r.originalAmount)}</td>
                  <td className="px-3 py-2.5 font-semibold text-[#1D181A]">{formatINR(r.refundAmount)}</td>
                  <td className="max-w-[220px] px-3 py-2.5 text-[#80576A]">{r.reason}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[#80576A]">{formatDateTime(r.requestedDate)}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${REFUND_STATUS_META[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {r.status === 'Pending' ? (
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setConfirmState({ refund: r, action: 'approve' })}
                          className="rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setConfirmState({ refund: r, action: 'reject' })}
                          className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#80576A]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.action === 'approve' ? 'Approve this refund?' : 'Reject this refund?'}
        description={
          confirmState
            ? `${confirmState.refund.id} for ${formatINR(confirmState.refund.refundAmount)} to ${confirmState.refund.recruiter.name}. This action cannot be undone.`
            : ''
        }
        confirmLabel={confirmState?.action === 'approve' ? 'Approve Refund' : 'Reject Refund'}
        tone={confirmState?.action === 'approve' ? 'default' : 'danger'}
        onConfirm={runAction}
        onCancel={() => setConfirmState(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Settlements tab                                                   */
/* ------------------------------------------------------------------ */

function SettlementsTab() {
  const [selected, setSelected] = useState(null);
  return (
    <div className="space-y-4">
      {SETTLEMENTS.map((s) => (
        <div key={s.gateway} className="rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#C75560]">
                <Landmark size={20} />
              </span>
              <div>
                <h3 className="font-semibold text-[#1D181A]">{s.gateway}</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 size={11} /> {s.status}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelected(s)}
              className="rounded-xl border border-[#EBC2AE] px-4 py-2 text-sm font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"
            >
              View Settlement Details
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-[#80576A]">Total Transactions</p>
              <p className="text-sm font-semibold text-[#1D181A]">{s.totalTxns}</p>
            </div>
            <div>
              <p className="text-xs text-[#80576A]">Successful</p>
              <p className="text-base font-semibold text-emerald-600">{s.successful}</p>
            </div>
            <div>
              <p className="text-xs text-[#80576A]">Failed</p>
              <p className="text-base font-semibold text-red-600">{s.failed}</p>
            </div>
            <div>
              <p className="text-xs text-[#80576A]">Net Settlement</p>
              <p className="text-sm font-semibold text-[#1D181A]">{formatINR(s.net)}</p>
            </div>
          </div>
        </div>
      ))}

      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1D181A]/40 px-4" onClick={() => setSelected(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-5 shadow-xl"
          >
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
  notify('Exported filtered transactions as CSV');
}

function ExportMenu({ transactions, notify }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"
      >
        <FileDown size={13} /> Export Report <ChevronDown size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-40 overflow-hidden rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] py-1 shadow-lg">
            <button onClick={() => { exportCSV(transactions, notify); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <Download size={14} /> CSV
            </button>
            <button onClick={() => { notify('Excel export queued'); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
              <Download size={14} /> Excel
            </button>
            <button onClick={() => { notify('PDF export queued'); setOpen(false); }} className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm text-[#1D181A] hover:bg-[#FFF0E8]">
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

function PageHeader({ transactions, notify }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#C75560]">Admin Finance</p>
        <h1 className="mt-0.5 text-lg font-semibold text-[#1D181A]">Account & Transactions</h1>
        <p className="mt-0.5 text-xs text-[#80576A]">
          Monitor payments, Wallet activity, Resume downloads, refunds and all Financial activity.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-full border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs font-medium text-[#1D181A] hover:bg-[#FFF0E8]">
          <Calendar size={13} /> Last 30 Days
        </button>
        <button className="flex items-center gap-1.5 rounded-full border border-[#EBC2AE] bg-[#FFFDFB] px-3 py-1.5 text-xs font-medium text-[#1D181A] hover:bg-[#FFF0E8]">
          <SlidersHorizontal size={13} /> Filter
        </button>
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
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function Transactions() {
  const [transactions, setTransactions] = useState(MOCK_TRANSACTIONS);
  const [refunds, setRefunds] = useState(MOCK_REFUNDS);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [activeTxn, setActiveTxn] = useState(null);
  const [activeWalletRecruiter, setActiveWalletRecruiter] = useState(null);
  const [toasts, setToasts] = useState([]);

  function notify(message, type = 'success') {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }

  useEffect(() => {
    // Wire to real API once the finance endpoints exist; falls back to mock data for now.
    async function load() {
      try {
        const { data } = await adminAxiosInstance.get('/payments');
        if (Array.isArray(data) && data.length) {
          // TODO: map real payment documents into the transaction shape this page expects.
        }
      } catch {
        // silently fall back to mock data — no backend wired yet
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <Toasts toasts={toasts} />

      <PageHeader transactions={transactions} notify={notify} />

      <OverviewCards />

      <RevenueAnalytics />

      <TypeBreakdown transactions={transactions} />

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#EBC2AE] bg-[#FFFDFB] p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              tab === t.key ? 'bg-[#C75560] text-white shadow-sm' : 'text-[#80576A] hover:bg-[#FFF0E8]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <AllTransactionsTab
          transactions={transactions}
          loading={loading}
          onView={setActiveTxn}
          onViewRecruiter={(r) => setActiveWalletRecruiter(r)}
          onProcessRefund={(t) => notify(`Refund flow started for ${t.id}`)}
          notify={notify}
        />
      )}
      {tab === 'wallet' && <WalletTransactionsTab transactions={transactions} onViewWallet={setActiveWalletRecruiter} />}
      {tab === 'resume' && <ResumeDownloadsTab transactions={transactions} onView={setActiveTxn} />}
      {tab === 'refunds' && <RefundsTab refunds={refunds} setRefunds={setRefunds} notify={notify} />}
      {tab === 'settlements' && <SettlementsTab />}

      <AnimatePresence>
        {activeTxn && <TransactionDrawer txn={activeTxn} onClose={() => setActiveTxn(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {activeWalletRecruiter && (
          <WalletHistoryDrawer recruiter={activeWalletRecruiter} transactions={transactions} onClose={() => setActiveWalletRecruiter(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}