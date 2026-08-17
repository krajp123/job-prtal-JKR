import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  FileText,
  User,
  Calendar,
  Download,
  Link as LinkIcon,
  Loader2,
  Copy,
  Check,
  Clock,
  LogIn,
  Eye,
  Bookmark,
  RefreshCcw,
  KeyRound,
  Send,
  StickyNote,
  Ban,
  PauseCircle,
  PlayCircle,
  TrendingUp,
  ClipboardList,
  History,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';

const STATUS_CLASS = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  suspended: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  banned: 'bg-[#FDE7E7] text-[#B42318] ring-[#F6B9BA]',
  default: 'bg-[#FFF4EF] text-[#80576A] ring-[#EBC2AE]',
};

const APPLICATION_STATUS_CLASS = {
  applied: 'bg-[#FFF4EF] text-[#80576A] ring-[#EBC2AE]',
  shortlisted: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  interview: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  offered: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  hired: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-[#FDE7E7] text-[#B42318] ring-[#F6B9BA]',
  withdrawn: 'bg-[#F3F0EE] text-[#6B6265] ring-[#DCD3CE]',
};

const ACTIVITY_META = {
  login: { icon: LogIn, color: '#4F8A63' },
  profile_update: { icon: User, color: '#C7891F' },
  application: { icon: Briefcase, color: '#C75560' },
  job_view: { icon: Eye, color: '#7B7280' },
  job_saved: { icon: Bookmark, color: '#8C6BB1' },
  status_change: { icon: ShieldAlert, color: '#B42318' },
  default: { icon: Clock, color: '#80576A' },
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: User },
  { key: 'applications', label: 'Applications', icon: Briefcase },
  { key: 'activity', label: 'Activity log', icon: History },
  { key: 'controls', label: 'Controls', icon: ShieldAlert },
  { key: 'notes', label: 'Notes', icon: StickyNote },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeAgo(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return formatDate(value);
}

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center justify-center rounded-md border border-[#EBC2AE] bg-[#FFFDFB] p-1 text-[#80576A] hover:bg-[#FFF4EF]"
      title="Copy"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#F0E1D6] bg-white p-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF4EF] text-[#C75560]">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#A08A93]">{label}</p>
        <p className="truncate text-[15px] font-bold text-[#1D181A]">{value}</p>
        {sub ? <p className="truncate text-[10px] text-[#A08A93]">{sub}</p> : null}
      </div>
    </div>
  );
}

