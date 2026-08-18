import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  FileText,
  Plus,
  IndianRupee,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  RefreshCw,
  Wallet as WalletIcon,
  Download,
  Smartphone,
  CreditCard,
  Landmark,
} from 'lucide-react';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import axiosInstance from '../../api/axiosInstance';
import { FONT_BODY, FONT_DISPLAY } from '../../theme';

const RESUME_DOWNLOAD_FEE = 9;
const LOW_BALANCE_THRESHOLD = RESUME_DOWNLOAD_FEE;
const PREDEFINED_RECHARGE_AMOUNTS = [50, 100, 200, 500, 1000];

const TRANSACTION_TYPES = {
  RECHARGE: 'recharge',
  RESUME_DOWNLOAD: 'resume_download',
  REFUND: 'refund',
};

const TRANSACTION_STATUS = {
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'netbanking', label: 'Net Banking', icon: Landmark },
];

const PAGE_SIZE = 6;
const REFRESH_INTERVAL_MS = 15000;

async function getWalletSummary() {
  const { data } = await axiosInstance.get('/recruiter/wallet/summary');
  return {
    availableBalance: data.balance,
    totalAdded: data.totalAdded,
    totalSpent: data.totalSpent,
    resumesDownloaded: data.resumesDownloaded,
  };
}

async function getTransactions({ page = 1, pageSize = 6, filter = 'all', search = '', dateFrom, dateTo } = {}) {
  const { data } = await axiosInstance.get('/recruiter/wallet/transactions', {
    params: { page, pageSize, filter, search, dateFrom, dateTo },
  });

  const items = (data.items || []).map((txn) => ({
    id: txn._id || txn.id,
    createdAt: txn.createdAt,
    type: txn.type,
    description: txn.description,
    reference: txn.reference || txn.paymentReference || '—',
    amount: txn.amount,
    balanceAfter: txn.balanceAfter,
    status: txn.status,
    paymentMethod: txn.paymentMethod,
    paymentReference: txn.paymentReference,
    candidateName: txn.relatedResumeDownload?.candidateName,
    jobTitle: txn.relatedResumeDownload?.jobTitle,
  }));

  return { items, total: data.total || 0, page: data.page || page, pageSize: data.pageSize || pageSize };
}

async function getTransactionById(id) {
  const { data } = await axiosInstance.get(`/recruiter/wallet/transactions/${id}`);
  return {
    id: data._id || data.id,
    createdAt: data.createdAt,
    type: data.type,
    description: data.description,
    reference: data.reference || data.paymentReference || '—',
    amount: data.amount,
    balanceAfter: data.balanceAfter,
    status: data.status,
    paymentMethod: data.paymentMethod,
    paymentReference: data.paymentReference,
    candidateName: data.relatedResumeDownload?.candidateName,
    jobTitle: data.relatedResumeDownload?.jobTitle,
  };
}

async function getResumeDownloads({ page = 1, pageSize = 6 } = {}) {
  const { data } = await axiosInstance.get('/recruiter/wallet/downloads', {
    params: { page, pageSize },
  });

  return {
    items: (data.items || []).map((item) => ({
      id: item.id || item._id,
      candidateName: item.candidateName,
      jobTitle: item.jobTitle,
      createdAt: item.downloadedAt,
      amount: item.amount,
      reference: item.reference,
    })),
    total: data.pagination?.total || 0,
    page: data.pagination?.page || page,
    pageSize: data.pagination?.pageSize || pageSize,
  };
}

