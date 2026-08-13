import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Cropper from 'react-easy-crop';
import {
    Plus,
    Minus,
    Trash2,
    Upload,
    FileText,
    CheckCircle2,
    Loader2,
    Eye,
    EyeOff,
    Globe,
    Link2,
    Award,
    Pencil,
    Camera,
    Briefcase,
    GraduationCap,
    X,
    ChevronRight,
    MapPin,
    Phone,
    Mail,
    CalendarDays,
    BookOpen,
    Zap,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { FONT_DISPLAY, FONT_BODY, MAROON, MAROON_DARK, ACCENT, BG } from '../../theme';
import Avatar from '../../components/Avatar';
import CandidateNavbar from '../../components/CandidateNavbar';
import SKILL_SUGGESTIONS from '../../data/skillSuggestions';

const MAX_RESUME_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB

// Completion weights for profile sections (total = 100)
const COMPLETION_WEIGHTS = { 
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
    preferences: 1 
};

function isValidUrl(value) {
    if (!value) return true;
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

function getCompletion(profile) {
    const p = profile?.profile || {};
    const social = profile?.socialLinks || {};
    const items = [
        { key: 'photo', anchor: 'section-photo', label: 'Add profile photo', weight: COMPLETION_WEIGHTS.photo, done: !!p.profilePictureUrl },
        { key: 'headline', anchor: 'section-headline', label: 'Add professional headline', weight: COMPLETION_WEIGHTS.headline, done: !!p.headline },
        { key: 'about', anchor: 'section-about', label: 'Write your bio', weight: COMPLETION_WEIGHTS.about, done: !!p.about },
        { key: 'contact', anchor: 'section-contact', label: 'Add contact info', weight: COMPLETION_WEIGHTS.contact, done: !!(p.location || p.phone) },
        { key: 'skills', anchor: 'section-skills', label: 'Add key skills', weight: COMPLETION_WEIGHTS.skills, done: (p.skills || []).length > 0 },
        { key: 'experience', anchor: 'section-experience', label: 'Add Experience details', weight: COMPLETION_WEIGHTS.experience, done: (p.experience || []).length > 0 },
        { key: 'education', anchor: 'section-education', label: 'Add education details', weight: COMPLETION_WEIGHTS.education, done: (p.education || []).length > 0 },
        { key: 'certifications', anchor: 'section-certifications', label: 'Add certifications', weight: COMPLETION_WEIGHTS.certifications, done: (p.certifications || []).length > 0 },
        { key: 'languages', anchor: 'section-languages', label: 'Add languages', weight: COMPLETION_WEIGHTS.languages, done: (p.languages || []).length > 0 },
        { key: 'projects', anchor: 'section-projects', label: 'Add projects', weight: COMPLETION_WEIGHTS.projects, done: (p.projects || []).length > 0 },
        { key: 'portfolio', anchor: 'section-portfolio', label: 'Add portfolio', weight: COMPLETION_WEIGHTS.portfolio, done: (p.portfolio || []).length > 0 },
        { key: 'resume', anchor: 'section-resume', label: 'Upload your resume', weight: COMPLETION_WEIGHTS.resume, done: !!p.resumeUrl },
        { key: 'social', anchor: 'section-social', label: 'Add social / portfolio links', weight: COMPLETION_WEIGHTS.social, done: !!(social.github || social.linkedin || social.website) },
        { key: 'preferences', anchor: 'section-preferences', label: 'Set work preferences', weight: COMPLETION_WEIGHTS.preferences, done: !!p.workPreferences },
    ];
    const rawPercent = items.reduce((sum, i) => sum + (i.done ? i.weight : 0), 0);
    const percent = Math.min(rawPercent, 100); // Cap at 100%
    const missing = items.filter((i) => !i.done);
    return { percent, missing, items };
}

function strengthColor(percent) {
    if (percent >= 80) return '#9A671A';
    if (percent >= 50) return '#C75560';
    return '#B23B3B';
}

function createImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });
}

async function getCroppedImg(imageSrc, pixelCrop) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            resolve(blob);
        }, 'image/jpeg', 0.92);
    });
}

function generateMonthNames() {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
}

function formatMonthYear(month, year) {
    if (!year) return '';
    const monthName = month !== '' && month != null ? generateMonthNames()[Number(month)] : '';
    return monthName ? `${monthName} ${year}` : year;
}

function formatExperiencePeriod(exp) {
    const { fromYear, fromMonth, toYear, toMonth } = getExperienceDates(exp);
    const from = formatMonthYear(fromMonth, fromYear);
    const to = exp.current ? 'Present' : formatMonthYear(toMonth, toYear);
    if (from && to) return `${from} to ${to}`;
    return from || to || '';
}

function formatEducationSummary(ed) {
    const educationLevel = ed.educationLevel || '';
    if (educationLevel === 'Doctorate' || educationLevel === 'PostDoctorate') {
        const degree = ed.doctorateType || educationLevel;
        const extras = [ed.specialization, ed.passingYear, ed.researchEndYear].filter(Boolean).join(' · ');
        return [degree, extras].filter(Boolean).join(' · ');
    }
    if (['Masters', 'Bachelors', 'Diploma'].includes(educationLevel)) {
        const degree = ed.courseName || ed.degree || educationLevel;
        const extras = [ed.specialization, ed.passingYear || ed.endYear, ed.schoolName].filter(Boolean).join(' · ');
        return [degree, extras].filter(Boolean).join(' · ');
    }
    if (educationLevel === 'ClassXII' || educationLevel === 'ClassX') {
        const primary = ed.board || ed.schoolName || educationLevel;
        const extras = [ed.passingYear, ed.schoolMedium].filter(Boolean).join(' · ');
        return [primary, extras].filter(Boolean).join(' · ');
    }
    return [ed.degree, ed.courseName, ed.specialization, ed.passingYear].filter(Boolean).join(' · ');
}

// Title / subtitle / meta line for the redesigned education card
// (e.g. "MCA Computers" / "KIIT University, Bhubaneswar" / "2023-2025 | Full Time").
function getEducationCardInfo(ed) {
    const level = ed.educationLevel || '';
    if (level === 'Doctorate' || level === 'PostDoctorate') {
        const years = [ed.researchStartYear, ed.researchEndYear || 'Present'].filter(Boolean).join('-');
        return {
            title: ed.doctorateType || formatEducationLevelLabel(level),
            subtitle: ed.institution || '',
            meta: [years, ed.courseType].filter(Boolean).join(' | '),
        };
    }
    if (isMastersBachelorsDiplomaLevel(level)) {
        const years = [ed.startYear, ed.endYear || 'Present'].filter(Boolean).join('-');
        return {
            title: ed.courseName || formatEducationLevelLabel(level),
            subtitle: ed.institution || '',
            meta: [years, ed.courseType].filter(Boolean).join(' | '),
        };
    }
    return {
        title: formatEducationLevelLabel(level),
        subtitle: ed.schoolName || '',
        meta: [ed.board, ed.passingYear].filter(Boolean).join(' | '),
    };
}

function QuickLinks({ items, onItemClick }) {
    function handleClick(anchor, onAdd) {
        document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Open the modal after scrolling
        setTimeout(() => {
            if (onAdd) onAdd();
        }, 300);
    }

    return (
        <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-24 rounded-[16px] border border-stone-200/70 bg-white p-4">
                <p className="mb-3 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Quick links</p>
                <nav className="flex flex-col gap-4">
                    {items.map((item) => (
                        <button
                            key={item.anchor}
                            onClick={() => handleClick(item.anchor, item.onAdd)}
                            className="flex items-center justify-between rounded-[10px] px-2 py-2 text-left text-[13px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
                        >
                            {item.label}
                            <span
                                className="text-[11px] font-semibold cursor-pointer"
                                style={{ color: item.done ? '#9A671A' : MAROON }}
                            >
                                {item.done ? '✓' : 'Add'}
                            </span>
                        </button>
                    ))}
                </nav>
            </div>
        </aside>
    );
}

