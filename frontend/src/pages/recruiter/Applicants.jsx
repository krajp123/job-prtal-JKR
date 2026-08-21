import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Award,
  Ban,
  Bookmark,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Download,
  FileText,
  GraduationCap,
  Languages as LanguagesIcon,
  Loader2,
  ExternalLink,
  Mail,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import { FONT_DISPLAY } from '../../theme';

// lucide-react's newer versions dropped brand/logo icons (Github, Twitter, etc.)
// from the package, so this one is a small inline SVG instead of an import.
function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-3.16 19.5c.5.1.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.55 9.55 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z" />
    </svg>
  );
}

/**
 * ---------------------------------------------------------------------------
 * Data shape this page is written against. The current API only reliably
 * sends `_id`, `status`, `job`, `candidate.name` and `candidate.uniqueId` —
 * every other field below is read defensively (optional chaining + a
 * fallback) so the page degrades gracefully until the backend sends richer
 * candidate data. Wire these up field-by-field as they become available:
 *
 * application = {
 *   _id, status, appliedAt,
 *   job: { _id, title },
 *   candidate: {
 *     _id, name, uniqueId, title, avatarUrl, phone, email,
 *     portfolioUrl, linkedinUrl, location, experienceYears,
 *     expectedSalary, noticePeriod, matchScore, rating,
 *     skills: [], education: [], projects: [], certificates: [],
 *     languages: [], resumeAvailable,
 *   },
 *   timeline: [{ key: 'applied'|'viewed'|'shortlisted'|'interview'|'offer', at }],
 * }
 *
 * NOTE: `applicantsForRecruiter` on the backend populates candidate with
 * `-passwordHash -phone`, i.e. the phone number is deliberately stripped
 * before it reaches this page. The Call action below will stay disabled
 * for every candidate until that's changed server-side (e.g. a masked
 * click-to-call endpoint) — this isn't a bug in this file.
 * ---------------------------------------------------------------------------
 */

const STATUS_META = {
  new: { label: 'New Applicant', dot: 'bg-[#B9AAB0]', bg: '#F1ECEE', text: '#6B5A63', border: '#DDD0D4' },
  reviewed: { label: 'Under Review', dot: 'bg-[#E8B33A]', bg: '#FFF5D9', text: '#9A671A', border: '#F7C56B' },
  shortlisted: { label: 'Shortlisted', dot: 'bg-[#3E9B5D]', bg: '#E7F5EA', text: '#1E7E34', border: '#A8DAB5' },
  interview: { label: 'Interview Scheduled', dot: 'bg-[#3B72E0]', bg: '#E8F0FE', text: '#1A56DB', border: '#A9C6FA' },
  selected: { label: 'Selected', dot: 'bg-[#8C4FE0]', bg: '#F4E9FF', text: '#7C3AED', border: '#D8B4FE' },
  rejected: { label: 'Rejected', dot: 'bg-[#D8574F]', bg: '#FFF0EE', text: '#B3261E', border: '#E9B6AF' },
};

const RESUME_DOWNLOAD_FEE = 9;

const KPI_ORDER = ['new', 'reviewed', 'shortlisted', 'interview', 'selected', 'rejected'];
const KPI_LABELS = {
  new: 'New Applicants',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  selected: 'Selected',
  rejected: 'Rejected',
};

// Maps this page's internal status keys to the string the backend's
// PATCH /api/applications/:id/status expects (see application.controller.js,
// `updateStatus`). The controller's own comment only confirms 'offered' and
// 'rejected' — adjust the rest here in one place if your Application model's
// enum uses different values (e.g. 'applied' vs 'new').
const STATUS_VALUE_FOR_KEY = {
  new: 'applied',
  reviewed: 'reviewed',
  shortlisted: 'shortlisted',
  interview: 'interview_scheduled',
  selected: 'offered',
  rejected: 'rejected',
};

// The order candidates move through the pipeline, used to figure out what
// "Move to Next Round" should do from wherever the candidate is currently.
const STAGE_FLOW = ['new', 'reviewed', 'shortlisted', 'interview', 'selected'];

function getNextStageKey(currentKey) {
  const index = STAGE_FLOW.indexOf(currentKey);
  if (index === -1 || index === STAGE_FLOW.length - 1) return null;
  return STAGE_FLOW[index + 1];
}

const TIMELINE_STEPS = [
  { key: 'applied', label: 'Applied' },
  { key: 'viewed', label: 'Resume Viewed' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'interview', label: 'Interview Scheduled' },
  { key: 'offer', label: 'Offer Sent' },
];

function normalizeStatus(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('reject')) return 'rejected';
  if (s.includes('select') || s.includes('hire') || s.includes('offer')) return 'selected';
  if (s.includes('interview')) return 'interview';
  if (s.includes('shortlist')) return 'shortlisted';
  if (s.includes('review') || s.includes('applied')) return 'reviewed';
  return 'new';
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getCandidateField(candidate, field) {
  return candidate?.[field] ?? candidate?.profile?.[field] ?? candidate?.profile?.socialLinks?.[field] ?? candidate?.socialLinks?.[field];
}

function getCandidateArray(candidate, field) {
  const direct = candidate?.[field];
  const profileValue = candidate?.profile?.[field];
  if (Array.isArray(direct)) return direct;
  if (Array.isArray(profileValue)) return profileValue;
  if (direct != null) return [direct];
  if (profileValue != null) return [profileValue];
  return [];
}

function getCandidateExperienceYears(candidate) {
  if (candidate?.experienceYears != null) return candidate.experienceYears;
  const profileExperience = candidate?.profile?.experience || candidate?.experience;
  if (!Array.isArray(profileExperience) || profileExperience.length === 0) return undefined;

  let totalYears = 0;
  let foundValue = false;
  profileExperience.forEach((item) => {
    const years = Number(item.totalExpYears);
    const months = Number(item.totalExpMonths);
    if (!Number.isNaN(years) || !Number.isNaN(months)) {
      foundValue = true;
      totalYears += (Number.isFinite(years) ? years : 0) + (Number.isFinite(months) ? months / 12 : 0);
      return;
    }

    const fromDate = item.from ? new Date(item.from) : null;
    const toDate = item.to ? new Date(item.to) : null;
    if (fromDate instanceof Date && !Number.isNaN(fromDate.getTime()) && toDate instanceof Date && !Number.isNaN(toDate.getTime())) {
      foundValue = true;
      totalYears += Math.max(0, (toDate - fromDate) / 1000 / 60 / 60 / 24 / 365);
    }
  });

  if (foundValue) return Math.floor(totalYears) || undefined;
  return profileExperience.length;
}

function getCandidateNoticePeriod(candidate) {
  const direct = candidate?.noticePeriod;
  if (direct) return direct;
  const profileExperience = candidate?.profile?.experience;
  if (!Array.isArray(profileExperience)) return undefined;
  return profileExperience.find((item) => item.noticePeriod)?.noticePeriod || candidate?.profile?.noticePeriod || candidate?.profile?.notice;
}

