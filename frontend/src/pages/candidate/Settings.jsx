import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import { FONT_DISPLAY, FONT_BODY, MAROON } from '../../theme';
import CandidateNavbar from '../../components/CandidateNavbar';
import {
  AlertTriangle,
  User,
  Lock,
  Bell,
  Eye,
  Briefcase,
  FileText,
  CheckCircle2,
  X,
  Plus,
  Trash2,
  Download,
  Loader2,
  Pencil,
  ShieldCheck,
} from 'lucide-react';

/* ============================== TOKENS ==============================
   Extends the existing candidate palette (MAROON = #8B1E2F) rather than
   introducing a new one. Deep maroon for emphasis, gold as a quiet second
   accent for "primary/verified" states, everything else stays stone/ivory
   so the seven tabs don't fight each other for attention. Radius, shadow,
   and border tokens are centralized here so every panel reads as one
   consistent system rather than a stack of ad-hoc cards.
======================================================================= */
const MAROON_HOVER = '#6F1726';
const MAROON_DEEP = '#5C1420';
const MAROON_TINT = '#FBEAEA';
const GOLD = '#B8863B';
const GOLD_TINT = '#FBF3E4';
const PAGE_BG = '#FAF8F6';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const CARD_SHADOW = '0 1px 2px rgba(28,22,20,0.04), 0 12px 24px -16px rgba(92,20,32,0.14)';
const CARD_SHADOW_HOVER = '0 1px 2px rgba(28,22,20,0.05), 0 20px 32px -16px rgba(92,20,32,0.18)';
const RAIL_SHADOW = '0 1px 2px rgba(28,22,20,0.04), 0 8px 20px -14px rgba(92,20,32,0.12)';

/* ============================== MODAL PORTAL ==============================
   Renders straight into document.body instead of inline in the page tree.
   This is what actually fixes overlays rendering "under" or beside the navbar:
   the navbar establishes its own z-50/z-60 stacking contexts, so a modal
   nested deep inside the page content can lose that stacking fight depending
   on browser/DOM order. Porting to <body> with a z-index above everything
   else in the app sidesteps that entirely. Also locks background scroll and
   closes on Escape, which every real modal should do.
======================================================================= */
function ModalPortal({ children, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKeyDown(e) {
      if (e.key === 'Escape' && typeof onClose === 'function') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return createPortal(children, document.body);
}

/* ============================== SMALL UI ATOMS ============================== */

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8B1E2F] disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? '' : 'bg-stone-200'
      }`}
      style={checked ? { background: MAROON } : undefined}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 pr-2">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        {description && <p className="mt-0.5 text-[13px] leading-5 text-stone-500">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function VerifiedBadge({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 size={12} /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
      Unverified
    </span>
  );
}

function SettingsCard({ icon: Icon, title, description, children, tone = 'default', action }) {
  const iconBg = tone === 'danger' ? '#FEF3F2' : MAROON_TINT;
  const iconColor = tone === 'danger' ? '#B3261E' : MAROON;
  return (
    <section
      className="animate-panel-in rounded-2xl border border-stone-200/80 bg-white p-6 transition-shadow duration-300 sm:p-7"
      style={{ boxShadow: CARD_SHADOW, transitionTimingFunction: EASE }}
    >
      <div className="flex items-start justify-between gap-3.5 border-b border-stone-100 pb-5">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: iconBg, color: iconColor }}>
            <Icon size={18} strokeWidth={2.25} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[15px] font-bold tracking-[-0.01em] text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] leading-5 text-stone-500">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0 pl-2">{action}</div>}
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}

function FieldRow({ label, value, verified, onEdit, children, editing }) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 transition-colors duration-200 sm:px-5 ${
        editing ? 'border-[#8B1E2F]/20 bg-[#FFFBF9]' : 'border-stone-100 bg-[#FCFAF8]'
      }`}
    >
      {!editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">{label}</p>
            <div className="mt-1 flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-stone-900">{value}</p>
              {verified !== undefined && <VerifiedBadge verified={verified} />}
            </div>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-600 transition-colors hover:border-[#8B1E2F]/30 hover:text-[#8B1E2F]"
          >
            <Pencil size={13} /> Change
          </button>
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">{label}</p>
          <div className="mt-2">{children}</div>
        </div>
      )}
    </div>
  );
}

