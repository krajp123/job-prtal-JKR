import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertTriangle,
    ArrowUpDown,
    Briefcase,
    Check,
    Pencil,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    IndianRupee,
    LayoutGrid,
    List,
    Loader2,
    Lock,
    LockKeyhole,
    LockOpen,
    MapPin,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import { FONT_DISPLAY } from '../../theme';

/* ------------------------------------------------------------------ */
/* Design tokens — reuses the same palette as the rest of the portal   */
/* ------------------------------------------------------------------ */
const INK = '#1D181A';
const CORAL = '#C75560';
const CORAL_HOVER = '#A94658';
const AMBER = '#F7C56B';
const AMBER_DARK = '#9A671A';
const BORDER = '#EBC2AE';
const MUTED = '#80576A';
const SOFT_CORAL = '#FFF0E8';
const SOFT_AMBER = '#FFF5D9';
const GREEN = '#6BAE75';
const RED = '#B3261E';

const APPLICATION_STATUS_META = {
    applied: { label: 'Applied', color: AMBER_DARK, bg: SOFT_AMBER },
    offered: { label: 'Offered', color: CORAL, bg: SOFT_CORAL },
    accepted: { label: 'Accepted', color: AMBER_DARK, bg: SOFT_AMBER },
    hired: { label: 'Hired', color: GREEN, bg: '#EAF6EC' },
    rejected: { label: 'Rejected', color: RED, bg: '#FDECEC' },
};
const APPLICATION_STATUS_ORDER = ['applied', 'offered', 'accepted', 'hired', 'rejected'];

const SORT_OPTIONS = [
    { key: 'newest', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
    { key: 'applicants', label: 'Most applicants' },
    { key: 'title', label: 'Title (A–Z)' },
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
}

function emptyStatusCounts() {
    return { applied: 0, offered: 0, accepted: 0, hired: 0, rejected: 0 };
}

/* ------------------------------------------------------------------ */
/* Status badge — job status (open / closed)                           */
/* ------------------------------------------------------------------ */
function JobStatusBadge({ status }) {
    const isOpen = status === 'open';
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em]"
            style={{
                background: isOpen ? '#ECF9F0' : '#FDECEC',
                color: isOpen ? '#2E7D32' : RED,
            }}
        >
            <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: isOpen ? '#2E7D32' : RED }}
            />
            {isOpen ? 'Open' : 'Closed'}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/* Applicant pipeline — compact stacked bar                            */
