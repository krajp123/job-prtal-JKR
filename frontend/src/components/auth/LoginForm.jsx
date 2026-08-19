import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { useAuth } from '../../context/AuthContext';
import FormField from './FormField';
import PasswordField from './PasswordField';

const FONT_DISPLAY = "'Space Grotesk','Inter',ui-sans-serif,sans-serif";

// role is passed in from AuthModal ('candidate' | 'recruiter') — no role
// radio buttons here since the modal already knows which one opened it.
export default function LoginForm({ role, onSuccess, onForgotPassword }) {
    const [uniqueId, setUniqueId] = useState(''); // candidate's login ID (emailed at registration)
    const [identifier, setIdentifier] = useState(''); // recruiter: email
    const [password, setPassword] = useState(''); // both roles need this
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const endpoint = role === 'candidate' ? '/candidate/login' : '/recruiter/login';
            const payload = role === 'candidate' ? { uniqueId, password } : { email: identifier, password };

            const { data } = await axiosInstance.post(endpoint, payload);
            login({ token: data.token, role, name: data.name || data.companyName });

            onSuccess?.();
            navigate(role === 'candidate' ? '/candidate/dashboard' : '/recruiter/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="mb-1 text-[22px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                {role === 'candidate' ? 'Candidate Log In' : 'Recruiter Log In'}
            </h2>
            <p className="mb-5 text-[13px] text-[#80576A]">
                {role === 'candidate'
                    ? 'Log in with the ID emailed to you at registration.'
                    : 'Welcome back — manage your hiring.'}
            </p>

            {role === 'candidate' ? (
                <>
                    <FormField
                        type="text"
                        placeholder="Unique ID (e.g. 20000AB1C)"
                        value={uniqueId}
                        autoComplete="username"
                        onChange={(e) => setUniqueId(e.target.value)}
                        required
                    />
                    <PasswordField
                        placeholder="Password"
                        value={password}
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </>
            ) : (
                <>
                    <FormField
                        type="email"
                        placeholder="Work email"
                        value={identifier}
                        autoComplete="email"
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                    />
                    <PasswordField
                        type="password"
                        placeholder="Password"
                        value={password}
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </>
            )}

            {error && <p className="mb-3 text-[12.5px] font-medium text-[#B3261E]">{error}</p>}

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-[12px] bg-[#1D181A] px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(29,24,26,0.6)] transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#3A3034] disabled:opacity-60 disabled:hover:translate-y-0"
            >
                {loading ? 'Logging in…' : 'Log In'}
            </button>

            {role === 'candidate' ? (
                <p className="mt-3 flex items-center justify-center gap-2 text-center text-[12.5px] text-[#80576A]">
                    <a href="/id-recovery" className="underline hover:text-[#C75560]">
                        Forgot your Unique ID?
                    </a>
                    <span className="text-[#D6B0A2]">•</span>
                    <button
                        type="button"
                        onClick={onForgotPassword}
                        className="underline hover:text-[#C75560]"
                    >
                        Forgot password?
                    </button>
                </p>
            ) : (
                <p className="mt-3 text-center text-[12.5px] text-[#80576A]">
                    <button type="button" onClick={onForgotPassword} className="underline hover:text-[#C75560]">
                        Forgot password?
                    </button>
                </p>
            )}
        </form>
    );
}