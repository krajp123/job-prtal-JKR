import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

const FONT_DISPLAY = "'Space Grotesk','Inter',ui-sans-serif,sans-serif";

/* ---------------------------------------------------------------------- */
/* Theme-matched primitives                                               */
/* ---------------------------------------------------------------------- */

const inputBase =
    'w-full rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5 py-2.5 text-[13.5px] text-[#1D181A] placeholder:text-[#A77D8D] outline-none transition focus:border-[#C75560] focus:bg-white focus:ring-2 focus:ring-[#C75560]/15';
const labelBase = 'mb-1.5 block text-[12.5px] font-medium text-[#54263F]';
const errorBase = 'mt-1 text-[11.5px] font-medium text-[#B3261E]';
const hintBase = 'mt-1 text-[11px] text-[#8D6072]';

function NoScrollbar() {
    return (
        <style>{`
            html, body { scrollbar-width: none; -ms-overflow-style: none; }
            html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0; height: 0; display: none; }
            .recruiter-register *::-webkit-scrollbar { width: 0; height: 0; display: none; }
            .recruiter-register * { scrollbar-width: none; -ms-overflow-style: none; }
        `}</style>
    );
}

function Field({ label, error, hint, required, children }) {
    return (
        <div className="mb-4">
            {label && (
                <label className={labelBase}>
                    {label} {required && <span className="text-[#C75560]">*</span>}
                </label>
            )}
            {children}
            {error ? <p className={errorBase}>{error}</p> : hint ? <p className={hintBase}>{hint}</p> : null}
        </div>
    );
}

function TextInput({ error, className = '', ...props }) {
    return (
        <input
            className={`${inputBase} ${error ? 'border-[#F28B82]/60 focus:border-[#F28B82] focus:ring-[#F28B82]/20' : ''} ${className}`}
            {...props}
        />
    );
}

function TextArea({ error, maxLength, value, ...props }) {
    return (
        <div>
            <textarea
                value={value}
                maxLength={maxLength}
                className={`${inputBase} resize-none ${error ? 'border-[#F28B82]/60 focus:border-[#F28B82] focus:ring-[#F28B82]/20' : ''}`}
                {...props}
            />
            {maxLength && (
                <p className="mt-1 text-right text-[11px] text-[#8D6072]">
                    {(value || '').length}/{maxLength}
                </p>
            )}
        </div>
    );
}

function NativeSelect({ options, error, placeholder, className = '', ...props }) {
    return (
        <select
            className={`${inputBase} appearance-none bg-[right_0.9rem_center] bg-no-repeat pr-9 ${error ? 'border-[#F28B82]/60' : ''
                } ${className}`}
            style={{
                backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2380576A' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
            }}
            {...props}
        >
            {placeholder && (
                <option value="" className="bg-[#FFFDFC] text-[#80576A]">
                    {placeholder}
                </option>
            )}
            {options.map((opt) => (
                <option key={opt} value={opt} className="bg-[#FFFDFC] text-[#1D181A]">
                    {opt}
                </option>
            ))}
        </select>
    );
}

