import { User } from 'lucide-react';
import { MAROON, ACCENT } from '../theme';

function initials(name) {
    if (!name) return null;
    return name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

// size in px. Shows the uploaded photo if present, otherwise initials,
// otherwise a generic user icon.
export default function Avatar({ src, name, size = 40, ring = false }) {
    const dim = { width: size, height: size };

    if (src) {
        return (
            <img
                src={src}
                alt={name ? `${name}'s profile photo` : 'Profile photo'}
                style={dim}
                className={`shrink-0 rounded-full object-cover ${ring ? 'ring-2 ring-white/40' : ''}`}
            />
        );
    }

    const label = initials(name);

    return (
        <div
            style={{ ...dim, background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
            className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${ring ? 'ring-2 ring-white/40' : ''}`}
        >
            {label ? (
                <span style={{ fontSize: size * 0.38 }}>{label}</span>
            ) : (
                <User size={size * 0.5} />
            )}
        </div>
    );
}
