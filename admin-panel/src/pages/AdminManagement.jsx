import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  KeyRound,
  Power,
  RefreshCcw,
  Search,
  ShieldCheck,
  UserPlus,
  Wand2,
  X,
  XCircle,
} from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';
import { useAdminAuth } from '../context/AdminAuthContext';

/* ==========================================================================
   Validation & password helpers
   ========================================================================== */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateAdminForm({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Enter a full name';
  if (!EMAIL_PATTERN.test(email)) errors.email = 'Enter a valid email address';
  if (password.length < 12) errors.password = 'Use at least 12 characters';
  else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) errors.password = 'Mix in an uppercase letter and a number';
  return errors;
}

function passwordStrength(password) {
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: 'Weak', level: 1 };
  if (score <= 3) return { label: 'Okay', level: 2 };
  return { label: 'Strong', level: 3 };
}

function generatePassword(length = 16) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const values = globalThis.crypto.getRandomValues(new Uint32Array(length));
  let result = '';
  for (let i = 0; i < length; i += 1) result += charset[values[i] % charset.length];
  return result;
}

/* ==========================================================================
   Small utility hooks
   ========================================================================== */

// Delays reacting to a fast-changing value (typing) so we don't fire a
// network request on every keystroke.
function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function formatDateTime(value) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—';
}

/* ==========================================================================
   Toasts
   ========================================================================== */

