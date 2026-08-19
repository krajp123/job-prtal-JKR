import { useState, useMemo } from 'react';
import axiosInstance from '../../api/axiosInstance';
import FormField from './FormField';
import PasswordField from './PasswordField';

const FONT_DISPLAY = "'Space Grotesk','Inter',ui-sans-serif,sans-serif";

export default function ForgotPasswordForm({ role = 'candidate', onSwitchToLogin }) {
    const [step, setStep] = useState('id'); // 'id' | 'reset' | 'done'
    const [uniqueId, setUniqueId] = useState('');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    async function handleSendOtp(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const endpoint = role === 'candidate' ? '/candidate/password/forgot/send' : '/recruiter/password/forgot/send';
            const payload = role === 'candidate' ? { uniqueId } : { email };
            const { data } = await axiosInstance.post(endpoint, payload);
            setMaskedEmail(data.maskedEmail || '');
            setStep('reset');
        } catch (err) {
            setError(err.response?.data?.error || 'Could not send OTP');
        } finally {
            setSubmitting(false);
        }
    }

    async function handleReset(e) {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match.');
        }
        if (!passwordStrength.isStrong) {
            return setError('Please choose a stronger password before continuing.');
        }
        setSubmitting(true);
        try {
            const endpoint = role === 'candidate' ? '/candidate/password/forgot/reset' : '/recruiter/password/forgot/reset';
            const payload = role === 'candidate' ? { uniqueId, code, newPassword } : { email, code, newPassword };
            await axiosInstance.post(endpoint, payload);
            setStep('done');
        } catch (err) {
            setError(err.response?.data?.error || 'Could not reset password');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div>
            <h2 className="mb-1 text-[22px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                Forgot Password
            </h2>

            {step === 'id' && (
                <>
                    <p className="mb-5 text-[13px] text-[#80576A]">
                        {role === 'candidate'
                            ? "Enter your Unique ID — we'll send a verification code to your registered email."
                            : "Enter your work email — we'll send a verification code to your registered email."}
                    </p>
                    <form onSubmit={handleSendOtp}>
                        <FormField
                            type={role === 'candidate' ? 'text' : 'email'}
                            placeholder={role === 'candidate' ? 'Unique ID' : 'Work email'}
                            value={role === 'candidate' ? uniqueId : email}
                            onChange={(e) => role === 'candidate' ? setUniqueId(e.target.value) : setEmail(e.target.value)}
                            required
                        />
                        {error && <p className="mb-3 text-[12.5px] font-medium text-[#F28B82]">{error}</p>}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-[12px] bg-[#1D181A] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(29,24,26,0.6)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#3A3034] disabled:opacity-60 disabled:hover:translate-y-0"
                        >
                            {submitting ? 'Sending…' : 'Send Code'}
                        </button>
                    </form>
                </>
            )}

            {step === 'reset' && (
                <>
                    <p className="mb-5 text-[13px] text-[#80576A]">
                        Code sent to <span className="text-[#54263F]">{maskedEmail || 'your registered email'}</span>.
                        Enter it below along with your new password.
                    </p>
                    <form onSubmit={handleReset}>
                        <FormField
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter OTP"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                        />
                        <PasswordField
                            placeholder="New password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />

                        {newPassword.length > 0 && (
                            <div className="-mt-2 mb-3">
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
                                                          : passwordStrength.score === 4
                                                            ? 'bg-[#9BCB6C]'
                                                            : 'bg-[#81C995]'
                                                    : 'bg-[#F1D7CB]'
                                            }`}
                                        />
                                    ))}
                                </div>
                                {passwordStrength.isStrong ? (
                                    <p className="text-[11.5px] font-medium text-[#9A671A]">
                                        ✓ Strong password — accepted
                                    </p>
                                ) : (
                                    <p className="text-[11.5px] font-medium text-[#B3261E]">
                                        Not a strong password — use 8+ characters with uppercase, lowercase, a
                                        number &amp; a symbol.
                                    </p>
                                )}
                            </div>
                        )}

                        <PasswordField
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        {error && <p className="mb-3 text-[12.5px] font-medium text-[#F28B82]">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-[12px] bg-[#1D181A] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(29,24,26,0.6)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#3A3034] disabled:opacity-60 disabled:hover:translate-y-0"
                        >
                            {submitting ? 'Resetting…' : 'Reset Password'}
                        </button>
                    </form>
                </>
            )}

            {step === 'done' && (
                <>
                    <p className="mb-5 text-[13px] text-[#9A671A]">
                        ✓ Your password has been reset. You can now log in with your new password.
                    </p>
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="w-full rounded-[12px] bg-[#1D181A] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(29,24,26,0.6)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#3A3034]"
                    >
                        Back to Log In
                    </button>
                </>
            )}

            {step !== 'done' && (
                <p className="mt-3 text-center text-[12.5px] text-[#80576A]">
                    Remembered your password?{' '}
                    <button
                        type="button"
                        onClick={onSwitchToLogin}
                        className="font-semibold text-[#C75560] underline underline-offset-2 hover:text-[#1D181A]"
                    >
                        Log in
                    </button>
                </p>
            )}
        </div>
    );
}