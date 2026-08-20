import { useEffect, useState } from 'react';
import { BriefcaseBusiness, LayoutDashboard, PlusCircle, UsersRound, Wallet } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import RecruiterProfileMenu from './RecruiterProfileMenu';
import { FONT_DISPLAY } from '../theme';
import axiosInstance from '../api/axiosInstance';
import { fetchPlatformBranding, getCachedPlatformBranding } from '../api/platformBranding';

const links = [
    { to: '/recruiter/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/recruiter/post-job', label: 'Post a job', icon: PlusCircle },
    { to: '/recruiter/jobs', label: 'Jobs', icon: BriefcaseBusiness },
    { to: '/recruiter/applicants', label: 'Applicants', icon: UsersRound },
];

function navClass(isActive) {
    return `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors ${
        isActive
            ? 'bg-[#FFF0E8] text-[#C75560]'
            : 'text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#1D181A]'
    }`;
}

export default function RecruiterNavbar() {
    const navigate = useNavigate();
    const [platformBranding, setPlatformBranding] = useState(getCachedPlatformBranding);

    useEffect(() => {
        let active = true;
        fetchPlatformBranding()
            .then((branding) => {
                if (active) setPlatformBranding(branding);
            })
            .catch(() => {
                // Keep the last cached branding when the endpoint is unavailable.
            });
        return () => { active = false; };
    }, []);

    const brandName = platformBranding.siteName;

    return (
        <header className="sticky top-0 z-30 overflow-visible border-b border-[#EBC2AE] bg-[#FFFDFC]/95 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-4 overflow-visible px-5 py-3 sm:px-8">
                <Link to="/recruiter/dashboard" className="flex min-w-[140px] shrink-0 items-center gap-2" aria-label={`${brandName || 'Platform'} recruiter dashboard`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-xs font-extrabold shadow-sm ${platformBranding.siteName || platformBranding.logo ? 'bg-gradient-to-br from-[#C75560] to-[#E7A24B] text-white' : 'animate-pulse bg-[#F3E5DE]'}`}>
                        {platformBranding.logo ? (
                            <img src={platformBranding.logo} alt={`${brandName} logo`} className="h-full w-full object-cover" />
                        ) : (
                            brandName ? brandName.slice(0, 2).toUpperCase() : null
                        )}
                    </span>
                    <span className="flex flex-col">
                        <span className="text-[15px] font-bold tracking-tight text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                            {brandName || <span className="block h-3 w-24 animate-pulse bg-[#F3E5DE]" aria-label="Loading platform name" />}
                        </span>
                        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-[#80576A] sm:block">Recruiter workspace</span>
                    </span>
                </Link>

                <nav className="hidden items-center gap-1 md:flex" aria-label="Recruiter primary navigation">
                    {links.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={({ isActive }) => navClass(isActive)}>
                            <Icon size={15} />
                            {label}
                        </NavLink>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/recruiter/wallet')}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#EBC2AE] bg-[#FFF0E8] px-3 py-2 text-[12px] font-bold text-[#1D181A] transition-all hover:-translate-y-0.5 hover:border-[#C75560]"
                        title="Wallet"
                    >
                        <Wallet size={15} className="text-[#C75560]" />
                        <span className="hidden sm:inline">Wallet</span>
                    </button>

                    <RecruiterProfileMenu />
                </div>
            </div>
            <nav className="mx-auto flex w-full max-w-6xl gap-1 border-t border-[#F0D1BF] px-5 py-1.5 md:hidden sm:px-8" aria-label="Recruiter mobile navigation">
                {links.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => navClass(isActive)}>
                        <Icon size={14} />
                        {label}
                    </NavLink>
                ))}
            </nav>
        </header>
    );
}