import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  FileText,
  User,
  Calendar,
  Download,
  Link as LinkIcon,
  Loader2,
  Copy,
  Check,
  Clock,
  LogIn,
  Eye,
  Bookmark,
  RefreshCcw,
  KeyRound,
  Send,
  StickyNote,
  Ban,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  ClipboardList,
  History,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const STATUS_CLASS = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  suspended: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  banned: 'bg-[#FDE7E7] text-[#B42318] ring-[#F6B9BA]',
  default: 'bg-[#FFF4EF] text-[#80576A] ring-[#EBC2AE]',
};

const APPLICATION_STATUS_CLASS = {
  applied: 'bg-[#FFF4EF] text-[#80576A] ring-[#EBC2AE]',
  shortlisted: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  interview: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  offered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  hired: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-[#FDE7E7] text-[#B42318] ring-[#F6B9BA]',
  withdrawn: 'bg-[#F3F0EE] text-[#6B6265] ring-[#DCD3CE]',
};

const ACTIVITY_META = {
  login: { icon: LogIn, color: '#4F8A63' },
  profile_update: { icon: User, color: '#C7891F' },
  application: { icon: Briefcase, color: '#C75560' },
  job_view: { icon: Eye, color: '#7B7280' },
  job_saved: { icon: Bookmark, color: '#8C6BB1' },
  status_change: { icon: ShieldAlert, color: '#B42318' },
  default: { icon: Clock, color: '#80576A' },
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'applications', label: 'Applications', icon: Briefcase },
  { key: 'activity', label: 'Activity log', icon: History },
  { key: 'controls', label: 'Controls', icon: ShieldAlert },
  { key: 'notes', label: 'Notes', icon: StickyNote },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeAgo(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(value);
}

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-md border border-[#EBC2AE] bg-[#FFFDFB] p-1 text-[#80576A] hover:bg-[#FFF4EF]"
      title="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#F0E1D6] bg-white p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF4EF] text-[#C75560]">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#A08A93]">{label}</p>
        <p className="truncate text-[15px] font-bold text-[#1D181A]">{value}</p>
        {sub ? <p className="truncate text-[10px] text-[#A08A93]">{sub}</p> : null}
      </div>
    </div>
  );
}

const ANALYTICS_TABS = [
  { key: 'applications', label: 'Applications', color: '#C75560', icon: Briefcase },
  { key: 'shortlisted', label: 'Shortlisted', color: '#4F8A63', icon: CheckCircle2 },
  { key: 'interviews', label: 'Interviews', color: '#7B5EA7', icon: Calendar },
  { key: 'activity', label: 'Activity session', color: '#C7891F', icon: TrendingUp },
];

