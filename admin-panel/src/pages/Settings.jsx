export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure admin preferences and platform parameters.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">General Settings</h2>
          <p className="mt-2 text-sm text-slate-500">Administrative settings for your dashboard.</p>
          <div className="mt-6 space-y-4 text-sm text-slate-700">
            <div className="rounded-3xl bg-slate-50 p-4">Email notifications: <strong className="text-slate-900">Enabled</strong></div>
            <div className="rounded-3xl bg-slate-50 p-4">Session timeout: <strong className="text-slate-900">30 minutes</strong></div>
            <div className="rounded-3xl bg-slate-50 p-4">Two-factor auth: <strong className="text-slate-900">Disabled</strong></div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Platform Controls</h2>
          <p className="mt-2 text-sm text-slate-500">Manage platform-wide actions and configuration.</p>
          <div className="mt-6 space-y-4 text-sm text-slate-700">
            <div className="rounded-3xl bg-slate-50 p-4">Maintenance mode: <strong className="text-slate-900">Off</strong></div>
            <div className="rounded-3xl bg-slate-50 p-4">Email verification: <strong className="text-slate-900">Required</strong></div>
            <div className="rounded-3xl bg-slate-50 p-4">API rate limiting: <strong className="text-slate-900">Enabled</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
}