const ToastContext = createContext(null);
let toastId = 0;

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, text) => {
      const id = (toastId += 1);
      setToasts((current) => [...current, { id, type, text }]);
      timers.current.set(id, setTimeout(() => dismiss(id), 4000));
    },
    [dismiss],
  );

  const success = useCallback((text) => push('success', text), [push]);
  const error = useCallback((text) => push('error', text), [push]);
  const value = useMemo(() => ({ success, error }), [success, error]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" role="status" className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 border px-3 py-2.5 text-sm shadow-sm ${
              toast.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {toast.type === 'error' ? <XCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
            <p className="flex-1">{toast.text}</p>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="shrink-0 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

/* ==========================================================================
   Data hook — admin list, create, update, reset password
   ========================================================================== */

function useAdmins({ onError, onSuccess }) {
  const [admins, setAdmins] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [mutatingIds, setMutatingIds] = useState(() => new Set());

  const fetchAdmins = useCallback(
    async (params = {}) => {
      setLoading(true);
      try {
        const { data } = await adminAxiosInstance.get('/admins', { params });
        setAdmins(data.items || data);
        setMeta({ total: data.total || 0, page: data.page || 1, pageSize: data.pageSize || 10, totalPages: data.totalPages || 1 });
      } catch (error) {
        onError(error.response?.data?.error || 'Unable to load admins');
      } finally {
        setLoading(false);
      }
    },
    [onError],
  );

  const createAdmin = useCallback(
    async (payload) => {
      try {
        const { data } = await adminAxiosInstance.post('/admins', payload);
        setAdmins((current) => [data, ...current]);
        onSuccess(data.emailSent ? 'Admin created and temporary password emailed' : 'Admin created, but the email could not be sent');
        return { ok: true, emailSent: data.emailSent };
      } catch (error) {
        const message = error.response?.data?.error || 'Unable to create admin';
        onError(message);
        return { ok: false, error: message };
      }
    },
    [onError, onSuccess],
  );

  const updateAdmin = useCallback(
    async (id, patch) => {
      const previousAdmin = admins.find((admin) => admin._id === id);
      setAdmins((current) => current.map((admin) => (admin._id === id ? { ...admin, ...patch } : admin)));
      setMutatingIds((current) => new Set(current).add(id));
      try {
        const { data } = await adminAxiosInstance.patch(`/admins/${id}`, patch);
        setAdmins((current) => current.map((admin) => (admin._id === id ? data : admin)));
        onSuccess('Admin account updated');
      } catch (error) {
        if (previousAdmin) setAdmins((current) => current.map((admin) => (admin._id === id ? previousAdmin : admin)));
        onError(error.response?.data?.error || 'Unable to update admin');
      } finally {
        setMutatingIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    },
    [admins, onError, onSuccess],
  );

  const resetPassword = useCallback(
    async (id) => {
      try {
        await adminAxiosInstance.post(`/admins/${id}/reset-password`);
        onSuccess('Temporary password sent to the admin email');
      } catch (error) {
        onError(error.response?.data?.error || 'Unable to reset password');
      }
    },
    [onError, onSuccess],
  );

  return { admins, meta, loading, mutatingIds, fetchAdmins, createAdmin, updateAdmin, resetPassword };
}

/* ==========================================================================
   Confirm dialog
   ========================================================================== */

function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', tone = 'default', onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    confirmRef.current?.focus();
    function handleKeyDown(event) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-sm border border-[#EBC2AE] bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone === 'danger' ? 'bg-red-50 text-red-600' : 'bg-[#FFF0E8] text-[#C75560]'}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="text-sm font-semibold text-[#1D181A]">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-1 text-xs text-[#80576A]">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="border border-[#EBC2AE] px-3 py-1.5 text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]">
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-semibold text-white ${tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#C75560] hover:bg-[#b6454f]'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Password field — create form
   ========================================================================== */

function PasswordField({ value, onChange, error }) {
  const [visible, setVisible] = useState(false);
  const strength = value ? passwordStrength(value) : null;

  return (
    <label className="block text-xs font-semibold text-[#80576A]">
      Temporary password
      <div className="relative mt-1">
        <input
          required
          autoComplete="new-password"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full border bg-white px-3 py-2 pr-16 text-sm font-normal text-[#1D181A] outline-none focus:border-[#C75560] ${error ? 'border-red-300' : 'border-[#EBC2AE]'}`}
        />
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 gap-1">
          <button type="button" onClick={() => onChange(generatePassword())} aria-label="Generate a password" className="p-1.5 text-[#80576A] hover:text-[#C75560]">
            <Wand2 size={14} />
          </button>
          <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'} className="p-1.5 text-[#80576A] hover:text-[#C75560]">
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-1 text-[11px] font-normal text-red-600">{error}</p>
      ) : strength ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="flex h-1 flex-1 gap-1">
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={`h-full flex-1 rounded-full ${
                  strength.level >= step ? (strength.level === 1 ? 'bg-red-400' : strength.level === 2 ? 'bg-amber-400' : 'bg-emerald-500') : 'bg-[#F3DED2]'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] font-normal text-[#80576A]">{strength.label}</span>
        </div>
      ) : (
        <p className="mt-1 text-[11px] font-normal text-[#80576A]">At least 12 characters, mixing case and numbers.</p>
      )}
    </label>
  );
}

/* ==========================================================================
   Create admin form
   ========================================================================== */

const EMPTY_FORM = { name: '', email: '', password: '', role: 'admin' };

function AdminForm({ onCreate }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validateAdminForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setSaving(true);
    const result = await onCreate(form);
    setSaving(false);
    if (result?.ok) setForm(EMPTY_FORM);
  }

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="off" className="h-fit space-y-3 border border-[#EBC2AE] bg-[#FFFDFB] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#1D181A]">
        <UserPlus size={16} className="text-[#C75560]" /> Create admin
      </div>

      <label className="block text-xs font-semibold text-[#80576A]">
        Full name
        <input
          autoComplete="off"
          value={form.name}
          onChange={(event) => setField('name', event.target.value)}
          className={`mt-1 w-full border bg-white px-3 py-2 text-sm font-normal text-[#1D181A] outline-none focus:border-[#C75560] ${errors.name ? 'border-red-300' : 'border-[#EBC2AE]'}`}
        />
        {errors.name && <p className="mt-1 text-[11px] font-normal text-red-600">{errors.name}</p>}
      </label>

      <label className="block text-xs font-semibold text-[#80576A]">
        Email address
        <input
          type="email"
          autoComplete="new-username"
          value={form.email}
          onChange={(event) => setField('email', event.target.value)}
          className={`mt-1 w-full border bg-white px-3 py-2 text-sm font-normal text-[#1D181A] outline-none focus:border-[#C75560] ${errors.email ? 'border-red-300' : 'border-[#EBC2AE]'}`}
        />
        {errors.email && <p className="mt-1 text-[11px] font-normal text-red-600">{errors.email}</p>}
      </label>

      <PasswordField value={form.password} onChange={(value) => setField('password', value)} error={errors.password} />

      <label className="block text-xs font-semibold text-[#80576A]">
        Role
        <select
          value={form.role}
          onChange={(event) => setField('role', event.target.value)}
          className="mt-1 w-full border border-[#EBC2AE] bg-white px-3 py-2 text-sm font-normal text-[#1D181A] outline-none focus:border-[#C75560]"
        >
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
      </label>

      <button disabled={saving} className="flex items-center gap-2 bg-[#C75560] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        <ShieldCheck size={15} /> {saving ? 'Creating…' : 'Create account'}
      </button>
    </form>
  );
}

/* ==========================================================================
   Shared table bits: status pill, skeleton, pagination
   ========================================================================== */

function StatusPill({ isActive, isLocked }) {
  const label = isLocked ? 'Locked' : isActive ? 'Active' : 'Inactive';
  const dotColor = isLocked ? 'bg-amber-500' : isActive ? 'bg-emerald-500' : 'bg-red-500';
  const textColor = isLocked ? 'text-amber-700' : isActive ? 'text-emerald-700' : 'text-red-700';
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textColor}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

function TableSkeleton({ columns = 5, rows = 4 }) {
  return (
    <tbody className="divide-y divide-[#F3DED2]">
      {Array.from({ length: rows }).map((_, row) => (
        <tr key={row} className="animate-pulse">
          {Array.from({ length: columns }).map((__, col) => (
            <td key={col} className="px-3 py-3">
              <div className="h-3 w-full max-w-[120px] rounded bg-[#F3DED2]" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function EmptyRow({ colSpan, message }) {
  return (
    <tbody>
      <tr>
        <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-[#80576A]">
          {message}
        </td>
      </tr>
    </tbody>
  );
}

function Pagination({ page, totalPages, total, itemLabel = 'results', onPageChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F3DED2] px-3 py-2.5 text-xs text-[#80576A]">
      <span>
        {total} {itemLabel}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border border-[#EBC2AE] px-2.5 py-1 font-semibold text-[#1D181A] hover:bg-[#FFF0E8] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="border border-[#EBC2AE] px-2.5 py-1 font-semibold text-[#1D181A] hover:bg-[#FFF0E8] disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   Admin list — filters, table, pagination
   ========================================================================== */

const DEFAULT_FILTERS = {
  search: '',
  role: 'all',
  isActive: 'all',
  createdFrom: '',
  createdTo: '',
  loginFrom: '',
  loginTo: '',
  page: 1,
  pageSize: 10,
};

function AdminFilterBar({ filters, onChange }) {
  const [expanded, setExpanded] = useState(false);
  const activeDateFilters = [filters.createdFrom, filters.createdTo, filters.loginFrom, filters.loginTo].filter(Boolean).length;

  function set(key, value) {
    onChange((current) => ({ ...current, [key]: value, page: 1 }));
  }

  return (
    <div className="border-b border-[#F3DED2] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 basis-52">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#80576A]" />
          <input
            value={filters.search}
            onChange={(event) => set('search', event.target.value)}
            placeholder="Search name or email"
            aria-label="Search admins"
            className="w-full border border-[#EBC2AE] bg-white py-1.5 pl-7 pr-2 text-xs text-[#1D181A] outline-none focus:border-[#C75560]"
          />
        </div>

        <select
          value={filters.role}
          onChange={(event) => set('role', event.target.value)}
          aria-label="Filter by role"
          className="border border-[#EBC2AE] bg-white px-2 py-1.5 text-xs font-semibold text-[#1D181A]"
        >
          <option value="all">All roles</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>

        <select
          value={filters.isActive}
          onChange={(event) => set('isActive', event.target.value)}
          aria-label="Filter by status"
          className="border border-[#EBC2AE] bg-white px-2 py-1.5 text-xs font-semibold text-[#1D181A]"
        >
          <option value="all">All status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="ml-auto flex items-center gap-1 border border-[#EBC2AE] px-2.5 py-1.5 text-xs font-semibold text-[#80576A] hover:bg-[#FFF0E8]"
        >
          Date filters{activeDateFilters > 0 ? ` (${activeDateFilters})` : ''}
          <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 grid gap-3 border-t border-[#F3DED2] pt-3 sm:grid-cols-2">
          <fieldset className="space-y-1.5">
            <legend className="text-[10px] font-semibold uppercase tracking-wide text-[#80576A]">Created</legend>
            <div className="flex items-center gap-2">
              <input type="date" value={filters.createdFrom} onChange={(event) => set('createdFrom', event.target.value)} aria-label="Created from" className="w-full border border-[#EBC2AE] px-2 py-1.5 text-xs text-[#1D181A]" />
              <span className="text-[#80576A]">to</span>
              <input type="date" value={filters.createdTo} onChange={(event) => set('createdTo', event.target.value)} aria-label="Created to" className="w-full border border-[#EBC2AE] px-2 py-1.5 text-xs text-[#1D181A]" />
            </div>
          </fieldset>
          <fieldset className="space-y-1.5">
            <legend className="text-[10px] font-semibold uppercase tracking-wide text-[#80576A]">Last login</legend>
            <div className="flex items-center gap-2">
              <input type="date" value={filters.loginFrom} onChange={(event) => set('loginFrom', event.target.value)} aria-label="Last login from" className="w-full border border-[#EBC2AE] px-2 py-1.5 text-xs text-[#1D181A]" />
              <span className="text-[#80576A]">to</span>
              <input type="date" value={filters.loginTo} onChange={(event) => set('loginTo', event.target.value)} aria-label="Last login to" className="w-full border border-[#EBC2AE] px-2 py-1.5 text-xs text-[#1D181A]" />
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
}

function AdminTable({ admins, meta, loading, mutatingIds, onUpdateAdmin, onResetPassword, currentAdminId, filters, setFilters }) {
  const [pendingAction, setPendingAction] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);

  function requestPatch(admin, patch, title, description, tone = 'default') {
    setPendingAction({ admin, patch, title, description, tone });
  }

  function requestRoleChange(admin, role) {
    if (role === admin.role) return;
    requestPatch(
      admin,
      { role },
      `Change ${admin.name}'s role to ${role}?`,
      role === 'superadmin' ? `${admin.name} will gain full access, including managing other admins.` : `${admin.name} will lose superadmin privileges.`,
      role === 'superadmin' ? 'danger' : 'default',
    );
  }

  function requestStatusToggle(admin) {
    requestPatch(
      admin,
      { isActive: !admin.isActive },
      `${admin.isActive ? 'Deactivate' : 'Activate'} ${admin.name}?`,
      admin.isActive ? `${admin.name} will immediately lose access to the admin panel.` : `${admin.name} will regain access to the admin panel.`,
      admin.isActive ? 'danger' : 'default',
    );
  }

  return (
    <div className="overflow-hidden border border-[#EBC2AE] bg-[#FFFDFB]">
      <div className="flex items-center gap-2 border-b border-[#F3DED2] px-4 py-3 text-sm font-semibold text-[#1D181A]">
        <ShieldCheck size={16} className="text-[#C75560]" /> Existing admins
        <span className="text-xs font-normal text-[#80576A]">({meta.total})</span>
      </div>

      <AdminFilterBar filters={filters} onChange={setFilters} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-[10px] uppercase tracking-wide text-[#80576A]">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last login</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>

          {loading ? (
            <TableSkeleton columns={7} />
          ) : admins.length === 0 ? (
            <EmptyRow colSpan={7} message={meta.total === 0 ? 'No admin accounts yet. Create the first one.' : 'No admins match your filters.'} />
          ) : (
            <tbody className="divide-y divide-[#F3DED2]">
              {admins.map((admin) => {
                const isSelf = String(admin._id) === String(currentAdminId);
                const isMutating = mutatingIds.has(admin._id);
                return (
                  <tr key={admin._id} className={isMutating ? 'opacity-60' : undefined}>
                    <td className="px-3 py-3 font-semibold text-[#1D181A]">
                      {admin.name} {isSelf && <span className="ml-1 text-[10px] font-normal text-[#80576A]">(you)</span>}
                    </td>
                    <td className="px-3 py-3 text-[#80576A]">{admin.email}</td>
                    <td className="px-3 py-3">
                      <select
                        value={admin.role}
                        disabled={isSelf || isMutating}
                        onChange={(event) => requestRoleChange(admin, event.target.value)}
                        className="border border-[#EBC2AE] bg-white px-2 py-1 text-xs font-semibold text-[#1D181A] disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill isActive={admin.isActive} isLocked={admin.isLocked} />
                    </td>
                    <td className="px-3 py-3 text-[#80576A]">{formatDateTime(admin.lastLoginAt)}</td>
                    <td className="px-3 py-3 text-[#80576A]">{formatDate(admin.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={isMutating}
                          onClick={() => setResetTarget(admin)}
                          className="inline-flex items-center gap-1 border border-[#EBC2AE] px-2 py-1 text-xs font-semibold text-[#80576A] hover:bg-[#FFF0E8] disabled:opacity-50"
                        >
                          <KeyRound size={12} /> Reset
                        </button>
                        <button
                          type="button"
                          disabled={isSelf || isMutating}
                          onClick={() => requestStatusToggle(admin)}
                          className="inline-flex items-center gap-1 border border-[#EBC2AE] px-2 py-1 text-xs font-semibold text-[#80576A] hover:bg-[#FFF0E8] disabled:opacity-50"
                        >
                          <Power size={12} /> {admin.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} itemLabel="admins" onPageChange={(page) => setFilters((current) => ({ ...current, page }))} />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title}
        description={pendingAction?.description}
        tone={pendingAction?.tone}
        confirmLabel="Confirm"
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          onUpdateAdmin(pendingAction.admin._id, pendingAction.patch);
          setPendingAction(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(resetTarget)}
        title={`Reset ${resetTarget?.name}'s password?`}
        description="A temporary password will be emailed to this admin, and they'll be asked to change it at next sign-in."
        tone="danger"
        confirmLabel="Send temporary password"
        onCancel={() => setResetTarget(null)}
        onConfirm={() => {
          onResetPassword(resetTarget._id);
          setResetTarget(null);
        }}
      />
    </div>
  );
}

/* ==========================================================================
   Activity log
   ========================================================================== */

const DEFAULT_AUDIT_FILTERS = { search: '', action: '', page: 1, pageSize: 20 };

function AuditLogPanel({ toast }) {
  const [filters, setFilters] = useState(DEFAULT_AUDIT_FILTERS);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebouncedValue(filters.search);
  const debouncedAction = useDebouncedValue(filters.action);

  const load = useCallback(
    async (page = filters.page) => {
      setLoading(true);
      try {
        const { data } = await adminAxiosInstance.get('/admin-audit', {
          params: { page, pageSize: filters.pageSize, search: debouncedSearch, action: debouncedAction },
        });
        setLogs(data.items || []);
        setFilters((current) => ({ ...current, page: data.page || page }));
        setMeta(data);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Unable to load activity history');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.pageSize, debouncedSearch, debouncedAction, toast],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedAction]);

  return (
    <div className="overflow-hidden border border-[#EBC2AE] bg-[#FFFDFB]">
      <div className="flex items-center gap-2 border-b border-[#F3DED2] px-4 py-3 text-sm font-semibold text-[#1D181A]">
        <ShieldCheck size={16} className="text-[#C75560]" /> Admin activity history
        <span className="text-xs font-normal text-[#80576A]">({meta.total})</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#F3DED2] p-3">
        <div className="relative flex-1 basis-52">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#80576A]" />
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search action, target, or reason"
            aria-label="Search activity history"
            className="w-full border border-[#EBC2AE] bg-white py-1.5 pl-7 pr-2 text-xs text-[#1D181A] outline-none focus:border-[#C75560]"
          />
        </div>
        <input
          value={filters.action}
          onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
          placeholder="Filter by action type"
          aria-label="Filter by action type"
          className="border border-[#EBC2AE] bg-white px-2 py-1.5 text-xs text-[#1D181A] outline-none focus:border-[#C75560]"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#F3DED2] bg-[#FFF0E8] text-[10px] uppercase tracking-wide text-[#80576A]">
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Details</th>
            </tr>
          </thead>
          {loading ? (
            <TableSkeleton columns={5} />
          ) : logs.length === 0 ? (
            <EmptyRow colSpan={5} message="No activity matches your filters." />
          ) : (
            <tbody className="divide-y divide-[#F3DED2]">
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#80576A]">{formatDateTime(log.createdAt)}</td>
                  <td className="px-3 py-2.5 text-[#1D181A]">{log.admin?.name || 'System'}</td>
                  <td className="px-3 py-2.5 font-semibold text-[#1D181A]">{log.action}</td>
                  <td className="px-3 py-2.5 text-[#80576A]">{log.targetType || '—'}</td>
                  <td className="max-w-[280px] break-words px-3 py-2.5 text-[#80576A]">{log.details ? JSON.stringify(log.details) : '—'}</td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} itemLabel="records" onPageChange={(page) => load(page)} />
    </div>
  );
}

/* ==========================================================================
   Page shell — tabs, header
   ========================================================================== */

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-1 pb-2 text-sm font-semibold transition-colors ${
        active ? 'border-[#C75560] text-[#1D181A]' : 'border-transparent text-[#80576A] hover:text-[#1D181A]'
      }`}
    >
      {children}
    </button>
  );
}

// Pill-style segmented control — visually distinct from the underline
// TabButton above so it reads as a sub-level toggle, not a top-level tab.
function SegmentToggle({ options, value, onChange }) {
  return (
    <div role="tablist" className="inline-flex w-fit border border-[#EBC2AE] bg-white p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === option.value ? 'bg-[#C75560] text-white' : 'text-[#80576A] hover:bg-[#FFF0E8]'
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AdminManagementView() {
  const toast = useToast();
  const { admin } = useAdminAuth();
  const [tab, setTab] = useState('admins');
  const [adminSection, setAdminSection] = useState('control');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const { admins, meta, loading, mutatingIds, fetchAdmins, createAdmin, updateAdmin, resetPassword } = useAdmins({ onError: toast.error, onSuccess: toast.success });

  const debouncedSearch = useDebouncedValue(filters.search);

  const reload = useCallback(
    (page = filters.page) =>
      fetchAdmins({
        ...filters,
        search: debouncedSearch,
        page,
        isActive: filters.isActive === 'all' ? undefined : filters.isActive,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchAdmins, filters.role, filters.isActive, filters.createdFrom, filters.createdTo, filters.loginFrom, filters.loginTo, filters.page, debouncedSearch],
  );

  useEffect(() => {
    reload(filters.page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filters.role, filters.isActive, filters.createdFrom, filters.createdTo, filters.loginFrom, filters.loginTo, filters.page]);

  const handleCreate = useCallback(
    async (payload) => {
      const result = await createAdmin(payload);
      if (result?.ok) {
        setFilters((current) => ({ ...current, page: 1 }));
        setAdminSection('control'); // hop back to the list so the new account is visible right away
      }
      return result;
    },
    [createAdmin],
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#C75560]">Security</p>
          <h1 className="text-xl font-semibold text-[#1D181A]">Admin management</h1>
          <p className="mt-1 text-xs text-[#80576A]">Create administrator accounts, manage roles and access, and review activity history.</p>
        </div>
        <button
          onClick={() => reload(filters.page)}
          className="flex items-center gap-2 border border-[#EBC2AE] px-3 py-2 text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      <div className="flex gap-5 border-b border-[#F3DED2]">
        <TabButton active={tab === 'admins'} onClick={() => setTab('admins')}>
          Admins
        </TabButton>
        <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>
          Activity history
        </TabButton>
      </div>

      {tab === 'admins' ? (
        <div className="space-y-4">
          <SegmentToggle
            value={adminSection}
            onChange={setAdminSection}
            options={[
              { value: 'control', label: 'Admin control', icon: <ShieldCheck size={13} /> },
              { value: 'create', label: 'Create admin', icon: <UserPlus size={13} /> },
            ]}
          />

          {adminSection === 'create' ? (
            <div className="max-w-md">
              <AdminForm onCreate={handleCreate} />
            </div>
          ) : (
            <AdminTable
              admins={admins}
              meta={meta}
              loading={loading}
              mutatingIds={mutatingIds}
              onUpdateAdmin={updateAdmin}
              onResetPassword={resetPassword}
              currentAdminId={admin?.id}
              filters={filters}
              setFilters={setFilters}
            />
          )}
        </div>
      ) : (
        <AuditLogPanel toast={toast} />
      )}
    </div>
  );
}

export default function AdminManagement(props) {
  return (
    <ToastProvider>
      <AdminManagementView {...props} />
    </ToastProvider>
  );
}