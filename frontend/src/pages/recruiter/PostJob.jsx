import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    Bold,
    Briefcase,
    BriefcaseBusiness,
    Building2,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FileText,
    Globe2,
    Image as ImageIcon,
    IndianRupee,
    Italic,
    List,
    ListOrdered,
    Loader2,
    MapPin,
    Minus,
    Plus,
    Save,
    Send,
    Sparkles,
    Tag,
    Underline,
    Users,
    X,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import { FONT_DISPLAY } from '../../theme';

/* ------------------------------------------------------------------ */
/* Design tokens — same palette as the rest of the recruiter portal    */
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

const inputClass =
    'block w-full rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-2.5 text-[13px] text-[#1D181A] outline-none transition focus:border-[#C75560] focus:bg-white focus:shadow-[0_0_0_3px_rgba(199,85,96,0.14)]';
const errorInputClass = 'border-[#B3261E] focus:border-[#B3261E] focus:shadow-[0_0_0_3px_rgba(179,38,30,0.12)]';

/* ------------------------------------------------------------------ */
/* Static option data                                                  */
/* ------------------------------------------------------------------ */
const STEPS = [
    { key: 'details', label: 'Job Details', hint: 'Title, company & role type', icon: BriefcaseBusiness },
    { key: 'location', label: 'Location', hint: 'Where the role is based', icon: MapPin },
    { key: 'experience', label: 'Experience & Salary', hint: 'Seniority & compensation', icon: IndianRupee },
    { key: 'skills', label: 'Skills', hint: 'What candidates need', icon: Tag },
    { key: 'description', label: 'Description', hint: 'Tell candidates the full story', icon: FileText },
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Internship', 'Contract'];
const WORK_MODES = ['On-site', 'Hybrid', 'Remote'];
const CATEGORIES = [
    'Engineering', 'Product', 'Design', 'Sales', 'Marketing',
    'Operations', 'Finance', 'Human Resources', 'Customer Support', 'Data & Analytics', 'Other',
];
const INDIAN_STATES = [
    'Andhra Pradesh', 'Bihar', 'Delhi NCR', 'Gujarat', 'Haryana', 'Karnataka', 'Kerala',
    'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
    'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other',
];
const COUNTRIES = ['India', 'United States', 'United Kingdom', 'United Arab Emirates', 'Singapore', 'Other'];
const SALARY_TYPES = ['Range', 'Fixed', 'Not disclosed'];

const SUGGESTED_SKILLS = {
    Engineering: ['React', 'Node.js', 'Python', 'Java', 'AWS', 'Docker', 'SQL', 'TypeScript'],
    Product: ['Roadmapping', 'Agile', 'JIRA', 'Stakeholder Management', 'A/B Testing'],
    Design: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Design Systems'],
    Sales: ['CRM', 'Negotiation', 'Lead Generation', 'B2B Sales', 'Salesforce'],
    Marketing: ['SEO', 'Content Strategy', 'Google Ads', 'Social Media', 'Analytics'],
    Finance: ['Excel', 'Financial Modelling', 'Tally', 'GST', 'Budgeting'],
    'Human Resources': ['Recruitment', 'Onboarding', 'HRMS', 'Payroll', 'Employee Relations'],
    'Customer Support': ['Zendesk', 'Communication', 'Troubleshooting', 'CRM'],
    'Data & Analytics': ['SQL', 'Python', 'Power BI', 'Excel', 'Statistics'],
    default: ['Communication', 'Teamwork', 'Problem Solving', 'Time Management'],
};

const INITIAL_FORM = {
    title: '',
    companyName: '',
    companyLogo: null,
    category: '',
    department: '',
    employmentType: 'Full-time',
    workMode: 'On-site',
    openings: 1,
    status: 'active',

    country: 'India',
    state: '',
    city: '',
    extraLocations: [],
    remoteOption: false,
    panIndia: false,

    minExperience: '',
    maxExperience: '',
    salaryType: 'Range',
    minSalary: '',
    maxSalary: '',

    skills: [],

    aboutCompany: '',
    jobSummary: '',
    rolesResponsibilities: '',
    requiredQualifications: '',
    preferredQualifications: '',
};

function stripHtml(html) {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */
function Field({ label, required, error, hint, children }) {
    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <label className="text-[12.5px] font-semibold text-[#54263F]">
                    {label} {required && <span className="text-[#B3261E]">*</span>}
                </label>
                {hint && <span className="text-[11px] text-[#A77D8D]">{hint}</span>}
            </div>
            {children}
            {error && (
                <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[#B3261E]">
                    <AlertCircle size={12} /> {error}
                </p>
            )}
        </div>
    );
}

function PillGroup({ options, value, onChange, error }) {
    return (
        <div className={`flex flex-wrap gap-2 ${error ? 'rounded-[12px] outline outline-1 outline-offset-4 outline-[#E9B6AF]' : ''}`}>
            {options.map((opt) => {
                const active = opt === value;
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(opt)}
                        className={`rounded-[10px] border px-3.5 py-2 text-[12.5px] font-semibold transition-colors ${
                            active
                                ? 'border-[#1D181A] bg-[#1D181A] text-white'
                                : 'border-[#EBC2AE] bg-[#FFF9F5] text-[#54263F] hover:border-[#C75560] hover:bg-white'
                        }`}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

function NumberStepper({ value, onChange, min = 1 }) {
    return (
        <div className="flex h-10 w-fit items-center overflow-hidden rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5]">
            <button
                type="button"
                onClick={() => onChange(Math.max(min, Number(value || min) - 1))}
                className="flex h-full w-9 items-center justify-center text-[#80576A] transition-colors hover:bg-[#FFE1D2] hover:text-[#1D181A]"
                aria-label="Decrease openings"
            >
                <Minus size={14} />
            </button>
            <input
                type="number"
                min={min}
                value={value}
                onChange={(e) => onChange(Math.max(min, Number(e.target.value) || min))}
                className="h-full w-14 border-x border-[#EBC2AE] bg-white text-center text-[13.5px] font-semibold text-[#1D181A] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
                type="button"
                onClick={() => onChange(Number(value || min) + 1)}
                className="flex h-full w-9 items-center justify-center text-[#80576A] transition-colors hover:bg-[#FFE1D2] hover:text-[#1D181A]"
                aria-label="Increase openings"
            >
                <Plus size={14} />
            </button>
        </div>
    );
}

function ChipInput({ values, onChange, placeholder, suggestions = [] }) {
    const [draft, setDraft] = useState('');

    function addChip(raw) {
        const value = raw.trim();
        if (!value) return;
        if (values.some((v) => v.toLowerCase() === value.toLowerCase())) {
            setDraft('');
            return;
        }
        onChange([...values, value]);
        setDraft('');
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addChip(draft);
        } else if (e.key === 'Backspace' && !draft && values.length) {
            onChange(values.slice(0, -1));
        }
    }

    const remainingSuggestions = suggestions.filter(
        (s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())
    );

    return (
        <div>
            <div className="flex min-h-[46px] flex-wrap items-center gap-1.5 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-2.5 py-2 transition focus-within:border-[#C75560] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(199,85,96,0.14)]">
                {values.map((v) => (
                    <span
                        key={v}
                        className="flex items-center gap-1.5 rounded-full bg-[#FFF0E8] py-1 pl-2.5 pr-1.5 text-[11.5px] font-semibold text-[#8D6072]"
                    >
                        {v}
                        <button
                            type="button"
                            onClick={() => onChange(values.filter((item) => item !== v))}
                            aria-label={`Remove ${v}`}
                            className="flex h-4 w-4 items-center justify-center rounded-full text-[#A9748A] transition-colors hover:bg-[#C75560] hover:text-white"
                        >
                            <X size={10} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => draft && addChip(draft)}
                    placeholder={values.length ? '' : placeholder}
                    className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[13px] text-[#1D181A] outline-none placeholder:text-[#A77D8D]"
                />
            </div>
            {remainingSuggestions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#A77D8D]">
                        <Sparkles size={11} /> Suggested:
                    </span>
                    {remainingSuggestions.slice(0, 8).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => addChip(s)}
                            className="rounded-full border border-dashed border-[#EBC2AE] px-2.5 py-1 text-[11px] font-semibold text-[#80576A] transition-colors hover:border-[#C75560] hover:bg-[#FFF0E8] hover:text-[#C75560]"
                        >
                            + {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function LogoUpload({ value, onChange }) {
    const inputRef = useRef(null);

    function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onChange({ file, preview: reader.result, name: file.name });
        reader.readAsDataURL(file);
        // NOTE: swap this for an upload to your Cloudflare R2 bucket (same pattern as
        // the candidate DP / resume uploads) once the endpoint is wired up — for now
        // this just keeps a local preview so the form stays self-contained.
    }

    return (
        <div className="flex items-center gap-3.5">
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-dashed border-[#EBC2AE] bg-[#FFF9F5] text-[#A77D8D] transition-colors hover:border-[#C75560] hover:text-[#C75560]"
            >
                {value?.preview ? (
                    <img src={value.preview} alt="Company logo preview" className="h-full w-full object-cover" />
                ) : (
                    <ImageIcon size={20} />
                )}
            </button>
            <div className="min-w-0">
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-1.5 text-[11.5px] font-semibold text-[#54263F] transition-colors hover:border-[#C75560] hover:bg-white"
                >
                    {value ? 'Change logo' : 'Upload logo'}
                </button>
                <p className="mt-1.5 truncate text-[11px] text-[#9C7A8A]">
                    {value?.name || 'PNG or JPG, square works best'}
                </p>
            </div>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>
    );
}

function RichTextField({ label, required, value, onChange, placeholder, minHeight = 140 }) {
    const ref = useRef(null);
    const didMount = useRef(false);

    useEffect(() => {
        if (!didMount.current && ref.current) {
            ref.current.innerHTML = value || '';
            didMount.current = true;
        }
    }, [value]);

    function exec(command) {
        document.execCommand(command, false, null);
        ref.current?.focus();
        onChange(ref.current.innerHTML);
    }

    const isEmpty = stripHtml(value) === '';
    const toolbarButtons = [
        { cmd: 'bold', icon: Bold, label: 'Bold' },
        { cmd: 'italic', icon: Italic, label: 'Italic' },
        { cmd: 'underline', icon: Underline, label: 'Underline' },
        { cmd: 'insertUnorderedList', icon: List, label: 'Bulleted list' },
        { cmd: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
    ];

    return (
        <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#54263F]">
                {label} {required && <span className="text-[#B3261E]">*</span>}
            </label>
            <div className="overflow-hidden rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] transition focus-within:border-[#C75560] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(199,85,96,0.14)]">
                <div className="flex items-center gap-0.5 border-b border-[#EBC2AE] bg-[#FFF3EC] px-2 py-1.5">
                    {toolbarButtons.map(({ cmd, icon: Icon, label: btnLabel }) => (
                        <button
                            key={cmd}
                            type="button"
                            aria-label={btnLabel}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => exec(cmd)}
                            className="flex h-7 w-7 items-center justify-center rounded-[7px] text-[#80576A] transition-colors hover:bg-[#FFE1D2] hover:text-[#1D181A]"
                        >
                            <Icon size={13} />
                        </button>
                    ))}
                </div>
                <div className="relative">
                    {isEmpty && (
                        <span className="pointer-events-none absolute left-3.5 top-2.5 text-[13px] text-[#A77D8D]">
                            {placeholder}
                        </span>
                    )}
                    <div
                        ref={ref}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={() => onChange(ref.current.innerHTML)}
                        style={{ minHeight }}
                        className="px-3.5 py-2.5 text-[13px] leading-6 text-[#1D181A] outline-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                    />
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Step indicator                                                      */
/* ------------------------------------------------------------------ */
function Stepper({ currentIndex, maxReached, onJump }) {
    return (
        <div className="portal-card mb-6 overflow-x-auto p-4 sm:p-5">
            <div className="flex min-w-[560px] items-center">
                {STEPS.map((step, index) => {
                    const isDone = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isReachable = index <= maxReached;
                    return (
                        <div key={step.key} className="flex flex-1 items-center last:flex-none">
                            <button
                                type="button"
                                disabled={!isReachable}
                                onClick={() => isReachable && onJump(index)}
                                className={`flex items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition-colors ${
                                    isReachable ? 'cursor-pointer' : 'cursor-not-allowed'
                                }`}
                            >
                                <span
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors"
                                    style={{
                                        background: isDone ? GREEN : isCurrent ? INK : '#F1EDEA',
                                        color: isDone || isCurrent ? '#fff' : '#9C948D',
                                    }}
                                >
                                    {isDone ? <Check size={14} /> : index + 1}
                                </span>
                                <span className="hidden sm:block">
                                    <span
                                        className="block text-[12.5px] font-bold leading-tight"
                                        style={{ color: isCurrent ? INK : isDone ? '#3A3034' : '#9C948D' }}
                                    >
                                        {step.label}
                                    </span>
                                    <span className="block text-[10.5px] text-[#A77D8D]">{step.hint}</span>
                                </span>
                            </button>
                            {index < STEPS.length - 1 && (
                                <span
                                    className="mx-2 h-[2px] flex-1 rounded-full"
                                    style={{ background: index < currentIndex ? GREEN : '#F1EDEA' }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */
export default function PostJob() {
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL_FORM);
    const [stepIndex, setStepIndex] = useState(0);
    const [maxReached, setMaxReached] = useState(0);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [apiError, setApiError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function update(patch) {
        setForm((current) => ({ ...current, ...patch }));
    }

    function validateStep(index) {
        const e = {};
        if (index === 0) {
            if (!form.title.trim()) e.title = 'Job title is required.';
            if (!form.companyName.trim()) e.companyName = 'Company name is required.';
            if (!form.employmentType) e.employmentType = 'Choose an employment type.';
            if (!form.workMode) e.workMode = 'Choose a work mode.';
        }
        if (index === 1) {
            if (!form.country) e.country = 'Country is required.';
            if (!form.panIndia && !form.remoteOption && !form.city.trim()) {
                e.city = 'Add a city, or mark this role as Pan India / remote.';
            }
        }
        if (index === 2) {
            if (form.minExperience === '' || Number(form.minExperience) < 0) {
                e.minExperience = 'Minimum experience is required.';
            }
            if (form.maxExperience !== '' && Number(form.maxExperience) < Number(form.minExperience || 0)) {
                e.maxExperience = 'Maximum experience should be higher than minimum.';
            }
            if (form.salaryType !== 'Not disclosed') {
                if (form.minSalary === '') e.minSalary = 'Enter a salary amount.';
                if (form.salaryType === 'Range') {
                    if (form.maxSalary === '') e.maxSalary = 'Enter the upper end of the range.';
                    else if (Number(form.maxSalary) < Number(form.minSalary || 0)) {
                        e.maxSalary = 'Maximum salary should be higher than minimum.';
                    }
                }
            }
        }
        if (index === 3) {
            if (form.skills.length === 0) e.skills = 'Add at least one skill.';
        }
        if (index === 4) {
            if (stripHtml(form.jobSummary) === '') e.jobSummary = 'Give candidates a short summary of the role.';
            if (stripHtml(form.rolesResponsibilities) === '') e.rolesResponsibilities = 'List the key responsibilities.';
            if (stripHtml(form.requiredQualifications) === '') e.requiredQualifications = 'List the must-have qualifications.';
        }
        return e;
    }

    function goToStep(index) {
        setStepIndex(index);
        setErrors({});
    }

    function handleNext() {
        const stepErrors = validateStep(stepIndex);
        if (Object.keys(stepErrors).length > 0) {
            setErrors(stepErrors);
            return;
        }
        setErrors({});
        const next = Math.min(stepIndex + 1, STEPS.length - 1);
        setStepIndex(next);
        setMaxReached((m) => Math.max(m, next));
    }

    function handleBack() {
        setErrors({});
        setStepIndex((i) => Math.max(0, i - 1));
    }

    function buildPayload(statusOverride) {
        const experienceLevel =
            form.maxExperience !== ''
                ? `${form.minExperience || 0} - ${form.maxExperience} years`
                : `${form.minExperience || 0}+ years`;

        const locationParts = [];
        if (form.panIndia) locationParts.push('Pan India');
        else {
            if (form.city.trim()) locationParts.push(form.city.trim());
            if (form.state) locationParts.push(form.state);
        }
        if (form.extraLocations.length) locationParts.push(...form.extraLocations);
        if (form.remoteOption) locationParts.push('Remote friendly');
        const location = locationParts.length ? locationParts.join(', ') : form.workMode;

        let salary = 'Not disclosed';
        if (form.salaryType === 'Fixed' && form.minSalary !== '') salary = `${form.minSalary} LPA`;
        if (form.salaryType === 'Range' && form.minSalary !== '' && form.maxSalary !== '') {
            salary = `${form.minSalary} - ${form.maxSalary} LPA`;
        }

        const descriptionSections = [
            ['About the company', form.aboutCompany],
            ['Job Description', form.jobSummary],
            ['Roles & responsibilities', form.rolesResponsibilities],
            ['Required qualifications', form.requiredQualifications],
            ['Preferred qualifications', form.preferredQualifications],
        ].filter(([, html]) => stripHtml(html) !== '');

        const description = descriptionSections.map(([heading, html]) => `${heading}\n${stripHtml(html)}`).join('\n\n');

        return {
            // Fields the existing /jobs endpoint already understands
            title: form.title.trim(),
            description,
            location,
            salary,
            experienceLevel,
            skillsRequired: form.skills,
            status: statusOverride || form.status,

            // Structured extras — safe to send even if the backend ignores them today;
            // wire these into the Job schema whenever it's ready to store them natively.
            companyName: form.companyName.trim(),
            category: form.category,
            department: form.department.trim(),
            employmentType: form.employmentType,
            workMode: form.workMode,
            openings: form.openings,
            country: form.country,
            state: form.state,
            city: form.city.trim(),
            extraLocations: form.extraLocations,
            remoteOption: form.remoteOption,
            panIndia: form.panIndia,
            minExperience: form.minExperience,
            maxExperience: form.maxExperience,
            salaryType: form.salaryType,
            minSalary: form.minSalary,
            maxSalary: form.maxSalary,
            descriptionSections: Object.fromEntries(
                descriptionSections.map(([heading, html]) => [heading, html])
            ),
        };
    }

    async function submitJob(statusOverride) {
        setMessage('');
        setApiError('');
        setSubmitting(true);
        try {
            const payload = buildPayload(statusOverride);
            await axiosInstance.post('/jobs', payload);

            if (statusOverride === 'active') {
                navigate('/recruiter/jobs');
                return;
            }

            setMessage(
                'Saved as a draft. You can publish it anytime from your job posts.'
            );
            setForm(INITIAL_FORM);
            setStepIndex(0);
            setMaxReached(0);
        } catch (requestError) {
            setApiError(requestError.response?.data?.error || 'Could not post this job. Please try again.');
        } finally {
            setSubmitting(false);
        }
    }

    function handlePublish() {
        const stepErrors = validateStep(stepIndex);
        if (Object.keys(stepErrors).length > 0) {
            setErrors(stepErrors);
            return;
        }
        submitJob('active');
    }

    function handleSaveDraft() {
        if (!form.title.trim()) {
            setErrors({ title: 'Give this draft a job title before saving.' });
            setStepIndex(0);
            return;
        }
        submitJob('draft');
    }

    const suggestions = SUGGESTED_SKILLS[form.category] || SUGGESTED_SKILLS.default;
    const isLastStep = stepIndex === STEPS.length - 1;
    const filledSteps = STEPS.filter((_, i) => Object.keys(validateStep(i)).length === 0).length;

    return (
        <div className="portal-theme min-h-screen" style={{ background: '#FFF7F2' }}>
            <RecruiterNavbar />
            <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">Recruiter workspace</p>
                        <h1 className="mt-1 text-3xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                            Post a new opportunity
                        </h1>
                        <p className="mt-2 max-w-xl text-[13.5px] leading-6 text-[#80576A]">
                            Walk through five short steps to publish a listing that gives candidates everything they
                            need to apply with confidence.
                        </p>
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#F7C56B] bg-[#FFF5D9] px-3 py-1.5 text-[11px] font-bold text-[#9A671A]">
                        <BriefcaseBusiness size={14} /> {filledSteps}/{STEPS.length} sections ready
                    </span>
                </div>

                <Stepper currentIndex={stepIndex} maxReached={maxReached} onJump={goToStep} />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="portal-card p-5 sm:p-7">
                        {/* -------------------------------------------------- */}
                        {/* Step 1 — Job details                                */}
                        {/* -------------------------------------------------- */}
                        {stepIndex === 0 && (
                            <div className="space-y-5">
                                <Field label="Job title" required error={errors.title}>
                                    <input
                                        name="title"
                                        placeholder="e.g. Senior Product Designer"
                                        value={form.title}
                                        onChange={(e) => update({ title: e.target.value })}
                                        className={`${inputClass} ${errors.title ? errorInputClass : ''}`}
                                    />
                                </Field>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Company name" required error={errors.companyName}>
                                        <span className="relative block">
                                            <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A77D8D]" />
                                            <input
                                                value={form.companyName}
                                                onChange={(e) => update({ companyName: e.target.value })}
                                                placeholder="Company Name"
                                                className={`${inputClass} pl-9 ${errors.companyName ? errorInputClass : ''}`}
                                            />
                                        </span>
                                    </Field>
                                    <Field label="Job category">
                                        <select
                                            value={form.category}
                                            onChange={(e) => update({ category: e.target.value })}
                                            className={inputClass}
                                        >
                                            <option value="">Select a category</option>
                                            {CATEGORIES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Department" hint="Optional">
                                        <input
                                            value={form.department}
                                            onChange={(e) => update({ department: e.target.value })}
                                            placeholder="Department Name"
                                            className={inputClass}
                                        />
                                    </Field>
                                    {/* <Field label="Company logo" hint="Optional">
                                        <LogoUpload value={form.companyLogo} onChange={(v) => update({ companyLogo: v })} />
                                    </Field> */}
                                </div>

                                <Field label="Employment type" required error={errors.employmentType}>
                                    <PillGroup
                                        options={EMPLOYMENT_TYPES}
                                        value={form.employmentType}
                                        onChange={(v) => update({ employmentType: v })}
                                        error={errors.employmentType}
                                    />
                                </Field>

                                <Field label="Work mode" required error={errors.workMode}>
                                    <PillGroup
                                        options={WORK_MODES}
                                        value={form.workMode}
                                        onChange={(v) => update({ workMode: v })}
                                        error={errors.workMode}
                                    />
                                </Field>
                            </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* Step 2 — Location                                   */}
                        {/* -------------------------------------------------- */}
                        {stepIndex === 1 && (
                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Field label="Country" required error={errors.country}>
                                        <select
                                            value={form.country}
                                            onChange={(e) => update({ country: e.target.value })}
                                            className={`${inputClass} ${errors.country ? errorInputClass : ''}`}
                                        >
                                            {COUNTRIES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="State" hint={form.panIndia ? 'Not needed for Pan India' : undefined}>
                                        <select
                                            value={form.state}
                                            onChange={(e) => update({ state: e.target.value })}
                                            disabled={form.panIndia}
                                            className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                                        >
                                            <option value="">Select a state</option>
                                            {INDIAN_STATES.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field
                                        label="City"
                                        required={!form.panIndia && !form.remoteOption}
                                        error={errors.city}
                                        hint={form.panIndia ? 'Not needed for Pan India' : undefined}
                                    >
                                        <span className="relative block">
                                            <MapPin size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A77D8D]" />
                                            <input
                                                value={form.city}
                                                onChange={(e) => update({ city: e.target.value })}
                                                disabled={form.panIndia}
                                                placeholder="Enter City"
                                                className={`${inputClass} pl-9 disabled:cursor-not-allowed disabled:opacity-50 ${errors.city ? errorInputClass : ''}`}
                                            />
                                        </span>
                                    </Field>
                                </div>

                                <Field label="Additional locations" hint="Optional — for multi-city hiring">
                                    <ChipInput
                                        values={form.extraLocations}
                                        onChange={(v) => update({ extraLocations: v })}
                                        placeholder="Type a city and press Enter"
                                    />
                                </Field>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] p-3.5 transition-colors hover:border-[#C75560]">
                                        <input
                                            type="checkbox"
                                            checked={form.remoteOption}
                                            onChange={(e) => update({ remoteOption: e.target.checked })}
                                            className="mt-0.5 h-4 w-4 accent-[#C75560]"
                                        />
                                        <span>
                                            <span className="block text-[12.5px] font-semibold text-[#1D181A]">Remote option</span>
                                            <span className="block text-[11.5px] text-[#80576A]">Candidates can work from anywhere for this role.</span>
                                        </span>
                                    </label>
                                    <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] p-3.5 transition-colors hover:border-[#C75560]">
                                        <input
                                            type="checkbox"
                                            checked={form.panIndia}
                                            onChange={(e) => update({ panIndia: e.target.checked, state: '', city: '' })}
                                            className="mt-0.5 h-4 w-4 accent-[#C75560]"
                                        />
                                        <span>
                                            <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#1D181A]">
                                                <Globe2 size={13} className="text-[#C75560]" /> Pan India
                                            </span>
                                            <span className="block text-[11.5px] text-[#80576A]">Hiring across multiple Indian cities.</span>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* Step 3 — Experience & salary                        */}
                        {/* -------------------------------------------------- */}
                        {stepIndex === 2 && (
                            <div className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Minimum experience (years)" required error={errors.minExperience}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.minExperience}
                                            onChange={(e) => update({ minExperience: e.target.value })}
                                            placeholder="e.g. 2"
                                            className={`${inputClass} ${errors.minExperience ? errorInputClass : ''}`}
                                        />
                                    </Field>
                                    <Field label="Maximum experience (years)" hint="Optional" error={errors.maxExperience}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={form.maxExperience}
                                            onChange={(e) => update({ maxExperience: e.target.value })}
                                            placeholder="e.g. 5"
                                            className={`${inputClass} ${errors.maxExperience ? errorInputClass : ''}`}
                                        />
                                    </Field>
                                </div>

                                <Field label="Salary type" required>
                                    <PillGroup
                                        options={SALARY_TYPES}
                                        value={form.salaryType}
                                        onChange={(v) => update({ salaryType: v, ...(v === 'Not disclosed' ? { minSalary: '', maxSalary: '' } : {}) })}
                                    />
                                </Field>

                                {form.salaryType !== 'Not disclosed' && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label={form.salaryType === 'Fixed' ? 'Annual salary (LPA)' : 'Minimum salary (LPA)'}
                                            required
                                            error={errors.minSalary}
                                        >
                                            <span className="relative block">
                                                <IndianRupee size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A77D8D]" />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={form.minSalary}
                                                    onChange={(e) => update({ minSalary: e.target.value })}
                                                    placeholder="e.g. 12"
                                                    className={`${inputClass} pl-9 ${errors.minSalary ? errorInputClass : ''}`}
                                                />
                                            </span>
                                        </Field>
                                        {form.salaryType === 'Range' && (
                                            <Field label="Maximum salary (LPA)" required error={errors.maxSalary}>
                                                <span className="relative block">
                                                    <IndianRupee size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#A77D8D]" />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={form.maxSalary}
                                                        onChange={(e) => update({ maxSalary: e.target.value })}
                                                        placeholder="e.g. 16"
                                                        className={`${inputClass} pl-9 ${errors.maxSalary ? errorInputClass : ''}`}
                                                    />
                                                </span>
                                            </Field>
                                        )}
                                    </div>
                                )}

                                {form.salaryType === 'Not disclosed' && (
                                    <p className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 py-2.5 text-[12px] text-[#80576A]">
                                        Candidates will see "Not disclosed" for compensation on this listing.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* Step 4 — Skills                                     */}
                        {/* -------------------------------------------------- */}
                        {stepIndex === 3 && (
                            <div className="space-y-5">
                                <Field label="Technical skills" required error={errors.skills} hint="Press Enter after each one">
                                    <ChipInput
                                        values={form.skills}
                                        onChange={(v) => update({ skills: v })}
                                        placeholder="React, Figma, SQL..."
                                        suggestions={suggestions}
                                    />
                                </Field>
                                <p className="rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 py-2.5 text-[12px] leading-5 text-[#80576A]">
                                    Listings with 4–8 specific skills get matched to relevant candidates far more
                                    reliably than a long, generic list.
                                </p>
                            </div>
                        )}

                        {/* -------------------------------------------------- */}
                        {/* Step 5 — Description                                */}
                        {/* -------------------------------------------------- */}
                        {stepIndex === 4 && (
                            <div className="space-y-5">
                                <RichTextField
                                    label="About the company"
                                    value={form.aboutCompany}
                                    onChange={(v) => update({ aboutCompany: v })}
                                    placeholder="A couple of lines on who you are and what you build."
                                    minHeight={90}
                                />
                                <div>
                                    <RichTextField
                                        label="Job summary"
                                        required
                                        value={form.jobSummary}
                                        onChange={(v) => update({ jobSummary: v })}
                                        placeholder="A short overview of the role and its impact."
                                        minHeight={90}
                                    />
                                    {errors.jobSummary && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[#B3261E]">
                                            <AlertCircle size={12} /> {errors.jobSummary}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <RichTextField
                                        label="Roles & responsibilities"
                                        required
                                        value={form.rolesResponsibilities}
                                        onChange={(v) => update({ rolesResponsibilities: v })}
                                        placeholder="What this person will own day to day."
                                    />
                                    {errors.rolesResponsibilities && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[#B3261E]">
                                            <AlertCircle size={12} /> {errors.rolesResponsibilities}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <RichTextField
                                        label="Required qualifications"
                                        required
                                        value={form.requiredQualifications}
                                        onChange={(v) => update({ requiredQualifications: v })}
                                        placeholder="The must-haves for this role."
                                    />
                                    {errors.requiredQualifications && (
                                        <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[#B3261E]">
                                            <AlertCircle size={12} /> {errors.requiredQualifications}
                                        </p>
                                    )}
                                </div>
                                <RichTextField
                                    label="Preferred qualifications"
                                    value={form.preferredQualifications}
                                    onChange={(v) => update({ preferredQualifications: v })}
                                    placeholder="Nice-to-haves that make a candidate stand out."
                                    minHeight={90}
                                />
                            </div>
                        )}

                        {message && (
                            <p className="mt-6 flex items-center gap-2 rounded-lg border border-[#F7C56B] bg-[#FFF5D9] px-3 py-2.5 text-[12.5px] font-medium text-[#9A671A]">
                                <CheckCircle2 size={15} /> {message}
                            </p>
                        )}
                        {apiError && (
                            <p className="mt-6 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2.5 text-[12.5px] font-medium text-[#B3261E]">
                                {apiError}
                            </p>
                        )}

                        {/* Footer nav */}
                        <div className="mt-7 flex flex-col-reverse items-center gap-3 border-t border-[#F0D1BF] pt-5 sm:flex-row sm:justify-between">
                            <button
                                type="button"
                                onClick={handleBack}
                                disabled={stepIndex === 0 || submitting}
                                className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:opacity-40 sm:w-auto"
                            >
                                <ChevronLeft size={15} /> Back
                            </button>

                            <div className="flex w-full flex-col-reverse gap-2.5 sm:w-auto sm:flex-row">
                                <button
                                    type="button"
                                    onClick={handleSaveDraft}
                                    disabled={submitting}
                                    className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-white disabled:opacity-60"
                                >
                                    <Save size={14} /> Save as draft
                                </button>
                                {isLastStep ? (
                                    <button
                                        type="button"
                                        onClick={handlePublish}
                                        disabled={submitting}
                                        className="portal-primary-action px-4 py-2.5 disabled:opacity-60"
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="text-[#F7C56B]" />}
                                        {submitting ? 'Publishing…' : 'Publish job post'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="flex items-center justify-center gap-1.5 rounded-[10px] bg-[#1D181A] px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#3A3034]"
                                    >
                                        Continue <ChevronRight size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="flex h-fit flex-col gap-4">
                        <div className="portal-card p-5">
                            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FFF0E8] text-[#C75560]">
                                <Sparkles size={18} />
                            </span>
                            <h2 className="mt-4 text-[14.5px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                                A stronger listing
                            </h2>
                            <ul className="mt-3 space-y-2.5 text-[12px] leading-5 text-[#80576A]">
                                <li>Use a specific job title candidates will recognize.</li>
                                <li>Share the salary range — listings that do get more applies.</li>
                                <li>List 4–8 specific skills, not a generic wishlist.</li>
                                <li>Explain the impact this person will make, not just duties.</li>
                            </ul>
                        </div>

                        <div className="portal-card p-5">
                            <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-[#9C7A8A]">Live preview</h3>
                            <div className="mt-3 rounded-[14px] border border-[#F0D1BF] bg-[#FFFDFC] p-4">
                                <p className="line-clamp-2 text-[13.5px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                                    {form.title || 'Your job title'}
                                </p>
                                <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#80576A]">
                                    <Building2 size={12} /> {form.companyName || 'Company name'}
                                </p>
                                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#80576A]">
                                    <span className="flex items-center gap-1"><Briefcase size={11} /> {form.employmentType}</span>
                                    <span className="flex items-center gap-1"><MapPin size={11} /> {form.panIndia ? 'Pan India' : form.city || form.workMode}</span>
                                    <span className="flex items-center gap-1"><Users size={11} /> {form.openings} opening{form.openings === 1 ? '' : 's'}</span>
                                </div>
                                {form.skills.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {form.skills.slice(0, 4).map((s) => (
                                            <span key={s} className="rounded-full bg-[#FFF0E8] px-2 py-0.5 text-[10px] font-semibold text-[#8D6072]">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            </main>
        </div>
    );
}