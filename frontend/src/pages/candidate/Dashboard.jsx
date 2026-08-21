import VideoModal from '../../components/VideoModal'; // path apne folder structure ke hisaab se adjust kar lena
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User,
    Briefcase,
    Award,
    Clock,
    LogOut,
    ArrowRight,
    CheckCircle2,
    XCircle,
    FileText,
    AlertTriangle,
    RefreshCw,
    Loader2,
    MapPin,
    IndianRupee,
    Sparkles,
    Bookmark,
    BookmarkX,
    X,
    Home,
    Building2,
    ChevronLeft,
    ChevronRight,
    Settings,
    HelpCircle,
    PlayCircle,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
// import GamificationPanel from '../../components/GamificationPanel';
import Avatar from '../../components/Avatar';
import CandidateNavbar from '../../components/CandidateNavbar';
import CareerWorkspacePanel from '../../components/CareerWorkspacePanel';
import { AMBER, AMBER_DARK, BG, FONT_BODY, FONT_DISPLAY, GOLD, GOLD_DARK, NEAR_BLACK } from '../../theme';

const MAROON = AMBER_DARK;
const MAROON_DARK = NEAR_BLACK;
const ACCENT = AMBER;
const EMERALD = AMBER_DARK;

const panelVariants = {
    open: { x: 0, transition: { type: 'tween', duration: 0.45 } },
    closed: { x: '100%', transition: { type: 'tween', duration: 0.42 } },
};

const STATUS_STYLES = {
    applied: { label: 'Applied', bg: '#EFEDEA', text: '#6B6259', icon: Clock },
    offered: { label: 'Offer Received', bg: '#FCF0D9', text: '#9A6A1A', icon: Sparkles },
    accepted: { label: 'Accepted', bg: '#FFF5D9', text: AMBER_DARK, icon: CheckCircle2 },
    hired: { label: 'Hired', bg: '#FFF5D9', text: AMBER_DARK, icon: Award },
    rejected: { label: 'Not Selected', bg: '#FBE9E9', text: '#B23B3B', icon: XCircle },
};

const PROFILE_COMPLETION_WEIGHTS = {
    photo: 6,
    headline: 5,
    about: 6,
    contact: 5,
    skills: 11,
    experience: 18,
    education: 11,
    certifications: 5,
    languages: 4,
    projects: 2,
    portfolio: 1,
    resume: 14,
    social: 11,
    preferences: 1,
};

function calculateProfileCompleteness(profile) {
    const details = profile?.profile || {};
    const socialLinks = profile?.socialLinks || {};
    const completed = {
        photo: Boolean(details.profilePictureUrl),
        headline: Boolean(details.headline),
        about: Boolean(details.about),
        contact: Boolean(details.location || details.phone),
        skills: Boolean(details.skills?.length),
        experience: Boolean(details.experience?.length),
        education: Boolean(details.education?.length),
        certifications: Boolean(details.certifications?.length),
        languages: Boolean(details.languages?.length),
        projects: Boolean(details.projects?.length),
        portfolio: Boolean(details.portfolio?.length),
        resume: Boolean(details.resumeUrl),
        social: Boolean(socialLinks.github || socialLinks.linkedin || socialLinks.website),
        preferences: Boolean(details.workPreferences),
    };

    return Object.entries(PROFILE_COMPLETION_WEIGHTS).reduce(
        (total, [key, weight]) => total + (completed[key] ? weight : 0),
        0,
    );
}

