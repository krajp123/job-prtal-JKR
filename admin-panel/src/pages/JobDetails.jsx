import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
  Users,
  FileText,
  Trash2,
  Copy,
  Check,
  IndianRupee,
  GraduationCap,
  UserCheck,
  UserX,
  Clock3,
  Loader2,
  AlertCircle,
  Star,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

/* ============================= Design tokens ============================= */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
      .rc-root { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif; letter-spacing: -0.011em; }
      .rc-serif { font-family: 'Fraunces', ui-serif, Georgia, serif; font-feature-settings: 'ss01' 1; }
      .rc-mono { font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
      .rc-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
      .rc-scrollbar::-webkit-scrollbar-thumb { background: #EAD6C9; border-radius: 4px; }
    `}</style>
  );
}

/* ============================= Status maps ============================= */

const APPLICATION_STATUS_STYLES = {
  applied: { classes: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: '#3B82F6' },
  shortlisted: { classes: 'bg-violet-50 text-violet-700 ring-violet-600/20', dot: '#8B5CF6' },
  interview_scheduled: { classes: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: '#D97706' },
  interviewed: { classes: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20', dot: '#06B6D4' },
  hired: { classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: '#10B981' },
  accepted: { classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: '#10B981' },
  rejected: { classes: 'bg-red-50 text-red-700 ring-red-600/20', dot: '#EF4444' },
};

const JOB_STATUS_STYLES = {
  active: { classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: '#10B981' },
  open: { classes: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: '#10B981' },
  paused: { classes: 'bg-amber-50 text-amber-700 ring-amber-600/20', dot: '#D97706' },
  draft: { classes: 'bg-[#F3E9E3] text-[#80576A] ring-[#C9AFA2]/30', dot: '#A08A93' },
  closed: { classes: 'bg-slate-100 text-slate-600 ring-slate-400/20', dot: '#94A3B8' },
  expired: { classes: 'bg-red-50 text-red-700 ring-red-600/20', dot: '#EF4444' },
};

const DEFAULT_STATUS_STYLE = { classes: 'bg-slate-100 text-slate-600 ring-slate-400/20', dot: '#8A8A8A' };

function formatStatusText(status) {
  if (!status) return 'Unknown';
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/* ============================= Small building blocks ============================= */

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button onClick={copy} className="inline-flex items-center text-[#C9AFA2] hover:text-[#C75560] transition" title="Copy">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function StatusPill({ status, styleMap = APPLICATION_STATUS_STYLES, size = 'md' }) {
  const key = status?.toLowerCase().replace(/\s+/g, '_');
  const style = styleMap[key] || DEFAULT_STATUS_STYLE;
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-bold capitalize ring-1 ring-inset whitespace-nowrap ${pad} ${style.classes}`}>
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: style.dot }} />
      {formatStatusText(status)}
    </span>
  );
}