export default function CandidateProfile() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [candidate, setCandidate] = useState(null);
  const [applications, setApplications] = useState([]);
  const [activity, setActivity] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [appStatusFilter, setAppStatusFilter] = useState('all');
  const [savingNote, setSavingNote] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileRes, applicationsRes, activityRes, notesRes] = await Promise.allSettled([
        adminAxiosInstance.get(`/users/candidates/${candidateId}`),
        adminAxiosInstance.get(`/users/candidates/${candidateId}/applications`),
        adminAxiosInstance.get(`/users/candidates/${candidateId}/activity`),
        adminAxiosInstance.get(`/users/candidates/${candidateId}/notes`),
      ]);

      if (profileRes.status === 'fulfilled') {
        setCandidate(profileRes.value.data);
      } else {
        throw profileRes.reason;
      }

      setApplications(applicationsRes.status === 'fulfilled' ? applicationsRes.value.data?.applications || [] : []);
      setActivity(activityRes.status === 'fulfilled' ? activityRes.value.data?.activity || [] : []);
      setNotes(notesRes.status === 'fulfilled' ? notesRes.value.data?.notes || [] : []);
    } catch (err) {
      console.error('Failed to load candidate profile:', err);
      setError(err.response?.data?.error || 'Failed to load candidate profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId]);

  const updateStatus = async (status) => {
    try {
      setUpdating(true);
      await adminAxiosInstance.patch(`/users/candidates/${candidateId}/status`, { status });
      setCandidate((prev) => ({ ...prev, accountStatus: status }));
    } catch (err) {
      console.error('Failed to update candidate status:', err);
      setError(err.response?.data?.error || 'Failed to update candidate status');
    } finally {
      setUpdating(false);
    }
  };

  const toggleVerification = async () => {
    const nextValue = !candidate?.isVerified;
    try {
      setUpdating(true);
      await adminAxiosInstance.patch(`/users/candidates/${candidateId}/verify`, { isVerified: nextValue });
      setCandidate((prev) => ({ ...prev, isVerified: nextValue }));
    } catch (err) {
      console.error('Failed to update verification:', err);
      setError(err.response?.data?.error || 'Failed to update verification');
    } finally {
      setUpdating(false);
    }
  };

  const sendPasswordReset = async () => {
    try {
      setUpdating(true);
      await adminAxiosInstance.post(`/users/candidates/${candidateId}/send-password-reset`);
    } catch (err) {
      console.error('Failed to send password reset:', err);
      setError(err.response?.data?.error || 'Failed to send password reset email');
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async () => {
    if (!noteDraft.trim()) return;
    try {
      setSavingNote(true);
      const { data } = await adminAxiosInstance.post(`/users/candidates/${candidateId}/notes`, {
        message: noteDraft.trim(),
      });
      setNotes((prev) => [data?.note || { message: noteDraft.trim(), createdAt: new Date().toISOString() }, ...prev]);
      setNoteDraft('');
    } catch (err) {
      console.error('Failed to save note:', err);
      setError(err.response?.data?.error || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const filteredApplications = useMemo(() => {
    if (appStatusFilter === 'all') return applications;
    return applications.filter((app) => (app.status || 'applied').toLowerCase() === appStatusFilter);
  }, [applications, appStatusFilter]);

  const profileCompletion = useMemo(() => {
    if (!candidate) return 0;
    const profile = candidate.profile || {};
    const fields = [
      candidate.name,
      candidate.email,
      candidate.phone,
      profile.location,
      profile.headline,
      profile.about,
      (profile.skills || []).length > 0,
      profile.resumeUrl,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [candidate]);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center text-[#80576A]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading candidate profile…
      </div>
    );
  }

  if (error && !candidate) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-red-600" />
        <p className="text-sm font-semibold text-red-700">{error || 'Candidate not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/candidates')}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1D181A] bg-[#FFFDFB] px-3 py-2 text-[11px] font-bold text-[#1D181A]"
        >
          <ArrowLeft size={14} /> Back to candidates
        </button>
      </div>
    );
  }

  const statusClass = STATUS_CLASS[candidate.accountStatus] || STATUS_CLASS.default;
  const profile = candidate.profile || {};
  const profileImageUrl = candidate.profilePictureUrl || profile.profilePictureUrl || null;
  const fullName = candidate.name || 'Unnamed Candidate';
  const initials = (fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'C').slice(0, 2);
  const lastAppliedAt = applications[0]?.appliedAt;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/candidates')}
          className="inline-flex items-center gap-2 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
        >
          <RefreshCcw size={12} /> Refresh
        </button>
      </div>

      {error && candidate && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {/* Identity header */}
      <div className="rounded-xl border border-[#F0E1D6] bg-white p-4 shadow-[0_1px_2px_rgba(29,24,26,0.04)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#F0E1D6] bg-gradient-to-br from-[#C75560] to-[#D9654A] text-lg font-bold text-white shadow-sm">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={fullName}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none';
                    event.currentTarget.parentElement?.querySelector?.('.fallback-avatar')?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <span className={`fallback-avatar flex h-full w-full items-center justify-center ${profileImageUrl ? 'hidden' : ''}`}>
                {initials}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[22px] font-semibold text-[#1D181A]">{fullName}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${statusClass}`}>
                  {candidate.accountStatus || 'active'}
                </span>
                {candidate.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <ShieldCheck size={11} /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF4EF] px-2 py-0.5 text-[10px] font-bold text-[#80576A]">
                    <ShieldAlert size={11} /> Unverified
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] text-[#80576A]">Candidate ID: {candidate.uniqueId || candidateId || '—'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={updating || candidate.accountStatus === 'active'}
              onClick={() => updateStatus('active')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700 disabled:opacity-50"
            >
              <PlayCircle size={13} /> Activate
            </button>
            <button
              type="button"
              disabled={updating || candidate.accountStatus === 'suspended'}
              onClick={() => updateStatus('suspended')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 disabled:opacity-50"
            >
              <PauseCircle size={13} /> Suspend
            </button>
            <button
              type="button"
              disabled={updating || candidate.accountStatus === 'banned'}
              onClick={() => updateStatus('banned')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#F6B9BA] bg-[#FDE7E7] px-3 py-2 text-[11px] font-bold text-[#B42318] disabled:opacity-50"
            >
              <Ban size={13} /> Ban
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <StatCard icon={Briefcase} label="Applications" value={applications.length} sub={lastAppliedAt ? `last ${timeAgo(lastAppliedAt)}` : 'no applications yet'} />
          <StatCard icon={TrendingUp} label="Profile completion" value={`${profileCompletion}%`} />
          <StatCard icon={Clock} label="Last active" value={timeAgo(candidate.lastActiveAt)} />
          <StatCard icon={Calendar} label="Member since" value={formatDate(candidate.createdAt || candidate.registeredAt)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-[#F0E1D6] bg-white p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition-colors ${
                isActive ? 'bg-[#1D181A] text-white' : 'text-[#80576A] hover:bg-[#FFF4EF]'
              }`}
            >
              <Icon size={13} />
              {tab.label}
              {tab.key === 'applications' && applications.length > 0 && (
                <span className={`ml-0.5 rounded-full px-1.5 text-[9px] ${isActive ? 'bg-white/20' : 'bg-[#FFF4EF]'}`}>{applications.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <User className="h-4 w-4 text-[#80576A]" />
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Profile overview</h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Email</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-[12px] font-semibold text-[#1D181A]">{candidate.email || '—'}</span>
                      {candidate.email && <CopyField value={candidate.email} />}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Phone</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-[#1D181A]">{candidate.phone || '—'}</span>
                      {candidate.phone && <CopyField value={candidate.phone} />}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Location</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-[#1D181A]">{profile.location || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-[#C7891F]" />
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Joined</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-[#1D181A]">{formatDate(candidate.createdAt || candidate.registeredAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#80576A]" />
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Professional details</h2>
              </div>

              <div className="space-y-3 text-[12px]">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Headline</p>
                  <p className="mt-0.5 font-semibold text-[#1D181A]">{profile.headline || 'Not provided'}</p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">About</p>
                  <p className="mt-0.5 leading-relaxed text-[#3F3438]">{profile.about || 'No bio added yet.'}</p>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">Skills</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(profile.skills || []).length ? (
                      profile.skills.map((skill, index) => (
                        <span key={index} className="rounded-full border border-[#F0E1D6] bg-[#FFF9F5] px-2 py-0.5 text-[10px] font-medium text-[#80576A]">
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-[#80576A]">No skills added</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#80576A]" />
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Documents</h2>
              </div>

              <div className="space-y-2 text-[12px] text-[#1D181A]">
                <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                  <span className="text-[#80576A]">Resume</span>
                  {profile.resumeUrl ? (
                    <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#C75560] hover:underline">
                      <Download size={12} /> {profile.resumeFilename || 'View'}
                    </a>
                  ) : (
                    <span className="text-[#80576A]">No file</span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                  <span className="text-[#80576A]">Portfolio</span>
                  {profile.portfolio?.[0]?.url ? (
                    <a href={profile.portfolio[0].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#C75560] hover:underline">
                      <LinkIcon size={12} /> Open
                    </a>
                  ) : (
                    <span className="text-[#80576A]">Not set</span>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                  <span className="text-[#80576A]">Renewal date</span>
                  <span className="font-medium">{formatDate(candidate.renewalDueDate)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-[#80576A]" />
                <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Recent applications</h2>
              </div>

              {applications.slice(0, 4).length ? (
                <ul className="space-y-2">
                  {applications.slice(0, 4).map((app, idx) => {
                    const appStatusClass = APPLICATION_STATUS_CLASS[(app.status || 'applied').toLowerCase()] || APPLICATION_STATUS_CLASS.applied;
                    return (
                      <li key={app.id || idx} className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#1D181A]">{app.jobTitle || 'Untitled role'}</p>
                          <p className="text-[10px] text-[#A08A93]">{app.companyName || '—'} · {timeAgo(app.appliedAt)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ring-inset ${appStatusClass}`}>
                          {app.status || 'applied'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-[12px] text-[#80576A]">No job applications yet.</p>
              )}

              {applications.length > 4 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('applications')}
                  className="mt-3 text-[11px] font-bold text-[#C75560] hover:underline"
                >
                  View all {applications.length} applications →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPLICATIONS TAB */}
      {activeTab === 'applications' && (
        <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-[#80576A]" />
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">
                Job applications ({filteredApplications.length})
              </h2>
            </div>
            <select
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              className="rounded-lg border border-[#F0E1D6] bg-[#FFFDFB] px-2.5 py-1.5 text-[11px] font-semibold text-[#1D181A]"
            >
              <option value="all">All statuses</option>
              <option value="applied">Applied</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="interview">Interview</option>
              <option value="offered">Offered</option>
              <option value="hired">Hired</option>
              <option value="rejected">Rejected</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {filteredApplications.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-[12px]">
                <thead>
                  <tr className="border-b border-[#F0E1D6] text-[9px] uppercase tracking-[0.08em] text-[#A08A93]">
                    <th className="px-2 py-2 font-bold">Job title</th>
                    <th className="px-2 py-2 font-bold">Company</th>
                    <th className="px-2 py-2 font-bold">Applied on</th>
                    <th className="px-2 py-2 font-bold">Status</th>
                    <th className="px-2 py-2 font-bold">Resume used</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, idx) => {
                    const appStatusClass = APPLICATION_STATUS_CLASS[(app.status || 'applied').toLowerCase()] || APPLICATION_STATUS_CLASS.applied;
                    return (
                      <tr key={app.id || idx} className="border-b border-[#F5EBE3] last:border-0 hover:bg-[#FFF9F5]">
                        <td className="px-2 py-2.5 font-semibold text-[#1D181A]">{app.jobTitle || 'Untitled role'}</td>
                        <td className="px-2 py-2.5 text-[#3F3438]">{app.companyName || '—'}</td>
                        <td className="px-2 py-2.5 text-[#3F3438]">{formatDateTime(app.appliedAt)}</td>
                        <td className="px-2 py-2.5">
                          <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ring-1 ring-inset ${appStatusClass}`}>
                            {app.status || 'applied'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">
                          {app.resumeUrl ? (
                            <a href={app.resumeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#C75560] hover:underline">
                              <Download size={11} /> {app.resumeFilename || 'View'}
                            </a>
                          ) : (
                            <span className="text-[#A08A93]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-[#80576A]">No applications match this filter.</p>
          )}
        </div>
      )}

      {/* ACTIVITY LOG TAB */}
      {activeTab === 'activity' && (
        <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-[#80576A]" />
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Activity timeline</h2>
          </div>

          {activity.length ? (
            <ol className="relative space-y-4 border-l border-[#F0E1D6] pl-5">
              {activity.map((item, idx) => {
                const meta = ACTIVITY_META[item.type] || ACTIVITY_META.default;
                const Icon = meta.icon;
                return (
                  <li key={item.id || idx} className="relative">
                    <span
                      className="absolute -left-[26px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white"
                      style={{ backgroundColor: `${meta.color}1A`, color: meta.color }}
                    >
                      <Icon size={12} />
                    </span>
                    <div className="rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-[#1D181A]">{item.description || item.type}</p>
                        <span className="text-[10px] text-[#A08A93]">{formatDateTime(item.timestamp)}</span>
                      </div>
                      {(item.ip || item.device) && (
                        <p className="mt-0.5 text-[10px] text-[#A08A93]">
                          {[item.device, item.ip].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-[12px] text-[#80576A]">No activity recorded for this candidate yet.</p>
          )}
        </div>
      )}

      {/* CONTROLS TAB */}
      {activeTab === 'controls' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#80576A]" />
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Account control</h2>
            </div>

            <div className="space-y-3 text-[12px] text-[#1D181A]">
              <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                <div>
                  <p className="font-semibold">Verification</p>
                  <p className="text-[10px] text-[#A08A93]">Manually mark this candidate as verified</p>
                </div>
                <button
                  type="button"
                  disabled={updating}
                  onClick={toggleVerification}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-bold disabled:opacity-50 ${
                    candidate.isVerified
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-[#FFF4EF] text-[#80576A]'
                  }`}
                >
                  {candidate.isVerified ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  {candidate.isVerified ? 'Verified' : 'Unverified'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                <div>
                  <p className="font-semibold">Password</p>
                  <p className="text-[10px] text-[#A08A93]">Send a password reset email</p>
                </div>
                <button
                  type="button"
                  disabled={updating}
                  onClick={sendPasswordReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-1.5 text-[10px] font-bold text-[#1D181A] hover:bg-[#FFF4EF] disabled:opacity-50"
                >
                  <KeyRound size={12} /> Send reset link
                </button>
              </div>

            </div>
          </div>

          <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-[#80576A]" />
              <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Contact candidate</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={candidate.email ? `mailto:${candidate.email}` : undefined}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
              >
                <Mail size={13} /> Email candidate
              </a>
              {candidate.phone && (
                <a
                  href={`tel:${candidate.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#F0E1D6] bg-white px-3 py-2 text-[11px] font-bold text-[#1D181A] hover:bg-[#FFF4EF]"
                >
                  <Phone size={13} /> Call candidate
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="rounded-xl border border-[#F0E1D6] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-[#80576A]" />
            <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#1D181A]">Internal notes</h2>
          </div>
          <p className="mb-3 text-[10px] text-[#A08A93]">Visible only to admins — the candidate never sees these.</p>

          <div className="mb-3 flex gap-2">
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="Add a note about this candidate…"
              rows={2}
              className="flex-1 resize-none rounded-lg border border-[#F0E1D6] bg-[#FFFDFB] px-3 py-2 text-[12px] text-[#1D181A] outline-none focus:border-[#C75560]"
            />
            <button
              type="button"
              disabled={savingNote || !noteDraft.trim()}
              onClick={addNote}
              className="shrink-0 self-end rounded-lg bg-[#1D181A] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {savingNote ? <Loader2 size={13} className="animate-spin" /> : 'Add note'}
            </button>
          </div>

          {notes.length ? (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notes.map((note, idx) => (
                <li key={note.id || idx} className="rounded-lg bg-[#FFF9F5] px-3 py-2.5">
                  <p className="text-[12px] text-[#1D181A]">{note.message}</p>
                  <p className="mt-1 text-[10px] text-[#A08A93]">
                    {note.author || 'Admin'} · {formatDateTime(note.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-center text-[12px] text-[#80576A]">No internal notes yet.</p>
          )}
        </div>
      )}
    </div>
  );
}