// ---- Social icons ---------------------------------------------------
// lucide-react v1.0 removed all brand/logo icons (Facebook, Instagram,
// LinkedIn, Twitter, YouTube, Github, etc.) for trademark reasons, so these
// are small hand-drawn SVGs instead — no extra package needed.
function FacebookIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.16 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.78 8.44-4.94 8.44-9.94z" />
        </svg>
    );
}
function InstagramIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
    );
}
function LinkedinIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3.5 9.9h3V21h-3V9.9zM9.5 9.9h2.88v1.52h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V21h-3v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-3V9.9z" />
        </svg>
    );
}
function TwitterIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.9 3H21l-6.7 7.66L22.2 21h-6.2l-4.86-6.34L5.6 21H3.5l7.16-8.2L2 3h6.35l4.4 5.83L18.9 3zm-1.08 16.17h1.15L7.24 4.75H6l11.82 14.42z" />
        </svg>
    );
}
function YoutubeIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 12s0-3.2-.41-4.72a2.87 2.87 0 0 0-2-2.03C17.9 5 12 5 12 5s-5.9 0-7.59.25a2.87 2.87 0 0 0-2 2.03C2 8.8 2 12 2 12s0 3.2.41 4.72a2.87 2.87 0 0 0 2 2.03C6.1 19 12 19 12 19s5.9 0 7.59-.25a2.87 2.87 0 0 0 2-2.03C22 15.2 22 12 22 12zM10 15.2V8.8l5.5 3.2-5.5 3.2z" />
        </svg>
    );
}

function StatusPill({ status }) {
    const style = STATUS_STYLES[status] || STATUS_STYLES.applied;
    const Icon = style.icon;
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-semibold"
            style={{ background: style.bg, color: style.text }}
        >
            <Icon size={12.5} />
            {style.label}
        </span>
    );
}