function SectionCard({ eyebrow, title, icon: Icon, action, children, bodyClassName = 'p-4' }) {
  return (
    <div className="rounded-xl border border-[#F0E1D6] bg-white shadow-[0_1px_2px_rgba(29,24,26,0.04),0_10px_28px_-16px_rgba(29,24,26,0.10)] overflow-hidden">
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2.5 border-b border-[#F3E9E3]">
          <div>
            {eyebrow && <p className="text-[9px] uppercase font-bold tracking-[0.1em] text-[#C75560] mb-0.5">{eyebrow}</p>}
            <h3 className="font-semibold text-[#1D181A] flex items-center gap-2 text-[13px]">
              {Icon && <Icon size={15} className="text-[#80576A]" />}
              {title}
            </h3>
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

function EmptyState({ label }) {
  return <p className="text-[11px] text-[#A08A93] py-8 text-center">{label}</p>;
}

function StatCard({ icon: Icon, label, value, accent, children }) {
  return (
    <div className="rounded-xl border border-[#F0E1D6] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(29,24,26,0.04)] transition-all duration-150">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex items-center justify-center h-5 w-5 rounded-md shrink-0" style={{ backgroundColor: `${accent}1A` }}>
            <Icon size={11} style={{ color: accent }} />
          </span>
          <p className="text-[9px] uppercase font-bold tracking-[0.08em] text-[#A08A93]">{label}</p>
        </div>
        <span className="rounded-full border border-[#F0E1D6] bg-[#FFF9F5] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-[#80576A]">
          View
        </span>
      </div>
      {value !== undefined ? (
        <p className="rc-mono text-[20px] font-bold text-[#1D181A] leading-none">{value}</p>
      ) : (
        children
      )}
    </div>
  );
}

function FactItem({ icon: Icon, label, children }) {
  return (
    <div className="flex-1 min-w-[120px] flex items-start gap-2">
      <Icon size={13} className="text-[#C7891F] mt-0.5 shrink-0" />
      <div>
        <p className="text-[9px] uppercase font-bold tracking-[0.08em] text-[#A08A93] mb-0.5">{label}</p>
        <div className="text-[12.5px] text-[#1D181A] font-semibold">{children}</div>
      </div>
    </div>
  );
}

/* ============================= Description parsing helpers ============================= */

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

const ADMIN_KNOWN_SECTION_HEADERS = [
  'about the company', 'about company', 'company overview', 'about us',
  'job description', 'job summary', 'about the role', 'role overview', 'overview',
  'roles and responsibilities', 'roles & responsibilities', 'responsibilities', 'key responsibilities',
  'required qualifications', 'requirements', 'qualifications', 'minimum qualifications',
  'preferred qualifications', 'good to have', 'nice to have', 'bonus points',
  'benefits', 'benefits & perks', 'perks', 'what we offer',
  'working hours', 'growth opportunities', 'education', 'job highlights',
];

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
    if (ADMIN_KNOWN_SECTION_HEADERS.includes(normalized)) return true;
    return (
      line.length > 0 &&
      line.length < 48 &&
      !/^[-•*]/.test(line) &&
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

    if (/^[-•*]\s+/.test(line)) {
      bulletBuffer.push(line.replace(/^[-•*]\s+/, ''));
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

  if (job.descriptionSections && typeof job.descriptionSections === 'object' && Object.keys(job.descriptionSections).length > 0) {
    return Object.entries(job.descriptionSections)
      .map(([heading, html]) => ({ heading, blocks: htmlSectionToBlocks(String(html || '')) }))
      .filter((section) => section.blocks.length > 0);
  }

  return parseFlatDescription(job.description);
}

function renderJobDescription(job) {
  const sections = buildDescriptionSections(job);

  if (sections.length === 0) {
    return <p className="text-[13px] leading-relaxed text-[#5B4A50]">No description provided.</p>;
  }

  return sections.map((section, index) => (
    <div key={index} className={index > 0 ? 'pt-4 mt-4 border-t border-[#F3E9E3] space-y-2' : 'space-y-2'}>
      {section.heading && (
        <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#1D181A] flex items-center gap-2">
          <span className="h-3 w-[3px] rounded-full bg-[#C75560]" />
          {section.heading}
        </h4>
      )}
      {section.blocks.map((block, blockIndex) =>
        block.type === 'list' ? (
          <ul key={blockIndex} className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-[#3F3438]">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex items-start gap-2">
                <span className="mt-[7px] h-1 w-1 rounded-full bg-[#C75560] shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={blockIndex} className="text-[13px] leading-relaxed text-[#3F3438]">
            {block.text}
          </p>
        )
      )}
    </div>
  ));
}

/* ============================= Main component ============================= */

export default function JobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, action: null });

  useEffect(() => {
    async function loadJobAndApplications() {
      setLoading(true);
      setError(null);
      try {
        const jobResponse = await adminAxiosInstance.get(`/jobs/${jobId}`);
        setJob(jobResponse.data);

        // Fetch applications for this job
        setApplicationsLoading(true);
        try {
          const appResponse = await adminAxiosInstance.get(`/applications?jobId=${jobId}`);
          const applicationData = appResponse.data;
          setApplications(
            Array.isArray(applicationData) ? applicationData : applicationData?.applications || []
          );
        } catch (appErr) {
          console.error('Failed to load applications:', appErr);
          setApplications([]);
        } finally {
          setApplicationsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load job:', err);
        setError(err.response?.data?.error || 'Failed to load job details');
      } finally {
        setLoading(false);
      }
    }

    if (jobId) loadJobAndApplications();
  }, [jobId]);

  const handleDeleteClick = () => {
    setConfirmModal({ isOpen: true, type: 'delete', action: null });
  };

  const handleStatusToggleClick = () => {
    if (!job) return;
    const nextStatus = job.status === 'closed' ? 'open' : 'closed';
    setConfirmModal({ isOpen: true, type: 'status', action: nextStatus });
  };

  const confirmAction = async () => {
    setConfirmModal({ isOpen: false, type: null, action: null });

    if (confirmModal.type === 'delete') {
      setDeleting(true);
      try {
        await adminAxiosInstance.delete(`/jobs/${jobId}`);
        navigate('/jobs');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to delete job');
        setDeleting(false);
      }
    } else if (confirmModal.type === 'status') {
      setStatusUpdating(true);
      setError(null);
      try {
        const { data } = await adminAxiosInstance.patch(`/jobs/${jobId}/status`, { status: confirmModal.action });
        setJob((prev) => ({ ...(prev || {}), ...data, status: data.status || confirmModal.action, adminClosed: Boolean(data.adminClosed) }));
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to update job status');
      } finally {
        setStatusUpdating(false);
      }
    }
  };

  const cancelAction = () => {
    setConfirmModal({ isOpen: false, type: null, action: null });
  };

  const recruiter = job?.recruiter || job?.postedBy;
  const companyLogo = recruiter?.companyLogoUrl;
  const applicantStats = useMemo(
    () => ({
      total: applications.length,
      shortlisted: applications.filter((a) => a.status?.toLowerCase() === 'shortlisted').length,
      hired: applications.filter((a) => a.status?.toLowerCase() === 'hired' || a.status?.toLowerCase() === 'accepted').length,
      rejected: applications.filter((a) => a.status?.toLowerCase() === 'rejected').length,
      interviewed: applications.filter((a) => a.status?.toLowerCase() === 'interviewed').length,
    }),
    [applications]
  );

  const statDefinitions = useMemo(
    () => ({
      total: {
        label: 'Total Applicants',
        icon: Users,
        accent: '#5B6FBF',
        list: applications,
      },
      shortlisted: {
        label: 'Shortlisted',
        icon: Star,
        accent: '#7C3AED',
        list: applications.filter((a) => a.status?.toLowerCase() === 'shortlisted'),
      },
      hired: {
        label: 'Hired',
        icon: UserCheck,
        accent: '#2E7D32',
        list: applications.filter((a) => a.status?.toLowerCase() === 'hired' || a.status?.toLowerCase() === 'accepted'),
      },
      interviewed: {
        label: 'Interviewed',
        icon: Clock3,
        accent: '#06B6D4',
        list: applications.filter((a) => a.status?.toLowerCase() === 'interviewed'),
      },
      rejected: {
        label: 'Rejected',
        icon: UserX,
        accent: '#B0413E',
        list: applications.filter((a) => a.status?.toLowerCase() === 'rejected'),
      },
    }),
    [applications]
  );


  if (loading) {
    return (
      <div className="rc-root flex items-center justify-center h-96 bg-[#FFFDFB]">
        <GlobalStyle />
        <div className="text-center">
          <Loader2 size={26} className="animate-spin text-[#C75560] mx-auto mb-3" />
          <p className="text-[12px] text-[#80576A] font-medium">Loading job details…</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rc-root max-w-[520px] mx-auto mt-10 bg-[#FFFDFB]">
        <GlobalStyle />
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-8 text-center">
          <AlertCircle size={22} className="text-red-500 mx-auto mb-2.5" />
          <p className="text-[13px] font-semibold text-red-800">{error || 'Job not found'}</p>
          <button
            onClick={() => navigate('/jobs')}
            className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#C75560] hover:bg-[#A0182C] text-white text-[12px] font-bold transition"
          >
            <ArrowLeft size={14} /> Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rc-root max-w-[1360px] mx-auto bg-[#FFFDFB]">
      <GlobalStyle />

      <div className="space-y-3.5 pb-8">
        {/* ================= Header ================= */}
        <div className="rounded-xl border border-[#F0E1D6] bg-white shadow-[0_1px_2px_rgba(29,24,26,0.04),0_10px_28px_-16px_rgba(29,24,26,0.10)] overflow-hidden">
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={recruiter?.companyName || 'Company logo'}
                  className="h-12 w-12 rounded-xl object-cover shrink-0 shadow-md"
                />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#C75560] to-[#D9654A] flex items-center justify-center shrink-0 shadow-md">
                  <span className="rc-serif text-base font-bold text-white">{getInitials(job.title || 'Job')}</span>
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="rc-serif text-[19px] font-semibold text-[#1D181A] leading-tight">
                    {job.title || 'Untitled Job'}
                  </h1>
                  <StatusPill status={job.status} styleMap={JOB_STATUS_STYLES} />
                </div>
                <p className="text-[12px] text-[#80576A] mt-1 flex items-center gap-1.5">
                  <Building2 size={12} className="text-[#A08A93]" />
                  {recruiter?.companyName || 'Unknown company'}
                  {job.location && (
                    <>
                      <span className="text-[#EAD6C9]">·</span>
                      <MapPin size={12} className="text-[#A08A93]" /> {job.location}
                    </>
                  )}
                  <span className="text-[#EAD6C9]">·</span>
                  <Calendar size={12} className="text-[#A08A93]" /> Posted {formatDate(job.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStatusToggleClick}
                disabled={statusUpdating}
                className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-bold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 ${
                  job?.status === 'closed'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-[#C9AFA2] bg-[#FFF4EF] text-[#80576A] hover:bg-[#FDE9E1]'
                }`}
              >
                {statusUpdating ? 'Updating…' : job?.status === 'closed' ? 'Reopen Job' : 'Close Job'}
              </button>

              <button
                onClick={handleDeleteClick}
                disabled={deleting}
                className="shrink-0 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 text-[11px] font-bold transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] text-red-700 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )}

        {/* ================= Quick Stats ================= */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
          {Object.entries(statDefinitions).map(([key, stat]) => (
            <button
              key={key}
              type="button"
              onClick={() => navigate(`/jobs/${jobId}/applicants?status=${key}`)}
              className="group w-full text-left cursor-pointer rounded-xl transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(29,24,26,0.18)] focus:outline-none focus:ring-2 focus:ring-[#C75560]/25"
              aria-label={`View ${stat.label.toLowerCase()} applicants`}
            >
              <StatCard icon={stat.icon} label={stat.label} value={applicantStats[key]} accent={stat.accent} />
            </button>
          ))}
        </div>

        {/* ================= Job Details ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-3.5">
            {/* Job Information */}
            <SectionCard title="Job Information" icon={Briefcase} eyebrow="Overview">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-4 pb-4 border-b border-[#F3E9E3]">
                  <FactItem icon={GraduationCap} label="Experience Level">
                    {job.experienceLevel || 'Not specified'}
                  </FactItem>
                  <FactItem icon={MapPin} label="Location">
                    {job.location || 'Not specified'}
                  </FactItem>
                  <FactItem icon={IndianRupee} label="Salary">
                    {job.salary || 'Not specified'}
                  </FactItem>
                </div>
                {Array.isArray(job.skills) && job.skills.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-[0.08em] text-[#A08A93] mb-2">
                      Required Skills
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {job.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-[#FFF4EF] border border-[#F0E1D6] text-[#80576A] px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* Job Description */}
            <SectionCard title="Job Description" icon={FileText} eyebrow="Details">
              {renderJobDescription(job)}
            </SectionCard>
          </div>

          {/* Sidebar */}
          <div className="space-y-3.5">
            {/* Posted By */}
            <SectionCard title="Posted By" icon={Building2} eyebrow="Recruiter">
              <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-[#F3E9E3]">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#5B6FBF] to-[#7C8FE0] flex items-center justify-center shrink-0 shadow-sm">
                  <span className="rc-serif text-[13px] font-bold text-white">
                    {getInitials(recruiter?.fullName || recruiter?.name)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#1D181A] truncate">
                    {recruiter?.fullName || recruiter?.name || 'Unknown'}
                  </p>
                  <p className="text-[11px] text-[#A08A93] truncate">{recruiter?.companyName || 'Not provided'}</p>
                </div>
              </div>

              <div className="space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#A08A93] shrink-0"><Mail size={12} /> Email</span>
                  <span className="text-[#1D181A] font-medium flex items-center gap-1.5 truncate">
                    <span className="truncate max-w-[150px]">{recruiter?.email || 'Not provided'}</span>
                    {recruiter?.email && <CopyField value={recruiter.email} />}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[#A08A93] shrink-0"><Phone size={12} /> Phone</span>
                  <span className="rc-mono text-[#1D181A] font-medium flex items-center gap-1.5">
                    {recruiter?.phone || 'Not provided'}
                    {recruiter?.phone && <CopyField value={recruiter.phone} />}
                  </span>
                </div>
              </div>
            </SectionCard>

            {/* Dates */}
            <SectionCard title="Timeline" icon={Calendar} eyebrow="Activity">
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center pt-0.5">
                    <span className="h-2 w-2 rounded-full bg-[#C75560]" />
                    <span className="w-px flex-1 bg-[#F0E1D6] mt-1" style={{ minHeight: 18 }} />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-[0.08em] text-[#A08A93]">Posted On</p>
                    <p className="text-[12.5px] text-[#1D181A] font-semibold mt-0.5">{formatDate(job.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="flex flex-col items-center pt-0.5">
                    <span className="h-2 w-2 rounded-full bg-[#EAD6C9]" />
                  </div>
                  <div>
                    <p className="text-[9px] uppercase font-bold tracking-[0.08em] text-[#A08A93]">Last Updated</p>
                    <p className="text-[12.5px] text-[#1D181A] font-semibold mt-0.5">{formatDate(job.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>

      </div>

      {/* ================= Confirmation Modal ================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-[#F0E1D6] bg-white shadow-2xl max-w-[420px] w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-[#C75560]/5 to-[#D9654A]/5 px-5 py-4 border-b border-[#F0E1D6]">
              <h2 className="text-[14px] font-bold text-[#1D181A]">
                {confirmModal.type === 'delete' ? 'Delete Job' : confirmModal.action === 'closed' ? 'Close Job' : 'Reopen Job'}
              </h2>
            </div>

            <div className="px-5 py-5 space-y-3">
              {confirmModal.type === 'delete' && (
                <>
                  <p className="text-[13px] leading-relaxed text-[#3F3438]">
                    Are you sure you want to delete this job? <span className="font-semibold text-red-700">This cannot be undone.</span>
                  </p>
                  <p className="text-[12px] text-[#A08A93] italic">
                    The job posting will be permanently removed from the system and all associated data will be deleted.
                  </p>
                </>
              )}

              {confirmModal.type === 'status' && confirmModal.action === 'closed' && (
                <>
                  <p className="text-[13px] leading-relaxed text-[#3F3438]">
                    Close this job for recruiters?
                  </p>
                  <p className="text-[12px] text-[#80576A] bg-[#FFF4EF] border border-[#EBC2AE] rounded-lg p-3">
                    <span className="font-semibold">Important:</span> Recruiters will no longer be able to reopen it directly. They must submit a reopen request, which you can then approve or reject.
                  </p>
                </>
              )}

              {confirmModal.type === 'status' && confirmModal.action === 'open' && (
                <p className="text-[13px] leading-relaxed text-[#3F3438]">
                  Reopen this job and make it active again for recruiters?
                </p>
              )}
            </div>

            <div className="flex gap-2.5 px-5 py-4 border-t border-[#F0E1D6] bg-[#FFFDFB]">
              <button
                type="button"
                onClick={cancelAction}
                className="flex-1 rounded-lg border border-[#EBC2AE] bg-white text-[#80576A] px-3 py-2 text-[12px] font-bold transition hover:bg-[#FFF4EF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={deleting || statusUpdating}
                className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-bold transition text-white disabled:opacity-60 disabled:cursor-not-allowed ${
                  confirmModal.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmModal.action === 'closed'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {deleting || statusUpdating ? 'Processing…' : confirmModal.type === 'delete' ? 'Delete Job' : confirmModal.action === 'closed' ? 'Close Job' : 'Reopen Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}