function SaveBar({ saving, saved, onSave, onCancel, label = 'Save changes' }) {
  return (
    <div className="mt-6 flex items-center gap-3 border-t border-stone-100 pt-5">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-all duration-150 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: MAROON }}
        onMouseEnter={(e) => !saving && (e.currentTarget.style.background = MAROON_HOVER)}
        onMouseLeave={(e) => (e.currentTarget.style.background = MAROON)}
      >
        {saving && <Loader2 size={14} className="animate-spin" />}
        {saving ? 'Saving…' : label}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-stone-500 transition-colors hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      )}
      {saved && !saving && (
        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-emerald-600">
          <CheckCircle2 size={14} /> Saved
        </span>
      )}
    </div>
  );
}

function ChipInput({ values, onAdd, onRemove, placeholder }) {
  const [draft, setDraft] = useState('');
  function submit(e) {
    e.preventDefault();
    const v = draft.trim();
    if (v && !values.includes(v)) onAdd(v);
    setDraft('');
  }
  return (
    <div>
      {values.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium"
              style={{ background: MAROON_TINT, color: MAROON_DEEP }}
            >
              {v}
              <button
                type="button"
                onClick={() => onRemove(v)}
                aria-label={`Remove ${v}`}
                className="text-[#8B1E2F]/60 transition hover:text-[#8B1E2F]"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
        />
        <button
          type="submit"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-lg border border-stone-200 text-stone-500 transition hover:border-[#8B1E2F]/30 hover:text-[#8B1E2F]"
          aria-label="Add"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}

function StaticTagList({ values, emptyText = 'Not set yet.' }) {
  if (!values || values.length === 0) {
    return <p className="text-sm text-stone-400">{emptyText}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center rounded-md px-2.5 py-1.5 text-[13px] font-medium"
          style={{ background: MAROON_TINT, color: MAROON_DEEP }}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

function RadioCard({ name, value, checked, onChange, title, description }) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors duration-150 ${
        checked ? 'border-[#8B1E2F]/40 bg-[#FFFBF9]' : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? 'border-[#8B1E2F]' : 'border-stone-300'
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full" style={{ background: MAROON }} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-stone-900">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-5 text-stone-500">{description}</span>}
      </span>
    </label>
  );
}

function strengthOf(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

function PasswordStrengthBar({ password }) {
  const score = strengthOf(password);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#D64545', '#D64545', '#D68A2A', '#4C9A5B', '#2E7D46'];
  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ background: i < score ? colors[score] : '#EFEAE6' }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[12px] font-medium" style={{ color: colors[score] }}>
        {labels[score]}
      </p>
    </div>
  );
}

/* ============================== TAB DEFINITIONS ============================== */

const TABS = [
  { key: 'account', label: 'Account', icon: User },
  { key: 'security', label: 'Security', icon: Lock },
  { key: 'preferences', label: 'Job preferences', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'danger', label: 'Delete account', icon: AlertTriangle },
];

/* ============================== TAB PANELS ============================== */

function AccountTab({ user, profile, loadingProfile, onProfileUpdate }) {
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [pendingOtpField, setPendingOtpField] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState('');
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [savedField, setSavedField] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loadingProfile && profile) {
      setEmailDraft(profile.email || '');
      setPhoneDraft(profile.phone || '');
      setSavedField('');
      setStatusMessage('');
      setError('');
      setPendingOtpField('');
      setOtpCode('');
    }
  }, [loadingProfile, profile]);

  async function sendOtp(field) {
    setError('');
    setStatusMessage('');
    setSendingOtp(field);
    setSavedField('');
    setOtpCode('');

    try {
      const payload = field === 'email' ? { email: emailDraft } : { phone: phoneDraft };
      const endpoint = field === 'email' ? '/candidate/me/email/send' : '/candidate/me/phone/send';
      const res = await axiosInstance.post(endpoint, payload);
      setPendingOtpField(field);
      setStatusMessage(res.data?.message || 'Verification code sent.');
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to send verification code.');
    } finally {
      setSendingOtp('');
    }
  }

  async function confirmOtp(field) {
    setError('');
    setStatusMessage('');
    setConfirmingOtp(true);

    try {
      const payload = field === 'email' ? { email: emailDraft, code: otpCode } : { phone: phoneDraft, code: otpCode };
      const endpoint = field === 'email' ? '/candidate/me/email/confirm' : '/candidate/me/phone/confirm';
      const res = await axiosInstance.post(endpoint, payload);
      if (typeof onProfileUpdate === 'function') {
        onProfileUpdate(res.data);
      }
      setSavedField(field);
      setPendingOtpField('');
      setOtpCode('');
      setStatusMessage(`${field === 'email' ? 'Email' : 'Phone number'} verified successfully.`);
      if (field === 'email') setEditingEmail(false);
      if (field === 'phone') setEditingPhone(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed.');
    } finally {
      setConfirmingOtp(false);
    }
  }

  function cancelEdit(field) {
    setError('');
    setStatusMessage('');
    setPendingOtpField('');
    setOtpCode('');
    if (field === 'email') {
      setEmailDraft(profile?.email || '');
      setEditingEmail(false);
    }
    if (field === 'phone') {
      setPhoneDraft(profile?.phone || '');
      setEditingPhone(false);
    }
  }

  return (
    <SettingsCard icon={User} title="Account Setting" description="Change Your account Email and Phone Number">
      <div className="space-y-3">
        <FieldRow
          label="Email address"
          value={profile?.email || user?.email || 'you@example.com'}
          verified={profile?.emailVerified ?? true}
          editing={editingEmail}
          onEdit={() => {
            setEditingEmail(true);
            setEmailDraft('');
            setPendingOtpField('');
            setStatusMessage('');
            setError('');
          }}
        >
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => sendOtp('email')}
                  disabled={sendingOtp === 'email'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B1E2F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {sendingOtp === 'email' && <Loader2 size={13} className="animate-spin" />} Send verification code
                </button>
                <button
                  type="button"
                  onClick={() => cancelEdit('email')}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-500 hover:border-stone-300"
                >
                  Cancel
                </button>
              </div>
            </div>
            {pendingOtpField === 'email' && (
              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-[#FCFAF8] p-4">
                <label className="block">
                  <span className="text-[13px] font-semibold text-stone-700">Enter verification code</span>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => confirmOtp('email')}
                    disabled={confirmingOtp || !otpCode}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B1E2F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {confirmingOtp && <Loader2 size={13} className="animate-spin" />} Confirm email
                  </button>
                  <button
                    type="button"
                    onClick={() => sendOtp('email')}
                    disabled={sendingOtp === 'email'}
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-500 hover:border-stone-300"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            )}
            {savedField === 'email' && (
              <p className="mt-3 text-sm font-medium text-emerald-700">Email verified and updated successfully.</p>
            )}
          </div>
        </FieldRow>

        <FieldRow
          label="Phone number"
          value={profile?.phone || user?.phone || '+91 00000 00000'}
          verified={profile?.phoneVerified ?? true}
          editing={editingPhone}
          onEdit={() => {
            setEditingPhone(true);
            setPhoneDraft('');
            setPendingOtpField('');
            setStatusMessage('');
            setError('');
          }}
        >
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="tel"
                value={phoneDraft}
                onChange={(e) => setPhoneDraft(e.target.value)}
                className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => sendOtp('phone')}
                  disabled={sendingOtp === 'phone'}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B1E2F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {sendingOtp === 'phone' && <Loader2 size={13} className="animate-spin" />} Send verification code
                </button>
                <button
                  type="button"
                  onClick={() => cancelEdit('phone')}
                  className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-500 hover:border-stone-300"
                >
                  Cancel
                </button>
              </div>
            </div>
            {pendingOtpField === 'phone' && (
              <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-[#FCFAF8] p-4">
                <label className="block">
                  <span className="text-[13px] font-semibold text-stone-700">Enter verification code</span>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
                  />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => confirmOtp('phone')}
                    disabled={confirmingOtp || !otpCode}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#8B1E2F] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {confirmingOtp && <Loader2 size={13} className="animate-spin" />} Confirm phone
                  </button>
                  <button
                    type="button"
                    onClick={() => sendOtp('phone')}
                    disabled={sendingOtp === 'phone'}
                    className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-500 hover:border-stone-300"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            )}
            {savedField === 'phone' && (
              <p className="mt-3 text-sm font-medium text-emerald-700">Phone number verified and updated successfully.</p>
            )}
          </div>
        </FieldRow>

        {(error || statusMessage) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              error
                ? 'border-[#F5C2C7] bg-[#FFF0F0] text-[#B3261E]'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {error || statusMessage}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

function SecurityTab({ profile, loadingProfile, onProfileUpdate }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [twoFactor, setTwoFactor] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securityMessage, setSecurityMessage] = useState('');

  useEffect(() => {
    if (!loadingProfile && profile) {
      setTwoFactor(profile.twoFactorEnabled ?? false);
      setSecuritySaved(false);
      setSecurityError('');
      setSecurityMessage('');
    }
  }, [loadingProfile, profile]);

  async function saveSecurity() {
    setSecurityError('');
    setSecurityMessage('');
    setSecuritySaving(true);
    setSecuritySaved(false);
    try {
      const res = await axiosInstance.put('/candidate/me/security', { twoFactorEnabled: twoFactor });
      if (typeof onProfileUpdate === 'function') {
        onProfileUpdate(res.data);
      }
      setSecuritySaved(true);
      setSecurityMessage('Security settings saved successfully.');
    } catch (err) {
      setSecurityError(err.response?.data?.error || 'Unable to save security settings.');
    } finally {
      setSecuritySaving(false);
    }
  }

  async function changePassword() {
    setError('');
    if (!current || !next) {
      setError('Fill in your current and new password.');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setPasswordSaving(true);
    setSaved(false);
    try {
      await axiosInstance.post('/candidate/me/change-password', { currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setSaved(true);
      setShowPasswordForm(false);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not update your password. Please try again.');
    } finally {
      setPasswordSaving(false);
    }
  }

  function openPasswordForm() {
    setError('');
    setShowPasswordForm(true);
  }

  function closePasswordForm() {
    setShowPasswordForm(false);
    setError('');
    setCurrent('');
    setNext('');
    setConfirm('');
    setSaved(false);
  }

  return (
    <>
      <div className="space-y-6">
        <SettingsCard icon={Lock} title=" Change Password" description="Use at least 8 characters with a mix of letters, numbers, and special character.">
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
                 Change your password every month to keep your account more secure.
            </p>
            <button
              type="button"
              onClick={openPasswordForm}
              className="inline-flex items-center justify-center rounded-xl bg-[#8B1E2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6F1726]"
            >
              Change password
            </button>
            {saved && !showPasswordForm && (
              <p className="text-sm font-medium text-emerald-700">Your password was updated successfully.</p>
            )}
          </div>
        </SettingsCard>

      </div>

      {showPasswordForm && (
        <ModalPortal onClose={closePasswordForm}>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-[2px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closePasswordForm();
            }}
          >
          <div className="w-full max-w-2xl rounded-[28px] border border-stone-200 bg-white p-6 shadow-2xl animate-modal-open">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Change password</h2>
                <p className="mt-2 text-sm text-stone-600">
                  Enter your current password and choose a new one to keep your account secure.
                </p>
              </div>
              <button
                type="button"
                onClick={closePasswordForm}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                aria-label="Close password form"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-[13px] font-semibold text-stone-700">Current password</span>
                <input
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-stone-700">New password</span>
                <input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
                />
                <PasswordStrengthBar password={next} />
              </label>
              <label className="block">
                <span className="text-[13px] font-semibold text-stone-700">Confirm new password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
                />
              </label>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-[#E9B6AF] bg-[#FFF0EE] px-4 py-3 text-sm text-[#B3261E]">{error}</div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-stone-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={changePassword}
                disabled={passwordSaving}
                className="inline-flex items-center justify-center rounded-xl bg-[#8B1E2F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6F1726] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordSaving ? 'Saving…' : 'Update password'}
              </button>
              {saved && !passwordSaving && (
                <span className="text-sm font-medium text-emerald-700">Password updated successfully.</span>
              )}
            </div>
          </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}

const NOTICE_LABELS = {
  '0': 'Immediately available',
  '15': '15 days',
  '30': '30 days',
  '60': '60 days',
  '90': '90 days',
};

const ALERT_FREQUENCY_OPTIONS = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'off', label: 'Off' },
];

function PreferencesTab({ profile, loadingProfile, onProfileUpdate }) {
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState([]);
  const [skills, setSkills] = useState([]);
  const [locations, setLocations] = useState([]);
  const [minSalary, setMinSalary] = useState('');
  const [maxSalary, setMaxSalary] = useState('');
  const [notice, setNotice] = useState('30');
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function loadFromProfile(p) {
    setRoles(p?.profile?.preferredRoles || []);
    setLocations(p?.profile?.preferredLocations || []);
    setSkills(p?.profile?.preferredSkills || []);
    setMinSalary(p?.profile?.preferredMinSalary ?? '');
    setMaxSalary(p?.profile?.preferredMaxSalary ?? '');
    setNotice(p?.profile?.preferredNoticePeriod ?? '30');
    setAlertFrequency(p?.profile?.alertFrequency || 'daily');
  }

  useEffect(() => {
    if (!loadingProfile && profile) {
      loadFromProfile(profile);
      setSaved(false);
      setError('');
    }
  }, [loadingProfile, profile]);

  async function save() {
    setSaving(true);
    setError('');
    try {
      const res = await axiosInstance.put('/candidate/me/preferences', {
        preferredRoles: roles,
        preferredLocations: locations,
        preferredSkills: skills,
        minSalary,
        maxSalary,
        noticePeriod: notice,
        alertFrequency,
      });
      if (typeof onProfileUpdate === 'function' && res?.data) {
        onProfileUpdate(res.data);
      }
      setSaved(true);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to save job preferences.');
    } finally {
      setSaving(false);
    }
  }

  function startEditing() {
    setError('');
    setSaved(false);
    setEditing(true);
  }

  function cancelEditing() {
    loadFromProfile(profile);
    setError('');
    setEditing(false);
  }

  if (loadingProfile) {
    return (
      <SettingsCard icon={Briefcase} title="Job preferences" description="Your preferences help personalize job matches and determine the frequency of job alerts.">
        <p className="rounded-xl border border-stone-200 px-4 py-6 text-center text-sm text-stone-500">Loading your preferences…</p>
      </SettingsCard>
    );
  }

  const salaryText =
    minSalary || maxSalary
      ? `₹${minSalary || '0'} – ₹${maxSalary || '0'} LPA`
      : 'Not set yet.';
  const noticeText = NOTICE_LABELS[String(notice)] || `${notice} days`;
  const alertText = ALERT_FREQUENCY_OPTIONS.find((o) => o.value === alertFrequency)?.label || alertFrequency;

  return (
    <SettingsCard
      icon={Briefcase}
      title="Job preferences"
      description="Your preferences help personalize job matches and determine the frequency of job alerts."
      action={
        !editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-stone-600 transition-colors hover:border-[#8B1E2F]/30 hover:text-[#8B1E2F]"
          >
            <Pencil size={13} /> Edit
          </button>
        )
      }
    >
      {!editing ? (
        <div className="space-y-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">Preferred roles</p>
            <div className="mt-2"><StaticTagList values={roles} /></div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">Preferred locations</p>
            <div className="mt-2"><StaticTagList values={locations} /></div>
          </div>

          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">Skills</p>
            <div className="mt-2"><StaticTagList values={skills} /></div>
          </div>

          <div className="grid gap-4 border-t border-stone-100 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">Expected salary</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{salaryText}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">Notice period</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{noticeText}</p>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">Job alert frequency</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{alertText}</p>
          </div>

          {saved && (
            <p className="text-sm font-medium text-emerald-700">Your job preferences were saved successfully.</p>
          )}
        </div>
      ) : (
        <div>
          <div>
            <p className="text-sm font-semibold text-stone-900">Preferred roles</p>
            <div className="mt-2">
              <ChipInput
                values={roles}
                onAdd={(v) => setRoles((r) => [...r, v])}
                onRemove={(v) => setRoles((r) => r.filter((x) => x !== v))}
                placeholder="e.g. Backend Developer"
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-stone-900">Preferred locations</p>
            <div className="mt-2">
              <ChipInput
                values={locations}
                onAdd={(v) => setLocations((l) => [...l, v])}
                onRemove={(v) => setLocations((l) => l.filter((x) => x !== v))}
                placeholder="e.g. Hyderabad or Remote"
              />
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-stone-900">Skills</p>
            <p className="mt-1 text-sm text-stone-500">Add skills you want recruiters to consider for suggested jobs.</p>
            <div className="mt-2">
              <ChipInput
                values={skills}
                onAdd={(v) => setSkills((s) => [...s, v])}
                onRemove={(v) => setSkills((s) => s.filter((x) => x !== v))}
                placeholder="e.g. React, GraphQL, Figma"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-semibold text-stone-700">Expected salary — min (₹ LPA)</span>
              <input
                type="number"
                min="0"
                value={minSalary}
                onChange={(e) => setMinSalary(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-stone-700">Expected salary — max (₹ LPA)</span>
              <input
                type="number"
                min="0"
                value={maxSalary}
                onChange={(e) => setMaxSalary(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
              />
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-stone-700">Notice period</span>
              <select
                value={notice}
                onChange={(e) => setNotice(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-[#8B1E2F] focus:outline-none focus:ring-2 focus:ring-[#8B1E2F]/10"
              >
                <option value="0">Immediately available</option>
                <option value="15">15 days</option>
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
              </select>
            </label>
          </div>

          <div className="mt-6 border-t border-stone-100 pt-5">
            <p className="text-sm font-semibold text-stone-900">Job alert frequency</p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ALERT_FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAlertFrequency(opt.value)}
                  className="rounded-full px-4 py-2 text-[13px] font-semibold transition"
                  style={
                    alertFrequency === opt.value
                      ? { background: MAROON, color: '#fff' }
                      : { background: '#F5F1ED', color: '#6B6259' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-[#E9B6AF] bg-[#FFF0EE] px-4 py-3 text-sm text-[#B3261E]">{error}</div>
          )}

          <SaveBar saving={saving} saved={false} onSave={save} onCancel={cancelEditing} />
        </div>
      )}
    </SettingsCard>
  );
}

function DocumentsTab({ profile, loadingProfile, onProfileUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const resumeUrl = profile?.profile?.resumeUrl || '';
  const resumeName = resumeUrl ? decodeURIComponent(resumeUrl.split('/').pop()?.split('?')[0] || 'Resume.pdf') : '';

  async function handleResumeUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStatusMessage('');
    setError('');

    if (file.type !== 'application/pdf') {
      setError('Resume must be a PDF file.');
      event.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Resume must be less than 10MB.');
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setUploadProgress(0);

    try {
      const { data } = await axiosInstance.post('/profile/resume', formData, {
        onUploadProgress: (event) => {
          if (event.total) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      });
      const updatedCandidate = data.candidate || data;
      if (typeof onProfileUpdate === 'function') {
        onProfileUpdate(updatedCandidate);
      }
      setStatusMessage('Resume uploaded successfully.');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to upload resume.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      event.target.value = '';
    }
  }

  return (
    <SettingsCard icon={FileText} title="Resumes" description="Upload your latest resume PDF so recruiters can see your profile and apply you for jobs.">
      <div className="space-y-4">
        {loadingProfile ? (
          <p className="rounded-xl border border-stone-200 px-4 py-6 text-center text-sm text-stone-500">Loading resume details...</p>
        ) : resumeUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-100 bg-[#FCFAF8] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#F8ECE9] p-3 text-[#8B1E2F]">
                <FileText size={18} />
              </div>
              <div>
                <p className="font-semibold text-stone-900">{resumeName}</p>
                <p className="text-sm text-stone-500">Uploaded resume on your profile</p>
              </div>
            </div>
            <a
              href={resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-[13px] font-semibold text-stone-700 transition hover:bg-stone-50"
            >
              <Download size={14} /> Download
            </a>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
            No resume uploaded yet.
          </p>
        )}

        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-stone-200 px-4 py-5 text-sm font-semibold text-stone-500 transition-colors hover:border-[#8B1E2F]/30 hover:bg-[#FFFBF9] hover:text-[#8B1E2F]">
          <Plus size={16} /> {resumeUrl ? 'Replace resume (PDF, max 10MB)' : 'Upload a new resume (PDF, max 10MB)'}
          <input type="file" accept="application/pdf" className="hidden" onChange={handleResumeUpload} />
        </label>

        {uploading && (
          <div className="rounded-xl border border-stone-200 bg-[#FCFAF8] px-4 py-3 text-sm text-stone-700">
            Uploading… {uploadProgress}%
          </div>
        )}
        {statusMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-[#E9B6AF] bg-[#FFF0EE] px-4 py-3 text-sm text-[#B3261E]">
            {error}
          </div>
        )}
      </div>
    </SettingsCard>
  );
}

const DELETE_REASONS = [
  "I found a job and don't need this anymore",
  'I get too many emails or notifications',
  "I'm not finding relevant job matches",
  'I have privacy or data concerns',
  'The platform is difficult to use',
  'I created a duplicate account by mistake',
  'I no longer want recruiters to contact me',
  "I'm not satisfied with the response from recruiters",
  'I found a better job portal',
  'Other',
];

function StepProgress({ activeIndex, steps }) {
  return (
    <div className="mt-4 flex items-center gap-1.5" role="presentation">
      {steps.map((_, i) => (
        <span
          key={i}
          className="h-1 flex-1 rounded-full transition-colors duration-200"
          style={{ background: i <= activeIndex ? '#B3261E' : '#EFEAE6' }}
        />
      ))}
    </div>
  );
}

function DangerTab({ onDelete, deleting, error, onClearError, accountEmail }) {
  const [step, setStep] = useState('closed'); // 'closed' | 'reason' | 'password'
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);

  const STEP_ORDER = ['reason', 'password'];
  const stepIndex = STEP_ORDER.indexOf(step);

  function openFlow() {
    setStep('reason');
    setReason('');
    setPassword('');
    setConfirmChecked(false);
    if (typeof onClearError === 'function') onClearError();
  }

  function closeFlow() {
    setStep('closed');
    setReason('');
    setPassword('');
    setConfirmChecked(false);
    if (typeof onClearError === 'function') onClearError();
  }

  function goToPassword() {
    if (!reason) return;
    setStep('password');
  }

  async function confirmDelete() {
    if (!password || !confirmChecked) return;
    const ok = await onDelete({ reason, password });
    if (ok) {
      closeFlow();
    }
  }

  return (
    <SettingsCard
      icon={AlertTriangle}
      title="Delete account"
      description="Deleting your account will remove your profile and all applications you have submitted. This action is permanent."
      tone="danger"
    >
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[#F3D9D5] bg-[#FFFAF9] px-5 py-4">
        <p className="text-[13px] leading-5 text-stone-600">
          This cannot be undone. Consider downloading your resumes first.
        </p>
        <button
          type="button"
          onClick={openFlow}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#B3261E] px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#941F18]"
        >
          Delete my account
        </button>
      </div>

      {step !== 'closed' && (
        <ModalPortal onClose={closeFlow}>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-[2px]"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeFlow();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-account-modal-title"
              className="w-full max-w-lg rounded-[24px] border border-stone-200 bg-white p-6 shadow-2xl animate-modal-open sm:p-7"
              style={{ fontFamily: FONT_BODY }}
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FEF3F2] text-[#B3261E]">
                  <AlertTriangle size={20} strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-[#B3261E]">
                      Step {stepIndex + 1} of {STEP_ORDER.length}
                    </p>
                    <button
                      type="button"
                      onClick={closeFlow}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                      aria-label="Close"
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <h2 id="delete-account-modal-title" className="mt-0.5 text-lg font-bold tracking-[-0.01em] text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                    {step === 'reason' ? "We're sorry to see you go" : 'Confirm your identity'}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-5 text-stone-500">
                    {step === 'reason'
                      ? 'Help us improve by letting us know why you want to leave. This takes one click.'
                      : 'For your security, enter your password to permanently delete your account.'}
                  </p>
                </div>
              </div>

              <StepProgress activeIndex={stepIndex} steps={STEP_ORDER} />

              {step === 'reason' && (
                <div className="mt-6">
                  <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
                    {DELETE_REASONS.map((r) => (
                      <RadioCard
                        key={r}
                        name="delete-reason"
                        value={r}
                        checked={reason === r}
                        onChange={setReason}
                        title={r}
                      />
                    ))}
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-5">
                    <button
                      type="button"
                      onClick={closeFlow}
                      className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-500 transition-colors hover:border-stone-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={goToPassword}
                      disabled={!reason}
                      className="inline-flex items-center justify-center rounded-xl bg-[#B3261E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#941F18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 'password' && (
                <div className="mt-6">
                  <div className="rounded-xl border border-stone-100 bg-[#FCFAF8] px-4 py-3.5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.09em] text-stone-400">
                      Reason for leaving
                    </p>
                    <p className="mt-1 text-sm font-semibold text-stone-800">{reason}</p>
                  </div>

                  {accountEmail && (
                    <p className="mt-4 text-[13px] leading-5 text-stone-500">
                      You're about to permanently delete the account for{' '}
                      <span className="font-semibold text-stone-700">{accountEmail}</span>.
                    </p>
                  )}

                  <label className="mt-4 block">
                    <span className="text-[13px] font-semibold text-stone-700">Password</span>
                    <div className="relative mt-1.5">
                      <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                        placeholder="Enter your current password"
                        className="w-full rounded-xl border border-stone-200 py-2.5 pl-10 pr-3.5 text-sm text-stone-900 focus:border-[#B3261E] focus:outline-none focus:ring-2 focus:ring-[#B3261E]/10"
                      />
                    </div>
                  </label>

                  <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-stone-200 bg-[#FCFAF8] px-4 py-3.5 transition-colors hover:border-stone-300">
                    <input
                      type="checkbox"
                      checked={confirmChecked}
                      onChange={(e) => setConfirmChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 text-[#B3261E] focus:ring-2 focus:ring-[#B3261E]/20"
                    />
                    <span className="text-[13px] leading-5 text-stone-600">
                      I understand this action is <span className="font-semibold text-stone-800">permanent</span> and
                      cannot be undone.
                    </span>
                  </label>

                  {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-4 py-3 text-sm text-[#B3261E]">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-5">
                    <button
                      type="button"
                      onClick={() => setStep('reason')}
                      disabled={deleting}
                      className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-500 transition-colors hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={confirmDelete}
                      disabled={deleting || !password || !confirmChecked}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#B3261E] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#941F18] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleting && <Loader2 size={14} className="animate-spin" />}
                      {deleting ? 'Deleting…' : 'Permanently delete account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </SettingsCard>
  );
}

/* ============================== MAIN PAGE ============================== */

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('account');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      setLoadingProfile(true);
      setProfileError('');
      try {
        const res = await axiosInstance.get('/candidate/me/profile');
        if (mounted) setProfile(res.data);
      } catch (err) {
        if (mounted) setProfileError(err.response?.data?.error || 'Unable to load profile data.');
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  async function deleteAccount({ reason, password }) {
    setDeletingAccount(true);
    setMessage('');
    try {
      await axiosInstance.delete('/candidate/me', { data: { reason, password } });
      logout({ redirect: true });
      return true;
    } catch (err) {
      console.error('Failed to delete account:', err);
      setMessage(err.response?.data?.error || 'Failed to delete account. Please try again.');
      return false;
    } finally {
      setDeletingAccount(false);
    }
  }

  const initials = (
    profile?.name || profile?.email || user?.name || user?.email || 'U'
  )
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  return (
    <div className="portal-theme min-h-[100dvh] w-full overflow-x-clip" style={{ background: PAGE_BG, fontFamily: FONT_BODY }}>
      <style>{`
        @keyframes panel-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes modal-open {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-panel-in { animation: panel-in 0.32s ${EASE} both; }
        .animate-modal-open { animation: modal-open 1.00s ${EASE} both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-panel-in,
          .animate-modal-open { animation: none; }
        }
      `}</style>
      <CandidateNavbar />
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        {/* Header with account summary */}
        <div className="mb-7 flex flex-col gap-5 border-b border-stone-200/70 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: MAROON }}>
              Account
            </p>
            <h1 className="mt-1 text-[26px] font-bold leading-tight tracking-[-0.015em] text-stone-900 sm:text-[28px]" style={{ fontFamily: FONT_DISPLAY }}>
              Settings
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-stone-500">
              Manage your account, security, notifications, and job preferences.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-stone-200/70 bg-white px-4 py-3" style={{ boxShadow: RAIL_SHADOW }}>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${MAROON}, ${MAROON_DEEP})` }}
            >
              {initials || <User size={16} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-900">{profile?.name || user?.name || 'Your profile'}</p>
              <p className="truncate text-[12px] text-stone-500">{profile?.email || user?.email || 'you@example.com'}</p>
            </div>
          </div>
        </div>

        {/* Mobile: horizontal scrollable tab pills */}
        <div className="mb-5 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden" style={{ scrollbarWidth: 'none' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            const isDanger = tab.key === 'danger';
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-colors duration-150 ${
                  isActive
                    ? isDanger
                      ? 'bg-[#FEF3F2] text-[#B3261E]'
                      : ''
                    : 'border border-stone-200 bg-white text-stone-500'
                }`}
                style={isActive && !isDanger ? { background: MAROON_TINT, color: MAROON_DEEP } : undefined}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="lg:grid lg:grid-cols-[232px_1fr] lg:items-start lg:gap-8">
          {/* Desktop: sticky left rail with left-edge active indicator */}
          <nav
            className="sticky top-[92px] hidden rounded-xl border border-stone-200/70 bg-white p-1.5 lg:block"
            style={{ boxShadow: RAIL_SHADOW }}
            aria-label="Settings sections"
          >
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              const isDanger = tab.key === 'danger';
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-3.5 pr-3 text-left text-[13px] font-semibold transition-colors duration-150 ${
                    isActive
                      ? isDanger
                        ? 'text-[#B3261E]'
                        : 'text-[#5C1420]'
                      : isDanger
                        ? 'text-[#B3261E]/70 hover:bg-[#FEF3F2]'
                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  } ${isDanger && i === TABS.length - 1 ? 'mt-1.5 border-t border-stone-100 pt-4' : ''}`}
                  style={isActive ? { background: isDanger ? '#FEF3F2' : MAROON_TINT } : undefined}
                >
                  {isActive && (
                    <span
                      className="absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-full"
                      style={{ background: isDanger ? '#B3261E' : MAROON }}
                    />
                  )}
                  <Icon size={16} className="shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div key={activeTab} className="min-w-0">
            {activeTab === 'account' && (
              <AccountTab
                user={user}
                profile={profile}
                loadingProfile={loadingProfile}
                onProfileUpdate={setProfile}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab
                profile={profile}
                loadingProfile={loadingProfile}
                onProfileUpdate={setProfile}
              />
            )}
            {activeTab === 'preferences' && (
              <PreferencesTab profile={profile} loadingProfile={loadingProfile} onProfileUpdate={setProfile} />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab
                profile={profile}
                loadingProfile={loadingProfile}
                onProfileUpdate={setProfile}
              />
            )}
            {activeTab === 'danger' && (
              <DangerTab
                onDelete={deleteAccount}
                deleting={deletingAccount}
                error={message}
                onClearError={() => setMessage('')}
                accountEmail={profile?.email || user?.email}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}