import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import {
    Award,
    ArrowRight,
    Briefcase,
    Building2,
    CheckCircle2,
    LogOut,
    Play,
    Search,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AuthModal from '../components/AuthModal';
import VideoModal from '../components/VideoModal';
import { useAuth } from '../context/AuthContext';

const FONT_DISPLAY = "'Space Grotesk','Inter',ui-sans-serif,sans-serif";
const CAREER_HERO_IMAGES = [
    {
        src: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=86',
        alt: 'Professionals planning a project together at work',
        eyebrow: 'Find your direction',
        title: 'Work that fits your strengths.',
        description: 'Explore opportunities that match the skills you are ready to use next.',
    },
    {
        src: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=86',
        alt: 'A team collaborating in a bright workplace',
        eyebrow: 'Meet your next team',
        title: 'Better opportunities start with a match.',
        description: 'Connect with teams that value the work and perspective you bring.',
    },
    {
        src: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=86',
        alt: 'A welcoming modern office workspace',
        eyebrow: 'Choose your setting',
        title: 'A clearer place to grow.',
        description: 'Keep your search organized while you focus on the role that feels right.',
    },
];

function nextHeroImageIndex(currentIndex) {
    if (CAREER_HERO_IMAGES.length < 2) return 0;
    const offset = 1 + Math.floor(Math.random() * (CAREER_HERO_IMAGES.length - 1));
    return (currentIndex + offset) % CAREER_HERO_IMAGES.length;
}

function BrandMark({ subtitle }) {
    return (
        <div>
            <p className="text-sm font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>Career Route Portal</p>
            {subtitle && <p className="hidden text-xs text-[#8D6072] sm:block">{subtitle}</p>}
        </div>
    );
}

function EditorialCareerImage() {
    const [imageIndex, setImageIndex] = useState(() => Math.floor(Math.random() * CAREER_HERO_IMAGES.length));
    const activeImage = CAREER_HERO_IMAGES[imageIndex];

    useEffect(() => {
        const rotationId = window.setInterval(() => {
            setImageIndex((currentIndex) => nextHeroImageIndex(currentIndex));
        }, 5000);

        return () => window.clearInterval(rotationId);
    }, []);

    return (
        <motion.figure
            className="career-editorial-stage"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.64, delay: 0.14, ease: 'easeOut' }}
        >
            <div className="career-editorial-shape career-editorial-shape--yellow" aria-hidden="true" />
            <div className="career-editorial-shape career-editorial-shape--outline" aria-hidden="true" />
            <div className="career-editorial-copy">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeImage.src}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.32, ease: 'easeOut' }}
                    >
                        <p>{activeImage.eyebrow}</p>
                        <h2 style={{ fontFamily: FONT_DISPLAY }}>{activeImage.title}</h2>
                        <span>{activeImage.description}</span>
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="career-editorial-photo overflow-hidden bg-[#F7ECE7]">
                <AnimatePresence mode="wait">
                    <motion.img
                        key={activeImage.src}
                        src={activeImage.src}
                        alt={activeImage.alt}
                        initial={{ opacity: 0, scale: 1.08 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.04 }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                </AnimatePresence>
            </div>
        </motion.figure>
    );
}

