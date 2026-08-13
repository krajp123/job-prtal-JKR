// import { motion } from 'framer-motion';
// import { Award, Flame, Lock, Sparkles } from 'lucide-react';
// import { FONT_DISPLAY, MAROON, MAROON_DARK, ACCENT } from '../theme';

// // Every possible badge the candidate can earn. `key` must match what the
// // backend writes into gamification.badges[].key (see badge.service.js).
// const ALL_BADGES = [
//     { key: 'profile_complete', label: 'Profile Complete', hint: 'Fill in skills, experience/education, and a resume' },
//     { key: 'first_application', label: 'First Application', hint: 'Apply to your first job' },
// ];

// function BadgeTile({ label, hint, unlocked }) {
//     return (
//         <div
//             className="flex flex-col items-center gap-2 rounded-[14px] border p-4 text-center"
//             style={
//                 unlocked
//                     ? { borderColor: `${MAROON}30`, background: `${MAROON}08` }
//                     : { borderColor: '#e7e5e4', background: '#fafaf9' }
//             }
//         >
//             <div
//                 className="flex h-10 w-10 items-center justify-center rounded-full"
//                 style={unlocked ? { background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` } : { background: '#e7e5e4' }}
//             >
//                 {unlocked ? <Award size={17} color="white" /> : <Lock size={15} className="text-stone-400" />}
//             </div>
//             <p className="text-[12px] font-semibold text-stone-800">{label}</p>
//             {!unlocked && <p className="text-[10.5px] text-stone-400">{hint}</p>}
//         </div>
//     );
// }

// export function HiredBadgeGlow({ isHired }) {
//     if (!isHired) return null;
//     return (
//         <motion.div
//             initial={{ opacity: 0, scale: 0.9 }}
//             animate={{ opacity: 1, scale: 1 }}
//             className="relative flex items-center gap-2 overflow-hidden rounded-full px-4 py-2"
//             style={{
//                 background: 'linear-gradient(135deg, #F5C451, #E8879C, #8B1E2F)',
//                 boxShadow: '0 0 22px rgba(232,135,156,0.55)',
//             }}
//         >
//             <motion.div
//                 className="absolute inset-0"
//                 style={{ background: 'linear-gradient(120deg, transparent, rgba(255,255,255,0.55), transparent)' }}
//                 animate={{ x: ['-120%', '120%'] }}
//                 transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
//             />
//             <Sparkles size={14} className="relative text-white" />
//             <span className="relative text-[12.5px] font-bold text-white">Hired</span>
//         </motion.div>
//     );
// }

// export default function GamificationPanel({ gamification, isHired }) {
//     const unlockedKeys = new Set((gamification?.badges || []).map((b) => b.key));
//     const loginStreak = gamification?.loginStreak?.count || 0;
//     const applicationStreak = gamification?.applicationStreak?.count || 0;

//     return (
//         <div className="rounded-[20px] border border-stone-200/70 bg-white p-6">
//             <div className="mb-4 flex items-center justify-between">
//                 <h2 className="text-[16px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
//                     Achievements
//                 </h2>
//                 <HiredBadgeGlow isHired={isHired} />
//             </div>

//             {/* Streaks */}
//             <div className="mb-5 grid grid-cols-2 gap-3">
//                 <div className="flex items-center gap-3 rounded-[14px] border border-stone-100 p-3.5">
//                     <Flame size={20} color="#E8874C" />
//                     <div>
//                         <p className="text-[16px] font-bold text-stone-900">{loginStreak}</p>
//                         <p className="text-[11px] text-[#6B6259]">Day login streak</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-3 rounded-[14px] border border-stone-100 p-3.5">
//                     <Flame size={20} color={MAROON} />
//                     <div>
//                         <p className="text-[16px] font-bold text-stone-900">{applicationStreak}</p>
//                         <p className="text-[11px] text-[#6B6259]">Week application streak</p>
//                     </div>
//                 </div>
//             </div>

//             {/* Badges */}
//             <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
//                 {ALL_BADGES.map((b) => (
//                     <BadgeTile key={b.key} label={b.label} hint={b.hint} unlocked={unlockedKeys.has(b.key)} />
//                 ))}
//             </div>
//         </div>
//     );
// }
