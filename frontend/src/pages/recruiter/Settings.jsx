import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import { FONT_DISPLAY } from '../../theme';
import {
  User,
  ShieldCheck,
  Users,
  Wallet,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  LogOut,
  Plus,
  Trash2,
  ExternalLink,
  X,
} from 'lucide-react';

/* --------------------------------------------------------------------- */
/*  Static config                                                         */
/* --------------------------------------------------------------------- */

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'team', label: 'Team & access', icon: Users },
  { id: 'billing', label: 'Billing', icon: Wallet },
  { id: 'danger', label: 'Danger zone', icon: AlertOctagon },
];

const ROLE_LABELS = {
  admin: 'Admin',
  recruiter: 'Recruiter',
  viewer: 'Viewer',
};

/* --------------------------------------------------------------------- */
/*  Small reusable primitives                                             */
/* --------------------------------------------------------------------- */

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C75560]/50 disabled:opacity-50 ${
        checked ? 'bg-[#C75560]' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function SettingRow({ title, description, children }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1D181A]">{title}</p>
        {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

function Card({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-[#F3E4DC] bg-white p-6 shadow-sm shadow-slate-200/40 sm:p-7">
      {(title || action) && (
        <div className="mb-1 flex items-start justify-between gap-4">
          <div>
            {title && <h3 className="text-base font-bold text-[#1D181A]">{title}</h3>}
            {description && <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="divide-y divide-slate-100">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-[#1D181A] outline-none transition focus:border-[#C75560] focus:bg-white';

function PrimaryButton({ children, onClick, disabled, type = 'button' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-[#C75560] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#B44852] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, tone = 'default' }) {
  const toneClass =
    tone === 'danger'
      ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
      : 'border-slate-200 text-slate-600 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border bg-white px-4 py-2 text-sm font-semibold transition ${toneClass}`}
    >
      {children}
    </button>
  );
}

function ModalPortal({ children, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(children, document.body);
}

function parseExpertiseTags(rawValue) {
  return Array.from(
    new Set(
      (rawValue || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function ChipInput({ items, onAdd, onRemove, placeholder = 'Add tag' }) {
  const [query, setQuery] = useState('');

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
    <div>
      {items.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="flex items-center gap-1.5 rounded-full bg-[#FFF4EF] px-3 py-1.5 text-[12px] font-semibold text-[#C75560]"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="hover:opacity-70 transition"
                aria-label={`Remove ${item}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',') && query.trim()) {
            e.preventDefault();
            addItem(query);
          }
        }}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

let experienceIdSeed = 0;
function makeExperienceId() {
  experienceIdSeed += 1;
  return `exp-${Date.now()}-${experienceIdSeed}`;
}

function createEmptyExperience() {
  return {
    id: makeExperienceId(),
    company: '',
    role: '',
    location: '',
    startDate: '', // "YYYY-MM"
    endDate: '', // "YYYY-MM", ignored when current is true
    current: false,
    description: '', // one responsibility/achievement per line
    isNew: true, // Track if this is a newly created entry
  };
}

function normalizeExperienceTimeline(rawList) {
  if (!Array.isArray(rawList)) return [];
  return rawList.map((exp) => ({
    id: makeExperienceId(),
    company: exp?.company || '',
    role: exp?.role || '',
    location: exp?.location || '',
    startDate: exp?.startDate || '',
    endDate: exp?.current ? '' : exp?.endDate || '',
    current: Boolean(exp?.current),
    description: Array.isArray(exp?.achievements)
      ? exp.achievements.join('\n')
      : exp?.description || '',
    isNew: false, // Mark as loaded from server
  }));
}

function formatMonthYear(value) {
  if (!value) return '';
  const [year, month] = value.split('-');
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatExperienceDuration(exp) {
  const start = formatMonthYear(exp.startDate);
  if (!start) return '—';
  const end = exp.current ? 'Present' : formatMonthYear(exp.endDate) || '—';
  return `${start} – ${end}`;
}

function isExperienceEntryEmpty(exp) {
  return (
    !exp.company.trim() &&
    !exp.role.trim() &&
    !exp.location.trim() &&
    !exp.startDate &&
    !exp.endDate &&
    !exp.description.trim()
  );
}

function serializeExperienceTimeline(list) {
  return (list || [])
    .filter((exp) => !isExperienceEntryEmpty(exp))
    .map((exp) => ({
      company: exp.company.trim(),
      role: exp.role.trim(),
      location: exp.location.trim(),
      startDate: exp.startDate || '',
      endDate: exp.current ? '' : exp.endDate || '',
      current: Boolean(exp.current),
      duration: formatExperienceDuration(exp),
      achievements: exp.description
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      // Note: isNew flag is not included in serialization (it's client-side only)
    }));
}

function validateExperienceEntry(exp) {
  const errors = {};
  if (!exp.company.trim()) errors.company = 'Company is required.';
  if (!exp.role.trim()) errors.role = 'Job title is required.';
  if (!exp.startDate) errors.startDate = 'Start date is required.';
  if (!exp.current && !exp.endDate) errors.endDate = 'End date is required, or mark as current role.';
  return errors;
}

/* --------------------------------------------------------------------- */
/*  Main page                                                             */
/* --------------------------------------------------------------------- */

export default function RecruiterSettings() {
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  /* ---- account ---- */
  const [account, setAccount] = useState({
    fullName: '',
    designation: '',
    companyName: '',
    location: '',
    experienceYears: '',
    email: '',
    phone: '',
    companyWebsite: '',
    bio: '',
    expertiseTags: '',
    languages: '',
    profilePictureUrl: '',
    experienceTimeline: [],
  });
  const [accountDraft, setAccountDraft] = useState({
    fullName: '',
    designation: '',
    companyName: '',
    location: '',
    experienceYears: '',
    email: '',
    phone: '',
    companyWebsite: '',
    bio: '',
    expertiseTags: '',
    languages: '',
    profilePictureUrl: '',
    experienceTimeline: [],
  });
  const [accountEditMode, setAccountEditMode] = useState(false);
  const [experienceErrors, setExperienceErrors] = useState({});
  const [editingExperienceId, setEditingExperienceId] = useState(null);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [uploadingProfilePicture, setUploadingProfilePicture] = useState(false);
  const [deletingProfilePicture, setDeletingProfilePicture] = useState(false);

  /* ---- security ---- */
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNext, setPasswordNext] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  /* ---- team ---- */
  const [teamMembers, setTeamMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('recruiter');

  /* ---- danger zone ---- */
  const [confirmAction, setConfirmAction] = useState(null); // 'deactivate' | 'delete' | null
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data } = await axiosInstance.get('/recruiter/me/profile');
        console.log('📥 API Response from /recruiter/me/profile:', {
          languages: data?.languages,
          isArray: Array.isArray(data?.languages),
          length: data?.languages?.length,
        });
        const loadedAccount = {
          fullName: data?.fullName || '',
          designation: data?.designation || '',
          companyName: data?.companyName || '',
          location: data?.location || '',
          experienceYears: data?.experienceYears ?? '',
          email: data?.email || '',
          phone: data?.phone || '',
          companyWebsite: data?.companyWebsite || '',
          bio: data?.bio || '',
          expertiseTags: Array.isArray(data?.expertiseTags) ? data.expertiseTags.join(', ') : '',
          languages: Array.isArray(data?.languages) ? data.languages.join(', ') : '',
          profilePictureUrl: data?.profilePictureUrl || undefined,
          experienceTimeline: normalizeExperienceTimeline(data?.experienceTimeline),
        };
        console.log('✅ Loaded account state with languages:', loadedAccount.languages);
        setAccount(loadedAccount);
        setAccountDraft(loadedAccount);
        setTeamMembers(data?.teamMembers || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load settings.');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function notify(msg) {
    setError('');
    setToast(msg);
  }

  async function persist(section, payload) {
    setSaving(true);
    setError('');
    try {
      await axiosInstance.put(`/recruiter/me/settings/${section}`, payload);
      notify('Changes saved.');
      return true;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveAccount() {
    setError('');

    // ---- validation: don't allow saving with required fields empty ----
    if (!accountDraft.fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    const nextErrors = {};
    accountDraft.experienceTimeline
      .filter((exp) => !isExperienceEntryEmpty(exp))
      .forEach((exp) => {
        const entryErrors = validateExperienceEntry(exp);
        if (Object.keys(entryErrors).length) nextErrors[exp.id] = entryErrors;
      });
    setExperienceErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      setError('Please fill in company, role, and dates for every experience entry before saving.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...accountDraft,
        experienceYears: accountDraft.experienceYears === '' ? 0 : Number(accountDraft.experienceYears),
        expertiseTags: parseExpertiseTags(accountDraft.expertiseTags),
        languages: parseExpertiseTags(accountDraft.languages),
        experienceTimeline: serializeExperienceTimeline(accountDraft.experienceTimeline),
      };

      console.log('📤 Payload to send to backend:', {
        languages: payload.languages,
        isArray: Array.isArray(payload.languages),
        accountDraftLanguages: accountDraft.languages,
      });

      // Upload profile picture if selected
      if (selectedProfilePicture) {
        setUploadingProfilePicture(true);
        const formData = new FormData();
        formData.append('profilePicture', selectedProfilePicture);
        try {
          const uploadRes = await axiosInstance.post('/recruiter/me/upload-profile-picture', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          payload.profilePictureUrl = uploadRes.data?.profilePictureUrl;
          setSelectedProfilePicture(null);
          setPreviewImage(null);
        } catch (err) {
          console.error('Profile picture upload failed:', err);
          setError(err.response?.data?.error || 'Failed to upload profile picture.');
          setUploadingProfilePicture(false);
          setSaving(false);
          return;
        }
        setUploadingProfilePicture(false);
      }

      const { data } = await axiosInstance.put('/recruiter/me/profile', payload);

      console.log('📥 Response from backend after save:', {
        languages: data?.languages,
        isArray: Array.isArray(data?.languages),
        dataKeys: Object.keys(data || {}),
        fullData: data,
      });

      // ---- merge server response with what we just submitted ----
      // If the API doesn't echo a field back (e.g. it only supports the old
      // schema and drops startDate/endDate/experienceYears), fall back to
      // the values we already have locally instead of wiping them out.
      const normalizedAccount = {
        fullName: data?.fullName || accountDraft.fullName,
        designation: data?.designation || accountDraft.designation,
        companyName: data?.companyName || accountDraft.companyName,
        location: data?.location || accountDraft.location,
        experienceYears: data?.experienceYears ?? accountDraft.experienceYears,
        email: data?.email || accountDraft.email,
        phone: data?.phone || accountDraft.phone,
        companyWebsite: data?.companyWebsite || accountDraft.companyWebsite,
        bio: data?.bio || accountDraft.bio,
        profilePictureUrl: data?.profilePictureUrl || account.profilePictureUrl,
        expertiseTags:
          Array.isArray(data?.expertiseTags) && data.expertiseTags.length
            ? data.expertiseTags.join(', ')
            : accountDraft.expertiseTags,
        languages:
          Array.isArray(data?.languages) && data.languages.length
            ? data.languages.join(', ')
            : accountDraft.languages,
        experienceTimeline:
          Array.isArray(data?.experienceTimeline) && data.experienceTimeline.length
            ? normalizeExperienceTimeline(data.experienceTimeline)
            : accountDraft.experienceTimeline.filter((exp) => !isExperienceEntryEmpty(exp)),
      };

      // Mark all experiences as not new after successful save
      const savedWithoutNewFlag = {
        ...normalizedAccount,
        experienceTimeline: normalizedAccount.experienceTimeline.map(exp => ({
          ...exp,
          isNew: false
        }))
      };
      setAccount(savedWithoutNewFlag);
      setAccountDraft(savedWithoutNewFlag);
      setExperienceErrors({});
      setEditingExperienceId(null);
      notify('Changes saved.');
      setAccountEditMode(false);
    } catch (err) {
      console.error('❌ Error saving profile - languages:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
      });
      setError(err.response?.data?.error || err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  function handleProfilePictureChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedProfilePicture(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleDeleteProfilePicture() {
    if (!window.confirm('Delete your profile picture?')) return;

    setDeletingProfilePicture(true);
    try {
      await axiosInstance.delete('/recruiter/me/profile-picture');
      setAccount((p) => ({ ...p, profilePictureUrl: undefined }));
      setAccountDraft((p) => ({ ...p, profilePictureUrl: undefined }));
      notify('Profile picture deleted.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete profile picture.');
    } finally {
      setDeletingProfilePicture(false);
    }
  }

  function addExperienceEntry() {
    const newExp = createEmptyExperience();
    setAccountDraft((p) => ({
      ...p,
      experienceTimeline: [newExp, ...p.experienceTimeline],
    }));
    // Set the new experience as the one being edited so form stays open
    setEditingExperienceId(newExp.id);
  }

  function updateExperienceEntry(id, patch) {
    setAccountDraft((p) => ({
      ...p,
      experienceTimeline: p.experienceTimeline.map((exp) => 
        exp.id === id 
          ? { 
              ...exp, 
              ...patch
            } 
          : exp
      ),
    }));
    setExperienceErrors((prev) => {
      if (!prev[id]) return prev;
      const entryErrors = { ...prev[id] };
      Object.keys(patch).forEach((field) => delete entryErrors[field]);
      const next = { ...prev };
      if (Object.keys(entryErrors).length) {
        next[id] = entryErrors;
      } else {
        delete next[id];
      }
      return next;
    });
  }

  function removeExperienceEntry(id) {
    setAccountDraft((p) => ({
      ...p,
      experienceTimeline: p.experienceTimeline.filter((exp) => exp.id !== id),
    }));
    setExperienceErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function openPasswordForm() {
    setPasswordError('');
    setShowPasswordForm(true);
  }

  function closePasswordForm() {
    setShowPasswordForm(false);
    setPasswordError('');
    setPasswordCurrent('');
    setPasswordNext('');
    setPasswordConfirm('');
    setPasswordSaved(false);
  }

  async function changePassword() {
    setPasswordError('');
    if (!passwordCurrent || !passwordNext) {
      setPasswordError('Fill in your current and new password.');
      return;
    }
    if (passwordNext !== passwordConfirm) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    setPasswordSaved(false);
    try {
      await axiosInstance.post('/recruiter/me/change-password', {
        currentPassword: passwordCurrent,
        newPassword: passwordNext,
      });
      setPasswordCurrent('');
      setPasswordNext('');
      setPasswordConfirm('');
      setPasswordSaved(true);
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordError(err?.response?.data?.error || 'Could not update your password. Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  }

  function addTeamMember() {
    if (!inviteEmail.trim()) return;
    const email = inviteEmail.trim();
    (async () => {
      setError('');
      setSaving(true);
      try {
        const { data } = await axiosInstance.post('/recruiter/me/team/invite', { email, role: inviteRole });
        setTeamMembers((prev) => [...prev, data.member]);
        setInviteEmail('');
        notify('Invite sent.');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to send invite.');
      } finally {
        setSaving(false);
      }
    })();
  }

  async function removeTeamMember(idOrEmail) {
    const member = teamMembers.find((m) => m.id === idOrEmail || m.email === idOrEmail);
    if (!member) return;

    // If this is a local pending invite (has an id starting with pending-), just remove locally
    if (member.status === 'pending' && String(member.id || '').startsWith('pending-')) {
      setTeamMembers((prev) => prev.filter((m) => m.id !== member.id));
      return;
    }

    setError('');
    setSaving(true);
    try {
      await axiosInstance.delete(`/recruiter/me/team/${encodeURIComponent(member.email)}`);
      setTeamMembers((prev) => prev.filter((m) => m.email !== member.email));
      notify('Team member removed.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove team member.');
    } finally {
      setSaving(false);
    }
  }

  const activeTabMeta = useMemo(() => TABS.find((t) => t.id === activeTab), [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF8F2]" style={{ fontFamily: FONT_DISPLAY }}>
        <RecruiterNavbar />
        <div className="mx-auto flex max-w-5xl items-center justify-center px-5 py-24 text-sm text-slate-400">
          Loading settings…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F2] text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
      <RecruiterNavbar />

      {toast && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-white px-6 py-4 text-sm font-semibold text-emerald-800 shadow-xl shadow-emerald-900/10">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-500" /> {toast}
          </div>
        </div>
      )}

      <main className="recruiter-page mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#C75560]">Recruiter workspace</p>
          <h1 className="mt-2 text-3xl font-bold text-[#1D181A]">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280]">
            Manage your account, security, and team settings.
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* --------------------------- TAB NAV --------------------------- */}
          <nav className="lg:sticky lg:top-8 lg:w-64 lg:shrink-0">
            <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = tab.id === activeTab;
                const isDanger = tab.id === 'danger';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left text-sm font-semibold transition lg:w-full ${
                      isActive
                        ? isDanger
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-[#C75560] text-white shadow-sm'
                        : isDanger
                        ? 'text-rose-500 hover:bg-rose-50'
                        : 'text-slate-600 hover:bg-white'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* --------------------------- CONTENT --------------------------- */}
          <div className="min-w-0 flex-1 space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
                <AlertTriangle size={16} className="shrink-0" /> {error}
              </div>
            )}

            {/* ============================ ACCOUNT ============================ */}
            {activeTab === 'account' && (
              <>
<Card
        title="Personal details"
        description="This is how your team and candidates identify you."
        action={
          !accountEditMode && (
            <PrimaryButton
              onClick={() => {
                setExperienceErrors({});
                setEditingExperienceId(null);
                setAccountEditMode(true);
              }}
            >
              Edit
            </PrimaryButton>
          )
        }
      >
        <div className="grid gap-5 pt-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Profile picture">
              {accountEditMode ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {previewImage && (
                      <img
                        src={previewImage}
                        alt="Profile preview"
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    )}
                    {account.profilePictureUrl && !previewImage && (
                      <img
                        src={account.profilePictureUrl}
                        alt="Current profile"
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    )}
                    {!previewImage && !account.profilePictureUrl && (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                        <span className="text-sm text-slate-400">No photo</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-2">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleProfilePictureChange}
                        className="rounded border border-dashed border-slate-300 px-3 py-2 text-xs"
                      />
                      {selectedProfilePicture && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProfilePicture(null);
                            setPreviewImage(null);
                          }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Clear selection
                        </button>
                      )}
                      {account.profilePictureUrl && !selectedProfilePicture && (
                        <button
                          type="button"
                          onClick={handleDeleteProfilePicture}
                          disabled={deletingProfilePicture}
                          className="text-xs text-red-500 hover:underline disabled:opacity-50"
                        >
                          {deletingProfilePicture ? 'Deleting...' : 'Delete current photo'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">JPG, PNG, or WEBP. Max 5MB.</p>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {account.profilePictureUrl ? (
                    <>
                      <img
                        src={account.profilePictureUrl}
                        alt="Profile"
                        className="h-20 w-20 rounded-full object-cover"
                      />
                      <p className="text-sm text-slate-600">Photo uploaded</p>
                    </>
                  ) : (
                    <p className="text-sm text-[#1D181A]">—</p>
                  )}
                </div>
              )}
            </Field>
          </div>

          <Field label="Full name">
            {accountEditMode ? (
              <input
                className={inputClass}
                value={accountDraft.fullName}
                onChange={(e) => setAccountDraft((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="e.g. Raj Sharma"
              />
            ) : (
              <p className="text-sm text-[#1D181A]">{account.fullName || '—'}</p>
            )}
          </Field>

          <Field label="Position">
            {accountEditMode ? (
              <input
                className={inputClass}
                value={accountDraft.designation}
                onChange={(e) => setAccountDraft((p) => ({ ...p, designation: e.target.value }))}
                placeholder="e.g. Talent Acquisition Lead"
              />
            ) : (
              <p className="text-sm text-[#1D181A]">{account.designation || '—'}</p>
            )}
          </Field>

          <Field label="Company name">
            {accountEditMode ? (
              <input
                className={inputClass}
                value={accountDraft.companyName}
                onChange={(e) => setAccountDraft((p) => ({ ...p, companyName: e.target.value }))}
                placeholder="e.g. Career Route"
              />
            ) : (
              <p className="text-sm text-[#1D181A]">{account.companyName || '—'}</p>
            )}
          </Field>

          <Field label="Location">
            {accountEditMode ? (
              <input
                className={inputClass}
                value={accountDraft.location}
                onChange={(e) => setAccountDraft((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g. Bengaluru, India"
              />
            ) : (
              <p className="text-sm text-[#1D181A]">{account.location || '—'}</p>
            )}
          </Field>

          <Field label="Years of experience">
            {accountEditMode ? (
              <input
                type="number"
                min="0"
                className={inputClass}
                value={accountDraft.experienceYears}
                onChange={(e) => setAccountDraft((p) => ({ ...p, experienceYears: e.target.value }))}
                placeholder="6"
              />
            ) : (
              <p className="text-sm text-[#1D181A]">{account.experienceYears || '—'}</p>
            )}
          </Field>

          <Field label="Work email">
            {accountEditMode ? (
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className={`${inputClass} pl-9`}
                  value={accountDraft.email}
                  onChange={(e) => setAccountDraft((p) => ({ ...p, email: e.target.value }))}
                  placeholder="you@company.com"
                />
              </div>
            ) : (
              <p className="text-sm text-[#1D181A]">{account.email || '—'}</p>
            )}
          </Field>

          <Field label="Contact number">
            {accountEditMode ? (
              <div className="relative">
                <Phone size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputClass} pl-9`}
                  value={accountDraft.phone}
                  onChange={(e) => setAccountDraft((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </div>
            ) : (
              <p className="text-sm text-[#1D181A]">{account.phone || '—'}</p>
            )}
          </Field>

          <Field label="Company website">
            {accountEditMode ? (
              <input
                className={inputClass}
                value={accountDraft.companyWebsite}
                onChange={(e) => setAccountDraft((p) => ({ ...p, companyWebsite: e.target.value }))}
                placeholder="https://company.com"
              />
            ) : (
              <p className="text-sm text-[#1D181A]">{account.companyWebsite || '—'}</p>
            )}
          </Field>

          <div className="sm:col-span-2">
            <Field label="About me">
              {accountEditMode ? (
                <textarea
                  rows={4}
                  className={`${inputClass} resize-none`}
                  value={accountDraft.bio}
                  onChange={(e) => setAccountDraft((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell candidates about your recruitment style, focus areas, and experience."
                />
              ) : (
                <p className="text-sm leading-6 text-[#1D181A]">{account.bio || '—'}</p>
              )}
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Recruiting expertise">
              {accountEditMode ? (
                <ChipInput
                  items={parseExpertiseTags(accountDraft.expertiseTags)}
                  onAdd={(tag) => {
                    const current = parseExpertiseTags(accountDraft.expertiseTags);
                    setAccountDraft((p) => ({ ...p, expertiseTags: [...current, tag].join(', ') }));
                  }}
                  onRemove={(tag) => {
                    const current = parseExpertiseTags(accountDraft.expertiseTags);
                    setAccountDraft((p) => ({ ...p, expertiseTags: current.filter((t) => t !== tag).join(', ') }));
                  }}
                  placeholder="e.g. AI Hiring, DevOps Recruiting (press Enter or comma to add)"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {parseExpertiseTags(account.expertiseTags).length > 0 ? (
                    parseExpertiseTags(account.expertiseTags).map((tag) => (
                      <span key={tag} className="rounded-full bg-[#FFF4EF] px-3 py-1.5 text-[12px] font-semibold text-[#C75560]">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-[#1D181A]">—</p>
                  )}
                </div>
              )}
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Languages">
              {accountEditMode ? (
                <ChipInput
                  items={parseExpertiseTags(accountDraft.languages)}
                  onAdd={(tag) => {
                    const current = parseExpertiseTags(accountDraft.languages);
                    setAccountDraft((p) => ({ ...p, languages: [...current, tag].join(', ') }));
                  }}
                  onRemove={(tag) => {
                    const current = parseExpertiseTags(accountDraft.languages);
                    setAccountDraft((p) => ({ ...p, languages: current.filter((t) => t !== tag).join(', ') }));
                  }}
                  placeholder="e.g. English, Hindi, Spanish (press Enter or comma to add)"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {parseExpertiseTags(account.languages).length > 0 ? (
                    parseExpertiseTags(account.languages).map((lang) => (
                      <span key={lang} className="rounded-full bg-[#FFF4EF] px-3 py-1.5 text-[12px] font-semibold text-[#C75560]">
                        {lang}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-[#1D181A]">—</p>
                  )}
                </div>
              )}
            </Field>
          </div>

          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Work experience
              </span>
              {accountEditMode && (
                <button
                  type="button"
                  onClick={addExperienceEntry}
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#C75560]/30 bg-[#FFF1EB] px-3 py-1.5 text-xs font-semibold text-[#C75560] transition hover:bg-[#FFE4DA]"
                >
                  <Plus size={13} /> Add experience
                </button>
              )}
            </div>

            {accountEditMode ? (
              accountDraft.experienceTimeline.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
                  No experience added yet. Click "Add experience" to add a past or current role.
                </p>
              ) : (
                <div className="space-y-4">
                  {accountDraft.experienceTimeline.map((exp, index) => {
                    const isEditing = editingExperienceId === exp.id;
                    const isEmpty = isExperienceEntryEmpty(exp);
                    // Show form if: it's a new entry OR user is actively editing it
                    // Form stays open until user clicks "Done" or "Cancel"
                    const showForm = exp.isNew || isEditing;
                    
                    return (
                      <div key={exp.id}>
                        {showForm ? (
                          // EDIT MODE - Show full form for editing or new entries
                          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-500">
                                {exp.current ? 'Current role' : `Experience ${index + 1}`}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  removeExperienceEntry(exp.id);
                                  if (isEditing) setEditingExperienceId(null);
                                }}
                                aria-label="Remove experience"
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Company</span>
                                <input
                                  className={`${inputClass} ${
                                    experienceErrors[exp.id]?.company ? 'border-rose-400 bg-rose-50/40' : ''
                                  }`}
                                  value={exp.company || ''}
                                  onChange={(e) => updateExperienceEntry(exp.id, { company: e.target.value })}
                                  placeholder="e.g. Tech Corp India"
                                />
                                {experienceErrors[exp.id]?.company && (
                                  <p className="mt-1 text-[11px] font-medium text-rose-600">{experienceErrors[exp.id].company}</p>
                                )}
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Job title / Role</span>
                                <input
                                  className={`${inputClass} ${
                                    experienceErrors[exp.id]?.role ? 'border-rose-400 bg-rose-50/40' : ''
                                  }`}
                                  value={exp.role || ''}
                                  onChange={(e) => updateExperienceEntry(exp.id, { role: e.target.value })}
                                  placeholder="e.g. Senior Talent Acquisition Partner"
                                />
                                {experienceErrors[exp.id]?.role && (
                                  <p className="mt-1 text-[11px] font-medium text-rose-600">{experienceErrors[exp.id].role}</p>
                                )}
                              </label>
                              <label className="block sm:col-span-2">
                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Location</span>
                                <input
                                  className={inputClass}
                                  value={exp.location || ''}
                                  onChange={(e) => updateExperienceEntry(exp.id, { location: e.target.value })}
                                  placeholder="e.g. Bengaluru, India"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">Start date</span>
                                <input
                                  type="month"
                                  className={`${inputClass} ${
                                    experienceErrors[exp.id]?.startDate ? 'border-rose-400 bg-rose-50/40' : ''
                                  }`}
                                  value={exp.startDate || ''}
                                  onChange={(e) => updateExperienceEntry(exp.id, { startDate: e.target.value })}
                                />
                                {experienceErrors[exp.id]?.startDate && (
                                  <p className="mt-1 text-[11px] font-medium text-rose-600">{experienceErrors[exp.id].startDate}</p>
                                )}
                              </label>
                              <label className="block">
                                <span className="mb-1 block text-[11px] font-semibold text-slate-500">End date</span>
                                <input
                                  type="month"
                                  className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50 ${
                                    experienceErrors[exp.id]?.endDate ? 'border-rose-400 bg-rose-50/40' : ''
                                  }`}
                                  value={exp.endDate || ''}
                                  disabled={exp.current}
                                  min={exp.startDate}
                                  onChange={(e) => updateExperienceEntry(exp.id, { endDate: e.target.value })}
                                />
                                {experienceErrors[exp.id]?.endDate && (
                                  <p className="mt-1 text-[11px] font-medium text-rose-600">{experienceErrors[exp.id].endDate}</p>
                                )}
                              </label>
                            </div>

                            <label className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-600">
                              <input
                                type="checkbox"
                                checked={exp.current}
                                onChange={(e) =>
                                  updateExperienceEntry(exp.id, {
                                    current: e.target.checked,
                                    endDate: e.target.checked ? '' : exp.endDate,
                                  })
                                }
                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#C75560] focus:ring-[#C75560]/40"
                              />
                              I currently work here
                            </label>

                            <label className="mt-3 block">
                              <span className="mb-1 block text-[11px] font-semibold text-slate-500">
                                Key responsibilities &amp; achievements (one per line)
                              </span>
                              <textarea
                                rows={3}
                                className={`${inputClass} resize-none`}
                                value={exp.description || ''}
                                onChange={(e) => updateExperienceEntry(exp.id, { description: e.target.value })}
                                placeholder={'Closed 45+ engineering roles\nBuilt campus hiring pipeline\nReduced time-to-hire from 41 to 19 days'}
                              />
                            </label>

                            {isEditing && (
                              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                                <button
                                  type="button"
                                  onClick={() => setEditingExperienceId(null)}
                                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Done
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          // VIEW MODE - Show summary card with edit/delete buttons
                          <div className="rounded-2xl border border-[#F3E4DC] bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#1D181A]">
                                  {exp.role} <span className="font-normal text-slate-500">· {exp.company}</span>
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatExperienceDuration(exp)}
                                  {exp.location ? ` · ${exp.location}` : ''}
                                  {exp.current && (
                                    <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                      Current
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingExperienceId(exp.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeExperienceEntry(exp.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : account.experienceTimeline.length === 0 ? (
              <p className="text-sm text-[#1D181A]">—</p>
            ) : (
              <div className="space-y-5 border-l-2 border-[#F3E4DC] pl-4">
                {account.experienceTimeline.map((exp) => (
                  <div key={exp.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#C75560]" />
                    <p className="text-sm font-semibold text-[#1D181A]">
                      {exp.role || 'Role'} <span className="font-normal text-slate-500">· {exp.company || 'Company'}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatExperienceDuration(exp)}
                      {exp.location ? ` · ${exp.location}` : ''}
                      {exp.current && (
                        <span className="ml-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Current
                        </span>
                      )}
                    </p>
                    {exp.description && (
                      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-6 text-[#1D181A]">
                        {exp.description
                          .split('\n')
                          .map((line) => line.trim())
                          .filter(Boolean)
                          .map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {accountEditMode && (
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
            <GhostButton
              onClick={() => {
                setAccountDraft(account);
                setAccountEditMode(false);
                setEditingExperienceId(null);
                setExperienceErrors({});
                setError('');
              }}
            >
              Cancel
            </GhostButton>
            <PrimaryButton disabled={saving} onClick={saveAccount}>
              {saving ? 'Saving…' : 'Save changes'}
            </PrimaryButton>
          </div>
        )}
      </Card>

                <Card
                  title="Company profile"
                  description="Branding, registration details, and public summary live on a separate page."
                  action={
                    <a
                      href="/recruiter/company-profile"
                      className="flex items-center gap-1.5 text-sm font-semibold text-[#C75560] hover:underline"
                    >
                      Manage <ExternalLink size={14} />
                    </a>
                  }
                />
              </>
            )}


            {/* =========================== SECURITY ============================ */}
            {activeTab === 'security' && (
              <>
                <Card title="Change password" description="Use at least 8 characters with a mix of letters, numbers, and special characters.">
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-slate-600">
                      Change your password regularly to keep your recruiter account secure.
                    </p>
                    <button
                      type="button"
                      onClick={openPasswordForm}
                      className="inline-flex items-center justify-center rounded-xl bg-[#C75560] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B44852]"
                    >
                      Change password
                    </button>
                    {passwordSaved && !showPasswordForm && (
                      <p className="text-sm font-medium text-emerald-700">Your password was updated successfully.</p>
                    )}
                  </div>
                </Card>
              </>
            )}

            {/* ============================= TEAM =============================== */}
            {showPasswordForm && (
              <ModalPortal onClose={closePasswordForm}>
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8"
                  onMouseDown={(e) => {
                    if (e.target === e.currentTarget) closePasswordForm();
                  }}
                >
                  <div className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl animate-modal-open">
                    <style>{`
                      @keyframes modal-open {
                        from { opacity: 0; transform: translateY(12px) scale(0.97); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                      }
                      .animate-modal-open { animation: modal-open 0.98s cubic-bezier(0.16, 1, 0.3, 1) both; }
                      @media (prefers-reduced-motion: reduce) {
                        .animate-modal-open { animation: none; }
                      }
                    `}</style>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">Change password</h2>
                        <p className="mt-2 text-sm text-slate-600">
                          Enter your current password and choose a new one to keep your account secure.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closePasswordForm}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        aria-label="Close password form"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-[13px] font-semibold text-slate-700">Current password</span>
                        <input
                          type="password"
                          value={passwordCurrent}
                          onChange={(e) => setPasswordCurrent(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#C75560] focus:outline-none focus:ring-2 focus:ring-[#C75560]/10"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[13px] font-semibold text-slate-700">New password</span>
                        <input
                          type="password"
                          value={passwordNext}
                          onChange={(e) => setPasswordNext(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#C75560] focus:outline-none focus:ring-2 focus:ring-[#C75560]/10"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[13px] font-semibold text-slate-700">Confirm new password</span>
                        <input
                          type="password"
                          value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#C75560] focus:outline-none focus:ring-2 focus:ring-[#C75560]/10"
                        />
                      </label>
                    </div>

                    {passwordError && (
                      <div className="mt-4 rounded-xl border border-[#E9B6AF] bg-[#FFF0EE] px-4 py-3 text-sm text-[#B3261E]">{passwordError}</div>
                    )}

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={changePassword}
                        disabled={passwordSaving}
                        className="inline-flex items-center justify-center rounded-xl bg-[#C75560] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#B44852] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {passwordSaving ? 'Saving…' : 'Change password'}
                      </button>
                      <button
                        type="button"
                        onClick={closePasswordForm}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </ModalPortal>
            )}
            {activeTab === 'team' && (
              <>
                <Card title="Invite a team member" description="Give colleagues access to this recruiter workspace.">
                  <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                    <input
                      type="email"
                      className={`${inputClass} sm:flex-1`}
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <select
                      className={`${inputClass} sm:w-44`}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      <option value="recruiter">Recruiter</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <Link
                      to="/recruiter/invites"
                      onClick={() => setActiveTab('team')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Manage invites
                    </Link>
                  </div>
                </Card>

                <Card title="Workspace members" description={`${teamMembers.length} member${teamMembers.length === 1 ? '' : 's'} with access.`}>
                  {teamMembers.length === 0 ? (
                    <p className="py-4 text-sm text-slate-400">No team members yet. Invite your first colleague above.</p>
                  ) : (
                    teamMembers.map((member) => (
                      <div key={member.id || member.email} className="flex items-center justify-between gap-4 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1EB] text-sm font-bold text-[#C75560]">
                            {member.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#1D181A]">{member.email}</p>
                            <p className="text-xs text-slate-500">
                              {ROLE_LABELS[member.role] || member.role}
                              {member.status === 'pending' && ' · Invite pending'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeTeamMember(member.id || member.email)}
                          aria-label="Remove member"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))
                  )}
                </Card>
              </>
            )}


            {/* ============================ BILLING ============================= */}
            {activeTab === 'billing' && (
              <Card
                title="Billing & wallet"
                description="Manage payment methods, resume-download credits, and transaction history from your wallet."
                action={
                  <a
                    href="/recruiter/wallet"
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#C75560] hover:underline"
                  >
                    Open wallet <ExternalLink size={14} />
                  </a>
                }
              >
                <p className="py-4 text-sm leading-6 text-slate-600">
                  Your plan, invoices, and Razorpay payment methods are managed on the wallet page so you can track spend
                  alongside resume downloads and unlocks in one place.
                </p>
              </Card>
            )}

            {/* ============================ DANGER ZONE ========================== */}
            {activeTab === 'danger' && (
              <>
                <div>
                  <h2 className="text-lg font-bold text-[#1D181A]">Danger zone</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    These actions are irreversible or affect your entire workspace.
                  </p>
                </div>
                <Card>
                  <SettingRow
                    title="Deactivate account"
                    description="Temporarily hide your job listings and pause notifications. You can reactivate anytime by signing back in."
                  >
                    <GhostButton tone="danger" onClick={() => { setConfirmAction('deactivate'); setConfirmText(''); }}>
                      Deactivate
                    </GhostButton>
                  </SettingRow>
                  <SettingRow
                    title="Delete account"
                    description="Permanently delete your recruiter account, job listings, and candidate data. This cannot be undone."
                  >
                    <GhostButton tone="danger" onClick={() => { setConfirmAction('delete'); setConfirmText(''); }}>
                      Delete account
                    </GhostButton>
                  </SettingRow>
                </Card>
              </>
            )}
          </div>
        </div>
      </main>

      {/* --------------------------- CONFIRM MODAL --------------------------- */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                <AlertOctagon size={18} />
              </div>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50"
              >
                <X size={15} />
              </button>
            </div>
            <h3 className="mt-4 text-base font-bold text-[#1D181A]">
              {confirmAction === 'delete' ? 'Delete your account?' : 'Deactivate your account?'}
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              {confirmAction === 'delete'
                ? 'This permanently removes your job listings, candidate data, and wallet history. Type DELETE to confirm.'
                : 'Your job listings will be hidden from candidates until you sign back in. Type DEACTIVATE to confirm.'}
            </p>
            <input
              className={`${inputClass} mt-4`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={confirmAction === 'delete' ? 'DELETE' : 'DEACTIVATE'}
            />
            <div className="mt-5 flex justify-end gap-2">
              <GhostButton onClick={() => setConfirmAction(null)}>Cancel</GhostButton>
              <button
                type="button"
                disabled={confirmText !== (confirmAction === 'delete' ? 'DELETE' : 'DEACTIVATE')}
                onClick={async () => {
                  await persist(confirmAction, {});
                  setConfirmAction(null);
                  notify(confirmAction === 'delete' ? 'Account deleted.' : 'Account deactivated.');
                }}
                className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirmAction === 'delete' ? 'Delete permanently' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}