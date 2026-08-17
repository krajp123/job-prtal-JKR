import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Eye,
  Trash2,
  X,
  MapPin,
  Mail,
  Calendar,
  Users,
  Building2,
  Briefcase,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const STATUS_STYLE = {
  open: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  closed: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  draft: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  flagged: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  unknown: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
  { key: 'draft', label: 'Draft' },
  { key: 'flagged', label: 'Flagged' },
];

function getStatus(job) {
  return job.status ? job.status.toLowerCase() : 'unknown';
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
  'working hours', 'growth opportunities', 'education',
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
    return <p className="text-sm leading-relaxed text-slate-700">No description provided.</p>;
  }

  return sections.map((section, index) => (
    <div key={index} className="space-y-3">
      {section.heading && (
        <h4 className="text-sm font-semibold text-slate-900">{section.heading}</h4>
      )}
      {section.blocks.map((block, blockIndex) =>
        block.type === 'list' ? (
          <ul key={blockIndex} className="mt-1 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={blockIndex} className="mt-1 text-sm leading-relaxed text-slate-700">
            {block.text}
          </p>
        )
      )}
    </div>
  ));
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${s.bg} ${s.text} px-2.5 py-1 text-[11px] font-medium capitalize`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function JobDrawer({ job, onClose, onDelete, onStatusChange, deleting }) {
  const navigate = useNavigate();

  if (!job) return null;
  const status = getStatus(job);
  const recruiter = job.recruiter || job.postedBy;
  const recruiterName = recruiter?.fullName || recruiter?.name || recruiter?.companyName || 'Unknown recruiter';
  const companyName = recruiter?.companyName || recruiter?.fullName || recruiter?.name || 'Unknown company';
  const applicants = job.applicantsCount ?? (Array.isArray(job.applications) ? job.applications.length : null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF0E8] text-[#C75560]">
              {recruiter?.companyLogoUrl ? (
                <img
                  src={recruiter.companyLogoUrl}
                  alt={companyName}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <Briefcase size={18} />
              )}
            </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">{job.title || 'Untitled role'}</h2>
                <p className="text-xs text-slate-500">{companyName}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="mt-3">
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Applicants</p>
              <button
                type="button"
                onClick={() => navigate(`/applications?jobId=${job._id}`)}
                className="mt-1 text-left text-lg font-semibold text-slate-900 hover:text-[#C75560]"
              >
                {applicants ?? '—'}
              </button>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Posted On</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatDate(job.createdAt)}</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Job Description</h3>
            <div className="space-y-2">
              {renderJobDescription(job)}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Posted By</h3>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <Building2 size={14} className="text-slate-400" /> {recruiterName}
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" /> {job.recruiter?.email || 'No email'}
              </li>
              <li className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" /> {job.location || 'Not specified'}
              </li>
              <li className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" /> Posted {formatDate(job.createdAt)}
              </li>
            </ul>
          </div>

          {Array.isArray(job.skills) && job.skills.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span key={skill} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          <div className="flex gap-2">
            {status === 'closed' ? (
              <button
                onClick={() => onStatusChange(job._id, 'open')}
                className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
              >
                Re-open Job
              </button>
            ) : (
              <button
                onClick={() => onStatusChange(job._id, 'closed')}
                className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100"
              >
                Close Job
              </button>
            )}
            <button
              disabled={deleting}
              onClick={() => onDelete(job._id)}
              className="flex-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete Job'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Status changes are persisted and will update the job status on refresh.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const JOBS_PER_PAGE = 5;

  useEffect(() => {
    async function loadJobs() {
      setLoading(true);
      setError('');
      try {
        const { data } = await adminAxiosInstance.get('/jobs');
        setJobs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Unable to load jobs.');
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  async function handleDelete(jobId) {
    if (!window.confirm('Delete this job posting? This cannot be undone.')) {
      return;
    }

    setDeleting(jobId);
    setError('');

    try {
      await adminAxiosInstance.delete(`/jobs/${jobId}`);
      setJobs((current) => current.filter((job) => job._id !== jobId));
      setSelectedJob((current) => (current?._id === jobId ? null : current));
    } catch (err) {
      setError('Failed to delete job. Please try again.');
    } finally {
      setDeleting(null);
    }
  }

  async function handleStatusChange(jobId, nextStatus) {
    setError('');
    try {
      const { data } = await adminAxiosInstance.patch(`/jobs/${jobId}/status`, { status: nextStatus });
      setJobs((current) => current.map((job) => (job._id === jobId ? { ...job, status: data.status } : job)));
      setSelectedJob((current) => (current?._id === jobId ? { ...current, status: data.status } : current));
    } catch (err) {
      setError('Failed to update status. Please try again.');
    }
  }

  const counts = useMemo(() => {
    const base = { all: jobs.length, closed: 0, draft: 0, flagged: 0, unknown: 0 };
    jobs.forEach((job) => {
      const s = getStatus(job);
      base[s] = (base[s] || 0) + 1;
    });
    return base;
  }, [jobs]);

  const filtered = useMemo(() => {
    return jobs.filter((job) => {
      const status = getStatus(job);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      const recruiter = job.recruiter || job.postedBy;
      const haystack = `${job.title || ''} ${recruiter?.name || ''} ${recruiter?.companyName || ''}`.toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [jobs, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / JOBS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedJobs = filtered.slice((safeCurrentPage - 1) * JOBS_PER_PAGE, safeCurrentPage * JOBS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Job Listings</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Every job posted across recruiters — who posted it, its status, and applicant activity.
          </p>
        </div>
        <div className="rounded-lg border border-[#EBC2AE] bg-[#FFF9F5] px-3 py-1.5 text-xs font-medium text-[#80576A]">
          Total jobs: {jobs.length}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">{error}</div>
      )}

      {/* Filters + search */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === f.key
                ? 'bg-[#C75560] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label} · {counts[f.key] || 0}
          </button>
        ))}

        <div className="relative ml-auto">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by job, recruiter or company"
            className="w-64 rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#C75560] focus:outline-none focus:ring-2 focus:ring-[#C75560]/10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden  border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.6fr_1.2fr_1fr_0.8fr_0.7fr_0.9fr] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <span>Job Title</span>
          <span>Recruiter</span>
          <span>Company</span>
          <span>Applicants</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-xs text-slate-500">Loading jobs…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-xs text-slate-500">No job postings match this search or filter.</div>
          ) : (
            paginatedJobs.map((job) => {
              const recruiter = job.recruiter || job.postedBy;
              const recruiterName = recruiter?.fullName || recruiter?.name || 'Unknown recruiter';
              const companyName = recruiter?.companyName || recruiter?.fullName || recruiter?.name || 'Unknown company';
              const status = getStatus(job);
              const isDeleting = deleting === job._id;
              const applicants = job.applicantsCount ?? (Array.isArray(job.applications) ? job.applications.length : null);

              return (
                <div
                  key={job._id}
                  onClick={() => navigate(`/jobs/${job._id}`)}
                  className="grid cursor-pointer items-center gap-3 px-5 py-3.5 text-xs text-slate-700 sm:grid-cols-[1.6fr_1.2fr_1fr_0.8fr_0.7fr_0.9fr] hover:bg-slate-50"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-slate-900">{job.title || 'Untitled role'}</p>
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      <MapPin size={11} /> {job.location || 'Not specified'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-800">{recruiterName}</p>
                    <p className="text-[11px] text-slate-400">{job.recruiter?.email || 'No email'}</p>
                  </div>
                  <div className="text-slate-700">{companyName}</div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/applications?jobId=${job._id}`);
                      }}
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-[#C75560]"
                    >
                      <Users size={12} className="text-slate-400" /> {applicants ?? '—'}
                    </button>
                  </div>
                  <div>
                    <StatusBadge status={status} />
                  </div>
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/jobs/${job._id}`)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#C75560]"
                      title="View details"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(job._id)}
                      className="rounded-md p-1.5 text-rose-500 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      title="Delete job"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
          >
            Previous
          </button>

          <p className="text-xs text-slate-600">
            Page <span className="font-semibold text-slate-800">{safeCurrentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
          </p>

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-slate-50"
          >
            Next
          </button>
        </div>
      )}

      <JobDrawer
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        onDelete={handleDelete}
        onStatusChange={handleStatusChange}
        deleting={deleting === selectedJob?._id}
      />
    </div>
  );
}