async function initiateWalletRecharge({ amount, paymentMethodId }) {
  const method = PAYMENT_METHODS.find((m) => m.id === paymentMethodId)?.label ?? paymentMethodId;

  const { data } = await axiosInstance.post('/recruiter/wallet/recharge', { amount, paymentMethodId });

  if (data.devMode) {
    const verifyRes = await axiosInstance.post('/recruiter/wallet/recharge/verify', {
      razorpay_order_id: data.orderId,
      razorpay_payment_id: 'dev_payment',
      razorpay_signature: 'dev_signature',
      paymentRecordId: data.paymentRecordId,
    });

    return {
      devMode: true,
      id: verifyRes.data.transaction?._id || `TXN-${Date.now()}`,
      createdAt: verifyRes.data.transaction?.createdAt || new Date().toISOString(),
      type: TRANSACTION_TYPES.RECHARGE,
      description: 'Wallet Recharge',
      reference: verifyRes.data.transaction?.reference || data.orderId,
      amount,
      balanceAfter: verifyRes.data.walletBalance,
      status: TRANSACTION_STATUS.SUCCESS,
      paymentMethod: method,
      paymentReference: verifyRes.data.transaction?.paymentReference || 'dev_payment',
    };
  }

  return {
    devMode: false,
    orderId: data.orderId,
    amount: data.amount,
    key: data.key,
    currency: data.currency,
    paymentRecordId: data.paymentRecordId,
    paymentMethod: method,
  };
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: TRANSACTION_TYPES.RECHARGE, label: 'Wallet Recharge' },
  { value: TRANSACTION_TYPES.RESUME_DOWNLOAD, label: 'Resume Download' },
  { value: TRANSACTION_TYPES.REFUND, label: 'Refund' },
  { value: TRANSACTION_STATUS.FAILED, label: 'Failed' },
  { value: TRANSACTION_STATUS.PENDING, label: 'Pending' },
];

const STATUS_CONFIG = {
  [TRANSACTION_STATUS.SUCCESS]: { label: 'Successful', icon: CheckCircle2, bg: '#EAF6EC', fg: '#2E7D32' },
  [TRANSACTION_STATUS.PENDING]: { label: 'Pending', icon: Clock, bg: '#FFF4DE', fg: '#9A6B00' },
  [TRANSACTION_STATUS.FAILED]: { label: 'Failed', icon: XCircle, bg: '#FBEAEA', fg: '#B3261E' },
  [TRANSACTION_STATUS.REFUNDED]: { label: 'Refunded', icon: RotateCcw, bg: '#EAEEFB', fg: '#39499D' },
};

const TYPE_LABEL = {
  [TRANSACTION_TYPES.RECHARGE]: 'Wallet Recharge',
  [TRANSACTION_TYPES.RESUME_DOWNLOAD]: 'Resume Download',
  [TRANSACTION_TYPES.REFUND]: 'Refund',
};

function formatMoney(amount) {
  return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ---------------------------------- Toast ---------------------------------- */

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const isError = toast.variant === 'error';

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-md"
      style={{
        background: isError ? '#FBEAEA' : '#EAF6EC',
        borderColor: isError ? '#F1C0C0' : '#BFE3C4',
        color: isError ? '#B3261E' : '#2E7D32',
      }}
    >
      {isError ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
      {toast.message}
    </div>
  );
}

/* -------------------------------- StatusBadge -------------------------------- */

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[TRANSACTION_STATUS.SUCCESS];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

/* -------------------------------- Summary cards -------------------------------- */

