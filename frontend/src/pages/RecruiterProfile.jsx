import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Briefcase,
  Users,
  CheckCircle2,
  ExternalLink,
  Calendar,
  Bookmark,
  Link2,
  MessageCircle,
  Clock,
  Award,
  Languages,
  Newspaper,
  TrendingUp,
  Send,
  X,
  IndianRupee,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import RecruiterNavbar from '../components/RecruiterNavbar';
import { FONT_DISPLAY, FONT_BODY, BG } from '../theme';

const ACTIVITY_ICON = { job: Briefcase, hire: CheckCircle2, article: Newspaper };

function formatSalary(salary) {
  if (!salary) return null;

  if (typeof salary === 'string') return salary;

  if (typeof salary === 'object' && salary.min && salary.max) {
    return `₹${(salary.min / 100000).toFixed(1)}L - ₹${(salary.max / 100000).toFixed(1)}L`;
  }

  return null;
}

const DRAWER_BULLET_PATTERN = /^[-•*]\s+/;
const DRAWER_KNOWN_HEADERS = [
  'about the company', 'about company', 'company overview', 'about us',
  'job description', 'job summary', 'about the role', 'role overview', 'overview',
  'roles and responsibilities', 'roles & responsibilities', 'responsibilities', 'key responsibilities',
  'required qualifications', 'requirements', 'qualifications', 'minimum qualifications',
  'preferred qualifications', 'good to have', 'nice to have', 'bonus points',
  'benefits', 'benefits & perks', 'perks', 'what we offer',
  'working hours', 'growth opportunities', 'education'
];

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

    if (tag === 'BR') {
      flushPara();
      return;
    }

    const text = node.textContent || '';
    if (text.trim()) paraBuffer.push(text.trim());
    if (tag === 'DIV' || tag === 'P') flushPara();
  });

  flushPara();
  return blocks;
}

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
      line.length > 0 &&
      line.length < 48 &&
      !DRAWER_BULLET_PATTERN.test(line) &&
      !/[.,;]$/.test(line) &&
      /^[A-Z]/.test(line) &&
      line === line.replace(/\s+/g, ' ')
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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildHighlightRegex(skills) {
  const patterns = [];
  if (Array.isArray(skills) && skills.length) {
    [...skills]
      .sort((a, b) => b.length - a.length)
      .forEach((skill) => patterns.push(escapeRegExp(skill)));
  }

  patterns.push('\\d+\\s*-\\s*\\d+\\+?\\s*(?:years?|yrs?)(?:\\s+of\\s+experience)?');
  patterns.push('\\d+\\+?\\s*(?:years?|yrs?)(?:\\s+of\\s+experience)?');
  return new RegExp(`(${patterns.join('|')})`, 'gi');
}

function highlightText(text, regex) {
  if (!text || !regex) return text;
  const parts = text.split(regex);
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <strong key={index} className="font-semibold text-[#1D181A]">
        {part}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}