function SearchableSelect({ label, options, value, onChange, placeholder = 'Select…', error, required }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);

    useEffect(() => {
        function onClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

    return (
        <Field label={label} error={error} required={required}>
            <div className="relative" ref={ref}>
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className={`${inputBase} flex items-center justify-between text-left ${error ? 'border-[#F28B82]/60' : ''
                        }`}
                >
                    <span className={value ? 'text-[#1D181A]' : 'text-[#A77D8D]'}>{value || placeholder}</span>
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                        <path d="M6 8l4 4 4-4" stroke="#80576A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                {open && (
                    <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-[10px] border border-[#EBC2AE] bg-[#FFFDFC] shadow-[0_16px_40px_-12px_rgba(29,24,26,0.2)]">
                        <input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search…"
                            className="w-full border-b border-[#F0D1BF] bg-transparent px-3.5 py-2.5 text-[13px] text-[#1D181A] placeholder:text-[#A77D8D] outline-none"
                        />
                        <div className="py-1">
                            {filtered.length === 0 && (
                                <p className="px-3.5 py-2 text-[12.5px] text-[#8D6072]">No matches</p>
                            )}
                            {filtered.map((opt) => (
                                <button
                                    type="button"
                                    key={opt}
                                    onClick={() => {
                                        onChange(opt);
                                        setOpen(false);
                                        setQuery('');
                                    }}
                                    className={`block w-full px-3.5 py-2 text-left text-[13px] transition hover:bg-[#FFF0E8] ${opt === value ? 'text-[#C75560]' : 'text-[#54263F]'
                                        }`}
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Field>
    );
}

function AutocompleteInput({ label, value, onChange, suggestions, placeholder, error, required }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        function onClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const filtered =
        value.trim() === ''
            ? suggestions.slice(0, 8)
            : suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8);

    return (
        <Field label={label} error={error} required={required}>
            <div className="relative" ref={ref}>
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={`${inputBase} ${error ? 'border-[#F28B82]/60' : ''}`}
                />
                {open && filtered.length > 0 && (
                    <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-[10px] border border-[#EBC2AE] bg-[#FFFDFC] py-1 shadow-[0_16px_40px_-12px_rgba(29,24,26,0.2)]">
                        {filtered.map((opt) => (
                            <button
                                type="button"
                                key={opt}
                                onClick={() => {
                                    onChange(opt);
                                    setOpen(false);
                                }}
                                className="block w-full px-3.5 py-2 text-left text-[13px] text-[#54263F] transition hover:bg-[#FFF0E8]"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </Field>
    );
}

function FreeChipInput({ label, value, onChange, placeholder = 'Department Name', error, required }) {
    const [draft, setDraft] = useState('');

    function addChip() {
        const clean = draft.trim();
        if (clean && !value.includes(clean)) onChange([...value, clean]);
        setDraft('');
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addChip();
        } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    }

    function removeChip(chip) {
        onChange(value.filter((v) => v !== chip));
    }

    return (
        <Field label={label} error={error} required={required} hint="Type a department and press Enter or comma to add it.">
            <div
                onClick={(e) => e.currentTarget.querySelector('input')?.focus()}
                className={`flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-2.5 py-2 ${error ? 'border-[#B3261E]/60' : ''
                    }`}
            >
                {value.map((v) => (
                    <span
                        key={v}
                        className="flex items-center gap-1 rounded-full border border-[#F0C2B2] bg-[#FFF0E8] px-2.5 py-1 text-[11.5px] font-medium text-[#54263F]"
                    >
                        {v}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeChip(v);
                            }}
                            className="ml-0.5 text-[#80576A] hover:text-[#1D181A]"
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addChip}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="min-w-[140px] flex-1 bg-transparent text-[13px] text-[#1D181A] placeholder:text-[#A77D8D] outline-none"
                />
            </div>
        </Field>
    );
}

function CheckboxCards({ label, options, value, onChange, error, required }) {
    function toggle(opt) {
        onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
    }
    return (
        <Field label={label} error={error} required={required}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {options.map((opt) => {
                    const active = value.includes(opt);
                    return (
                        <button
                            type="button"
                            key={opt}
                            onClick={() => toggle(opt)}
                            className={`rounded-[10px] border px-3 py-2.5 text-[12.5px] font-medium transition ${active
                                ? 'border-[#C75560] bg-[#FFF0E8] text-[#1D181A]'
                                : 'border-[#EBC2AE] bg-[#FFF9F5] text-[#80576A] hover:border-[#D6A18F]'
                                }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <span
                                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-[4px] border ${active ? 'border-[#C75560] bg-[#C75560]' : 'border-[#D6B0A2]'
                                        }`}
                                >
                                    {active && (
                                        <svg width="9" height="9" viewBox="0 0 20 20" fill="none">
                                            <path d="M4 10l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </span>
                                {opt}
                            </span>
                        </button>
                    );
                })}
            </div>
        </Field>
    );
}

const COUNTRY_CODES = ['+91', '+1', '+44', '+61', '+971', '+65'];

function PhoneInput({ countryCode, number, onCountryCode, onNumber, error, required }) {
    return (
        <Field label="Mobile Number" error={error} required={required}>
            <div className="flex gap-2">
                <select
                    value={countryCode}
                    onChange={(e) => onCountryCode(e.target.value)}
                    className={`${inputBase} !w-[84px] appearance-none px-2 text-center`}
                >
                    {COUNTRY_CODES.map((c) => (
                        <option key={c} value={c} className="bg-[#FFFDFC] text-[#1D181A]">
                            {c}
                        </option>
                    ))}
                </select>
                <input
                    inputMode="numeric"
                    value={number}
                    onChange={(e) => onNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Mobile number"
                    className={`${inputBase} flex-1 ${error ? 'border-[#F28B82]/60' : ''}`}
                />
            </div>
        </Field>
    );
}

function OtpInput({ value, onChange, length = 6 }) {
    const refs = useRef([]);
    function handleChange(i, digit) {
        const clean = digit.replace(/\D/g, '').slice(-1);
        const chars = value.split('');
        chars[i] = clean;
        const next = chars.join('').slice(0, length);
        onChange(next);
        if (clean && i < length - 1) refs.current[i + 1]?.focus();
    }
    function handleKeyDown(i, e) {
        if (e.key === 'Backspace' && !value[i] && i > 0) refs.current[i - 1]?.focus();
    }
    return (
        <div className="flex gap-2">
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => (refs.current[i] = el)}
                    value={value[i] || ''}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    inputMode="numeric"
                    maxLength={1}
                    className="h-11 w-10 rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] text-center text-[16px] font-semibold text-[#1D181A] outline-none transition focus:border-[#C75560] focus:ring-2 focus:ring-[#C75560]/15"
                />
            ))}
        </div>
    );
}

function FileDropzone({ label, file, onFile, error, hint }) {
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    function processFile(f) {
        if (!f) return;
        if (f.type !== 'application/pdf') {
            onFile(null, 'Only PDF files are accepted.');
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            onFile(null, 'File exceeds the 10 MB limit.');
            return;
        }
        onFile(f, '');
    }

    return (
        <Field label={label} error={error} hint={!file ? hint : null}>
            {!file ? (
                <div
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        processFile(e.dataTransfer.files?.[0]);
                    }}
                    className={`flex h-[92px] cursor-pointer flex-col items-center justify-center rounded-[10px] border border-dashed px-4 text-center transition ${dragOver ? 'border-[#C75560] bg-[#FFF0E8]' : 'border-[#EBC2AE] bg-[#FFF9F5] hover:border-[#D6A18F]'
                        } ${error ? 'border-[#B3261E]/60' : ''}`}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="mb-1.5 text-[#A77D8D]">
                        <path d="M12 16V4m0 0L7 9m5-5l5 5M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-[12.5px] text-[#80576A]">
                        Drag & drop or <span className="font-semibold text-[#C75560]">browse</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8D6072]">PDF only, up to 10 MB</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => processFile(e.target.files?.[0])}
                    />
                </div>
            ) : (
                <div className="flex h-[92px] items-center justify-between rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3.5">
                    <span className="flex items-center gap-2 truncate text-[12.5px] text-[#54263F]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0 text-[#C75560]">
                            <path d="M6 2h9l5 5v15H6V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                        <span className="truncate">{file.name}</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onFile(null, '')}
                        className="ml-2 shrink-0 text-[11.5px] font-semibold text-[#F28B82] hover:underline"
                    >
                        Remove
                    </button>
                </div>
            )}
        </Field>
    );
}

function PasswordField({ label, value, onChange, show, onToggleShow, error, placeholder }) {
    return (
        <Field label={label} error={error} required>
            <div className="relative">
                <input
                    type={show ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    className={`${inputBase} pr-10 ${error ? 'border-[#F28B82]/60' : ''}`}
                />
                <button
                    type="button"
                    onClick={onToggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A77D8D] hover:text-[#1D181A]"
                >
                    {show ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.4 9.4 0 0112 5c5 0 9 4 10 7-1 2.5-3 4.2-5.4 5.5M6.5 6.5C4.4 8 3 9.9 2 12c1 3 5 7 10 7 1.3 0 2.5-.2 3.6-.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    )}
                </button>
            </div>
        </Field>
    );
}

function passwordChecks(pw) {
    return {
        length: pw.length >= 8,
        upper: /[A-Z]/.test(pw),
        lower: /[a-z]/.test(pw),
        number: /[0-9]/.test(pw),
        special: /[^A-Za-z0-9]/.test(pw),
    };
}

function PasswordAcceptance({ password }) {
    if (!password) return null;
    const checks = passwordChecks(password);
    const strong = Object.values(checks).every(Boolean);
    return (
        <p className={`mb-4 -mt-2 text-[12px] font-medium ${strong ? 'text-[#9A671A]' : 'text-[#B3261E]'}`}>
            {strong
                ? '✓ Strong password — accepted.'
                : 'Not strong enough — use 8+ characters with an uppercase letter, a lowercase letter, a number, and a symbol.'}
        </p>
    );
}

function StepDots({ step, total, labels, onJump }) {
    return (
        <div className="mb-6 flex items-center">
            {Array.from({ length: total }).map((_, i) => {
                const n = i + 1;
                const done = n < step;
                const current = n === step;
                return (
                    <div key={n} className="flex flex-1 items-center last:flex-none">
                        <button type="button" onClick={() => onJump(n)} className="flex flex-col items-center"> 
                        <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11.5px] font-bold transition ${done
                                ? 'bg-[#C75560] text-white'
                                : current
                                    ? 'border-2 border-[#C75560] text-[#C75560]'
                                    : 'border border-[#EBC2AE] text-[#A77D8D]'
                                }`}>
                            {done ? (
                                <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 10l4 4 8-8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>) : (n)}
                        </div>
                            <span
                                className={`mt-1 block w-[52px] truncate text-center text-[8px] sm:w-auto sm:text-[9.5px] ${current ? 'text-[#54263F]' : 'text-[#A77D8D]'
                                    }`}>
                                {labels[i]}
                            </span>
                        </button>
                        {n < total && (
                            <div className={`mx-1.5 h-[2px] flex-1 rounded-full ${done ? 'bg-[#C75560]' : 'bg-[#F0D1BF]'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ---------------------------------------------------------------------- */
/* Static option lists                                                    */
/* ---------------------------------------------------------------------- */

const COMPANY_SIZE_OPTIONS = ['1–10', '11–50', '51–200', '201–500', '500+', 'Custom'];
const COMPANY_TYPE_OPTIONS = ['Startup', 'Private', 'Public', 'Government', 'NGO'];
const RECRUITER_ROLE_OPTIONS = ['HR', 'Talent Acquisition', 'Hiring Manager', 'Founder', 'CEO', 'Other'];
const HIRING_VOLUME_OPTIONS = ['1–5', '5–20', '20–100', '100+'];
const HIRING_FOR_OPTIONS = ['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote'];
const INDUSTRY_SUGGESTIONS = [
    'Information Technology',
    'Software & SaaS',
    'Financial Services',
    'Banking',
    'Healthcare',
    'Pharmaceuticals',
    'E-commerce',
    'Retail',
    'Manufacturing',
    'Education',
    'EdTech',
    'Real Estate',
    'Construction',
    'Telecommunications',
    'Media & Entertainment',
    'Hospitality',
    'Travel & Tourism',
    'Automotive',
    'Logistics & Supply Chain',
    'Consulting',
    'Legal Services',
    'Non-profit',
    'Energy',
    'Agriculture',
    'Food & Beverage',
    'FinTech',
    'HealthTech',
    'Insurance',
];
const LOCATION_SUGGESTIONS = [
    'Bengaluru, India',
    'Mumbai, India',
    'Delhi, India',
    'Hyderabad, India',
    'Chennai, India',
    'Pune, India',
    'Kolkata, India',
    'Ahmedabad, India',
    'Gurugram, India',
    'Noida, India',
    'New York, USA',
    'San Francisco, USA',
    'London, UK',
    'Singapore',
    'Dubai, UAE',
    'Toronto, Canada',
    'Berlin, Germany',
    'Sydney, Australia',
    'Remote',
];
const STEP_LABELS = ['Recruiter', 'Company', 'Verify', 'Hiring', 'Security'];
const MOCK_OTP = '123456';

/* ---------------------------------------------------------------------- */
/* Main component                                                         */
/* ---------------------------------------------------------------------- */

export default function RecruiterRegisterForm({ onSwitchToLogin }) {
    const [step, setStep] = useState(1);
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const [form, setForm] = useState({
        // Step 1
        firstName: '',
        lastName: '',
        workEmail: '',
        mobileCountryCode: '+91',
        mobileNumber: '',
        jobTitle: '',
        // Step 2
        companyName: '',
        companyWebsite: '',
        companyEmailDomain: '',
        companySize: '',
        companySizeCustom: '',
        industry: '',
        companyLocation: '',
        companyType: '',
        recruiterRole: '',
        companyDescription: '',
        // Step 3
        emailOtp: '',
        emailOtpSent: false,
        emailOtpVerified: false,
        emailOtpTimer: 0,
        gstNumber: '',
        gstFile: null,
        cinNumber: '',
        cinFile: null,
        bizRegFile: null,
        // Step 4
        hiringVolume: '',
        hiringFor: [],
        departments: [],
        // Step 5
        password: '',
        confirmPassword: '',
        showPassword: false,
        showConfirmPassword: false,
        // Consent (now part of Step 5)
        agreeTerms: false,
        agreePrivacy: false,
    });

    const [errors, setErrors] = useState({});

    function update(patch) {
        setForm((f) => ({ ...f, ...patch }));
    }

    function setField(name) {
        return (e) => update({ [name]: e.target.value });
    }

    // Countdown timer for OTP resend
    useEffect(() => {
        const id = setInterval(() => {
            setForm((f) => ({
                ...f,
                emailOtpTimer: f.emailOtpTimer > 0 ? f.emailOtpTimer - 1 : 0,
            }));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    /* ---------------- Validation ---------------- */

    function validateStep(n) {
        const e = {};
        if (n === 1) {
            if (!form.firstName.trim() || form.firstName.trim().length < 2) e.firstName = 'Minimum 2 characters.';
            if (!form.lastName.trim() || form.lastName.trim().length < 2) e.lastName = 'Minimum 2 characters.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.workEmail)) e.workEmail = 'Enter a valid work email.';
            if (!form.mobileNumber || form.mobileNumber.length < 6) e.mobileNumber = 'Enter a valid mobile number.';
            if (!form.jobTitle.trim()) e.jobTitle = 'Job title is required.';
        }
        if (n === 2) {
            if (!form.companyName.trim()) e.companyName = 'Company name is required.';
            if (!/^https?:\/\/.+\..+/.test(form.companyWebsite)) e.companyWebsite = 'Enter a valid URL (https://…).';
            if (!/^[^\s@]+\.[^\s@]+$/.test(form.companyEmailDomain)) e.companyEmailDomain = 'Enter a valid domain, e.g. company.com.';
            if (!form.companySize) e.companySize = 'Select a company size.';
            if (form.companySize === 'Custom' && !form.companySizeCustom.trim()) e.companySizeCustom = 'Enter the company size.';
            if (!form.industry.trim()) e.industry = 'Industry is required.';
            if (!form.companyLocation.trim()) e.companyLocation = 'Company location is required.';
            if (!form.companyType) e.companyType = 'Select a company type.';
            if (!form.recruiterRole) e.recruiterRole = 'Select your role.';
            if (form.companyDescription.length > 1000) e.companyDescription = 'Maximum 1000 characters.';
        }
        if (n === 3) {
            if (!form.emailOtpVerified) e.emailVerify = 'Verify your work email via OTP.';
            if (!form.gstNumber.trim()) e.gstNumber = 'GST number is required.';
            if (!form.gstFile) e.gstFile = 'Upload your GST certificate.';
        }
        if (n === 4) {
            if (!form.hiringVolume) e.hiringVolume = 'Select an option.';
            if (form.hiringFor.length === 0) e.hiringFor = 'Select at least one.';
            if (form.departments.length === 0) e.departments = 'Select at least one department.';
        }
        if (n === 5) {
            const checks = passwordChecks(form.password);
            if (!Object.values(checks).every(Boolean)) e.password = 'Password does not meet all requirements.';
            if (form.confirmPassword !== form.password || !form.confirmPassword) e.confirmPassword = 'Passwords do not match.';
            if (!form.agreeTerms) e.agreeTerms = 'Required.';
            if (!form.agreePrivacy) e.agreePrivacy = 'Required.';
        }
        return e;
    }

    function goNext() {
        const e = validateStep(step);
        setErrors(e);
        if (Object.keys(e).length === 0) setStep((s) => Math.min(5, s + 1));
    }

    function goBack() {
        setErrors({});
        setStep((s) => Math.max(1, s - 1));
    }

    /* ---------------- OTP / verification mocks ---------------- */

    function sendEmailOtp() {
        update({ emailOtpSent: true, emailOtpTimer: 60, emailOtp: '' });
    }
    function verifyEmailOtp() {
        if (form.emailOtp === MOCK_OTP) {
            update({ emailOtpVerified: true });
            setErrors((e) => ({ ...e, emailVerify: undefined }));
        } else {
            setErrors((e) => ({ ...e, emailVerify: 'Incorrect code. Try 123456 for this demo.' }));
        }
    }

    /* ---------------- Final submit ---------------- */

    async function handleSubmit(e) {
        e.preventDefault();
        let firstInvalid = null;
        let combinedErrors = {};
        for (let n = 1; n <= 5; n++) {
            const e2 = validateStep(n);
            if (Object.keys(e2).length > 0 && firstInvalid === null) {
                firstInvalid = n;
                combinedErrors = e2;
            }
        }
        if (firstInvalid !== null) {
            setStep(firstInvalid);
            setErrors(combinedErrors);
            return;
        }

        setSubmitError('');
        setLoading(true);
        try {
            await axiosInstance.post('/recruiter/register', {
                firstName: form.firstName,
                lastName: form.lastName,
                workEmail: form.workEmail,
                mobile: `${form.mobileCountryCode}${form.mobileNumber}`,
                jobTitle: form.jobTitle,
                companyName: form.companyName,
                companyWebsite: form.companyWebsite,
                companyEmailDomain: form.companyEmailDomain,
                companySize: form.companySize === 'Custom' ? form.companySizeCustom : form.companySize,
                industry: form.industry,
                companyLocation: form.companyLocation,
                companyType: form.companyType,
                recruiterRole: form.recruiterRole,
                companyDescription: form.companyDescription,
                gstNumber: form.gstNumber,
                cinNumber: form.cinNumber,
                hiringVolume: form.hiringVolume,
                hiringFor: form.hiringFor,
                departments: form.departments,
                password: form.password,
                // TODO: redirect to payment flow (Rs. 110/year) once wired up
            });
            setSubmitted(true);
        } catch (err) {
            setSubmitError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    /* ---------------- Success screen ---------------- */

    if (submitted) {
        return (
            <div className="recruiter-register flex flex-col items-center py-6 text-center">
                <NoScrollbar />
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C75560] shadow-[0_10px_24px_-10px_rgba(199,85,96,0.65)]">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                        <path d="M4 12l6 6L20 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h2 className="mb-1.5 text-[22px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                    Registration Successful
                </h2>
                <p className="mb-1 text-[13.5px] text-[#80576A]">Your recruiter account has been created.</p>
                <p className="mb-1 text-[13.5px] text-[#80576A]">Your verification is under review.</p>
                <p className="mb-6 text-[13.5px] text-[#80576A]">You'll receive an email once approved.</p>
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="w-full rounded-[12px] bg-[#1D181A] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(29,24,26,0.6)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#3A3034]"
                >
                    Go to Recruiter Login
                </button>
            </div>
        );
    }

    /* ---------------- Render ---------------- */

    return (
        <form onSubmit={handleSubmit} className="recruiter-register">
            <NoScrollbar />
            <h2 className="mb-5 text-[22px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                Recruiter Sign Up
            </h2>
            {/* <p className="mb-5 text-[13px] text-white/55">Registration fee: Rs. 110/year</p> */}

            <StepDots step={step} total={5} labels={STEP_LABELS} onJump={setStep} />

            {/* Step 1 — Recruiter Information */}
            {step === 1 && (
                <div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="First Name" error={errors.firstName} required>
                            <TextInput
                                name="firstName"
                                placeholder="First name"
                                value={form.firstName}
                                onChange={setField('firstName')}
                                error={errors.firstName}
                            />
                        </Field>
                        <Field label="Last Name" error={errors.lastName} required>
                            <TextInput
                                name="lastName"
                                placeholder="Last name"
                                value={form.lastName}
                                onChange={setField('lastName')}
                                error={errors.lastName}
                            />
                        </Field>
                    </div>
                    <Field label="Work Email" error={errors.workEmail} required>
                        <TextInput
                            type="email"
                            name="workEmail"
                            placeholder="you@company.com"
                            value={form.workEmail}
                            onChange={setField('workEmail')}
                            error={errors.workEmail}
                        />
                    </Field>
                    <PhoneInput
                        countryCode={form.mobileCountryCode}
                        number={form.mobileNumber}
                        onCountryCode={(v) => update({ mobileCountryCode: v })}
                        onNumber={(v) => update({ mobileNumber: v })}
                        error={errors.mobileNumber}
                        required
                    />
                    <Field label="Job Title" error={errors.jobTitle} required>
                        <TextInput
                            name="jobTitle"
                            placeholder="e.g. Talent Acquisition Manager"
                            value={form.jobTitle}
                            onChange={setField('jobTitle')}
                            error={errors.jobTitle}
                        />
                    </Field>
                </div>
            )}

            {/* Step 2 — Company Information */}
            {step === 2 && (
                <div>
                    <Field label="Company Name" error={errors.companyName} required>
                        <TextInput
                            name="companyName"
                            placeholder="Company name"
                            value={form.companyName}
                            onChange={setField('companyName')}
                            error={errors.companyName}
                        />
                    </Field>
                    <Field label="Company Website" error={errors.companyWebsite} required>
                        <TextInput
                            name="companyWebsite"
                            placeholder="https://company.com"
                            value={form.companyWebsite}
                            onChange={setField('companyWebsite')}
                            error={errors.companyWebsite}
                        />
                    </Field>
                    <Field label="Company Email Domain" error={errors.companyEmailDomain} required>
                        <TextInput
                            name="companyEmailDomain"
                            placeholder="company.com"
                            value={form.companyEmailDomain}
                            onChange={setField('companyEmailDomain')}
                            error={errors.companyEmailDomain}
                        />
                    </Field>

                    <Field label="Company Size" error={errors.companySize || errors.companySizeCustom} required>
                        <NativeSelect
                            options={COMPANY_SIZE_OPTIONS}
                            placeholder="Select company size"
                            value={form.companySize}
                            onChange={setField('companySize')}
                            error={errors.companySize}
                        />
                        {form.companySize === 'Custom' && (
                            <div className="mt-2">
                                <TextInput
                                    placeholder="Enter custom company size"
                                    value={form.companySizeCustom}
                                    onChange={setField('companySizeCustom')}
                                    error={errors.companySizeCustom}
                                />
                            </div>
                        )}
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <AutocompleteInput
                            label="Industry"
                            placeholder="e.g. Information Technology"
                            value={form.industry}
                            onChange={(v) => update({ industry: v })}
                            suggestions={INDUSTRY_SUGGESTIONS}
                            error={errors.industry}
                            required
                        />
                        <AutocompleteInput
                            label="Company Location"
                            placeholder="City, Country"
                            value={form.companyLocation}
                            onChange={(v) => update({ companyLocation: v })}
                            suggestions={LOCATION_SUGGESTIONS}
                            error={errors.companyLocation}
                            required
                        />
                    </div>

                    <SearchableSelect
                        label="Company Type"
                        options={COMPANY_TYPE_OPTIONS}
                        value={form.companyType}
                        onChange={(v) => update({ companyType: v })}
                        placeholder="Select company type"
                        error={errors.companyType}
                        required
                    />

                    <Field label="Recruiter Role" error={errors.recruiterRole} required>
                        <NativeSelect
                            options={RECRUITER_ROLE_OPTIONS}
                            placeholder="Select your role"
                            value={form.recruiterRole}
                            onChange={setField('recruiterRole')}
                            error={errors.recruiterRole}
                        />
                    </Field>

                    <Field label="Company Description" error={errors.companyDescription}>
                        <TextArea
                            placeholder="About the company"
                            rows={3}
                            maxLength={1000}
                            value={form.companyDescription}
                            onChange={setField('companyDescription')}
                            error={errors.companyDescription}
                        />
                    </Field>
                </div>
            )}

            {/* Step 3 — Verification */}
            {step === 3 && (
                <div>
                    <p className="mb-2 text-[13px] font-semibold text-[#54263F]">Email Verification</p>
                    <div className="mb-4 min-h-[104px] rounded-[12px] border border-[#EBC2AE] bg-[#FFF9F5] p-3.5">
                        {!form.emailOtpVerified ? (
                            <>
                                {!form.emailOtpSent ? (
                                    <button
                                        type="button"
                                        onClick={sendEmailOtp}
                                        className="rounded-[10px] border border-[#1D181A] bg-[#1D181A] px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-[#3A3034]"
                                    >
                                        Send OTP
                                    </button>
                                ) : (
                                    <div>
                                        <OtpInput value={form.emailOtp} onChange={(v) => update({ emailOtp: v })} />
                                        <div className="mt-2.5 flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={verifyEmailOtp}
                                                className="rounded-[10px] bg-[#C75560] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:bg-[#AB4054]"
                                            >
                                                Verify
                                            </button>
                                            <button
                                                type="button"
                                                disabled={form.emailOtpTimer > 0}
                                                onClick={sendEmailOtp}
                                                className="text-[12px] font-medium text-[#C75560] disabled:text-[#A77D8D]"
                                            >
                                                {form.emailOtpTimer > 0 ? `Resend in ${form.emailOtpTimer}s` : 'Resend OTP'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#9A671A]">
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                    <path d="M4 10l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Email verified via OTP
                            </p>
                        )}
                    </div>
                    {errors.emailVerify && <p className={`${errorBase} -mt-2 mb-4`}>{errors.emailVerify}</p>}

                    <p className="mb-2 text-[13px] font-semibold text-[#54263F]">Company Verification</p>
                    <Field label="GST Number" error={errors.gstNumber} required>
                        <TextInput
                            placeholder="22AAAAA0000A1Z5"
                            value={form.gstNumber}
                            onChange={setField('gstNumber')}
                            error={errors.gstNumber}
                        />
                    </Field>
                    <FileDropzone
                        label="Upload GST Certificate"
                        file={form.gstFile}
                        onFile={(f, err) => {
                            update({ gstFile: f });
                            setErrors((e) => ({ ...e, gstFile: err || (f ? undefined : e.gstFile) }));
                        }}
                        error={errors.gstFile}
                    />

                    <Field label="CIN (Corporate Identification Number)" hint="Optional">
                        <TextInput
                            placeholder="L12345MH2020PLC123456"
                            value={form.cinNumber}
                            onChange={setField('cinNumber')}
                        />
                    </Field>
                    <FileDropzone
                        label="Upload CIN Certificate"
                        hint="Optional"
                        file={form.cinFile}
                        onFile={(f, err) => {
                            update({ cinFile: f });
                            setErrors((e) => ({ ...e, cinFile: err }));
                        }}
                        error={errors.cinFile}
                    />

                    <FileDropzone
                        label="Business Registration Certificate"
                        hint="Optional"
                        file={form.bizRegFile}
                        onFile={(f, err) => {
                            update({ bizRegFile: f });
                            setErrors((e) => ({ ...e, bizRegFile: err }));
                        }}
                        error={errors.bizRegFile}
                    />
                </div>
            )}

            {/* Step 4 — Hiring Information */}
            {step === 4 && (
                <div>
                    <Field label="How many people do you hire?" error={errors.hiringVolume} required>
                        <NativeSelect
                            options={HIRING_VOLUME_OPTIONS}
                            placeholder="Select hiring volume"
                            value={form.hiringVolume}
                            onChange={setField('hiringVolume')}
                            error={errors.hiringVolume}
                        />
                    </Field>

                    <CheckboxCards
                        label="Hiring For"
                        options={HIRING_FOR_OPTIONS}
                        value={form.hiringFor}
                        onChange={(v) => update({ hiringFor: v })}
                        error={errors.hiringFor}
                        required
                    />

                    <FreeChipInput
                        label="Departments"
                        value={form.departments}
                        onChange={(v) => update({ departments: v })}
                        error={errors.departments}
                        required
                    />
                </div>
            )}

            {/* Step 5 — Security */}
            {step === 5 && (
                <div>
                    <PasswordField
                        label="Password"
                        value={form.password}
                        onChange={setField('password')}
                        show={form.showPassword}
                        onToggleShow={() => update({ showPassword: !form.showPassword })}
                        error={errors.password}
                        placeholder="Create a password"
                    />
                    <PasswordAcceptance password={form.password} />
                    <PasswordField
                        label="Confirm Password"
                        value={form.confirmPassword}
                        onChange={setField('confirmPassword')}
                        show={form.showConfirmPassword}
                        onToggleShow={() => update({ showConfirmPassword: !form.showConfirmPassword })}
                        error={errors.confirmPassword}
                        placeholder="Confirm your password"
                    />

                    <label className="mb-3 mt-1 flex cursor-pointer items-start gap-2 text-[12.5px] text-[#80576A]">
                        <input
                            type="checkbox"
                            checked={form.agreeTerms}
                            onChange={(e) => update({ agreeTerms: e.target.checked })}
                            className="mt-0.5 h-3.5 w-3.5 accent-[#C75560]"
                        />
                        I agree to the{' '}
                        <a href="/terms" className="text-[#C75560] hover:underline">
                            Terms &amp; Conditions
                        </a>{' '}
                        <span className="text-[#C75560]">*</span>
                    </label>
                    {errors.agreeTerms && <p className={`${errorBase} -mt-2 mb-2`}>{errors.agreeTerms}</p>}

                    <label className="mb-1 flex cursor-pointer items-start gap-2 text-[12.5px] text-[#80576A]">
                        <input
                            type="checkbox"
                            checked={form.agreePrivacy}
                            onChange={(e) => update({ agreePrivacy: e.target.checked })}
                            className="mt-0.5 h-3.5 w-3.5 accent-[#C75560]"
                        />
                        I agree to the{' '}
                        <a href="/privacy" className="text-[#C75560] hover:underline">
                            Privacy Policy
                        </a>{' '}
                        <span className="text-[#C75560]">*</span>
                    </label>
                    {errors.agreePrivacy && <p className={`${errorBase} -mt-2`}>{errors.agreePrivacy}</p>}
                </div>
            )}

            {submitError && <p className="mb-3 mt-4 text-[12.5px] font-medium text-[#B3261E]">{submitError}</p>}

            <div className="mt-4 flex items-center gap-3">
                {step > 1 && (
                    <button
                        type="button"
                        onClick={goBack}
                        className="flex-1 rounded-[12px] border border-[#1D181A] bg-[#FFFDFC] px-4 py-2.5 text-[13.5px] font-semibold text-[#1D181A] transition hover:bg-[#FFF0E8]"
                    >
                        Back
                    </button>
                )}
                {step < 5 ? (
                    <button
                        type="button"
                        onClick={goNext}
                        className="flex-1 rounded-[12px] bg-[#1D181A] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(29,24,26,0.6)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#3A3034]"
                    >
                        Continue
                    </button>
                ) : (
                    <button
                        type="submit"
                        disabled={loading || !form.agreeTerms || !form.agreePrivacy}
                        className="flex-1 rounded-[12px] bg-[#C75560] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(199,85,96,0.65)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#AB4054] disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                        {loading ? 'Registering…' : 'Register'}
                    </button>
                )}
            </div>

            <p className="mt-3 text-center text-[12.5px] text-[#80576A]">
                Already have an account?{' '}
                <button
                    type="button"
                    onClick={onSwitchToLogin}
                    className="font-semibold text-[#C75560] underline underline-offset-2 hover:text-[#1D181A]"
                >
                    Log in
                </button>
            </p>
        </form>
    );
}