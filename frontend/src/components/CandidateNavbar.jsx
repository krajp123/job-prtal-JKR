import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bot, HelpCircle, LogOut, Menu, MessageCircle, Settings, UserRound, X, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { fetchPlatformBranding, getCachedPlatformBranding } from '../api/platformBranding';
import { FONT_DISPLAY, MAROON } from '../theme';
import NotificationCenter from './NotificationCenter';
import Avatar from './Avatar';

const NAV_FRAME = 'max-w-[960px]';

const panelVariants = {
    open: { x: 0, transition: { type: 'tween', duration: 0.25 } },
    closed: { x: '100%', transition: { type: 'tween', duration: 0.12 } },
};

function navigationClass(isActive) {
    return `home-showcase-link candidate-page-nav-link inline-flex items-center gap-1.5 ${
        isActive
            ? 'candidate-page-nav-link--active'
            : ''
    }`;
}

export default function CandidateNavbar({ profile, onOpenAccountMenu }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [accountOpen, setAccountOpen] = useState(false);
    const [menuOpenSlide, setMenuOpenSlide] = useState(false);
    const [jobsDropdownOpen, setJobsDropdownOpen] = useState(false);
    const accountMenuRef = useRef(null);
    const jobsDropdownRef = useRef(null);

    const [resolvedProfile, setResolvedProfile] = useState(profile || null);
    const [platformBranding, setPlatformBranding] = useState(getCachedPlatformBranding);
    const profileFetchAttempted = useRef(false);

    useEffect(() => {
        let mounted = true;
        fetchPlatformBranding()
            .then((branding) => {
                if (mounted) setPlatformBranding(branding);
            })
            .catch(() => {
                // Keep the last cached branding when the endpoint is unavailable.
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (profile) {
            setResolvedProfile(profile);
        }
    }, [profile]);

    const candidateName = resolvedProfile?.name || user?.name || 'Candidate';
    const profilePictureUrl = resolvedProfile?.profile?.profilePictureUrl;

    useEffect(() => {
        function closeMenus(event) {
            if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
                setAccountOpen(false);
            }
            if (jobsDropdownRef.current && !jobsDropdownRef.current.contains(event.target)) {
                setJobsDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', closeMenus);
        return () => document.removeEventListener('mousedown', closeMenus);
    }, []);

    useEffect(() => {
        if (profile || profileFetchAttempted.current) {
            return;
        }

        async function fetchProfilePicture() {
            profileFetchAttempted.current = true;
            try {
                const { data } = await axiosInstance.get('/candidate/me/profile');
                if (data) {
                    setResolvedProfile(data);
                }
            } catch (err) {
                // Ignore if profile fetch fails; avatar fallback handles missing photo.
            }
        }

        fetchProfilePicture();
    }, [profile]);

    function handleAccountMenu() {
        if (onOpenAccountMenu) {
            onOpenAccountMenu();
            return;
        }
        // Toggle the universal slide-over from the Account button; ensure small dropdown is closed
        setAccountOpen(false);
        setMenuOpenSlide((s) => !s);
    }

    function handleLogout() {
        logout();
        navigate('/');
    }

    return (
        <header className="portal-navbar-shell candidate-navbar-shell relative z-50">
            <div className={`portal-navbar candidate-page-nav mx-auto flex items-center gap-3 ${NAV_FRAME}`}>
                <Link to="/candidate/dashboard" className="candidate-brand-lockup flex min-w-0 shrink-0 items-center gap-2.5" aria-label={`${platformBranding.siteName} dashboard`}>
                    {platformBranding.logo ? (
                        <img
                            src={platformBranding.logo}
                            alt={`${platformBranding.siteName} logo`}
                            className="candidate-brand-logo h-9 w-9 shrink-0 rounded-full object-contain"
                        />
                    ) : platformBranding.siteName ? (
                        <span className="candidate-brand-logo flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C75560] bg-[#1D181A] text-[13px] font-bold text-[#F7C56B]">
                            {platformBranding.siteName.slice(0, 1).toUpperCase()}
                        </span>
                    ) : (
                        <span className="candidate-brand-logo block h-9 w-9 shrink-0 animate-pulse rounded-full bg-[#F3E5DE]" aria-label="Loading platform logo" />
                    )}
                    <span className="truncate text-[16px] font-bold tracking-[-0.02em] text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                        {platformBranding.siteName || <span className="inline-block h-3 w-28 animate-pulse bg-[#F3E5DE] align-middle" aria-label="Loading platform name" />}
                    </span>
                </Link>

                <nav className="hidden items-center gap-1 lg:flex" aria-label="Candidate primary navigation">
                    <NavLink 
                        to="/candidate/dashboard" 
                        end 
                        className={({ isActive }) => navigationClass(isActive)}
                    >
                        Home
                    </NavLink>
                    
                    {/* Jobs with Dropdown */}
                    <div 
                        ref={jobsDropdownRef} 
                        className="relative"
                        onMouseEnter={() => { if (!menuOpenSlide) setJobsDropdownOpen(true); }}
                        onMouseLeave={() => { if (!menuOpenSlide) setJobsDropdownOpen(false); }}
                    >
                        <NavLink 
                            to="/candidate/jobs" 
                            className={({ isActive }) => navigationClass(isActive)}
                        >
                            Jobs
                        </NavLink>

                        {jobsDropdownOpen && !menuOpenSlide && (
                            <div 
                                className="absolute left-0 top-full mt-0 w-56 overflow-hidden rounded-xl border border-[#EBC2AE] bg-[#FFFDFC] p-1.5 shadow-[0_18px_36px_-26px_rgba(29,24,26,0.42)] z-40"
                            >
                                <Link
                                    to="/candidate/jobs/recommended"
                                    onClick={() => setJobsDropdownOpen(false)}
                                    className="block rounded-lg px-3 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-[#FFF0E8] hover:text-[#C75560]"
                                >
                                    Recommended Jobs
                                </Link>
                                <Link
                                    to="/candidate/jobs/applied"
                                    onClick={() => setJobsDropdownOpen(false)}
                                    className="block rounded-lg px-3 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-[#FFF0E8] hover:text-[#C75560]"
                                >
                                    Jobs Applied For
                                </Link>
                                <Link
                                    to="/candidate/jobs/saved"
                                    onClick={() => setJobsDropdownOpen(false)}
                                    className="block rounded-lg px-3 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-[#FFF0E8] hover:text-[#C75560]"
                                >
                                    Saved Jobs
                                </Link>
                            </div>
                        )}
                    </div>
                    <NavLink to="/candidate/messages" className={({ isActive }) => navigationClass(isActive)}>
                        Messages
                    </NavLink>
                    <NavLink to="/candidate/resume-match" className={({ isActive }) => navigationClass(isActive)}>
                        <Bot size={14} /> Resume match
                    </NavLink>
                    {/* Universal slide-over when no onOpenAccountMenu prop is provided */}
                    {!onOpenAccountMenu && menuOpenSlide && (typeof document !== 'undefined' ? createPortal(
                        <>
                            <div onClick={() => setMenuOpenSlide(false)} className="fixed inset-0 z-40 bg-stone-900/40" />
                            <motion.div initial="closed" animate="open" exit="closed" variants={panelVariants} className="fixed right-0 top-0 z-60 h-full w-[88%] max-w-sm overflow-y-auto bg-white shadow-2xl rounded-l-2xl">
                                <div className="flex items-center justify-end p-4">
                                    <button
                                        type="button"
                                        onClick={() => setMenuOpenSlide(false)}
                                        aria-label="Close menu"
                                        className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="px-6 pb-10">
                                    <div className="flex items-center gap-3">
                                        <Avatar src={profilePictureUrl} name={candidateName} size={52} />
                                        <div>
                                            <p className="text-[15px] font-bold text-stone-900">{profile?.name || user?.name}</p>
                                            <p className="text-[12px] capitalize text-[#6B6259]">{profile?.workStatus || 'Status not mentioned'}</p>
                                            <Link
                                                to="/candidate/profile"
                                                onClick={() => setMenuOpenSlide(false)}
                                                className="text-[12px] font-semibold"
                                                style={{ color: MAROON }}
                                            >
                                                View &amp; update profile
                                            </Link>
                                        </div>
                                    </div>

                                    <Link
                                        to="/candidate/profile"
                                        onClick={() => setMenuOpenSlide(false)}
                                        className="mt-5 flex items-center justify-between rounded-[14px] p-4 transition-transform hover:-translate-y-0.45"
                                        style={{ background: `${MAROON}0D` }}
                                    >
                                        <div>
                                            <p className="text-[13px] font-semibold text-stone-900">Boost your visibility</p>
                                            <p className="mt-0.5 text-[11.5px] text-[#6B6259]">Complete your profile so recruiters notice you first.</p>
                                        </div>
                                        <ArrowRight size={16} color={MAROON} className="shrink-0" />
                                    </Link>

                                    <div className="mt-6 border-t border-stone-100 pt-5">
                                        <div className="mb-3 flex items-center justify-between">
                                            <p className="text-[12.5px] font-bold text-stone-900">Your profile performance</p>
                                            <span className="text-[11px] text-[#6B6259]">Last 90 days</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-[12px] p-3.5" style={{ background: '#F5F3F0' }}>
                                                <p className="text-[20px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                                    {profile?.searchAppearances ?? 0}
                                                </p>
                                                <p className="text-[11.5px] text-[#6B6259]">Search Appearances</p>
                                                <Link
                                                    to="/candidate/profile"
                                                    onClick={() => setMenuOpenSlide(false)}
                                                    className="mt-1 inline-block text-[11px] font-semibold"
                                                    style={{ color: MAROON }}
                                                >
                                                    View all
                                                </Link>
                                            </div>
                                            <div className="rounded-[12px] p-3.5" style={{ background: '#F5F3F0' }}>
                                                <p className="text-[20px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                                    {profile?.recruiterActions ?? 0}
                                                </p>
                                                <p className="text-[11.5px] text-[#6B6259]">Recruiter Actions</p>
                                                <Link
                                                    to="/candidate/profile"
                                                    onClick={() => setMenuOpenSlide(false)}
                                                    className="mt-1 inline-block text-[11px] font-semibold"
                                                    style={{ color: MAROON }}
                                                >
                                                    View all
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                <div className="mt-6 flex flex-col divide-y divide-stone-100 border-t border-stone-100 text-[13.5px] text-stone-700">
                                    <Link
                                        to="/candidate/settings"
                                        onClick={() => setMenuOpenSlide(false)}
                                        className="flex items-center gap-3 py-3.5 text-[#1D181A] hover:text-[#54263F]"
                                    >
                                        <Settings size={16} className="text-[#6B6259]" />
                                        Settings
                                    </Link>
                                    <Link
                                        to="/faqs"
                                        onClick={() => setMenuOpenSlide(false)}
                                        className="flex items-center gap-3 py-3.5 text-[#1D181A] hover:text-[#54263F]"
                                    >
                                        <HelpCircle size={16} className="text-[#6B6259]" />
                                        FAQs
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 py-3.5 text-left text-[#B23B3B]"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>, document.body) : null)}
                </nav>
                <div className="candidate-page-nav-actions">
                    <NotificationCenter className="candidate-page-nav-icon" />
                    <Link to="/candidate/messages" aria-label="Messages" title="Messages" className="candidate-page-nav-icon lg:hidden">
                        <MessageCircle size={16} />
                    </Link>

                    <div ref={accountMenuRef} className="relative">
                        <button
                            type="button"
                            onClick={handleAccountMenu}
                            aria-label="Open account menu"
                            aria-expanded={onOpenAccountMenu ? undefined : accountOpen}
                            className="home-showcase-login candidate-page-account flex items-center gap-2"
                        >
                            <Avatar src={profilePictureUrl} name={candidateName} size={32} />
                            <span className="hidden sm:inline text-[13px] font-semibold truncate max-w-[100px]">{candidateName.split(' ')[0]}</span>
                        </button>

                        {!onOpenAccountMenu && accountOpen && (
                            <div className="absolute right-0 top-full z-30 mt-2 w-48 overflow-hidden rounded-xl border border-[#EBC2AE] bg-[#FFFDFC] p-1.5 shadow-[0_18px_36px_-26px_rgba(29,24,26,0.42)]">
                                <div className="flex items-center gap-2.5 px-3 py-2">
                                    <Avatar src={profilePictureUrl} name={candidateName} size={28} />
                                    <p className="min-w-0 truncate text-[12px] font-bold text-[#1D181A]">{candidateName}</p>
                                </div>
                                <Link
                                    to="/candidate/profile"
                                    onClick={() => setAccountOpen(false)}
                                    className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[12.5px] font-semibold text-[#54263F] transition-colors hover:bg-[#FFF0E8] hover:text-[#C75560]"
                                >
                                    <UserRound size={15} />
                                    Profile
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[12.5px] font-semibold text-[#B23B3B] transition-colors hover:bg-[#FBE9E9]"
                                >
                                    <LogOut size={15} />
                                    Sign out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <nav className={`candidate-page-mobile-links mx-auto flex items-center gap-1 lg:hidden ${NAV_FRAME}`} aria-label="Candidate mobile navigation">
                <NavLink to="/candidate/dashboard" end className={({ isActive }) => navigationClass(isActive)}>
                    Home
                </NavLink>
                <NavLink to="/candidate/jobs" className={({ isActive }) => navigationClass(isActive)}>
                    Jobs
                </NavLink>
                <NavLink to="/candidate/messages" className={({ isActive }) => navigationClass(isActive)}>Messages</NavLink>
                <NavLink to="/candidate/resume-match" className={({ isActive }) => navigationClass(isActive)}><Bot size={14} /></NavLink>
            </nav>
        </header>
    );
}