function DrawerDescription({ job }) {
  const sections = buildDescriptionSections(job);
  const skills = Array.isArray(job?.skillsRequired) ? job.skillsRequired.filter(Boolean) : [];
  const highlightRegex = buildHighlightRegex(skills);

  if (!sections.length) {
    return (
      <p className="mt-2.5 text-[13px] italic leading-6 text-stone-400">
        No description was provided for this role.
      </p>
    );
  }

  return (
    <div className="mt-2.5 space-y-5">
      {sections.map((section, index) => (
        <div key={`${section.heading || 'section'}-${index}`}>
          {section.heading && (
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#3A3034]">
              {section.heading}
            </p>
          )}

          {section.blocks.map((block, blockIndex) =>
            block.type === 'list' ? (
              <ul key={`${section.heading || 'list'}-${blockIndex}`} className="mt-2 space-y-2 pl-0 list-none">
                {block.items.map((item, itemIndex) => (
                  <li key={`${item}-${itemIndex}`} className="flex items-start gap-2 text-[13px] leading-6 text-[#3A3034]">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C75560]" />
                    <span>{highlightText(item, highlightRegex)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p key={`${section.heading || 'para'}-${blockIndex}`} className="mt-2 text-[13px] leading-6 text-[#3A3034]">
                {highlightText(block.text, highlightRegex)}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';

  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) return `${Math.max(1, seconds)} second${seconds === 1 ? '' : 's'} ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function RecruiterProfile() {
  const { recruiterId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recruiter, setRecruiter] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [logoError, setLogoError] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalRole, setAuthModalRole] = useState('candidate');
  const [selectedJob, setSelectedJob] = useState(null);

  async function openJobDetails(jobId) {
    try {
      const { data } = await axiosInstance.get(`/jobs/${jobId}`);
      setSelectedJob(data);
    } catch (err) {
      console.error('Failed to load full job details:', err);
      const fallback = jobs.find((job) => job._id === jobId);
      if (fallback) setSelectedJob(fallback);
    }
  }

  useEffect(() => {
    async function loadRecruiterProfile() {
      try {
        const response = await axiosInstance.get(`/recruiter/${recruiterId}/public-profile`);
        const data = response.data || {};
        console.log('📥 RecruiterProfile loaded from API:', {
          languages: data.languages,
          isArray: Array.isArray(data.languages),
        });
        setRecruiter(data || null);
        if (Array.isArray(data.jobs)) setJobs(data.jobs);
        if (Array.isArray(data.activity)) {
          setActivity(data.activity);
        } else {
          setActivity([]);
        }
        setError(null);
      } catch (err) {
        console.error('Failed to load recruiter:', err);
        setRecruiter(DUMMY_RECRUITER);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadRecruiterProfile();
  }, [recruiterId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDFB]">
        <div className="mx-auto max-w-6xl px-4 py-24 space-y-6 animate-pulse">
          <div className="h-40 rounded-2xl bg-[#FFF4EF]" />
          <div className="h-24 rounded-2xl bg-[#FFF4EF]" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-40 rounded-2xl bg-[#FFF4EF]" />
            <div className="h-40 rounded-2xl bg-[#FFF4EF]" />
            <div className="h-40 rounded-2xl bg-[#FFF4EF]" />
          </div>
        </div>
      </div>
    );
  }

  if (!recruiter) {
    return (
      <div className="min-h-screen bg-[#FFFDFB]">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#C75560] hover:text-[#A0182C] mb-8 font-semibold transition">
            <ArrowLeft size={18} /> Go Back
          </button>
          <p className="text-center text-[#80576A] py-12">
            {error ? 'Something went wrong loading this profile. Please try again.' : 'Recruiter profile not found.'}
          </p>
        </div>
      </div>
    );
  }

  const statStrip = [
    { label: 'Successful Hires', value: `${recruiter.totalHires || 0}+` },
    { label: 'Years Experience', value: `${recruiter.experienceYears || 0}+` },
    { label: 'Active Positions', value: recruiter.totalJobsPosted || 0 },
    { label: 'Response Rate', value: `${recruiter.responseRate || 0}%` },
    { label: 'Avg. Response Time', value: `< ${recruiter.avgResponseTime || '24h'}` },
  ];

  return (
    <div className="min-h-screen bg-[#FFF4EF]" style={{ fontFamily: FONT_BODY }}>
      <RecruiterNavbar />

      {/* Content */}
      <div className="pb-24 md:pb-0">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#C75560] hover:text-[#A0182C] mb-6 font-semibold transition">
            <ArrowLeft size={18} /> Go Back
          </button>

        {/* ---------------- HERO ---------------- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-[#EBC2AE] bg-white shadow-[0_1px_2px_rgba(29,24,26,0.04),0_12px_32px_-16px_rgba(29,24,26,0.18)] mb-4"
        >
          <div className="px-6 sm:px-8 pt-8 pb-8">
            {/* Identity row: avatar, name block and primary actions share one aligned baseline. */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div className="flex items-end gap-4">
                {recruiter.profilePictureUrl && !logoError ? (
                  <img
                    src={recruiter.profilePictureUrl}
                    alt={recruiter.name}
                    onError={() => setLogoError(true)}
                    className="h-20 w-20 shrink-0 rounded-full object-cover border border-[#EBC2AE] shadow-sm bg-white"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#EBC2AE] bg-gradient-to-br from-[#FFF4EF] to-[#EBC2AE] shadow-sm">
                    <span className="text-lg font-bold tracking-wide text-[#A0182C]">{getInitials(recruiter.name)}</span>
                  </div>
                )}

                <div className="pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-[#1D181A]">{recruiter.name}</h1>
                    {recruiter.verified && (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <CheckCircle2 size={11} /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-[#C75560] mt-0.5">{recruiter.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-[#80576A]">
                    <span className="flex items-center gap-1">
                      <Building2 size={13} className="text-[#80576A]/70" /> {recruiter.companyName}
                    </span>
                    <span className="text-[#EBC2AE]">·</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={13} className="text-[#80576A]/70" /> {recruiter.location}
                    </span>
                    <span className="text-[#EBC2AE]">·</span>
                    <span>{recruiter.experienceYears}+ years experience</span>
                  </div>
                </div>
              </div>

              <div className="hidden md:flex shrink-0 items-center gap-3 pb-1">
                {recruiter.linkedinUrl && (
                  <a
                    href={recruiter.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A] hover:border-[#C75560] hover:text-[#C75560] hover:bg-[#FFF4EF] transition"
                  >
                    <Link2 size={18} />
                  </a>
                )}
                <button
                  onClick={() => navigate('/recruiter/company-profile')}
                  className="rounded-lg border border-[#EBC2AE] bg-white px-5 py-2.5 text-sm font-semibold text-[#1D181A] hover:border-[#C75560] hover:text-[#C75560] transition"
                >
                  Company Profile
                </button>
              </div>
            </div>

            {/* Mobile-only actions, since the desktop pair above is hidden below md */}
            <div className="flex md:hidden items-center gap-3 mt-5">
              <button
                onClick={() => navigate('/recruiter/company-profile')}
                className="flex-1 rounded-lg border border-[#EBC2AE] bg-white px-4 py-2.5 text-sm font-semibold text-[#1D181A] hover:border-[#C75560] hover:text-[#C75560] transition"
              >
                Company Profile
              </button>
              {recruiter.linkedinUrl && (
                <a
                  href={recruiter.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#EBC2AE] text-[#80576A]"
                >
                  <Link2 size={18} />
                </a>
              )}
            </div>

            {(recruiter.email || recruiter.phone || recruiter.companyWebsite) && (
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2.5 mt-6 pt-5 border-t border-[#EBC2AE]/70 text-sm">
                {recruiter.email && (
                  <a href={`mailto:${recruiter.email}`} className="flex items-center gap-2 text-[#1D181A] hover:text-[#C75560] font-medium transition">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFF4EF] text-[#C75560] shrink-0">
                      <Mail size={13} />
                    </span>
                    {recruiter.email}
                  </a>
                )}
                {recruiter.phone && (
                  <a href={`tel:${recruiter.phone}`} className="flex items-center gap-2 text-[#1D181A] hover:text-[#C75560] font-medium transition">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFF4EF] text-[#C75560] shrink-0">
                      <Phone size={13} />
                    </span>
                    {recruiter.phone}
                  </a>
                )}
                {recruiter.companyWebsite && (
                  <a
                    href={recruiter.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[#1D181A] hover:text-[#C75560] font-medium transition"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFF4EF] text-[#C75560] shrink-0">
                      <Globe size={13} />
                    </span>
                    Company website <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}

            {recruiter.bio && (
              <p className="mt-4 pt-4 border-t border-[#EBC2AE]/70 text-sm leading-relaxed text-[#1D181A]">{recruiter.bio}</p>
            )}
          </div>
        </motion.div>

        {/* ---------------- TRUST STRIP ---------------- */}
        <div className="flex flex-wrap items-stretch divide-x divide-[#EBC2AE] rounded-2xl border border-[#EBC2AE] bg-white mb-4 overflow-hidden">
          {statStrip.map((stat) => (
            <div key={stat.label} className="flex-1 min-w-[140px] px-6 py-5 text-center">
              <p className="text-2xl font-bold text-[#C75560]">{stat.value}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[#80576A]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ---------------- EXPERTISE + RECRUITER FACTS ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
          <div className="rounded-2xl border border-[#EBC2AE] bg-white p-7">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1D181A] mb-4">Recruiting Expertise</h2>
            <div className="flex flex-wrap gap-2">
              {(recruiter.expertiseTags || []).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[#FFF4EF] border border-[#EBC2AE] px-3 py-1.5 text-xs font-medium text-[#80576A]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#EBC2AE] bg-white p-7">
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#1D181A] mb-4">About this Recruiter</h2>
            <dl className="space-y-3.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-[#80576A]"><Calendar size={14} /> Active since</dt>
                <dd className="font-semibold text-[#1D181A]">
                  {new Date(recruiter.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-[#80576A] shrink-0"><Languages size={14} /> Languages</dt>
                <dd className="font-semibold text-[#1D181A] text-right">{(recruiter.languages || []).join(', ')}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="flex items-center gap-2 text-[#80576A] shrink-0"><MapPin size={14} /> Hiring locations</dt>
                <dd className="font-semibold text-[#1D181A] text-right">{(recruiter.hiringLocations || []).join(', ')}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
          {/* Currently Hiring */}
          <div className="lg:col-span-2 rounded-2xl border border-[#EBC2AE] bg-white p-7">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#1D181A]">Currently Hiring</h2>
              <button
                onClick={() => navigate('/recruiter/jobs')}
                className="text-sm font-semibold text-[#C75560] hover:text-[#A0182C] transition"
              >
                View All Jobs →
              </button>
            </div>

            {jobs && jobs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {jobs.map((job, i) => (
                  <motion.div
                    key={job._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="rounded-xl border border-[#EBC2AE] bg-white p-5 hover:shadow-md hover:border-[#C75560]/40 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-[#1D181A] text-sm">{job.title}</h3>
                        <p className="text-xs text-[#80576A] mt-0.5">{job.department}</p>
                      </div>
                      <button aria-label="Save job" className="text-[#EBC2AE] hover:text-[#C75560] transition">
                        <Bookmark size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-[#80576A]">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-[#C75560]" /> {job.location}
                      </span>
                      <span className="rounded-full bg-[#FFF4EF] px-2 py-0.5 font-medium text-[#80576A]">{job.workMode}</span>
                      <span>{job.experience}</span>
                    </div>

                    {job.salary && (
                      <p className="mt-2 text-sm font-semibold text-[#C75560]">{formatSalary(job.salary)}</p>
                    )}

                    <div className="mt-4 pt-4 border-t border-[#EBC2AE] flex items-center justify-between">
                      <p className="text-[11px] text-[#80576A]">
                        {job.applicants} applicants · {timeAgo(job.postedDate)}
                      </p>
                      <button
                        onClick={() => openJobDetails(job._id)}
                        className="rounded-lg bg-[#C75560] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#A0182C] transition"
                      >
                        View Job
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#EBC2AE] py-10 text-center">
                <p className="text-sm text-[#80576A]">No open positions right now — check back soon.</p>
              </div>
            )}
          </div>

          {/* Experience Timeline */}
          {recruiter.experienceTimeline?.length > 0 && (
            <div className="rounded-2xl border border-[#EBC2AE] bg-white p-7">
              <h2 className="text-lg font-bold text-[#1D181A] mb-6">Experience</h2>
              <div className="space-y-4">
                {recruiter.experienceTimeline.map((exp, i) => (
                  <div key={i} className="flex gap-4">
                    {/* Timeline dot and connector line */}
                    <div className="relative flex flex-col items-center shrink-0 pt-0.5">
                      {/* Dot - smaller */}
                      <div className="h-5 w-5 rounded-full bg-[#C75560] ring-3 ring-[#FFF4EF] shadow-sm z-10" />
                      
                      {/* Vertical line connecting to next item */}
                      {i !== recruiter.experienceTimeline.length - 1 && (
                        <div className="absolute top-5 h-12 w-0.5 bg-[#EBC2AE]" />
                      )}
                    </div>

                    {/* Experience details */}
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-semibold text-[#1D181A]">{exp.role}</p>
                      <p className="text-xs font-medium text-[#C75560] mt-0.5">{exp.company}</p>
                      <p className="text-xs text-[#80576A] mt-0.5">{exp.duration}</p>
                      
                      {exp.achievements && exp.achievements.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {exp.achievements.map((a, j) => (
                            <li key={j} className="text-xs text-[#1D181A] flex gap-2">
                              <span className="text-[#C75560] shrink-0 mt-0.5">•</span>
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-2xl border border-[#EBC2AE] bg-white p-7">
            <h2 className="text-lg font-bold text-[#1D181A] mb-5">Recent Activity</h2>
            <div className="rounded-xl border border-[#EBC2AE] divide-y divide-[#EBC2AE]">
              {(activity || []).length > 0 ? (
                (activity || []).slice(0, 5).map((item) => {
                  const Icon = ACTIVITY_ICON[item.type] || TrendingUp;
                  return (
                    <div key={item.id || `${item.text}-${item.date}`} className="flex items-center gap-3 px-5 py-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF4EF] text-[#C75560]">
                        <Icon size={15} />
                      </span>
                      <p className="text-sm text-[#1D181A] flex-1">{item.text}</p>
                      <p className="text-[11px] text-[#80576A] shrink-0">{timeAgo(item.date)}</p>
                    </div>
                  );
                })
              ) : (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-[#80576A]">No recent activity yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    <AnimatePresence>
      {selectedJob && (
        <>
          <motion.div
            className="fixed inset-0 z-[90] bg-[#1D181A]/35 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedJob(null)}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="recruiter-job-detail-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-0 top-0 z-[95] flex h-full w-full max-w-[420px] flex-col overflow-y-auto border-l border-[#EBC2AE] bg-[#FFFDFC] shadow-[0_0_60px_rgba(29,24,26,0.25)]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#F0D1BF] p-6">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#C75560]">Job details</p>
                <h2 id="recruiter-job-detail-title" className="mt-1 text-[19px] font-bold leading-tight text-[#1D181A]">
                  {selectedJob.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                aria-label="Close details"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#80576A] transition-colors hover:bg-[#FFF0E8] hover:text-[#1D181A]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 p-6">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] text-[#80576A]">
                {selectedJob.location && (
                  <span className="flex items-center gap-1.5"><MapPin size={13} /> {selectedJob.location}</span>
                )}
                {selectedJob.salary && (
                  <span className="flex items-center gap-1.5"><IndianRupee size={13} /> {formatSalary(selectedJob.salary)}</span>
                )}
                {selectedJob.experience && <span>{selectedJob.experience}</span>}
                {selectedJob.postedDate && <span className="flex items-center gap-1.5"><Clock size={13} /> Posted {timeAgo(selectedJob.postedDate)}</span>}
              </div>

              {(selectedJob.skillsRequired || []).length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">Skills required</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {(selectedJob.skillsRequired || []).map((skill) => (
                      <span key={skill} className="rounded-full bg-[#FFF0E8] px-2.5 py-1 text-[11px] font-semibold text-[#8D6072]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-400">Description</p>
                <DrawerDescription job={selectedJob} />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  </div>
  );
}