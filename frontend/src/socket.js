import { io } from 'socket.io-client';

// Single shared socket instance, reused across pages/components.
// Connects lazily (autoConnect: false) so we only open a socket once the
// user is actually logged in — call connectSocket() after login.
let socket = null;

export function getSocket() {
    if (!socket) {
        const base = import.meta.env.VITE_API_BASE_URL || '';
        // VITE_API_BASE_URL is usually something like http://localhost:5000/api —
        // Socket.io needs the bare origin, not the /api path.
        const origin = base.replace(/\/api\/?$/, '');
        socket = io(origin, {
            autoConnect: false,
            auth: { token: localStorage.getItem('token') },
        });
    }
    return socket;
}

export function connectSocket() {
    const s = getSocket();
    s.auth = { token: localStorage.getItem('token') };
    if (!s.connected) s.connect();
    return s;
}

export function disconnectSocket() {
    if (socket?.connected) socket.disconnect();
}
