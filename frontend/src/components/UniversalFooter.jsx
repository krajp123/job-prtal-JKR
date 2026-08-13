import { Link } from 'react-router-dom';
import { BG, FONT_DISPLAY } from '../theme';

function FacebookIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5 22v-8.5h2.8l.4-3.2h-3.2V3.8c0-.9.3-1.6 1.6-1.6h1.7V.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.3v3.2h2.8V22h3.4z" />
        </svg>
    );
}

function InstagramIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.2A4.8 4.8 0 1 1 7.2 12 4.8 4.8 0 0 1 12 7.2zm0 2A2.8 2.8 0 1 0 14.8 12 2.8 2.8 0 0 0 12 9.2zm5.1-3.2a1.1 1.1 0 1 1-1.1 1.1 1.1 1.1 0 0 1 1.1-1.1z" />
        </svg>
    );
}

function LinkedinIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.98 3.5A2.5 2.5 0 1 1 5 8.5a2.5 2.5 0 0 1-.02-5zM3.5 9.9h3V21h-3V9.9zM9.5 9.9h2.88v1.52h.04c.4-.76 1.38-1.56 2.84-1.56 3.04 0 3.6 2 3.6 4.6V21h-3v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-3V9.9z" />
        </svg>
    );
}

function TwitterIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.9 3H21l-6.7 7.66L22.2 21h-6.2l-4.86-6.34L5.6 21H3.5l7.16-8.2L2 3h6.35l4.4 5.83L18.9 3zm-1.08 16.17h1.15L7.24 4.75H6l11.82 14.42z" />
        </svg>
    );
}

function YoutubeIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 12s0-3.2-.41-4.72a2.87 2.87 0 0 0-2-2.03C17.9 5 12 5 12 5s-5.9 0-7.59.25a2.87 2.87 0 0 0-2 2.03C2 8.8 2 12 2 12s0 3.2.41 4.72a2.87 2.87 0 0 0 2 2.03C6.1 19 12 19 12 19s5.9 0 7.59-.25a2.87 2.87 0 0 0 2-2.03C22 15.2 22 12 22 12zM10 15.2V8.8l5.5 3.2-5.5 3.2z" />
        </svg>
    );
}

const SOCIAL_LINKS = [
    { key: 'facebook', label: 'Facebook', href: 'https://facebook.com', icon: FacebookIcon },
    { key: 'instagram', label: 'Instagram', href: 'https://instagram.com', icon: InstagramIcon },
    { key: 'linkedin', label: 'LinkedIn', href: 'https://linkedin.com', icon: LinkedinIcon },
    { key: 'twitter', label: 'Twitter / X', href: 'https://twitter.com', icon: TwitterIcon },
    { key: 'youtube', label: 'YouTube', href: 'https://youtube.com', icon: YoutubeIcon },
];

const QUICK_LINKS_PRIMARY = [
    { label: 'About Us', to: '/' },
    { label: 'Candidate Home', to: '/candidate/dashboard' },
    { label: 'Recruiter Home', to: '/recruiter/dashboard' },
    { label: 'Contact Us / Support', to: 'mailto:support@jobportal.com' },
];

const QUICK_LINKS_SECONDARY = [
    { label: 'Help Center', to: '/' },
    { label: 'Privacy Policy', to: '/' },
    { label: 'Terms and Services', to: '/' },
];

export default function UniversalFooter() {
    return (
        <footer className="mt-auto border-t border-[#EBC2AE]" style={{ background: BG }}>
            <div className="mx-auto max-w-6xl px-6 py-10">
                <div className="flex flex-col gap-10 md:flex-row md:justify-between">
                    <div className="flex flex-col gap-4">
                        <Link to="/" className="flex items-center gap-2.5">
                            <span className="text-[16px] font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                                Career Route Portal
                            </span>
                        </Link>
                        <div>
                            <p className="mb-2.5 text-[12.5px] font-semibold text-[#1D181A]">Connect With Us</p>
                            <div className="flex items-center gap-2">
                                {SOCIAL_LINKS.map(({ key, label, href, icon: Icon }) => (
                                    <a
                                        key={key}
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EBC2AE] text-[#80576A] transition-colors hover:border-[#C75560] hover:bg-[#FFF0E8] hover:text-[#C75560]"
                                    >
                                        <Icon size={14} />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {QUICK_LINKS_PRIMARY.map((item) => (
                            <Link
                                key={item.label}
                                to={item.to}
                                className="text-[13px] font-medium text-[#80576A] transition-colors hover:text-[#C75560]"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2.5">
                        {QUICK_LINKS_SECONDARY.map((item) => (
                            <Link
                                key={item.label}
                                to={item.to}
                                className="text-[13px] font-medium text-[#80576A] transition-colors hover:text-[#C75560]"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
