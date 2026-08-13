import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

export default function WalletPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await adminAxiosInstance.get('/payments');
        setPayments(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Wallet & Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor wallet balances and payment activity across the platform.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-5 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600">
          <span>Recruiter</span>
          <span>Purpose</span>
          <span>Amount</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading payments…</div>
          ) : payments.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No payments found.</div>
          ) : (
            payments.map((payment) => (
              <div key={payment._id} className="grid grid-cols-5 gap-4 px-6 py-4 text-sm text-slate-700 hover:bg-slate-50">
                <span>{payment.recruiter?.companyName || payment.recruiter?.name || '—'}</span>
                <span>{payment.purpose || '—'}</span>
                <span>₹{payment.amount}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{payment.status || 'unknown'}</span>
                <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
