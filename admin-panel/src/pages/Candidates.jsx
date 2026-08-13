import { useEffect, useState } from 'react';
import adminAxiosInstance from '../api/adminAxiosInstance';

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await adminAxiosInstance.get('/users/candidates');
        setCandidates(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Candidates</h1>
        <p className="mt-1 text-sm text-slate-500">Browse and manage candidate registrations.</p>
      </div>

      <div className="overflow-hidden -3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-4 gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600">
          <span>Name</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading candidates…</div>
          ) : candidates.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No candidates found.</div>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate._id} className="grid grid-cols-4 gap-4 px-6 py-4 text-sm text-slate-700 hover:bg-slate-50">
                <span>{candidate.name || '—'}</span>
                <span>{candidate.email}</span>
                <span>{candidate.phone || '—'}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {candidate.accountStatus || 'unknown'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
