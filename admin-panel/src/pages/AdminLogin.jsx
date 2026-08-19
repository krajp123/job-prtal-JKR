import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Boxes } from 'lucide-react';
import adminAxiosInstance from '../api/adminAxiosInstance';
import { useAdminAuth } from '../context/AdminAuthContext';

const SUCCESS_ANIM_MS = 1100;
const ERROR_ANIM_MS = 1100;

export default function AdminLoginThreeD() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [forgotNote, setForgotNote] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [formVersion, setFormVersion] = useState(0);
  const navigate = useNavigate();
  const { login } = useAdminAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('submitting');

    try {
      const { data } = await adminAxiosInstance.post('/auth/login', {
        email,
        password,
      });

      login(data);
      setStatus('success');
      navigate('/');
    } catch (err) {
      setStatus('error');
      const errorMessage =
        err.response?.status === 401
          ? err.response?.data?.error || 'Wrong ID/Password'
          : err.response?.status === 423
          ? 'This admin account is temporarily locked. Try again later.'
          : err.response?.status === 429
          ? 'Too many login attempts. Try again later.'
          : err.response?.data?.error ||
        err.response?.statusText ||
        err.message ||
        'Login failed. Check your credentials and try again.';
      setError(errorMessage);
      console.error('Admin login failed:', err);
      setPassword('');
      setFormVersion((version) => version + 1);
      setTimeout(() => setStatus('idle'), ERROR_ANIM_MS);
    }
  }

  const isBusy = status === 'submitting' || status === 'success';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FFF4EF] px-4 py-10 font-sans">
      <div className="w-full max-w-[850px] rounded-[24px] overflow-hidden shadow-[0_30px_70px_-20px_rgba(16,26,61,0.16)] flex flex-col md:flex-row bg-[#FFFDFB] border border-[#EBC2AE]">
        {/* LEFT — fills exactly half the card, orbiting-network animation + admin copy */}
        <div className="relative md:w-1/2 flex flex-col bg-gradient-to-br from-[#241A2E] via-[#4D2F45] to-[#8A5A56] min-h-[400px] md:min-h-[600px] overflow-hidden">
          <div className="relative flex-1 min-h-[260px]">
            <OrbitNetwork users={DECORATIVE_RECRUITERS} />
          </div>

          <div className="relative z-10 px-7 pb-4 sm:px-6 sm:pb-6">
            <h2 className="font-serif italic text-white text-[30px] sm:text-[36px] leading-[1.15]">
              Grow your
              <br />
              hiring network.
            </h2>
            <p className="mt-3 text-[12.5px] text-white/55 leading-relaxed max-w-[280px]">
              One secure sign-in to manage every job, recruiter and candidate on JobPortal.
            </p>
          </div>
        </div>

        {/* RIGHT — form, same footprint/sizing as before */}
        <div className="md:w-1/2 px-6 py-8 sm:px-10 sm:py-10 flex flex-col justify-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
            }}
          >
      

            <motion.h1
              variants={fadeUp}
              className="text-[26px] sm:text-[28px] font-extrabold text-[#1D181A] leading-[1.15]"
            >
              Welcome
            </motion.h1>
            <motion.h1
              variants={fadeUp}
              className="text-[26px] sm:text-[28px] font-extrabold text-[#1D181A] leading-[1.15] mb-8"
            >
              To <span className="text-[#C75560]"> Admin Login</span>
            </motion.h1>

            <form key={formVersion} onSubmit={(event) => event.preventDefault()} className="space-y-4" noValidate autoComplete="off" data-form-type="other" data-lpignore="true" data-1p-ignore="true">
              <motion.div variants={fadeUp}>
                <label htmlFor="admin-email" className="block mb-1.5 text-[13px] font-semibold text-[#374151]">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
                  <input
                    id="admin-email"
                    name="admin-login-identifier"
                    type="email"
                    autoComplete="new-username"
                    data-lpignore="true"
                    placeholder="Enter your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isBusy}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#FFF9F5] text-[14.5px] text-[#1D181A] outline-none transition-colors focus:border-[#C75560] disabled:bg-[#F7F8FA] disabled:opacity-70"
                  />
                </div>
              </motion.div>

              <motion.div variants={fadeUp}>
                <label htmlFor="admin-password" className="block mb-1.5 text-[13px] font-semibold text-[#374151]">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" strokeWidth={2} />
                  <input
                    id="admin-password"
                    name="admin-login-secret"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    data-lpignore="true"
                    placeholder="Enter your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isBusy}
                    required
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-[#E5E7EB] bg-[#FFF9F5] text-[14.5px] text-[#1D181A] outline-none transition-colors focus:border-[#C75560] disabled:bg-[#F7F8FA] disabled:opacity-70"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-[13px] text-[#374151] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-[#D1D5DB] text-[#C75560] focus:ring-[#C75560]"
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  onClick={() => setForgotNote((v) => !v)}
                  className="text-[13px] font-medium text-[#C75560] hover:underline"
                >
                  Forgot Password?
                </button>
              </motion.div>

              <AnimatePresence>
                {forgotNote && (
                  <motion.p
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    className="text-[12.5px] text-[#6B7280] overflow-hidden"
                  >
                    Admin passwords are reset by your system administrator directly on the backend.
                  </motion.p>
                )}
              </AnimatePresence>

              {error && (
                <p role="alert" aria-live="assertive" className="text-left text-[13px] font-medium text-red-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isBusy}
                className={`w-full rounded-xl border-2 py-3 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  status === 'success'
                    ? 'border-[#5B3A52] bg-[#5B3A52] text-white'
                    : 'border-[#C75560] text-[#C75560] hover:bg-[#C75560] hover:text-white'
                }`}
              >
                {status === 'submitting' ? 'Checking…' : status === 'success' ? 'Welcome back' : 'Login'}
              </button>
            </form>

            <motion.p variants={fadeUp} className="mt-7 text-[12.5px] text-[#9CA3AF] leading-relaxed">
              Admin accounts are managed directly on the backend. Contact your system administrator if you do not have an account.
            </motion.p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const DECORATIVE_NAMES = [
  'Ananya Sharma', 'Rohan Mehta', 'Priya Nair', 'Karan Verma',
  'Sara Khan', 'Aditya Rao', 'Meera Iyer', 'Vikram Singh',
  'Diya Kapoor', 'Arjun Das', 'Nisha Reddy', 'Yusuf Ali',
  'Tara Bose', 'Ishaan Gupta',
];

const DECORATIVE_RECRUITERS = DECORATIVE_NAMES.map((name) => ({
  name,
  avatarUrl: `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=transparent`,
}));

const RING_LAYOUT = [
  {
    radius: 78,
    duration: 24,
    dir: 1,
    slots: [
      // { angle: 20, size: 46 },
      // { angle: 100, size: 34 },
      { angle: 40, size: 30 },
      { angle: 160, size: 32 },
      { angle: 280, size: 30 },
    ],
  },
  {
    radius: 140,
    duration: 34,
    dir: -1,
    slots: [
      { angle: 55, size: 40 },
      { angle: 130, size: 32 },
      { angle: 205, size: 38 },
      { angle: 280, size: 28 },
      { angle: 340, size: 30 },
    ],
  },
  {
    radius: 202,
    duration: 46,
    dir: 1,
    slots: [
      { angle: 40, size: 36 },
      { angle: 140, size: 28 },
      { angle: 230, size: 28 },
      { angle: 310, size: 30 },
    ],
  },
];

const AVATAR_PALETTE = ['#C75560', '#E8A855', '#6B3F5C', '#8A5A56', '#4D2F45'];

function colorForKey(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  return initials.toUpperCase() || 'U';
}

function AvatarBubble({ user, size }) {
  const [imgError, setImgError] = useState(false);
  const key = user?.name || user?._id || user?.email || 'U';
  const showImg = Boolean(user?.avatarUrl) && !imgError;

  return (
    <div
      title={user?.name || 'Recent user'}
      className="rounded-full overflow-hidden flex items-center justify-center shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)] ring-2 ring-white/10"
      style={{ width: size, height: size, background: showImg ? 'transparent' : colorForKey(key) }}
    >
      {showImg ? (
        <img
          src={user.avatarUrl}
          alt={user.name || 'User'}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-bold text-white" style={{ fontSize: size * 0.34 }}>
          {getInitials(user?.name)}
        </span>
      )}
    </div>
  );
}

function OrbitNetwork({ users = [] }) {
  let slotIndex = 0;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute" style={{ left: '82%', top: '60%' }}>
        {RING_LAYOUT.map((ring, i) => (
          <div
            key={i}
            className="absolute"
            style={{ width: ring.radius * 2, height: ring.radius * 2, left: 0, top: 0, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              className="absolute inset-0 rounded-full border border-dashed border-white/15"
              animate={{ rotate: 360 * ring.dir }}
              transition={{ repeat: Infinity, duration: ring.duration, ease: 'linear' }}
            >
              {ring.slots.map((slot, j) => {
                const rad = (slot.angle * Math.PI) / 180;
                const x = Math.cos(rad) * ring.radius;
                const y = Math.sin(rad) * ring.radius;
                const user = users.length ? users[slotIndex % users.length] : null;
                slotIndex += 1;
                return (
                  <div
                    key={j}
                    className="absolute"
                    style={{
                      left: `calc(50% + ${x}px - ${slot.size / 2}px)`,
                      top: `calc(50% + ${y}px - ${slot.size / 2}px)`,
                    }}
                  >
                    <motion.div
                      animate={{ rotate: -360 * ring.dir }}
                      transition={{ repeat: Infinity, duration: ring.duration, ease: 'linear' }}
                    >
                      <AvatarBubble user={user} size={slot.size} />
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        ))}
      </div>

      {/* soft radial glow behind the hub for depth */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '82%',
          top: '50%',
          width: 420,
          height: 420,
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(232,168,85,0.16) 0%, rgba(232,168,85,0) 65%)',
        }}
      />
    </div>
  );
}