function initials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function formatMoney(amount) {
  const value = Number(amount || 0);
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatusChip({ statusKey, className = '' }) {
  const meta = STATUS_META[statusKey] || STATUS_META.new;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold capitalize ${className}`}
      style={{ backgroundColor: meta.bg, color: meta.text, borderColor: meta.border }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function MatchRing({ score, size = 46 }) {
  if (score === null || score === undefined) return null;
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#F3E1DC" strokeWidth="4.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#C75560"
          strokeWidth="4.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[#54263F]">
        {clamped}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vertical activity timeline — a dot-and-line rail on the left, content on
// the right, one step per row. Lives side-by-side with the Actions card, so
// it needs to read top-to-bottom in a narrow column rather than scroll
// horizontally.
//
// We only have `appliedAt` and `updatedAt` on an application — not a
// timestamp per pipeline stage — so we show a real date for the very first
// step (applied) and for whichever step is currently active (using
// updatedAt, i.e. "when it last moved"), and an honest "Completed" /
// "Pending" label everywhere else rather than inventing dates we don't have.
// ---------------------------------------------------------------------------
function TimelineSteps({ currentStepIndex, appliedAt, updatedAt }) {
  return (
    <div className="relative">
      {TIMELINE_STEPS.map((step, index) => {
        const isLast = index === TIMELINE_STEPS.length - 1;
        // The last step (Offer Sent) has no step after it, so `index < currentStepIndex`
        // can never be true for it — without this it would stay stuck showing as
        // "current" (outlined, unchecked) forever instead of ticking off as complete.
        const isFinalStepReached = isLast && index === currentStepIndex;
        const done = index < currentStepIndex || isFinalStepReached;
        const isCurrent = index === currentStepIndex && !isFinalStepReached;
        const reached = index <= currentStepIndex;
        return (
          <div key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span
                className={`absolute left-[15px] top-8 h-[calc(100%-14px)] w-0.5 rounded-full ${
                  done ? 'bg-[#3E9B5D]' : 'bg-[#F1ECEE]'
                }`}
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                done
                  ? 'border-[#3E9B5D] bg-[#3E9B5D] text-white'
                  : isCurrent
                    ? 'border-[#3E9B5D] bg-white text-[#3E9B5D]'
                    : 'border-[#DDD0D4] bg-white text-[#B9AAB0]'
              }`}
            >
              {done ? <Check size={15} /> : <span className="text-[11px] font-bold">{index + 1}</span>}
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className={`text-[12.5px] font-bold leading-tight ${reached ? 'text-[#1D181A]' : 'text-[#B9A2AC]'}`}>
                {step.label}
              </p>
              <p className="mt-0.5 text-[11px] text-[#80576A]">
                {index === 0 && appliedAt
                  ? timeAgo(appliedAt) || 'Completed'
                  : (isCurrent || isFinalStepReached) && updatedAt
                    ? timeAgo(updatedAt)
                    : done
                      ? 'Completed'
                      : 'Pending'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityTimeline({ statusKey, currentStepIndex, appliedAt, updatedAt }) {
  const isRejected = statusKey === 'rejected';

  return (
    <div className="flex h-full flex-col rounded-lg border border-[#ECE7E5] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6161]">Activity Timeline</p>
        <span className="rounded-full bg-[#F8F5F3] px-2.5 py-1 text-xs font-semibold text-[#80576A]">Pipeline</span>
      </div>

      {isRejected && (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#E9B6AF] bg-[#FFF0EE] px-3.5 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D8574F] text-white">
            <Ban size={15} />
          </span>
          <div>
            <p className="text-[13px] font-bold text-[#B3261E]">Application closed — Rejected</p>
            <p className="mt-0.5 text-[11px] text-[#B3261E]">
              {updatedAt ? `Closed ${timeAgo(updatedAt)}` : 'This application will not move forward.'}
            </p>
          </div>
        </div>
      )}

      <div className={`mt-4 ${isRejected ? 'opacity-40 grayscale' : ''}`}>
        <TimelineSteps currentStepIndex={isRejected ? -1 : currentStepIndex} appliedAt={appliedAt} updatedAt={updatedAt} />
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <div className="portal-card flex h-full min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
      <UserRound size={28} className="text-[#9A671A]" />
      <h2 className="mt-4 text-[16px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
        Select a candidate
      </h2>
      <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#80576A]">
        Choose someone from the list to see their full profile, resume, and recruiter notes.
      </p>
    </div>
  );
}

export default function Applicants() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Stores the last applicationId we already handled, not just "did we run
  // once" — so a NEW ?applicationId= while this page is already mounted
  // (e.g. recruiter clicks another candidate in the pipeline without the
  // Applicants page unmounting/remounting) still gets picked up.
  const lastHandledDeepLinkIdRef = useRef(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingApplicants, setLoadingApplicants] = useState(true);
  const [error, setError] = useState('');

  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const [highlightedApplicantId, setHighlightedApplicantId] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [educationFilter, setEducationFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [salaryFilter, setSalaryFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [notesByCandidate, setNotesByCandidate] = useState({});
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [statusUpdateError, setStatusUpdateError] = useState('');
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [interviewCandidate, setInterviewCandidate] = useState(null);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewError, setInterviewError] = useState('');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerCandidate, setOfferCandidate] = useState(null);
  const [offerFile, setOfferFile] = useState(null);
  const [offerError, setOfferError] = useState('');
  const [offerUploading, setOfferUploading] = useState(false);
  const [downloadLoadingId, setDownloadLoadingId] = useState('');
  const [resumePaymentModalOpen, setResumePaymentModalOpen] = useState(false);
  const [resumePaymentCandidate, setResumePaymentCandidate] = useState(null);
  const [resumePaymentDetails, setResumePaymentDetails] = useState({
    recruiterName: '',
    companyName: '',
    email: '',
    walletBalance: 0,
    amount: RESUME_DOWNLOAD_FEE,
    baseAmount: RESUME_DOWNLOAD_FEE,
    gstAmount: 0,
    gstRate: 0,
  });
  const [resumePaying, setResumePaying] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    async function loadRecruiterData() {
      try {
        const { data: jobsData } = await axiosInstance.get('/jobs/mine/list');
        setJobs(jobsData || []);
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Could not load your job posts.');
      } finally {
        setLoadingJobs(false);
      }

      try {
        setLoadingApplicants(true);
        const { data } = await axiosInstance.get('/applications/recruiter');
        setApplicants(data || []);
      } catch (requestError) {
        setError((currentError) => currentError || requestError.response?.data?.error || 'Could not load applicants.');
      } finally {
        setLoadingApplicants(false);
      }
    }

    loadRecruiterData();
  }, []);

  // Deep-link support: when the recruiter clicks a candidate in the
  // dashboard's Candidate Pipeline, they land here with ?applicationId=<id>.
  // Once the applicants list has loaded, auto-open that candidate's profile
  // and clear the job filter so it isn't hidden by whichever job was
  // previously selected. Runs once per page load.
  // Deep-link support: when the recruiter clicks a candidate in the
  // dashboard's Candidate Pipeline, they land here with ?applicationId=<id>.
  // We clear any active filters (so the card isn't hidden), scroll to it,
  // and glow-highlight it for a few seconds so it's obvious which candidate
  // they clicked — instead of force-opening the detail panel.
  useEffect(() => {
    const targetId = searchParams.get('applicationId');
    if (!targetId) return;
    if (lastHandledDeepLinkIdRef.current === targetId) return;
    if (loadingApplicants) return;

    const match = applicants.find((app) => app._id === targetId);
    if (match) {
      setSelectedJob('');
      setSearchTerm('');
      setStatusFilter('');
      setExperienceFilter('');
      setLocationFilter('');
      setEducationFilter('');
      setSkillFilter('');
      setSalaryFilter('');
      setAvailabilityFilter('');
      setPendingScrollId(targetId);
      setHighlightedApplicantId(targetId);
    }
    lastHandledDeepLinkIdRef.current = targetId;

    // Clean the query string so refreshing/toggling doesn't re-trigger this.
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('applicationId');
      return next;
    }, { replace: true });
  }, [loadingApplicants, applicants, searchParams, setSearchParams]);

  // Fade the glow out on its own after a few seconds.
  useEffect(() => {
    if (!highlightedApplicantId) return;
    const timer = window.setTimeout(() => setHighlightedApplicantId(null), 2800);
    return () => window.clearTimeout(timer);
  }, [highlightedApplicantId]);

  // Filter options derived from whatever data the API actually sends.
  // Fields that aren't present yet simply produce an "Any" only dropdown.
  const filterOptions = useMemo(() => {
    const locations = new Set();
    const education = new Set();
    const skills = new Set();
    const availability = new Set();
    applicants.forEach((app) => {
      const c = app.candidate || {};
      const location = getCandidateField(c, 'location');
      if (location) locations.add(location);
      const educationArray = getCandidateArray(c, 'education');
      educationArray.forEach((e) => {
        const label = typeof e === 'string'
          ? e
          : e.degree || e.courseName || e.institution || e.educationLevel || e.schoolName || [e.stream, e.specialization].filter(Boolean).join(' - ');
        if (label) education.add(label);
      });
      getCandidateArray(c, 'skills').forEach((skill) => {
        if (skill) skills.add(skill);
      });
      const noticePeriod = getCandidateField(c, 'noticePeriod');
      if (noticePeriod) availability.add(noticePeriod);
    });

    return {
      locations: Array.from(locations).sort(),
      education: Array.from(education).sort(),
      skills: Array.from(skills).sort(),
      availability: Array.from(availability).sort(),
    };
  }, [applicants]);

  const jobFilteredApplicants = useMemo(
    () =>
      selectedJob
        ? applicants.filter((application) => String(application.job?._id || application.job) === selectedJob)
        : applicants,
    [applicants, selectedJob],
  );

  const visibleApplicants = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return jobFilteredApplicants.filter((app) => {
      const c = app.candidate || {};
      const profile = c.profile || {};
      const name = c.name || profile.name || '';
      const title = c.title || profile.headline || '';
      const skillsArray = getCandidateArray(c, 'skills');
      const location = getCandidateField(c, 'location');
      const educationArray = getCandidateArray(c, 'education');
      const noticePeriod = getCandidateNoticePeriod(c);
      const expectedSalary = getCandidateField(c, 'expectedSalary');

      if (term) {
        const haystack = `${name} ${title} ${skillsArray.join(' ')}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (statusFilter && normalizeStatus(app.status) !== statusFilter) return false;
      const experienceYears = getCandidateExperienceYears(c);
      if (experienceFilter && experienceYears != null && Number(experienceYears) < Number(experienceFilter)) return false;
      if (locationFilter && location && location !== locationFilter) return false;
      if (educationFilter && educationArray.length) {
        const eduList = educationArray.map((e) => {
          if (typeof e === 'string') return e;
          return e.degree || e.courseName || e.institution || e.educationLevel || e.schoolName || [e.stream, e.specialization].filter(Boolean).join(' - ');
        });
        if (!eduList.includes(educationFilter)) return false;
      }
      if (skillFilter && skillsArray.length && !skillsArray.includes(skillFilter)) return false;
      if (salaryFilter && expectedSalary != null && Number(expectedSalary) > Number(salaryFilter)) return false;
      if (availabilityFilter && noticePeriod && noticePeriod !== availabilityFilter) return false;
      return true;
    });
  }, [jobFilteredApplicants, searchTerm, statusFilter, experienceFilter, locationFilter, educationFilter, skillFilter, salaryFilter, availabilityFilter]);

  const kpiCounts = useMemo(() => {
    const counts = { new: 0, reviewed: 0, shortlisted: 0, interview: 0, selected: 0, rejected: 0 };
    jobFilteredApplicants.forEach((app) => {
      counts[normalizeStatus(app.status)] += 1;
    });
    return counts;
  }, [jobFilteredApplicants]);

  useEffect(() => {
    if (!visibleApplicants.some((app) => app._id === selectedApplicantId)) {
      setSelectedApplicantId(null);
    }
  }, [visibleApplicants, selectedApplicantId]);

  const selectedApplicant = visibleApplicants.find((app) => app._id === selectedApplicantId) || null;

  // Once the deep-linked candidate's card exists in the (now unfiltered)
  // list, scroll it into view so it's visible without manual searching
  // through hundreds of applicants.
  useEffect(() => {
    if (!pendingScrollId) return;
    const el = document.getElementById(`applicant-card-${pendingScrollId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setPendingScrollId(null);
    }
  }, [pendingScrollId, visibleApplicants]);

  const selectedJobTitle = jobs.find((job) => job._id === selectedJob)?.title;
  const isSchedulingInterview = interviewCandidate ? statusUpdatingId === interviewCandidate._id : false;
  const activeFiltersCount = [statusFilter, experienceFilter, locationFilter, educationFilter, skillFilter, salaryFilter, availabilityFilter].filter(Boolean).length;

  function resetFilters() {
    setStatusFilter('');
    setExperienceFilter('');
    setLocationFilter('');
    setEducationFilter('');
    setSkillFilter('');
    setSalaryFilter('');
    setAvailabilityFilter('');
  }

  function openCandidate(id) {
    if (selectedApplicantId === id) {
      setSelectedApplicantId(null);
      setMobileDetailOpen(false);
      return;
    }
    setSelectedApplicantId(id);
    setMobileDetailOpen(true);
  }

  async function openResumePaymentModal(candidateId) {
    const candidateApplication = applicants.find((application) => {
      const candidate = application.candidate || {};
      return candidate._id === candidateId || application._id === candidateId;
    });

    if (!candidateApplication) {
      showToast('Candidate details are not available right now.');
      return;
    }

    try {
      const [{ data: recruiterProfile }, { data: walletSummary }] = await Promise.all([
        axiosInstance.get('/recruiter/me/profile'),
        axiosInstance.get('/recruiter/wallet/summary'),
      ]);

      setResumePaymentDetails({
        recruiterName: recruiterProfile?.companyName || recruiterProfile?.name || 'Recruiter',
        companyName: recruiterProfile?.companyName || 'Your company',
        email: recruiterProfile?.email || '',
        walletBalance: Number(walletSummary?.balance || 0),
        amount: Number(walletSummary?.resumeDownloadFee || RESUME_DOWNLOAD_FEE),
        baseAmount: Number(walletSummary?.resumeDownloadBaseAmount || RESUME_DOWNLOAD_FEE),
        gstAmount: Number(walletSummary?.resumeDownloadGstAmount || 0),
        gstRate: Number(walletSummary?.resumeDownloadGstRate || 0),
      });
      setResumePaymentCandidate(candidateApplication);
      setResumePaymentModalOpen(true);
    } catch (error) {
      console.error('Failed to load wallet details for resume paywall:', error);
      showToast(error.response?.data?.error || 'Could not load wallet details.');
    }
  }

  async function confirmResumePayment() {
    const candidateId = resumePaymentCandidate?.candidate?._id || resumePaymentCandidate?._id;

    if (!candidateId) {
      showToast('Candidate details are missing.');
      return;
    }

    setDownloadLoadingId(candidateId);
    setResumePaying(true);

    try {
      const availabilityResponse = await axiosInstance.get(`/recruiter/candidate/${candidateId}/resume/availability`);
      const originalFilename = availabilityResponse?.data?.resumeFilename;

      const downloadUrl = `/recruiter/candidate/${candidateId}/resume/download`;
      const fileResponse = await axiosInstance.get(downloadUrl, { responseType: 'blob' });
      const contentDisposition = fileResponse.headers['content-disposition'] || '';
      const customFilename = fileResponse.headers['x-resume-filename'];
      let filename = customFilename || originalFilename || 'resume.pdf';
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      if (utf8Match?.[1]) {
        filename = decodeURIComponent(utf8Match[1]);
      } else if (asciiMatch?.[1]) {
        filename = asciiMatch[1];
      }

      const blob = new Blob([fileResponse.data], { type: fileResponse.data.type || 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setResumePaymentModalOpen(false);
      setResumePaymentCandidate(null);
      setResumePaymentDetails({ recruiterName: '', companyName: '', email: '', walletBalance: 0, amount: RESUME_DOWNLOAD_FEE, baseAmount: RESUME_DOWNLOAD_FEE, gstAmount: 0, gstRate: 0 });
      showToast('Resume downloaded successfully. Wallet charged successfully.');
    } catch (err) {
      console.error('Resume download flow failed:', err);
      let message = err.response?.data?.error || err.message || 'Could not complete resume download.';
      const responseData = err?.response?.data;
      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const parsed = JSON.parse(text);
          message = parsed?.error || message;
        } catch {
          message = 'Could not complete resume download.';
        }
      }

      if (message === 'No resume available.') {
        showToast(message);
        return;
      }
      if (message === 'Insufficient wallet balance') {
        showToast('Insufficient wallet balance. Add money to your wallet first.');
        return;
      }
      showToast(message);
    } finally {
      setDownloadLoadingId('');
      setResumePaying(false);
    }
  }

  async function downloadResume(candidateId) {
    await openResumePaymentModal(candidateId);
  }

  async function updateApplicationStatus(applicationId, statusValue, extraPayload = {}) {
    setStatusUpdateError('');
    setStatusUpdatingId(applicationId);

    // Snapshot so we can cleanly roll back if the request fails.
    const previousApplicants = applicants;
    const changedAt = new Date().toISOString();

    // Optimistic update: flip the status locally right away so the Activity
    // Timeline, action buttons, and KPI counts all reflect the new stage
    // instantly — instead of waiting on (and depending on the exact shape
    // of) whatever the server happens to send back.
    setApplicants((prev) =>
      prev.map((app) => (app._id === applicationId ? { ...app, status: statusValue, updatedAt: changedAt } : app))
    );

    try {
      const { data } = await axiosInstance.patch(`/applications/${applicationId}/status`, { status: statusValue, ...extraPayload });
      // Some backends return the application directly, others wrap it
      // (e.g. { application: {...} } or { data: {...} }) — unwrap defensively.
      const updated = data?.application || data?.data || data || {};
      const { candidate: updatedCandidate, ...rest } = updated;

      setApplicants((prev) =>
        prev.map((app) => {
          if (app._id !== applicationId) return app;
          return {
            ...app,
            ...rest,
            // Never let a partial/unpopulated candidate — e.g. just a raw
            // ObjectId string, or a stripped-down doc from a write response
            // that skipped .populate() — overwrite the fully populated
            // candidate we already have in memory. This was wiping out
            // email/skills/etc. right after a status change.
            candidate:
              updatedCandidate && typeof updatedCandidate === 'object'
                ? { ...app.candidate, ...updatedCandidate }
                : app.candidate,
            // Guard against the response omitting `status` entirely, which
            // would otherwise undo the optimistic update above.
            status: rest.status || statusValue,
          };
        })
      );
    } catch (requestError) {
      setApplicants(previousApplicants); // roll back the optimistic change
      setStatusUpdateError(requestError.response?.data?.error || 'Could not update this application\'s status.');
    } finally {
      setStatusUpdatingId(null);
    }
    return true;
  }

  async function moveToNextStage(application) {
    const currentKey = normalizeStatus(application.status);
    const nextKey = getNextStageKey(currentKey);
    if (!nextKey) return;
    const success = await updateApplicationStatus(application._id, STATUS_VALUE_FOR_KEY[nextKey]);
    if (success) showToast(`Moved to ${STATUS_META[nextKey].label}`);
  }

  // Jumps straight to "shortlisted" regardless of current stage — useful when a
  // recruiter wants to flag a strong candidate without walking the full pipeline.
  async function shortlistApplication(application) {
    const success = await updateApplicationStatus(application._id, STATUS_VALUE_FOR_KEY.shortlisted);
    if (success) showToast('Candidate shortlisted successfully.');
  }

  function openInterviewModal(application) {
    setInterviewCandidate(application);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewError('');
    setInterviewModalOpen(true);
  }

  function openOfferModal(application) {
    setOfferCandidate(application);
    setOfferFile(null);
    setOfferError('');
    setOfferModalOpen(true);
  }

  function sendOffer(application) {
    openOfferModal(application);
  }

  // Rejections aren't final — a recruiter can walk one back into the "reviewed"
  // stage if it was a mistake or the candidate should be reconsidered.
  function reopenApplication(application) {
    updateApplicationStatus(application._id, STATUS_VALUE_FOR_KEY.reviewed);
  }

  function handleNoteChange(candidateId, value) {
    setNotesByCandidate((prev) => ({ ...prev, [candidateId]: value }));
  }

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToastMessage(''), 2800);
  }

  function closeInterviewModal() {
    setInterviewModalOpen(false);
    setInterviewCandidate(null);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewError('');
  }

  async function submitInterviewSchedule() {
    if (!interviewCandidate) {
      setInterviewError('No candidate selected for scheduling.');
      return;
    }
    if (!interviewDate || !interviewTime) {
      setInterviewError('Please select both date and time.');
      return;
    }

    setInterviewError('');
    const success = await updateApplicationStatus(interviewCandidate._id, STATUS_VALUE_FOR_KEY.interview, {
      interviewDate,
      interviewTime,
    });

    if (success) {
      showToast('Interview scheduled and email sent to the candidate.');
      closeInterviewModal();
    }
  }

  function closeOfferModal() {
    setOfferModalOpen(false);
    setOfferCandidate(null);
    setOfferFile(null);
    setOfferError('');
  }

  function handleOfferFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      setOfferError('Please upload a PDF, JPG, or PNG file.');
      return;
    }
    setOfferError('');
    setOfferFile(file);
  }

  async function submitOfferLetter() {
    if (!offerCandidate) {
      setOfferError('No candidate selected.');
      return;
    }
    if (!offerFile) {
      setOfferError('Please upload the offer letter first.');
      return;
    }

    setOfferError('');
    setOfferUploading(true);

    try {
      const formData = new FormData();
      formData.append('applicationId', offerCandidate._id);
      formData.append('file', offerFile);

      const { data } = await axiosInstance.post('/applications/offer-letters', formData);
      if (data.emailStatus?.offerSent === false) {
        showToast('Offer uploaded, but email could not be sent.');
      } else {
        showToast('Offer letter uploaded and email sent to the candidate.');
      }
      closeOfferModal();

      if (data.offerLetter) {
        setApplicants((prev) =>
          prev.map((app) => (app._id === offerCandidate._id ? { ...app, status: STATUS_VALUE_FOR_KEY.selected, updatedAt: new Date().toISOString() } : app))
        );
      }
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Failed to upload offer letter.';
      setOfferError(message);
    } finally {
      setOfferUploading(false);
    }
  }

  return (
    <div className="portal-theme overflow-x-hidden">
      <RecruiterNavbar />
      <main className="recruiter-page mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-5">
        {/* Header + job switcher + KPI strip + search/filters: sticky, stays fixed while the list below scrolls with the page */}
        <div className="sticky top-0 z-30 -mx-5 bg-[#FFF9F5] px-5 pb-4 sm:-mx-8 sm:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">Recruiter workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>Applicants</h1>
          </div>

          <label className="flex min-w-[240px] flex-col text-[12.5px] font-semibold text-[#54263F]">
            Job
            <div className="relative mt-1.5">
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                disabled={loadingJobs}
                className="w-full appearance-none rounded-[10px] border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-2.5 pr-9 text-[14px] font-bold text-[#1D181A] outline-none transition focus:border-[#C75560] disabled:opacity-60"
                style={{ fontFamily: FONT_DISPLAY }}
              >
                <option value="">{loadingJobs ? 'Loading your job posts...' : 'All job posts'}</option>
                {jobs.map((job) => <option key={job._id} value={job._id}>{job.title}</option>)}
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#80576A]" />
            </div>
            <span className="mt-1.5 text-[12px] font-medium text-[#80576A]">
              {jobFilteredApplicants.length} applicant{jobFilteredApplicants.length === 1 ? '' : 's'}
              {selectedJobTitle ? ` for ${selectedJobTitle}` : ''}
            </span>
          </label>
        </div>

        {error && <p className="mb-5 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2.5 text-[12.5px] font-medium text-[#B3261E]">{error}</p>}

        {/* KPI strip */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {KPI_ORDER.map((key) => {
            const meta = STATUS_META[key];
            return (
              <div key={key} className="rounded-md border border-[#ECE7E5] bg-white px-3 py-2 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6161]">{KPI_LABELS[key]}</p>
                <p className="mt-1 text-lg font-extrabold" style={{ fontFamily: FONT_DISPLAY, color: meta.text }}>
                  {kpiCounts[key]}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search + filters (part of the fixed top section now) */}
        <div className="mb-6 border-b border-[#F1DDD4] pb-3.5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#80576A]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search candidates..."
                className="w-full rounded-[10px] border border-[#EBC2AE] bg-white py-2.5 pl-9 pr-3 text-[13.5px] text-[#1D181A] outline-none transition placeholder:text-[#B9A2AC] focus:border-[#C75560]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Experience" value={experienceFilter} onChange={setExperienceFilter} options={[
                { value: '1', label: '1+ yrs' }, { value: '3', label: '3+ yrs' }, { value: '5', label: '5+ yrs' }, { value: '8', label: '8+ yrs' },
              ]} />
              <FilterSelect label="Location" value={locationFilter} onChange={setLocationFilter} options={filterOptions.locations.map((v) => ({ value: v, label: v }))} />
              <FilterSelect label="Education" value={educationFilter} onChange={setEducationFilter} options={filterOptions.education.map((v) => ({ value: v, label: v }))} />
              <FilterSelect label="Skills" value={skillFilter} onChange={setSkillFilter} options={filterOptions.skills.map((v) => ({ value: v, label: v }))} />
              <FilterSelect label="Salary" value={salaryFilter} onChange={setSalaryFilter} options={[
                { value: '600000', label: 'Up to ₹6L' }, { value: '1200000', label: 'Up to ₹12L' }, { value: '2000000', label: 'Up to ₹20L' },
              ]} />
              <FilterSelect label="Availability" value={availabilityFilter} onChange={setAvailabilityFilter} options={filterOptions.availability.map((v) => ({ value: v, label: v }))} />
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={KPI_ORDER.map((k) => ({ value: k, label: STATUS_META[k].label }))} />
              {activeFiltersCount > 0 && (
                <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 rounded-full border border-[#EBC2AE] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#80576A] transition hover:border-[#C75560] hover:text-[#C75560]">
                  <X size={12} /> Clear ({activeFiltersCount})
                </button>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Master-detail layout: only the candidate list scrolls */}
        {loadingApplicants ? (
          <div className="portal-card flex items-center justify-center gap-2 py-16 text-[13px] text-[#80576A]">
            <Loader2 size={18} className="animate-spin text-[#C75560]" /> Loading applicants...
          </div>
        ) : jobFilteredApplicants.length === 0 ? (
          <div className="portal-card flex flex-col items-center justify-center px-6 py-16 text-center">
            <FileText size={28} className="text-[#9A671A]" />
            <h2 className="mt-4 text-[16px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>No applicants yet</h2>
            <p className="mt-2 max-w-sm text-[13px] leading-6 text-[#80576A]">As candidates apply to this job, their information will appear here.</p>
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-6 ${selectedApplicant ? 'lg:grid-cols-[minmax(300px,32%)_1fr]' : ''}`}>
            {/* Left: candidate list */}
            <section className={`flex flex-col gap-3 transition-transform duration-600 ease-out ${selectedApplicant ? 'lg:sticky lg:top-[290px] lg:-translate-x-6 lg:opacity-80' : 'lg:translate-x-0 lg:opacity-100'}`}>
              {visibleApplicants.length === 0 ? (
                <div className="portal-card px-5 py-10 text-center text-[13px] text-[#80576A]">
                  No candidates match your filters.
                </div>
              ) : (
                visibleApplicants.map((app) => {
                  const c = app.candidate || {};
                  const profile = c.profile || {};
                  const statusKey = normalizeStatus(app.status);
                  const active = app._id === selectedApplicantId;
                  const isHighlighted = app._id === highlightedApplicantId;
                  const name = c.name || profile.name || 'Candidate';
                  const avatarUrl = c.avatarUrl || profile.avatarUrl || profile.pictureUrl || c.pictureUrl || profile.profilePictureUrl;
                  const matchScore = c.matchScore ?? profile.matchScore;
                  const experienceYears = getCandidateExperienceYears(c);
                  const skillsArray = getCandidateArray(c, 'skills');
                  const jobTitle = app.job?.title || 'Unknown Job';
                  return (
                    <div
                      key={app._id}
                      id={`applicant-card-${app._id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openCandidate(app._id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openCandidate(app._id);
                        }
                      }}
                      className={`relative portal-card flex items-start gap-3 p-4 text-left transition-all duration-[1200ms] ${active ? 'border-[#C75560] ring-1 ring-[#C75560]' : 'hover:border-[#E9B6AF]'} ${isHighlighted ? 'ring-2 ring-[#F7C56B] bg-[#FFF8E9] shadow-[0_0_18px_4px_rgba(247,197,107,0.45)]' : ''}`}
                    >
                      <div className="shrink-0">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={`${name} avatar`} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFEDE3] text-[12.5px] font-bold text-[#9A671A]">
                            {initials(name)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate text-[14px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>{name}</h3>
                          {matchScore != null && (
                            <span className="shrink-0 text-[11px] font-bold text-[#C75560]">{matchScore}% Match</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[12px] font-semibold text-[#C75560] truncate">
                          {jobTitle}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[#80576A]">
                          {experienceYears != null ? `${experienceYears} yrs` : 'Experience —'}
                          {skillsArray.length > 0 ? ` · ${skillsArray.slice(0, 3).join(' • ')}` : ''}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-[#B9A2AC]">
                            {timeAgo(app.appliedAt) ? `Applied ${timeAgo(app.appliedAt)}` : 'ID: ' + (c.uniqueId || '—')}
                          </span>
                          <StatusChip statusKey={statusKey} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </section>

            {/* Right: candidate detail */}
            <section className={`relative ${mobileDetailOpen ? 'fixed inset-0 z-40 bg-[#FFF9F5] p-5' : 'hidden'} lg:block lg:static lg:z-auto lg:bg-transparent lg:p-0`}>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#80576A] lg:hidden"
              >
                ← Back to list
              </button>
              <div className={`transition-all duration-600 ease-out ${selectedApplicant ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'} w-full`}>
                {selectedApplicant ? (
                  <CandidateDetail
                    application={selectedApplicant}
                    note={notesByCandidate[selectedApplicant?.candidate?._id] || ''}
                    onNoteChange={(value) => handleNoteChange(selectedApplicant?.candidate?._id, value)}
                    onDownloadResume={downloadResume}
                    onMoveToNextStage={() => moveToNextStage(selectedApplicant)}
                    onScheduleInterview={() => openInterviewModal(selectedApplicant)}
                    onShortlist={() => shortlistApplication(selectedApplicant)}
                    onSendOffer={() => sendOffer(selectedApplicant)}
                    onReject={() => updateApplicationStatus(selectedApplicant._id, STATUS_VALUE_FOR_KEY.rejected)}
                    onReopen={() => reopenApplication(selectedApplicant)}
                    onClose={() => {
                      setSelectedApplicantId(null);
                      setMobileDetailOpen(false);
                    }}
                    isUpdatingStatus={statusUpdatingId === selectedApplicant._id}
                    statusUpdateError={statusUpdateError}
                  />
                ) : (
                  <EmptyDetail />
                )}
              </div>
            </section>
          </div>
        )}
      {interviewModalOpen && interviewCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:px-6">
          <div className="w-full max-w-xl rounded-[18px] bg-[#FFF9F5] p-6 shadow-2xl ring-1 ring-black/10">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C75560]">Interview schedule</p>
                <h2 className="mt-2 text-2xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>Interview invitation</h2>
                <p className="mt-2 text-sm text-[#80576A]">
                  Send a ready-made interview invitation email to <strong>{interviewCandidate.candidate?.name || 'this candidate'}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={closeInterviewModal}
                className="rounded-full border border-[#EBC2AE] bg-white p-2 text-[#54263F] transition hover:border-[#C75560] hover:text-[#C75560]"
                aria-label="Close interview modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-[13px] font-semibold text-[#54263F]">
                Interview date
                <input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="rounded-[12px] border border-[#EBC2AE] bg-white px-3 py-2 text-sm text-[#1D181A] outline-none transition focus:border-[#C75560]"
                />
              </label>
              <label className="flex flex-col gap-2 text-[13px] font-semibold text-[#54263F]">
                Interview time
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="rounded-[12px] border border-[#EBC2AE] bg-white px-3 py-2 text-sm text-[#1D181A] outline-none transition focus:border-[#C75560]"
                />
              </label>
            </div>

            {interviewError && <p className="mt-4 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">{interviewError}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeInterviewModal}
                className="rounded-full border border-[#EBC2AE] bg-white px-4 py-2 text-sm font-semibold text-[#54263F] transition hover:border-[#C75560] hover:text-[#C75560]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitInterviewSchedule}
                disabled={isSchedulingInterview}
                className="rounded-full bg-[#C75560] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {isSchedulingInterview ? 'Sending…' : 'Send interview invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {offerModalOpen && offerCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:px-6">
          <div className="w-full max-w-xl rounded-[18px] bg-[#FFF9F5] p-6 shadow-2xl ring-1 ring-black/10">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C75560]">Offer letter</p>
                <h2 className="mt-2 text-2xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>Send offer letter</h2>
                <p className="mt-2 text-sm text-[#80576A]">
                  Upload the offer letter document and send it to <strong>{offerCandidate.candidate?.name || 'this candidate'}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={closeOfferModal}
                className="rounded-full border border-[#EBC2AE] bg-white p-2 text-[#54263F] transition hover:border-[#C75560] hover:text-[#C75560]"
                aria-label="Close offer modal"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block text-[13px] font-semibold text-[#54263F]">
              Offer letter file
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={handleOfferFileChange}
                className="mt-2 w-full rounded-[12px] border border-[#EBC2AE] bg-white px-3 py-2 text-sm text-[#1D181A] outline-none"
              />
            </label>

            {offerFile && (
              <div className="mt-3 rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-4 py-3 text-sm text-[#54263F]">
                Selected file: <strong>{offerFile.name}</strong> ({Math.round(offerFile.size / 1024)} KB)
              </div>
            )}

            {offerError && <p className="mt-4 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">{offerError}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeOfferModal}
                className="rounded-full border border-[#EBC2AE] bg-white px-4 py-2 text-sm font-semibold text-[#54263F] transition hover:border-[#C75560] hover:text-[#C75560]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitOfferLetter}
                disabled={offerUploading}
                className="rounded-full bg-[#C75560] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
              >
                {offerUploading ? 'Uploading…' : 'Upload & send offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resumePaymentModalOpen && resumePaymentCandidate && (
        <div className="invoice-overlay-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:px-6">
          <div className="invoice-pop-in w-full max-w-lg rounded-none bg-[#FFF9F5] p-5 shadow-2xl ring-1 ring-black/10 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#C75560]">HireLoop Platform</p>
                <h2 className="mt-2 text-2xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>Resume download bill</h2>
                <p className="mt-1 text-xs text-[#6B7280]">Secure wallet payment · Tax invoice preview</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResumePaymentModalOpen(false);
                  setResumePaymentCandidate(null);
                }}
                className="border border-[#EBC2AE] bg-white p-2 text-[#54263F] transition hover:border-[#C75560] hover:text-[#C75560]"
                aria-label="Close resume payment modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-none border border-[#EBC2AE] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-[#EBC2AE] pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#80576A]">Billed to</p>
                  <p className="mt-1 text-sm font-bold text-[#1D181A]">{resumePaymentDetails.recruiterName}</p>
                  {resumePaymentDetails.email && <p className="text-xs text-[#6B7280]">{resumePaymentDetails.email}</p>}
                </div>
                <div className="text-right text-[10px] text-[#6B7280]">
                  <p><span className="font-semibold text-[#80576A]">Invoice:</span> HR-{String(resumePaymentCandidate.candidate?._id || resumePaymentCandidate._id || '').slice(-8).toUpperCase()}</p>
                  <p className="mt-1"><span className="font-semibold text-[#80576A]">Date:</span> {new Date().toLocaleDateString('en-IN')}</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-none border border-[#F1DDD4] text-sm">
                <div className="grid grid-cols-[1fr_auto] gap-3 bg-[#FFF9F5] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#80576A]">
                  <span>Description</span><span>Amount</span>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-3">
                  <div><p className="font-semibold text-[#1D181A]">Candidate resume download</p><p className="mt-0.5 text-xs text-[#6B7280]">{resumePaymentCandidate.candidate?.name || 'Candidate'} · Wallet</p></div>
                  <span className="font-semibold text-[#1D181A]">{formatMoney(resumePaymentDetails.baseAmount)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#F1DDD4] px-3 py-2.5 text-[#6B7280]">
                  <span>GST ({resumePaymentDetails.gstRate}%)</span><span>{formatMoney(resumePaymentDetails.gstAmount)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#EBC2AE] bg-[#FFF0E8] px-3 py-3 font-bold text-[#1D181A]">
                  <span>Total payable</span><span className="text-[#C75560]">{formatMoney(resumePaymentDetails.amount)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#6B7280]">
                <span>Wallet balance after payment</span>
                <span className="font-semibold text-[#1D181A]">{formatMoney(resumePaymentDetails.walletBalance - resumePaymentDetails.amount)}</span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-none border border-[#D8EBD9] bg-[#F2FAF2] p-3 text-xs text-[#35613A]">
              <span className="mt-0.5 text-sm">✓</span>
              <p>Payment is processed securely from your wallet. The resume will download after successful confirmation.</p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setResumePaymentModalOpen(false);
                  setResumePaymentCandidate(null);
                }}
                className="border border-[#EBC2AE] bg-white px-4 py-2 text-sm font-semibold text-[#54263F] transition hover:border-[#C75560] hover:text-[#C75560]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResumePayment}
                disabled={resumePaying}
                className="bg-[#C75560] px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
              >
                {resumePaying ? 'Processing…' : `Pay ${formatMoney(resumePaymentDetails.amount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#1D181A] px-4 py-3 text-sm font-semibold text-white shadow-2xl shadow-black/20">
          {toastMessage}
        </div>
      )}
      </main>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-full border border-[#EBC2AE] bg-white py-1.5 pl-3 pr-8 text-[11.5px] font-bold text-[#54263F] outline-none transition focus:border-[#C75560]"
      >
        <option value="">{label}</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#80576A]" />
    </div>
  );
}

function IconAction({ icon: Icon, label, href, onClick, disabled, title, tone = 'default' }) {
  const toneClasses =
    tone === 'danger'
      ? 'border-[#E9B6AF] text-[#B3261E] hover:border-[#D8574F] hover:bg-[#FFF0EE] hover:-translate-y-0.5'
      : 'border-[#EBC2AE] text-[#54263F] hover:border-[#C75560] hover:text-[#C75560] hover:-translate-y-0.5';
  const className = `flex flex-1 flex-col items-center gap-1 rounded-[10px] border px-2 py-2.5 text-[10.5px] font-bold transition ${
    disabled ? 'cursor-not-allowed border-[#F1E4E0] text-[#C9B9BF]' : toneClasses
  }`;
  const content = (
    <>
      <Icon size={16} />
      {label}
    </>
  );
  if (href && !disabled) {
    return <a href={href} target="_blank" rel="noreferrer" className={className} title={title}>{content}</a>;
  }
  return (
    <button type="button" onClick={disabled ? undefined : onClick} disabled={disabled} className={className} title={title}>
      {content}
    </button>
  );
}

function ActionRow({ icon: Icon, label, onClick, href, disabled, tone = 'default', title }) {
  const toneClasses =
    tone === 'danger'
      ? 'border-[#E9B6AF] text-[#B3261E] hover:border-[#D8574F] hover:bg-[#FFF0EE]'
      : 'border-[#ECE7E5] text-[#54263F] hover:border-[#C75560] hover:text-[#C75560]';
  const iconWrapClasses = tone === 'danger' ? 'bg-[#FFF0EE] text-[#B3261E]' : 'bg-[#FFF5F0] text-[#C75560]';
  const className = `flex w-full items-center gap-2.5 rounded-[10px] border bg-white px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClasses}`;

  const content = (
    <>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconWrapClasses}`}>
        <Icon size={15} />
      </span>
      <span className="text-[12.5px] font-bold leading-tight">{label}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} target="_blank" rel="noreferrer" title={title} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={className}>
      {content}
    </button>
  );
}

function DetailField({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="mt-0.5 shrink-0 text-[#9A671A]" />
      <div className="min-w-0">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#111827]">{label}</p>
        <p className="mt-0.5 text-[13px] text-[#1D181A]">{value || '—'}</p>
      </div>
    </div>
  );
}

function ProfileSection({ title, emptyMessage, items, renderItem, contentClassName = 'space-y-0' }) {
  return (
    <div className="border-t border-[#F1DDD4] py-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6161]">{title}</p>
      {items.length > 0 ? (
        <div className={`mt-3 ${contentClassName}`}>{items.map((item, index) => renderItem(item, index))}</div>
      ) : (
        <p className="mt-3 text-sm text-[#7C6C6C]">{emptyMessage}</p>
      )}
    </div>
  );
}

function buildDateValue(year, month) {
  if (!year) return null;
  if (!month) return `${year}`;
  const monthIndex = new Date(`${month} 1, 2000`).getMonth();
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function formatMonthYear(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}$/.test(text)) return text;
  const match = text.match(/^(\d{4})(?:[-/](\d{1,2}))?/);
  if (match) {
    const year = match[1];
    const month = match[2] ? Number(match[2]) : 1;
    const date = new Date(`${year}-${String(month).padStart(2, '0')}-01`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(date);
    }
  }
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(parsed);
  }
  return text;
}

function formatDateRange(startValue, endValue, isCurrent) {
  const startLabel = formatMonthYear(startValue);
  const endLabel = isCurrent ? 'Present' : formatMonthYear(endValue);
  if (startLabel && endLabel) return `${startLabel} – ${endLabel}`;
  if (startLabel) return startLabel;
  if (endLabel) return endLabel;
  return null;
}

function formatExperienceDuration(exp) {
  const years = Number(exp.totalExpYears);
  const months = Number(exp.totalExpMonths);
  const hasYears = !Number.isNaN(years) && years > 0;
  const hasMonths = !Number.isNaN(months) && months > 0;
  if (!hasYears && !hasMonths) return null;
  const parts = [];
  if (hasYears) parts.push(`${years} yr${years === 1 ? '' : 's'}`);
  if (hasMonths) parts.push(`${months} mo${months === 1 ? '' : 's'}`);
  return parts.join(' ');
}

function getExperienceDisplay(exp) {
  if (!exp) return null;
  const role = exp.role || exp.designation || exp.title || exp.jobTitle || 'Experience entry';
  const company = exp.company || exp.organization || exp.employer || exp.institution || 'Company not provided';
  const fromValue = exp.from || exp.startDate || exp.startedAt || (exp.workingFromYear ? buildDateValue(exp.workingFromYear, exp.workingFromMonth) : null);
  const toValue = exp.to || exp.endDate || (exp.workingTillYear ? buildDateValue(exp.workingTillYear, exp.workingTillMonth) : null);
  const current = exp.current || exp.isCurrent || exp.present || (!toValue && Boolean(exp.current || exp.isCurrent || exp.present));
  const period = formatDateRange(fromValue, toValue, current) || formatExperienceDuration(exp);
  return { role, company, period };
}

function getEducationDisplay(item) {
  if (!item) return null;
  if (typeof item === 'string') return { title: item, subtitle: null, period: null };

  const level = item.educationLevel;
  let title = item.degree || item.courseName || item.doctorateType || item.educationLevel || 'Education';
  let subtitle = null;
  let period = null;

  if (level === 'ClassX') {
    title = 'Class X';
    subtitle = [item.schoolName || item.institution, item.board].filter(Boolean).join(' • ');
    period = item.passingYear ? `Passed in ${item.passingYear}` : null;
  } else if (level === 'ClassXII') {
    title = 'Class XII';
    subtitle = [item.schoolName || item.institution, item.board].filter(Boolean).join(' • ');
    period = item.passingYear ? `Passed in ${item.passingYear}` : null;
  } else {
    const institution = item.institution || item.schoolName || item.collegeName || item.universityName || item.instituteName;
    const specialization = [item.specialization, item.stream].filter(Boolean).join(' • ');
    subtitle = [institution, specialization].filter(Boolean).join(' • ');
    const startValue = item.startYear || item.startDate || item.startedAt || item.researchStartYear || null;
    const endValue = item.endYear || item.endDate || item.completedAt || item.researchEndYear || null;
    const isCurrent = Boolean(item.current || item.ongoing || (!endValue && Boolean(item.endYear === undefined || item.endYear === '' || item.endDate === undefined || item.endDate === '')));
    period = formatDateRange(startValue, endValue, isCurrent);
  }

  return { title, subtitle, period };
}

function getProjectDisplay(project) {
  if (!project) return null;
  const title = project.title || project.name || 'Untitled project';
  const subtitle = [project.client, project.role].filter(Boolean).join(' • ');
  const fromValue = project.workedFromYear ? buildDateValue(project.workedFromYear, project.workedFromMonth) : null;
  const tillValue = project.status === 'Completed' && project.workedTillYear ? buildDateValue(project.workedTillYear, project.workedTillMonth) : null;
  const period = formatDateRange(fromValue, tillValue, project.status !== 'Completed');
  const link = project.projectLink || project.link || project.url || project.projectUrl || null;
  return { title, subtitle, period, description: project.roleDescription || project.description || null, link };
}

function getCertificationDisplay(item) {
  if (!item) return null;
  if (typeof item === 'string') return { name: item, organization: null, period: null };
  const startValue = [item.startMonth, item.startYear].filter(Boolean).join(' ');
  const endValue = item.noExpiry
    ? 'No expiry'
    : [item.expiryMonth, item.expiryYear].filter(Boolean).join(' ');
  const period = startValue && endValue ? `${startValue} – ${endValue}` : startValue || endValue || null;
  return {
    name: item.name || item.title || 'Certificate',
    organization: item.organization || item.issuer || item.provider || item.authority || item.institution || item.organizationName || null,
    period,
  };
}

function CandidateDetail({
  application,
  onClose,
  note,
  onNoteChange,
  onDownloadResume,
  onMoveToNextStage,
  onScheduleInterview,
  onShortlist,
  onSendOffer,
  onReject,
  onReopen,
  isUpdatingStatus,
  statusUpdateError,
}) {
  const navigate = useNavigate();
  if (!application) return null;
  const c = application.candidate || {};
  const profile = c.profile || {};
  const statusKey = normalizeStatus(application.status);
  const currentStepIndex = { new: 0, reviewed: 1, shortlisted: 2, interview: 3, selected: 4, rejected: 1 }[statusKey];
  const nextStageKey = getNextStageKey(statusKey);
  const isShortlistUnlocked = ['shortlisted', 'interview', 'selected', 'rejected'].includes(statusKey);
  const skills = getCandidateArray(c, 'skills');
  const education = getCandidateArray(c, 'education');
  const experienceEntries = getCandidateArray(c, 'experience');
  const projects = getCandidateArray(c, 'projects');
  const certificates = Array.isArray(c.certificates)
    ? c.certificates
    : Array.isArray(profile.certifications)
      ? profile.certifications.map((item) => (typeof item === 'string' ? item : item.name)).filter(Boolean)
      : [];
  const languages = getCandidateArray(c, 'languages');
  const name = c.name || profile.name || 'Candidate';
  const title = c.title || profile.headline || 'Applicant';
  const email = c.email || profile.email;
  const phone = c.phone || profile.phone;
  const location = getCandidateField(c, 'location');
  const experienceYears = getCandidateExperienceYears(c);
  const expectedSalary = getCandidateField(c, 'expectedSalary');
  const noticePeriod = getCandidateNoticePeriod(c);
  const resumeAvailable = c.resumeAvailable ?? Boolean(profile.resumeUrl);
  const profilePictureUrl = profile.profilePictureUrl || c.profilePictureUrl;
  const portfolioUrl =
    c.portfolio?.[0]?.url ||
    profile.portfolio?.[0]?.url ||
    c.portfolioUrl ||
    profile.portfolioUrl ||
    c.profile?.portfolio?.[0]?.url;
  const linkedinUrl =
    c.socialLinks?.linkedin ||
    profile.socialLinks?.linkedin ||
    c.linkedinUrl ||
    profile.linkedinUrl ||
    c.profile?.socialLinks?.linkedin;
  const githubUrl =
    c.socialLinks?.github ||
    profile.socialLinks?.github ||
    c.githubUrl ||
    profile.githubUrl ||
    c.profile?.socialLinks?.github;

  const experienceItems = experienceEntries.map(getExperienceDisplay).filter(Boolean);
  const educationItems = education.map(getEducationDisplay).filter(Boolean);
  const projectItems = projects.map(getProjectDisplay).filter(Boolean);
  const certificationItems = certificates.map(getCertificationDisplay).filter(Boolean);

  return (
    <div className="bg-transparent p-0">
      {/* Header */}
      <div className="border-b border-[#F1DDD4] p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFEDE3] text-[16px] font-bold text-[#9A671A]">
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt={`${c.name} profile`} className="h-14 w-14 rounded-full object-cover" />
            ) : (
              initials(c.name)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[19px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>{c.name || 'Candidate'}</h2>
                <div className="mt-1 space-y-1 text-[13px] text-[#80576A]">
                  <p>{c.uniqueId || profile.uniqueId ? `Candidate ID: ${c.uniqueId || profile.uniqueId}` : 'Candidate ID: —'}</p>
                  <p>{email ? `Email: ${email}` : 'Email: —'}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {application.job?.title && (
                  <p className="text-right text-[12px] font-semibold text-[#C75560]">
                    Applied for<br />{application.job.title}
                  </p>
                )}
                <MatchRing score={c.matchScore ?? null} />
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <StatusChip statusKey={statusKey} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <IconAction icon={ExternalLink} label="LinkedIn" href={linkedinUrl} disabled={!linkedinUrl} />
          <IconAction icon={Sparkles} label="Portfolio" href={portfolioUrl} disabled={!portfolioUrl} />
          <IconAction icon={GithubIcon} label="GitHub" href={githubUrl} disabled={!githubUrl} />
          <IconAction icon={Mail} label="Email" href={email ? `mailto:${email}` : undefined} disabled={!email} />
          <IconAction
            icon={MessageCircle}
            label="Message"
            onClick={() => navigate(`/recruiter/messages?candidateId=${encodeURIComponent(c._id)}&candidateName=${encodeURIComponent(c.name || 'Candidate')}`)}
          />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="rounded-lg border border-[#ECE7E5] bg-white p-3 shadow-sm">
          <div className="space-y-0">
            <ProfileSection title="Experience" emptyMessage="No experience details added yet." items={experienceItems} renderItem={(item, index) => (
              <div key={`${item.company || 'exp'}-${index}`} className="py-2 first:pt-0">
                <p className="text-sm font-semibold text-[#111827]">{item.role}</p>
                <p className="mt-0.5 text-xs text-[#6B6161]">{item.company}</p>
                {item.period && <p className="mt-0.5 text-xs text-[#9A671A]">{item.period}</p>}
              </div>
            )} />

            <ProfileSection title="Education" emptyMessage="No education details shared yet." items={educationItems} renderItem={(item, index) => (
              <div key={`${item.title}-${index}`} className="py-2 first:pt-0">
                <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                {item.subtitle && <p className="mt-0.5 text-xs text-[#6B6161]">{item.subtitle}</p>}
                {item.period && <p className="mt-0.5 text-xs text-[#9A671A]">{item.period}</p>}
              </div>
            )} />

            <ProfileSection
              title="Skills"
              emptyMessage="No skills added yet."
              items={skills}
              contentClassName="flex flex-wrap gap-2"
              renderItem={(item, index) => (
                <span key={`${item}-${index}`} className="inline-flex rounded-full border border-[#EBC2AE] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#54263F]">
                  {item}
                </span>
              )}
            />

            <ProfileSection title="Projects" emptyMessage="No projects shared yet." items={projectItems} renderItem={(item, index) => (
              <div key={`${item.title}-${index}`} className="py-2 first:pt-0">
                <div className="flex flex-col gap-1 pl-1 border-l-2 border-[#EEF0EF]">
                  <p className="text-sm font-semibold text-[#111827]">{item.title}</p>
                  {(item.subtitle || item.period) && (
                    <p className="text-xs text-[#6B6161]">{[item.subtitle, item.period].filter(Boolean).join(' • ')}</p>
                  )}
                  {item.description && <p className="text-xs text-[#6B6259]">{item.description}</p>}
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#C75560] hover:underline">
                      <ExternalLink size={12} /> Open project link
                    </a>
                  )}
                </div>
              </div>
            )} />

            <ProfileSection title="Certifications" emptyMessage="No certifications added yet." items={certificationItems} renderItem={(item, index) => (
              <div key={`${item.name}-${index}`} className="py-2 first:pt-0">
                <div className="flex items-center justify-between gap-3 pl-1 border-l-2 border-[#EEF0EF]">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                    {item.organization && <p className="text-xs text-[#6B6161]">{item.organization}</p>}
                  </div>
                  {item.period && <p className="text-xs text-[#9A671A]">{item.period}</p>}
                </div>
              </div>
            )} />
          </div>
        </div>
      </div>

      {/* Actions + Activity Timeline — side by side, each stacked vertically,
          so a recruiter can scan "what can I do" and "where is this candidate"
          in one glance without scrolling past a wide horizontal tracker. */}
      <div className="border-t border-[#F1DDD4] p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
          {/* Actions */}
          <div className="flex h-full flex-col rounded-lg border border-[#ECE7E5] bg-white p-4 shadow-sm">
            <div className="mb-3.5 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6161]">Actions</p>
              <span className="rounded-full bg-[#F8F5F3] px-2.5 py-1 text-xs font-semibold text-[#80576A]">Fast track</span>
            </div>
            {statusUpdateError && (
              <p className="mb-3 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-[12px] font-medium text-[#B3261E]">{statusUpdateError}</p>
            )}

            {/* Primary move-forward action stands alone so it reads as the default next step */}
            <button
              type="button"
              onClick={onMoveToNextStage}
              disabled={!nextStageKey || isUpdatingStatus || !isShortlistUnlocked}
              title={!isShortlistUnlocked ? 'Shortlist the candidate first to unlock pipeline actions' : undefined}
              className="portal-primary-action flex w-full items-center justify-center gap-1.5 px-3.5 py-3 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUpdatingStatus ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
              {nextStageKey ? `Move to ${STATUS_META[nextStageKey].label}` : 'Pipeline complete'}
            </button>

            {/* Everything else a recruiter needs, stacked as one vertical
                list — reads top-to-bottom, stays legible at half-width. */}
            <div className="mt-2.5 flex flex-col gap-2">
              <ActionRow
                icon={Download}
                label="Download Resume"
                onClick={() => onDownloadResume(c._id)}
                disabled={statusKey === 'selected'}
                title={statusKey === 'selected' ? 'Offer already sent — this candidate\'s pipeline is closed' : undefined}
              />
              <ActionRow
                icon={Bookmark}
                label="Shortlist Candidate"
                onClick={onShortlist}
                disabled={isUpdatingStatus || statusKey === 'rejected' || statusKey === 'shortlisted' || statusKey === 'interview' || statusKey === 'selected'}
              />
              <ActionRow icon={Mail} label="Email Candidate" href={email ? `mailto:${email}` : undefined} disabled={!email} />
              <ActionRow
                icon={Calendar}
                label="Schedule Interview"
                onClick={onScheduleInterview}
                disabled={isUpdatingStatus || statusKey === 'rejected' || statusKey === 'selected' || !isShortlistUnlocked}
                title={!isShortlistUnlocked ? 'Shortlist the candidate before scheduling an interview' : undefined}
              />
              <ActionRow
                icon={Send}
                label="Send Offer"
                onClick={onSendOffer}
                disabled={isUpdatingStatus || statusKey === 'rejected' || statusKey === 'selected' || !isShortlistUnlocked}
                title={!isShortlistUnlocked ? 'Shortlist the candidate before sending an offer' : undefined}
              />
              <ActionRow
                icon={XCircle}
                label={statusKey === 'rejected' ? 'Rejected' : 'Reject Candidate'}
                onClick={statusKey === 'rejected' ? undefined : onReject}
                disabled={isUpdatingStatus || statusKey === 'rejected' || statusKey === 'selected'}
                title={
                  statusKey === 'selected'
                    ? 'Offer already sent — candidate can no longer be rejected from here'
                    : statusKey === 'rejected'
                      ? 'This application has already been rejected'
                      : undefined
                }
                tone="danger"
              />
            </div>
          </div>

          {/* Activity timeline */}
          <ActivityTimeline
            statusKey={statusKey}
            currentStepIndex={currentStepIndex}
            appliedAt={application.appliedAt}
            updatedAt={application.updatedAt}
          />
        </div>
      </div>
    </div>
  );
}