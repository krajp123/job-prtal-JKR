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
    email: '',
    phone: '',
  });
  const [accountDraft, setAccountDraft] = useState({
    fullName: '',
    designation: '',
    email: '',
    phone: '',
  });
  const [accountEditMode, setAccountEditMode] = useState(false);

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
        const loadedAccount = {
          fullName: data?.fullName || '',
          designation: data?.designation || '',
          email: data?.email || '',
          phone: data?.phone || '',
        };
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
    setSaving(true);
    setError('');
    try {
      const { data } = await axiosInstance.put('/recruiter/me/profile', accountDraft);
      setAccount(data);
      setAccountDraft(data);
      notify('Changes saved.');
      setAccountEditMode(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
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

      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
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
          accountEditMode ? (
            <div className="flex items-center gap-2">
              <GhostButton
                onClick={() => {
                  setAccountDraft(account);
                  setAccountEditMode(false);
                }}
              >
                Cancel
              </GhostButton>
              <PrimaryButton disabled={saving} onClick={saveAccount}>
                {saving ? 'Saving…' : 'Save'}
              </PrimaryButton>
            </div>
          ) : (
            <PrimaryButton onClick={() => setAccountEditMode(true)}>Edit</PrimaryButton>
          )
        }
      >
        <div className="grid gap-5 pt-4 sm:grid-cols-2">
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
          <Field label="Designation">
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
          <Field label="Phone number">
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
                  </div>
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