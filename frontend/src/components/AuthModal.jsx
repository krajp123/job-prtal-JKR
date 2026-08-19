import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BriefcaseBusiness, Play, Search, Sparkles } from 'lucide-react';
import LoginForm from './auth/LoginForm';
import CandidateRegisterForm from './auth/CandidateRegisterForm';
import RecruiterRegisterForm from './auth/RecruiterRegisterForm';
import ForgotPasswordForm from './auth/ForgotPasswordForm';
import VideoModal from './VideoModal';

const FONT_DISPLAY = "'Space Grotesk','Inter',ui-sans-serif,sans-serif";

// Left-panel promo copy differs by role — candidates see job-search framing,
// recruiters see hiring framing.
const PROMO_COPY = {
    candidate: {
        heading: ['Find your next role.', 'Instantly.', ],
        body: 'Join Job Portal to discover matched openings, track every application, and land your next role — all in one place.',
    },
    recruiter: {
        heading: ['Find your next hire.', 'Faster & Smarter.'],
        body: 'Join Job Portal to post openings, review candidates, and close roles quicker — all in one dashboard.',
    },
};

/**
 * Props
 * - isOpen: boolean
 * - role: 'candidate' | 'recruiter'
 * - mode: 'login' | 'register' | 'forgot-password'
 * - onClose: () => void
 * - onModeChange: (mode: 'login' | 'register') => void
 * - onRoleChange: (role: 'candidate' | 'recruiter') => void   (optional — lets user switch tabs)
 */
export default function AuthModal({ isOpen, role, mode, onClose, onModeChange, onRoleChange }) {
    const [videoOpen, setVideoOpen] = useState(false);
    const promo = PROMO_COPY[role] || PROMO_COPY.candidate;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    >
                        <div className="absolute inset-0 bg-[#1D181A]/35 backdrop-blur-md" />

                        {/* card — two panels: brand/promo (left) + form (right).
                           Login has far fewer fields than Register, so we use a
                           narrower card in login mode instead of stretching two
                           short fields across a wide 900px box. */}
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="auth-modal-title"
                            className={`auth-theme relative grid w-full grid-cols-1 overflow-hidden rounded-[20px] border border-[#EBC2AE] bg-[#FFFDFC] shadow-[0_30px_80px_-20px_rgba(29,24,26,0.38)] ${
                                mode === 'login' || mode === 'forgot-password'
                                    ? 'max-w-[680px] md:grid-cols-[0.85fr_1fr]'
                                    : 'max-w-[900px] md:grid-cols-[1fr_1.1fr]'
                            }`}
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="auth-promo-panel relative hidden flex-col justify-between overflow-hidden p-8 md:flex">
                                <div className="auth-promo-orb auth-promo-orb--one" />
                                <div className="auth-promo-orb auth-promo-orb--two" />

                                <div className="relative z-10 flex items-center gap-3 text-[#1D181A]">
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1D181A] text-[#F7C56B] shadow-[0_12px_22px_-15px_rgba(29,24,26,0.75)]">
                                        {role === 'candidate' ? <Search size={18} /> : <BriefcaseBusiness size={18} />}
                                    </span>
                                    <span className="text-[15px] font-bold" style={{ fontFamily: FONT_DISPLAY }}>
                                        Career Route Portal
                                    </span>
                                </div>

                                <div className="relative z-10">
                                    <h2
                                        className="mb-3 text-[30px] font-bold leading-[1.15] text-[#1D181A]"
                                        style={{ fontFamily: FONT_DISPLAY }}
                                    >
                                        {promo.heading.map((line, i) => (
                                            <span key={i}>
                                                {line}
                                                {i < promo.heading.length - 1 && <br />}
                                            </span>
                                        ))}
                                    </h2>
                                    <p className="mb-6 max-w-[300px] text-[13.5px] leading-[1.6] text-[#80576A]">
                                        {promo.body}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => setVideoOpen(true)}
                                        className="inline-flex items-center gap-2.5 rounded-full border border-[#1D181A] bg-[#1D181A] px-4 py-2 text-[12.5px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#3A3034]"
                                    >
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F7C56B] text-[#1D181A]">
                                            <Play size={12} fill="currentColor" />
                                        </span>
                                        Watch demo
                                    </button>
                                </div>

                                <div className="relative z-10 inline-flex items-center gap-2 text-[11.5px] font-medium text-[#80576A]">
                                    <Sparkles size={13} className="text-[#C75560]" /> Built for the work ahead
                                </div>
                            </div>

                            <div
                                className={`auth-form-surface relative flex max-h-[90vh] flex-col overflow-y-auto bg-[#FFFDFC] p-6 sm:p-8 ${
                                    mode === 'login' || mode === 'forgot-password' ? 'justify-center sm:py-14' : 'justify-start'
                                }`}
                            >
                                <button
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-[#80576A] transition-colors hover:bg-[#FFF0E8] hover:text-[#1D181A]"
                                >
                                    ✕
                                </button>

                                {/* role tabs — only shown if the caller allows switching role */}
                                {onRoleChange && (
                                    <div className="mb-5 flex gap-1.5 rounded-[12px] border border-[#F0D1BF] bg-[#FFF0E8] p-1">
                                        {['candidate', 'recruiter'].map((r) => (
                                            <button
                                                key={r}
                                                onClick={() => onRoleChange(r)}
                                                className={`flex-1 rounded-[9px] py-1.5 text-[12.5px] font-semibold capitalize transition-colors ${
                                                    role === r
                                                        ? 'bg-[#1D181A] text-white shadow-[0_8px_16px_-12px_rgba(29,24,26,0.8)]'
                                                            : 'text-[#80576A] hover:bg-[#FFE1D2] hover:text-[#54263F]'
                                                }`}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div id="auth-modal-title" className="sr-only">
                                    {role} {mode}
                                </div>

                                {/* Only ONE of these is ever rendered — that's what hides the others */}
                                {mode === 'login' ? (
                                    <>
                                        <LoginForm
                                            role={role}
                                            onSuccess={onClose}
                                            onForgotPassword={() => onModeChange('forgot-password')}
                                        />
                                        <p className="mt-4 text-center text-[12.5px] text-[#80576A]">
                                            New here?{' '}
                                            <button
                                                type="button"
                                                onClick={() => onModeChange('register')}
                                                className="font-semibold text-[#C75560] underline underline-offset-2 hover:text-[#1D181A]"
                                            >
                                                Create an account
                                            </button>
                                        </p>
                                    </>
                                ) : mode === 'forgot-password' ? (
                                    <ForgotPasswordForm role={role} onSwitchToLogin={() => onModeChange('login')} />
                                ) : role === 'candidate' ? (
                                    <CandidateRegisterForm
                                        onSwitchToLogin={() => onModeChange('login')}
                                        onSuccess={onClose}
                                    />
                                ) : (
                                    <RecruiterRegisterForm onSwitchToLogin={() => onModeChange('login')} />
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
        </>
    );
}