function SummaryCard({ label, value, accent, icon: Icon, primary, loading }) {
  return (
    <div
      className="rounded-xl border bg-white p-4"
      style={{
        borderColor: '#EBC2AE',
        borderLeftWidth: primary ? '3px' : '1px',
        borderLeftColor: primary ? '#C75560' : '#EBC2AE',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}1A`, color: accent }}
        >
          <Icon size={15} />
        </div>
        {primary && (
          <span className="rounded-full bg-[#FFF0E8] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#C75560]">
            Primary
          </span>
        )}
      </div>

      <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#80576A]">{label}</p>

      {loading ? (
        <div className="mt-2 h-6 w-20 animate-pulse rounded bg-[#F1E7E1]" />
      ) : (
        <p
          className="mt-1 truncate text-xl font-bold"
          style={{ fontFamily: FONT_DISPLAY, color: primary ? '#C75560' : '#1D181A' }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

/* -------------------------------- Low balance banner -------------------------------- */

function LowBalanceBanner({ balance, onAddMoney }) {
  if (balance >= LOW_BALANCE_THRESHOLD) return null;
  return (
    <div className="mb-4 flex flex-col gap-2.5 rounded-xl border border-[#F1C0C0] bg-[#FBEAEA] p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className="shrink-0 text-[#B3261E]" />
        <p className="text-sm text-[#7A1D18]">
          <span className="font-semibold">Balance running low.</span> Add money to keep downloading resumes.
        </p>
      </div>
      <button
        type="button"
        onClick={onAddMoney}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#B3261E] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#93201A]"
      >
        <Plus size={13} /> Add Money
      </button>
    </div>
  );
}

/* -------------------------------- Pricing card -------------------------------- */

function PricingCard({ balance, open, onToggle }) {
  return (
    <div className="rounded-xl border border-[#EBC2AE] bg-white p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <div>
          <p className="text-sm font-semibold text-[#1D181A]">Resume Download Charges</p>
          <p className="mt-1 text-xs text-[#6B7280]">₹{RESUME_DOWNLOAD_FEE} deducted per resume download.</p>
        </div>
        <ChevronRight
          size={18}
          className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-[#FFF0E8] p-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#80576A]">Balance</p>
              <p className="mt-1 text-sm font-bold text-[#1D181A]">{formatMoney(balance)}</p>
            </div>
            <div className="rounded-lg bg-[#FFF0E8] p-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[#80576A]">Per Download</p>
              <p className="mt-1 text-sm font-bold text-[#1D181A]">{formatMoney(RESUME_DOWNLOAD_FEE)}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#F1E7E1] bg-[#FEF6F0] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="shrink-0 text-[#2E7D32]" />
              <p className="text-sm font-semibold text-[#1D181A]">Wallet overview</p>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-[#6B7280]">
              <li>Only verified successful payments credit your wallet.</li>
              <li>Every resume download is recorded as an auditable transaction.</li>
              <li>Refunds are issued automatically for failed downloads.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------- Add Money modal -------------------------------- */

function AddMoneyModal({ open, onClose, onSuccess }) {
  const [amountInput, setAmountInput] = useState(String(PREDEFINED_RECHARGE_AMOUNTS[1]));
  const [method, setMethod] = useState(PAYMENT_METHODS[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAmountInput(String(PREDEFINED_RECHARGE_AMOUNTS[1]));
      setMethod(PAYMENT_METHODS[0].id);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const finalAmount = Number(amountInput) || 0;

  const handleProceed = async () => {
    if (finalAmount <= 0) {
      setError('Enter a valid amount to continue.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const order = await initiateWalletRecharge({ amount: finalAmount, paymentMethodId: method });

      if (order.devMode) {
        onSuccess(order);
        return;
      }

      if (typeof window.Razorpay !== 'function') {
        throw new Error('Payment gateway failed to load. Please refresh and try again.');
      }

      const razorpay = new window.Razorpay({
        key: order.key,
        amount: order.amount * 100,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Job Portal',
        description: 'Wallet recharge',
        theme: { color: '#C75560' },
        handler: async (response) => {
          try {
            const verifyRes = await axiosInstance.post('/recruiter/wallet/recharge/verify', {
              ...response,
              paymentRecordId: order.paymentRecordId,
            });

            onSuccess({
              id: verifyRes.data.transaction?._id || `TXN-${Date.now()}`,
              createdAt: verifyRes.data.transaction?.createdAt || new Date().toISOString(),
              type: TRANSACTION_TYPES.RECHARGE,
              description: 'Wallet Recharge',
              reference: verifyRes.data.transaction?.reference || order.orderId,
              amount: finalAmount,
              balanceAfter: verifyRes.data.walletBalance,
              status: TRANSACTION_STATUS.SUCCESS,
              paymentMethod: method,
              paymentReference: verifyRes.data.transaction?.paymentReference || response.razorpay_payment_id,
            });
          } catch (verifyError) {
            console.error('Wallet recharge verification failed:', verifyError);
            setError(verifyError.response?.data?.error || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError('Payment was cancelled.');
          },
        },
      });

      razorpay.on('payment.failed', () => {
        setSubmitting(false);
        setError('Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (e) {
      console.error('Wallet recharge flow failed:', e);
      setError(e.response?.data?.error || e.message || 'Payment could not be processed. Please try again.');
    } finally {
      if (typeof window.Razorpay !== 'function') {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
           Add Money 
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#FFF0E8]">
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#80576A]">Enter Amount</p>
        <div className="mt-3 rounded-2xl border border-[#EBC2AE] bg-[#FFFFFF] px-3 py-2 shadow-sm focus-within:border-[#C75560] focus-within:ring-2 focus-within:ring-[#C75560]/10">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-[#80576A]" />
            <input
              type="number"
              min="1"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-transparent text-sm text-[#1D181A] outline-none appearance-none"
              style={{ MozAppearance: 'textfield' }}
            />
          </div>
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#80576A]">Select Amount</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PREDEFINED_RECHARGE_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmountInput(String(amt))}
              className="rounded-2xl border px-3 py-2 text-sm font-semibold transition"
              style={{
                borderColor: Number(amountInput) === amt ? '#C75560' : '#EBC2AE',
                background: Number(amountInput) === amt ? '#FFF0E8' : '#FFFFFF',
                color: '#1D181A',
              }}
            >
              ₹{amt.toLocaleString()}
            </button>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#80576A]">Payment Method</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <label
                key={m.id}
                className="relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-center transition"
                style={{ borderColor: active ? '#C75560' : '#EBC2AE', background: active ? '#FFF0E8' : '#FFFFFF' }}
              >
                <input
                  type="radio"
                  name="payment-method"
                  checked={active}
                  onChange={() => setMethod(m.id)}
                  className="sr-only"
                />
                <Icon size={16} style={{ color: active ? '#C75560' : '#80576A' }} />
                <span className="text-[11px] font-semibold leading-tight text-[#1D181A]">{m.label}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-5 rounded-2xl bg-[#FFF0E8] p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Selected Amount</span>
            <span className="font-semibold text-[#1D181A]">{formatMoney(finalAmount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-[#6B7280]">Payment Method</span>
            <span className="font-semibold text-[#1D181A]">{PAYMENT_METHODS.find((m) => m.id === method)?.label}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[#EBC2AE] pt-2 text-sm">
            <span className="font-semibold text-[#1D181A]">Final Amount</span>
            <span className="text-base font-bold text-[#C75560]">{formatMoney(finalAmount)}</span>
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-medium text-[#B3261E]">{error}</p>}

        <button
          type="button"
          disabled={submitting}
          onClick={handleProceed}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C75560] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A94658] disabled:opacity-60"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowUpRight size={16} />}
          {submitting ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Transaction details modal -------------------------------- */

function getDisplayTransactionType(txn) {
  if (!txn) return 'Wallet transaction';
  const description = typeof txn.description === 'string' ? txn.description.trim() : '';
  if (description && description.toLowerCase().startsWith('added by admin')) return 'Added by admin';
  if (description && description.toLowerCase().startsWith('deducted by admin')) return 'Deducted by admin';
  if (description && description !== 'Wallet Recharge') return description;
  return TYPE_LABEL[txn.type] || 'Wallet transaction';
}

function TransactionDetailsModal({ txnId, onClose }) {
  const [txn, setTxn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!txnId) return;
    setLoading(true);
    setError('');
    getTransactionById(txnId)
      .then(setTxn)
      .catch(() => setError('Could not load transaction details.'))
      .finally(() => setLoading(false));
  }, [txnId]);

  if (!txnId) return null;

  const isRecharge = txn?.type === TRANSACTION_TYPES.RECHARGE;

  const Row = ({ label, value }) => (
    <div className="flex items-center justify-between gap-4 border-b border-[#F1E7E1] py-2.5 last:border-0">
      <span className="text-sm text-[#6B7280]">{label}</span>
      <span className="text-right text-sm font-semibold text-[#1D181A]">{value}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
            Transaction Details
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#6B7280] hover:bg-[#FFF0E8]">
            <X size={18} />
          </button>
        </div>

        {loading && (
          <div className="mt-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-[#F1E7E1]" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-2xl bg-[#FBEAEA] p-4 text-sm font-medium text-[#B3261E]">{error}</div>
        )}

        {!loading && txn && (
          <div className="mt-4">
            <Row label="Transaction ID" value={txn.id} />
            <Row label="Date & Time" value={formatDateTime(txn.createdAt)} />
            <Row label="Type" value={getDisplayTransactionType(txn)} />

            {isRecharge ? (
              <>
                <Row label="Payment Method" value={txn.paymentMethod} />
                <Row label="Payment Reference" value={txn.paymentReference} />
              </>
            ) : (
              <>
                <Row label="Candidate" value={txn.candidateName} />
                <Row label="Job" value={txn.jobTitle} />
                <Row label="Previous Balance" value={formatMoney(txn.balanceAfter - txn.amount)} />
                <Row label="Current Balance" value={formatMoney(txn.balanceAfter)} />
              </>
            )}

            <Row label="Amount" value={`${txn.amount >= 0 ? '+' : '-'}${formatMoney(txn.amount)}`} />

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-[#6B7280]">Status</span>
              <StatusBadge status={txn.status} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Insufficient balance modal -------------------------------- */
/* Ready to reuse from Applicants.jsx / resume-download buttons — pass
   requiredAmount + currentBalance, and wire onAddMoney to open this
   same wallet's Add Money flow. */

export function InsufficientBalanceModal({ open, requiredAmount, currentBalance, onAddMoney, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FBEAEA] text-[#B3261E]">
          <AlertTriangle size={24} />
        </div>
        <h2 className="mt-4 text-lg font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
          Insufficient Wallet Balance
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6B7280]">
          You need {formatMoney(requiredAmount)} to download this resume. Your current balance is {formatMoney(currentBalance)}.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-[#EBC2AE] bg-white px-4 py-2.5 text-sm font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAddMoney}
            className="flex-1 rounded-2xl bg-[#C75560] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#A94658]"
          >
            Add Money
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Empty / error states -------------------------------- */

function EmptyState({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-[#EBC2AE] bg-[#FFFBF9] px-6 py-14 text-center">
      <Icon size={28} className="text-[#C7A08F]" />
      <p className="text-sm font-semibold text-[#1D181A]">{title}</p>
      {subtitle && <p className="max-w-sm text-sm text-[#6B7280]">{subtitle}</p>}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-[#F1C0C0] bg-[#FBEAEA] px-6 py-14 text-center">
      <XCircle size={26} className="text-[#B3261E]" />
      <p className="text-sm font-semibold text-[#7A1D18]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#B3261E] shadow-sm hover:bg-[#FFF4F4]"
      >
        <RefreshCw size={14} /> Retry
      </button>
    </div>
  );
}

/* -------------------------------- Pagination -------------------------------- */

function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs text-[#6B7280]">
        Page {page} of {totalPages} · {total} total
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border border-[#EBC2AE] p-1.5 text-[#1D181A] disabled:opacity-40"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border border-[#EBC2AE] p-1.5 text-[#1D181A] disabled:opacity-40"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Transaction row (desktop + mobile) -------------------------------- */

function TransactionRow({ txn, onClick }) {
  const isCredit = txn.amount >= 0;
  return (
    <>
      {/* Desktop row */}
      <button
        type="button"
        onClick={onClick}
        className="hidden w-full grid-cols-[1.5fr_1fr_0.9fr_0.9fr_0.9fr] items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-[#FFF7F2] md:grid"
      >
        <div>
          <p className="text-sm font-semibold text-[#1D181A]">{txn.description}</p>
          <p className="mt-0.5 text-xs text-[#6B7280]">{formatDateTime(txn.createdAt)}</p>
        </div>
        <p className="text-sm text-[#6B7280]">{txn.reference}</p>
        <p className={`text-sm font-semibold ${isCredit ? 'text-[#2E7D32]' : 'text-[#1D181A]'}`}>
          {isCredit ? '+' : '-'}
          {formatMoney(txn.amount)}
        </p>
        <p className="text-sm text-[#6B7280]">{formatMoney(txn.balanceAfter)}</p>
        <StatusBadge status={txn.status} />
      </button>

      {/* Mobile card */}
      <button
        type="button"
        onClick={onClick}
        className="flex w-full flex-col gap-2 rounded-2xl border border-[#EBC2AE] bg-white p-4 text-left md:hidden"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[#1D181A]">{txn.description}</p>
          <p className={`text-sm font-bold ${isCredit ? 'text-[#2E7D32]' : 'text-[#1D181A]'}`}>
            {isCredit ? '+' : '-'}
            {formatMoney(txn.amount)}
          </p>
        </div>
        <p className="text-xs text-[#6B7280]">{formatDateTime(txn.createdAt)} · {txn.reference}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#6B7280]">Balance: {formatMoney(txn.balanceAfter)}</span>
          <StatusBadge status={txn.status} />
        </div>
      </button>
    </>
  );
}

/* ==================================================================== */
/*                              Main page                                */
/* ==================================================================== */

export default function RecruiterWallet() {
  const navigate = useNavigate();

  // Summary
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');

  // Tabs
  const [activeTab, setActiveTab] = useState('transactions'); // 'transactions' | 'downloads'

  // Transactions
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Resume downloads
  const [downloads, setDownloads] = useState([]);
  const [dlLoading, setDlLoading] = useState(true);
  const [dlError, setDlError] = useState('');
  const [dlPage, setDlPage] = useState(1);
  const [dlTotal, setDlTotal] = useState(0);

  // Modals & toast
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [selectedTxnId, setSelectedTxnId] = useState(null);
  const [toast, setToast] = useState(null);
  const [walletOverviewOpen, setWalletOverviewOpen] = useState(true);

  const loadSummary = useCallback(() => {
    setSummaryLoading(true);
    setSummaryError('');
    getWalletSummary()
      .then(setSummary)
      .catch(() => setSummaryError('Could not load wallet summary.'))
      .finally(() => setSummaryLoading(false));
  }, []);

  const loadTransactions = useCallback(() => {
    setTxLoading(true);
    setTxError('');
    getTransactions({ page: txPage, pageSize: PAGE_SIZE, filter, search })
      .then((res) => {
        setTransactions(res.items);
        setTxTotal(res.total);
      })
      .catch(() => setTxError('Could not load transactions.'))
      .finally(() => setTxLoading(false));
  }, [txPage, filter, search]);

  const loadDownloads = useCallback(() => {
    setDlLoading(true);
    setDlError('');
    getResumeDownloads({ page: dlPage, pageSize: PAGE_SIZE })
      .then((res) => {
        setDownloads(res.items);
        setDlTotal(res.total);
      })
      .catch(() => setDlError('Could not load resume download activity.'))
      .finally(() => setDlLoading(false));
  }, [dlPage]);

  const refreshWallet = useCallback(() => {
    loadSummary();
    loadTransactions();
    if (activeTab === 'downloads') loadDownloads();
  }, [activeTab, loadSummary, loadTransactions, loadDownloads]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);
  useEffect(() => {
    if (activeTab === 'downloads') loadDownloads();
  }, [activeTab, loadDownloads]);

  useEffect(() => { setTxPage(1); }, [filter, search]);

  const handleRechargeSuccess = (txn) => {
    setAddMoneyOpen(false);
    setToast({ variant: 'success', message: `₹${txn.amount.toLocaleString()} added to your wallet.` });
    refreshWallet();
    setTxPage(1);
  };

  const balance = summary?.availableBalance ?? 0;

  const summaryCards = useMemo(
    () => [
      { label: 'Available Balance', value: formatMoney(balance), accent: '#C75560', icon: WalletIcon, primary: true },
      { label: 'Total Added', value: formatMoney(summary?.totalAdded ?? 0), accent: '#6BAE75', icon: ArrowUpRight },
      { label: 'Total Spent', value: formatMoney(summary?.totalSpent ?? 0), accent: '#F7C56B', icon: ArrowDownRight },
      { label: 'Resumes Downloaded', value: summary?.resumesDownloaded ?? 0, accent: '#80576A', icon: FileText },
    ],
    [summary, balance],
  );

  return (
    <div className="min-h-screen bg-[#FFF4EF] text-[#1D181A]" style={{ fontFamily: FONT_BODY }}>
      <RecruiterNavbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header — slim, no card wrapper */}
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#EBC2AE] pb-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-[#1D181A] sm:text-2xl" style={{ fontFamily: FONT_DISPLAY }}>
              Wallet
            </h1>
            <p className="mt-0.5 text-sm text-[#6B7280]">Balance and resume download expenses.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refreshWallet}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[#EBC2AE] bg-white p-2 text-[#1D181A] transition hover:bg-[#FFF0E8]"
              aria-label="Refresh wallet data"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => setAddMoneyOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#C75560] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#A94658]"
            >
              <Plus size={15} /> Add Money
            </button>
          </div>
        </div>

        {!summaryLoading && !summaryError && <LowBalanceBanner balance={balance} onAddMoney={() => setAddMoneyOpen(true)} />}

        {summaryError ? (
          <ErrorState message={summaryError} onRetry={loadSummary} />
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} {...card} loading={summaryLoading} />
            ))}
          </section>
        )}

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(280px,320px)_minmax(0,1fr)]">
          <div className="space-y-3">
            <PricingCard
              balance={balance}
              open={walletOverviewOpen}
              onToggle={() => setWalletOverviewOpen((prev) => !prev)}
            />
          </div>

          <div className="rounded-xl border border-[#EBC2AE] bg-white p-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-[#F1E7E1] pb-3">
              {[
                { id: 'transactions', label: 'Transaction History' },
                { id: 'downloads', label: 'Resume Downloads' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="rounded-full px-4 py-1.5 text-sm font-semibold transition"
                  style={{
                    background: activeTab === tab.id ? '#C75560' : 'transparent',
                    color: activeTab === tab.id ? '#FFFFFF' : '#6B7280',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'transactions' && (
              <div className="mt-4">
                {/* Filters */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFilter(opt.value)}
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                        style={{
                          borderColor: filter === opt.value ? '#C75560' : '#EBC2AE',
                          background: filter === opt.value ? '#FFF0E8' : '#FFFFFF',
                          color: '#1D181A',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-[#EBC2AE] px-3 py-2 sm:w-56">
                    <Search size={14} className="text-[#80576A]" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search TXN / reference"
                      className="w-full bg-transparent text-xs text-[#1D181A] outline-none"
                    />
                  </div>
                </div>

                {/* Table header (desktop) */}
                {!txLoading && !txError && transactions.length > 0 && (
                  <div className="mt-5 hidden grid-cols-[1.5fr_1fr_0.9fr_0.9fr_0.9fr] gap-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#80576A] md:grid">
                    <span>Description</span>
                    <span>Reference</span>
                    <span>Amount</span>
                    <span>Balance</span>
                    <span>Status</span>
                  </div>
                )}

                <div className="mt-2 space-y-2">
                  {txLoading &&
                    [...Array(4)].map((_, i) => <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-[#F1E7E1]" />)}

                  {!txLoading && txError && <ErrorState message={txError} onRetry={loadTransactions} />}

                  {!txLoading && !txError && transactions.length === 0 && (
                    <EmptyState
                      icon={IndianRupee}
                      title="No transactions yet"
                      subtitle="Your wallet transactions will appear here once you add money or download a resume."
                    />
                  )}

                  {!txLoading &&
                    !txError &&
                    transactions.map((txn) => <TransactionRow key={txn.id} txn={txn} onClick={() => setSelectedTxnId(txn.id)} />)}
                </div>

                {!txLoading && !txError && <Pagination page={txPage} pageSize={PAGE_SIZE} total={txTotal} onPageChange={setTxPage} />}
              </div>
            )}

            {activeTab === 'downloads' && (
              <div className="mt-4">
                {dlLoading && (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-[#F1E7E1]" />
                    ))}
                  </div>
                )}

                {!dlLoading && dlError && <ErrorState message={dlError} onRetry={loadDownloads} />}

                {!dlLoading && !dlError && downloads.length === 0 && (
                  <EmptyState icon={Download} title="No resume downloads yet" />
                )}

                {!dlLoading && !dlError && downloads.length > 0 && (
                  <div className="space-y-2">
                    <div className="hidden grid-cols-[1.3fr_1.3fr_1fr_0.8fr] gap-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-[#80576A] md:grid">
                      <span>Candidate</span>
                      <span>Job</span>
                      <span>Downloaded On</span>
                      <span>Amount</span>
                    </div>
                    {downloads.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => navigate(`/recruiter/candidates/${encodeURIComponent(d.candidateName)}`)}
                        className="grid w-full grid-cols-2 gap-2 rounded-2xl px-4 py-3 text-left transition hover:bg-[#FFF7F2] md:grid-cols-[1.3fr_1.3fr_1fr_0.8fr]"
                      >
                        <span className="text-sm font-semibold text-[#1D181A]">{d.candidateName}</span>
                        <span className="text-sm text-[#6B7280]">{d.jobTitle}</span>
                        <span className="text-sm text-[#6B7280]">{formatDateTime(d.createdAt)}</span>
                        <span className="text-sm font-semibold text-[#1D181A]">{formatMoney(d.amount)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {!dlLoading && !dlError && <Pagination page={dlPage} pageSize={PAGE_SIZE} total={dlTotal} onPageChange={setDlPage} />}
              </div>
            )}
          </div>
        </div>
      </main>

      <AddMoneyModal open={addMoneyOpen} onClose={() => setAddMoneyOpen(false)} onSuccess={handleRechargeSuccess} />
      <TransactionDetailsModal txnId={selectedTxnId} onClose={() => setSelectedTxnId(null)} />
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}