import { useEffect, useRef } from 'react';

// Premium gold + maroon palette, tuned to read clearly on a white background.
const BRAND_COLORS = ['#8B1E2F', '#A8394D', '#5C1420', '#C9A24B', '#B5495A'];

/**
 * Renders `text` as an interactive field of particles (built by sampling the
 * text's own pixels onto an offscreen canvas). Particles gently drift, hold
 * their letterform, and "bubble" away from the cursor on hover — the same
 * interaction style as the tsParticles polygon-mask demo, but self-contained
 * (no extra dependency) and guaranteed to render the exact text supplied.
 */
export default function ParticleLogo({ text = 'CRP', className = '' }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        let raf;
        let particles = [];
        let width = 0;
        let height = 0;
        const mouse = { x: -9999, y: -9999 };

        function buildParticles() {
            width = container.clientWidth;
            height = container.clientHeight;
            if (!width || !height) return;

            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const off = document.createElement('canvas');
            off.width = width;
            off.height = height;
            const octx = off.getContext('2d');
            const fontSize = Math.min(height * 0.7, width / (text.length * 0.62));
            octx.clearRect(0, 0, width, height);
            octx.font = `800 ${fontSize}px 'Space Grotesk', Inter, Arial, sans-serif`;
            octx.textAlign = 'center';
            octx.textBaseline = 'middle';
            octx.fillStyle = '#000';
            octx.fillText(text, width / 2, height / 2 + fontSize * 0.04);

            const { data } = octx.getImageData(0, 0, width, height);
            const gap = Math.max(4, Math.round(width / 140));
            const points = [];
            for (let y = 0; y < height; y += gap) {
                for (let x = 0; x < width; x += gap) {
                    const alpha = data[(y * width + x) * 4 + 3];
                    if (alpha > 128) points.push({ x, y });
                }
            }

            particles = points.map((p, i) => ({
                tx: p.x,
                ty: p.y,
                x: p.x + (Math.random() - 0.5) * 60,
                y: p.y + (Math.random() - 0.5) * 60,
                vx: 0,
                vy: 0,
                size: 1.1 + Math.random() * 1.3,
                color: BRAND_COLORS[i % BRAND_COLORS.length],
            }));
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            for (const p of particles) {
                const dx = p.tx - p.x;
                const dy = p.ty - p.y;
                p.vx += dx * 0.018;
                p.vy += dy * 0.018;

                const mdx = p.x - mouse.x;
                const mdy = p.y - mouse.y;
                const dist = Math.hypot(mdx, mdy) || 1;
                const radius = 60;
                if (dist < radius) {
                    const force = ((radius - dist) / radius) * 2.6;
                    p.vx += (mdx / dist) * force;
                    p.vy += (mdy / dist) * force;
                }

                p.vx *= 0.82;
                p.vy *= 0.82;
                p.x += p.vx;
                p.y += p.vy;

                ctx.beginPath();
                ctx.globalAlpha = 0.85;
                ctx.fillStyle = p.color;
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(animate);
        }

        function handleMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        }
        function handleMouseLeave() {
            mouse.x = -9999;
            mouse.y = -9999;
        }
        function handleTouchMove(e) {
            const rect = canvas.getBoundingClientRect();
            const touch = e.touches[0];
            if (!touch) return;
            mouse.x = touch.clientX - rect.left;
            mouse.y = touch.clientY - rect.top;
        }

        buildParticles();
        animate();

        const ro = new ResizeObserver(() => buildParticles());
        ro.observe(container);

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleMouseLeave);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleMouseLeave);
        };
    }, [text]);

    return (
        <div ref={containerRef} className={className}>
            <canvas ref={canvasRef} />
        </div>
    );
}
