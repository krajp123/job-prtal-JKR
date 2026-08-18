import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import PasswordField from '../components/auth/PasswordField';

// Loads the two display/body faces used on this page and cleans up on unmount.
function useAuthTypography() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

const ROUTE_STEPS = [
  { key: 'verify', label: 'Link verified' },
  { key: 'reset', label: 'New password' },
  { key: 'done', label: 'Signed in' },
];

function RouteMarker({ status }) {
  // status: 'complete' | 'current' | 'upcoming'
  if (status === 'complete') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2F4B3C]">
        <svg viewBox="0 0 12 10" className="h-2.5 w-2.5" fill="none">
          <path d="M1 5L4.3 8.5L11 1.5" stroke="#FFF9F5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === 'current') {
    return (
      <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="absolute h-6 w-6 rounded-full bg-[#B08D57]/25 motion-safe:animate-ping" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-[#B08D57] ring-4 ring-[#B08D57]/20" />
      </span>
    );
  }
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#D8CFC2] bg-transparent" />;
}

function RouteRail({ currentIndex, orientation }) {
  const isVertical = orientation === 'vertical';
  return (
    <ol className={isVertical ? 'flex flex-col gap-8' : 'flex items-center gap-3'}>
      {ROUTE_STEPS.map((step, i) => {
        const status = i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'upcoming';
        const isLast = i === ROUTE_STEPS.length - 1;
        return (
          <li key={step.key} className={isVertical ? 'flex gap-3' : 'flex flex-1 items-center gap-3'}>
            <div className={isVertical ? 'flex flex-col items-center' : 'flex items-center'}>
              <RouteMarker status={status} />
              {isVertical && !isLast && (
                <span
                  className={`mt-1 h-10 w-px ${i < currentIndex ? 'bg-[#2F4B3C]' : 'bg-[#E4DACB]'}`}
                  aria-hidden="true"
                />
              )}
            </div>
            {isVertical ? (
              <span
                className={`pt-0.5 text-[13px] font-medium ${
                  status === 'upcoming' ? 'text-[#B4A8AE]' : 'text-[#3A3034]'
                }`}
              >
                {step.label}
              </span>
            ) : (
              !isLast && (
                <span className={`h-px flex-1 ${i < currentIndex ? 'bg-[#2F4B3C]' : 'bg-[#E4DACB]'}`} aria-hidden="true" />
              )
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function ResetPasswordPage() {
  useAuthTypography();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('This password reset link is invalid or incomplete.');
      return;
    }
    setReady(true);
  }, [token, email]);

  const passwordStrength = useMemo(() => {
    const pw = newPassword;
    const checks = {
      length: pw.length >= 8,
      lower: /[a-z]/.test(pw),
      upper: /[A-Z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    };
    const score = Object.values(checks).filter(Boolean).length;
    const isStrong = checks.length && score >= 4;
    return { score, isStrong };
  }, [newPassword]);

  const currentStepIndex = success ? 2 : 1;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!token || !email) {
      setError('Missing reset token or email.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!passwordStrength.isStrong) {
      setError('Please choose a stronger password before continuing.');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await axiosInstance.post('/candidate/password/reset', {
        email,
        token,
        newPassword,
      });

      setSuccess(data.message || 'Password reset successful.');
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset password. Please request a new link.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#FFF9F5] px-4 py-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="grid w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#F0E1D6] bg-white shadow-[0_24px_60px_rgba(29,24,26,0.08)] md:grid-cols-[0.82fr_1fr]">
        {/* Route panel — signature element: the reset flow rendered as a career route */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-[#1D181A] px-8 py-9 md:flex">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, #FFF9F5 0.5px, transparent 0.5px), radial-gradient(circle at 60% 70%, #FFF9F5 0.5px, transparent 0.5px)',
              backgroundSize: '28px 28px, 34px 34px',
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#B08D57]">Career Route Portal</p>
            <h2
              className="mt-3 text-[26px] leading-[1.15] text-[#FFF9F5]"
              style={{ fontFamily: "'Fraunces', serif", fontOpticalSizing: 'auto' }}
            >
              A short stop on a longer route.
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-[#C9BFC3]">
              Three steps back to your account — you're on the second one now.
            </p>
          </div>

          <div className="relative mt-10">
            <RouteRail currentIndex={currentStepIndex} orientation="vertical" />
          </div>

          <p className="relative text-[11.5px] text-[#8A7E82]">Your link stays active until this route is complete.</p>
        </div>

        {/* Form panel */}
        <div className="px-6 py-8 sm:px-9 sm:py-10">
          {/* Compact route indicator for mobile */}
          <div className="mb-6 md:hidden">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A08A93]">
              Career Route Portal
            </p>
            <RouteRail currentIndex={currentStepIndex} orientation="horizontal" />
          </div>

          <div className="mb-6">
            <h1
              className="text-[26px] leading-tight text-[#1D181A]"
              style={{ fontFamily: "'Fraunces', serif", fontOpticalSizing: 'auto' }}
            >
              Create a new password
            </h1>
            <p className="mt-1.5 text-[13.5px] text-[#80576A]">
              Make it one you haven't used here before. Enter a new, strong password that's different from your current one.
            </p>
          </div>

          {!ready ? (
            <div className="flex items-start gap-3 rounded-2xl border border-[#F3E0DC] bg-[#FDF4F2] px-4 py-3.5">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#B3261E]/10 text-[11px] font-bold text-[#B3261E]">
                !
              </span>
              <p className="text-[13.5px] leading-relaxed text-[#7A3B33]">
                {error || 'Loading reset link…'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A3034]">New password</label>
                <PasswordField
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              {newPassword.length > 0 && (
                <div className="-mt-2 rounded-xl bg-[#FBF7F3] px-3.5 py-3">
                  <div className="mb-1.5 flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                          i < passwordStrength.score
                            ? passwordStrength.score <= 2
                              ? 'bg-[#F28B82]'
                              : passwordStrength.score === 3
                                ? 'bg-[#F5B942]'
                                : 'bg-[#2F4B3C]'
                            : 'bg-[#E9DCCF]'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.isStrong ? (
                    <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#2F4B3C]">
                      <svg viewBox="0 0 12 10" className="h-2.5 w-2.5" fill="none">
                        <path d="M1 5L4.3 8.5L11 1.5" stroke="#2F4B3C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Strong password — accepted
                    </p>
                  ) : (
                    <p className="text-[11.5px] font-medium text-[#8A6A2C]">
                      Use 8+ characters with uppercase, lowercase, a number &amp; a symbol.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-[12.5px] font-semibold text-[#3A3034]">Confirm password</label>
                <PasswordField
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <p className="flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
                  <span className="mt-0.5">⚠</span> {error}
                </p>
              )}
              {success && (
                <p className="flex items-start gap-1.5 text-[13px] font-medium text-[#0F766E]">
                  <span className="mt-0.5">✓</span> {success}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#1D181A] px-4 py-3 text-[13.5px] font-semibold text-white transition-colors duration-150 hover:bg-[#2F4B3C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F4B3C] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Resetting…' : 'Reset password'}
              </button>

              <p className="text-center text-[12px] text-[#A08A93]">
                Remembered it after all? <a href="/" className="font-semibold text-[#3A3034] underline-offset-2 hover:underline">Back to sign in</a>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}