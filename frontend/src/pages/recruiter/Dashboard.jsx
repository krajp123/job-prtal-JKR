import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import RecruiterProfileMenu from "../../components/RecruiterProfileMenu";
import NotificationCenter from "../../components/NotificationCenter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Sparkles,
  CalendarDays,
  MessageSquare,
  BarChart3,
  FileText,
  Building2,
  User,
  UserPlus,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Plus,
  ChevronDown,
  Menu,
  X,
  TrendingUp,
  TrendingDown,
  Eye,
  Bookmark,
  MapPin,
  Clock,
  IndianRupee,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Zap,
  Video,
  Pause,
  Play,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Download,
  Pencil,
  Wand2,
  FileSignature,
  UploadCloud,
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  Flame,
  Award,
  House,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FONT_DISPLAY,
  FONT_BODY,
  BG,
  IVORY,
  SOFT_IVORY,
  LIGHT_BORDER,
  NEAR_BLACK,
  DUSTY_ROSE,
  CORAL,
  CORAL_HOVER,
  AMBER,
} from "../../theme";
import axiosInstance from "../../api/axiosInstance";
/* ============================== TOKENS ============================== */
// Palette: canvas ivory, coral accent (#C75560), amber highlights (#F7C56B), violet details.
// Warm signal color for "match" and goal progress, with coral-led accent gradients.
// Signature element: the "Signal Ring" — a gradient circular progress mark used
// consistently for AI match %, goal completion, and pipeline health.

const GRADIENTS = {
  ring: [CORAL, AMBER], // coral -> amber
};

function SignalRing({ value = 0, size = 56, stroke = 6, label, sub, gradId }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const id = gradId || `ring-${Math.round(value)}-${size}`;
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={GRADIENTS.ring[0]} />
            <stop offset="100%" stopColor={GRADIENTS.ring[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#EEF0FA"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center leading-none">
        <span
          className="text-slate-900 font-bold"
          style={{ fontSize: size * 0.26 }}
        >
          {value}%
        </span>
      </div>
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

/* ============================== DUMMY DATA ============================== */

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "Home", label: "Home", icon: House },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "applications", label: "Applications", icon: FileText },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "company", label: "Company", icon: Building2 },
  { key: "recruiters", label: "Recruiters", icon: UserPlus },
  { key: "settings", label: "Settings", icon: Settings },
];

// Sidebar keeps only Dashboard alongside the profile card; the rest of the
// nav now lives as a horizontal bar at the top of the page.
const SIDEBAR_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.key === "dashboard" || item.key === "settings",
);
const TOP_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.key !== "dashboard" && item.key !== "settings",
);

const STATS = [
  {
    label: "Open Jobs",
    value: 24,
    change: 8.2,
    up: true,
    icon: Briefcase,
    ring: 62,
  },
  {
    label: "Active Applications",
    value: 318,
    change: 12.4,
    up: true,
    icon: FileText,
    ring: 74,
  },
  {
    label: "Candidates Screened",
    value: 156,
    change: 3.1,
    up: false,
    icon: Users,
    ring: 45,
  },
  {
    label: "Shortlisted",
    value: 42,
    change: 6.7,
    up: true,
    icon: CheckCircle2,
    ring: 58,
  },
  {
    label: "Interviews Scheduled",
    value: 19,
    change: 2.0,
    up: true,
    icon: Video,
    ring: 38,
  },
  {
    label: "Offers Sent",
    value: 7,
    change: 1.4,
    up: false,
    icon: FileSignature,
    ring: 29,
  },
  {
    label: "New Hires",
    value: 5,
    change: 25.0,
    up: true,
    icon: Award,
    ring: 83,
  },
  {
    label: "AI Matches Today",
    value: 63,
    change: 18.9,
    up: true,
    icon: Sparkles,
    ring: 91,
  },
];

const APP_TREND = [
  { day: "Mon", applications: 32, views: 210 },
  { day: "Tue", applications: 48, views: 260 },
  { day: "Wed", applications: 41, views: 240 },
  { day: "Thu", applications: 63, views: 310 },
  { day: "Fri", applications: 55, views: 290 },
  { day: "Sat", applications: 24, views: 140 },
  { day: "Sun", applications: 19, views: 110 },
];

const FUNNEL = [
  { stage: "Applied", value: 318 },
  { stage: "Reviewed", value: 210 },
  { stage: "Screening", value: 140 },
  { stage: "Shortlist", value: 78 },
  { stage: "Interview", value: 42 },
  { stage: "Offer", value: 12 },
  { stage: "Hired", value: 5 },
];

const DEPT_DATA = [
  { name: "Engineering", value: 132, color: "#C75560" },
  { name: "Design", value: 44, color: "#A855F7" },
  { name: "Sales", value: 61, color: "#F59E0B" },
  { name: "Marketing", value: 38, color: "#10B981" },
  { name: "Ops", value: 43, color: "#F43F5E" },
];

// Dummy JOBS array removed — ActiveJobs component now fetches the
// recruiter's real posted jobs from GET /jobs/mine/list.

const APPLICATIONS = [
  {
    id: 1,
    name: "Ananya Rao",
    initials: "AR",
    exp: "5 yrs",
    location: "Bengaluru",
    salary: "₹26L",
    skills: ["React", "TypeScript", "Node"],
    applied: "2h ago",
    match: 94,
    status: "Shortlisted",
  },
  {
    id: 2,
    name: "Rohit Malhotra",
    initials: "RM",
    exp: "3 yrs",
    location: "Pune",
    salary: "₹18L",
    skills: ["Figma", "UX Research"],
    applied: "5h ago",
    match: 87,
    status: "Reviewed",
  },
  {
    id: 3,
    name: "Sneha Iyer",
    initials: "SI",
    exp: "6 yrs",
    location: "Remote",
    salary: "₹30L",
    skills: ["AWS", "Kubernetes", "Terraform"],
    applied: "1d ago",
    match: 91,
    status: "Interview",
  },
  {
    id: 4,
    name: "Karan Verma",
    initials: "KV",
    exp: "2 yrs",
    location: "Hyderabad",
    salary: "₹12L",
    skills: ["Python", "ML", "Pandas"],
    applied: "1d ago",
    match: 78,
    status: "Applied",
  },
  {
    id: 5,
    name: "Divya Nair",
    initials: "DN",
    exp: "4 yrs",
    location: "Chennai",
    salary: "₹21L",
    skills: ["React", "GraphQL"],
    applied: "2d ago",
    match: 82,
    status: "Reviewed",
  },
  {
    id: 6,
    name: "Amit Kulkarni",
    initials: "AK",
    exp: "3 yrs",
    location: "Mumbai",
    salary: "₹16L",
    skills: ["Java", "Spring Boot"],
    applied: "2d ago",
    match: 75,
    status: "Applied",
  },
  {
    id: 7,
    name: "Priya Desai",
    initials: "PD",
    exp: "5 yrs",
    location: "Bengaluru",
    salary: "₹27L",
    skills: ["React", "Next.js", "Tailwind"],
    applied: "3d ago",
    match: 96,
    status: "Shortlisted",
  },
  {
    id: 8,
    name: "Arjun Mehta",
    initials: "AM",
    exp: "6 yrs",
    location: "Remote",
    salary: "₹31L",
    skills: ["React", "System Design"],
    applied: "3d ago",
    match: 92,
    status: "Interview",
  },
  {
    id: 9,
    name: "Ritu Chawla",
    initials: "RC",
    exp: "4 yrs",
    location: "Delhi NCR",
    salary: "₹20L",
    skills: ["Vue", "Node"],
    applied: "4d ago",
    match: 88,
    status: "Reviewed",
  },
  {
    id: 10,
    name: "Ibrahim Sk",
    initials: "IS",
    exp: "1 yr",
    location: "Kolkata",
    salary: "₹8L",
    skills: ["JavaScript", "HTML/CSS"],
    applied: "5d ago",
    match: 65,
    status: "Applied",
  },
];

