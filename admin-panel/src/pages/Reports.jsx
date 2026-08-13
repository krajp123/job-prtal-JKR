import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const REPORT_DATA = [
  { label: 'Jan', revenue: 420000, newRecruiters: 35, newCandidates: 1900 },
  { label: 'Feb', revenue: 465000, newRecruiters: 42, newCandidates: 2040 },
  { label: 'Mar', revenue: 520000, newRecruiters: 54, newCandidates: 2190 },
  { label: 'Apr', revenue: 490000, newRecruiters: 48, newCandidates: 2330 },
  { label: 'May', revenue: 580000, newRecruiters: 60, newCandidates: 2470 },
  { label: 'Jun', revenue: 625000, newRecruiters: 72, newCandidates: 2590 },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Platform performance and growth metrics.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Monthly Revenue</h2>
          <p className="mt-1 text-sm text-slate-500">Revenue trend for the last six months.</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REPORT_DATA} margin={{ left: -12, right: 12, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Signups & Hiring</h2>
          <p className="mt-1 text-sm text-slate-500">Recruiter and candidate growth over time.</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">New Recruiters</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{REPORT_DATA.reduce((sum, item) => sum + item.newRecruiters, 0)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm text-slate-500">New Candidates</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{REPORT_DATA.reduce((sum, item) => sum + item.newCandidates, 0)}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
