import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import adminAxiosInstance from '../api/adminAxiosInstance';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const TONE_MAP = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
};

const STATUS_BADGE_MAP = {
  active: 'bg-emerald-50 text-emerald-600',
  open: 'bg-emerald-50 text-emerald-600',
  draft: 'bg-amber-50 text-amber-600',
  closed: 'bg-stone-100 text-stone-500',
  applied: 'bg-sky-50 text-sky-600',
  reviewed: 'bg-indigo-50 text-indigo-600',
  shortlisted: 'bg-indigo-50 text-indigo-600',
  interview: 'bg-amber-50 text-amber-600',
  offered: 'bg-emerald-50 text-emerald-600',
  hired: 'bg-emerald-50 text-emerald-600',
  rejected: 'bg-rose-50 text-rose-600',
};

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatRelativeTime(dateInput) {
  if (!dateInput) return '';
  const then = new Date(dateInput).getTime();
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatCurrency(amount) {
  if (!amount) return '₹0';
  if (amount >= 100000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount}`;
}

function formatCount(count) {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count?.toLocaleString() || '0';
}

function StatCard({ label, value, change, tone }) {
  const t = TONE_MAP[tone];
  const isPositive = !change.startsWith('-');
  const trendColor = isPositive ? 'text-[#15803d]' : 'text-[#b91c1c]';

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-[#EBC2AE] bg-[#FFFDFB] p-3 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className={`rounded-full ${t.bg} ${t.text} px-2 py-0.5 text-[9px] font-semibold`}>
          {label.split(' ')[0]}
        </span>
        <span className={`text-[10px] font-semibold ${trendColor}`}>{change}</span>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-semibold leading-tight text-[#1D181A]">{value}</p>
        <p className="mt-1 text-xs text-[#6B7280]">{label}</p>
      </div>
    </div>
  );
}

function RecentListCard({ title, subtitle, viewAllTo, loading, items, emptyText, renderItem }) {
  return (
    <div className="rounded-lg border border-[#EBC2AE] bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold text-[#1D181A]">{title}</h2>
          <p className="text-[10px] text-[#6B7280]">{subtitle}</p>
        </div>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="shrink-0 text-[10px] font-semibold text-[#C75560] hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      <div className="flex flex-col divide-y divide-[#F5E9E2]">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-2 py-2">
              <div className="h-6 w-6 shrink-0 rounded-full bg-stone-200" />
              <div className="flex-1">
                <div className="mb-1 h-2.5 w-2/3 rounded bg-stone-200" />
                <div className="h-2 w-1/3 rounded bg-stone-100" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-[#6B7280]">{emptyText}</p>
        ) : (
          items.map(renderItem)
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { admin } = useAdminAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const response = await adminAxiosInstance.get('/dashboard/overview');
        if (cancelled) return;
        setDashboardData(response.data);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dashboard');
          console.error('Dashboard error:', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-7xl px-4 py-2 sm:px-5 md:px-6 lg:px-8">
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-slate-200 rounded-lg" />
          <div className="grid grid-cols-5 gap-2">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="w-full max-w-7xl px-4 py-2 sm:px-5 md:px-6 lg:px-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p>Error loading dashboard: {error}</p>
        </div>
      </div>
    );
  }

  const stats = dashboardData.stats || {};
  const trends = dashboardData.trends || {};
  const recentActivity = dashboardData.recentActivity || {};

  // Build stat cards from real data
  const statCards = [
    {
      label: 'Total Recruiters',
      value: formatCount(stats.users?.totalRecruiters || 0),
      change: '+4.2%',
      tone: 'indigo',
    },
    {
      label: 'Total Candidates',
      value: formatCount(stats.users?.totalCandidates || 0),
      change: '+8.6%',
      tone: 'sky',
    },
    {
      label: 'Active Jobs',
      value: formatCount(stats.jobs?.openJobs || 0),
      change: '+2.1%',
      tone: 'emerald',
    },
    {
      label: 'Total Applications',
      value: formatCount(stats.applications?.totalApplications || 0),
      change: '+11.3%',
      tone: 'amber',
    },
    {
      label: 'Platform Revenue',
      value: formatCurrency(stats.revenue?.totalCollected || 0),
      change: '-1.4%',
      tone: 'rose',
    },
  ];

  const signupsTrend = trends.signups || [];
  const jobStatusTrend = trends.jobStatus || [];
  const recentRecruiters = recentActivity.recruiters || [];
  const recentCandidates = recentActivity.candidates || [];
  const recentJobs = recentActivity.jobs || [];
  const recentApplications = recentActivity.applications || [];

  return (
    <div className="w-full max-w-7xl px-4 py-2 sm:px-5 md:px-6 lg:px-8">
      <div className="flex flex-col gap-2.5">
        <header className="shrink-0 rounded-lg border border-[#EBC2AE] bg-white px-4 py-2.5 shadow-sm">
          <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#C75560]">Admin dashboard</p>
              <h1 className="mt-1 text-lg font-semibold leading-tight text-[#1D181A] sm:text-xl">
                Welcome back, {admin?.name?.split(' ')[0] || 'Admin'}
              </h1>
              <p className="mt-1 text-xs leading-4 text-[#6B7280] sm:text-sm">
                A clean, professional admin overview for recruiter, candidate, job and payment performance.
              </p>
            </div>
            <span className="inline-flex items-center justify-center rounded-full bg-[#FFF0E8] px-3 py-1.5 text-[10px] font-semibold text-[#C75560]">
              Last updated just now
            </span>
          </div>
        </header>

        <section className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </section>

        <section className="grid shrink-0 gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-[#EBC2AE] bg-white p-2.5 shadow-sm">
            <div className="mb-1.5">
              <h2 className="text-xs font-semibold text-[#1D181A]">Signups trend</h2>
              <p className="text-[10px] text-[#6B7280]">Candidates vs recruiters, last 6 months.</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={signupsTrend} margin={{ left: -20, top: 5, right: 5 }}>
                  <defs>
                    <linearGradient id="candGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  <Area type="monotone" dataKey="candidates" stroke="#4f46e5" fill="url(#candGrad)" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="recruiters" stroke="#0ea5e9" fill="url(#recGrad)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border border-[#EBC2AE] bg-white p-2.5 shadow-sm">
            <div className="mb-1.5">
              <h2 className="text-xs font-semibold text-[#1D181A]">Job status overview</h2>
              <p className="text-[10px] text-[#6B7280]">Active, closed and draft listings.</p>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobStatusTrend} margin={{ left: -20, top: 5, right: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 11 }} />
                  <Bar dataKey="active" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="closed" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={14} />
                  <Bar dataKey="draft" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid shrink-0 gap-3 lg:grid-cols-2">
          <RecentListCard
            title="Recent recruiters"
            subtitle="Last 5 recruiter signups."
            viewAllTo="/recruiters"
            loading={loading}
            items={recentRecruiters}
            emptyText="No recruiters yet."
            renderItem={(r) => (
              <div key={r._id} className="flex items-center gap-2 py-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFF0E8] text-[9px] font-semibold text-[#C75560]">
                  {getInitials(r.companyName || r.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#1D181A]">
                    {r.companyName || r.name || 'Recruiter'}
                  </p>
                  <p className="truncate text-[10px] text-[#6B7280]">{r.email}</p>
                </div>
                <span className="shrink-0 text-[9px] text-[#9CA3AF]">
                  {formatRelativeTime(r.createdAt)}
                </span>
              </div>
            )}
          />

          <RecentListCard
            title="Recent candidates"
            subtitle="Last 5 candidate signups."
            viewAllTo="/candidates"
            loading={loading}
            items={recentCandidates}
            emptyText="No candidates yet."
            renderItem={(c) => (
              <div key={c._id} className="flex items-center gap-2 py-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-50 text-[9px] font-semibold text-sky-600">
                  {getInitials(c.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#1D181A]">
                    {c.name || 'Candidate'}
                  </p>
                  <p className="truncate text-[10px] text-[#6B7280]">{c.email || c.uniqueId}</p>
                </div>
                <span className="shrink-0 text-[9px] text-[#9CA3AF]">
                  {formatRelativeTime(c.createdAt)}
                </span>
              </div>
            )}
          />

          <RecentListCard
            title="Recently posted jobs"
            subtitle="Last 5 jobs added to the platform."
            viewAllTo="/jobs"
            loading={loading}
            items={recentJobs}
            emptyText="No jobs posted yet."
            renderItem={(j) => (
              <div key={j._id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#1D181A]">{j.title}</p>
                  <p className="truncate text-[10px] text-[#6B7280]">
                    {j.postedBy?.companyName || 'Company'}
                  </p>
                </div>
                {j.status && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold capitalize ${
                      STATUS_BADGE_MAP[j.status] || 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {j.status}
                  </span>
                )}
                <span className="shrink-0 text-[9px] text-[#9CA3AF]">
                  {formatRelativeTime(j.createdAt)}
                </span>
              </div>
            )}
          />

          <RecentListCard
            title="Recent applications"
            subtitle="Last 5 jobs candidates applied to."
            viewAllTo="/applications"
            loading={loading}
            items={recentApplications}
            emptyText="No applications yet."
            renderItem={(a) => (
              <div key={a._id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#1D181A]">
                    {a.candidate?.name || 'Candidate'}
                  </p>
                  <p className="truncate text-[10px] text-[#6B7280]">
                    applied to {a.job?.title || 'a job'}
                  </p>
                </div>
                {a.status && (
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold capitalize ${
                      STATUS_BADGE_MAP[a.status] || 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    {a.status}
                  </span>
                )}
                <span className="shrink-0 text-[9px] text-[#9CA3AF]">
                  {formatRelativeTime(a.createdAt)}
                </span>
              </div>
            )}
          />
        </section>
      </div>
    </div>
  );
}