import { AnimatePresence, motion } from 'framer-motion';
import { Briefcase, Building2, ChevronRight, Home, PlayCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import { AMBER_DARK, GOLD, GOLD_DARK, NEAR_BLACK } from '../theme';

const PANEL_ACCENT = AMBER_DARK;
const PANEL_DARK = NEAR_BLACK;

export default function CareerWorkspacePanel({ profile, user, completeness, missingItems, expanded, onToggle, onOpenVideo, compact = false }) {
    const candidateName = profile?.name || user?.name || 'Your profile';
    const compactRail = compact && !expanded;

    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse career workspace' : 'Expand career workspace'}
                className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C75560] ${expanded ? 'border-[#1D181A] text-white shadow-[0_16px_30px_-20px_rgba(29,24,26,0.62)]' : 'border-[#EBC2AE] bg-[#FFFDFC] text-[#1D181A] shadow-[0_12px_26px_-22px_rgba(29,24,26,0.32)] hover:border-[#C75560] hover:bg-[#FFF0E8]'} ${compactRail ? 'flex-col justify-center gap-2 px-2 py-3' : ''}`}
                style={expanded ? { background: `linear-gradient(135deg, ${PANEL_DARK}, ${PANEL_ACCENT})` } : undefined}
            >
                <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-[2px]" style={{ background: `conic-gradient(${GOLD} ${completeness * 3.6}deg, #EFEDEA 0deg)` }}>
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white"><Avatar src={profile?.profile?.profilePictureUrl} name={candidateName} size={compactRail ? 30 : 34} /></div>
                    </div>
                    <span className="absolute -bottom-1 -right-2 rounded-full bg-white px-1 py-0.5 text-[9px] font-bold shadow-sm" style={{ color: GOLD_DARK }}>{completeness}%</span>
                </div>
                <div className={compactRail ? 'hidden' : 'min-w-0 flex-1'}>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${expanded ? 'text-[#F0C9D1]' : 'text-[#9C7A2E]'}`}>Profile</p>
                    <p className="truncate text-[13px] font-bold">{candidateName}</p>
                    <p className={`truncate text-[11px] ${expanded ? 'text-[#F4DEE2]' : 'text-[#6B6259]'}`}>{expanded ? `ID: ${profile?.uniqueId || 'Not assigned'}` : 'Profile and quick links'}</p>
                </div>
                <ChevronRight size={17} className={`shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {compactRail && <nav aria-label="Candidate navigation" className="mt-3 flex flex-col items-center gap-2 rounded-2xl border border-[#EBC2AE] bg-[#FFFDFC] p-2 shadow-[0_12px_26px_-22px_rgba(29,24,26,0.28)]">
                <Link to="/candidate/dashboard" aria-label="Home" title="Home" className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${PANEL_ACCENT}18`, color: PANEL_ACCENT }}><Home size={17} /></Link>
                <Link to="/candidate/jobs/applied" aria-label="Applied Jobs" title="Applied Jobs" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B6259] hover:bg-[#FFF5D9] hover:text-[#9A671A]"><Briefcase size={17} /></Link>
                <Link to="/candidate/dashboard#top-companies" aria-label="Companies" title="Companies" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#6B6259] hover:bg-[#FFF5D9] hover:text-[#9A671A]"><Building2 size={17} /></Link>
            </nav>}

            <AnimatePresence initial={false}>
                {expanded && <motion.div initial={{ opacity: 0, height: 0, y: -6 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -6 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="mt-2.5 rounded-xl border border-[#EBC2AE] bg-[#FFFDFC] p-4 shadow-[0_16px_36px_-28px_rgba(29,24,26,0.28)]">
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#F7C56B]/50 bg-[#FFF5D9] px-3.5 py-3"><div><p className="text-[12px] font-bold text-[#1D181A]">Profile readiness</p><p className="mt-0.5 text-[11px] text-[#80576A]">Complete your details to improve matches.</p></div><span className="shrink-0 text-[12px] font-bold" style={{ color: GOLD_DARK }}>{completeness}%</span></div>
                        {missingItems.length > 0 && <div className="mt-4 rounded-xl border border-[#F7C56B]/50 bg-[#FFF5D9] p-3.5"><p className="text-[12.5px] font-bold text-stone-900">What are you missing?</p><ul className="mt-2.5 space-y-2">{missingItems.map((item) => <li key={item.key} className="flex items-center gap-2 text-[11.5px] text-[#6B6259]"><XCircle size={13} color="#9A671A" className="shrink-0" />{item.label}</li>)}</ul><Link to="/candidate/profile" className="mt-3 block rounded-xl py-2.5 text-center text-[12px] font-semibold text-white" style={{ background: `linear-gradient(135deg, ${PANEL_DARK}, ${PANEL_ACCENT})` }}>Complete Profile</Link></div>}
                        <nav className="mt-4 flex flex-col gap-1 border-t border-stone-100 pt-4 text-[12.5px] font-semibold text-[#6B6259]"><Link to="/candidate/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: `${PANEL_ACCENT}18`, color: PANEL_ACCENT }}><Home size={15} />Home</Link><Link to="/candidate/jobs/applied" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-[#FFF5D9] hover:text-[#9A671A]"><Briefcase size={15} />Applied Jobs</Link><Link to="/candidate/companies" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-[#FFF5D9] hover:text-[#9A671A]"><Building2 size={15} />Companies</Link><button type="button" onClick={onOpenVideo} className="mt-2 flex items-center gap-2.5 rounded-xl border border-stone-200 px-3 py-2.5 text-left text-[12.5px] font-semibold text-stone-700 hover:border-[#F7C56B] hover:bg-[#FFF5D9]"><PlayCircle size={15} color={GOLD_DARK} />How it Works</button></nav>
                    </div>
                </motion.div>}
            </AnimatePresence>
        </div>
    );
}