function ShowcaseHero({ onFindRole, onHire, onWatchDemo, onLogin }) {
    return (
        <section className="relative z-10 mx-auto flex h-full w-full max-w-[1400px] flex-col">
            <header className="portal-navbar-shell">
                <nav className="portal-navbar" aria-label="Homepage navigation">
                    <BrandMark />
                    <div className="hidden items-center gap-1 lg:flex">
                        <button type="button" onClick={onFindRole} className="home-showcase-link">Find jobs</button>
                        <button type="button" onClick={onHire} className="home-showcase-link">Hire talent</button>
                        <button type="button" onClick={onWatchDemo} className="home-showcase-link">Platform tour</button>
                    </div>
                    <button type="button" onClick={onLogin} className="home-showcase-login">
                        Sign in <ArrowRight size={15} />
                    </button>
                </nav>
            </header>

            <div className="mx-3 mb-3 flex min-h-0 flex-1 sm:mx-6 sm:mb-6">
                <div className="home-showcase-shell">
                    <div className="home-showcase-content">
                    <motion.div
                        className="home-showcase-copy"
                        initial={{ opacity: 0, x: -22 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.55, ease: 'easeOut' }}
                    >
                        <span className="home-live-badge">
                            <span className="home-live-badge-icon" aria-hidden="true"><Sparkles size={15} /></span>
                            <span>A job platform built for momentum</span>
                        </span>
                        <h1 className="mt-6 max-w-xl text-[clamp(38px,5.2vw,66px)] font-bold leading-[0.98] text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>
                            Find the work that moves you forward.
                        </h1>
                        <p className="mt-5 max-w-lg text-base leading-7 text-[#80576A] sm:text-lg">
                            Search relevant opportunities, build a profile that stands out, or meet qualified people for your next opening.
                        </p>
                        <div className="home-portal-actions mt-8">
                            <button type="button" onClick={onFindRole} className="home-portal-action home-portal-action--jobs">
                                <span className="home-portal-action-icon" aria-hidden="true"><Search size={18} /></span>
                                <span className="home-portal-action-copy">
                                    <strong>Find jobs</strong>
                                </span>
                                <span className="home-portal-action-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
                            </button>
                            <button type="button" onClick={onHire} className="home-portal-action home-portal-action--post">
                                <span className="home-portal-action-icon" aria-hidden="true"><Building2 size={18} /></span>
                                <span className="home-portal-action-copy">
                                    <strong>Post a job</strong>
                                </span>
                                <span className="home-portal-action-arrow" aria-hidden="true"><ArrowRight size={16} /></span>
                            </button>
                        </div>
                        <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-[#8D6072]">
                            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#C75560]" /> Candidate and recruiter workspaces</span>
                            <button type="button" onClick={onWatchDemo} className="inline-flex cursor-pointer items-center gap-2 text-[#A94658] underline decoration-[#E8A23A] decoration-2 underline-offset-4 transition-colors hover:text-[#7A3656]"><Play size={15} /> See the platform</button>
                        </div>
                    </motion.div>
                        <EditorialCareerImage />
                    </div>
                </div>
            </div>
        </section>
    );
}

function SignedInNovaScene({ role }) {
    const mountRef = useRef(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x160016);

        const camera = new THREE.PerspectiveCamera(60, 1, 1, 1000);
        camera.position.set(0, 4, 21);

        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setSize(1, 1);
        renderer.setClearColor(0x160016, 1);

        const container = mountRef.current;
        container.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = false;
        controls.enableZoom = false;

        const pts = [];
        const sizes = [];
        const shift = [];
        const pushShift = () => {
            shift.push(
                Math.random() * Math.PI,
                Math.random() * Math.PI * 0.5,
                (Math.random() * 0.9 + 0.1) * Math.PI * 0.05,
                Math.random() * 0.5 + 0.2
            );
        };

        for (let i = 0; i < 12000; i++) {
            sizes.push(Math.random() * 1.2 + 0.4);
            pushShift();
            pts.push(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5));
        }
        for (let i = 0; i < 12000; i++) {
            const r = 10;
            const R = 40;
            const rand = Math.pow(Math.random(), 1.5);
            const radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
            pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2));
            sizes.push(Math.random() * 1.2 + 0.4);
            pushShift();
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(pts);
        geometry.setAttribute('sizes', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('shift', new THREE.Float32BufferAttribute(shift, 4));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending,
            onBeforeCompile: (shader) => {
                shader.uniforms.time = { value: 0 };
                shader.vertexShader = `
                    uniform float time;
                    attribute float sizes;
                    attribute vec4 shift;
                    varying vec3 vColor;
                    ${shader.vertexShader}
                `.replace(
                    'gl_PointSize = size;',
                    'gl_PointSize = size * sizes;'
                ).replace(
                    '#include <color_vertex>',
                    `#include <color_vertex>
                        float d = length(abs(position) / vec3(40., 10., 40.));
                        d = clamp(d, 0., 1.);
                        vColor = mix(vec3(227., 155., 0.), vec3(100., 50., 255.), d) / 255.;
                    `
                ).replace(
                    '#include <begin_vertex>',
                    `#include <begin_vertex>
                        float t = time * 0.4;
                        float moveT = shift.x + shift.z * t;
                        float moveS = shift.y + shift.z * t;
                        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT) * 0.7, sin(moveS) * sin(moveT)) * shift.w * 0.75;
                    `
                );
                shader.fragmentShader = `
                    varying vec3 vColor;
                    ${shader.fragmentShader}
                `.replace(
                    '#include <clipping_planes_fragment>',
                    `#include <clipping_planes_fragment>
                        float d = length(gl_PointCoord.xy - 0.5);
                    `
                ).replace(
                    'vec4 diffuseColor = vec4( diffuse, opacity );',
                    'vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d) );'
                );
                material.userData.shader = shader;
            }
        });

        const points = new THREE.Points(geometry, material);
        points.rotation.order = 'ZYX';
        points.rotation.z = 0.2;
        scene.add(points);

        const clock = new THREE.Clock();
        const resize = () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        };
        resize();
        window.addEventListener('resize', resize);

        const animate = () => {
            const t = clock.getElapsedTime() * 0.35;
            if (material.userData.shader) {
                material.userData.shader.uniforms.time.value = t * Math.PI;
            }
            points.rotation.y = t * 0.10;
            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            renderer.dispose();
            geometry.dispose();
            material.dispose();
            container.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div className="relative h-full min-h-[300px] overflow-hidden rounded-[24px] bg-[#160016] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.28)]">
            <div ref={mountRef} className="h-full w-full" />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">Nova system active</p>
                <h2 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Experience the new workspace</h2>
                <p className="mt-2 max-w-sm text-sm text-white/80">A live particle nebula powering your signed-in dashboard.</p>
            </div>
        </div>
    );
}

