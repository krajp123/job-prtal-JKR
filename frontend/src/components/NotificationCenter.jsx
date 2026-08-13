import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, MessageCircle, Briefcase, Megaphone, CheckCheck, Trash2 } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { connectSocket } from '../socket';
import { FONT_DISPLAY, MAROON, MAROON_DARK } from '../theme';

const ICONS = {
    application_status: Briefcase,
    message: MessageCircle,
    job_alert: Megaphone,
    system: Bell,
};

function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationCenter({ className = '' }) {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const ref = useRef(null);

    async function load() {
        try {
            const { data } = await axiosInstance.get('/notifications/mine');
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch {
            // Non-fatal — bell just shows stale/no data until next load.
        }
    }

    useEffect(() => {
        load();

        const socket = connectSocket();
        function handleNew(notification) {
            setNotifications((prev) => [notification, ...prev]);
            setUnreadCount((prev) => prev + 1);
        }
        socket.on('notification', handleNew);

        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            socket.off('notification', handleNew);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    async function markOneRead(id) {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        try {
            await axiosInstance.patch(`/notifications/${id}/read`);
        } catch {
            load(); // resync on failure
        }
    }

    const [isClearing, setIsClearing] = useState(false);

    async function markAllRead() {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        try {
            await axiosInstance.patch('/notifications/read-all');
        } catch {
            load();
        }
    }

    async function clearReadNotifications() {
        if (isClearing) return;
        setIsClearing(true);
        const remaining = notifications.filter((n) => !n.read);
        setNotifications(remaining);
        try {
            await axiosInstance.delete('/notifications/clear-read');
        } catch {
            load();
        } finally {
            setIsClearing(false);
        }
    }

    const hasReadNotifications = notifications.some((n) => n.read);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((o) => !o)}
                aria-label="Notifications"
                className={`candidate-page-nav-icon relative transition-colors ${className}`}
            >
                <Bell size={18} className="text-stone-600" />
                {unreadCount > 0 && (
                    <span
                        className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9.5px] font-bold text-white"
                        style={{ background: MAROON }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-[16px] border border-stone-200/70 bg-white shadow-xl"
                    >
                        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
                            <span className="text-[13px] font-bold text-stone-900" style={{ fontFamily: FONT_DISPLAY }}>
                                Notifications
                            </span>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="flex items-center gap-1 text-[11.5px] font-semibold"
                                        style={{ color: MAROON }}
                                    >
                                        <CheckCheck size={12.5} />
                                        Mark all read
                                    </button>
                                )}
                                {hasReadNotifications && (
                                    <button
                                        onClick={clearReadNotifications}
                                        disabled={isClearing}
                                        className="flex items-center gap-1 text-[11.5px] font-semibold"
                                        style={{ color: MAROON }}
                                    >
                                        <Trash2 size={12.5} />
                                        {isClearing ? 'Clearing…' : 'Clear read'}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="px-4 py-8 text-center text-[12.5px] text-[#6B6259]">
                                    You're all caught up.
                                </p>
                            ) : (
                                notifications.map((n) => {
                                    const Icon = ICONS[n.type] || Bell;
                                    return (
                                        <button
                                            key={n._id}
                                            onClick={() => !n.read && markOneRead(n._id)}
                                            className="flex w-full items-start gap-3 border-b border-stone-50 px-4 py-3 text-left transition-colors hover:bg-stone-50"
                                            style={!n.read ? { background: `${MAROON}08` } : {}}
                                        >
                                            <div
                                                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                                                style={{ background: `${MAROON}14` }}
                                            >
                                                <Icon size={13} color={MAROON} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[12.5px] font-semibold text-stone-900">{n.title}</p>
                                                <p className="mt-0.5 line-clamp-2 text-[11.5px] text-[#6B6259]">{n.message}</p>
                                                <p className="mt-1 text-[10.5px] text-stone-400">{timeAgo(n.createdAt)}</p>
                                            </div>
                                            {!n.read && (
                                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: MAROON }} />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
