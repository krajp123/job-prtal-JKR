import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Loader2 } from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { connectSocket, getSocket } from '../../socket';
import { FONT_DISPLAY, FONT_BODY, MAROON, MAROON_DARK, ACCENT, BG } from '../../theme';
import CandidateNavbar from '../../components/CandidateNavbar';

function initials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function Messages() {
    const [conversations, setConversations] = useState([]);
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [activeId, setActiveId] = useState(null);

    const [thread, setThread] = useState([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);

    const scrollRef = useRef(null);

    async function loadConversations() {
        setLoadingConvos(true);
        try {
            const { data } = await axiosInstance.get('/messages/mine');
            setConversations(data || []);
        } finally {
            setLoadingConvos(false);
        }
    }

    async function openThread(recruiterId) {
        setActiveId(recruiterId);
        setLoadingThread(true);
        try {
            const { data } = await axiosInstance.get(`/messages/${recruiterId}`);
            setThread(data || []);
            axiosInstance.patch(`/messages/${recruiterId}/read`).catch(() => {});
            setConversations((prev) =>
                prev.map((c) => (c._id === recruiterId ? { ...c, unreadCount: 0 } : c))
            );
        } finally {
            setLoadingThread(false);
        }
    }

    useEffect(() => {
        loadConversations();

        // IMPORTANT: a candidate can only ever reply within a thread a
        // recruiter has already started — /messages/mine only ever returns
        // threads that already exist, so there is no "start new chat" UI here.
        const socket = connectSocket();
        function handleNewMessage(msg) {
            // Refresh the conversation list (order/unread counts may have changed)
            loadConversations();
            // If the incoming message belongs to the open thread, append it live
            setActiveId((current) => {
                if (current && String(msg.recruiter) === String(current)) {
                    setThread((prev) => [...prev, msg]);
                }
                return current;
            });
        }
        socket.on('newMessage', handleNewMessage);
        return () => {
            socket.off('newMessage', handleNewMessage);
        };
    }, []);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [thread]);

    async function sendReply() {
        const text = draft.trim();
        if (!text || !activeId) return;
        setSending(true);
        setDraft('');
        try {
            const { data } = await axiosInstance.post('/messages/reply', { recruiterId: activeId, text });
            setThread((prev) => [...prev, data]);
        } catch (err) {
            // Restore the draft so the user doesn't lose what they typed
            setDraft(text);
        } finally {
            setSending(false);
        }
    }

    const activeConvo = useMemo(
        () => conversations.find((c) => c._id === activeId),
        [conversations, activeId]
    );

    return (
        <div className="portal-theme flex min-h-[100dvh] w-full flex-col overflow-x-hidden" style={{ background: '#FFF7F2', fontFamily: FONT_BODY }}>
            <CandidateNavbar />

            <div className="mx-auto flex w-full max-w-5xl flex-1 gap-4 overflow-hidden px-6 py-5">
                {/* Conversation list */}
                <div className="w-full max-w-[280px] shrink-0 overflow-y-auto rounded-[16px] border border-stone-200/70 bg-white">
                    {loadingConvos ? (
                        <div className="flex justify-center py-10">
                            <Loader2 size={20} className="animate-spin" color={MAROON} />
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                            <MessageCircle size={24} className="text-stone-300" />
                            <p className="text-[12.5px] text-[#6B6259]">
                                No conversations yet. A recruiter has to message you first.
                            </p>
                        </div>
                    ) : (
                        conversations.map((c) => (
                            <button
                                key={c._id}
                                onClick={() => openThread(c._id)}
                                className="flex w-full items-center gap-3 border-b border-stone-100 px-4 py-3 text-left transition-colors hover:bg-stone-50"
                                style={activeId === c._id ? { background: `${MAROON}0A` } : {}}
                            >
                                <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold text-white"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                                >
                                    {initials(c.otherUser?.companyName || c.otherUser?.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="truncate text-[13px] font-semibold text-stone-900">
                                            {c.otherUser?.companyName || c.otherUser?.name || 'Recruiter'}
                                        </p>
                                        {c.unreadCount > 0 && (
                                            <span
                                                className="ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9.5px] font-bold text-white"
                                                style={{ background: MAROON }}
                                            >
                                                {c.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-[11.5px] text-[#6B6259]">{c.lastMessage?.text}</p>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Thread */}
                <div className="flex flex-1 flex-col overflow-hidden rounded-[16px] border border-stone-200/70 bg-white">
                    {!activeId ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                            <MessageCircle size={26} className="text-stone-300" />
                            <p className="text-[13px] text-[#6B6259]">Select a conversation to view messages</p>
                        </div>
                    ) : (
                        <>
                            <div className="border-b border-stone-100 px-5 py-3">
                                <p className="text-[13.5px] font-semibold text-stone-900">
                                    {activeConvo?.otherUser?.companyName || activeConvo?.otherUser?.name}
                                </p>
                            </div>
                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
                                {loadingThread ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 size={20} className="animate-spin" color={MAROON} />
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {thread.map((m) => {
                                            const mine = m.sender === 'candidate';
                                            return (
                                                <motion.div
                                                    key={m._id}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className={`max-w-[70%] rounded-[14px] px-3.5 py-2 text-[13px] ${mine ? 'self-end text-white' : 'self-start bg-stone-100 text-stone-800'
                                                        }`}
                                                    style={mine ? { background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` } : {}}
                                                >
                                                    {m.text}
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            {/* Input is only ever shown for threads that already exist (i.e. a
                                recruiter has messaged first) — /messages/mine guarantees that. */}
                            <div className="flex items-center gap-2 border-t border-stone-100 p-3">
                                <input
                                    value={draft}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                                    placeholder="Type a reply…"
                                    className="flex-1 rounded-[10px] border border-stone-200 px-3.5 py-2.5 text-[13px] outline-none focus:border-[#8B1E2F]/40"
                                />
                                <button
                                    onClick={sendReply}
                                    disabled={sending || !draft.trim()}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-white disabled:opacity-50"
                                    style={{ background: `linear-gradient(135deg, ${ACCENT}, ${MAROON})` }}
                                >
                                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