function DashboardMetric({ icon: Icon, label, value, detail, tone = 'coral' }) {
    return (
        <motion.div
            className={`candidate-dashboard-metric candidate-dashboard-metric--${tone}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
        >
            <span className="candidate-dashboard-metric-icon"><Icon size={17} /></span>
            <div>
                <p className="candidate-dashboard-metric-value">{value}</p>
                <p className="candidate-dashboard-metric-label">{label}</p>
                <p className="candidate-dashboard-metric-detail">{detail}</p>
            </div>
        </motion.div>
    );
}
function CarouselSection({ title, viewAllLink, items, emptyMessage, emptyCta, renderItem }) {
    const scrollRef = useRef(null);

    function scrollByAmount(direction) {
        scrollRef.current?.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }

    return (
        <div className="candidate-dashboard-content-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                    {title}
                </h2>
                {items.length > 0 && (
                    <div className="flex items-center gap-3">
                        <Link to={viewAllLink} className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6B6259] transition-colors hover:text-[#8B1E2F]">
                            View All
                        </Link>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => scrollByAmount(-1)}
                                aria-label={`Scroll ${title} left`}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-[#6B6259] transition-colors hover:border-[#8B1E2F]/30 hover:text-[#8B1E2F]"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => scrollByAmount(1)}
                                aria-label={`Scroll ${title} right`}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-[#6B6259] transition-colors hover:border-[#8B1E2F]/30 hover:text-[#8B1E2F]"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                    <Briefcase size={24} className="text-stone-300" />
                    <p className="text-[13px] text-[#6B6259]">{emptyMessage}</p>
                    {emptyCta}
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto pb-1 scroll-smooth"
                    style={{ scrollbarWidth: 'thin' }}
                >
                    {items.map(renderItem)}
                </div>
            )}
        </div>
    );
}

function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diffMs = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function LegacyCareerWorkspacePanel({
    profile,
    user,
    completeness,
    missingItems,
    expanded,
    onToggle,
    onOpenVideo,
    compact = false,
}) {
    const candidateName = profile?.name || user?.name || 'Your profile';
    const compactRail = compact && !expanded;

    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse career workspace' : 'Expand career workspace'}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B1E2F] ${
                    expanded
                        ? 'border-[#5C1420] text-white shadow-[0_16px_30px_-20px_rgba(92,20,32,0.75)]'
                        : 'border-stone-200/80 bg-white text-stone-900 shadow-[0_12px_26px_-22px_rgba(139,30,47,0.32)] hover:border-[#8B1E2F]/30 hover:bg-[#FFFDFB]'
                } ${compactRail ? 'flex-col justify-center gap-2 px-2 py-3' : ''}`}
                style={expanded ? { background: `linear-gradient(135deg, ${MAROON_DARK}, ${MAROON})` } : undefined}
            >
                <div className="relative shrink-0">
                    <div
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-[2px]"
                        style={{ background: `conic-gradient(${GOLD} ${completeness * 3.6}deg, #EFEDEA 0deg)` }}
                    >
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white">
                            <Avatar
                                src={profile?.profile?.profilePictureUrl}
                                name={candidateName}
                                size={compactRail ? 30 : 34}
                            />
                        </div>
                    </div>
                    <span
                        className="absolute -bottom-1 -right-2 rounded-full bg-white px-1 py-0.5 text-[9px] font-bold shadow-sm"
                        style={{ color: GOLD_DARK }}
                    >
                        {completeness}%
                    </span>
                </div>

                <div className={compactRail ? 'hidden' : 'min-w-0 flex-1'}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${expanded ? 'text-[#F0C9D1]' : 'text-[#9C7A2E]'}`}>
                        Profile
                    </p>
                    <p className="truncate text-[13px] font-bold">{candidateName}</p>
                    <p className={`truncate text-[11px] ${expanded ? 'text-[#F4DEE2]' : 'text-[#6B6259]'}`}>
                        {expanded ? `ID: ${profile?.uniqueId || 'Not assigned'}` : 'Profile and quick links'}
                    </p>
                </div>

                <ChevronRight size={17} className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {compactRail && (
                <nav
                    aria-label="Candidate navigation"
                    className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-stone-200/80 bg-white p-2 shadow-[0_12px_26px_-22px_rgba(139,30,47,0.32)]"
                >
                    <Link
                        to="/candidate/dashboard"
                        aria-label="Home"
                        aria-current="page"
                        title="Home"
                        className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                        style={{ background: `${MAROON}12`, color: MAROON }}
                    >
                        <Home size={17} />
                    </Link>
                    <Link
                        to="/candidate/jobs/applied"
                        aria-label="Applied Jobs"
                        title="Applied Jobs"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B6259] transition-colors hover:bg-[#FFFAF0] hover:text-[#9C7A2E]"
                    >
                        <Briefcase size={17} />
                    </Link>
                    <Link
                        to="/candidate/dashboard#top-companies"
                        aria-label="Companies"
                        title="Companies"
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B6259] transition-colors hover:bg-[#FFFAF0] hover:text-[#9C7A2E]"
                    >
                        <Building2 size={17} />
                    </Link>
                </nav>
            )}

            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, y: -6 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 rounded-2xl border border-stone-200/80 bg-white p-5 shadow-[0_16px_36px_-28px_rgba(139,30,47,0.32)]">
                            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#C9A24B]/25 bg-[#FFFAF0] px-3.5 py-3">
                                <div>
                                    <p className="text-[12px] font-bold text-stone-900">Profile readiness</p>
                                    <p className="mt-0.5 text-[11px] text-[#6B6259]">Complete your details to improve matches.</p>
                                </div>
                                <span className="shrink-0 text-[12px] font-bold" style={{ color: GOLD_DARK }}>
                                    {completeness}%
                                </span>
                            </div>

                            {missingItems.length > 0 && (
                                <div className="mt-4 rounded-xl border border-[#8B1E2F]/12 p-3.5" style={{ background: `${MAROON}08` }}>
                                    <p className="text-[12.5px] font-bold text-stone-900">What are you missing?</p>
                                    <ul className="mt-2.5 space-y-2">
                                        {missingItems.map((item) => (
                                            <li key={item.key} className="flex items-center gap-2 text-[11.5px] text-[#6B6259]">
                                                <XCircle size={13} color="#B23B3B" className="shrink-0" />
                                                {item.label}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link
                                        to="/candidate/profile"
                                        className="mt-3 block rounded-xl py-2.5 text-center text-[12px] font-semibold text-white transition-transform hover:-translate-y-0.5"
                                        style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                                    >
                                        Complete Profile
                                    </Link>
                                </div>
                            )}

                            <nav className="mt-4 flex flex-col gap-1 border-t border-stone-100 pt-4 text-[12.5px] font-semibold text-[#6B6259]">
                                <Link to="/candidate/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: `${MAROON}12`, color: MAROON }}>
                                    <Home size={15} />
                                    Home
                                </Link>
                                <Link to="/candidate/jobs/applied" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-stone-100 hover:text-stone-900">
                                    <Briefcase size={15} />
                                    Applied Jobs
                                </Link>
                                <Link to="/candidate/companies" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-stone-100 hover:text-stone-900">
                                    <Building2 size={15} />
                                    Companies
                                </Link>
                                <button
                                    type="button"
                                    onClick={onOpenVideo}
                                    className="mt-2 flex items-center gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5 text-left text-[12.5px] font-semibold text-stone-700 transition-colors hover:border-[#C9A24B]/50 hover:bg-[#FFFAF0]"
                                >
                                    <PlayCircle size={15} color={GOLD_DARK} />
                                    How it Works
                                </button>
                            </nav>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [applications, setApplications] = useState([]);
    const [savedJobs, setSavedJobs] = useState([]);
    const [recommendedJobs, setRecommendedJobs] = useState([]);
    const [topCompanies, setTopCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Right-side slide-over menu (replaces the old header dropdown)
    const [menuOpen, setMenuOpen] = useState(false);
    const [videoOpen, setVideoOpen] = useState(false);
    const [workspaceOpen, setWorkspaceOpen] = useState(false);

    async function loadDashboard() {
        setLoading(true);
        setError('');
        try {
            const [profileRes, applicationsRes, savedJobsRes, recommendedRes, companiesRes] = await Promise.all([
                axiosInstance.get('/candidate/me/profile'),
                axiosInstance.get('/applications/mine'),
                axiosInstance.get('/candidate/me/saved-jobs'),
                // These two are optional/best-effort widgets — if the routes
                // don't exist yet on the backend, the sections just render empty
                // instead of breaking the whole dashboard.
                axiosInstance.get('/jobs/recommended').catch(() => ({ data: [] })),
                axiosInstance.get('/companies/top').catch(() => ({ data: [] })),
            ]);
            setProfile(profileRes.data);
            setApplications(applicationsRes.data || []);
            setSavedJobs(savedJobsRes.data || []);
            setRecommendedJobs(recommendedRes.data || []);
            setTopCompanies(companiesRes.data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate('/');
                return;
            }
            setError(err.response?.data?.error || 'Could not load your dashboard. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    async function unsaveJob(jobId) {
        // Optimistic removal
        setSavedJobs((prev) => prev.filter((j) => j._id !== jobId));
        try {
            await axiosInstance.delete(`/candidate/me/saved-jobs/${jobId}`);
        } catch {
            // If it fails, just reload the saved jobs list to resync.
            axiosInstance
                .get('/candidate/me/saved-jobs')
                .then((res) => setSavedJobs(res.data || []))
                .catch(() => {});
        }
    }

    useEffect(() => {
        loadDashboard();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleLogout() {
        logout();
        navigate('/');
    }

    // NOTE: "Hired" is intentionally NOT derived from application.status here.
    // An application's status (applied/offered/accepted/hired/rejected) tracks
    // that one job's progress. Being "Hired" for the account overall is a
    // separate, authoritative flag on the candidate profile (hiredBadge.isHired),
    // which only gets set once a recruiter uploads a signed offer letter.
    const isHired = Boolean(profile?.hiredBadge?.isHired);
    const hiredConfirmedAt = profile?.hiredBadge?.confirmedAt;

    const renewalDays = daysUntil(profile?.renewalDueDate);
    const showRenewalAlert = renewalDays !== null && renewalDays <= 30;
    const isSuspended = profile?.accountStatus === 'suspended';

    const recentApplications = [...applications]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);

    const completeness = calculateProfileCompleteness(profile);

    const missingItems = [
        { key: 'resume', label: 'Upload your resume', done: Boolean(profile?.profile?.resumeUrl) },
        { key: 'skills', label: 'Add your key skills', done: Boolean(profile?.profile?.skills?.length) },
        { key: 'photo', label: 'Add a profile photo', done: Boolean(profile?.profile?.profilePictureUrl) },
    ].filter((item) => !item.done);

    return (
        <div className="portal-theme min-h-screen w-full text-stone-900" style={{ background: BG, fontFamily: FONT_BODY }}>
            <CandidateNavbar profile={profile} />

            {/* Right slide-over menu */}
            <AnimatePresence>
                {menuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMenuOpen(false)}
                            className="fixed inset-0 z-40 bg-stone-900/40"
                        />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 1.25 }}
                            className="fixed right-0 top-0 z-50 h-full w-[88%] max-w-sm overflow-y-auto bg-white shadow-2xl"
                        >
                            <div className="flex items-center justify-end p-4">
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen(false)}
                                    aria-label="Close menu"
                                    className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="px-6 pb-10">
                                <div className="flex items-center gap-3">
                                    <Avatar src={profile?.profile?.profilePictureUrl} name={user?.name || profile?.name} size={52} />
                                    <div>
                                        <p className="text-[15px] font-bold text-stone-900">{profile?.name || user?.name}</p>
                                        <p className="text-[12px] capitalize text-[#6B6259]">
                                            {profile?.workStatus || 'Status not mentioned'}
                                        </p>
                                        <Link
                                            to="/candidate/profile"
                                            onClick={() => setMenuOpen(false)}
                                            className="text-[12px] font-semibold"
                                            style={{ color: MAROON }}
                                        >
                                            View &amp; update profile
                                        </Link>
                                    </div>
                                </div>

                                <Link
                                    to="/candidate/profile"
                                    onClick={() => setMenuOpen(false)}
                                    className="mt-5 flex items-center justify-between rounded-[14px] p-4 transition-transform hover:-translate-y-0.5"
                                    style={{ background: `${MAROON}0D` }}
                                >
                                    <div>
                                        <p className="text-[13px] font-semibold text-stone-900">Boost your visibility</p>
                                        <p className="mt-0.5 text-[11.5px] text-[#6B6259]">
                                            Complete your profile so recruiters notice you first.
                                        </p>
                                    </div>
                                    <ArrowRight size={16} color={MAROON} className="shrink-0" />
                                </Link>

                                <div className="mt-6 border-t border-stone-100 pt-5">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-[12.5px] font-bold text-stone-900">Your profile performance</p>
                                        <span className="text-[11px] text-[#6B6259]">Last 90 days</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-[12px] p-3.5" style={{ background: '#F5F3F0' }}>
                                            <p className="text-[20px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                                {profile?.searchAppearances ?? 0}
                                            </p>
                                            <p className="text-[11.5px] text-[#6B6259]">Search Appearances</p>
                                            <Link
                                                to="/candidate/profile"
                                                onClick={() => setMenuOpen(false)}
                                                className="mt-1 inline-block text-[11px] font-semibold"
                                                style={{ color: MAROON }}
                                            >
                                                View all
                                            </Link>
                                        </div>
                                        <div className="rounded-[12px] p-3.5" style={{ background: '#F5F3F0' }}>
                                            <p className="text-[20px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                                {profile?.recruiterActions ?? 0}
                                            </p>
                                            <p className="text-[11.5px] text-[#6B6259]">Recruiter Actions</p>
                                            <Link
                                                to="/candidate/profile"
                                                onClick={() => setMenuOpen(false)}
                                                className="mt-1 inline-block text-[11px] font-semibold"
                                                style={{ color: MAROON }}
                                            >
                                                View all
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex flex-col divide-y divide-stone-100 border-t border-stone-100 text-[13.5px] text-stone-700">
                                    {/* <Link to="/blog" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3.5">
                                        <FileText size={16} className="text-[#6B6259]" />
                                        Blog
                                    </Link> */}
                                    <Link
                                        to="/candidate/settings"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex items-center gap-3 py-3.5"
                                    >
                                        <Settings size={16} className="text-[#6B6259]" />
                                        Settings
                                    </Link>
                                    <Link to="/faqs" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3.5">
                                        <HelpCircle size={16} className="text-[#6B6259]" />
                                        FAQs
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 py-3.5 text-left text-[#B23B3B]"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <main className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-24 text-[#6B6259]">
                        <Loader2 size={28} className="animate-spin" color={MAROON} />
                        <p className="text-[13.5px]">Loading your dashboard…</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-[18px] border border-stone-200/70 bg-white py-16 text-center">
                        <AlertTriangle size={26} color={ACCENT} />
                        <p className="text-[13.5px] font-medium text-stone-800">{error}</p>
                        <button
                            onClick={loadDashboard}
                            className="mt-1 flex items-center gap-1.5 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold text-white"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                        >
                            <RefreshCw size={13} />
                            Try again
                        </button>
                    </div>
                ) : (
                    <div className="mb-5 lg:hidden">
                        <CareerWorkspacePanel
                            profile={profile}
                            user={user}
                            completeness={completeness}
                            missingItems={missingItems}
                            expanded={workspaceOpen}
                            onToggle={() => setWorkspaceOpen((isOpen) => !isOpen)}
                            onOpenVideo={() => setVideoOpen(true)}
                        />
                    </div>
                )}

                {!loading && !error && (
                    <div
                        className={`grid items-start gap-4 transition-all duration-300 lg:gap-5 ${
                            workspaceOpen ? 'lg:grid-cols-[280px_minmax(0,1fr)]' : 'lg:grid-cols-[64px_minmax(0,1fr)]'
                        }`}
                    >
                        <aside className="hidden lg:sticky lg:top-24 lg:block">
                            <CareerWorkspacePanel
                                profile={profile}
                                user={user}
                                completeness={completeness}
                                missingItems={missingItems}
                                expanded={workspaceOpen}
                                onToggle={() => setWorkspaceOpen((isOpen) => !isOpen)}
                                onOpenVideo={() => setVideoOpen(true)}
                                compact
                            />
                        </aside>

                        {/* Main column */}
                        <div className="min-w-0">
                            <motion.section
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="candidate-dashboard-hero"
                            >
                                <div className="candidate-dashboard-hero-copy">
                                    <p className="candidate-dashboard-eyebrow"><Sparkles size={14} /> Your career workspace</p>
                                    <h1 style={{ fontFamily: FONT_DISPLAY }}>
                                        Welcome back, {profile?.name?.split(' ')[0] || 'there'}.
                                    </h1>
                                    <p>
                                        Track applications, find relevant roles, and keep your profile recruiter-ready.
                                    </p>
                                    <div className="candidate-dashboard-hero-actions">
                                        <Link to="/candidate/jobs" className="candidate-dashboard-hero-primary"><Briefcase size={16} /> Explore jobs</Link>
                                        <Link to="/candidate/profile" className="candidate-dashboard-hero-secondary"><User size={16} /> Improve profile</Link>
                                    </div>
                                </div>
                                <div className="candidate-dashboard-hero-meta">
                                    <span className="candidate-dashboard-id">
                                        ID: {profile?.uniqueId}
                                    </span>
                                    <span
                                        className="candidate-dashboard-status"
                                    >
                                        {profile?.workStatus}
                                    </span>
                                    {isHired && (
                                        <span className="candidate-dashboard-hired">
                                            <Award size={12.5} />
                                            Hired
                                        </span>
                                    )}
                                </div>
                            </motion.section>

                            <section className="candidate-dashboard-metrics" aria-label="Career progress summary">
                                <DashboardMetric icon={Briefcase} value={applications.length} label="Applications" detail="Roles you have pursued" />
                                <DashboardMetric icon={Bookmark} value={savedJobs.length} label="Saved jobs" detail="Opportunities to revisit" tone="amber" />
                                <DashboardMetric icon={Sparkles} value={`${completeness}%`} label="Profile readiness" detail="Complete details for better matches" tone="ink" />
                            </section>

                            {/* Alerts */}
                            {isSuspended && (
                                <div className="mb-4 flex items-start gap-3 rounded-[14px] border border-[#B23B3B]/25 bg-[#FBE9E9] px-4 py-3">
                                    <AlertTriangle size={16} color="#B23B3B" className="mt-0.5 shrink-0" />
                                    <p className="text-[12.5px] text-[#8A2E2E]">
                                        Your account is currently <strong>suspended</strong>. Please renew or contact support
                                        to restore full access.
                                    </p>
                                </div>
                            )}
                            {!isSuspended && showRenewalAlert && (
                                <div className="mb-4 flex items-start gap-3 rounded-[14px] border border-[#9A6A1A]/20 bg-[#FCF0D9] px-4 py-3">
                                    <Clock size={16} color="#9A6A1A" className="mt-0.5 shrink-0" />
                                    <p className="text-[12.5px] text-[#7A551A]">
                                        {renewalDays > 0
                                            ? `Your account renewal is due in ${renewalDays} day${renewalDays === 1 ? '' : 's'}.`
                                            : 'Your account renewal is overdue.'}{' '}
                                        Renew soon to avoid suspension.
                                    </p>
                                </div>
                            )}

                            {isHired && hiredConfirmedAt && (
                                <p className="mb-6 text-[12px] text-[#6B6259]">
                                    Confirmed hired on {new Date(hiredConfirmedAt).toLocaleDateString()}, after your
                                    recruiter uploaded a signed offer letter.
                                </p>
                            )}

                            {/* Gamification: badges + streaks
                            <div className="mb-4">
                                <GamificationPanel gamification={profile?.gamification} isHired={isHired} />
                            </div> */}

                            {/* Recommended Jobs carousel */}
                            <div className="mb-6">
                                <CarouselSection
                                    title="Recommended Jobs"
                                    viewAllLink="/candidate/jobs"
                                    items={recommendedJobs}
                                    emptyMessage="We'll show personalized job matches here once you complete your profile."
                                    emptyCta={
                                        <Link
                                            to="/candidate/jobs"
                                            className="mt-1 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold text-white"
                                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                                        >
                                            Browse Jobs
                                        </Link>
                                    }
                                    renderItem={(job) => (
                                        <Link
                                            key={job._id}
                                            to={`/candidate/jobs/${job._id}`}
                                            className="candidate-dashboard-item-card flex w-[220px] shrink-0 flex-col p-4 transition-all hover:-translate-y-0.5"
                                        >
                                            <p className="line-clamp-2 text-[13px] font-semibold text-stone-900">{job.title}</p>
                                            <p className="mt-1 text-[11.5px] text-[#6B6259]">
                                                {job.postedBy?.companyName || 'Company'}
                                            </p>
                                            {job.location && (
                                                <div className="mt-2 flex items-center gap-1 text-[11px] text-[#6B6259]">
                                                    <MapPin size={11} />
                                                    {job.location}
                                                </div>
                                            )}
                                            {job.salary && (
                                                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold" style={{ color: EMERALD }}>
                                                    <IndianRupee size={11} />
                                                    {job.salary}
                                                </div>
                                            )}
                                        </Link>
                                    )}
                                />
                            </div>

                            {/* Top Companies carousel */}
                            <div id="top-companies" className="mb-4">
                                <CarouselSection
                                    title="Top Companies"
                                    viewAllLink="/candidate/companies"
                                    items={topCompanies}
                                    emptyMessage="Top hiring companies will show up here soon."
                                    emptyCta={null}
                                    renderItem={(company) => (
                                        <Link
                                            key={company._id}
                                            to={`/candidate/companies/${company._id}`}
                                            className="candidate-dashboard-item-card flex w-[168px] shrink-0 flex-col items-center gap-2 p-4 text-center transition-all hover:-translate-y-0.5"
                                        >
                                            <div
                                                className="flex h-12 w-12 items-center justify-center rounded-full"
                                                style={{ background: `${GOLD}1F` }}
                                            >
                                                <Building2 size={18} color={GOLD_DARK} />
                                            </div>
                                            <p className="line-clamp-1 text-[12.5px] font-semibold text-stone-900">
                                                {company.name}
                                            </p>
                                            <p className="text-[11px] text-[#6B6259]">{company.openJobs ?? 0} open jobs</p>
                                        </Link>
                                    )}
                                />
                            </div>

                            {/* Recent applications */}
                            <div className="candidate-dashboard-content-card p-4 sm:p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-[16px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                        Recent Applications
                                    </h2>
                                    {applications.length > 0 && (
                                        <Link
                                            to="/candidate/jobs"
                                            className="text-[12.5px] font-semibold transition-colors"
                                            style={{ color: MAROON }}
                                        >
                                            Browse more jobs
                                        </Link>
                                    )}
                                </div>

                                {recentApplications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                        <Briefcase size={26} className="text-stone-300" />
                                        <p className="text-[13.5px] text-[#6B6259]">
                                            You haven't applied to any jobs yet.
                                        </p>
                                        <Link
                                            to="/candidate/jobs"
                                            className="mt-1 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold text-white"
                                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                                        >
                                            Browse Jobs
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex flex-col divide-y divide-stone-100">
                                        {recentApplications.map((app, i) => (
                                            <motion.div
                                                key={app._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.3, delay: i * 0.03 }}
                                                className="flex flex-col gap-2 rounded-lg px-2 py-4 transition-colors first:pt-3 last:pb-3 hover:bg-[#8B1E2F]/[0.04] sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <p className="text-[14px] font-semibold text-stone-900">
                                                        {app.job?.title || 'Job listing removed'}
                                                    </p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6B6259]">
                                                        {app.job?.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={11.5} />
                                                                {app.job.location}
                                                            </span>
                                                        )}
                                                        {app.job?.salary && (
                                                            <span className="flex items-center gap-1">
                                                                <IndianRupee size={11.5} />
                                                                {app.job.salary}
                                                            </span>
                                                        )}
                                                        <span>
                                                            Applied {new Date(app.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <StatusPill status={app.status} />
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/*------------------------------------- Saved jobs-------------------------------------------------------- */}


                            {/* <div className="mt-6 rounded-[20px] border border-stone-200/70 bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-[16px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                        Saved Jobs
                                    </h2>
                                    {savedJobs.length > 0 && (
                                        <Link to="/candidate/jobs" className="text-[12.5px] font-semibold" style={{ color: MAROON }}>
                                            Browse more jobs
                                        </Link>
                                    )}
                                </div>

                                {savedJobs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                                        <Bookmark size={26} className="text-stone-300" />
                                        <p className="text-[13.5px] text-[#6B6259]">
                                            You haven't saved any jobs yet.
                                        </p>
                                        <Link
                                            to="/candidate/jobs"
                                            className="mt-1 rounded-[10px] px-4 py-2 text-[12.5px] font-semibold text-white"
                                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                                        >
                                            Browse Jobs
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="flex flex-col divide-y divide-stone-100">
                                        {savedJobs.map((job, i) => (
                                            <motion.div
                                                key={job._id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.3, delay: i * 0.03 }}
                                                className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <p className="text-[14px] font-semibold text-stone-900">{job.title}</p>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[#6B6259]">
                                                        <span>{job.postedBy?.companyName || 'Company'}</span>
                                                        {job.location && (
                                                            <span className="flex items-center gap-1">
                                                                <MapPin size={11.5} />
                                                                {job.location}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => unsaveJob(job._id)}
                                                    className="flex items-center gap-1.5 self-start rounded-[10px] border border-stone-200 px-3 py-1.5 text-[12px] font-semibold text-[#6B6259] transition-colors hover:border-[#B23B3B]/30 hover:text-[#B23B3B] sm:self-auto"
                                                >
                                                    <BookmarkX size={13} />
                                                    Unsave
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div> */}
                            {/* ----------------------------------------------------------------------------------- */}




                        </div>
                    </div>
                )} 
            </main>
            <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
        </div>
    );
}