const RANGE_TABS = [
  { key: '1w', label: '1 Week', unit: 'week' },
  { key: '1m', label: '1 Month', unit: 'day' },
  { key: '6m', label: '6 Months', unit: 'month' },
  { key: '1y', label: '1 Year', unit: 'month' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const RANGE_COMPARE_LABEL = {
  '1w': 'vs previous week',
  '1m': 'vs previous day',
  '6m': 'vs previous month',
  '1y': 'vs previous month',
};

// Catmull-Rom -> cubic bezier smoothing so the line reads as a clean curve, not a jagged polyline
function buildSmoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

function niceCeiling(value) {
  if (value <= 0) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  let niceNormalized;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

// Deterministic seeded PRNG so demo data stays stable across re-renders/hovers instead of jumping around
function seededRandom(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i += 1) {
    seed = (Math.imul(31, seed) + seedStr.charCodeAt(i)) | 0;
  }
  return function next() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Real calendar-correct labels: day numbers 1-30 for week/month views, Jan-Dec month names for 6m/1y views
function getRangeLabels(rangeKey) {
  const today = new Date();

  if (rangeKey === '1w') {
    const labels = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      labels.push(String(d.getDate()));
    }
    return labels;
  }

  if (rangeKey === '1m') {
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  }

  if (rangeKey === '6m') {
    const labels = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      labels.push(MONTH_NAMES[d.getMonth()]);
    }
    return labels;
  }

  // 1y — full calendar year, Jan through Dec
  return MONTH_NAMES.slice();
}

const METRIC_PROFILE = {
  applications: { base: 6, growth: 1.7 },
  shortlisted: { base: 2, growth: 2 },
  interviews: { base: 1, growth: 2.4 },
  activity: { base: 20, growth: 1.5 },
};

function getRangeSeries(metric, rangeKey) {
  const labels = getRangeLabels(rangeKey);
  const { base, growth } = METRIC_PROFILE[metric];
  const rand = seededRandom(`${metric}-${rangeKey}`);
  const scale = rangeKey === '1w' ? 0.5 : rangeKey === '1m' ? 0.6 : 1;
  const scaledBase = Math.max(1, base * scale);

  const data = labels.map((_, i) => {
    const progress = labels.length > 1 ? i / (labels.length - 1) : 0;
    const trend = scaledBase * (growth - 1) * progress;
    const noise = (rand() - 0.5) * scaledBase * 0.5;
    return Math.max(0, Math.round(scaledBase + trend + noise));
  });

  return { labels, data };
}

function AnalyticsChart({ metric, onSelect, candidateId }) {
  const svgRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [range, setRange] = useState('6m');
  const [chartWidth, setChartWidth] = useState(720);
  const [series, setSeries] = useState({ labels: [], data: [] });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) {
        setChartWidth(Math.round(entry.contentRect.width));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!candidateId) return undefined;

    let isMounted = true;
    setLoadingAnalytics(true);

    adminAxiosInstance
      .get(`/users/candidates/${candidateId}/analytics`, { params: { metric, range } })
      .then((response) => {
        if (!isMounted) return;
        const payload = response.data || {};
        const nextLabels = Array.isArray(payload.labels) ? payload.labels : [];
        const nextData = Array.isArray(payload.data) ? payload.data : [];
        setSeries({
          labels: nextLabels,
          data: nextData.length ? nextData : Array(nextLabels.length || 6).fill(0),
        });
      })
      .catch((error) => {
        console.error('Failed to load candidate analytics:', error);
        if (isMounted) {
          setSeries({ labels: [], data: [] });
        }
      })
      .finally(() => {
        if (isMounted) setLoadingAnalytics(false);
      });

    return () => {
      isMounted = false;
    };
  }, [candidateId, metric, range]);

  const labels = series.labels.length ? series.labels : getRangeLabels(range);
  const data = series.data.length ? series.data : Array(labels.length).fill(0);

  const height = 180;
  const width = chartWidth;
  const isDense = data.length > 15;
  const padding = { top: 16, right: 12, bottom: 24, left: 28 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const activeTab = ANALYTICS_TABS.find((tab) => tab.key === metric) || ANALYTICS_TABS[0];
  const activeRange = RANGE_TABS.find((r) => r.key === range) || RANGE_TABS[2];
  const color = activeTab.color;

  const rawMax = Math.max(...data, 1);
  const axisMax = niceCeiling(rawMax * 1.15);
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((axisMax / tickCount) * i));

  const points = useMemo(
    () =>
      data.map((value, index) => ({
        x: padding.left + (data.length === 1 ? 0 : (index * chartW) / (data.length - 1)),
        y: padding.top + chartH - (value / axisMax) * chartH,
        value,
      })),
    [data, axisMax, chartW, chartH] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const activeHoverIndex = hoverIndex !== null && hoverIndex < points.length ? hoverIndex : null;

  const linePath = buildSmoothPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)},${(padding.top + chartH).toFixed(2)} L ${points[0].x.toFixed(2)},${(padding.top + chartH).toFixed(2)} Z`
      : '';

  const current = data[data.length - 1];
  const previous = data[data.length - 2] ?? current;
  const delta = current - previous;
  const deltaPct = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((delta / previous) * 100);
  const isUp = delta >= 0;
  const total = data.reduce((sum, v) => sum + v, 0);
  const average = data.length ? Math.round((total / data.length) * 10) / 10 : 0;
  const peakIndex = data.indexOf(Math.max(...data));

  // Thin out x-axis text on dense ranges (30-day view) so labels don't collide; every ~5th day
  const labelStep = data.length > 20 ? 5 : data.length > 10 ? 2 : 1;

  const handleMove = (event) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relativeX);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  const gradientId = `analytics-fill-${metric}-${range}`;

  return (
    <div className="overflow-hidden rounded-xl border border-[#F0E1D6] bg-white shadow-[0_1px_2px_rgba(29,24,26,0.04),0_10px_28px_-16px_rgba(29,24,26,0.10)]">
      <div className="border-b border-[#F3E9E3] px-3.5 pb-2 pt-3 sm:px-4">
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div>
            <p className="mb-0.5 text-[8px] font-bold uppercase tracking-[0.1em] text-[#C75560]">Analytics</p>
            <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#1D181A]">
              <TrendingUp size={13} className="text-[#80576A]" />
              Candidate Application Analytics
            </h3>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-[15px] font-bold leading-none text-[#1D181A]">{loadingAnalytics ? '…' : current}</p>
            <div
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FDE7E7] text-[#B42318]'
              }`}
            >
              <TrendingUp size={10} className={isUp ? '' : 'rotate-180'} />
              {isUp ? '+' : ''}
              {deltaPct}%
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ANALYTICS_TABS.map((tab) => {
            const active = metric === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  onSelect(tab.key);
                  setHoverIndex(null);
                }}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  active
                    ? 'border-[#1D181A] bg-[#1D181A] text-white'
                    : 'border-[#EBC2AE] bg-[#FFFDFB] text-[#1D181A] hover:bg-[#FFF4EF]'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: active ? '#FFFDFB' : tab.color }}
                />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2.5 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold text-[#80576A]">{activeTab.label} · {RANGE_COMPARE_LABEL[range]}</p>
          <div className="flex gap-0.5 rounded-md border border-[#F0E1D6] p-0.5">
            {RANGE_TABS.map((tab) => {
              const active = range === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setRange(tab.key);
                    setHoverIndex(null);
                  }}
                  className={`rounded px-2 py-0.5 text-[9px] font-bold transition-colors ${
                    active ? 'bg-[#1D181A] text-white' : 'text-[#80576A] hover:bg-[#FFF4EF]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="block h-44 w-full min-w-[420px] cursor-crosshair"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>

            {ticks.map((tick, i) => {
              const y = padding.top + chartH - (tick / axisMax) * chartH;
              return (
                <g key={`tick-${i}`}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="#F0E1D6"
                    strokeDasharray={i === 0 ? '0' : '4 4'}
                  />
                  <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#A08A93">
                    {tick}
                  </text>
                </g>
              );
            })}

            {activeHoverIndex !== null && (
              <line
                x1={points[activeHoverIndex].x}
                x2={points[activeHoverIndex].x}
                y1={padding.top}
                y2={padding.top + chartH}
                stroke="#D8C7BE"
                strokeWidth="1.25"
                strokeDasharray="3 3"
              />
            )}

            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />

            {points.map((p, index) => {
              const showDot = !isDense || hoverIndex === index || index % labelStep === 0;
              const showLabel = index % labelStep === 0 || index === points.length - 1;
              return (
                <g key={`${metric}-${range}-${labels[index]}-${index}`}>
                  {showDot && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={activeHoverIndex === index ? 5 : isDense ? 2.5 : 3}
                      fill="#FFFDFB"
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}
                  {showLabel && (
                    <text x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#80576A">
                      {labels[index]}
                    </text>
                  )}
                </g>
              );
            })}

            {activeHoverIndex !== null &&
              (() => {
                const p = points[activeHoverIndex];
                const tooltipW = 90;
                const tooltipH = 28;
                const tooltipX = Math.min(Math.max(p.x - tooltipW / 2, padding.left), width - padding.right - tooltipW);
                const tooltipY = Math.max(p.y - tooltipH - 10, padding.top);
                const unitLabel = activeRange.unit === 'week' || activeRange.unit === 'day' ? `Day ${labels[activeHoverIndex]}` : labels[activeHoverIndex];
                return (
                  <g>
                    <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={6} fill="#1D181A" />
                    <text x={tooltipX + tooltipW / 2} y={tooltipY + 11} textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#D9C4B8">
                      {unitLabel}
                    </text>
                    <text x={tooltipX + tooltipW / 2} y={tooltipY + 22} textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFDFB">
                      {p.value}
                    </text>
                  </g>
                );
              })()}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function CandidateProfile() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successAlert, setSuccessAlert] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [savingNote, setSavingNote] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [selectedAnalytics, setSelectedAnalytics] = useState('applications');

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileRes, applicationsRes, activityRes, notesRes] = await Promise.allSettled([
        adminAxiosInstance.get(`/users/candidates/${candidateId}`),
        adminAxiosInstance.get(`/users/candidates/${candidateId}/applications`),
        adminAxiosInstance.get(`/users/candidates/${candidateId}/activity`),
        adminAxiosInstance.get(`/users/candidates/${candidateId}/notes`),
      ]);

      if (profileRes.status === 'fulfilled') {
        setCandidate(profileRes.value.data);
      } else {
        throw profileRes.reason;
      }

      setApplications(applicationsRes.status === 'fulfilled' ? applicationsRes.value.data?.applications || [] : []);
      setActivity(activityRes.status === 'fulfilled' ? activityRes.value.data?.activity || [] : []);
      setNotes(notesRes.status === 'fulfilled' ? notesRes.value.data?.notes || [] : []);
    } catch (err) {
      console.error('Failed to load candidate profile:', err);
      setError(err.response?.data?.error || 'Failed to load candidate profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  // Auto-hide success alert after 4 seconds
  useEffect(() => {
    if (successAlert) {
      const timer = setTimeout(() => {
        setSuccessAlert(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successAlert]);

  const updateStatus = async (status) => {
    try {
      setUpdating(true);
      const payload = { status };

      await adminAxiosInstance.patch(`/users/candidates/${candidateId}/status`, payload);
      setCandidate((prev) => ({ ...prev, accountStatus: status }));
      setError(null);
      const message = status === 'suspended' ? 'Candidate account suspended and email notification sent.' : status === 'banned' ? 'Candidate account banned and email notification sent.' : 'Candidate account status updated.';
      setSuccessAlert({ message, type: status });
    } catch (err) {
      console.error('Failed to update candidate status:', err);
      setError(err.response?.data?.error || 'Failed to update candidate status');
      setSuccessAlert(null);
    } finally {
      setUpdating(false);
    }
  };

  const toggleVerification = async () => {
    const nextValue = !candidate?.isVerified;
    try {
      setUpdating(true);
      await adminAxiosInstance.patch(`/users/candidates/${candidateId}/verify`, { isVerified: nextValue });
      setCandidate((prev) => ({ ...prev, isVerified: nextValue }));
    } catch (err) {
      console.error('Failed to update verification:', err);
      setError(err.response?.data?.error || 'Failed to update verification');
    } finally {
      setUpdating(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!candidate?.email) {
      setError('Candidate email is not available');
      setSuccessAlert(null);
      return;
    }

    try {
      setUpdating(true);
      setError(null);
      setSuccessAlert(null);
      const { data } = await adminAxiosInstance.post(`/users/candidates/${candidateId}/send-password-reset`);
      setSuccessAlert({ message: data.message || 'Password reset link sent successfully.', type: 'default' });
    } catch (err) {
      console.error('Failed to send password reset:', err);
      const message = err.response?.data?.error || 'Failed to send password reset email';
      setError(message);
      setSuccessAlert(null);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusAction = (action) => {
    const message = action === 'suspended' 
      ? 'Are you sure you want to suspend this candidate account?'
      : 'Are you sure you want to ban this candidate? This action cannot be easily undone.';
    setConfirmModal({ action, message });
  };

  const confirmStatusAction = async () => {
    if (!confirmModal) return;
    setError(null);
    setSuccessAlert(null);
    await updateStatus(confirmModal.action);
    setConfirmModal(null);
  };

  const closeConfirmModal = () => {
    setConfirmModal(null);
  };

  const addNote = async () => {
    if (!noteDraft.trim()) return;
    try {
      setSavingNote(true);
      const { data } = await adminAxiosInstance.post(`/users/candidates/${candidateId}/notes`, {
        message: noteDraft.trim(),
      });
      setNotes((prev) => [data?.note || { message: noteDraft.trim(), createdAt: new Date().toISOString() }, ...prev]);
      setNoteDraft('');
    } catch (err) {
      console.error('Failed to save note:', err);
      setError(err.response?.data?.error || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const downloadResume = async (resumeFilename) => {
    try {
      const response = await adminAxiosInstance.get(`/users/candidates/${candidateId}/resume/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = resumeFilename || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download resume:', err);
      setError('Failed to download resume');
    }
  };

  const filteredApplications = useMemo(() => {
    if (appStatusFilter === 'all') return applications;
    return applications.filter((app) => (app.status || 'applied').toLowerCase() === appStatusFilter);
  }, [applications, appStatusFilter]);

  const profileCompletion = useMemo(() => {
    if (!candidate) return 0;
    const profile = candidate.profile || {};
    const fields = [
      candidate.name,
      candidate.email,
      candidate.phone,
      profile.location,
      profile.headline,
      profile.about,
      (profile.skills || []).length > 0,
      profile.resumeUrl,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [candidate]);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center text-[#80576A]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading candidate profile…
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-red-600" />
        <p className="text-sm font-semibold text-red-700">{error || 'Candidate not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/candidates')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1D181A] bg-[#FFFDFB] px-3 py-2 text-[11px] font-bold text-[#1D181A]"
        >
          <ArrowLeft size={14} /> Back to candidates
        </button>
      </div>
    );
  }

  const statusClass = STATUS_CLASS[candidate.accountStatus] || STATUS_CLASS.default;
  const profile = candidate.profile || {};
  const profileImageUrl = candidate.profilePictureUrl || profile.profilePictureUrl || null;
  const fullName = candidate.name || 'Unnamed Candidate';
  const initials = (fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'C').slice(0, 2);
  const lastAppliedAt = applications[0]?.appliedAt;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/candidates')}
          className="inline-flex items-center gap-2 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      {error && candidate && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {successAlert && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${
          successAlert.type === 'suspended'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : successAlert.type === 'banned'
            ? 'border-[#F6B9BA] bg-[#FDE7E7] text-[#B42318]'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          <CheckCircle2 size={13} /> {successAlert.message}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D181A]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#F0E1D6] bg-white p-6 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-[#1D181A]">
                {confirmModal.action === 'suspended' ? 'Suspend Account' : 'Ban Account'}
              </h3>
              <p className="mt-2 text-[13px] text-[#80576A]">{confirmModal.message}</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeConfirmModal}
                className="rounded-lg border border-[#F0E1D6] bg-white px-4 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#F9F7F4]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusAction}
                disabled={updating}
                className={`rounded-lg px-4 py-2 text-[11px] font-bold text-white ${
                  confirmModal.action === 'suspended'
                    ? 'bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600'
                    : 'bg-[#B42318] hover:bg-red-800 disabled:bg-[#B42318]'
                } disabled:opacity-60`}
              >
                {updating ? 'Processing...' : confirmModal.action === 'suspended' ? 'Suspend' : 'Ban'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Identity header */}
      <div className="rounded-xl border border-[#F0E1D6] bg-white p-4 shadow-[0_1px_2px_rgba(29,24,26,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#F0E1D6] bg-gradient-to-br from-[#C75560] to-[#D9654A] text-lg font-bold text-white shadow-sm">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.parentElement?.querySelector?.('.fallback-avatar')?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`fallback-avatar flex h-full w-full items-center justify-center ${profileImageUrl ? 'hidden' : ''}`}>
                {initials}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold text-[#1D181A]">{fullName}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${statusClass}`}>
                  {candidate.accountStatus || 'active'}
                </span>
                {candidate.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <ShieldCheck size={11} /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4EF] px-2 py-0.5 text-[10px] font-bold text-[#80576A]">
                    <ShieldAlert size={11} /> Unverified
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-[#80576A]">Candidate ID: {candidate.uniqueId || candidateId || '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={updating || candidate.accountStatus === 'active'}
              onClick={() => updateStatus('active')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 disabled:opacity-50"
            >
              <PlayCircle size={13} /> Activate
            </button>
            <button
              type="button"
              disabled={updating || candidate.accountStatus === 'suspended'}
              onClick={() => handleStatusAction('suspended')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 disabled:opacity-50"
            >
              <PauseCircle size={13} /> Suspend
            </button>
            <button
              type="button"
              disabled={updating || candidate.accountStatus === 'banned'}
              onClick={() => handleStatusAction('banned')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F6B9BA] bg-[#FDE7E7] px-3 py-2 text-[11px] font-bold text-[#B42318] disabled:opacity-50"
            >
              <Ban size={13} /> Ban
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <StatCard icon={Briefcase} label="Applications" value={applications.length} sub={lastAppliedAt ? `last ${timeAgo(lastAppliedAt)}` : 'no applications yet'} />
          <StatCard icon={TrendingUp} label="Profile completion" value={`${profileCompletion}%`} />
          <StatCard icon={Clock} label="Last active" value={timeAgo(candidate.lastActiveAt)} />
          <StatCard icon={Calendar} label="Member since" value={formatDate(candidate.createdAt || candidate.registeredAt)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#F0E1D6] bg-white p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${
                isActive ? 'bg-[#1D181A] text-white' : 'text-[#80576A] hover:bg-[#FFF4EF]'
              }`}
            >
              <Icon size={13} />
              {tab.label}
              {tab.key === 'applications' && applications.length > 0 && (
                <span className={`ml-0.5 rounded-full px-1.5 text-[9px] ${isActive ? 'bg-white/20' : 'bg-[#FFF4EF]'}`}>{applications.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <AnalyticsChart metric={selectedAnalytics} onSelect={setSelectedAnalytics} candidateId={candidateId} />

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#80576A]" />
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Profile overview</h2>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Email</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="truncate text-[12px] font-semibold text-[#1D181A]">{candidate.email || '—'}</span>
                        {candidate.email && <CopyField value={candidate.email} />}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Phone</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-[#1D181A]">{candidate.phone || '—'}</span>
                        {candidate.phone && <CopyField value={candidate.phone} />}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Location</p>
                      <p className="mt-0.5 text-[12px] font-semibold text-[#1D181A]">{profile.location || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Calendar className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Joined</p>
                      <p className="mt-0.5 text-[12px] font-semibold text-[#1D181A]">{formatDate(candidate.createdAt || candidate.registeredAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-[#80576A]" />
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Professional details</h2>
                </div>

                <div className="space-y-3 text-[12px]">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Headline</p>
                    <p className="mt-0.5 font-semibold text-[#1D181A]">{profile.headline || 'Not provided'}</p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">About</p>
                    <p className="mt-0.5 leading-relaxed text-[#3F3438]">{profile.about || 'No bio added yet.'}</p>
                  </div>

                  <div>
                    <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Skills</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(profile.skills || []).length ? (
                        profile.skills.map((skill, index) => (
                          <span key={index} className="rounded-full border border-[#F0E1D6] bg-[#FFF9F5] px-2 py-0.5 text-[10px] font-medium text-[#80576A]">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[#80576A]">No skills added</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#80576A]" />
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Documents</h2>
                </div>

                <div className="space-y-2 text-[12px] text-[#1D181A]">
                  <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                    <span className="text-[#80576A]">Resume</span>
                    {profile.resumeUrl ? (
                      <button
                        type="button"
                        onClick={() => downloadResume(profile.resumeFilename)}
                        className="inline-flex items-center gap-1 font-semibold text-[#C75560] hover:underline"
                      >
                        <Download size={12} /> {profile.resumeFilename || 'Download'}
                      </button>
                    ) : (
                      <span className="text-[#80576A]">No file</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                    <span className="text-[#80576A]">Portfolio</span>
                    {profile.portfolio?.[0]?.url ? (
                      <a href={profile.portfolio[0].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#C75560] hover:underline">
                        <LinkIcon size={12} /> Open
                      </a>
                    ) : (
                      <span className="text-[#80576A]">Not set</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                    <span className="text-[#80576A]">Renewal date</span>
                    <span className="font-medium">{formatDate(candidate.renewalDueDate)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#80576A]" />
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Recent applications</h2>
                </div>

                {applications.slice(0, 4).length ? (
                  <ul className="space-y-2">
                    {applications.slice(0, 4).map((app, idx) => {
                      const appStatusClass = APPLICATION_STATUS_CLASS[(app.status || 'applied').toLowerCase()] || APPLICATION_STATUS_CLASS.applied;
                      return (
                        <li key={app.id || idx} className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-semibold text-[#1D181A]">{app.jobTitle || 'Untitled role'}</p>
                            <p className="text-[10px] text-[#A08A93]">{app.companyName || '—'} · {timeAgo(app.appliedAt)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ring-inset ${appStatusClass}`}>
                            {app.status || 'applied'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[12px] text-[#80576A]">No job applications yet.</p>
                )}

                {applications.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('applications')}
                    className="mt-3 text-[11px] font-bold text-[#C75560] hover:underline"
                  >
                    View all {applications.length} applications →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {activeTab === 'applications' && (
        <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#80576A]" />
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">
                Job applications ({filteredApplications.length})
              </h2>
            </div>
            <select
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              className="rounded-lg border border-[#F0E1D6] bg-[#FFFDFB] px-2.5 py-1.5 text-[11px] font-semibold text-[#1D181A]"
            >
              <option value="all">All statuses</option>
              <option value="applied">Applied</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="offered">Offered</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {filteredApplications.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#F0E1D6] text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">
                    <th className="px-2 py-2 font-bold">Job title</th>
                    <th className="px-2 py-2 font-bold">Company</th>
                    <th className="px-2 py-2 font-bold">Applied on</th>
                    <th className="px-2 py-2 font-bold">Status</th>
                    <th className="px-2 py-2 font-bold">Resume used</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, idx) => {
                    const appStatusClass = APPLICATION_STATUS_CLASS[(app.status || 'applied').toLowerCase()] || APPLICATION_STATUS_CLASS.applied;
                    return (
                      <tr key={app.id || idx} className="border-b border-[#F5EBE3] last:border-0 hover:bg-[#FFF9F5]">
                        <td className="px-2 py-2.5 font-semibold text-[#1D181A]">{app.jobTitle || 'Untitled role'}</td>
                        <td className="px-2 py-2.5 text-[#3F3438]">{app.companyName || '—'}</td>
                        <td className="px-2 py-2.5 text-[#3F3438]">{formatDateTime(app.appliedAt)}</td>
                        <td className="px-2 py-2.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ring-inset ${appStatusClass}`}>
                            {app.status || 'applied'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          {app.resumeUrl ? (
                            <button
                              type="button"
                              onClick={() => downloadResume(app.resumeFilename)}
                              className="inline-flex items-center gap-1 font-semibold text-[#C75560] hover:underline"
                            >
                              <Download size={11} /> {app.resumeFilename || 'Download'}
                            </button>
                          ) : (
                            <span className="text-[#A08A93]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-[#80576A]">No applications match this filter.</p>
          )}
        </div>
      )}

      {/* ACTIVITY LOG TAB */}
      {activeTab === 'activity' && (
        <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-[#80576A]" />
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Activity timeline</h2>
          </div>

          {activity.length ? (
            <ol className="relative space-y-4 border-l border-[#F0E1D6] pl-5">
              {activity.map((item, idx) => {
                const meta = ACTIVITY_META[item.type] || ACTIVITY_META.default;
                const Icon = meta.icon;
                return (
                  <li key={item.id || idx} className="relative">
                    <span
                      className="absolute -left-[26px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                    >
                      <Icon size={12} />
                    </span>
                    <div className="rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-[#1D181A]">{item.description || item.type}</p>
                        <span className="text-[10px] text-[#A08A93]">{formatDateTime(item.timestamp)}</span>
                      </div>
                      {(item.ip || item.device) && (
                        <p className="mt-0.5 text-[10px] text-[#A08A93]">
                          {[item.device, item.ip].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-[12px] text-[#80576A]">No activity recorded for this candidate yet.</p>
          )}
        </div>
      )}

      {/* CONTROLS TAB */}
      {activeTab === 'controls' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#80576A]" />
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Account control</h2>
            </div>

            <div className="space-y-3 text-[12px] text-[#1D181A]">
              <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                <div>
                  <p className="font-semibold">Verification</p>
                  <p className="text-[10px] text-[#A08A93]">Manually mark this candidate as verified</p>
                </div>
                <button
                  type="button"
                  disabled={updating}
                  onClick={toggleVerification}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold disabled:opacity-50 ${
                    candidate.isVerified
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-[#FFF4EF] text-[#80576A]'
                  }`}
                >
                  {candidate.isVerified ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {candidate.isVerified ? 'Verified' : 'Unverified'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                <div>
                  <p className="font-semibold">Password</p>
                  <p className="text-[10px] text-[#A08A93]">Send a password reset email</p>
                </div>
                <button
                  type="button"
                  disabled={updating}
                  onClick={sendPasswordReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-1.5 text-[10px] font-bold text-[#1D181A] hover:bg-[#FFF4EF] disabled:opacity-50"
                >
                  <KeyRound size={12} /> {updating ? 'Sending...' : 'Send reset link'}
                </button>
              </div>

            </div>
          </div>

          <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-[#80576A]" />
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Contact candidate</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={candidate.email ? `mailto:${candidate.email}` : undefined}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
              >
                <Mail size={13} /> Email candidate
              </a>
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
                >
                  <Phone size={13} /> Call candidate
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-[#80576A]" />
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Internal notes</h2>
          </div>
          <p className="mb-3 text-[10px] text-[#A08A93]">Visible only to admins — the candidate never sees these.</p>

          <div className="mb-3 flex gap-2">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note about this candidate…"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-[#F0E1D6] bg-[#FFFDFB] px-3 py-2 text-[12px] text-[#1D181A] outline-none focus:border-[#C75560]"
            />
            <button
              type="button"
              disabled={savingNote || !noteDraft.trim()}
              onClick={addNote}
              className="shrink-0 self-end rounded-lg bg-[#1D181A] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {savingNote ? <Loader2 size={13} className="animate-spin" /> : 'Add note'}
            </button>
          </div>

          {notes.length ? (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notes.map((note, idx) => (
                <li key={note.id || idx} className="rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                  <p className="text-[12px] text-[#1D181A]">{note.message}</p>
                  <p className="mt-1 text-[10px] text-[#A08A93]">
                    {note.author || 'Admin'} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-[12px] text-[#80576A]">No internal notes yet.</p>
          )}
        </div>
      )}
    </div>
  );
}