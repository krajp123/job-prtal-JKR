import { BriefcaseBusiness, LayoutDashboard, PlusCircle, UsersRound, Wallet } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import RecruiterProfileMenu from './RecruiterProfileMenu';
import { FONT_DISPLAY } from '../theme';

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

    return (
        <header className="sticky top-0 z-30 overflow-visible border-b border-[#EBC2AE] bg-[#FFFDFC]/95 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-6xl items-center gap-4 overflow-visible px-5 py-3 sm:px-8">
                <Link to="/recruiter/dashboard" className="flex shrink-0 flex-col" aria-label="Career Route Portal recruiter dashboard">
                    <span className="text-[15px] font-bold tracking-tight text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                        Career Route Portal
                    </span>
                    <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-[#80576A] sm:block">Recruiter workspace</span>
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