/* ------------------------------------------------------------------ */
function PipelineBar({ counts, total, size = 'sm' }) {
    if (!total) {
        return (
            <div
                className="h-1.5 w-full rounded-full"
                style={{ background: '#F1EDEA' }}
                aria-hidden="true"
            />
        );
    }
    return (
        <div
            className={`flex w-full overflow-hidden rounded-full ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
            role="img"
            aria-label={`Pipeline: ${APPLICATION_STATUS_ORDER.map((k) => `${counts[k]} ${k}`).join(', ')}`}
        >
            {APPLICATION_STATUS_ORDER.map((key) => {
                const count = counts[key] || 0;
                if (!count) return null;
                return (
                    <span
                        key={key}
                        style={{ width: `${(count / total) * 100}%`, background: APPLICATION_STATUS_META[key].color }}
                        title={`${APPLICATION_STATUS_META[key].label}: ${count}`}
                    />
                );
            })}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Stat card (top summary row)                                         */
/* ------------------------------------------------------------------ */
function StatItem({ icon: Icon, label, value, accent, loading }) {
    return (
        <div className="flex items-center gap-2.5 px-4 py-3 sm:px-5">
            <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${accent}1A`, color: accent }}
            >
                <Icon size={15} />
            </span>
            <div className="min-w-0 leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#80576A]">{label}</p>
                {loading ? (
                    <div className="mt-1 h-4 w-8 animate-pulse rounded bg-[#F1EDEA]" />
                ) : (
                    <p className="text-[16px] font-bold leading-tight text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                        {value}
                    </p>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Custom animated dropdown (used for the sort control)                */
/* ------------------------------------------------------------------ */
function SortMenu({ value, onChange }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const activeLabel = SORT_OPTIONS.find((o) => o.key === value)?.label;

    useEffect(() => {
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex h-10 items-center gap-2 rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:border-[#C75560]"
            >
                <ArrowUpDown size={14} className="text-[#A77D8D]" />
                {activeLabel}
                <ChevronDown size={14} className={`text-[#A77D8D] transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.ul
                        role="listbox"
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.14 }}
                        className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-[14px] border border-[#EBC2AE] bg-white p-1.5 shadow-[0_18px_36px_-24px_rgba(29,24,26,0.45)]"
                    >
                        {SORT_OPTIONS.map((opt) => (
                            <li key={opt.key}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={opt.key === value}
                                    onClick={() => {
                                        onChange(opt.key);
                                        setOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-[#FFF0E8]"
                                >
                                    {opt.label}
                                    {opt.key === value && <Check size={14} className="text-[#C75560]" />}
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Job card (grid view)                                                */
/* ------------------------------------------------------------------ */
function IconActionButton({ icon: Icon, label, tone = 'neutral', onClick }) {
    const toneStyles = {
        neutral:
            'border-[#EBC2AE] bg-[#FFF9F5] text-[#54263F] hover:border-[#C75560] hover:bg-white hover:text-[#C75560]',
        danger:
            'border-[#F0C9C4] bg-[#FFF9F5] text-[#B3261E] hover:border-[#B3261E] hover:bg-[#FFF0EE]',
    };
    return (
        <div className="group/tip relative">
            <button
                type="button"
                aria-label={label}
                onClick={onClick}
                className={`flex h-9 w-9 items-center justify-center rounded-[10px] border transition-colors ${toneStyles[tone]}`}
            >
                <Icon size={15} />
            </button>
            <span
                role="tooltip"
                className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-[8px] bg-[#1D181A] px-2 py-1 text-[10.5px] font-semibold text-white opacity-0 shadow-[0_10px_20px_-10px_rgba(29,24,26,0.6)] transition-opacity duration-150 group-hover/tip:opacity-100"
            >
                {label}
            </span>
        </div>
    );
}

function JobCard({ job, onOpenDetail, onRequestClose, onRequestEdit, onRequestDelete }) {
    const skills = Array.isArray(job.skillsRequired) ? job.skillsRequired.filter(Boolean) : [];
    const visibleSkills = skills.slice(0, 4);
    const overflowCount = skills.length - visibleSkills.length;
    const total = job.applicantStats?.total ?? null;
    const counts = job.applicantStats?.counts ?? emptyStatusCounts();

    return (
        <article className="portal-card group flex h-full flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgba(29,24,26,0.5)]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <button
                    type="button"
                    onClick={() => onOpenDetail(job)}
                    className="min-h-[42px] min-w-0 text-left text-[16px] font-bold leading-snug text-[#1D181A] transition-colors hover:text-[#C75560]"
                    style={{ fontFamily: FONT_DISPLAY }}
                >
                    <span className="line-clamp-2">{job.title}</span>
                </button>
                <JobStatusBadge status={job.status} />
            </div>

            {/* Meta row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-[#80576A]">
                {job.location && (
                    <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-[#C75560]" /> {job.location}
                    </span>
                )}
                {job.salary && (
                    <span className="flex items-center gap-1">
                        <IndianRupee size={12} className="text-[#C75560]" /> {job.salary}
                    </span>
                )}
                {job.experienceLevel && (
                    <span className="flex items-center gap-1">
                        <Briefcase size={12} className="text-[#C75560]" /> {job.experienceLevel}
                    </span>
                )}
            </div>

            {/* Skills */}
            {visibleSkills.length > 0 && (
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {visibleSkills.map((skill) => (
                        <span
                            key={skill}
                            className="rounded-full bg-[#FFF0E8] px-2.5 py-1 text-[10.5px] font-semibold text-[#8D6072]"
                        >
                            {skill}
                        </span>
                    ))}
                    {overflowCount > 0 && (
                        <span className="rounded-full bg-[#F1EDEA] px-2.5 py-1 text-[10.5px] font-semibold text-[#77706A]">
                            +{overflowCount} more
                        </span>
                    )}
                </div>
            )}

            {/* Applicant pipeline */}
            <div className="mt-4 border-t border-[#F0D1BF] pt-4">
                <div className="flex items-center justify-between text-[11.5px] font-semibold text-[#54263F]">
                    <span className="flex items-center gap-1.5">
                        <Users size={13} className="text-[#C75560]" />
                        {total === null ? (
                            <span className="inline-block h-3 w-16 animate-pulse rounded bg-[#F1EDEA]" />
                        ) : total === 0 ? (
                            'No applicants yet'
                        ) : (
                            `${total} applicant${total === 1 ? '' : 's'}`
                        )}
                    </span>
                    {total > 0 && counts.hired > 0 && (
                        <span className="flex items-center gap-1" style={{ color: GREEN }}>
                            <CheckCircle2 size={13} /> {counts.hired} hired
                        </span>
                    )}
                </div>
                {total > 0 && (
                    <div className="mt-2">
                        <PipelineBar counts={counts} total={total} />
                    </div>
                )}
            </div>

            {/* Footer / actions */}
            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <span className="flex items-center gap-1.5 text-[11px] text-[#9C7A8A]">
                    <Clock size={12} /> {timeAgo(job.createdAt)}
                </span>
                <div className="flex items-center gap-1.5">
                    <IconActionButton icon={Pencil} label="Edit" tone="neutral" onClick={() => onRequestEdit(job)} />
                    <IconActionButton icon={Trash2} label="Delete" tone="danger" onClick={() => onRequestDelete(job)} />
                    {/* <Link
                        to={`/recruiter/applicants?job=${job._id}`}
                        className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[11.5px] font-semibold text-[#54263F] transition-colors hover:border-[#C75560] hover:bg-white"
                    >
                        <Users size={13} /> Applicants
                    </Link> */}
                    {job.status === 'open' ? (
                        <button
                            type="button"
                            onClick={() => onRequestClose(job)}
                            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#1D181A] bg-[#1D181A] px-3.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#3A3034]"
                        >
                            <LockKeyhole size={14} /> Close
                        </button>
                    ) : job.adminClosed ? (
                        <button
                            type="button"
                            onClick={() => onRequestClose(job)}
                            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#2E7D32] bg-[#ECF9F0] px-3.5 text-[11.5px] font-semibold text-[#2E7D32] transition-colors hover:bg-[#DFF5E6]"
                        >
                            <LockOpen size={14} /> Request reopen
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onRequestClose(job)}
                            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#2E7D32] bg-[#ECF9F0] px-3.5 text-[11.5px] font-semibold text-[#2E7D32] transition-colors hover:bg-[#DFF5E6]"
                        >
                            <LockOpen size={14} /> Open
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
}

/* ------------------------------------------------------------------ */
/* Job row (list view)                                                 */
/* ------------------------------------------------------------------ */
function JobRow({ job, onOpenDetail, onRequestClose, onRequestEdit, onRequestDelete }) {
    const total = job.applicantStats?.total ?? null;
    return (
        <div className="portal-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-4">
            <button
                type="button"
                onClick={() => onOpenDetail(job)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0E8] text-[#C75560]">
                    <Briefcase size={16} />
                </span>
                <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                        {job.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px] text-[#80576A]">
                        {job.location && (
                            <span className="flex items-center gap-1">
                                <MapPin size={11} /> {job.location}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock size={11} /> {timeAgo(job.createdAt)}
                        </span>
                    </span>
                </span>
            </button>

            <div className="flex shrink-0 items-center gap-2.5 text-[11.5px] font-semibold text-[#54263F] sm:w-36">
                <Users size={13} className="text-[#C75560]" />
                {total === null ? (
                    <span className="inline-block h-3 w-10 animate-pulse rounded bg-[#F1EDEA]" />
                ) : (
                    `${total} applicant${total === 1 ? '' : 's'}`
                )}
            </div>

            <div className="w-full shrink-0 sm:w-32">
                <PipelineBar counts={job.applicantStats?.counts ?? emptyStatusCounts()} total={total || 0} />
            </div>

            <JobStatusBadge status={job.status} />

            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <IconActionButton icon={Pencil} label="Edit" tone="neutral" onClick={() => onRequestEdit(job)} />
                <IconActionButton icon={Trash2} label="Delete" tone="danger" onClick={() => onRequestDelete(job)} />
                <Link
                    to={`/recruiter/applicants?job=${job._id}`}
                    className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-1.5 text-[11.5px] font-semibold text-[#54263F] transition-colors hover:border-[#C75560] hover:bg-white"
                >
                    Applicants
                </Link>
                {job.status === 'open' ? (
                    <button
                        type="button"
                        onClick={() => onRequestClose(job)}
                        className="flex items-center gap-1.5 rounded-[10px] border border-[#1D181A] bg-[#1D181A] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#3A3034]"
                    >
                        <LockKeyhole size={13} /> Close
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => onRequestClose(job)}
                        className="flex items-center gap-1.5 rounded-[10px] border border-[#2E7D32] bg-[#ECF9F0] px-3 py-1.5 text-[11.5px] font-semibold text-[#2E7D32] transition-colors hover:bg-[#DFF5E6]"
                    >
                        <LockOpen size={13} /> Open
                    </button>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Skeleton loader                                                     */
/* ------------------------------------------------------------------ */
function SkeletonCard() {
    return (
        <div className="portal-card p-5">
            <div className="h-4 w-2/3 animate-pulse rounded bg-[#F1EDEA]" />
            <div className="mt-3 h-3 w-1/2 animate-pulse rounded bg-[#F1EDEA]" />
            <div className="mt-4 flex gap-1.5">
                <div className="h-5 w-14 animate-pulse rounded-full bg-[#F1EDEA]" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-[#F1EDEA]" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-[#F1EDEA]" />
            </div>
            <div className="mt-5 h-1.5 w-full animate-pulse rounded-full bg-[#F1EDEA]" />
            <div className="mt-4 h-8 w-full animate-pulse rounded-[10px] bg-[#F1EDEA]" />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Empty states                                                        */
/* ------------------------------------------------------------------ */
function NoJobsYet() {
    return (
        <div className="portal-card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0E8] text-[#C75560]">
                <Briefcase size={24} />
            </span>
            <h2 className="mt-5 text-[17px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                You haven't posted a job yet
            </h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#80576A]">
                Publish your first opening and qualified candidates will start showing up here, along with how they
                move through your pipeline.
            </p>
            <Link to="/recruiter/post-job" className="portal-primary-action mt-6 px-4 py-2.5 text-[12.5px]">
                <Plus size={15} className="text-[#F7C56B]" /> Post your first job
            </Link>
        </div>
    );
}

function NoResultsMatch({ onClear }) {
    return (
        <div className="portal-card flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EDEA] text-[#77706A]">
                <Search size={22} />
            </span>
            <h2 className="mt-5 text-[16px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                No jobs match these filters
            </h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#80576A]">
                Try a different search term, or clear your filters to see everything you've posted.
            </p>
            <button
                type="button"
                onClick={onClear}
                className="portal-secondary-action mt-6 px-4 py-2.5 text-[12.5px]"
            >
                Clear filters
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Close-job confirmation modal                                        */
/* ------------------------------------------------------------------ */
function EditJobModal({ job, submitting, error, onSubmit, onCancel }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        location: '',
        salary: '',
        experienceLevel: '',
        skillsRequired: '',
    });

    useEffect(() => {
        if (job) {
            setForm({
                title: job.title || '',
                description: job.description || '',
                location: job.location || '',
                salary: job.salary || '',
                experienceLevel: job.experienceLevel || '',
                skillsRequired: Array.isArray(job.skillsRequired) ? job.skillsRequired.join(', ') : '',
            });
        }
    }, [job]);

    if (!job) return null;

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit({
            title: form.title.trim(),
            description: form.description.trim(),
            location: form.location.trim(),
            salary: form.salary.trim(),
            experienceLevel: form.experienceLevel.trim(),
            skillsRequired: form.skillsRequired
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
        });
    }

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
                        aria-labelledby="edit-job-title"
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-[560px] rounded-[18px] border border-[#EBC2AE] bg-white p-6 shadow-[0_30px_70px_-24px_rgba(29,24,26,0.4)]"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">Edit job</p>
                                <h2 id="edit-job-title" className="mt-1 text-[17px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                                    Update your job opening
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={onCancel}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-[#80576A] transition-colors hover:bg-[#FFF0E8] hover:text-[#1D181A]"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                            <div>
                                <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">Job title</label>
                                <input name="title" value={form.title} onChange={handleChange} required className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]" />
                            </div>
                            <div>
                                <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">Description</label>
                                <textarea name="description" value={form.description} onChange={handleChange} rows={4} required className="w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-2.5 text-[13px] outline-none focus:border-[#C75560]" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">Location</label>
                                    <input name="location" value={form.location} onChange={handleChange} className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">Salary</label>
                                    <input name="salary" value={form.salary} onChange={handleChange} className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]" />
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">Experience level</label>
                                    <input name="experienceLevel" value={form.experienceLevel} onChange={handleChange} className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]" />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-[#54263F]">Skills (comma separated)</label>
                                    <input name="skillsRequired" value={form.skillsRequired} onChange={handleChange} className="h-10 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 text-[13px] outline-none focus:border-[#C75560]" />
                                </div>
                            </div>

                            {error && (
                                <p className="rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">
                                    {error}
                                </p>
                            )}

                            <div className="mt-6 flex items-center justify-end gap-2.5">
                                <button type="button" onClick={onCancel} disabled={submitting} className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:opacity-60">
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting} className="flex items-center gap-2 rounded-[10px] bg-[#C75560] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#A94658] disabled:opacity-70">
                                    {submitting && <Loader2 size={14} className="animate-spin" />}
                                    {submitting ? 'Saving…' : 'Save changes'}
                                </button>
                            </div>
                        </form>
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
                        <h2 id="delete-job-title" className="mt-4 text-[17px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                            Delete this job post?
                        </h2>
                        <p className="mt-2 text-[13px] leading-6 text-[#80576A]">
                            <span className="font-semibold text-[#1D181A]">{job.title}</span> will be permanently removed from your posted jobs and candidates will no longer see it.
                        </p>

                        {error && (
                            <p className="mt-3 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">
                                {error}
                            </p>
                        )}

                        <div className="mt-6 flex items-center justify-end gap-2.5">
                            <button type="button" onClick={onCancel} disabled={submitting} className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:opacity-60">
                                Cancel
                            </button>
                            <button type="button" onClick={onConfirm} disabled={submitting} className="flex items-center gap-2 rounded-[10px] bg-[#B3261E] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#96201A] disabled:opacity-70">
                                {submitting && <Loader2 size={14} className="animate-spin" />}
                                {submitting ? 'Deleting…' : 'Delete job'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function CloseJobModal({ job, submitting, error, onConfirm, onCancel, mode = 'close', requestMessage, onRequestMessageChange }) {
    const isReopen = mode === 'reopen';
    const isRequestReopen = mode === 'request-reopen';
    const title = isRequestReopen ? 'Request job reopen' : isReopen ? 'Re-open this job post?' : 'Close this job post?';
    const description = isRequestReopen
        ? 'This job was closed by an admin and cannot be reopened directly. Submit a request explaining why it should be reopened.'
        : isReopen
        ? 'This job will become visible to candidates again and new applicants will be able to apply.'
        : 'This job will be removed from candidate search immediately. Candidates who already applied keep their application, but new candidates won\'t be able to find or apply to this role.';
    const cancelLabel = isRequestReopen ? 'Keep it closed' : isReopen ? 'Keep it closed' : 'Keep it open';
    const confirmLabel = isRequestReopen ? 'Submit request' : isReopen ? 'Re-open job' : 'Close job';
    const confirmTone = isRequestReopen ? 'bg-[#2E7D32] hover:bg-[#246A28]' : isReopen ? 'bg-[#2E7D32] hover:bg-[#246A28]' : 'bg-[#B3261E] hover:bg-[#96201A]';

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
                        aria-labelledby="close-job-title"
                        initial={{ opacity: 0, y: 16, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-[420px] rounded-[18px] border border-[#EBC2AE] bg-white p-6 shadow-[0_30px_70px_-24px_rgba(29,24,26,0.4)]"
                    >
                        <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${isReopen ? 'bg-[#ECF9F0] text-[#2E7D32]' : 'bg-[#FFF0EE] text-[#B3261E]'}`}>
                            <AlertTriangle size={20} />
                        </span>
                        <h2 id="close-job-title" className="mt-4 text-[17px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                            {title}
                        </h2>
                        <p className="mt-2 text-[13px] leading-6 text-[#80576A]">
                            <span className="font-semibold text-[#1D181A]">{job.title}</span> {description}
                        </p>

                        {isRequestReopen && (
                            <div className="mt-4">
                                <label htmlFor="reopen-message" className="block text-[12px] font-semibold text-[#54263F]">
                                    Reopen request reason
                                </label>
                                <textarea
                                    id="reopen-message"
                                    value={requestMessage}
                                    onChange={(e) => onRequestMessageChange(e.target.value)}
                                    rows={4}
                                    className="mt-2 w-full rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-2 text-[12.5px] text-[#1D181A] outline-none transition-colors focus:border-[#C75560] focus:bg-white"
                                    placeholder="Explain why this job should be reopened..."
                                />
                            </div>
                        )}

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
                                {submitting ? (isReopen ? 'Re-opening…' : 'Closing…') : confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/* Job detail drawer                                                   */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Job description rendering — mirrors JobDetail.jsx's approach:        */
/* prefer job.descriptionSections (real HTML from PostJob.jsx's rich    */
/* text editor), fall back to a heuristic parse of the old flat         */
/* `description` string for jobs posted before that field existed.      */
/* ------------------------------------------------------------------ */
const DRAWER_BULLET_PATTERN = /^[-•*]\s+/;
const DRAWER_KNOWN_HEADERS = [
    'about the company', 'about company', 'company overview', 'about us',
    'job description', 'job summary', 'about the role', 'role overview', 'overview',
    'roles and responsibilities', 'roles & responsibilities', 'responsibilities', 'key responsibilities',
    'required qualifications', 'requirements', 'qualifications', 'minimum qualifications',
    'preferred qualifications', 'good to have', 'nice to have', 'bonus points',
    'benefits', 'benefits & perks', 'perks', 'what we offer',
    'working hours', 'growth opportunities', 'education',
];

// Converts one section's rich-text HTML (from the recruiter's post-job editor)
// into {type:'para'|'list', ...} blocks so <ul><li> renders as real bullets.
function htmlSectionToBlocks(html) {
    if (!html || !html.trim()) return [];
    const container = document.createElement('div');
    container.innerHTML = html;

    const blocks = [];
    let paraBuffer = [];
    const flushPara = () => {
        const text = paraBuffer.join(' ').replace(/\s+/g, ' ').trim();
        if (text) blocks.push({ type: 'para', text });
        paraBuffer = [];
    };

    Array.from(container.childNodes).forEach((node) => {
        const tag = node.nodeType === Node.ELEMENT_NODE ? node.tagName : null;
        if (tag === 'UL' || tag === 'OL') {
            flushPara();
            const items = Array.from(node.querySelectorAll(':scope > li'))
                .map((li) => li.textContent.replace(/\s+/g, ' ').trim())
                .filter(Boolean);
            if (items.length) blocks.push({ type: 'list', items });
            return;
        }
        if (tag === 'BR') { flushPara(); return; }
        const text = node.textContent || '';
        if (text.trim()) paraBuffer.push(text.trim());
        if (tag === 'DIV' || tag === 'P') flushPara();
    });
    flushPara();
    return blocks;
}

// Best-effort fallback for older jobs that only have the flat `description`
// string (heading lines + "- bullet" lines mixed into plain text).
function parseFlatDescription(text) {
    if (!text || !text.trim()) return [];
    const rawLines = text.split('\n').map((line) => line.trim());
    const sections = [];
    let current = { heading: null, blocks: [] };
    let bulletBuffer = [];

    const flushBullets = () => {
        if (bulletBuffer.length) {
            current.blocks.push({ type: 'list', items: bulletBuffer });
            bulletBuffer = [];
        }
    };
    const looksLikeHeader = (line) => {
        const normalized = line.toLowerCase().replace(/[:：]+$/, '');
        if (DRAWER_KNOWN_HEADERS.includes(normalized)) return true;
        return (
            line.length > 0 && line.length < 48 &&
            !DRAWER_BULLET_PATTERN.test(line) && !/[.,;]$/.test(line) &&
            /^[A-Z]/.test(line) && line === line.replace(/\s+/g, ' ')
        );
    };

    rawLines.forEach((line) => {
        if (!line) return;
        if (looksLikeHeader(line)) {
            flushBullets();
            if (current.heading || current.blocks.length) sections.push(current);
            current = { heading: line.replace(/[:：]+$/, ''), blocks: [] };
            return;
        }
        if (DRAWER_BULLET_PATTERN.test(line)) {
            bulletBuffer.push(line.replace(DRAWER_BULLET_PATTERN, ''));
            return;
        }
        flushBullets();
        current.blocks.push({ type: 'para', text: line });
    });
    flushBullets();
    if (current.heading || current.blocks.length) sections.push(current);
    return sections;
}

function buildDescriptionSections(job) {
    if (!job) return [];
    if (job.descriptionSections && Object.keys(job.descriptionSections).length > 0) {
        return Object.entries(job.descriptionSections)
            .map(([heading, html]) => ({ heading, blocks: htmlSectionToBlocks(html) }))
            .filter((section) => section.blocks.length > 0);
    }
    return parseFlatDescription(job.description);
}

// Renders the parsed sections with a heading per block and real <ul> bullets,
// matching the drawer's existing text styling.
function DrawerDescription({ job }) {
    const sections = useMemo(() => buildDescriptionSections(job), [job]);

    if (sections.length === 0) {
        return (
            <p className="mt-2.5 text-[13px] italic leading-6 text-stone-400">
                No description was provided for this role.
            </p>
        );
    }

    return (
        <div className="mt-2.5 space-y-4">
            {sections.map((section, i) => (
                <div key={i}>
                    {section.heading && (
                        <p className="text-[12px] font-bold text-[#1D181A]">{section.heading}</p>
                    )}
                    {section.blocks.map((block, j) =>
                        block.type === 'list' ? (
                            <ul key={j} className="mt-1.5 space-y-1.5">
                                {block.items.map((item, k) => (
                                    <li key={k} className="flex items-start gap-2 text-[13px] leading-6 text-[#3A3034]">
                                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#C75560]" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p key={j} className="mt-1.5 text-[13px] leading-6 text-[#3A3034]">
                                {block.text}
                            </p>
                        )
                    )}
                </div>
            ))}
        </div>
    );
}

function JobDetailDrawer({ job, onClose, onRequestClose }) {
    const counts = job?.applicantStats?.counts ?? emptyStatusCounts();
    const total = job?.applicantStats?.total ?? 0;
    const skills = Array.isArray(job?.skillsRequired) ? job.skillsRequired.filter(Boolean) : [];

    return (
        <AnimatePresence>
            {job && (
                <>
                    <motion.div
                        className="fixed inset-0 z-[90] bg-[#1D181A]/35 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.aside
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="job-detail-title"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed right-0 top-0 z-[95] flex h-full w-full max-w-[440px] flex-col overflow-y-auto border-l border-[#EBC2AE] bg-[#FFFDFC] shadow-[0_0_60px_rgba(29,24,26,0.25)]"
                    >
                        <div className="flex items-start justify-between gap-3 border-b border-[#F0D1BF] p-6">
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">Job details</p>
                                <h2 id="job-detail-title" className="mt-1 text-[19px] font-bold leading-tight text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                                    {job.title}
                                </h2>
                                <div className="mt-2"><JobStatusBadge status={job.status} /></div>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close details"
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#80576A] transition-colors hover:bg-[#FFF0E8] hover:text-[#1D181A]"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 p-6">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-[#80576A]">
                                {job.location && (
                                    <span className="flex items-center gap-1.5"><MapPin size={13} /> {job.location}</span>
                                )}
                                {job.salary && (
                                    <span className="flex items-center gap-1.5"><IndianRupee size={13} /> {job.salary}</span>
                                )}
                                {job.experienceLevel && <span>{job.experienceLevel}</span>}
                                <span className="flex items-center gap-1.5"><Clock size={13} /> Posted {timeAgo(job.createdAt)}</span>
                            </div>

                            {skills.length > 0 && (
                                <div className="mt-5">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">Skills required</p>
                                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                                        {skills.map((skill) => (
                                            <span key={skill} className="rounded-full bg-[#FFF0E8] px-2.5 py-1 text-[11px] font-semibold text-[#8D6072]">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-5">
                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">Description</p>
                                <DrawerDescription job={job} />
                            </div>

                            <div className="mt-6 rounded-[16px] border border-[#F0D1BF] bg-white p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-[12.5px] font-bold text-[#1D181A]">Applicant pipeline</p>
                                    <span className="flex items-center gap-1 text-[12px] font-semibold text-[#54263F]">
                                        <Users size={13} className="text-[#C75560]" /> {total}
                                    </span>
                                </div>
                                {total === 0 ? (
                                    <p className="mt-2 text-[12px] text-[#80576A]">No one has applied yet.</p>
                                ) : (
                                    <>
                                        <div className="mt-3"><PipelineBar counts={counts} total={total} size="lg" /></div>
                                        <ul className="mt-3.5 grid grid-cols-2 gap-2.5">
                                            {APPLICATION_STATUS_ORDER.map((key) => (
                                                <li key={key} className="flex items-center justify-between rounded-[10px] px-2.5 py-2" style={{ background: APPLICATION_STATUS_META[key].bg }}>
                                                    <span className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: APPLICATION_STATUS_META[key].color }}>
                                                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: APPLICATION_STATUS_META[key].color }} />
                                                        {APPLICATION_STATUS_META[key].label}
                                                    </span>
                                                    <span className="text-[12px] font-bold text-[#1D181A]">{counts[key] || 0}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 border-t border-[#F0D1BF] p-6">
                            <Link
                                to={`/recruiter/applicants?job=${job._id}`}
                                className="portal-primary-action flex-1 px-4 py-2.5 text-[12.5px]"
                            >
                                Review applicants
                            </Link>
                            {job.status === 'open' ? (
                                <button
                                    type="button"
                                    onClick={() => onRequestClose(job)}
                                    className="rounded-[10px] border border-[#B3261E] px-4 py-2.5 text-[12.5px] font-semibold text-[#B3261E] transition-colors hover:bg-[#FFF0EE]"
                                >
                                    Close job
                                </button>
                            ) : job.adminClosed ? (
                                <button
                                    type="button"
                                    onClick={() => onRequestClose(job)}
                                    className="rounded-[10px] border border-[#2E7D32] bg-[#ECF9F0] px-4 py-2.5 text-[12.5px] font-semibold text-[#2E7D32] transition-colors hover:bg-[#DFF5E6]"
                                >
                                    Request reopen
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onRequestClose(job)}
                                    className="rounded-[10px] border border-[#2E7D32] bg-[#ECF9F0] px-4 py-2.5 text-[12.5px] font-semibold text-[#2E7D32] transition-colors hover:bg-[#DFF5E6]"
                                >
                                    Re-open job
                                </button>
                            )}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
export default function RecruiterJobs() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'closed'
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('recruiterJobsView') || 'grid');

    const [detailJob, setDetailJob] = useState(null);
    const [closeTarget, setCloseTarget] = useState(null);
    const [closeMode, setCloseMode] = useState('close');
    const [closing, setClosing] = useState(false);
    const [closeError, setCloseError] = useState('');
    const [reopenMessage, setReopenMessage] = useState('');
    const [editTarget, setEditTarget] = useState(null);
    const [editing, setEditing] = useState(false);
    const [editError, setEditError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [toast, setToast] = useState('');

    useEffect(() => {
        localStorage.setItem('recruiterJobsView', viewMode);
    }, [viewMode]);

    useEffect(() => {
        loadJobs();
    }, []);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = setTimeout(() => setToast(''), 2600);
        return () => clearTimeout(timer);
    }, [toast]);

    async function loadJobs() {
        setLoading(true);
        setError('');
        try {
            const { data } = await axiosInstance.get('/jobs/mine/list');
            const rawJobs = (data || []).map((job) => ({ ...job, applicantStats: null }));
            setJobs(rawJobs);
            hydrateApplicantStats(rawJobs);
        } catch (err) {
            setError(err.response?.data?.error || 'Could not load your job posts. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    // Fetch each job's applicants in parallel and merge counts in once they land.
    // A single failed lookup degrades gracefully to "—" rather than blocking the page.
    async function hydrateApplicantStats(rawJobs) {
        const results = await Promise.allSettled(
            rawJobs.map((job) => axiosInstance.get(`/applications/job/${job._id}`))
        );

        setJobs((current) =>
            current.map((job) => {
                const index = rawJobs.findIndex((j) => j._id === job._id);
                const result = results[index];
                if (!result || result.status !== 'fulfilled') {
                    return { ...job, applicantStats: { total: 0, counts: emptyStatusCounts(), failed: true } };
                }
                const applications = result.value.data || [];
                const counts = emptyStatusCounts();
                applications.forEach((app) => {
                    if (counts[app.status] !== undefined) counts[app.status] += 1;
                });
                return { ...job, applicantStats: { total: applications.length, counts, failed: false } };
            })
        );
    }

    async function handleConfirmClose() {
        if (!closeTarget) return;
        const isRequestReopen = closeMode === 'request-reopen';
        const nextStatus = closeTarget.status === 'open' ? 'closed' : 'open';
        setClosing(true);
        setCloseError('');
        try {
            if (isRequestReopen) {
                if (!reopenMessage.trim()) {
                    setCloseError('Please provide a reason for reopening this job.');
                    return;
                }
                await axiosInstance.post(`/jobs/${closeTarget._id}/reopen-request`, {
                    message: reopenMessage.trim(),
                });
                setToast(`Reopen request submitted for "${closeTarget.title}".`);
                setCloseTarget(null);
                setCloseMode('close');
                setReopenMessage('');
                return;
            }

            await axiosInstance.patch(`/jobs/${closeTarget._id}/close`, { status: nextStatus });
            setJobs((current) => current.map((job) => (job._id === closeTarget._id ? { ...job, status: nextStatus } : job)));
            setDetailJob((current) => (current && current._id === closeTarget._id ? { ...current, status: nextStatus } : current));
            setToast(nextStatus === 'open' ? `"${closeTarget.title}" is open again` : `"${closeTarget.title}" is now closed`);
            setCloseTarget(null);
            setCloseMode('close');
        } catch (err) {
            if (isRequestReopen) {
                setCloseError(err.response?.data?.error || 'Unable to submit reopen request. Please try again.');
            } else {
                setCloseError(err.response?.data?.error || (nextStatus === 'open' ? 'Could not reopen this job. Please try again.' : 'Could not close this job. Please try again.'));
            }
        } finally {
            setClosing(false);
        }
    }

    async function handleConfirmEdit(payload) {
        if (!editTarget) return;
        setEditing(true);
        setEditError('');
        try {
            const { data } = await axiosInstance.patch(`/jobs/${editTarget._id}`, payload);
            setJobs((current) => current.map((job) => (job._id === editTarget._id ? { ...job, ...data } : job)));
            setDetailJob((current) => (current && current._id === editTarget._id ? { ...current, ...data } : current));
            setToast(`"${data.title}" was updated`);
            setEditTarget(null);
        } catch (err) {
            setEditError(err.response?.data?.error || 'Could not update this job. Please try again.');
        } finally {
            setEditing(false);
        }
    }

    async function handleConfirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteError('');
        try {
            await axiosInstance.delete(`/jobs/${deleteTarget._id}`);
            setJobs((current) => current.filter((job) => job._id !== deleteTarget._id));
            setDetailJob((current) => (current && current._id === deleteTarget._id ? null : current));
            setToast(`"${deleteTarget.title}" was deleted`);
            setDeleteTarget(null);
        } catch (err) {
            setDeleteError(err.response?.data?.error || 'Could not delete this job. Please try again.');
        } finally {
            setDeleting(false);
        }
    }

    const stats = useMemo(() => {
        const total = jobs.length;
        const open = jobs.filter((j) => j.status === 'open').length;
        const closed = total - open;
        const statsLoaded = jobs.length > 0 && jobs.every((j) => j.applicantStats !== null);
        const totalApplicants = statsLoaded
            ? jobs.reduce((sum, j) => sum + (j.applicantStats?.total || 0), 0)
            : null;
        return { total, open, closed, totalApplicants, statsLoaded };
    }, [jobs]);

    const visibleJobs = useMemo(() => {
        let list = [...jobs];

        if (statusFilter !== 'all') {
            list = list.filter((j) => j.status === statusFilter);
        }

        const term = search.trim().toLowerCase();
        if (term) {
            list = list.filter(
                (j) =>
                    j.title?.toLowerCase().includes(term) ||
                    j.location?.toLowerCase().includes(term) ||
                    (Array.isArray(j.skillsRequired) && j.skillsRequired.some((s) => s?.toLowerCase().includes(term)))
            );
        }

        switch (sortBy) {
            case 'oldest':
                list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'applicants':
                list.sort((a, b) => (b.applicantStats?.total || 0) - (a.applicantStats?.total || 0));
                break;
            case 'title':
                list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
                break;
            case 'newest':
            default:
                list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return list;
    }, [jobs, statusFilter, search, sortBy]);

    const hasAnyFilterApplied = statusFilter !== 'all' || search.trim().length > 0;

    // Pagination only applies to the list view — grid view stays as one
    // scrollable page since cards are wide and self-limiting per row.
    const PAGE_SIZE = 10;
    const [page, setPage] = useState(1);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, search, sortBy, viewMode]);

    const totalPages = Math.max(1, Math.ceil(visibleJobs.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);

    const pagedJobs = useMemo(() => {
        if (viewMode !== 'list') return visibleJobs;
        const start = (safePage - 1) * PAGE_SIZE;
        return visibleJobs.slice(start, start + PAGE_SIZE);
    }, [visibleJobs, viewMode, safePage]);

    function clearFilters() {
        setStatusFilter('all');
        setSearch('');
    }

    return (
        <div className="portal-theme min-h-screen" style={{ background: '#FFF7F2' }}>
            <RecruiterNavbar />

            <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
                {/* Header */}
                <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">Recruiter workspace</p>
                        <h1 className="mt-1 text-3xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                            Your job posts
                        </h1>
                        <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-[#80576A]">
                            Track every opening you've published and see how candidates are moving through each one.
                        </p>
                    </div>
                    <Link to="/recruiter/post-job" className="portal-primary-action w-fit px-4 py-2.5">
                        <Plus size={16} className="text-[#F7C56B]" /> Post a new job
                    </Link>
                </div>

                {/* Stat strip — one unified bar instead of 4 separate boxes */}
                <div className="portal-card mb-5 grid grid-cols-2 divide-x divide-y divide-[#F0D1BF] overflow-hidden sm:grid-cols-4 sm:divide-y-0">
                    <StatItem icon={Briefcase} label="Total posts" value={stats.total} accent={CORAL} loading={loading} />
                    <StatItem icon={Sparkles} label="Open" value={stats.open} accent={AMBER_DARK} loading={loading} />
                    <StatItem icon={Lock} label="Closed" value={stats.closed} accent="#77706A" loading={loading} />
                    <StatItem
                        icon={Users}
                        label="Total applicants"
                        value={stats.totalApplicants ?? '—'}
                        accent={GREEN}
                        loading={loading || !stats.statsLoaded}
                    />
                </div>

                {/* Toolbar */}
                {!loading && jobs.length > 0 && (
                    <div className="portal-card mb-5 flex flex-col gap-2.5 p-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A77D8D]" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by title, location, or skill…"
                                    className="h-9 w-full rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] pl-8 pr-3 text-[12px] text-[#1D181A] placeholder:text-[#A77D8D] outline-none transition-all focus:border-[#C75560] focus:bg-white focus:shadow-[0_0_0_3px_rgba(199,85,96,0.14)]"
                                />
                            </div>

                            <div className="flex items-center gap-1 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] p-0.5">
                                {[
                                    { key: 'all', label: `All (${stats.total})` },
                                    { key: 'open', label: `Open (${stats.open})` },
                                    { key: 'closed', label: `Closed (${stats.closed})` },
                                ].map((opt) => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setStatusFilter(opt.key)}
                                        className={`whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                            statusFilter === opt.key
                                                ? 'bg-[#1D181A] text-white'
                                                : 'text-[#80576A] hover:bg-[#FFE1D2] hover:text-[#54263F]'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <SortMenu value={sortBy} onChange={setSortBy} />
                            <div className="flex items-center gap-1 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] p-0.5">
                                <button
                                    type="button"
                                    aria-label="Grid view"
                                    aria-pressed={viewMode === 'grid'}
                                    onClick={() => setViewMode('grid')}
                                    className={`flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors ${
                                        viewMode === 'grid' ? 'bg-[#1D181A] text-white' : 'text-[#80576A] hover:bg-[#FFE1D2]'
                                    }`}
                                >
                                    <LayoutGrid size={13} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="List view"
                                    aria-pressed={viewMode === 'list'}
                                    onClick={() => setViewMode('list')}
                                    className={`flex h-7 w-7 items-center justify-center rounded-[7px] transition-colors ${
                                        viewMode === 'list' ? 'bg-[#1D181A] text-white' : 'text-[#80576A] hover:bg-[#FFE1D2]'
                                    }`}
                                >
                                    <List size={13} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                {error ? (
                    <div className="portal-card flex flex-col items-center px-6 py-16 text-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF0EE] text-[#B3261E]">
                            <XCircle size={22} />
                        </span>
                        <p className="mt-4 text-[13.5px] font-medium text-[#1D181A]">{error}</p>
                        <button type="button" onClick={loadJobs} className="portal-secondary-action mt-5 px-4 py-2.5 text-[12.5px]">
                            Try again
                        </button>
                    </div>
                ) : loading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : jobs.length === 0 ? (
                    <NoJobsYet />
                ) : visibleJobs.length === 0 ? (
                    <NoResultsMatch onClear={clearFilters} />
                ) : viewMode === 'grid' ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleJobs.map((job) => (
                            <JobCard
                                key={job._id}
                                job={job}
                                onOpenDetail={setDetailJob}
                                onRequestClose={(selectedJob) => {
                                    setCloseTarget(selectedJob);
                                    setCloseMode(
                                        selectedJob.status === 'open'
                                            ? 'close'
                                            : selectedJob.adminClosed
                                            ? 'request-reopen'
                                            : 'reopen'
                                    );
                                }}
                                onRequestEdit={setEditTarget}
                                onRequestDelete={setDeleteTarget}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {pagedJobs.map((job) => (
                            <JobRow
                                key={job._id}
                                job={job}
                                onOpenDetail={setDetailJob}
                                onRequestClose={(selectedJob) => {
                                    setCloseTarget(selectedJob);
                                    setCloseMode(
                                        selectedJob.status === 'open'
                                            ? 'close'
                                            : selectedJob.adminClosed
                                            ? 'request-reopen'
                                            : 'reopen'
                                    );
                                }}
                                onRequestEdit={setEditTarget}
                                onRequestDelete={setDeleteTarget}
                            />
                        ))}
                    </div>
                )}

                {viewMode === 'list' && !loading && !error && visibleJobs.length > PAGE_SIZE && (
                    <div className="mt-5 flex items-center justify-between gap-3">
                        <p className="text-[11.5px] text-[#9C7A8A]">
                            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, visibleJobs.length)} of {visibleJobs.length}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="flex h-8 items-center gap-1 rounded-[9px] border border-[#EBC2AE] bg-[#FFF9F5] px-2.5 text-[11.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={14} /> Prev
                            </button>

                            {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        type="button"
                                        onClick={() => setPage(pageNum)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-[9px] text-[11.5px] font-semibold transition-colors ${
                                            safePage === pageNum
                                                ? 'bg-[#1D181A] text-white'
                                                : 'border border-[#EBC2AE] bg-[#FFF9F5] text-[#54263F] hover:bg-white'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="flex h-8 items-center gap-1 rounded-[9px] border border-[#EBC2AE] bg-[#FFF9F5] px-2.5 text-[11.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}

                {!loading && !error && hasAnyFilterApplied && visibleJobs.length > 0 && (
                    <p className="mt-4 text-center text-[11.5px] text-[#9C7A8A]">
                        Showing {visibleJobs.length} of {jobs.length} job{jobs.length === 1 ? '' : 's'}
                    </p>
                )}
            </main>

            <JobDetailDrawer
                job={detailJob}
                onClose={() => setDetailJob(null)}
                onRequestClose={(job) => {
                    setCloseTarget(job);
                    setCloseMode(
                        job.status === 'open'
                            ? 'close'
                            : job.adminClosed
                            ? 'request-reopen'
                            : 'reopen'
                    );
                }}
                onRequestEdit={setEditTarget}
                onRequestDelete={setDeleteTarget}
            />

            <EditJobModal
                job={editTarget}
                submitting={editing}
                error={editError}
                onCancel={() => {
                    if (!editing) {
                        setEditTarget(null);
                        setEditError('');
                    }
                }}
                onSubmit={handleConfirmEdit}
            />

            <DeleteJobModal
                job={deleteTarget}
                submitting={deleting}
                error={deleteError}
                onCancel={() => {
                    if (!deleting) {
                        setDeleteTarget(null);
                        setDeleteError('');
                    }
                }}
                onConfirm={handleConfirmDelete}
            />

            <CloseJobModal
                job={closeTarget}
                submitting={closing}
                error={closeError}
                mode={closeMode}
                requestMessage={reopenMessage}
                onRequestMessageChange={setReopenMessage}
                onCancel={() => {
                    if (!closing) {
                        setCloseTarget(null);
                        setCloseError('');
                        setCloseMode('close');
                        setReopenMessage('');
                    }
                }}
                onConfirm={handleConfirmClose}
            />

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="fixed bottom-6 left-1/2 z-[110] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#1D181A] bg-[#1D181A] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_18px_36px_-20px_rgba(29,24,26,0.6)]"
                    >
                        <CheckCircle2 size={15} className="text-[#F7C56B]" />
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}