const STATUS_STYLES = {
  Shortlisted: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  Reviewed: "bg-[#FFF0E8] text-[#C75560] ring-1 ring-[#F7C56B]/30",
  Interview: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Applied: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  Rejected: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

/* ============================== SMALL UI ATOMS ============================== */

const GlassCard = ({ className = "", children, ...props }) => (
  <div
    className={`rounded-[28px] border backdrop-blur-xl shadow-[0_26px_60px_-40px_rgba(29,24,26,0.24)] ${className}`}
    style={{ background: IVORY, borderColor: LIGHT_BORDER }}
    {...props}
  >
    {children}
  </div>
);

const Avatar = ({
  initials,
  size = "h-10 w-10",
  tone = "from-[#C75560] to-[#F7C56B]",
}) => (
  <div
    className={`${size} shrink-0 rounded-2xl bg-gradient-to-br ${tone} flex items-center justify-center text-white text-xs font-bold shadow-md shadow-slate-200/50`}
  >
    {initials}
  </div>
);

const Pill = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
  >
    {children}
  </span>
);

/* ============================== SIDEBAR ============================== */
// Left navbar now lives inside a collapsible "profile card" (same pattern as
// the candidate CareerWorkspacePanel): a clickable avatar+ring summary that
// expands into the full nav list, and collapses into an icon-only rail.

function SidebarProfileCard({ expanded, onToggle, recruiterProfile }) {
  const navigate = useNavigate();

  const handleCardClick = (event) => {
    if (event.target.closest('[data-profile-link]')) {
      navigate('/recruiter/company-profile');
      return;
    }
    onToggle();
  };

  const recruiterName = recruiterProfile?.name || 'Recruiter';
  const companyName = recruiterProfile?.companyName || 'Your Company';
  const companyLogoUrl = recruiterProfile?.companyLogoUrl;
  const profileCompleteness = recruiterProfile?.profileCompleteness || 72;
  const initials = recruiterName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      type="button"
      onClick={handleCardClick}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C75560] ${
        expanded
          ? "border-transparent text-white shadow-[0_16px_30px_-20px_rgba(199,85,96,0.75)]"
          : "flex-col justify-center gap-2 px-2 py-3 border-slate-200 bg-white text-slate-900 shadow-[0_12px_26px_-22px_rgba(199,85,96,0.32)] hover:border-[#C75560]/30 hover:bg-slate-50"
      }`}
      style={
        expanded
          ? { background: `linear-gradient(135deg, ${NEAR_BLACK}, ${CORAL})` }
          : undefined
      }
    >
      <div className="relative shrink-0" data-profile-link>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full p-[2px]"
          style={{
            background: `conic-gradient(${AMBER} ${profileCompleteness * 3.6}deg, #EEF0FA 0deg)`,
          }}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={companyName}
                className={`${expanded ? "h-8 w-8" : "h-7 w-7"} rounded-full object-cover`}
              />
            ) : (
              <Avatar initials={initials} size={expanded ? "h-8 w-8" : "h-7 w-7"} />
            )}
          </div>
        </div>
        <span className="absolute -bottom-1 -right-2 rounded-full bg-white px-1 py-0.5 text-[9px] font-bold shadow-sm text-[#C75560]">
          {profileCompleteness}%
        </span>
      </div>

      {expanded && (
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">
            Profile
          </p>
          <p className="truncate text-[13px] font-bold">{recruiterName}</p>
          <p className="truncate text-[11px] text-white/70">
            {companyName} · Recruiter
          </p>
        </div>
      )}

      <ChevronDown
        size={16}
        className={`shrink-0 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
      />
    </button>
  );
}

function SidebarWelcomePanel() {
  return (
    <div
      className="relative mx-3 mt-3 overflow-hidden rounded-2xl p-4"
      style={{ background: IVORY, border: `1px solid ${LIGHT_BORDER}` }}
    >
      <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-gradient-to-br from-[#FBCFC8]/50 to-[#F9E7BA]/50 blur-2xl" />
      <div className="relative">
        <p className="text-sm font-bold text-slate-900">
          Good morning, Shiv 👋
        </p>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Welcome back to your hiring workspace. Here's where things stand
          today.
        </p>

        <div className="flex flex-col items-start gap-3.5 mt-3">
          <Pill className="bg-white ring-1 ring-slate-200 text-slate-600">
            <Clock size={11} /> Tue, 28 Jul 2026
          </Pill>
          <Pill className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            <Zap size={11} /> Goal: 5 hires this month · 5/5 on track
          </Pill>
          <Pill className="bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            <Flame size={11} /> 12-day hiring streak
          </Pill>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  active,
  setActive,
  mobileOpen,
  setMobileOpen,
  expanded,
  setExpanded,
  recruiterProfile,
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSidebarNav = (key) => {
    setMobileOpen(false);
    if (key === "settings") {
      navigate("/recruiter/settings");
      return;
    }
    if (key === "dashboard") {
      navigate("/recruiter/dashboard");
      return;
    }
    setActive(key);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const renderNav = (compact) => (
    <nav
      className={
        compact
          ? "mt-3 flex flex-col items-center gap-2"
          : "flex-1 px-3 mt-4 space-y-0.5"
      }
    >
      {SIDEBAR_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.key;

        if (compact) {
          return (
            <button
              key={item.key}
              title={item.label}
              onClick={() => handleSidebarNav(item.key)}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? "text-[#C75560]"
                  : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              }`}
              style={
                isActive ? { background: "rgba(199,85,96,0.10)" } : undefined
              }
            >
              <Icon size={17} />
            </button>
          );
        }

        return (
          <button
            key={item.key}
            onClick={() => handleSidebarNav(item.key)}
            className={`group relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all
              ${isActive ? "text-[#C75560]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
          >
            {isActive && (
              <motion.span
                layoutId="active-pill"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FFF0E8] to-[#FFF6DE] ring-1 ring-[#F7C56B]/30"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <Icon
              size={18}
              className="relative z-10"
              strokeWidth={isActive ? 2.4 : 2}
            />
            <span className="relative z-10">{item.label}</span>
            {isActive && (
              <span className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-[#C75560]" />
            )}
          </button>
        );
      })}
    </nav>
  );

  const renderContent = (compact) => (
<div className="flex h-full flex-col" style={{ background: "transparent" }}>
        <div className="flex items-center gap-2 px-5 pt-5 pb-1">
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto text-slate-400 hover:text-slate-700 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-3 pt-4 pb-1">
        <SidebarProfileCard
          recruiterProfile={recruiterProfile}
          expanded={!compact}
          onToggle={() => setExpanded((v) => !v)}
        />
      </div>

      {!compact && <SidebarWelcomePanel />}

      {compact ? (
        <div className="mt-3 mx-3 flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_12px_26px_-22px_rgba(199,85,96,0.32)]">
          {renderNav(true)}
          <div className="my-1 h-px w-8 bg-slate-100" />
          <button
            title="Help Center"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          >
            <HelpCircle size={18} />
          </button>
          <button
            type="button"
            title="Logout"
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-500 hover:bg-rose-50"
          >
            <LogOut size={18} />
          </button>
        </div>
      ) : (
        <>
          {renderNav(false)}
          <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-0.5">
            <button
              title="Help Center"
              className="flex items-center gap-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 w-full px-3 py-2.5"
            >
              <HelpCircle size={18} /> Help Center
            </button>
            <button
              type="button"
              title="Logout"
              onClick={handleLogout}
              className="flex items-center gap-3 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-50 w-full px-3 py-2.5"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar — collapses to an icon rail when the profile card is toggled closed */}
      <aside
        className={`hidden lg:block lg:sticky lg:top-[115px] lg:overflow-y-auto lg:max-h-[calc(100vh-104px)] shrink-0 rounded-[48px] transition-all duration-300 min-w-0 ${
          expanded
            ? "lg:w-[260px] lg:h-[calc(100vh-96px)]"
            : "lg:w-[84px] lg:h-auto"
        }`}
        style={{ background: "transparent" }}
      >
        {renderContent(!expanded)}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 w-[min(92vw,280px)] bg-white z-50 shadow-2xl lg:hidden"
            >
              {renderContent(false)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ============================== TOP NAV ============================== */

function MiniCalendar() {
  const today = new Date();
  const [offset, setOffset] = useState(0); // months offset from current month
  const displayed = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = displayed.getFullYear();
  const month = displayed.getMonth();
  const firstDayIdx = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = displayed.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const cells = [];
  for (let i = 0; i < firstDayIdx; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function prevMonth() {
    setOffset((v) => v - 1);
  }
  function nextMonth() {
    setOffset((v) => v + 1);
  }

  return (
    <div className="p-3 w-64">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-50">
            <ChevronLeft size={14} />
          </button>
          <p className="text-sm font-semibold text-slate-800">{monthLabel}</p>
        </div>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-50">
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
              d === today.getDate()
                ? "bg-gradient-to-br from-[#C75560] to-[#F7C56B] text-white font-semibold"
                : d
                  ? "text-slate-600 hover:bg-slate-50 cursor-pointer"
                  : ""
            }`}
          >
            {d || ""}
          </span>
        ))}
      </div>
    </div>
  );
}