// --- Reusable centered modal ----------------------------------------------
function Modal({ title, subtitle, onClose, onSave, saving, saveLabel = 'Save', hideFooter = false, children, bodyClassName = 'mt-4 max-h-[60vh] overflow-y-auto pr-1' }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 px-4 py-10"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
<motion.div
    initial={{ opacity: 0, rotateX: -90 }}
    animate={{ opacity: 1, rotateX: 0 }}
    exit={{ opacity: 0, rotateX: -90 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    style={{ perspective: 1200, transformOrigin: "top center" }}
    className="w-full max-w-lg rounded-[18px] bg-white p-6 shadow-2xl"
>
                <div className="mb-1 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-[17px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                            {title}
                        </h3>
                        {subtitle && <p className="mt-1 text-[12.5px] text-[#6B6259]">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className={bodyClassName}>{children}</div>

                {!hideFooter && (
                    <div className="mt-6 flex justify-end gap-3 border-t border-stone-100 pt-4">
                        <button
                            onClick={onClose}
                            className="rounded-[10px] px-4 py-2 text-[13px] font-semibold text-[#6B6259] hover:bg-stone-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onSave}
                            disabled={saving}
                            className="flex items-center gap-2 rounded-[10px] px-5 py-2 text-[13px] font-semibold text-white disabled:opacity-70"
                            style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                        >
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {saveLabel}
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

function SectionCard({ id, title, icon: Icon, weight, done, onAdd, addLabel = 'Add', alwaysShowAddLabel = false, children }) {
    const buttonLabel = alwaysShowAddLabel ? addLabel : done ? 'Edit' : addLabel;
    return (
        <div id={id} className="scroll-mt-24 rounded-[18px] border border-stone-200/70 bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                    {Icon && <Icon size={16} color={MAROON} />}
                    {title}
                    {!done && weight ? (
                        <span className="text-[11px] font-semibold text-[#9A671A]">+{weight}%</span>
                    ) : null}
                </h2>
                {onAdd && (
                    <button
                        onClick={onAdd}
                        className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold"
                        style={{ color: MAROON }}
                    >
                        {done ? <Pencil size={13} /> : <Plus size={14} />}
                        {buttonLabel}
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

function TextInput(props) {
    return (
        <input
            {...props}
            className={
                'w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#8B1E2F]/40 ' +
                (props.className || '')
            }
        />
    );
}

// --- Skills chip input with click-to-add suggestions --------------------
function SkillsInput({ skills, onAdd, onRemove }) {
    const [query, setQuery] = useState('');
    const wrapRef = useRef(null);

    function addSkill(skill) {
        const trimmed = skill.trim();
        if (!trimmed) return;
        if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
            setQuery('');
            return;
        }
        onAdd(trimmed);
        setQuery('');
    }

    return (
        <div ref={wrapRef}>
            {skills.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                        <span
                            key={skill}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
                            style={{ background: `${MAROON}14`, color: MAROON }}
                        >
                            {skill}
                            <button onClick={() => onRemove(skill)} className="hover:text-[#B23B3B]">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div>
                <TextInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && query.trim()) {
                            e.preventDefault();
                            addSkill(query);
                        }
                    }}
                    placeholder="Type a skill and press Enter"
                />
            </div>
        </div>
    );
}

// --- Language & Certification inputs ---
function ChipInput({ items, onAdd, onRemove, placeholder = 'Add item', suggestions = [] }) {
    const [query, setQuery] = useState('');
    const wrapRef = useRef(null);

    const filtered = suggestions.filter(
        (s) =>
            !items.some((existing) => existing.toLowerCase() === s.toLowerCase()) &&
            (query ? s.toLowerCase().includes(query.toLowerCase()) : true)
    );

    function addItem(item) {
        const trimmed = item.trim();
        if (!trimmed) return;
        if (items.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
            setQuery('');
            return;
        }
        onAdd(trimmed);
        setQuery('');
    }

    return (
        <div ref={wrapRef}>
            {items.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                    {items.map((item) => (
                        <span
                            key={item}
                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium"
                            style={{ background: `${ACCENT}22`, color: MAROON }}
                        >
                            {item}
                            <button onClick={() => onRemove(item)} className="hover:opacity-70">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <TextInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && query.trim()) {
                            e.preventDefault();
                            addItem(query);
                        }
                    }}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}

const BLANK_EXPERIENCE = { company: '', role: '', from: '', to: '', description: '', current: false, salary: '', designation: '', skills: [], employmentType: 'Full-time', location: '', department: '', stipend: '', totalExpYears: 0, totalExpMonths: 0, joiningYear: '', joiningMonth: '', workingFromYear: '', workingFromMonth: '', workingTillYear: '', workingTillMonth: '', noticePeriod: '', internshipDescription: '', currentSalary: '' };

// --- Experience Modal Helper Functions & Data Generators ---
function generateYears(maxYears = 30) {
    const years = [];
    for (let i = 0; i <= maxYears; i++) {
        years.push(i === maxYears ? `${i}+` : String(i));
    }
    return years;
}

function generateMonths() {
    return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
}

function generateFullYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 1970; i <= currentYear; i++) {
        years.push(String(i));
    }
    return years.reverse();
}

function getNoticePeriodOptions() {
    return ['15 Days or Less', '1 Month', '2 Months', '3 Months', 'Serving Notice Period'];
}

const COMPANY_SUGGESTIONS = [
    // Major Indian IT / services companies
    'Tata Consultancy Services (TCS)', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra',
    'Cognizant', 'Capgemini India', 'L&T Infotech (LTIMindtree)', 'Mindtree', 'Mphasis',
    'Persistent Systems', 'Hexaware Technologies', 'Zensar Technologies', 'Larsen & Toubro (L&T)',
    'Accenture India', 'IBM India', 'Oracle India', 'SAP India', 'Genpact', 'WNS Global Services',
    // Indian conglomerates & core industries
    'Reliance Industries', 'Tata Motors', 'Tata Steel', 'Mahindra & Mahindra', 'Adani Group',
    'Aditya Birla Group', 'ITC Limited', 'Larsen & Toubro Infrastructure', 'JSW Group',
    'Bajaj Auto', 'Maruti Suzuki India', 'Hindustan Unilever', 'Godrej Group', 'Vedanta Limited',
    // Banking, finance & insurance
    'HDFC Bank', 'ICICI Bank', 'State Bank of India (SBI)', 'Axis Bank', 'Kotak Mahindra Bank',
    'Yes Bank', 'IndusInd Bank', 'Bajaj Finserv', 'HDFC Life', 'LIC of India',
    // Indian product / startup companies
    'Flipkart', 'Zomato', 'Swiggy', 'Paytm', 'PhonePe', 'Ola', 'BYJU\'S', 'Freshworks',
    'Zoho Corporation', 'Razorpay', 'CRED', 'Meesho', 'Nykaa', 'Myntra', 'InMobi', 'Postman',
    'Urban Company', 'PolicyBazaar', 'Delhivery', 'MakeMyTrip',
    // Global tech companies with major India presence
    'Google India', 'Microsoft India', 'Amazon India', 'Apple India', 'Meta India',
    'Adobe India', 'Salesforce India', 'Cisco India', 'Intel India', 'Dell Technologies India',
    'Samsung R&D Institute India', 'Goldman Sachs India', 'JPMorgan Chase India', 'Deloitte India',
    'PwC India', 'EY India', 'KPMG India',
];

// Job titles common at a curated set of major employers — falls back to
// JOB_TITLE_SUGGESTIONS for any company not listed here (or freely typed).
const COMPANY_JOB_TITLES = {
    'Tata Consultancy Services (TCS)': ['Assistant System Engineer', 'System Engineer', 'IT Analyst', 'Senior IT Analyst', 'Software Engineer', 'Technical Lead', 'Project Manager', 'Business Analyst'],
    Infosys: ['Systems Engineer', 'Senior Systems Engineer', 'Technology Analyst', 'Senior Technology Analyst', 'Technology Lead', 'Project Manager', 'Software Engineer'],
    Wipro: ['Project Engineer', 'Senior Software Engineer', 'Technical Lead', 'Project Lead', 'Solution Architect', 'Business Analyst'],
    'HCL Technologies': ['Trainee Engineer', 'Software Engineer', 'Senior Software Engineer', 'Technical Lead', 'Project Manager'],
    'Tech Mahindra': ['Associate Software Engineer', 'Software Engineer', 'Senior Software Engineer', 'Team Lead', 'Project Manager'],
    Cognizant: ['Programmer Analyst', 'Programmer Analyst Trainee', 'Associate', 'Senior Associate', 'Technical Lead', 'Project Manager'],
    'Accenture India': ['Associate Software Engineer', 'Software Engineer', 'Application Development Analyst', 'Team Lead', 'Consultant', 'Senior Manager'],
    'Google India': ['Software Engineer', 'Senior Software Engineer', 'Staff Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'Site Reliability Engineer'],
    'Microsoft India': ['Software Engineer', 'Senior Software Engineer', 'Program Manager', 'Cloud Solution Architect', 'Data Scientist', 'Support Engineer'],
    'Amazon India': ['Software Development Engineer (SDE-1)', 'Software Development Engineer II (SDE-2)', 'Senior SDE', 'Operations Manager', 'Business Analyst', 'Product Manager'],
    Flipkart: ['Software Development Engineer', 'Senior Software Development Engineer', 'Product Manager', 'Data Scientist', 'Business Analyst', 'Category Manager'],
    Zomato: ['Software Engineer', 'Senior Software Engineer', 'Product Manager', 'Business Analyst', 'City Lead'],
    Swiggy: ['Software Development Engineer', 'Senior SDE', 'Product Manager', 'Business Analyst', 'City Manager'],
    'Zoho Corporation': ['Member Technical Staff', 'Senior Member Technical Staff', 'Product Manager', 'QA Engineer', 'Technical Consultant'],
    'HDFC Bank': ['Relationship Manager', 'Assistant Manager', 'Deputy Manager', 'Branch Manager', 'Credit Analyst', 'Software Engineer'],
    'ICICI Bank': ['Relationship Manager', 'Assistant Manager', 'Deputy Manager', 'Branch Manager', 'Software Engineer'],
    'Deloitte India': ['Analyst', 'Consultant', 'Senior Consultant', 'Manager', 'Senior Manager'],
    'PwC India': ['Associate', 'Senior Associate', 'Manager', 'Senior Manager', 'Consultant'],
    'EY India': ['Analyst', 'Consultant', 'Senior Consultant', 'Manager'],
    'JPMorgan Chase India': ['Analyst', 'Associate', 'Vice President', 'Software Engineer', 'Business Analyst'],
};

const JOB_TITLE_SUGGESTIONS = [
    'Software Engineer', 'Senior Software Engineer', 'System Engineer', 'Full Stack Developer',
    'Frontend Developer', 'Backend Developer', 'Product Manager', 'Data Scientist', 'Data Analyst',
    'DevOps Engineer', 'UI/UX Designer', 'Business Analyst', 'QA Engineer', 'Solutions Architect',
    'Technical Lead', 'Project Manager', 'Associate', 'Consultant', 'Relationship Manager',
    'Marketing Executive', 'Sales Executive', 'HR Executive', 'Operations Manager', 'Trainee Engineer',
];

const DEPARTMENT_SUGGESTIONS = [
    'Engineering', 'Product', 'Sales', 'Marketing', 'Human Resources', 'Finance',
    'Operations', 'Design', 'Data Analytics', 'Customer Success', 'Legal'
];

// Returns job-title suggestions scoped to the given company when we have curated
// data for it, otherwise falls back to the generic list.
function getJobTitleSuggestions(companyName) {
    const match = Object.keys(COMPANY_JOB_TITLES).find(
        (c) => c.toLowerCase() === (companyName || '').trim().toLowerCase()
    );
    return match ? COMPANY_JOB_TITLES[match] : JOB_TITLE_SUGGESTIONS;
}

// Resolves the effective from/to year+month for an experience entry, since
// different employment-type cases store dates under different field names.
function getExperienceDates(exp) {
    const fromYear = exp.workingFromYear || exp.joiningYear || '';
    const fromMonth =
        exp.workingFromMonth !== '' && exp.workingFromMonth != null
            ? exp.workingFromMonth
            : exp.joiningMonth !== '' && exp.joiningMonth != null
            ? exp.joiningMonth
            : '';
    const toYear = exp.current ? '' : exp.workingTillYear || '';
    const toMonth = exp.current ? '' : exp.workingTillMonth || '';
    return { fromYear, fromMonth, toYear, toMonth };
}

// "1 month", "2 yrs", "2 yrs 3 mos" — LinkedIn-style duration label.
function formatExperienceDuration(exp) {
    const { fromYear, fromMonth, toYear, toMonth } = getExperienceDates(exp);
    if (!fromYear) return '';
    const fy = parseInt(fromYear, 10);
    const fm = fromMonth !== '' && fromMonth != null ? parseInt(fromMonth, 10) : 0;
    const now = new Date();
    const useNow = exp.current || !toYear;
    const ty = useNow ? now.getFullYear() : parseInt(toYear, 10);
    const tm = useNow ? now.getMonth() : (toMonth !== '' && toMonth != null ? parseInt(toMonth, 10) : 0);
    let totalMonths = (ty - fy) * 12 + (tm - fm) + 1; // inclusive of the starting month
    if (totalMonths < 1) totalMonths = 1;
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years && months) return `${years} yr${years > 1 ? 's' : ''} ${months} mo${months > 1 ? 's' : ''}`;
    if (years) return `${years} yr${years > 1 ? 's' : ''}`;
    return `${months} month${months === 1 ? '' : 's'}`;
}

const SKILLS_SUGGESTIONS = SKILL_SUGGESTIONS || [
    'JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'MongoDB', 'AWS',
    'Docker', 'Git', 'REST API', 'TypeScript', 'Vue.js', 'Angular'
];

// States & UTs of India, and a set of major cities per state — used to power
// the "Preferred location" State / City autocomplete fields. The State field
// still accepts free typing (a user can enter any state name manually); this
// list only drives the suggestion dropdown.
const INDIAN_STATE_CITY_MAP = {
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Kakinada'],
    'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
    'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga'],
    'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba'],
    'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar'],
    'Haryana': ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar'],
    'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi'],
    'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'],
    'Kerala': ['Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Kollam', 'Thrissur'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane'],
    'Manipur': ['Imphal', 'Thoubal'],
    'Meghalaya': ['Shillong', 'Tura'],
    'Mizoram': ['Aizawl', 'Lunglei'],
    'Nagaland': ['Kohima', 'Dimapur'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur'],
    'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Mohali'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
    'Sikkim': ['Gangtok', 'Namchi'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
    'Tripura': ['Agartala', 'Udaipur'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Agra', 'Varanasi'],
    'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri', 'Asansol'],
    'Andaman and Nicobar Islands': ['Port Blair'],
    'Chandigarh': ['Chandigarh'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Daman', 'Silvassa'],
    'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Saket'],
    'Jammu and Kashmir': ['Srinagar', 'Jammu'],
    'Ladakh': ['Leh', 'Kargil'],
    'Lakshadweep': ['Kavaratti'],
    'Puducherry': ['Puducherry', 'Karaikal'],
};

const INDIAN_STATE_SUGGESTIONS = Object.keys(INDIAN_STATE_CITY_MAP);

// Best-effort split of a stored "City, State" string into its two parts.
function parseLocation(location) {
    if (!location) return { city: '', state: '' };
    const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) return { city: parts[0], state: parts.slice(1).join(', ') };
    return { city: parts[0] || '', state: '' };
}

// Searchable Autocomplete Component
function AutocompleteInput({ value, onChange, placeholder, suggestions = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    const filtered = suggestions.filter(s =>
        s.toLowerCase().includes(query.toLowerCase())
    );

    const handleSelect = (item) => {
        setQuery(item);
        onChange({ target: { value: item } });
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    onChange(e);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => setTimeout(() => setIsOpen(false), 150)}
                placeholder={placeholder}
                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none transition-colors focus:border-[#8B1E2F]/40"
            />
            {isOpen && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-[180px] overflow-y-auto rounded-[10px] border border-stone-200 bg-white shadow-lg">
                    {filtered.map((item, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelect(item)}
                            className="w-full px-3 py-2 text-left text-[13px] hover:bg-stone-100 transition-colors"
                        >
                            {item}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Main Experience Modal Content Component
function ExperienceModalContent({ expDraft, setExpDraft }) {
    const isCurrent = expDraft.current === true;
    const isFullTime = expDraft.employmentType === 'Full-time';
    const isInternship = expDraft.employmentType === 'Internship';

    // Helper to update nested state
    const updateExp = (updates) => {
        setExpDraft((prev) => ({ ...prev, ...updates }));
    };

    return (
        <div className="flex flex-col gap-4">
            {/* STEP 1: Always visible - Current Employment + Employment Type */}
            <div className="space-y-4 rounded-[12px] bg-gradient-to-br from-stone-50 to-white p-4 border border-stone-100">
                {/* Is this your current employment? */}
                <div>
                    <label className="mb-2 block text-[12px] font-semibold text-stone-900">
                        Is this your current employment? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                        {[
                            { label: 'Yes', value: true },
                            { label: 'No', value: false }
                        ].map((opt) => (
                            <label key={String(opt.value)} className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="current"
                                    checked={expDraft.current === opt.value}
                                    onChange={() => updateExp({ current: opt.value })}
                                    className="w-4 h-4 accent-[#8B1E2F] cursor-pointer"
                                />
                                <span className="text-[13px] font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Employment Type */}
                <div>
                    <label className="mb-2 block text-[12px] font-semibold text-stone-900">
                        Employment Type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                        {[
                            { label: 'Full-time', value: 'Full-time' },
                            { label: 'Internship', value: 'Internship' }
                        ].map((opt) => (
                            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="employment"
                                    checked={expDraft.employmentType === opt.value}
                                    onChange={() => updateExp({ employmentType: opt.value })}
                                    className="w-4 h-4 accent-[#8B1E2F] cursor-pointer"
                                />
                                <span className="text-[13px] font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                    {opt.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* CASE 1: Current = NO, Full-time */}
            {!isCurrent && isFullTime && (
                <div className="space-y-4">
                    {/* Previous Company Name */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Previous Company Name <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.company || ''}
                            onChange={(e) => updateExp({ company: e.target.value })}
                            placeholder="Search companies..."
                            suggestions={COMPANY_SUGGESTIONS}
                        />
                    </div>

                    {/* Previous Job Title */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Previous Job Title <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.role || ''}
                            onChange={(e) => updateExp({ role: e.target.value })}
                            placeholder="Search job titles..."
                            suggestions={getJobTitleSuggestions(expDraft.company)}
                        />
                    </div>

                    {/* Worked From */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Worked From</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                                value={expDraft.workingFromYear || ''}
                                onChange={(e) => updateExp({ workingFromYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year</option>
                                {generateFullYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <select
                                value={expDraft.workingFromMonth || ''}
                                onChange={(e) => updateExp({ workingFromMonth: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Month</option>
                                {generateMonthNames().map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Worked Till */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Worked Till</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                                value={expDraft.workingTillYear || ''}
                                onChange={(e) => updateExp({ workingTillYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year</option>
                                {generateFullYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <select
                                value={expDraft.workingTillMonth || ''}
                                onChange={(e) => updateExp({ workingTillMonth: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Month</option>
                                {generateMonthNames().map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Skills Used */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Skills Used
                        </label>
                        <ChipInput
                            items={expDraft.skills || []}
                            onAdd={(skill) => updateExp({ skills: [...(expDraft.skills || []), skill] })}
                            onRemove={(skill) => updateExp({ skills: (expDraft.skills || []).filter((s) => s !== skill) })}
                            placeholder="Type a skill and press Enter"
                            suggestions={SKILLS_SUGGESTIONS}
                        />
                    </div>

                    {/* Job Profile */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Job Profile</label>
                        <textarea
                            value={expDraft.description || ''}
                            onChange={(e) => updateExp({ description: e.target.value.slice(0, 4000) })}
                            placeholder="Describe your roles and responsibilities..."
                            rows={3}
                            maxLength={4000}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all resize-none"
                        />
                        <p className="mt-1 text-[11px] text-stone-500">{(expDraft.description || '').length}/4000</p>
                    </div>

                    {/* Current Salary (Optional) */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-700">Current Salary (Optional)</label>
                        <div className="flex gap-2">
                            <div className="flex items-center px-3 py-2 rounded-[10px] border border-stone-200 bg-stone-50 text-[13px] font-medium text-stone-700">
                                ₹
                            </div>
                            <input
                                type="text"
                                value={expDraft.salary || ''}
                                onChange={(e) => updateExp({ salary: e.target.value })}
                                placeholder="Eg. 4,50,000"
                                className="flex-1 rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* CASE 2: Current = NO, Internship */}
            {!isCurrent && isInternship && (
                <div className="space-y-4">
                    {/* Previous Company Name */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Company Name <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.company || ''}
                            onChange={(e) => updateExp({ company: e.target.value })}
                            placeholder="Search companies..."
                            suggestions={COMPANY_SUGGESTIONS}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Location <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={expDraft.location || ''}
                            onChange={(e) => updateExp({ location: e.target.value })}
                            placeholder="City, State, Country..."
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        />
                    </div>

                    {/* Department */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.department || ''}
                            onChange={(e) => updateExp({ department: e.target.value })}
                            placeholder="Search departments..."
                            suggestions={DEPARTMENT_SUGGESTIONS}
                        />
                    </div>

                    {/* Worked From */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Worked From</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                                value={expDraft.workingFromYear || ''}
                                onChange={(e) => updateExp({ workingFromYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year</option>
                                {generateFullYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <select
                                value={expDraft.workingFromMonth || ''}
                                onChange={(e) => updateExp({ workingFromMonth: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Month</option>
                                {generateMonthNames().map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Worked Till */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Worked Till</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                                value={expDraft.workingTillYear || ''}
                                onChange={(e) => updateExp({ workingTillYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year</option>
                                {generateFullYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <select
                                value={expDraft.workingTillMonth || ''}
                                onChange={(e) => updateExp({ workingTillMonth: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Month</option>
                                {generateMonthNames().map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Monthly Stipend */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Monthly Stipend <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <div className="flex items-center px-3 py-2 rounded-[10px] border border-stone-200 bg-stone-50 text-[13px] font-medium text-stone-700">
                                ₹
                            </div>
                            <input
                                type="text"
                                value={expDraft.stipend || ''}
                                onChange={(e) => updateExp({ stipend: e.target.value })}
                                placeholder="Eg. 15,000"
                                className="flex-1 rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Skills Used */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Skills Used
                        </label>
                        <ChipInput
                            items={expDraft.skills || []}
                            onAdd={(skill) => updateExp({ skills: [...(expDraft.skills || []), skill] })}
                            onRemove={(skill) => updateExp({ skills: (expDraft.skills || []).filter((s) => s !== skill) })}
                            placeholder="Type a skill and press Enter"
                            suggestions={SKILLS_SUGGESTIONS}
                        />
                    </div>

                    {/* Internship Description */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Internship Description</label>
                        <textarea
                            value={expDraft.internshipDescription || ''}
                            onChange={(e) => updateExp({ internshipDescription: e.target.value.slice(0, 4000) })}
                            placeholder="Describe your internship experience, projects, and learnings..."
                            rows={3}
                            maxLength={4000}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all resize-none"
                        />
                        <p className="mt-1 text-[11px] text-stone-500">{(expDraft.internshipDescription || '').length}/4000</p>
                    </div>
                </div>
            )}

            {/* CASE 3: Current = YES, Full-time */}
            {isCurrent && isFullTime && (
                <div className="space-y-4">
                    {/* Total Experience */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Total Experience</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div>
                                <label className="mb-1 block text-[11px] text-stone-600">Years</label>
                                <select
                                    value={expDraft.totalExpYears || ''}
                                    onChange={(e) => updateExp({ totalExpYears: e.target.value })}
                                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                >
                                    <option value="">Select Years</option>
                                    {generateYears().map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-[11px] text-stone-600">Months</label>
                                <select
                                    value={expDraft.totalExpMonths || ''}
                                    onChange={(e) => updateExp({ totalExpMonths: e.target.value })}
                                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                >
                                    <option value="">Select Months</option>
                                    {generateMonths().map((month) => (
                                        <option key={month} value={month}>{month}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Current Company Name */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Current Company Name <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.company || ''}
                            onChange={(e) => updateExp({ company: e.target.value })}
                            placeholder="Search companies..."
                            suggestions={COMPANY_SUGGESTIONS}
                        />
                    </div>

                    {/* Current Job Title */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Current Job Title <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.role || ''}
                            onChange={(e) => updateExp({ role: e.target.value })}
                            placeholder="Search job titles..."
                            suggestions={getJobTitleSuggestions(expDraft.company)}
                        />
                    </div>

                    {/* Joining Date */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Joining Date</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                                value={expDraft.joiningYear || ''}
                                onChange={(e) => updateExp({ joiningYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year</option>
                                {generateFullYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <select
                                value={expDraft.joiningMonth || ''}
                                onChange={(e) => updateExp({ joiningMonth: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Month</option>
                                {generateMonthNames().map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Current Annual Salary */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Current Annual Salary (Optional)
                        </label>
                        <div className="flex gap-2">
                            <div className="flex items-center px-3 py-2 rounded-[10px] border border-stone-200 bg-stone-50 text-[13px] font-medium text-stone-700">
                                ₹
                            </div>
                            <input
                                type="text"
                                value={expDraft.currentSalary || ''}
                                onChange={(e) => updateExp({ currentSalary: e.target.value })}
                                placeholder="Eg. 12,00,000"
                                className="flex-1 rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Notice Period */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Notice Period <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={expDraft.noticePeriod || ''}
                            onChange={(e) => updateExp({ noticePeriod: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select notice period</option>
                            {getNoticePeriodOptions().map((option) => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </div>

                    {/* Skills Used */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Skills Used
                        </label>
                        <ChipInput
                            items={expDraft.skills || []}
                            onAdd={(skill) => updateExp({ skills: [...(expDraft.skills || []), skill] })}
                            onRemove={(skill) => updateExp({ skills: (expDraft.skills || []).filter((s) => s !== skill) })}
                            placeholder="Type a skill and press Enter"
                            suggestions={SKILLS_SUGGESTIONS}
                        />
                    </div>

                    {/* Job Profile */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Job Profile</label>
                        <textarea
                            value={expDraft.description || ''}
                            onChange={(e) => updateExp({ description: e.target.value.slice(0, 4000) })}
                            placeholder="Describe your roles and responsibilities..."
                            rows={3}
                            maxLength={4000}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all resize-none"
                        />
                        <p className="mt-1 text-[11px] text-stone-500">{(expDraft.description || '').length}/4000</p>
                    </div>
                </div>
            )}

            {/* CASE 4: Current = YES, Internship */}
            {isCurrent && isInternship && (
                <div className="space-y-4">
                    {/* Current Company Name */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Company Name <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.company || ''}
                            onChange={(e) => updateExp({ company: e.target.value })}
                            placeholder="Search companies..."
                            suggestions={COMPANY_SUGGESTIONS}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Location <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={expDraft.location || ''}
                            onChange={(e) => updateExp({ location: e.target.value })}
                            placeholder="City, State, Country..."
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        />
                    </div>

                    {/* Department */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Department <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={expDraft.department || ''}
                            onChange={(e) => updateExp({ department: e.target.value })}
                            placeholder="Search departments..."
                            suggestions={DEPARTMENT_SUGGESTIONS}
                        />
                    </div>

                    {/* Working Since */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Working Since</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                                value={expDraft.workingFromYear || ''}
                                onChange={(e) => updateExp({ workingFromYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year</option>
                                {generateFullYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <select
                                value={expDraft.workingFromMonth || ''}
                                onChange={(e) => updateExp({ workingFromMonth: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Month</option>
                                {generateMonthNames().map((month, idx) => (
                                    <option key={month} value={idx}>{month}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Monthly Stipend */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Monthly Stipend <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                            <div className="flex items-center px-3 py-2 rounded-[10px] border border-stone-200 bg-stone-50 text-[13px] font-medium text-stone-700">
                                ₹
                            </div>
                            <input
                                type="text"
                                value={expDraft.stipend || ''}
                                onChange={(e) => updateExp({ stipend: e.target.value })}
                                placeholder="Eg. 15,000"
                                className="flex-1 rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            />
                        </div>
                    </div>

                    {/* Skills Used */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Skills Used
                        </label>
                        <ChipInput
                            items={expDraft.skills || []}
                            onAdd={(skill) => updateExp({ skills: [...(expDraft.skills || []), skill] })}
                            onRemove={(skill) => updateExp({ skills: (expDraft.skills || []).filter((s) => s !== skill) })}
                            placeholder="Type a skill and press Enter"
                            suggestions={SKILLS_SUGGESTIONS}
                        />
                    </div>

                    {/* Internship Description */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Internship Description</label>
                        <textarea
                            value={expDraft.internshipDescription || ''}
                            onChange={(e) => updateExp({ internshipDescription: e.target.value.slice(0, 4000) })}
                            placeholder="Describe your internship experience, projects, and learnings..."
                            rows={3}
                            maxLength={4000}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all resize-none"
                        />
                        <p className="mt-1 text-[11px] text-stone-500">{(expDraft.internshipDescription || '').length}/4000</p>
                    </div>
                </div>
            )}
        </div>
    );
}

const BLANK_EDUCATION = {
    educationLevel: '',
    institution: '',
    degree: '',
    year: '',
    courseName: '',
    startYear: '',
    endYear: '',
    courseType: 'Full-time',
    gradingSystem: '',
    specialization: '',
    // For Doctorate
    doctorateType: '',
    researchStartYear: '',
    researchStartMonth: '',
    researchEndYear: '',
    researchEndMonth: '',
    thesisTitle: '',
    marks: '',
    // For Class XII/X
    board: '',
    schoolName: '',
    passingYear: '',
    schoolMedium: '',
    stream: '',
    startMonth: '',
    endMonth: ''
};

// --- Education Modal Helper Functions & Data Generators ---
function generateEducationYears(minYear = 1950) {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= minYear; i--) {
        years.push(String(i));
    }
    return years;
}

function generateEducationMonthNames() {
    return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
}

function getCourseTypeOptions() {
    return ['Full-time', 'Part-time', 'Correspondence / Distance Learning'];
}

function getGradingSystemOptions() {
    return ['Percentage', 'CGPA (10 Point)', 'CGPA (4 Point)', 'GPA', 'Grade'];
}

function getSchoolMediumOptions() {
    return ['English', 'Hindi', 'Regional Language', 'Other'];
}

function getBoardOptions() {
    return ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge', 'NIOS', 'Other'];
}

function getStreamOptions() {
    return ['Science', 'Commerce', 'Arts', 'Other'];
}

function getHighestEducationOptions() {
    return [
        { label: 'Doctorate / PhD', value: 'Doctorate' },
        { label: 'Post Doctorate', value: 'PostDoctorate' },
        { label: "Master's Degree", value: 'Masters' },
        { label: "Bachelor's Degree", value: 'Bachelors' },
        { label: 'Diploma', value: 'Diploma' },
        { label: 'Class XII', value: 'ClassXII' },
        { label: 'Class X', value: 'ClassX' }
    ];
}
// Major Indian universities/institutes — the University/Institute field still accepts
// free typing, so anything not in this list (e.g. a smaller local college) can just be typed in.
const UNIVERSITY_SUGGESTIONS = [
    'IIT Delhi', 'IIT Bombay', 'IIT Madras', 'IIT Kharagpur', 'IIT Kanpur', 'IIT Roorkee',
    'IIT Guwahati', 'IIT Hyderabad', 'IIT (BHU) Varanasi', 'NIT Rourkela', 'NIT Trichy',
    'NIT Warangal', 'NIT Surathkal', 'BITS Pilani', 'IIIT Hyderabad', 'IIIT Bangalore',
    'Delhi University', 'Jawaharlal Nehru University', 'Jamia Millia Islamia',
    'University of Mumbai', 'University of Pune (Savitribai Phule Pune University)',
    'Bangalore University', 'Visvesvaraya Technological University (VTU)',
    'Anna University', 'University of Calcutta', 'Jadavpur University',
    'Utkal University', 'KIIT University', 'Kalinga Institute of Industrial Technology',
    'SOA University (Siksha O Anusandhan)', 'Biju Patnaik University of Technology (BPUT)',
    'Osmania University', 'Andhra University', 'Jawaharlal Nehru Technological University (JNTU)',
    'Panjab University', 'Punjab Technical University', 'Guru Gobind Singh Indraprastha University',
    'Amity University', 'Lovely Professional University (LPU)', 'Chandigarh University',
    'Manipal Academy of Higher Education', 'VIT Vellore', 'SRM Institute of Science and Technology',
    'SASTRA University', 'Symbiosis International University', 'Christ University',
    'Banaras Hindu University (BHU)', 'Aligarh Muslim University', 'Lucknow University',
    'Rajasthan Technical University', 'Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)',
    'Gujarat Technological University', 'Nirma University', 'Mumbai University (MU)',
    'Sardar Patel University', 'Indian Institute of Science (IISc) Bangalore',
    'Indian Statistical Institute', 'Indian School of Business (ISB)',
    'IIM Ahmedabad', 'IIM Bangalore', 'IIM Calcutta', 'National Law School of India University',
    'Central Board of Secondary Education Open School (NIOS)',
    'Other / My university is not listed',
];

// Course options scoped to the selected highest-education level.
const EDUCATION_COURSE_MAP = {
    Bachelors: [
        'Bachelor of Technology (B.Tech)', 'Bachelor of Engineering (B.E)', 'Bachelor of Science (B.Sc)',
        'Bachelor of Commerce (B.Com)', 'Bachelor of Arts (B.A)', 'Bachelor of Business Administration (BBA)',
        'Bachelor of Computer Applications (BCA)', 'Bachelor of Architecture (B.Arch)',
        'Bachelor of Pharmacy (B.Pharm)', 'Bachelor of Laws (LLB)', 'MBBS',
    ],
    Masters: [
        'Master of Technology (M.Tech)', 'Master of Engineering (M.E)', 'Master of Science (M.Sc)',
        'Master of Commerce (M.Com)', 'Master of Arts (M.A)', 'Master of Business Administration (MBA)',
        'Master of Computer Applications (MCA)', 'Master of Laws (LLM)', 'Master of Pharmacy (M.Pharm)',
    ],
    Diploma: [
        'Diploma in Engineering', 'Polytechnic Diploma', 'Diploma in Computer Applications',
        'Post Graduate Diploma in Management (PGDM)', 'Diploma in Business Management', 'ITI Diploma',
    ],
};
const COURSE_SUGGESTIONS = Object.values(EDUCATION_COURSE_MAP).flat();

// Specialization options scoped to the selected course.
const COURSE_SPECIALIZATION_MAP = {
    'Bachelor of Technology (B.Tech)': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Artificial Intelligence & Data Science'],
    'Bachelor of Engineering (B.E)': ['Computer Science', 'Electronics & Communication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'],
    'Bachelor of Science (B.Sc)': ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Statistics'],
    'Bachelor of Commerce (B.Com)': ['Accounting & Finance', 'Banking & Insurance', 'General', 'Honours'],
    'Bachelor of Arts (B.A)': ['English', 'Economics', 'Political Science', 'Psychology', 'History', 'Sociology'],
    'Bachelor of Business Administration (BBA)': ['Marketing', 'Finance', 'Human Resources', 'International Business'],
    'Bachelor of Computer Applications (BCA)': ['Computer Applications', 'Data Science'],
    'Master of Technology (M.Tech)': ['Computer Science', 'VLSI Design', 'Structural Engineering', 'Thermal Engineering', 'Power Systems', 'Data Science'],
    'Master of Engineering (M.E)': ['Computer Science', 'Structural Engineering', 'Power Systems', 'Thermal Engineering'],
    'Master of Science (M.Sc)': ['Computer Science', 'Physics', 'Chemistry', 'Mathematics', 'Data Science', 'Biotechnology'],
    'Master of Business Administration (MBA)': ['Marketing', 'Finance', 'Human Resources', 'Operations', 'Business Analytics', 'International Business'],
    'Master of Computer Applications (MCA)': ['Computer Applications', 'Mern Full Stack', 'Data Science', 'Cloud Computing'],
    'Master of Commerce (M.Com)': ['Accounting & Finance', 'Banking', 'Business Economics'],
    'Master of Arts (M.A)': ['English', 'Economics', 'Psychology', 'Public Administration'],
};
const SPECIALIZATION_SUGGESTIONS = Object.values(COURSE_SPECIALIZATION_MAP).flat();

const SCHOOL_NAME_SUGGESTIONS = [
    'Delhi Public School', 'Modern School', 'Cathedral School', 'St. Paul\'s School',
    'Mayo College', 'La Martinière', 'The Doon School', 'National Public School',
    'Other / My school is not listed',
];

// Marks/grade input configuration driven by the selected grading system —
// keeps whatever the candidate enters consistent with the scale they picked.
function getMarksFieldConfig(gradingSystem) {
    switch (gradingSystem) {
        case 'Percentage':
            return { kind: 'number', min: 0, max: 100, step: '0.01', placeholder: 'e.g., 85', suffix: '%' };
        case 'CGPA (10 Point)':
            return { kind: 'number', min: 0, max: 10, step: '0.01', placeholder: 'e.g., 8.5', suffix: '/ 10' };
        case 'CGPA (4 Point)':
            return { kind: 'number', min: 0, max: 4, step: '0.01', placeholder: 'e.g., 3.5', suffix: '/ 4' };
        case 'GPA':
            return { kind: 'number', min: 0, max: 10, step: '0.01', placeholder: 'e.g., 7.8', suffix: '' };
        case 'Grade':
            return { kind: 'select', options: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'] };
        default:
            return { kind: 'text', placeholder: 'Select a grading system first' };
    }
}

// Ranking used to keep education years chronologically consistent across entries
// (Class X < Class XII < Graduation/Diploma < Masters < Doctorate).
const EDUCATION_LEVEL_RANK = { ClassX: 1, ClassXII: 2, Bachelors: 3, Diploma: 3, Masters: 4, Doctorate: 5, PostDoctorate: 5 };

// The single "primary year" used to compare an education entry against others.
function getEducationYear(ed) {
    const level = ed.educationLevel;
    if (level === 'Doctorate' || level === 'PostDoctorate') return ed.researchEndYear || ed.researchStartYear || '';
    if (['Masters', 'Bachelors', 'Diploma'].includes(level)) return ed.endYear || ed.startYear || '';
    return ed.passingYear || '';
}

function isMastersBachelorsDiplomaLevel(level) {
    return ['Masters', 'Bachelors', 'Diploma'].includes(level);
}

function formatEducationLevelLabel(level) {
    const match = getHighestEducationOptions().find((opt) => opt.value === level);
    return match ? match.label : level;
}

// Marks/grade input that adapts to the selected grading system (Percentage,
// CGPA 10/4-point, GPA, or letter Grade) so the value entered always matches the scale.
function MarksField({ eduDraft, updateEdu, label = 'Marks / CGPA' }) {
    const config = getMarksFieldConfig(eduDraft.gradingSystem);
    return (
        <div>
            <label className="mb-1 block text-[12px] font-semibold text-stone-900">{label}</label>
            {config.kind === 'select' ? (
                <select
                    value={eduDraft.marks || ''}
                    onChange={(e) => updateEdu({ marks: e.target.value })}
                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                >
                    <option value="">Select grade</option>
                    {config.options.map((g) => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
            ) : (
                <div className="flex items-center gap-2">
                    <input
                        type={config.kind === 'number' ? 'number' : 'text'}
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        disabled={config.kind === 'text'}
                        value={eduDraft.marks || ''}
                        onChange={(e) => updateEdu({ marks: e.target.value })}
                        placeholder={config.placeholder}
                        className="flex-1 rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all disabled:bg-stone-50 disabled:text-stone-400"
                    />
                    {config.suffix && <span className="shrink-0 text-[12px] font-medium text-stone-500">{config.suffix}</span>}
                </div>
            )}
        </div>
    );
}

function EducationModalContent({ eduDraft, setEduDraft }) {
    const educationLevel = eduDraft.educationLevel || '';
    const isDoctorate = educationLevel === 'Doctorate' || educationLevel === 'PostDoctorate';
    const isMastersBachelorsDiploma = ['Masters', 'Bachelors', 'Diploma'].includes(educationLevel);
    const isClassXII = educationLevel === 'ClassXII';
    const isClassX = educationLevel === 'ClassX';

    const updateEdu = (updates) => {
        setEduDraft((prev) => ({ ...prev, ...updates }));
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Education Level Dropdown */}
            <div>
                <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                    Education <span className="text-red-500">*</span>
                </label>
                <select
                    value={educationLevel}
                    onChange={(e) => updateEdu({ educationLevel: e.target.value })}
                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all bg-white"
                >
                    <option value="">Select education</option>
                    {getHighestEducationOptions().map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* CASE 1: Doctorate / Post Doctorate */}
            {isDoctorate && (
                <div className="space-y-4">
                    {/* University / Institute */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            University / Institute <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={eduDraft.institution || ''}
                            onChange={(e) => updateEdu({ institution: e.target.value })}
                            placeholder="Search universities..."
                            suggestions={UNIVERSITY_SUGGESTIONS}
                        />
                        <p className="mt-1 text-[11px] text-stone-500">Can't find it? Just type your university's name.</p>
                    </div>

                    {/* Doctorate Degree */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Doctorate Degree <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={eduDraft.doctorateType || ''}
                            onChange={(e) => updateEdu({ doctorateType: e.target.value })}
                            placeholder="e.g., PhD in Computer Science"
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        />
                    </div>

                    {/* Specialization */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Specialization <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={eduDraft.specialization || ''}
                            onChange={(e) => updateEdu({ specialization: e.target.value })}
                            placeholder="Search specializations..."
                            suggestions={SPECIALIZATION_SUGGESTIONS}
                        />
                    </div>

                    {/* Course Type */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Course Type</label>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {getCourseTypeOptions().map((type) => (
                                <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="courseType"
                                        value={type}
                                        checked={eduDraft.courseType === type}
                                        onChange={(e) => updateEdu({ courseType: e.target.value })}
                                        className="w-4 h-4 accent-[#8B1E2F] cursor-pointer"
                                    />
                                    <span className="text-[13px] font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                        {type}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Research Started */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Research Started (Year)</label>
                        <select
                            value={eduDraft.researchStartYear || ''}
                            onChange={(e) => updateEdu({ researchStartYear: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Year</option>
                            {generateEducationYears().map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Research Completed */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Research Completed (Year)</label>
                        <select
                            value={eduDraft.researchEndYear || ''}
                            onChange={(e) => updateEdu({ researchEndYear: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Year (or leave blank if ongoing)</option>
                            {generateEducationYears().map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* Grading System */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Grading System</label>
                        <select
                            value={eduDraft.gradingSystem || ''}
                            onChange={(e) => updateEdu({ gradingSystem: e.target.value, marks: '' })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select grading system</option>
                            {getGradingSystemOptions().map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Marks / CGPA */}
                    <MarksField eduDraft={eduDraft} updateEdu={updateEdu} />

                    {/* Thesis Title */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-700">Thesis Title (Optional)</label>
                        <input
                            type="text"
                            value={eduDraft.thesisTitle || ''}
                            onChange={(e) => updateEdu({ thesisTitle: e.target.value })}
                            placeholder="Enter thesis title..."
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        />
                    </div>
                </div>
            )}

            {/* CASE 2: Master's / Bachelor's / Diploma */}
            {isMastersBachelorsDiploma && (
                <div className="space-y-4">
                    {/* University / Institute */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            University / Institute <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={eduDraft.institution || ''}
                            onChange={(e) => updateEdu({ institution: e.target.value })}
                            placeholder="Search universities..."
                            suggestions={UNIVERSITY_SUGGESTIONS}
                        />
                        <p className="mt-1 text-[11px] text-stone-500">Can't find it? Just type your university's name.</p>
                    </div>

                    {/* Course */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Course <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={eduDraft.courseName || ''}
                            onChange={(e) => {
                                const newCourse = e.target.value;
                                const validSpecs = COURSE_SPECIALIZATION_MAP[newCourse] || [];
                                updateEdu({
                                    courseName: newCourse,
                                    specialization: validSpecs.includes(eduDraft.specialization) ? eduDraft.specialization : '',
                                });
                            }}
                            placeholder="Search courses..."
                            suggestions={EDUCATION_COURSE_MAP[educationLevel] || COURSE_SUGGESTIONS}
                        />
                    </div>

                    {/* Specialization */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Specialization <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={eduDraft.specialization || ''}
                            onChange={(e) => updateEdu({ specialization: e.target.value })}
                            placeholder="Search specializations..."
                            suggestions={COURSE_SPECIALIZATION_MAP[eduDraft.courseName] || SPECIALIZATION_SUGGESTIONS}
                        />
                    </div>

                    {/* Course Type */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Course Type</label>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {getCourseTypeOptions().map((type) => (
                                <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="courseType"
                                        value={type}
                                        checked={eduDraft.courseType === type}
                                        onChange={(e) => updateEdu({ courseType: e.target.value })}
                                        className="w-4 h-4 accent-[#8B1E2F] cursor-pointer"
                                    />
                                    <span className="text-[13px] font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                        {type}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Course Duration */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                            <label className="mb-1 block text-[12px] font-semibold text-stone-900">Start Year</label>
                            <select
                                value={eduDraft.startYear || ''}
                                onChange={(e) => updateEdu({ startYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year</option>
                                {generateEducationYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[12px] font-semibold text-stone-900">End Year</label>
                            <select
                                value={eduDraft.endYear || ''}
                                onChange={(e) => updateEdu({ endYear: e.target.value })}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                            >
                                <option value="">Select Year (or leave blank if ongoing)</option>
                                {generateEducationYears().map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Grading System */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Grading System</label>
                        <select
                            value={eduDraft.gradingSystem || ''}
                            onChange={(e) => updateEdu({ gradingSystem: e.target.value, marks: '' })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select grading system</option>
                            {getGradingSystemOptions().map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Marks / CGPA */}
                    <MarksField eduDraft={eduDraft} updateEdu={updateEdu} />
                </div>
            )}

            {/* CASE 3: Class XII */}
            {isClassXII && (
                <div className="space-y-4">
                    {/* Education Board */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Education Board <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={eduDraft.board || ''}
                            onChange={(e) => updateEdu({ board: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Board</option>
                            {getBoardOptions().map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* School Name */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            School Name <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={eduDraft.schoolName || ''}
                            onChange={(e) => updateEdu({ schoolName: e.target.value })}
                            placeholder="Search schools..."
                            suggestions={SCHOOL_NAME_SUGGESTIONS}
                        />
                    </div>

                    {/* Passing Year */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Passing Year <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={eduDraft.passingYear || ''}
                            onChange={(e) => updateEdu({ passingYear: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Year</option>
                            {generateEducationYears().map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* School Medium */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">School Medium</label>
                        <select
                            value={eduDraft.schoolMedium || ''}
                            onChange={(e) => updateEdu({ schoolMedium: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Medium</option>
                            {getSchoolMediumOptions().map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Marks */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Marks (% or CGPA)</label>
                        <input
                            type="text"
                            value={eduDraft.marks || ''}
                            onChange={(e) => updateEdu({ marks: e.target.value })}
                            placeholder="e.g., 85"
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        />
                    </div>

                    {/* Stream */}
                    <div>
                        <label className="mb-2 block text-[12px] font-semibold text-stone-900">Stream</label>
                        <div className="flex flex-wrap gap-3 sm:gap-4">
                            {getStreamOptions().map((streamOpt) => (
                                <label key={streamOpt} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="stream"
                                        value={streamOpt}
                                        checked={eduDraft.stream === streamOpt}
                                        onChange={(e) => updateEdu({ stream: e.target.value })}
                                        className="w-4 h-4 accent-[#8B1E2F] cursor-pointer"
                                    />
                                    <span className="text-[13px] font-medium text-stone-700 group-hover:text-stone-900 transition-colors">
                                        {streamOpt}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CASE 4: Class X */}
            {isClassX && (
                <div className="space-y-4">
                    {/* Education Board */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Education Board <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={eduDraft.board || ''}
                            onChange={(e) => updateEdu({ board: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Board</option>
                            {getBoardOptions().map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* School Name */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            School Name <span className="text-red-500">*</span>
                        </label>
                        <AutocompleteInput
                            value={eduDraft.schoolName || ''}
                            onChange={(e) => updateEdu({ schoolName: e.target.value })}
                            placeholder="Search schools..."
                            suggestions={SCHOOL_NAME_SUGGESTIONS}
                        />
                    </div>

                    {/* Passing Year */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">
                            Passing Year <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={eduDraft.passingYear || ''}
                            onChange={(e) => updateEdu({ passingYear: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Year</option>
                            {generateEducationYears().map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    {/* School Medium */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">School Medium</label>
                        <select
                            value={eduDraft.schoolMedium || ''}
                            onChange={(e) => updateEdu({ schoolMedium: e.target.value })}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        >
                            <option value="">Select Medium</option>
                            {getSchoolMediumOptions().map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Marks */}
                    <div>
                        <label className="mb-1 block text-[12px] font-semibold text-stone-900">Marks (% or CGPA)</label>
                        <input
                            type="text"
                            value={eduDraft.marks || ''}
                            onChange={(e) => updateEdu({ marks: e.target.value })}
                            placeholder="e.g., 85"
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

const BLANK_CERTIFICATION = {
    name: '',
    organization: '',
    completionId: '',
    credentialUrl: '',
    startMonth: '',
    startYear: '',
    expiryMonth: '',
    expiryYear: '',
    noExpiry: false,
};

function generateCertYears() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear + 20; y >= currentYear - 40; y--) {
        years.push(String(y));
    }
    return years;
}
const BLANK_PROJECT = {
    title: '',
    client: '',
    projectLink: '',
    status: 'In Progress',
    workedFromMonth: '',
    workedFromYear: '',
    workedTillMonth: '',
    workedTillYear: '',
    location: '',
    site: '',
    teamSize: '',
    role: '',
    roleDescription: '',
    skills: [],
};

const PROJECT_TEAM_SIZE_OPTIONS = ['Individual', '2–5', '6–10', '11–20', '20+'];
const BLANK_PORTFOLIO = { title: '', description: '', url: '', thumbnail: '' };

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    const [activeModal, setActiveModal] = useState(null);
    const [skillsDraft, setSkillsDraft] = useState([]);
    const [expDraft, setExpDraft] = useState(BLANK_EXPERIENCE);
    const [editingExpIndex, setEditingExpIndex] = useState(null);
    const [eduDraft, setEduDraft] = useState(BLANK_EDUCATION);
    const [editingEduIndex, setEditingEduIndex] = useState(null);
    const [certDraft, setCertDraft] = useState(BLANK_CERTIFICATION);
    const [editingCertIndex, setEditingCertIndex] = useState(null);
    const [photoActionSaving, setPhotoActionSaving] = useState(false);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
    const [selectedPhotoPreview, setSelectedPhotoPreview] = useState('');
    const [photoDeleteConfirm, setPhotoDeleteConfirm] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [projectDraft, setProjectDraft] = useState(BLANK_PROJECT);
    const [editingProjectIndex, setEditingProjectIndex] = useState(null);
    const [showProjectDetails, setShowProjectDetails] = useState(false);
    const [portfolioDraft, setPortfolioDraft] = useState(BLANK_PORTFOLIO);
    const [editingPortfolioIndex, setEditingPortfolioIndex] = useState(null);
    const [languagesDraft, setLanguagesDraft] = useState([]);
    const [headlineDraft, setHeadlineDraft] = useState('');
    const [nameDraft, setNameDraft] = useState('');
    const [aboutDraft, setAboutDraft] = useState('');
    const [locationDraft, setLocationDraft] = useState('');
    const [stateDraft, setStateDraft] = useState('');
    const [cityDraft, setCityDraft] = useState('');
    const [phoneDraft, setPhoneDraft] = useState('');
    const [contactModalMode, setContactModalMode] = useState('contact');
    const [workPrefDraft, setWorkPrefDraft] = useState('');
    const [availabilityDraft, setAvailabilityDraft] = useState('');
    const [socialDraft, setSocialDraft] = useState({ github: '', linkedin: '', website: '' });
    const [urlErrors, setUrlErrors] = useState({});

    const photoInputRef = useRef(null);
    const resumeInputRef = useRef(null);
    const [resumeUploading, setResumeUploading] = useState(false);
    const [resumeProgress, setResumeProgress] = useState(null);
    const [resumeDeleteConfirm, setResumeDeleteConfirm] = useState(false);

    // Derived data
    const { percent, missing, items } = useMemo(() => getCompletion(profile), [profile]);
    const skillsList = profile?.profile?.skills || [];
    const experienceList = profile?.profile?.experience || [];
    const educationList = profile?.profile?.education || [];
    const certifications = profile?.profile?.certifications || [];
    const languages = profile?.profile?.languages || [];
    const projects = profile?.profile?.projects || [];
    const portfolio = profile?.profile?.portfolio || [];
    const resumeUrl = profile?.profile?.resumeUrl || '';
    const resumeFilename = profile?.profile?.resumeFilename || '';
    const resumeNameBase = resumeFilename
        ? resumeFilename
        : resumeUrl
            ? decodeURIComponent(resumeUrl.split('/').pop()?.split('?')[0] || 'Resume')
            : 'Resume';
    const resumeName = resumeNameBase.toLowerCase().endsWith('.pdf') ? resumeNameBase : `${resumeNameBase}.pdf`;

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timeout = window.setTimeout(() => setToast(''), 1000);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    async function fetchProfile() {
        try {
            const { data } = await axiosInstance.get('/candidate/me/profile');
            setProfile(data);
        } catch (err) {
            console.error('Failed to fetch profile:', err);
        } finally {
            setLoading(false);
        }
    }

    // Modals
    function openModal(name) {
        setActiveModal(name);
    }
    function closeModal() {
        setActiveModal(null);
        setEditingExpIndex(null);
        setEditingEduIndex(null);
        setEditingCertIndex(null);
        setEditingProjectIndex(null);
        setEditingPortfolioIndex(null);
        setShowProjectDetails(false);
    }

    function openExperienceModal(index) {
        if (index !== null) {
            const entry = experienceList[index];
            const skills = Array.isArray(entry.skills) && entry.skills.length
                ? entry.skills
                : (entry.designation || '').split(',').map((s) => s.trim()).filter(Boolean);
            setExpDraft({ ...entry, skills });
            setEditingExpIndex(index);
        } else {
            setExpDraft(BLANK_EXPERIENCE);
            setEditingExpIndex(null);
        }
        openModal('experience');
    }

    function openEducationModal(index, prefilledLevel = null) {
        if (index !== null) {
            setEduDraft(educationList[index]);
            setEditingEduIndex(index);
        } else {
            if (prefilledLevel) {
                setEduDraft({ ...BLANK_EDUCATION, educationLevel: prefilledLevel });
            } else {
                setEduDraft(BLANK_EDUCATION);
            }
            setEditingEduIndex(null);
        }
        openModal('education');
    }

    function openCertificationModal(index) {
        if (index !== null) {
            setCertDraft(certifications[index]);
            setEditingCertIndex(index);
        } else {
            setCertDraft(BLANK_CERTIFICATION);
            setEditingCertIndex(null);
        }
        openModal('certification');
    }

    function openProjectModal(index) {
        if (index !== null) {
            const existing = projects[index];
            setProjectDraft(existing);
            setEditingProjectIndex(index);
            setShowProjectDetails(
                !!(existing.location || existing.site || existing.teamSize || existing.role || existing.roleDescription || (existing.skills || []).length > 0)
            );
        } else {
            setProjectDraft(BLANK_PROJECT);
            setEditingProjectIndex(null);
            setShowProjectDetails(false);
        }
        openModal('project');
    }

    function openPortfolioModal(index) {
        if (index !== null) {
            setPortfolioDraft(portfolio[index]);
            setEditingPortfolioIndex(index);
        } else {
            setPortfolioDraft(BLANK_PORTFOLIO);
            setEditingPortfolioIndex(null);
        }
        openModal('portfolio');
    }

    function openHeadlineModal() {
        setHeadlineDraft(profile?.profile?.headline || '');
        openModal('headline');
    }

    function closePhotoPreview() {
        if (selectedPhotoPreview?.startsWith('blob:')) {
            URL.revokeObjectURL(selectedPhotoPreview);
        }
        setSelectedPhotoFile(null);
        setSelectedPhotoPreview('');
        setPhotoDeleteConfirm(false);
    }

    function cancelPhotoPreview() {
        closePhotoPreview();
        openModal('photoActions');
    }

    function openPhotoModal() {
        closePhotoPreview();
        openModal('photoActions');
    }

    function openNameModal() {
        setNameDraft(profile?.name || '');
        openModal('name');
    }

    function openAboutModal() {
        setAboutDraft(profile?.profile?.about || '');
        openModal('about');
    }

    function openContactModal(mode = 'contact') {
        setLocationDraft(profile?.profile?.location || '');
        setPhoneDraft(profile?.profile?.phone || '');
        setContactModalMode(mode);
        openModal('contact');
    }

    // Opens one combined editor for every field shown in the top profile card
    // (name, location, phone, availability) — everything except email.
    function openBasicInfoModal() {
        setNameDraft(profile?.name || '');
        const { city, state } = parseLocation(profile?.profile?.location || '');
        setCityDraft(city);
        setStateDraft(state);
        setPhoneDraft(profile?.profile?.phone || '');
        setAvailabilityDraft(profile?.profile?.availability || '');
        openModal('basicInfo');
    }

    async function shareCurrentLocation() {
        if (!navigator.geolocation) {
            setToast('Location sharing is not supported by this browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                try {
                    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`;
                    const response = await fetch(url, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'job-portal-app/1.0'
                        }
                    });
                    const data = await response.json();
                    const address = data?.address || {};
                    const cityName = address.city || address.town || address.village || address.hamlet || address.county;
                    const stateName = address.state;
                    const label = [cityName, stateName].filter(Boolean).join(', ');
                    if (label) {
                        setLocationDraft(label);
                        if (cityName) setCityDraft(cityName);
                        if (stateName) setStateDraft(stateName);
                        setToast('Current location added');
                    } else {
                        setToast('Could not determine your city — please type it in manually');
                    }
                } catch (error) {
                    console.error('Reverse geocoding failed:', error);
                    setToast('Could not resolve your location — please type it in manually');
                }
            },
            () => setToast('Unable to access your current location'),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    function openSkillsModal() {
        setSkillsDraft(skillsList);
        openModal('skills');
    }

    function openLanguagesModal() {
        setLanguagesDraft(languages);
        openModal('languages');
    }

    // Save methods
    async function saveExperience() {
        if (!expDraft.company || !expDraft.role) {
            setToast('Please fill in all required fields');
            return;
        }

        // Start year must be before the end year (skip when this is a current role — no end date yet).
        const { fromYear, toYear } = getExperienceDates(expDraft);
        if (!expDraft.current && fromYear && toYear && parseInt(fromYear, 10) >= parseInt(toYear, 10)) {
            setToast('Start year must be before the end year');
            return;
        }

        // Avoid adding the same company + job title as an existing entry.
        const isDuplicate = experienceList.some(
            (exp, i) =>
                i !== editingExpIndex &&
                (exp.company || '').trim().toLowerCase() === (expDraft.company || '').trim().toLowerCase() &&
                (exp.role || '').trim().toLowerCase() === (expDraft.role || '').trim().toLowerCase()
        );
        if (isDuplicate) {
            setToast('You already have an experience entry for this company and job title');
            return;
        }

        setSaving(true);
        try {
            const updated = [...experienceList];
            if (editingExpIndex !== null) {
                updated[editingExpIndex] = expDraft;
            } else {
                updated.push(expDraft);
            }
            await axiosInstance.put('/profile/experience', { experience: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, experience: updated },
            }));
            setToast('Experience saved successfully!');
            closeModal();
        } catch (err) {
            console.error('Failed to save experience:', err);
            setToast('Failed to save experience');
        } finally {
            setSaving(false);
        }
    }

    async function saveEducation() {
        // Validate education level is selected
        if (!eduDraft.educationLevel) {
            setToast('Please select highest education level');
            return;
        }

        const level = eduDraft.educationLevel;

        // Validate based on education level
        if (level === 'Doctorate' || level === 'PostDoctorate') {
            if (!eduDraft.institution?.trim() || !eduDraft.doctorateType?.trim() || !eduDraft.specialization?.trim()) {
                setToast('Please fill in all required fields');
                return;
            }
        } else if (['Masters', 'Bachelors', 'Diploma'].includes(level)) {
            if (!eduDraft.institution?.trim() || !eduDraft.courseName?.trim() || !eduDraft.specialization?.trim()) {
                setToast('Please fill in all required fields');
                return;
            }
        } else if (level === 'ClassXII') {
            if (!eduDraft.board?.trim() || !eduDraft.schoolName?.trim() || !eduDraft.passingYear?.trim()) {
                setToast('Please fill in all required fields');
                return;
            }
        } else if (level === 'ClassX') {
            if (!eduDraft.board?.trim() || !eduDraft.schoolName?.trim() || !eduDraft.passingYear?.trim()) {
                setToast('Please fill in all required fields');
                return;
            }
        }

        // Start year must be before the end year within this entry.
        if (isMastersBachelorsDiplomaLevel(level) && eduDraft.startYear && eduDraft.endYear) {
            if (parseInt(eduDraft.startYear, 10) >= parseInt(eduDraft.endYear, 10)) {
                setToast('Start year must be before the end year');
                return;
            }
        }
        if ((level === 'Doctorate' || level === 'PostDoctorate') && eduDraft.researchStartYear && eduDraft.researchEndYear) {
            if (parseInt(eduDraft.researchStartYear, 10) >= parseInt(eduDraft.researchEndYear, 10)) {
                setToast('Research start year must be before the completion year');
                return;
            }
        }

        // Keep years chronologically consistent across all education entries:
        // Class X < Class XII < Graduation/Diploma < Masters < Doctorate.
        const thisYear = getEducationYear(eduDraft);
        const thisRank = EDUCATION_LEVEL_RANK[level];
        if (thisYear && thisRank) {
            for (let i = 0; i < educationList.length; i++) {
                if (i === editingEduIndex) continue;
                const other = educationList[i];
                const otherYear = getEducationYear(other);
                const otherRank = EDUCATION_LEVEL_RANK[other.educationLevel];
                if (!otherYear || !otherRank) continue;
                if (otherRank < thisRank && parseInt(otherYear, 10) >= parseInt(thisYear, 10)) {
                    setToast(`This year must be after your ${formatEducationLevelLabel(other.educationLevel)} year (${otherYear})`);
                    return;
                }
                if (otherRank > thisRank && parseInt(otherYear, 10) <= parseInt(thisYear, 10)) {
                    setToast(`This year must be before your ${formatEducationLevelLabel(other.educationLevel)} year (${otherYear})`);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const updated = [...educationList];
            if (editingEduIndex !== null) {
                updated[editingEduIndex] = eduDraft;
            } else {
                updated.push(eduDraft);
            }
            await axiosInstance.put('/profile/education', { education: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, education: updated },
            }));
            setToast('Education saved successfully!');
            closeModal();
        } catch (err) {
            console.error('Failed to save education:', err);
            setToast('Failed to save education');
        } finally {
            setSaving(false);
        }
    }

    async function saveCertification() {
        if (!certDraft.name) {
            setToast('Please fill in all required fields');
            return;
        }
        setSaving(true);
        try {
            const updated = [...certifications];
            const cleanedDraft = {
                ...certDraft,
                organization: (certDraft.organization || '').trim(),
            };
            if (editingCertIndex !== null) {
                updated[editingCertIndex] = cleanedDraft;
            } else {
                updated.push(cleanedDraft);
            }
            await axiosInstance.put('/profile/certifications', { certifications: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, certifications: updated },
            }));
            setToast('Certification saved successfully!');
            closeModal();
        } catch (err) {
            console.error('Failed to save certification:', err);
            setToast('Failed to save certification');
        } finally {
            setSaving(false);
        }
    }

    async function saveProject() {
        const title = (projectDraft.title || '').trim();
        const status = projectDraft.status || '';
        const workedFromMonth = (projectDraft.workedFromMonth || '').trim();
        const workedFromYear = (projectDraft.workedFromYear || '').trim();
        const workedTillMonth = (projectDraft.workedTillMonth || '').trim();
        const workedTillYear = (projectDraft.workedTillYear || '').trim();

        if (!title) {
            setToast('Please enter a project title');
            return;
        }
        if (!status) {
            setToast('Please select a project status');
            return;
        }
        if (!workedFromMonth || !workedFromYear) {
            setToast('Please select when you started working on this project');
            return;
        }
        if (status === 'Completed' && (!workedTillMonth || !workedTillYear)) {
            setToast('Please select when this project was completed');
            return;
        }

        if (status === 'Completed') {
            const monthNames = generateMonthNames();
            const fromYearNum = Number(workedFromYear);
            const tillYearNum = Number(workedTillYear);
            const fromMonthNum = monthNames.indexOf(workedFromMonth);
            const tillMonthNum = monthNames.indexOf(workedTillMonth);

            if (
                Number.isFinite(fromYearNum) &&
                Number.isFinite(tillYearNum) &&
                fromMonthNum >= 0 &&
                tillMonthNum >= 0 &&
                (fromYearNum > tillYearNum || (fromYearNum === tillYearNum && fromMonthNum >= tillMonthNum))
            ) {
                setToast('Project start date must be before its completion date');
                return;
            }
        }

        const cleanedDraft = {
            ...projectDraft,
            title,
            client: (projectDraft.client || '').trim(),
            projectLink: (projectDraft.projectLink || '').trim(),
            workedFromYear,
            workedTillMonth: status === 'Completed' ? workedTillMonth : '',
            workedTillYear: status === 'Completed' ? workedTillYear : '',
        };

        setSaving(true);
        try {
            const updated = [...projects];
            if (editingProjectIndex !== null) {
                updated[editingProjectIndex] = cleanedDraft;
            } else {
                updated.push(cleanedDraft);
            }
            await axiosInstance.put('/profile/projects', { projects: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, projects: updated },
            }));
            setToast('Project saved successfully!');
            closeModal();
        } catch (err) {
            console.error('Failed to save project:', err);
            setToast('Failed to save project');
        } finally {
            setSaving(false);
        }
    }

    async function savePortfolio() {
        if (!portfolioDraft.title) {
            setToast('Please enter a portfolio title');
            return;
        }
        setSaving(true);
        try {
            const updated = [...portfolio];
            if (editingPortfolioIndex !== null) {
                updated[editingPortfolioIndex] = portfolioDraft;
            } else {
                updated.push(portfolioDraft);
            }
            await axiosInstance.put('/profile/portfolio', { portfolio: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, portfolio: updated },
            }));
            setToast('Portfolio item saved successfully!');
            closeModal();
        } catch (err) {
            console.error('Failed to save portfolio:', err);
            setToast('Failed to save portfolio');
        } finally {
            setSaving(false);
        }
    }

    async function saveHeadline() {
        if (!headlineDraft.trim()) {
            setToast('Please enter a headline');
            return;
        }
        setSaving(true);
        try {
            await axiosInstance.put('/profile', { headline: headlineDraft });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, headline: headlineDraft },
            }));
            setToast('Headline saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save headline:', err);
            setToast('Failed to save headline');
        } finally {
            setSaving(false);
        }
    }

    async function saveName() {
        const name = nameDraft.trim();
        if (!name) {
            setToast('Please enter your name');
            return;
        }
        setSaving(true);
        try {
            const { data } = await axiosInstance.put('/candidate/me/profile', { name });
            setProfile((prev) => ({ ...prev, ...data, name }));
            localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user') || '{}'), name }));
            setToast('Name saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save name:', err);
            setToast('Failed to save name');
        } finally {
            setSaving(false);
        }
    }

    async function saveBasicInfo() {
        const name = nameDraft.trim();
        if (!name) {
            setToast('Please enter your name');
            return;
        }
        const combinedLocation = [cityDraft.trim(), stateDraft.trim()].filter(Boolean).join(', ');
        setSaving(true);
        try {
            const [{ data: candidateData }] = await Promise.all([
                axiosInstance.put('/candidate/me/profile', { name }),
                axiosInstance.put('/profile', {
                    location: combinedLocation,
                    phone: phoneDraft,
                    availability: availabilityDraft,
                }),
            ]);
            setProfile((prev) => ({
                ...prev,
                ...candidateData,
                name,
                profile: {
                    ...prev.profile,
                    location: combinedLocation,
                    phone: phoneDraft,
                    availability: availabilityDraft,
                },
            }));
            localStorage.setItem('user', JSON.stringify({ ...JSON.parse(localStorage.getItem('user') || '{}'), name }));
            setToast('Profile updated!');
            closeModal();
        } catch (err) {
            console.error('Failed to save profile info:', err);
            setToast('Failed to save profile info');
        } finally {
            setSaving(false);
        }
    }

    async function saveAbout() {
        if (!aboutDraft.trim()) {
            setToast('Please enter your bio');
            return;
        }
        setSaving(true);
        try {
            await axiosInstance.put('/profile', { about: aboutDraft });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, about: aboutDraft },
            }));
            setToast('Bio saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save about:', err);
            setToast('Failed to save bio');
        } finally {
            setSaving(false);
        }
    }

    async function saveContact() {
        setSaving(true);
        try {
            await axiosInstance.put('/profile', { location: locationDraft, phone: phoneDraft });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, location: locationDraft, phone: phoneDraft },
            }));
            setToast('Contact info saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save contact:', err);
            setToast('Failed to save contact info');
        } finally {
            setSaving(false);
        }
    }

    async function saveSkills() {
        setSaving(true);
        try {
            await axiosInstance.put('/profile', { skills: skillsDraft });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, skills: skillsDraft },
            }));
            setToast('Skills saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save skills:', err);
            setToast('Failed to save skills');
        } finally {
            setSaving(false);
        }
    }

    async function saveLanguages() {
        setSaving(true);
        try {
            await axiosInstance.put('/profile', { languages: languagesDraft });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, languages: languagesDraft },
            }));
            setToast('Languages saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save languages:', err);
            setToast('Failed to save languages');
        } finally {
            setSaving(false);
        }
    }

    async function saveSocial() {
        setUrlErrors({});
        const errors = {};
        if (socialDraft.github && !isValidUrl(socialDraft.github)) errors.github = true;
        if (socialDraft.linkedin && !isValidUrl(socialDraft.linkedin)) errors.linkedin = true;
        if (socialDraft.website && !isValidUrl(socialDraft.website)) errors.website = true;

        if (Object.keys(errors).length > 0) {
            setUrlErrors(errors);
            setToast('Invalid URL format');
            return;
        }

        setSaving(true);
        try {
            await axiosInstance.put('/profile/social', socialDraft);
            setProfile((prev) => ({
                ...prev,
                socialLinks: socialDraft,
            }));
            setToast('Social links saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save social links:', err);
            setToast('Failed to save social links');
        } finally {
            setSaving(false);
        }
    }

    async function saveWorkPref() {
        setSaving(true);
        try {
            await axiosInstance.put('/profile', { 
                workPreferences: workPrefDraft,
                availability: availabilityDraft
            });
            setProfile((prev) => ({
                ...prev,
                profile: { 
                    ...prev.profile, 
                    workPreferences: workPrefDraft,
                    availability: availabilityDraft
                },
            }));
            setToast('Work preferences saved!');
            closeModal();
        } catch (err) {
            console.error('Failed to save work preferences:', err);
            setToast('Failed to save work preferences');
        } finally {
            setSaving(false);
        }
    }

    // Delete methods
    async function deleteExperience(index) {
        if (!confirm('Are you sure you want to delete this experience?')) return;
        try {
            const updated = experienceList.filter((_, i) => i !== index);
            await axiosInstance.put('/profile/experience', { experience: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, experience: updated },
            }));
            setToast('Experience deleted');
        } catch (err) {
            console.error('Failed to delete experience:', err);
            setToast('Failed to delete experience');
        }
    }

    async function deleteEducation(index) {
        if (!confirm('Are you sure you want to delete this education?')) return;
        try {
            const updated = educationList.filter((_, i) => i !== index);
            await axiosInstance.put('/profile/education', { education: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, education: updated },
            }));
            setToast('Education deleted');
        } catch (err) {
            console.error('Failed to delete education:', err);
            setToast('Failed to delete education');
        }
    }

    async function deleteCertification(index) {
        if (!confirm('Are you sure you want to delete this certification?')) return;
        try {
            const updated = certifications.filter((_, i) => i !== index);
            await axiosInstance.put('/profile/certifications', { certifications: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, certifications: updated },
            }));
            setToast('Certification deleted');
        } catch (err) {
            console.error('Failed to delete certification:', err);
            setToast('Failed to delete certification');
        }
    }

    async function deleteProject(index) {
        if (!confirm('Are you sure you want to delete this project?')) return;
        try {
            const updated = projects.filter((_, i) => i !== index);
            await axiosInstance.put('/profile/projects', { projects: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, projects: updated },
            }));
            setToast('Project deleted');
        } catch (err) {
            console.error('Failed to delete project:', err);
            setToast('Failed to delete project');
        }
    }

    async function deletePortfolio(index) {
        if (!confirm('Are you sure you want to delete this portfolio item?')) return;
        try {
            const updated = portfolio.filter((_, i) => i !== index);
            await axiosInstance.put('/profile/portfolio', { portfolio: updated });
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, portfolio: updated },
            }));
            setToast('Portfolio item deleted');
        } catch (err) {
            console.error('Failed to delete portfolio item:', err);
            setToast('Failed to delete portfolio item');
        }
    }

    async function handlePhotoSelect(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setToast('Please select a valid image file');
            return;
        }
        if (file.size > MAX_PHOTO_BYTES) {
            setToast('Photo must be less than 5MB');
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        setSelectedPhotoFile(file);
        setSelectedPhotoPreview(previewUrl);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setPhotoDeleteConfirm(false);
        openModal('photoPreview');
    }

    const onCropComplete = useCallback((croppedArea, croppedAreaPixelsValue) => {
        setCroppedAreaPixels(croppedAreaPixelsValue);
    }, []);

    async function handlePhotoSave() {
        if (!selectedPhotoPreview || !croppedAreaPixels) {
            setToast('Please select and adjust a photo before saving');
            return;
        }

        setPhotoActionSaving(true);
        try {
            const croppedBlob = await getCroppedImg(selectedPhotoPreview, croppedAreaPixels);
            const formData = new FormData();
            formData.append('file', croppedBlob, selectedPhotoFile?.name || 'profile-photo.jpg');

            const { data } = await axiosInstance.post('/profile/photo', formData);
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, profilePictureUrl: data.profilePictureUrl },
            }));
            setToast('Photo uploaded!');
            closePhotoPreview();
            closeModal();
        } catch (err) {
            console.error('Failed to upload photo:', err);
            setToast('Failed to upload photo');
        } finally {
            setPhotoActionSaving(false);
        }
    }

    async function handlePhotoDelete() {
        if (!profile?.profile?.profilePictureUrl) return;
        setPhotoDeleteConfirm(true);
    }

    async function confirmPhotoDelete() {
        setPhotoActionSaving(true);
        try {
            await axiosInstance.delete('/profile/photo');
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, profilePictureUrl: '' },
            }));
            setToast('Photo removed');
            setPhotoDeleteConfirm(false);
            closeModal();
        } catch (err) {
            console.error('Failed to delete profile photo:', err);
            setToast('Failed to remove photo');
        } finally {
            setPhotoActionSaving(false);
        }
    }

    async function handleResumeUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setToast('Resume must be a PDF');
            e.target.value = '';
            return;
        }
        if (file.size > MAX_RESUME_BYTES) {
            setToast('Resume must be less than 10MB');
            e.target.value = '';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        setResumeUploading(true);
        setResumeProgress(0);

        try {
            const { data } = await axiosInstance.post('/profile/resume', formData, {
                onUploadProgress: (ev) => {
                    if (ev.total) {
                        const progress = Math.round((ev.loaded / ev.total) * 100);
                        if (progress > 0 && progress < 100) {
                            setResumeProgress(progress);
                        }
                    }
                },
            });
            const updatedProfile = data.candidate?.profile || null;
            setProfile((prev) => ({
                ...prev,
                profile: updatedProfile
                    ? updatedProfile
                    : { ...prev.profile, resumeUrl: data.resumeUrl, resumeFilename: file.name },
            }));
            setToast('Resume uploaded!');
        } catch (err) {
            console.error('Failed to upload resume:', err);
            setToast(err?.response?.data?.error || 'Failed to upload resume');
        } finally {
            setResumeUploading(false);
            setResumeProgress(null);
            e.target.value = '';
        }
    }

    async function handleResumeView() {
        try {
            const response = await axiosInstance.get('/profile/resume/download', {
                responseType: 'blob',
            });
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'application/pdf' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.download = resumeName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => URL.revokeObjectURL(url), 10000);
        } catch (err) {
            console.error('Failed to fetch resume for viewing:', err);
            setToast(err?.response?.data?.error || 'Unable to open resume');
        }
    }

    function handleResumeDelete() {
        if (!resumeUrl) return;
        setResumeDeleteConfirm(true);
    }

    async function confirmResumeDelete() {
        if (!resumeUrl) return;
        try {
            await axiosInstance.delete('/profile/resume');
            setProfile((prev) => ({
                ...prev,
                profile: { ...prev.profile, resumeUrl: '', resumeFilename: '' },
            }));
            setResumeDeleteConfirm(false);
            setToast('Resume deleted');
        } catch (err) {
            console.error('Failed to delete resume:', err);
            setToast(err?.response?.data?.error || 'Failed to delete resume');
        }
    }

    function cancelResumeDelete() {
        setResumeDeleteConfirm(false);
    }

    function updateSocialDraft(key, value) {
        setSocialDraft((prev) => ({ ...prev, [key]: value }));
        setUrlErrors((prev) => ({ ...prev, [key]: false }));
    }

    if (loading) {
        return <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" color={MAROON} /></div>;
    }

    return (
        <div className="portal-theme min-h-[100dvh] w-full overflow-x-clip" style={{ background: '#FFF7F2', fontFamily: FONT_BODY }}>
            <CandidateNavbar />

            <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
                <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
                    {/* Left Sidebar - Quick Links with Profile Summary */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24 space-y-4">
                            {/* Quick Links */}
                            <QuickLinks 
                                items={items.map(item => ({
                                    ...item,
                                    onAdd: () => {
                                        if (item.anchor === 'section-photo') openPhotoModal();
                                        else if (item.anchor === 'section-headline') openHeadlineModal();
                                        else if (item.anchor === 'section-about') openAboutModal();
                                        else if (item.anchor === 'section-contact') openContactModal();
                                        else if (item.anchor === 'section-skills') openSkillsModal();
                                        else if (item.anchor === 'section-experience') openExperienceModal(null);
                                        else if (item.anchor === 'section-education') openEducationModal(null);
                                        else if (item.anchor === 'section-certifications') openCertificationModal(null);
                                        else if (item.anchor === 'section-languages') openLanguagesModal();
                                        else if (item.anchor === 'section-projects') openProjectModal(null);
                                        else if (item.anchor === 'section-portfolio') openPortfolioModal(null);
                                        else if (item.anchor === 'section-resume') resumeInputRef.current?.click();
                                        else if (item.anchor === 'section-social') {
                                            setSocialDraft(profile?.socialLinks || { github: '', linkedin: '', website: '' });
                                            openModal('social');
                                        }
                                        else if (item.anchor === 'section-preferences') {
                                            setWorkPrefDraft(profile?.profile?.workPreferences || '');
                                            setAvailabilityDraft(profile?.profile?.availability || '');
                                            openModal('workpref');
                                        }
                                    }
                                }))}
                            />
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="space-y-6">
                        {/* Profile Header Card */}
                        <div className="rounded-[20px] border border-stone-200/70 bg-white p-5 shadow-[0_12px_28px_-24px_rgba(92,20,32,0.28)] sm:p-6">
                            <div className="flex flex-col gap-6">
                                {/* Top Row: Avatar + identity details */}
                                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[154px_minmax(0,1fr)]">
                                    {/* Avatar - Smaller */}
                                    <div className="relative flex h-[142px] w-[142px] shrink-0 items-center justify-center justify-self-center xl:justify-self-start">
                                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#E9E7E4" strokeWidth="3" />
                                            <circle cx="50" cy="50" r="45" fill="none" stroke={strengthColor(percent)} strokeWidth="3.5" strokeDasharray={`${(percent / 100) * 282.74} 282.74`} strokeLinecap="round" />
                                        </svg>
                                        <div className="flex h-[124px] w-[124px] items-center justify-center rounded-full bg-[#F3F4F7]">
                                        <Avatar
                                                name={profile?.name || 'Candidate'}
                                            src={profile?.profile?.profilePictureUrl}
                                            size={116}
                                        />
                                        </div>
                                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[12px] font-bold shadow-[0_3px_12px_rgba(0,0,0,0.08)]" style={{ color: strengthColor(percent) }}>
                                            {percent}%
                                        </span>
                                        <button
                                            type="button"
                                            onClick={openPhotoModal}
                                            className="absolute right-0 top-1 flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white shadow-md transition-transform hover:scale-110"
                                            aria-label="Change profile photo"
                                        >
                                            <Camera size={14} color={MAROON} />
                                        </button>
                                        <input
                                            ref={photoInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoSelect}
                                            className="hidden"
                                            id="photo-upload"
                                        />
                                    </div>

                                    {/* Name and Contact Info */}
                                    <div className="min-w-0 pt-1">
                                        <div className="flex items-center gap-3">
                                            <h1 className="truncate text-[24px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                                {profile?.name || 'Candidate'}
                                            </h1>
                                            <button
                                                onClick={openBasicInfoModal}
                                                aria-label="Edit profile info"
                                                className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                        </div>
                                        <p className="mt-0.5 text-[12px] text-stone-500">Profile last updated - <span className="font-medium text-stone-700">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></p>
                                        
                                        <div className="my-4 h-px bg-stone-200" />
                                        <div className="grid items-start gap-x-8 gap-y-3 sm:grid-cols-2">
                                            {profile?.profile?.location ? (
                                                <span className="flex min-h-5 min-w-0 items-center gap-2 truncate text-[13px] text-stone-700"><MapPin size={14} className="shrink-0 text-stone-500" />{profile.profile.location}</span>
                                            ) : (
                                                <button onClick={() => openContactModal('location')} className="flex min-h-5 items-center gap-2 text-left text-[13px] font-semibold text-[#3564A0] hover:underline"><MapPin size={14} className="shrink-0" />Add location</button>
                                            )}
                                            {profile?.profile?.phone ? (
                                                <span className="flex min-h-5 min-w-0 items-center gap-2 truncate text-[13px] text-stone-700"><Phone size={14} className="shrink-0 text-stone-500" />{profile.profile.phone}</span>
                                            ) : (
                                                <button onClick={() => openContactModal('phone')} className="flex min-h-5 items-center gap-2 text-left text-[13px] font-semibold text-[#3564A0] hover:underline"><Phone size={14} className="shrink-0" />Add mobile number</button>
                                            )}
                                            <span className="flex min-h-5 items-center gap-2 text-[13px] text-stone-700"><Briefcase size={14} className="shrink-0 text-stone-500" />{experienceList.length === 0 ? 'Fresher' : 'Experienced'}</span>
                                            <div className="flex min-h-5 min-w-0 items-center gap-2"><Mail size={14} className="shrink-0 text-stone-500" /><span className="truncate text-[13px] text-stone-700">{profile?.email || 'No email'}</span>{profile?.email && <CheckCircle2 size={15} className="shrink-0" color="#38A85C" />}</div>
                                            <button onClick={() => { setWorkPrefDraft(profile?.profile?.workPreferences || ''); setAvailabilityDraft(profile?.profile?.availability || ''); openModal('workpref'); }} className="flex min-h-5 items-center gap-2 text-left text-[13px] font-semibold text-[#3564A0] hover:underline"><CalendarDays size={14} className="shrink-0" />{profile?.profile?.availability || 'Add availability to join'}</button>
                                        </div>
                                    </div>

                                </div>

                                {/* About section */}
                                {profile?.profile?.about ? (
                                    <div className="border-t border-stone-200 pt-4">
                                        <p className="text-[13px] leading-relaxed text-stone-700">{profile.profile.about}</p>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        {/* Profile Header Card */}
                        <SectionCard
                            id="section-about"
                            title="Professional Bio"
                            icon={BookOpen}
                            weight={COMPLETION_WEIGHTS.about}
                            done={!!profile?.profile?.about}
                            onAdd={openAboutModal}
                            addLabel="Add bio"
                        >
                            {!profile?.profile?.about ? (
                                <p className="text-[12.5px] text-[#6B6259]">Write a professional summary about yourself to help recruiters understand your background.</p>
                            ) : (
                                <p className="text-[13px] text-stone-700 leading-relaxed">{profile.profile.about}</p>
                            )}
                        </SectionCard>

                        {/* Skills */}
                        <SectionCard
                            id="section-skills"
                            title="Key Skills"
                            icon={Zap}
                            weight={COMPLETION_WEIGHTS.skills}
                            done={skillsList.length > 0}
                            onAdd={openSkillsModal}
                            addLabel="Add skills"
                        >
                            {skillsList.length === 0 ? (
                                <p className="text-[12.5px] text-[#6B6259]">Add skills that best define your expertise.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {skillsList.map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                                            style={{ background: `${MAROON}14`, color: MAROON }}
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        {/* Experience */}
                        <SectionCard
                            id="section-experience"
                            title="Experience"
                            icon={Briefcase}
                            weight={COMPLETION_WEIGHTS.experience}
                            done={experienceList.length > 0}
                            onAdd={() => openExperienceModal(null)}
                            addLabel="Add Experience"
                            alwaysShowAddLabel
                        >
                            {experienceList.length === 0 ? (
                                <p className="text-[12.5px] text-[#6B6259]">Add your experience history to help recruiters understand your background.</p>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {experienceList.map((exp, i) => {
                                        const period = formatExperiencePeriod(exp);
                                        const duration = formatExperienceDuration(exp);
                                        const skills = Array.isArray(exp.skills) && exp.skills.length
                                            ? exp.skills
                                            : (exp.designation || '').split(',').map((s) => s.trim()).filter(Boolean);
                                        const hasDescription = !!(exp.description || exp.internshipDescription);
                                        return (
                                            <div key={i} className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100 last:border-b-0 last:pb-0">
                                                <div className="flex-1 min-w-0">
                                                    <p className="flex items-center gap-1.5 text-[14px] font-semibold text-stone-900">
                                                        {exp.role || 'Experience'}
                                                        <button
                                                            onClick={() => openExperienceModal(i)}
                                                            className="rounded p-0.5 text-stone-400 hover:bg-stone-50 hover:text-[#8B1E2F]"
                                                            aria-label="Edit Experience entry"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                    </p>
                                                    <p className="text-[13px] text-[#6B6259]">{exp.company || exp.location || ''}</p>
                                                    <p className="mt-1 text-[12px] text-stone-500">
                                                        {exp.employmentType || 'Full-time'}
                                                        {period && ` | ${period}`}
                                                        {duration && ` (${duration})`}
                                                    </p>
                                                    {exp.current && exp.employmentType === 'Full-time' && exp.noticePeriod && (
                                                        <p className="text-[12px] text-stone-500">{exp.noticePeriod} Notice Period</p>
                                                    )}
                                                    {!hasDescription ? (
                                                        <button
                                                            onClick={() => openExperienceModal(i)}
                                                            className="mt-1.5 text-[12.5px] font-semibold text-[#3564A0] hover:underline"
                                                        >
                                                            Add job profile
                                                        </button>
                                                    ) : (
                                                        <p className="mt-2 text-[12.5px] text-stone-700">{exp.description || exp.internshipDescription}</p>
                                                    )}
                                                    {skills.length > 0 && (
                                                        <p className="mt-2 text-[12px] text-stone-600">
                                                            <span className="font-semibold text-stone-700">
                                                                Top {Math.min(5, skills.length)} key skills:{' '}
                                                            </span>
                                                            {skills.slice(0, 5).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        onClick={() => deleteExperience(i)}
                                                        className="rounded-full p-1.5 text-stone-300 hover:bg-stone-50 hover:text-[#B23B3B]"
                                                        aria-label="Delete Experience entry"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </SectionCard>

                        {/* Education */}
                        <SectionCard
                            id="section-education"
                            title="Education"
                            icon={GraduationCap}
                            weight={COMPLETION_WEIGHTS.education}
                            done={educationList.length > 0}
                            onAdd={() => openEducationModal(null)}
                            addLabel="Add education"
                            alwaysShowAddLabel
                        >
                            {educationList.length === 0 ? (
                                <div className="space-y-3">
                                    <p className="text-[12.5px] text-[#6B6259]">
                                        Your qualifications help recruiters know your educational background.
                                    </p>
                                    <button
                                        onClick={() => openEducationModal(null)}
                                        className="text-left text-[13px] font-semibold text-[#3564A0] hover:text-[#2A4F8A] hover:underline transition-colors"
                                    >
                                        + Add education
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {educationList.map((ed, i) => {
                                        const { title, subtitle, meta } = getEducationCardInfo(ed);
                                        return (
                                            <div key={i} className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100 last:border-b-0 last:pb-0">
                                                <div>
                                                    <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-stone-900">
                                                        {title}
                                                        <button
                                                            onClick={() => openEducationModal(i)}
                                                            className="rounded p-0.5 text-stone-400 hover:bg-stone-50 hover:text-[#8B1E2F]"
                                                            aria-label="Edit education entry"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                    </p>
                                                    {subtitle && <p className="text-[12.5px] text-stone-700">{subtitle}</p>}
                                                    {meta && <p className="text-[12px] text-[#6B6259]">{meta}</p>}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        onClick={() => deleteEducation(i)}
                                                        className="rounded-full p-1.5 text-stone-300 hover:bg-stone-50 hover:text-[#B23B3B]"
                                                        aria-label="Delete education entry"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </SectionCard>

                        {/* Certifications */}
                        <SectionCard
                            id="section-certifications"
                            title="Certifications"
                            icon={Award}
                            weight={COMPLETION_WEIGHTS.certifications}
                            done={certifications.length > 0}
                            onAdd={() => openCertificationModal(null)}
                            addLabel="Add certification"
                        >
                            {certifications.length === 0 ? (
                                <p className="text-[12.5px] text-[#6B6259]">Add professional certifications and achievements.</p>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {certifications.map((cert, i) => (
                                        <div key={i} className="flex items-start justify-between gap-3 pb-4 border-b border-stone-100 last:border-b-0 last:pb-0">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13.5px] font-semibold text-stone-900">{cert.name}</p>
                                                {cert.completionId && (
                                                    <p className="text-[12px] text-[#6B6259]">ID: {cert.completionId}</p>
                                                )}
                                                {(cert.startMonth || cert.startYear) && (
                                                    <p className="mt-1 text-[12px] text-stone-500">
                                                        {[cert.startMonth, cert.startYear].filter(Boolean).join(' ')}
                                                        {cert.noExpiry
                                                            ? ' · No Expiry'
                                                            : (cert.expiryMonth || cert.expiryYear)
                                                                ? ` – ${[cert.expiryMonth, cert.expiryYear].filter(Boolean).join(' ')}`
                                                                : ''}
                                                    </p>
                                                )}
                                                {cert.credentialUrl && (
                                                    <a
                                                        href={cert.credentialUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-2 inline-flex items-center gap-1 text-[12px] text-[#8B1E2F] hover:underline"
                                                    >
                                                        View credential <ChevronRight size={12} />
                                                    </a>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <button
                                                    onClick={() => openCertificationModal(i)}
                                                    className="rounded-full p-1.5 text-stone-400 hover:bg-stone-50 hover:text-[#8B1E2F]"
                                                    aria-label="Edit certification"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    onClick={() => deleteCertification(i)}
                                                    className="rounded-full p-1.5 text-stone-300 hover:bg-stone-50 hover:text-[#B23B3B]"
                                                    aria-label="Delete certification"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        {/* Languages */}
                        <SectionCard
                            id="section-languages"
                            title="Languages"
                            icon={Globe}
                            weight={COMPLETION_WEIGHTS.languages}
                            done={languages.length > 0}
                            onAdd={openLanguagesModal}
                            addLabel="Add languages"
                        >
                            {languages.length === 0 ? (
                                <p className="text-[12.5px] text-[#6B6259]">Add languages you speak fluently.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {languages.map((lang) => (
                                        <span
                                            key={lang}
                                            className="rounded-full px-3 py-1.5 text-[12px] font-medium"
                                            style={{ background: `${ACCENT}22`, color: MAROON }}
                                        >
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        {/* Projects */}
                        <SectionCard
                            id="section-projects"
                            title="Projects"
                            icon={Briefcase}
                            weight={COMPLETION_WEIGHTS.projects}
                            done={projects.length > 0}
                            onAdd={() => openProjectModal(null)}
                            addLabel="Add project"
                        >
                            {projects.length === 0 ? (
                                <p className="text-[12.5px] text-[#6B6259]">Showcase your projects you've completed.</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {projects.map((proj, i) => (
                                        <div key={i} className="rounded-[12px] border border-stone-200 p-4">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h4 className="text-[13.5px] font-semibold text-stone-900">{proj.title}</h4>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        onClick={() => openProjectModal(i)}
                                                        className="rounded-full p-1 text-stone-400 hover:bg-stone-50 hover:text-[#8B1E2F]"
                                                        aria-label="Edit project"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteProject(i)}
                                                        className="rounded-full p-1 text-stone-300 hover:bg-stone-50 hover:text-[#B23B3B]"
                                                        aria-label="Delete project"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            {(proj.client || proj.role) && (
                                                <p className="text-[12px] text-[#6B6259] mb-1">
                                                    {[proj.role, proj.client].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                            {(proj.workedFromMonth || proj.workedFromYear) && (
                                                <p className="text-[11.5px] text-stone-500 mb-2">
                                                    {[proj.workedFromMonth, proj.workedFromYear].filter(Boolean).join(' ')}
                                                    {' – '}
                                                    {proj.status === 'Completed'
                                                        ? [proj.workedTillMonth, proj.workedTillYear].filter(Boolean).join(' ')
                                                        : 'Present'}
                                                </p>
                                            )}
                                            {proj.roleDescription && (
                                                <p className="text-[12px] text-stone-600 mb-2 line-clamp-3">{proj.roleDescription}</p>
                                            )}
                                            {proj.skills && proj.skills.length > 0 && (
                                                <div className="mb-2 flex flex-wrap gap-1">
                                                    {proj.skills.map((skill) => (
                                                        <span key={skill} className="rounded-full px-2 py-0.5 text-[11px] bg-stone-100 text-stone-700">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        {/* Portfolio */}
                        <SectionCard
                            id="section-portfolio"
                            title="Portfolio"
                            icon={Globe}
                            weight={COMPLETION_WEIGHTS.portfolio}
                            done={portfolio.length > 0}
                            onAdd={() => openPortfolioModal(null)}
                            addLabel="Add portfolio item"
                        >
                            {portfolio.length === 0 ? (
                                <p className="text-[12.5px] text-[#6B6259]">Showcase your portfolio work.</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {portfolio.map((item, i) => (
                                        <div key={i} className="rounded-[12px] border border-stone-200 p-4">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="text-[13.5px] font-semibold text-stone-900">{item.title}</h4>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        onClick={() => openPortfolioModal(i)}
                                                        className="rounded-full p-1 text-stone-400 hover:bg-stone-50 hover:text-[#8B1E2F]"
                                                        aria-label="Edit portfolio"
                                                    >
                                                        <Pencil size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => deletePortfolio(i)}
                                                        className="rounded-full p-1 text-stone-300 hover:bg-stone-50 hover:text-[#B23B3B]"
                                                        aria-label="Delete portfolio"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-[12px] text-stone-600 mb-2">{item.description}</p>
                                            {item.url && (
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 text-[12px] text-[#8B1E2F] hover:underline"
                                                >
                                                    View portfolio <ChevronRight size={12} />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </SectionCard>

                        {/* Resume */}
                        <SectionCard
                            id="section-resume"
                            title="Resume"
                            weight={COMPLETION_WEIGHTS.resume}
                            done={!!profile?.profile?.resumeUrl}
                        >
                            <p className="mb-3 text-[12px] text-[#6B6259]">Recruiters often check your resume for detailed information.</p>

                            {resumeUrl && (
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleResumeView}
                                        className="inline-flex items-center gap-2 rounded-[10px] border border-stone-200 px-3 py-2 text-[12.5px] font-medium text-stone-700 hover:border-[#8B1E2F]/30"
                                    >
                                        <FileText size={14} color={MAROON} />
                                        {resumeName}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResumeDelete}
                                        aria-label="Delete resume"
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                            {resumeDeleteConfirm && (
                                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                                    <span>Are you sure you want to delete this resume?</span>
                                    <button
                                        type="button"
                                        onClick={confirmResumeDelete}
                                        className="rounded-full bg-red-700 px-3 py-1 text-white hover:bg-red-800"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelResumeDelete}
                                        className="rounded-full border border-red-300 bg-white px-3 py-1 text-red-700 hover:bg-red-100"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}

                            <label
                                htmlFor="resume-upload"
                                className="flex w-fit cursor-pointer items-center gap-2 rounded-[10px] border border-dashed border-stone-300 px-4 py-2.5 text-[12.5px] font-medium transition-colors hover:border-[#8B1E2F] hover:bg-stone-50"
                                style={{ color: MAROON }}
                            >
                                <Upload size={14} />
                                {resumeUploading ? (
                                    resumeProgress !== null ? `Uploading... ${resumeProgress}%` : 'Uploading...'
                                ) : (
                                    'Upload resume'
                                )}
                            </label>
                            <input
                                ref={resumeInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleResumeUpload}
                                disabled={resumeUploading}
                                className="hidden"
                                id="resume-upload"
                            />
                        </SectionCard>

                        {/* Social Links */}
                        <SectionCard
                            id="section-social"
                            title="Social & Portfolio Links"
                            weight={COMPLETION_WEIGHTS.social}
                            done={!!(profile?.socialLinks?.github || profile?.socialLinks?.linkedin || profile?.socialLinks?.website)}
                            onAdd={() => {
                                setSocialDraft(profile?.socialLinks || { github: '', linkedin: '', website: '' });
                                openModal('social');
                            }}
                            addLabel="Add links"
                        >
                            {!profile?.socialLinks?.github && !profile?.socialLinks?.linkedin && !profile?.socialLinks?.website ? (
                                <p className="text-[12.5px] text-[#6B6259]">Add your social profiles and portfolio links.</p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {profile?.socialLinks?.github && (
                                        <a href={profile.socialLinks.github} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-[#8B1E2F] hover:underline">
                                            <Link2 size={13} /> GitHub
                                        </a>
                                    )}
                                    {profile?.socialLinks?.linkedin && (
                                        <a href={profile.socialLinks.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-[#8B1E2F] hover:underline">
                                            <Link2 size={13} /> LinkedIn
                                        </a>
                                    )}
                                    {profile?.socialLinks?.website && (
                                        <a href={profile.socialLinks.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-[#8B1E2F] hover:underline">
                                            <Globe size={13} /> Website
                                        </a>
                                    )}
                                </div>
                            )}
                        </SectionCard>

                        {/* Work Preferences */}
                        <SectionCard
                            id="section-preferences"
                            title="Work Preferences"
                            weight={COMPLETION_WEIGHTS.preferences}
                            done={!!profile?.profile?.workPreferences}
                            onAdd={() => {
                                setWorkPrefDraft(profile?.profile?.workPreferences || '');
                                openModal('workpref');
                            }}
                            addLabel="Add preferences"
                        >
                            {!profile?.profile?.workPreferences ? (
                                <p className="text-[12.5px] text-[#6B6259]">Let recruiters know your work preferences and availability.</p>
                            ) : (
                                <p className="text-[13px] text-stone-700">{profile.profile.workPreferences}</p>
                            )}
                        </SectionCard>
                    </div>

                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {activeModal === 'basicInfo' && (
                    <Modal
                        title="Edit profile info"
                        subtitle="Update the details shown at the top of your profile."
                        onClose={closeModal}
                        onSave={saveBasicInfo}
                        saving={saving}
                    >
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="mb-1 block text-[12px] font-medium text-[#6B6259]">Full name</label>
                                <TextInput
                                    autoFocus
                                    placeholder="Your full name"
                                    value={nameDraft}
                                    onChange={(e) => setNameDraft(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[12px] font-medium text-[#6B6259]">State</label>
                                <AutocompleteInput
                                    placeholder="e.g. Odisha"
                                    value={stateDraft}
                                    onChange={(e) => {
                                        const newState = e.target.value;
                                        setStateDraft(newState);
                                        // Reset city if it no longer belongs to the newly typed/selected state.
                                        if (!(INDIAN_STATE_CITY_MAP[newState] || []).includes(cityDraft)) {
                                            setCityDraft('');
                                        }
                                    }}
                                    suggestions={INDIAN_STATE_SUGGESTIONS}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[12px] font-medium text-[#6B6259]">City</label>
                                <AutocompleteInput
                                    placeholder="e.g. Bhubaneswar"
                                    value={cityDraft}
                                    onChange={(e) => setCityDraft(e.target.value)}
                                    suggestions={INDIAN_STATE_CITY_MAP[stateDraft] || []}
                                />
                                <button
                                    type="button"
                                    onClick={shareCurrentLocation}
                                    className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-[#3564A0] hover:underline"
                                >
                                    <MapPin size={14} /> Use my current location
                                </button>
                            </div>

                            <div>
                                <label className="mb-1 block text-[12px] font-medium text-[#6B6259]">Phone number</label>
                                <TextInput
                                    placeholder="Phone number"
                                    value={phoneDraft}
                                    onChange={(e) => setPhoneDraft(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[12px] font-medium text-[#6B6259]">Availability to join</label>
                                <select
                                    value={availabilityDraft}
                                    onChange={(e) => setAvailabilityDraft(e.target.value)}
                                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                                >
                                    <option value="">Select availability</option>
                                    <option value="Immediate">Immediate</option>
                                    <option value="15 days">15 days</option>
                                    <option value="1 month">1 month</option>
                                    <option value="2 months">2 months</option>
                                    <option value="3 months">3 months</option>
                                </select>
                            </div>
                        </div>
                    </Modal>
                )}

                {activeModal === 'name' && (
                    <Modal
                        title="Edit your name"
                        subtitle="Use the name associated with your candidate profile."
                        onClose={closeModal}
                        onSave={saveName}
                        saving={saving}
                    >
                        <TextInput
                            autoFocus
                            placeholder="Your full name"
                            value={nameDraft}
                            onChange={(event) => setNameDraft(event.target.value)}
                        />
                    </Modal>
                )}

                {activeModal === 'headline' && (
                    <Modal
                        title="Professional Headline"
                        subtitle="Add a headline to your profile that highlights your expertise."
                        onClose={closeModal}
                        onSave={saveHeadline}
                        saving={saving}
                    >
                        <textarea
                            placeholder="e.g., Senior Developer specializing in React & Node.js"
                            value={headlineDraft}
                            onChange={(e) => setHeadlineDraft(e.target.value)}
                            rows={3}
                            maxLength={160}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                        />
                        <p className="mt-2 text-[12px] text-stone-500">{headlineDraft.length}/160</p>
                    </Modal>
                )}

                {activeModal === 'about' && (
                    <Modal
                        title="Professional Bio"
                        subtitle="Tell recruiters about yourself, your experience, and your goals."
                        onClose={closeModal}
                        onSave={saveAbout}
                        saving={saving}
                    >
                        <textarea
                            placeholder="Write about yourself..."
                            value={aboutDraft}
                            onChange={(e) => setAboutDraft(e.target.value)}
                            rows={5}
                            maxLength={500}
                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                        />
                        <p className="mt-2 text-[12px] text-stone-500">{aboutDraft.length}/500</p>
                    </Modal>
                )}

                {activeModal === 'contact' && (
                    <Modal
                        title={contactModalMode === 'location' ? 'Preferred location' : contactModalMode === 'phone' ? 'Mobile number' : 'Contact Information'}
                        onClose={closeModal}
                        onSave={saveContact}
                        saving={saving}
                    >
                        <div className="flex flex-col gap-3">
                            {(contactModalMode === 'location' || contactModalMode === 'contact') && <div>
                                <label className="mb-1 block text-[12px] font-medium text-[#6B6259]">Preferred location</label>
                                <TextInput placeholder="City, Country" value={locationDraft} onChange={(e) => setLocationDraft(e.target.value)} />
                                <button type="button" onClick={shareCurrentLocation} className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-[#3564A0] hover:underline">
                                    <MapPin size={14} /> Share your current location
                                </button>
                            </div>}
                            {(contactModalMode === 'phone' || contactModalMode === 'contact') && <div>
                                <label className="mb-1 block text-[12px] font-medium text-[#6B6259]">Phone number</label>
                                <TextInput placeholder="Phone number" value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
                            </div>}
                        </div>
                    </Modal>
                )}

                {activeModal === 'skills' && (
                    <Modal
                        title="Key Skills"
                        subtitle="Add skills that best define your expertise."
                        onClose={closeModal}
                        onSave={saveSkills}
                        saving={saving}
                        bodyClassName="mt-4"
                    >
                        <SkillsInput
                            skills={skillsDraft}
                            onAdd={(skill) => setSkillsDraft((prev) => [...prev, skill])}
                            onRemove={(skill) => setSkillsDraft((prev) => prev.filter((s) => s !== skill))}
                        />
                    </Modal>
                )}

                {activeModal === 'experience' && (
                    <Modal
                        title="Experience"
                        subtitle="Details like job title, company name, etc., help employers understand your work"
                        onClose={closeModal}
                        onSave={saveExperience}
                        saving={saving}
                    >
                        <ExperienceModalContent
                            expDraft={expDraft}
                            setExpDraft={setExpDraft}
                        />
                    </Modal>
                )}

                {activeModal === 'education' && (
                    <Modal
                        title="Education"
                        subtitle="Details like course, university, and more, help recruiters identify your educational background"
                        onClose={closeModal}
                        onSave={saveEducation}
                        saving={saving}
                    >
                        <EducationModalContent
                            eduDraft={eduDraft}
                            setEduDraft={setEduDraft}
                        />
                    </Modal>
                )}

                {activeModal === 'certification' && (
                    <Modal
                        title={editingCertIndex !== null ? 'Edit Certification' : 'Add Certification'}
                        onClose={closeModal}
                        onSave={saveCertification}
                        saving={saving}
                    >
                        <div className="flex flex-col gap-4">
                            {/* Certification Name */}
                            <div>
                                <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                    Certification Name <span className="text-[#B23B3B]">*</span>
                                </label>
                                <TextInput
                                    placeholder="e.g. AWS Certified Solutions Architect"
                                    value={certDraft.name || ''}
                                    onChange={(e) => setCertDraft((p) => ({ ...p, name: e.target.value }))}
                                />
                            </div>

                            {/* Certification Organization */}
                            <div>
                                <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                    Organization
                                </label>
                                <TextInput
                                    placeholder="e.g. Google, Microsoft"
                                    value={certDraft.organization || ''}
                                    onChange={(e) => setCertDraft((p) => ({ ...p, organization: e.target.value }))}
                                />
                            </div>

                            {/* Certification Completion ID */}
                            <div>
                                <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                    Certification Completion ID
                                </label>
                                <TextInput
                                    placeholder="e.g. ABC-123456"
                                    value={certDraft.completionId || ''}
                                    onChange={(e) => setCertDraft((p) => ({ ...p, completionId: e.target.value }))}
                                />
                            </div>

                            {/* Certification URL */}
                            <div>
                                <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                    Certification URL
                                </label>
                                <TextInput
                                    type="url"
                                    placeholder="https://..."
                                    value={certDraft.credentialUrl || ''}
                                    onChange={(e) => setCertDraft((p) => ({ ...p, credentialUrl: e.target.value }))}
                                />
                            </div>

                            {/* Certification Validity */}
                            <div>
                                <label className="mb-2 block text-[12px] font-semibold text-stone-900">
                                    Certification Validity
                                </label>

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    {/* Start Date */}
                                    <div className="grid flex-1 grid-cols-2 gap-2">
                                        <select
                                            aria-label="Start month"
                                            value={certDraft.startMonth || ''}
                                            onChange={(e) => setCertDraft((p) => ({ ...p, startMonth: e.target.value }))}
                                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                        >
                                            <option value="">MM</option>
                                            {generateMonthNames().map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <select
                                            aria-label="Start year"
                                            value={certDraft.startYear || ''}
                                            onChange={(e) => setCertDraft((p) => ({ ...p, startYear: e.target.value }))}
                                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                        >
                                            <option value="">YYYY</option>
                                            {generateCertYears().map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {!certDraft.noExpiry && (
                                        <>
                                            <span className="shrink-0 text-[12px] font-medium text-stone-400 text-center sm:text-left">To</span>

                                            {/* End Date - completely removed from DOM when noExpiry is checked */}
                                            <div className="grid flex-1 grid-cols-2 gap-2">
                                                <select
                                                    aria-label="End month"
                                                    value={certDraft.expiryMonth || ''}
                                                    onChange={(e) => setCertDraft((p) => ({ ...p, expiryMonth: e.target.value }))}
                                                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                                >
                                                    <option value="">MM</option>
                                                    {generateMonthNames().map((m) => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    aria-label="End year"
                                                    value={certDraft.expiryYear || ''}
                                                    onChange={(e) => setCertDraft((p) => ({ ...p, expiryYear: e.target.value }))}
                                                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                                >
                                                    <option value="">YYYY</option>
                                                    {generateCertYears().map((y) => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* No expiry checkbox */}
                                <label className="mt-3 flex cursor-pointer items-center gap-2 select-none">
                                    <input
                                        type="checkbox"
                                        checked={!!certDraft.noExpiry}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setCertDraft((prev) => ({
                                                    ...prev,
                                                    noExpiry: true,
                                                    expiryMonth: '',
                                                    expiryYear: '',
                                                }));
                                            } else {
                                                setCertDraft((prev) => ({
                                                    ...prev,
                                                    noExpiry: false,
                                                }));
                                            }
                                        }}
                                        className="h-4 w-4 rounded border-stone-300 text-[#8B1E2F] focus:ring-[#8B1E2F]/30"
                                    />
                                    <span className="text-[12.5px] text-stone-600">This certification does not expire</span>
                                </label>
                            </div>
                        </div>
                    </Modal>
                )}

                {activeModal === 'languages' && (
                    <Modal
                        title="Languages"
                        subtitle="Add languages you speak fluently."
                        onClose={closeModal}
                        onSave={saveLanguages}
                        saving={saving}
                    >
                        <ChipInput
                            items={languagesDraft}
                            onAdd={(lang) => setLanguagesDraft((prev) => [...prev, lang])}
                            onRemove={(lang) => setLanguagesDraft((prev) => prev.filter((l) => l !== lang))}
                            placeholder="Type a language (e.g., Spanish, French) and press Enter"
                            suggestions={['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Hindi', 'Portuguese', 'Russian', 'Arabic']}
                        />
                    </Modal>
                )}

                {activeModal === 'project' && (
                    <Modal
                        title={editingProjectIndex === null ? 'Add project' : 'Edit project'}
                        subtitle="Showcase your work with detailed project descriptions."
                        onClose={closeModal}
                        onSave={saveProject}
                        saving={saving}
                    >
                        <div className="flex flex-col gap-4">
                            {/* Project Title */}
                            <div>
                                <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                    Project Title <span className="text-[#B23B3B]">*</span>
                                </label>
                                <AutocompleteInput
                                    value={projectDraft.title || ''}
                                    onChange={(e) => setProjectDraft((p) => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g. E-commerce Website Redesign"
                                    suggestions={[]}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Client */}
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">Client</label>
                                    <AutocompleteInput
                                        value={projectDraft.client || ''}
                                        onChange={(e) => setProjectDraft((p) => ({ ...p, client: e.target.value }))}
                                        placeholder="e.g. Acme Corp (optional)"
                                        suggestions={[]}
                                    />
                                </div>

                                {/* Project Link */}
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">Project Link</label>
                                    <input
                                        type="url"
                                        value={projectDraft.projectLink || ''}
                                        onChange={(e) => setProjectDraft((p) => ({ ...p, projectLink: e.target.value }))}
                                        placeholder="https://example.com"
                                        className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                    />
                                </div>

                                {/* Project Status */}
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                        Project Status <span className="text-[#B23B3B]">*</span>
                                    </label>
                                    <div className="flex flex-wrap items-center gap-4 pt-1.5">
                                        {['In Progress', 'Completed'].map((opt) => (
                                            <label key={opt} className="flex cursor-pointer items-center gap-2 select-none">
                                                <input
                                                    type="radio"
                                                    name="projectStatus"
                                                    value={opt}
                                                    checked={projectDraft.status === opt}
                                                    onChange={() =>
                                                        setProjectDraft((p) => ({
                                                            ...p,
                                                            status: opt,
                                                            ...(opt === 'In Progress' ? { workedTillMonth: '', workedTillYear: '' } : {}),
                                                        }))
                                                    }
                                                    style={{ accentColor: MAROON }}
                                                    className="h-4 w-4"
                                                />
                                                <span className="text-[13px] text-stone-700">{opt}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Worked From / Worked Till */}
                            <div className={`grid grid-cols-1 gap-4 ${projectDraft.status === 'Completed' ? 'md:grid-cols-2' : ''}`}>
                                <div>
                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                        Worked From <span className="text-[#B23B3B]">*</span>
                                    </label>
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <select
                                            aria-label="Worked from year"
                                            value={projectDraft.workedFromYear || ''}
                                            onChange={(e) => setProjectDraft((p) => ({ ...p, workedFromYear: e.target.value }))}
                                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                        >
                                            <option value="">Year</option>
                                            {generateFullYears().map((y) => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                        <select
                                            aria-label="Worked from month"
                                            value={projectDraft.workedFromMonth || ''}
                                            onChange={(e) => setProjectDraft((p) => ({ ...p, workedFromMonth: e.target.value }))}
                                            className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                        >
                                            <option value="">Month</option>
                                            {generateMonthNames().map((m) => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {projectDraft.status === 'Completed' && (
                                    <div>
                                        <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                            Worked Till <span className="text-[#B23B3B]">*</span>
                                        </label>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            <select
                                                aria-label="Worked till year"
                                                value={projectDraft.workedTillYear || ''}
                                                onChange={(e) => setProjectDraft((p) => ({ ...p, workedTillYear: e.target.value }))}
                                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                            >
                                                <option value="">Year</option>
                                                {generateFullYears().map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                            <select
                                                aria-label="Worked till month"
                                                value={projectDraft.workedTillMonth || ''}
                                                onChange={(e) => setProjectDraft((p) => ({ ...p, workedTillMonth: e.target.value }))}
                                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                            >
                                                <option value="">Month</option>
                                                {generateMonthNames().map((m) => (
                                                    <option key={m} value={m}>{m}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Expand / collapse toggle */}
                            <button
                                type="button"
                                onClick={() => setShowProjectDetails((v) => !v)}
                                className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-stone-300 py-2.5 text-[12.5px] font-semibold text-[#8B1E2F] transition-colors hover:bg-[#8B1E2F]/5"
                            >
                                {showProjectDetails ? <Minus size={13} /> : <Plus size={13} />}
                                {showProjectDetails ? 'Hide Additional Details' : 'Add More Details'}
                            </button>

                            {/* Additional Details (animated expand/collapse) */}
                            <AnimatePresence initial={false}>
                                {showProjectDetails && (
                                    <motion.div
                                        key="project-additional-details"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex flex-col gap-4 pt-1">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                {/* Project Location */}
                                                <div>
                                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                                        Project Location
                                                    </label>
                                                    <AutocompleteInput
                                                        value={projectDraft.location || ''}
                                                        onChange={(e) => setProjectDraft((p) => ({ ...p, location: e.target.value }))}
                                                        placeholder="e.g. Bengaluru, India"
                                                        suggestions={[]}
                                                    />
                                                </div>

                                                {/* Project Site */}
                                                <div>
                                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                                        Project Site
                                                    </label>
                                                    <div className="flex flex-wrap items-center gap-4 pt-1.5">
                                                        {[
                                                            { value: 'On-site', label: 'On-site' },
                                                            { value: 'Remote', label: 'Off-site / Remote' },
                                                        ].map((opt) => (
                                                            <label key={opt.value} className="flex cursor-pointer items-center gap-2 select-none">
                                                                <input
                                                                    type="radio"
                                                                    name="projectSite"
                                                                    value={opt.value}
                                                                    checked={projectDraft.site === opt.value}
                                                                    onChange={() => setProjectDraft((p) => ({ ...p, site: opt.value }))}
                                                                    style={{ accentColor: MAROON }}
                                                                    className="h-4 w-4"
                                                                />
                                                                <span className="text-[13px] text-stone-700">{opt.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                {/* Team Size */}
                                                <div>
                                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                                        Team Size
                                                    </label>
                                                    <select
                                                        value={projectDraft.teamSize || ''}
                                                        onChange={(e) => setProjectDraft((p) => ({ ...p, teamSize: e.target.value }))}
                                                        className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20 transition-all"
                                                    >
                                                        <option value="">Select team size</option>
                                                        {PROJECT_TEAM_SIZE_OPTIONS.map((size) => (
                                                            <option key={size} value={size}>{size}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Role */}
                                                <div>
                                                    <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                                        Role
                                                    </label>
                                                    <AutocompleteInput
                                                        value={projectDraft.role || ''}
                                                        onChange={(e) => setProjectDraft((p) => ({ ...p, role: e.target.value }))}
                                                        placeholder="e.g. Frontend Developer"
                                                        suggestions={JOB_TITLE_SUGGESTIONS}
                                                    />
                                                </div>
                                            </div>

                                            {/* Role Description */}
                                            <div>
                                                <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                                    Role Description
                                                </label>
                                                <textarea
                                                    value={projectDraft.roleDescription || ''}
                                                    onChange={(e) => setProjectDraft((p) => ({ ...p, roleDescription: e.target.value.slice(0, 4000) }))}
                                                    placeholder="Describe your role, responsibilities, and contributions to this project..."
                                                    rows={4}
                                                    maxLength={4000}
                                                    className="w-full resize-none rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none transition-all focus:border-[#8B1E2F]/40 focus:ring-1 focus:ring-[#8B1E2F]/20"
                                                />
                                                <p className="mt-1 text-right text-[11px] text-stone-500">
                                                    {(projectDraft.roleDescription || '').length}/4000
                                                </p>
                                            </div>

                                            {/* Skills Used */}
                                            <div>
                                                <label className="mb-1.5 block text-[12px] font-semibold text-stone-900">
                                                    Skills Used
                                                </label>
                                                <SkillsInput
                                                    skills={projectDraft.skills || []}
                                                    onAdd={(skill) => setProjectDraft((p) => ({ ...p, skills: [...(p.skills || []), skill] }))}
                                                    onRemove={(skill) => setProjectDraft((p) => ({ ...p, skills: (p.skills || []).filter((s) => s !== skill) }))}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </Modal>
                )}

                {activeModal === 'portfolio' && (
                    <Modal
                        title={editingPortfolioIndex === null ? 'Add portfolio item' : 'Edit portfolio item'}
                        subtitle="Showcase your portfolio work."
                        onClose={closeModal}
                        onSave={savePortfolio}
                        saving={saving}
                    >
                        <div className="flex flex-col gap-3">
                            <TextInput
                                placeholder="Portfolio title"
                                value={portfolioDraft.title || ''}
                                onChange={(e) => setPortfolioDraft((p) => ({ ...p, title: e.target.value }))}
                            />
                            <textarea
                                placeholder="Portfolio description"
                                value={portfolioDraft.description || ''}
                                onChange={(e) => setPortfolioDraft((p) => ({ ...p, description: e.target.value }))}
                                rows={3}
                                className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                            />
                            <TextInput
                                placeholder="Portfolio URL"
                                value={portfolioDraft.url || ''}
                                onChange={(e) => setPortfolioDraft((p) => ({ ...p, url: e.target.value }))}
                            />
                        </div>
                    </Modal>
                )}

                {activeModal === 'social' && (
                    <Modal
                        title="Social & portfolio links"
                        subtitle="Help recruiters find more of your work."
                        onClose={closeModal}
                        onSave={saveSocial}
                        saving={saving}
                    >
                        <div className="flex flex-col gap-3">
                            <div>
                                <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-[#6B6259]">
                                    <Link2 size={13} /> GitHub
                                </div>
                                <TextInput
                                    placeholder="https://github.com/yourusername"
                                    value={socialDraft.github}
                                    onChange={(e) => updateSocialDraft('github', e.target.value)}
                                    className={urlErrors.github ? 'border-[#B23B3B]' : ''}
                                />
                            </div>
                            <div>
                                <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-[#6B6259]">
                                    <Link2 size={13} /> LinkedIn
                                </div>
                                <TextInput
                                    placeholder="https://linkedin.com/in/yourusername"
                                    value={socialDraft.linkedin}
                                    onChange={(e) => updateSocialDraft('linkedin', e.target.value)}
                                    className={urlErrors.linkedin ? 'border-[#B23B3B]' : ''}
                                />
                            </div>
                            <div>
                                <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-[#6B6259]">
                                    <Globe size={13} /> Personal website
                                </div>
                                <TextInput
                                    placeholder="https://yourportfolio.com"
                                    value={socialDraft.website}
                                    onChange={(e) => updateSocialDraft('website', e.target.value)}
                                    className={urlErrors.website ? 'border-[#B23B3B]' : ''}
                                />
                            </div>
                        </div>
                    </Modal>
                )}

                {activeModal === 'photoActions' && (
                    <Modal
                        title="Profile photo"
                        subtitle={profile?.profile?.profilePictureUrl ? 'Replace or remove your current profile picture.' : 'Add a profile photo so recruiters can recognize you.'}
                        onClose={closeModal}
                        hideFooter
                    >
                        <div className="space-y-5 text-center">
                            <div className="mx-auto h-28 w-28 overflow-hidden rounded-full bg-[#F3F4F7]">
                                <Avatar
                                    src={profile?.profile?.profilePictureUrl}
                                    name={profile?.name || 'Candidate'}
                                    size={112}
                                />
                            </div>
                            <p className="text-[13px] text-stone-600">
                                {profile?.profile?.profilePictureUrl
                                    ? 'You can replace your photo or remove it entirely.'
                                    : 'Upload a new profile photo for your profile.'}
                            </p>
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    disabled={photoActionSaving}
                                    className="w-full max-w-[160px] rounded-[50px] bg-[#8B1E2F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6F1726] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {profile?.profile?.profilePictureUrl ? 'Replace photo' : 'Add photo'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePhotoDelete}
                                    disabled={!profile?.profile?.profilePictureUrl || photoActionSaving}
                                    className="text-sm font-semibold text-[#8B1E2F] hover:text-[#6F1726] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Delete photo
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {photoDeleteConfirm && (
                    <Modal
                        title="Are you sure yon want to delete photo"
                        onClose={() => setPhotoDeleteConfirm(false)}
                        onSave={confirmPhotoDelete}
                        saveLabel="Delete"
                        saving={photoActionSaving}
                        bodyClassName="mt-2"
                    >

                    </Modal>
                )}

                {activeModal === 'photoPreview' && (
                    <Modal
                        title="Preview photo"
                        subtitle="Move and zoom your image to frame it inside the circle, then save."
                        onClose={cancelPhotoPreview}
                        onSave={handlePhotoSave}
                        saveLabel="Save photo"
                        saving={photoActionSaving}
                        bodyClassName="mt-4 max-h-[80vh] overflow-y-auto pr-1"
                    >
                        <div className="space-y-5">
                            <div className="mx-auto h-[320px] w-[320px] overflow-hidden rounded-full bg-[#F3F4F7] shadow-sm sm:h-80 sm:w-80">
                                {selectedPhotoPreview ? (
                                    <div className="relative h-full w-full">
                                        <Cropper
                                            image={selectedPhotoPreview}
                                            crop={crop}
                                            zoom={zoom}
                                            aspect={1}
                                            cropShape="round"
                                            showGrid={false}
                                            onCropChange={setCrop}
                                            onZoomChange={setZoom}
                                            onCropComplete={onCropComplete}
                                        />
                                    </div>
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-sm text-stone-500">
                                        No preview available.
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4 px-2">
                                <div className="flex items-center justify-between text-[13px] font-medium text-stone-700">
                                    <span>Zoom</span>
                                    <span className="text-sm text-stone-500">{Math.round(zoom * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="3"
                                    step="0.01"
                                    value={zoom}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full"
                                />
                            </div>
                            <p className="text-[13px] text-stone-600 text-center">
                                {profile?.profile?.profilePictureUrl
                                    ? 'Save to replace your current profile photo.'
                                    : 'Save to add this photo to your profile.'}
                            </p>
                        </div>
                    </Modal>
                )}

                {activeModal === 'workpref' && (
                    <Modal
                        title="Work Preferences"
                        subtitle="Let recruiters know your preferences and availability."
                        onClose={closeModal}
                        onSave={saveWorkPref}
                        saving={saving}
                    >
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="mb-2 block text-[12px] font-medium text-[#6B6259]">Availability to Join *</label>
                                <select 
                                    value={availabilityDraft}
                                    onChange={(e) => setAvailabilityDraft(e.target.value)}
                                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                                >
                                    <option value="">Select availability</option>
                                    <option value="Immediate">Immediate</option>
                                    <option value="15 days">15 days</option>
                                    <option value="1 month">1 month</option>
                                    <option value="2 months">2 months</option>
                                    <option value="3 months">3 months</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="mb-2 block text-[12px] font-medium text-[#6B6259]">Work Preferences</label>
                                <textarea
                                    placeholder="e.g., Open to remote work, flexible hours, willing to relocate..."
                                    value={workPrefDraft}
                                    onChange={(e) => setWorkPrefDraft(e.target.value)}
                                    rows={5}
                                    className="w-full rounded-[10px] border border-stone-200 px-3 py-2 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                                    maxLength="300"
                                />
                                <p className="mt-2 text-[12px] text-stone-500">{workPrefDraft.length}/300</p>
                            </div>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>

            {/* Toast notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-lg"
                        style={{ background: MAROON_DARK }}
                    >
                        <CheckCircle2 size={14} />
                        {toast}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}