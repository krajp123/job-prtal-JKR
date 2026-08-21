import React, { useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosInstance';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import { FONT_DISPLAY } from '../../theme';

export default function RecruiterInvites() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchInvites() {
      setLoading(true);
      try {
        const { data } = await axiosInstance.get('/recruiter/me/invites');
        if (!mounted) return;
        setInvites(data.invites || []);
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load invites.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchInvites();
    return () => {
      mounted = false;
    };
  }, []);

  async function respond(inviteId, accept = true) {
    setActionLoading(true);
    setError('');
    try {
      const path = accept ? '/recruiter/me/invites/accept' : '/recruiter/me/invites/decline';
      await axiosInstance.post(path, { inviteId });
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch (err) {
      setError(err?.response?.data?.error || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F2] text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
      <RecruiterNavbar />

      <main className="recruiter-page mx-auto w-full max-w-4xl px-4 py-5 sm:px-6 sm:py-6">
        <h1 className="text-2xl font-bold">Invites</h1>
        <p className="mt-2 text-sm text-slate-600">Invites from other recruiters to join their team.</p>

        <section className="mt-6 rounded-2xl border bg-white p-6">
          {loading ? (
            <div className="text-sm text-slate-500">Loading invites…</div>
          ) : invites.length === 0 ? (
            <div className="text-sm text-slate-500">No invites at this time.</div>
          ) : (
            <ul className="space-y-4">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">{inv.fromName || inv.fromEmail}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{inv.role} — invited {new Date(inv.invitedAt).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => respond(inv.id, true)}
                      disabled={actionLoading}
                      className="rounded-full bg-[#C75560] px-4 py-1.5 text-sm font-semibold text-white"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => respond(inv.id, false)}
                      disabled={actionLoading}
                      className="rounded-full border px-3 py-1.5 text-sm font-semibold"
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {error && <div className="mt-4 text-sm text-rose-600">{error}</div>}
        </section>
      </main>
    </div>
  );
}
