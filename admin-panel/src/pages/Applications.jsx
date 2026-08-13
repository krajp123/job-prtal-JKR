import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import adminAxiosInstance from '../api/adminAxiosInstance';

function getStatusColor(status) {
  const statusMap = {
    applied: 'text-blue-700',
    interview_scheduled: 'text-amber-600',
    interviewed: 'bg-cyan-50 text-cyan-700',
    hired: 'bg-green-50 text-green-700',
    accepted: 'bg-green-50 text-green-700',
    rejected: 'bg-red-50 text-red-700',
  };
  return statusMap[status?.toLowerCase().replace(/\s+/g, '_')] || 'bg-slate-100 text-slate-600';
}

function formatStatusText(status) {
  if (!status) return 'Unknown';
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      const jobId = params.get('jobId');
      const path = jobId ? `/applications?jobId=${encodeURIComponent(jobId)}` : '/applications';

      try {
        const { data } = await adminAxiosInstance.get(path);
        setApplications(data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [location.search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Applications</h1>
        <p className="mt-1 text-sm text-slate-500">Track candidate applications and review submission status.</p>
      </div>

      <div className="overflow-hidden  border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr_0.7fr] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600">
          <span>Candidate</span>
          <span>Contact</span>
          <span>Job</span>
          <span>Status</span>
          <span>Date</span>
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading applications…</div>
          ) : applications.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No applications found.</div>
          ) : (
            applications.map((application) => (
              <div key={application._id} className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr_0.7fr] gap-4 px-6 py-4 text-sm text-slate-700 hover:bg-slate-50">
                <div>
                  <div className="font-medium text-slate-900">{application.candidate?.name || '—'}</div>
                  <div className="text-xs text-slate-500">{application.candidate?.email || '—'}</div>
                </div>
                <div className="text-slate-700">
                  <div>{application.candidate?.phone || '—'}</div>
                </div>
                <div>{application.job?.title || '—'}</div>
                <div className={`text-xs font-semibold ${getStatusColor(application.status)}`}>{formatStatusText(application.status)}</div>
                <div>{new Date(application.createdAt).toLocaleDateString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