const NOTIFICATIONS_CLEARED_KEY = "jobhub_recruiter_notifications_cleared_at";

function TopNav({ recruiterProfile, onMenuClick, notifications = [] }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState(null); // null | "calendar" | "notif"
  const toggleMenu = (key) => setOpenMenu((prev) => (prev === key ? null : key));
  const navRef = useRef(null);
  const displayName = user?.name || 'Recruiter';

  // "Clear all" just moves this cutoff forward to now and persists it —
  // anything at or before this timestamp is treated as cleared and will
  // never resurface, even after a reload. Genuinely new events (which will
  // have a later timestamp) still show up normally.
  const [clearedAt, setClearedAt] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = window.localStorage.getItem(NOTIFICATIONS_CLEARED_KEY);
    return stored ? Number(stored) : 0;
  });

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => n.timestamp > clearedAt).slice(0, 20),
    [notifications, clearedAt],
  );

  const clearAllNotifications = () => {
    const now = Date.now();
    setClearedAt(now);
    window.localStorage.setItem(NOTIFICATIONS_CLEARED_KEY, String(now));
  };

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenu]);

  return (
    <header
      ref={navRef}
      className="sticky top-0 z-30 border-b backdrop-blur-xl shadow-sm"
      style={{ borderColor: LIGHT_BORDER, background: IVORY }}
    >
      <div className="mx-auto flex w-full flex-nowrap items-center gap-3 px-3 sm:px-6 py-3 max-w-[1400px]">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="lg:hidden shrink-0 h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        >
          <Menu size={19} />
        </button>

        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-[#C75560] to-[#F7C56B] flex items-center justify-center shadow-md shadow-[#C75560]/20">
            <Sparkles className="text-white" size={15} />
          </div>
          <p className="text-sm font-bold text-slate-900 truncate">
            Job Portal
          </p>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-auto shrink-0">
          <div className="relative hidden sm:block">
            <button
              onClick={() => toggleMenu("calendar")}
              className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            >
              <CalendarDays size={18} />
            </button>
            <AnimatePresence>
              {openMenu === "calendar" && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  className="absolute right-0 sm:left-1/2 mt-2 sm:-translate-x-1/2 w-[min(90vw,320px)] rounded-2xl bg-white ring-1 ring-slate-200 shadow-xl z-50"
                >
                  <MiniCalendar />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-center">
            <NotificationCenter className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800" />
          </div>

          {/* Wallet button - placed before profile */}
          <button
            type="button"
            onClick={() => navigate('/recruiter/wallet')}
            className="inline-flex items-center gap-2 rounded-lg border border-[#EBC2AE] bg-[#FFF0E8] px-3 py-2 text-[12px] font-bold text-[#1D181A] transition-all hover:-translate-y-0.5 hover:border-[#C75560]"
            title="Wallet"
          >
            <Wallet size={15} className="text-[#C75560]" />
            <span className="hidden sm:inline">Wallet</span>
          </button>

          <RecruiterProfileMenu recruiterProfile={recruiterProfile} />
        </div>
      </div>
    </header>
  );
}

/* ============================== WELCOME HERO ============================== */

function TopSectionNav({ active, setActive }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Company & Recruiters will get their own dedicated pages later,
  // so they shouldn't scroll to an in-page section — just highlight the tab.
  const NO_SCROLL_KEYS = ["company", "recruiters"];

  const handleNavClick = (key) => {
    setActive(key);
    if (NO_SCROLL_KEYS.includes(key)) return;
    const el = document.getElementById(`section-${key}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="sticky top-[76px] z-20 bg-transparent">
      <GlassCard className="p-2 bg-white">
        <div className="flex items-center gap-1">
          <div
            className="flex items-center gap-1 overflow-x-auto hide-scrollbar min-w-0 flex-1"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            {TOP_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  className={`relative flex items-center gap-1.5 sm:gap-2 rounded-xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0
                    ${isActive ? "text-[#C75560]" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="top-nav-active-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FFF0E8] to-[#FFF6DE] ring-1 ring-[#F7C56B]/30"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 32,
                      }}
                    />
                  )}
                  <Icon
                    size={15}
                    className="relative z-10 shrink-0"
                    strokeWidth={isActive ? 2.4 : 2}
                  />
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="shrink-0 relative h-9 w-9">
            {/* Always occupies a fixed 36px slot in the flex row — fades out
                instead of resizing, so it never pushes the nav buttons. */}
            <button
              onClick={() => setSearchOpen(true)}
              className={`h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-opacity duration-150 ${
                searchOpen ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <Search size={17} />
            </button>

            {/* Expanded input is an absolute overlay anchored to the right —
                growing it never reflows sibling nav buttons. */}
            <AnimatePresence>
              {searchOpen && (
                <motion.div
                  initial={{ width: 36, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 36, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="absolute right-0 top-0 overflow-hidden z-30 max-w-[calc(100vw-2rem)]"
                >
                  <div className="relative w-[240px] max-w-[calc(100vw-2rem)]">
                    <Search
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      size={14}
                    />
                    <input
                      autoFocus
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onBlur={() => {
                        if (!searchValue) setSearchOpen(false);
                      }}
                      placeholder="Search jobs, candidates…"
                      className="w-full rounded-xl bg-white ring-1 ring-slate-200 shadow-sm pl-8 pr-2.5 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C75560]/30 transition-all"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

/* ============================== STATS GRID ============================== */

function StatsGrid() {
  const [stats, setStats] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");
  const trackRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  useEffect(() => {
    async function loadStats() {
      setStatsLoading(true);
      setStatsError("");
      try {
        const { data } = await axiosInstance.get(
          "/recruiter/dashboard/overview",
        );
        setStats([
          {
            label: "Open Jobs",
            value: data.openJobs,
            change: 0,
            up: true,
            icon: Briefcase,
            ring: 62,
          },
          {
            label: "Active Applications",
            value: data.activeApplications,
            change: 0,
            up: true,
            icon: FileText,
            ring: 74,
          },
          {
            label: "Candidates Screened",
            value: data.candidatesScreened,
            change: 0,
            up: true,
            icon: Users,
            ring: 45,
          },
          {
            label: "Shortlisted",
            value: data.shortlisted,
            change: 0,
            up: true,
            icon: CheckCircle2,
            ring: 58,
          },
          {
            label: "Interviews Scheduled",
            value: data.interviewsScheduled,
            change: 0,
            up: true,
            icon: Video,
            ring: 38,
          },
          {
            label: "Offers Sent",
            value: data.offersSent,
            change: 0,
            up: true,
            icon: FileSignature,
            ring: 29,
          },
          {
            label: "New Hires",
            value: data.newHires,
            change: 0,
            up: true,
            icon: Award,
            ring: 83,
          },
          {
            label: "AI Matches Today",
            value: data.aiMatchesToday,
            change: 0,
            up: true,
            icon: Sparkles,
            ring: 91,
          },
        ]);
      } catch (error) {
        setStatsError(
          error.response?.data?.error || "Unable to load dashboard stats.",
        );
      } finally {
        setStatsLoading(false);
      }
    }

    loadStats();
  }, []);

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [stats]);

  const scrollByCard = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("[data-stat-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // Drag-to-scroll (mouse + touch) for a slider feel on desktop too.
  const onPointerDown = (e) => {
    const el = trackRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartScroll.current = el.scrollLeft;
    el.classList.add("cursor-grabbing");
  };
  const onPointerMove = (e) => {
    const el = trackRef.current;
    if (!el || !isDragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    el.scrollLeft = dragStartScroll.current - (x - dragStartX.current);
  };
  const endDrag = () => {
    isDragging.current = false;
    trackRef.current?.classList.remove("cursor-grabbing");
  };

  return (
    <div
      className="relative group/slider"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Left edge fade */}
      <div
        className={`pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 transition-opacity duration-300 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
        style={{ background: `linear-gradient(to right, ${BG}, transparent)` }}
      />
      {/* Right edge fade */}
      <div
        className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
        style={{ background: `linear-gradient(to left, ${BG}, transparent)` }}
      />

      {/* Left arrow — fades in on hover */}
      <button
        onClick={() => scrollByCard(-1)}
        aria-label="Scroll left"
        className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white shadow-md ring-1 ring-slate-200 flex items-center justify-center text-slate-600 hover:text-[#C75560] hover:ring-[#F7C56B]/40 transition-all duration-300 ${
          isHovering && canScrollLeft
            ? "opacity-100 translate-x-0"
            : "opacity-0 -translate-x-2 pointer-events-none"
        }`}
      >
        <ChevronLeft size={18} />
      </button>

      {/* Right arrow — fades in on hover */}
      <button
        onClick={() => scrollByCard(1)}
        aria-label="Scroll right"
        className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white shadow-md ring-1 ring-slate-200 flex items-center justify-center text-slate-600 hover:text-[#C75560] hover:ring-[#F7C56B]/40 transition-all duration-300 ${
          isHovering && canScrollRight
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-2 pointer-events-none"
        }`}
      >
        <ChevronRight size={18} />
      </button>

      <div className="border border-slate-200 rounded-[28px] bg-white shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-800">
            Dashboard stats
          </p>
          {statsLoading ? null : statsError ? (
            <p className="text-xs text-rose-500">{statsError}</p>
          ) : (
            <p className="text-xs text-slate-500">Updated just now</p>
          )}
        </div>
        <div
          ref={trackRef}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={endDrag}
          className="flex gap-4 overflow-x-auto scroll-smooth cursor-grab select-none pb-1 hide-scrollbar"
          style={{
            scrollSnapType: "x proximity",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
          {statsLoading ? (
            <div className="py-6 text-sm text-slate-500">
              Loading dashboard stats...
            </div>
          ) : statsError ? (
            <div className="py-6 text-sm text-rose-500">{statsError}</div>
          ) : stats.length === 0 ? (
            <div className="py-6 text-sm text-slate-500">
              No stats available yet.
            </div>
          ) : (
            stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  data-stat-card
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ y: -3 }}
                  className="shrink-0 w-[46%] xs:w-[42%] sm:w-[31%] md:w-[23%] lg:w-[18.5%]"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <GlassCard className="p-4 h-full hover:shadow-md hover:shadow-[#C75560]/20 transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#FFF0E8] to-[#FFF6DE] ring-1 ring-[#F7C56B]/30 flex items-center justify-center">
                        <Icon size={16} className="text-[#C75560]" />
                      </div>
                      <SignalRing value={s.ring} size={34} stroke={4} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mt-3">
                      {s.value}
                    </p>
                    <p className="text-xs text-slate-500">{s.label}</p>
                    <p
                      className={`text-xs font-medium mt-1.5 inline-flex items-center gap-1 ${s.up ? "text-emerald-600" : "text-rose-500"}`}
                    >
                      {s.up ? (
                        <TrendingUp size={12} />
                      ) : (
                        <TrendingDown size={12} />
                      )}{" "}
                      {s.change}% vs last week
                    </p>
                  </GlassCard>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== CHARTS ============================== */

// function ChartsSection() {
//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
//       <GlassCard className="lg:col-span-2 p-5">
//         <div className="flex items-center justify-between mb-4">
//           <div>
//             <p className="text-sm font-semibold text-slate-800">Applications & views this week</p>
//             <p className="text-xs text-slate-400">Across all active job postings</p>
//           </div>
//           <Pill className="bg-[#FFF0E8] text-[#C75560]">+12.4% WoW</Pill>
//         </div>
//         <ResponsiveContainer width="100%" height={220}>
//           <AreaChart data={APP_TREND} margin={{ left: -20, right: 10 }}>
//             <defs>
//               <linearGradient id="fillApps" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
//                 <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
//               </linearGradient>
//               <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
//                 <stop offset="0%" stopColor="#A855F7" stopOpacity={0.25} />
//                 <stop offset="100%" stopColor="#A855F7" stopOpacity={0} />
//               </linearGradient>
//             </defs>
//             <CartesianGrid vertical={false} stroke="#F1F5F9" />
//             <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} />
//             <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} />
//             <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #E2E8F0", fontSize: 12 }} />
//             <Area type="monotone" dataKey="views" stroke="#A855F7" fill="url(#fillViews)" strokeWidth={2} />
//             <Area type="monotone" dataKey="applications" stroke="#6366F1" fill="url(#fillApps)" strokeWidth={2.5} />
//           </AreaChart>
//         </ResponsiveContainer>
//       </GlassCard>

//       <GlassCard className="p-5">
//         <p className="text-sm font-semibold text-slate-800 mb-1">Applications by department</p>
//         <p className="text-xs text-slate-400 mb-2">Current open roles</p>
//         <ResponsiveContainer width="100%" height={190}>
//           <PieChart>
//             <Pie data={DEPT_DATA} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
//               {DEPT_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
//             </Pie>
//             <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #E2E8F0", fontSize: 12 }} />
//           </PieChart>
//         </ResponsiveContainer>
//         <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-1">
//           {DEPT_DATA.map((d) => (
//             <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-500">
//               <span className="h-2 w-2 rounded-full" style={{ background: d.color }} /> {d.name}
//             </div>
//           ))}
//         </div>
//       </GlassCard>

//       <GlassCard className="lg:col-span-3 p-5">
//         <p className="text-sm font-semibold text-slate-800 mb-4">Hiring funnel</p>
//         <div className="flex flex-col sm:flex-row gap-2 sm:gap-1">
//           {FUNNEL.map((f, i) => {
//             const pct = Math.round((f.value / FUNNEL[0].value) * 100);
//             return (
//               <div key={f.stage} className="flex-1 flex flex-col items-center gap-1.5">
//                 <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
//                   <motion.div
//                     initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.08, duration: 0.6 }}
//                     className="h-full rounded-full bg-gradient-to-r from-[#C75560] to-[#F7C56B]"
//                   />
//                 </div>
//                 <p className="text-sm font-bold text-slate-800">{f.value}</p>
//                 <p className="text-[11px] text-slate-400">{f.stage}</p>
//               </div>
//             );
//           })}
//         </div>
//       </GlassCard>
//     </div>
//   );
// }

function postedAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return seconds <= 5 ? "Just now" : `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo${months === 1 ? "" : "s"} ago`;
}

// Builds a real, chronologically-sorted activity/notification feed straight
// from the recruiter's actual jobs + applications data — no dummy content.
// Each application/job already carries real timestamps (appliedAt,
// resumeViewedAt, interviewScheduledAt, offeredAt, acceptedAt, createdAt),
// so every entry here corresponds to something that actually happened.
function buildActivityFeed(applications = [], jobs = []) {
  const events = [];

  jobs.forEach((job) => {
    if (!job?.createdAt) return;
    events.push({
      id: `job-${job._id}-posted`,
      icon: Briefcase,
      text: `You posted a new job: ${job.title || "Untitled role"}`,
      timestamp: new Date(job.createdAt).getTime(),
    });
  });

  applications.forEach((app) => {
    if (!app?._id) return;
    const candidateName = app.candidate?.name || "A candidate";
    const jobTitle = app.job?.title || "your job";

    if (app.appliedAt || app.createdAt) {
      events.push({
        id: `${app._id}-applied`,
        icon: FileText,
        text: `New application from ${candidateName} for ${jobTitle}`,
        timestamp: new Date(app.appliedAt || app.createdAt).getTime(),
      });
    }
    if (app.resumeViewedAt) {
      events.push({
        id: `${app._id}-shortlisted`,
        icon: CheckCircle2,
        text: `${candidateName} moved to Shortlisted`,
        timestamp: new Date(app.resumeViewedAt).getTime(),
      });
    }
    if (app.interviewScheduledAt) {
      events.push({
        id: `${app._id}-interview`,
        icon: Video,
        text: `Interview scheduled with ${candidateName}`,
        timestamp: new Date(app.interviewScheduledAt).getTime(),
      });
    }
    if (app.offeredAt) {
      events.push({
        id: `${app._id}-offered`,
        icon: FileSignature,
        text: `Offer sent to ${candidateName}`,
        timestamp: new Date(app.offeredAt).getTime(),
      });
    }
    if (app.acceptedAt) {
      events.push({
        id: `${app._id}-accepted`,
        icon: Award,
        text: `${candidateName} accepted the offer`,
        timestamp: new Date(app.acceptedAt).getTime(),
      });
    }
    if (app.status === "rejected" && app.updatedAt) {
      events.push({
        id: `${app._id}-rejected`,
        icon: XCircle,
        text: `${candidateName}'s application was marked as rejected`,
        timestamp: new Date(app.updatedAt).getTime(),
      });
    }
  });

  return events
    .filter((e) => Number.isFinite(e.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function decodeHtmlEntities(text) {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

const DESCRIPTION_HEADERS = [
  "about the company",
  "job description",
  "roles & responsibilities",
  "roles and responsibilities",
  "required qualifications",
  "job highlights",
  "key skills",
  "education",
  "perks and benefits",
];

function renderJobDescription(rawText) {
  const text = decodeHtmlEntities(rawText);
  if (!text) return null;

  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, i) => {
    const isHeader = DESCRIPTION_HEADERS.includes(line.toLowerCase());
    return isHeader ? (
      <p
        key={i}
        className="mt-4 first:mt-0 text-[13px] font-bold text-[#1D181A]"
      >
        {line}
      </p>
    ) : (
      <p key={i} className="mt-1.5 text-[13px] leading-6 text-[#3A3034]">
        {line}
      </p>
    );
  });
}

/* ============================== JOB DETAIL / EDIT POPUP ============================== */

function JobDetailModal({
  job,
  editMode,
  onStartEdit,
  onCancelEdit,
  saving,
  error,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    salary: "",
    experienceLevel: "",
    skillsRequired: "",
  });

  useEffect(() => {
    if (job) {
      setForm({
        title: job.title || "",
        description: job.description || "",
        location: job.location || "",
        salary: job.salary || "",
        experienceLevel: job.experienceLevel || "",
        skillsRequired: Array.isArray(job.skillsRequired)
          ? job.skillsRequired.join(", ")
          : "",
      });
    }
  }, [job, editMode]);

  if (!job) return null;

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      salary: form.salary.trim(),
      experienceLevel: form.experienceLevel.trim(),
      skillsRequired: form.skillsRequired
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  const displayStatus = job.status === "open" ? "Active" : "Paused";
  const skills = Array.isArray(job.skillsRequired)
    ? job.skillsRequired.filter(Boolean)
    : [];

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-[#1D181A]/40 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="job-detail-modal-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-[18px] border border-[#EBC2AE] bg-white p-6 shadow-[0_30px_70px_-24px_rgba(29,24,26,0.4)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">
                  {editMode ? "Edit job" : "Job details"}
                </p>
                <h2
                  id="job-detail-modal-title"
                  className="mt-1 text-[17px] font-bold leading-tight text-[#1D181A]"
                  style={{ fontFamily: FONT_DISPLAY }}
                >
                  {editMode ? "Update your job opening" : job.title}
                </h2>
                {!editMode && (
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${displayStatus === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}
                  >
                    {displayStatus}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#80576A] transition-colors hover:bg-[#FFF0E8] hover:text-[#1D181A]"
              >
                <X size={16} />
              </button>
            </div>

            {editMode ? (
              <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">
                    Job title
                  </label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={4}
                    required
                    className="w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-2.5 text-[13px] outline-none focus:border-[#C75560]"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">
                      Location
                    </label>
                    <input
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                      className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">
                      Salary
                    </label>
                    <input
                      name="salary"
                      value={form.salary}
                      onChange={handleChange}
                      className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">
                      Experience level
                    </label>
                    <input
                      name="experienceLevel"
                      value={form.experienceLevel}
                      onChange={handleChange}
                      className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">
                      Skills (comma separated)
                    </label>
                    <input
                      name="skillsRequired"
                      value={form.skillsRequired}
                      onChange={handleChange}
                      className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">
                    {error}
                  </p>
                )}

                <div className="mt-6 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={onCancelEdit}
                    disabled={saving}
                    className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-[10px] bg-[#C75560] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#A94658] disabled:opacity-70"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-[#80576A]">
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} /> {job.location}
                    </span>
                  )}
                  {job.salary && (
                    <span className="flex items-center gap-1.5">
                      <IndianRupee size={13} /> {job.salary}
                    </span>
                  )}
                  {job.experienceLevel && <span>{job.experienceLevel}</span>}
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} /> Posted {postedAgo(job.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText size={13} /> {job.applicantsCount ?? 0} applicants
                  </span>
                </div>

                {skills.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                      Skills required
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#FFF0E8] px-2.5 py-1 text-[11px] font-semibold text-[#8D6072]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">
                    Description
                  </p>
                  <div className="mt-2.5">
                    {renderJobDescription(job.description)}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-[#F0D1BF] pt-5">
                  <button
                    type="button"
                    onClick={() => onStartEdit(job)}
                    className="flex items-center gap-2 rounded-[10px] bg-[#C75560] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#A94658]"
                  >
                    <Pencil size={14} /> Edit job
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PauseJobModal({ job, submitting, error, onConfirm, onCancel }) {
  if (!job) return null;
  const isReopen = job.status !== "open";
  const title = isReopen ? "Re-open this job post?" : "Pause this job post?";
  const description = isReopen
    ? "This job will become visible to candidates again and new applicants will be able to apply."
    : "This job will be hidden from candidate search immediately. Candidates who already applied keep their application.";
  const cancelLabel = isReopen ? "Keep it paused" : "Keep it active";
  const confirmLabel = isReopen ? "Re-open job" : "Pause job";
  const confirmTone = isReopen
    ? "bg-[#2E7D32] hover:bg-[#246A28]"
    : "bg-[#B3261E] hover:bg-[#96201A]";

  return (
    <AnimatePresence>
      {job && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <div className="absolute inset-0 bg-[#1D181A]/40 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-job-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] rounded-[18px] border border-[#EBC2AE] bg-white p-6 shadow-[0_30px_70px_-24px_rgba(29,24,26,0.4)]"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${isReopen ? "bg-[#ECF9F0] text-[#2E7D32]" : "bg-[#FFF0EE] text-[#B3261E]"}`}
            >
              <AlertTriangle size={20} />
            </span>
            <h2
              id="pause-job-title"
              className="mt-4 text-[17px] font-bold text-[#1D181A]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#80576A]">
              <span className="font-semibold text-[#1D181A]">{job.title}</span>{" "}
              {description}
            </p>

            {error && (
              <p className="mt-3 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:opacity-60"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className={`flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors disabled:opacity-70 ${confirmTone}`}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting
                  ? isReopen
                    ? "Re-opening…"
                    : "Pausing…"
                  : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DeleteJobModal({ job, submitting, error, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {job && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        >
          <div className="absolute inset-0 bg-[#1D181A]/40 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-job-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] rounded-[18px] border border-[#EBC2AE] bg-white p-6 shadow-[0_30px_70px_-24px_rgba(29,24,26,0.4)]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF0EE] text-[#B3261E]">
              <AlertTriangle size={20} />
            </span>
            <h2
              id="delete-job-title"
              className="mt-4 text-[17px] font-bold text-[#1D181A]"
              style={{ fontFamily: FONT_DISPLAY }}
            >
              Delete this job post?
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-[#80576A]">
              <span className="font-semibold text-[#1D181A]">{job.title}</span>{" "}
              will be permanently removed from your posted jobs and candidates
              will no longer see it.
            </p>

            {error && (
              <p className="mt-3 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={submitting}
                className="flex items-center gap-2 rounded-[10px] bg-[#B3261E] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#96201A] disabled:opacity-70"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? "Deleting…" : "Delete job"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================== ACTIVE JOBS ============================== */

function ActiveJobs({ onJobsLoaded } = {}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const trackRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartScroll = useRef(0);

  const [detailJob, setDetailJob] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [pauseTarget, setPauseTarget] = useState(null);
  const [pausing, setPausing] = useState(false);
  const [pauseError, setPauseError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    if (onJobsLoaded) onJobsLoaded(jobs);
  }, [jobs, onJobsLoaded]);

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError("");
      try {
        const { data } = await axiosInstance.get("/jobs/mine/list");
        setJobs(data || []);
      } catch (err) {
        setError(err.response?.data?.error || "Could not load your jobs.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  function openDetail(job) {
    setEditMode(false);
    setEditError("");
    setDetailJob(job);
  }

  function closeDetail() {
    if (savingEdit) return;
    setDetailJob(null);
    setEditMode(false);
    setEditError("");
  }

  async function saveEdit(payload) {
    if (!detailJob) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const { data } = await axiosInstance.patch(
        `/jobs/${detailJob._id}`,
        payload,
      );
      setJobs((prev) =>
        prev.map((j) => (j._id === detailJob._id ? { ...j, ...data } : j)),
      );
      setDetailJob((current) => (current ? { ...current, ...data } : current));
      setEditMode(false);
    } catch (err) {
      setEditError(
        err.response?.data?.error ||
          "Could not update this job. Please try again.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmPause() {
    if (!pauseTarget) return;
    const nextStatus = pauseTarget.status === "open" ? "closed" : "open";
    setPausing(true);
    setPauseError("");
    try {
      await axiosInstance.patch(`/jobs/${pauseTarget._id}/close`, {
        status: nextStatus,
      });
      setJobs((prev) =>
        prev.map((j) =>
          j._id === pauseTarget._id ? { ...j, status: nextStatus } : j,
        ),
      );
      setDetailJob((current) =>
        current && current._id === pauseTarget._id
          ? { ...current, status: nextStatus }
          : current,
      );
      setPauseTarget(null);
    } catch (err) {
      setPauseError(
        err.response?.data?.error || "Could not update job status.",
      );
    } finally {
      setPausing(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await axiosInstance.delete(`/jobs/${deleteTarget._id}`);
      setJobs((prev) => prev.filter((j) => j._id !== deleteTarget._id));
      setDetailJob((current) =>
        current && current._id === deleteTarget._id ? null : current,
      );
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.response?.data?.error || "Could not delete job.");
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, [jobs]);

  const scrollByCard = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const card = el.querySelector("[data-job-card]");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const onPointerDown = (e) => {
    const el = trackRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    dragStartScroll.current = el.scrollLeft;
    el.classList.add("cursor-grabbing");
  };
  const onPointerMove = (e) => {
    const el = trackRef.current;
    if (!el || !isDragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    el.scrollLeft = dragStartScroll.current - (x - dragStartX.current);
  };
  const endDrag = () => {
    isDragging.current = false;
    trackRef.current?.classList.remove("cursor-grabbing");
  };

  return (
    <>
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-800">Active jobs</p>
          <a
            href="/recruiter/jobs"
            className="text-xs font-medium text-[#C75560] flex items-center gap-1 hover:gap-1.5 transition-all"
          >
            View all <ArrowUpRight size={12} />
          </a>
        </div>

        <div
          className="relative group/slider"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
        >
          {/* Left edge fade */}
          <div
            className={`pointer-events-none absolute left-0 top-0 bottom-0 w-10 z-10 transition-opacity duration-300 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
            style={{
              background: "linear-gradient(to right, #FFFDFB, transparent)",
            }}
          />
          {/* Right edge fade */}
          <div
            className={`pointer-events-none absolute right-0 top-0 bottom-0 w-10 z-10 transition-opacity duration-300 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
            style={{
              background: "linear-gradient(to left, #FFFDFB, transparent)",
            }}
          />

          {/* Left arrow — fades in on hover */}
          <button
            onClick={() => scrollByCard(-1)}
            aria-label="Scroll left"
            className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white shadow-md ring-1 ring-slate-200 flex items-center justify-center text-slate-600 hover:text-[#C75560] hover:ring-[#F7C56B]/40 transition-all duration-300 ${
              isHovering && canScrollLeft
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none"
            }`}
          >
            <ChevronLeft size={18} />
          </button>

          {/* Right arrow — fades in on hover */}
          <button
            onClick={() => scrollByCard(1)}
            aria-label="Scroll right"
            className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 h-9 w-9 rounded-full bg-white shadow-md ring-1 ring-slate-200 flex items-center justify-center text-slate-600 hover:text-[#C75560] hover:ring-[#F7C56B]/40 transition-all duration-300 ${
              isHovering && canScrollRight
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-2 pointer-events-none"
            }`}
          >
            <ChevronRight size={18} />
          </button>

          <div
            ref={trackRef}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={endDrag}
            className="flex gap-4 overflow-x-auto scroll-smooth cursor-grab select-none pb-1 hide-scrollbar"
            style={{
              scrollSnapType: "x proximity",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; }`}</style>
            {loading ? (
              <p className="text-xs text-slate-400 py-6">Loading your jobs…</p>
            ) : error ? (
              <p className="text-xs text-red-500 py-6">{error}</p>
            ) : jobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-6">
                You haven't posted any jobs yet.{" "}
                <a
                  href="/recruiter/post-job"
                  className="font-medium text-[#C75560] hover:underline"
                >
                  Post your first job
                </a>
              </p>
            ) : (
              jobs.map((job) => {
                const displayStatus =
                  job.status === "open" ? "Active" : "Paused";
                return (
                  <div
                    key={job._id}
                    data-job-card
                    onClick={() => openDetail(job)}
                    role="button"
                    tabIndex={0}
                    className="shrink-0 w-[85%] xs:w-[70%] sm:w-[52%] md:w-[38%] lg:w-[31%] cursor-pointer rounded-2xl ring-1 ring-slate-200 p-4 hover:ring-[#C75560]/20 hover:shadow-sm transition-all"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {job.title}
                        </p>
                        {job.location && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin size={11} /> {job.location}
                          </p>
                        )}
                      </div>
                      <Pill
                        className={
                          displayStatus === "Active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                        }
                      >
                        {displayStatus}
                      </Pill>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <IndianRupee size={11} />{" "}
                        {job.salary || "Not disclosed"}
                      </span>
                      {job.experienceLevel && (
                        <span>{job.experienceLevel}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <FileText size={11} /> {job.applicantsCount ?? 0}{" "}
                        applicants
                      </span>
                      <span className="ml-auto text-slate-400">
                        {postedAgo(job.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                      <button
                        title={displayStatus === "Active" ? "Pause" : "Resume"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPauseTarget(job);
                        }}
                        className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50 hover:text-[#C75560]"
                      >
                        {displayStatus === "Active" ? (
                          <Pause size={13} />
                        ) : (
                          <Play size={13} />
                        )}
                      </button>
                      <button
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(job);
                        }}
                        className="ml-auto h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </GlassCard>

      <JobDetailModal
        job={detailJob}
        editMode={editMode}
        onStartEdit={() => setEditMode(true)}
        onCancelEdit={() => {
          if (!savingEdit) {
            setEditMode(false);
            setEditError("");
          }
        }}
        saving={savingEdit}
        error={editError}
        onSave={saveEdit}
        onClose={closeDetail}
      />

      <PauseJobModal
        job={pauseTarget}
        submitting={pausing}
        error={pauseError}
        onCancel={() => {
          if (!pausing) {
            setPauseTarget(null);
            setPauseError("");
          }
        }}
        onConfirm={confirmPause}
      />

      <DeleteJobModal
        job={deleteTarget}
        submitting={deleting}
        error={deleteError}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}

/* ============================== RECENT APPLICATIONS TABLE ============================== */

function RecentApplications({ onApplicationsLoaded }) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

  useEffect(() => {
    async function loadApplications() {
      setLoading(true);
      setError("");
      setApplications([]);
      setPage(1);
      if (onApplicationsLoaded) onApplicationsLoaded([]);
      try {
        const res = await axiosInstance.get("/applications/recruiter");
        const apps = res.data || [];
        setApplications(apps);
        if (onApplicationsLoaded) onApplicationsLoaded(apps);
      } catch (err) {
        setError(
          err.response?.data?.error || "Unable to load recent applications.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadApplications();

    // Status changes (e.g. shortlisting a candidate) happen on the separate
    // /recruiter/applicants page. If that page was opened in another tab, or
    // the recruiter navigated there and back, this component's one-time fetch
    // above can go stale. Re-fetch whenever the tab regains focus/visibility
    // so the table and the Candidate Pipeline counts stay in sync.
    const handleRefetch = () => {
      if (document.visibilityState === "visible") loadApplications();
    };
    window.addEventListener("focus", handleRefetch);
    document.addEventListener("visibilitychange", handleRefetch);
    return () => {
      window.removeEventListener("focus", handleRefetch);
      document.removeEventListener("visibilitychange", handleRefetch);
    };
  }, [onApplicationsLoaded]);

  const totalPages = Math.max(1, Math.ceil(applications.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = applications.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const formatAppliedAt = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <GlassCard className="p-5 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <p className="text-sm font-semibold text-slate-800">
          Recent applications
        </p>
        <button
          type="button"
          onClick={() => navigate("/recruiter/applicants")}
          className="inline-flex items-center gap-1 text-xs font-medium text-[#C75560]"
        >
          View all <ArrowUpRight size={12} />
        </button>
      </div>

      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Loading recent applications…
        </div>
      ) : applications.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">
          No recent applications yet.
        </div>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm min-w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="font-medium py-2 pr-4">Candidate</th>
                  <th className="font-medium py-2 pr-4">Experience</th>
                  {/* <th className="font-medium py-2 pr-4">Skills</th> */}
                  {/* <th className="font-medium py-2 pr-4">Match</th> */}
                  <th className="font-medium py-2 pr-4">Status</th>
                  <th className="font-medium py-2 pr-4 text-right">Applied</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((app) => {
                  const candidate = app.candidate || {};
                  const profile = candidate.profile || {};
                  const skills = profile?.skills || app.matchedSkills || [];
                  const initials = candidate.name
                    ? candidate.name
                        .split(" ")
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase())
                        .join("")
                    : "NA";
                  const profilePictureUrl = profile?.profilePictureUrl || candidate?.profilePictureUrl;
                  const experienceSummary =
                    Array.isArray(profile?.experience) &&
                    profile.experience.length > 0
                      ? `${profile.experience[0].role || "Experience"}${profile.experience[0].company ? ` @ ${profile.experience[0].company}` : ""}`
                      : "–";
                  return (
                    <tr
                      key={app._id}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {profilePictureUrl ? (
                            <img src={profilePictureUrl} alt={candidate.name} className="h-9 w-9 rounded-2xl object-cover" />
                          ) : (
                            <Avatar initials={initials} size="h-9 w-9" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {candidate.name || "Candidate"}
                            </p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1">
                              <MapPin size={10} />{" "}
                              {candidate.email || "Unknown"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">
                        {experienceSummary}
                      </td>
                      {/* <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {skills.slice(0, 4).map((skill) => (
                            <span key={skill} className="text-[11px] rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 truncate">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td> */}
                      {/* <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <SignalRing value={app.skillsMatch || 0} size={28} stroke={4} />
                        </div>
                      </td> */}
                      <td className="py-3 pr-16">
                        <Pill
                          className={
                            STATUS_STYLES[
                              app.status.charAt(0).toUpperCase() +
                                app.status.slice(1)
                            ] ||
                            ""
                          }
                        >
                          {app.status
                            ? app.status
                                .replace("_", " ")
                                .replace(/^./, (c) => c.toUpperCase())
                            : "Applied"}
                        </Pill>
                      </td>
                      <td className="py-4 pr-4 text-right text-slate-500">
                        {formatAppliedAt(app.appliedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {pageItems.map((app) => {
              const candidate = app.candidate || {};
              const profile = candidate.profile || {};
              const skills = profile?.skills || app.matchedSkills || [];
              const initials = candidate.name
                ? candidate.name
                    .split(" ")
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join("")
                : "NA";
              const profilePictureUrl = profile?.profilePictureUrl || candidate?.profilePictureUrl;
              return (
                <div
                  key={app._id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {profilePictureUrl ? (
                        <img src={profilePictureUrl} alt={candidate.name} className="h-10 w-10 rounded-2xl object-cover" />
                      ) : (
                        <Avatar initials={initials} size="h-10 w-10" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">
                          {candidate.name || "Candidate"}
                        </p>
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <MapPin size={10} />{" "}
                          {candidate.profile?.location || "Unknown"}
                        </p>
                      </div>
                    </div>
                    <Pill
                      className={
                        STATUS_STYLES[
                          app.status.charAt(0).toUpperCase() +
                            app.status.slice(1)
                        ] || "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                      }
                    >
                      {app.status?.replace("_", " ") || "Applied"}
                    </Pill>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>{formatAppliedAt(app.appliedAt)}</span>
                    <span>Match {app.skillsMatch || 0}%</span>
                    <span>{skills.length ? skills[0] : "No skills"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-600"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400">
                Showing {(safePage - 1) * PAGE_SIZE + 1}-
                {Math.min(safePage * PAGE_SIZE, applications.length)} of{" "}
                {applications.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg ring-1 ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs font-medium text-slate-600 px-2">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="h-8 w-8 flex items-center justify-center rounded-lg ring-1 ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}

/* ============================== PIPELINE KANBAN ============================== */

function PipelineKanban({ applications = [] }) {
  const navigate = useNavigate();
  const STAGE_LABELS = {
    applied: "Applied",
    shortlisted: "Shortlisted",
    interview_scheduled: "Interview Scheduled",
    offered: "Offered",
    accepted: "Accepted",
    rejected: "Rejected",
    hired: "Hired",
  };

  const stages = Object.keys(STAGE_LABELS);
  const [activeStage, setActiveStage] = useState(stages[0]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  const groupedApplications = useMemo(() => {
    return applications.reduce(
      (acc, app) => {
        const rawStatus = String(app.status || "applied")
          .toLowerCase()
          .replace(/\s+/g, "_");
        const statusKey = stages.includes(rawStatus) ? rawStatus : "applied";
        acc[statusKey] = acc[statusKey] || [];
        acc[statusKey].push(app);
        return acc;
      },
      stages.reduce((acc, stage) => {
        acc[stage] = [];
        return acc;
      }, {}),
    );
  }, [applications, stages]);

  const formatAppliedAt = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  const handleStageClick = (stage) => {
    setActiveStage(stage);
    setPage(1);
  };

  const toneMap = {
    applied: "bg-slate-100 text-slate-500",
    viewed: "bg-[#FFF0E8] text-[#C75560] ring-1 ring-[#F7C56B]/30",
    shortlisted: "bg-violet-50 text-violet-600",
    interview_scheduled: "bg-fuchsia-50 text-fuchsia-600",
    offered: "bg-emerald-50 text-emerald-600",
    accepted: "bg-[#D1FAE5] text-emerald-700",
    rejected: "bg-rose-50 text-rose-700",
    hired: "bg-[#FFF6DE] text-[#C75560]",
  };
  const activeTone = {
    applied: "text-slate-700",
    viewed: "text-[#C75560]",
    shortlisted: "text-violet-600",
    interview_scheduled: "text-fuchsia-600",
    offered: "text-emerald-600",
    accepted: "text-emerald-700",
    rejected: "text-rose-700",
    hired: "text-[#C75560]",
  };

  return (
    <GlassCard className="p-5">
      <p className="text-sm font-semibold text-slate-800 mb-4">
        Candidate pipeline
      </p>

      {/* Stage tab navbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-50 p-1.5 ring-1 ring-slate-100 mb-4 overflow-x-auto">
        {stages.map((stage) => {
          const isActive = activeStage === stage;
          return (
            <button
              key={stage}
              onClick={() => handleStageClick(stage)}
              className={`relative shrink-0 flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium transition-colors
                ${isActive ? activeTone[stage] : "text-slate-500 hover:text-slate-800"}`}
            >
              {isActive && (
                <motion.span
                  layoutId="pipeline-active-pill"
                  className="absolute inset-0 rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10">{STAGE_LABELS[stage]}</span>
              <span
                className={`relative z-10 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                  isActive ? toneMap[stage] : "bg-slate-200/70 text-slate-500"
                }`}
              >
                {groupedApplications[stage]?.length || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active stage candidates */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStage}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {(() => {
            const list = groupedApplications[activeStage] || [];
            const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
            const safePage = Math.min(page, totalPages);
            const pageItems = list.slice(
              (safePage - 1) * PAGE_SIZE,
              safePage * PAGE_SIZE,
            );

            if (list.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="h-10 w-10 rounded-full bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center mb-2">
                    <Users size={16} className="text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400">
                    No candidates in {STAGE_LABELS[activeStage]} right now
                  </p>
                </div>
              );
            }

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {pageItems.map((app) => {
                    const candidate = app.candidate || {};
                    const profile = candidate.profile || {};
                    const name = candidate.name || "Candidate";
                    const initials =
                      name
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0]?.toUpperCase())
                        .join("") || "NA";
                    const profilePictureUrl = profile?.profilePictureUrl || candidate?.profilePictureUrl;
                    return (
                      <motion.div
                        whileHover={{ y: -2 }}
                        key={app._id}
                        onClick={() =>
                          navigate(
                            `/recruiter/applicants?applicationId=${app._id}`,
                          )
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(
                              `/recruiter/applicants?applicationId=${app._id}`,
                            );
                          }
                        }}
                        className="rounded-xl ring-1 ring-slate-200 bg-white p-3 flex items-center gap-3 cursor-pointer shadow-sm"
                      >
                        {profilePictureUrl ? (
                          <img src={profilePictureUrl} alt={name} className="h-10 w-10 rounded-2xl object-cover shrink-0" />
                        ) : (
                          <Avatar initials={initials} size="h-10 w-10" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {app.job?.title || "Application"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span>{formatAppliedAt(app.appliedAt)}</span>
                            <span>
                              {app.skillsMatch
                                ? `Match ${app.skillsMatch}%`
                                : "No match data"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Showing {(safePage - 1) * PAGE_SIZE + 1}-
                      {Math.min(safePage * PAGE_SIZE, list.length)} of{" "}
                      {list.length}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={safePage === 1}
                        className="h-8 w-8 flex items-center justify-center rounded-lg ring-1 ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <span className="text-xs font-medium text-slate-600 px-2">
                        {safePage} / {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={safePage === totalPages}
                        className="h-8 w-8 flex items-center justify-center rounded-lg ring-1 ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </motion.div>
      </AnimatePresence>
    </GlassCard>
  );
}

function RecentActivity({ feed = [] }) {
  const items = feed.slice(0, 5);
  return (
    <GlassCard className="p-5">
      <p className="text-sm font-semibold text-slate-800 mb-4">
        Recent activity
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">
          No recent activity yet.
        </p>
      ) : (
        <div className="space-y-3.5">
          {items.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-slate-50 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                <a.icon size={13} className="text-[#C75560]" />
              </div>
              <div>
                <p className="text-sm text-slate-700">{a.text}</p>
                <p className="text-xs text-slate-400">
                  {postedAgo(a.timestamp)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

function ResumeDownloadsPanel({ downloads = [], loading, error, onRefresh, onDownload }) {
  const navigate = useNavigate();
  const visibleDownloads = downloads.slice(0, 2);
  const hasMore = downloads.length > 2;

  return (
    <GlassCard className="mb-5 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Downloaded Resumes</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          Loading downloaded resumes...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : downloads.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No downloaded resumes yet. Download a candidate resume to save it here.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visibleDownloads.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {item.candidateName || 'Candidate'}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {item.candidateUniqueId ? `ID: ${item.candidateUniqueId}` : 'Candidate details unavailable'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownload(item.id, item.resumeFilename || 'resume.pdf')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#F8F5F3] px-3 py-1.5 text-[11px] font-semibold text-[#80576A] hover:bg-[#EFE3DA]"
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
            {hasMore && (
              <button
                type="button"
                onClick={() => navigate('/recruiter/resume-downloads')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                View all ({downloads.length})
              </button>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}

async function getAxiosErrorMessage(err, fallback) {
  const responseData = err?.response?.data;
  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const parsed = JSON.parse(text);
      return parsed?.error || fallback;
    } catch {
      return fallback;
    }
  }

  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData);
      return parsed?.error || responseData || fallback;
    } catch {
      return responseData || fallback;
    }
  }

  return responseData?.error || fallback;
}

/* Footer removed: page uses site-wide footer elsewhere. */

/* ============================== APP ROOT ============================== */

export default function RecruiterDashboard() {
  const [active, setActive] = useState("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [recruiterProfile, setRecruiterProfile] = useState(null);
  const [recruiterApplications, setRecruiterApplications] = useState([]);
  const [recruiterJobs, setRecruiterJobs] = useState([]);
  const [downloadedResumes, setDownloadedResumes] = useState([]);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeError, setResumeError] = useState('');

  const activityFeed = useMemo(
    () => buildActivityFeed(recruiterApplications, recruiterJobs),
    [recruiterApplications, recruiterJobs],
  );

  const fetchDownloadedResumes = async () => {
    setResumeError('');
    setResumeLoading(true);
    try {
      const { data } = await axiosInstance.get('/recruiter/resume-downloads', {
        params: { page: 1, limit: 5 },
      });
      setDownloadedResumes(data.items || []);
    } catch (err) {
      setResumeError(err.response?.data?.error || 'Could not load downloaded resumes.');
      setDownloadedResumes([]);
    } finally {
      setResumeLoading(false);
    }
  };

  const downloadSavedResume = async (paymentId, filename = 'resume.pdf') => {
    setResumeError('');
    try {
      const response = await axiosInstance.get(`/recruiter/resume-downloads/${paymentId}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: response.data.type || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const message = await getAxiosErrorMessage(err, 'Could not download saved resume.');
      if (message === 'No resume available.') {
        window.alert(message);
        return;
      }
      setResumeError(message);
    }
  };

  useEffect(() => {
    const fetchRecruiterProfile = async () => {
      try {
        const { data } = await axiosInstance.get('/recruiter/me/profile');
        setRecruiterProfile(data);
      } catch (err) {
        console.error('Failed to load recruiter profile:', err);
      }
    };
    fetchRecruiterProfile();
  }, []);

  useEffect(() => {
    fetchDownloadedResumes();
  }, []);

  return (
    <div
      className="min-h-screen w-full text-[#1D181A]"
      style={{ background: BG, fontFamily: FONT_BODY }}
    >
      <TopNav
        recruiterProfile={recruiterProfile}
        onMenuClick={() => setMobileOpen(true)}
        notifications={activityFeed}
      />

      <div className="mx-auto grid w-full max-w-[1400px] gap-4 px-3 sm:px-6 py-4 sm:py-6 lg:grid-cols-[minmax(auto,280px)_minmax(0,1fr)_minmax(auto,300px)]">
        <Sidebar
          recruiterProfile={recruiterProfile}
          active={active}
          setActive={setActive}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          expanded={sidebarExpanded}
          setExpanded={setSidebarExpanded}
        />

        <main className="flex-1 min-w-0 space-y-5">
          <TopSectionNav active={active} setActive={setActive} />

          <div id="section-Home" className="scroll-mt-36">
            <StatsGrid />
          </div>

          {/* <div id="section-company" className="scroll-mt-36">
            <ChartsSection />
          </div> */}

          <div id="section-jobs" className="scroll-mt-36">
            <ActiveJobs onJobsLoaded={setRecruiterJobs} />
          </div>

          <div id="section-applications" className="scroll-mt-36">
            <RecentApplications
              onApplicationsLoaded={setRecruiterApplications}
            />
          </div>

          <div id="section-candidates" className="scroll-mt-36">
            <PipelineKanban applications={recruiterApplications} />
          </div>
        </main>

        {/* Right panel — fixed width like the left Sidebar, so it never
            squeezes the main content's width. */}
        <aside
          id="section-recruiters"
          className="scroll-mt-36 hidden lg:block lg:sticky lg:top-[76px] lg:w-[300px] shrink-0"
        >
          <ResumeDownloadsPanel
            downloads={downloadedResumes}
            loading={resumeLoading}
            error={resumeError}
            onRefresh={fetchDownloadedResumes}
            onDownload={downloadSavedResume}
          />
          <RecentActivity feed={activityFeed} />
        </aside>

        {/* Stacks below main content on smaller screens where the sticky rail is hidden */}
        <div id="section-recruiters-mobile" className="w-full lg:hidden">
          <ResumeDownloadsPanel
            downloads={downloadedResumes}
            loading={resumeLoading}
            error={resumeError}
            onRefresh={fetchDownloadedResumes}
            onDownload={downloadSavedResume}
          />
          <RecentActivity feed={activityFeed} />
        </div>
      </div>
    </div>
  );
}