function SignedInHome({ user, onOpenWorkspace, onLogout }) {
    const label = user.name || (user.role === 'recruiter' ? 'Recruiter' : 'Candidate');
    const roleLabel = user.role === 'recruiter' ? 'Recruiter workspace' : 'Candidate workspace';
    const workspaceDescription = user.role === 'recruiter'
        ? 'Review applicants, publish new roles, and keep your hiring work moving.'
        : 'Manage your profile, search relevant roles, and follow your applications.';

    return (
        <div className="relative min-h-[100dvh] overflow-hidden bg-[#FFF7F2] text-[#54263F]" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
            <div aria-hidden="true" className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(199,85,96,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(232,162,58,0.08)_1px,transparent_1px)] [background-size:32px_32px]" />
            <header className="portal-navbar-shell relative z-10">
                <div className="portal-navbar">
                    <BrandMark subtitle="Your account is active" />
                    <button
                        type="button"
                        onClick={onLogout}
                        className="home-showcase-login signed-in-nav-logout"
                    >
                        <LogOut size={15} />
                        <span>Log out</span>
                    </button>
                </div>
            </header>

            <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-68px)] w-full max-w-6xl items-center px-5 pb-10 sm:px-8">
                <motion.section
                    className="grid w-full overflow-hidden rounded-xl border border-[#F0D1BF] bg-[#FFFDFC] shadow-[0_30px_70px_-42px_rgba(109,48,83,0.48)] lg:grid-cols-[1.2fr_0.8fr]"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                >
                    <div className="p-7 sm:p-10 lg:p-12">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#FFF0E5] px-3 py-1.5 text-xs font-bold text-[#A94658]">
                            <CheckCircle2 size={15} /> Signed in securely
                        </span>
                        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-[#B64D60]">{roleLabel}</p>
                        <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight text-[#54263F] sm:text-5xl" style={{ fontFamily: FONT_DISPLAY }}>
                            Welcome back, {label}.
                        </h1>
                        <p className="mt-5 max-w-lg text-base leading-7 text-[#80576A]">{workspaceDescription}</p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={onOpenWorkspace}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#54263F] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_-16px_rgba(84,38,63,0.75)] transition-all hover:-translate-y-0.5 hover:bg-[#3F2035] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#54263F]"
                            >
                                Open workspace <ArrowRight size={17} />
                            </button>
                            <button
                                type="button"
                                onClick={onLogout}
                                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#EBC2AE] px-5 py-3 text-sm font-bold text-[#78394F] transition-colors hover:border-[#D66A72] hover:bg-[#FFF0E8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C75560]"
                            >
                                <LogOut size={17} /> Log out
                            </button>
                        </div>
                    </div>

                    <div className="relative min-h-[400px] overflow-hidden bg-[#160016] sm:p-0">
                        <SignedInNovaScene role={user.role} />
                    </div>
                </motion.section>
            </main>
        </div>
    );
}

export default function Home() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [authModal, setAuthModal] = useState({ open: false, role: 'candidate', mode: 'register' });
    const [videoOpen, setVideoOpen] = useState(false);

    const openAuthModal = (role, mode = 'register') => setAuthModal({ open: true, role, mode });
    const closeAuthModal = () => setAuthModal((s) => ({ ...s, open: false }));
    const switchAuthMode = (mode) => setAuthModal((s) => ({ ...s, mode }));

    const openWorkspace = () => navigate(user?.role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard');

    if (user) {
        return <SignedInHome user={user} onOpenWorkspace={openWorkspace} onLogout={logout} />;
    }

    return (
        <div className="relative isolate h-[100dvh] w-full overflow-hidden bg-[#FFF4EF] text-[#54263F]" style={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(199,85,96,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(232,162,58,0.065)_1px,transparent_1px)] [background-size:36px_36px]" />

            <ShowcaseHero
                onFindRole={() => openAuthModal('candidate')}
                onHire={() => openAuthModal('recruiter')}
                onWatchDemo={() => setVideoOpen(true)}
                onLogin={() => openAuthModal('candidate', 'login')}
            />

            <AuthModal
                isOpen={authModal.open}
                role={authModal.role}
                mode={authModal.mode}
                onClose={closeAuthModal}
                onModeChange={switchAuthMode}
                onRoleChange={(role) => setAuthModal((state) => ({ ...state, role }))}
            />
            <VideoModal isOpen={videoOpen} onClose={() => setVideoOpen(false)} />
        </div>
    );
}