import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Copy, MoreVertical, Send, MessageCircle, Loader2, Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { connectSocket } from '../../socket';
import { FONT_DISPLAY, FONT_BODY, MAROON, ACCENT } from '../../theme';
import CandidateNavbar from '../../components/CandidateNavbar';
import Avatar from '../../components/Avatar';

function initials(name) {
    if (!name) return '?';
    return name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

const AVATAR_GRADIENTS = [
    ['#E7A24B', '#C75560'],
    ['#D9654A', '#80576A'],
    ['#F7C56B', '#D9654A'],
    ['#C75560', '#80576A'],
];

function avatarGradient(seed) {
    const key = (seed || '?').charCodeAt(0) || 0;
    return AVATAR_GRADIENTS[key % AVATAR_GRADIENTS.length];
}

function formatTime(dateInput) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDayLabel(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'long' });
}

function groupByDay(messages) {
    return messages.reduce((groups, message) => {
        const label = formatDayLabel(message.createdAt);
        const lastGroup = groups[groups.length - 1];
        if (lastGroup?.label === label) lastGroup.messages.push(message);
        else groups.push({ label, messages: [message] });
        return groups;
    }, []);
}

export default function Messages() {
    const [searchParams] = useSearchParams();
    const recruiterIdFromUrl = searchParams.get('recruiterId');
    const [conversations, setConversations] = useState([]);
    const [loadingConvos, setLoadingConvos] = useState(true);
    const [activeId, setActiveId] = useState(null);

    const [thread, setThread] = useState([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [showConversationList, setShowConversationList] = useState(
        () => typeof window !== 'undefined' && window.innerWidth < 768
    );
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchChat, setSearchChat] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [candidateRepliesEnabled, setCandidateRepliesEnabled] = useState(true);

    const scrollRef = useRef(null);
    const threadRequestRef = useRef(0);
    const sendingRef = useRef(false);

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
        const requestId = ++threadRequestRef.current;
        setShowConversationList(false);
        setMenuOpen(false);
        setSearchChat('');
        setSearchOpen(false);
        try {
            const [{ data }, { data: preference }] = await Promise.all([
                axiosInstance.get(`/messages/${recruiterId}`),
                axiosInstance.get(`/messages/preference/${recruiterId}`),
                axiosInstance.patch(`/messages/${recruiterId}/read`),
            ]);
            if (requestId !== threadRequestRef.current) return;
            setActiveId(recruiterId);
            setThread(data || []);
            setConversations((prev) => prev.map((c) => (
                c._id === recruiterId ? { ...c, unreadCount: 0 } : c
            )));
            setCandidateRepliesEnabled(preference.candidateRepliesEnabled !== false);
        } catch (requestError) {
            console.error('Could not load candidate conversation:', requestError);
        }
    }

    useEffect(() => {
        loadConversations();

        // IMPORTANT: a candidate can only ever reply within a thread a
        // recruiter has already started — /messages/mine only ever returns
        // threads that already exist, so there is no "start new chat" UI here.
        const socket = connectSocket();
        function handleNewMessage(msg) {
            // If the incoming message belongs to the open thread, append it live
            setActiveId((current) => {
                if (current && String(msg.recruiter) === String(current)) {
                    setThread((prev) => prev.some((message) => String(message._id) === String(msg._id)) ? prev : [...prev, msg]);
                    axiosInstance.patch(`/messages/${current}/read`).catch(() => {});
                    loadConversations().then(() => {
                        setConversations((previous) => previous.map((conversation) => (
                            String(conversation._id) === String(current) ? { ...conversation, unreadCount: 0 } : conversation
                        )));
                    });
                } else {
                    loadConversations();
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
        if (recruiterIdFromUrl) openThread(recruiterIdFromUrl);
    }, [recruiterIdFromUrl]);

    useEffect(() => {
        function closeChatTools(event) {
            if (!event.target.closest('[data-chat-tools]')) {
                setMenuOpen(false);
                setSearchOpen(false);
            }
        }
        document.addEventListener('mousedown', closeChatTools);
        return () => document.removeEventListener('mousedown', closeChatTools);
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [thread]);

    const activeConvo = useMemo(
        () => conversations.find((c) => c._id === activeId),
        [conversations, activeId]
    );
    const activeName = activeConvo?.otherUser?.fullName || activeConvo?.otherUser?.name || 'Recruiter';
    const activeCompany = activeConvo?.otherUser?.companyName || 'Recruiter conversation';
    const filteredConversations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return conversations;
        return conversations.filter((conversation) => (
            (conversation.otherUser?.companyName || conversation.otherUser?.name || '').toLowerCase().includes(query)
            || (conversation.lastMessage?.text || '').toLowerCase().includes(query)
        ));
    }, [conversations, searchQuery]);
    const dayGroups = useMemo(() => groupByDay(thread), [thread]);

    const visibleThread = useMemo(() => {
        const query = searchChat.trim().toLowerCase();
        return query ? thread.filter((message) => message.text?.toLowerCase().includes(query)) : thread;
    }, [thread, searchChat]);

    const visibleDayGroups = useMemo(() => groupByDay(visibleThread), [visibleThread]);
    const canReply = candidateRepliesEnabled && Boolean(activeConvo) && (
        thread.some((message) => message.sender === 'recruiter' && message.startedByRecruiter !== false)
        || Boolean(activeConvo.lastMessage)
    );

    async function sendReply() {
        const text = draft.trim();
        if (!text || !activeId || sendingRef.current) return;
        sendingRef.current = true;
        setSending(true);
        setDraft('');
        try {
            const { data } = await axiosInstance.post('/messages/reply', { recruiterId: activeId, text });
            setThread((previous) => previous.some((message) => message._id === data._id) ? previous : [...previous, data]);
        } catch (requestError) {
            setDraft(text);
        } finally {
            sendingRef.current = false;
            setSending(false);
        }
    }

    async function clearChat() {
        if (!activeId || !window.confirm('Clear all messages in this chat?')) return;
        await axiosInstance.delete(`/messages/${activeId}`);
        setThread([]);
        setConversations((previous) => previous.map((conversation) => (
            String(conversation._id) === String(activeId)
                ? { ...conversation, lastMessage: { ...conversation.lastMessage, text: '' }, unreadCount: 0 }
                : conversation
        )));
        setMenuOpen(false);
    }

    async function copyMessage(message) {
        try {
            await navigator.clipboard.writeText(message.text || '');
            setCopiedId(message._id);
            window.setTimeout(() => setCopiedId((current) => (current === message._id ? null : current)), 1500);
        } catch {
            // Clipboard access may be unavailable in some browsers.
        }
    }

    const totalUnread = conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0);

    return (
        <div className="portal-theme flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#FFF7F2]" style={{ fontFamily: FONT_BODY }}>
            <CandidateNavbar />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-5 sm:px-6">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-[#1D181A]" style={{ fontFamily: FONT_DISPLAY }}>Messages</h1>
                    <p className="mt-1 text-sm text-[#80576A]">Stay connected with recruiters about your applications.{totalUnread > 0 && <span className="ml-1 font-semibold text-[#C75560]">{totalUnread} unread</span>}</p>
                </div>

                <section className="flex h-[calc(100dvh-220px)] min-h-[360px] flex-none overflow-hidden rounded-none border border-[#EBC2AE] bg-white shadow-sm sm:h-[calc(100dvh-200px)] md:max-h-[560px]">
                <aside className={`${showConversationList ? 'flex' : 'hidden'} min-h-0 w-full shrink-0 flex-col border-r border-[#F0D1BF] bg-[#FFFBF8] md:flex md:w-[300px]`}>
                    <div className="border-b border-[#F0D1BF] px-4 py-4">
                        <p className="text-sm font-bold text-[#1D181A]">Chats</p>
                        <div className="relative mt-3">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B98A78]" />
                            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search recruiters" className="w-full rounded-lg border border-[#EBC2AE] bg-white py-2 pl-8 pr-3 text-xs outline-none placeholder:text-[#B98A78] focus:border-[#C75560]" />
                        </div>
                    </div>
                    {loadingConvos ? (
                        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-[#C75560]" /></div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="px-5 py-12 text-center text-xs leading-5 text-[#80576A]"><MessageCircle size={25} className="mx-auto mb-2 text-[#D5A99B]" />When a recruiter messages you, they will appear here.</div>
                    ) : (
                        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{filteredConversations.map((c) => {
                            const name = c.otherUser?.fullName || c.otherUser?.name || c.otherUser?.companyName || 'Recruiter';
                            const [from, to] = avatarGradient(name);
                            return (
                            <button
                                key={c._id}
                                type="button"
                                onClick={() => openThread(c._id)}
                                className={`mx-2 my-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded-full border border-[#F7E9E2] px-4 py-2 text-left transition-colors hover:bg-[#FFF0E8] ${activeId === c._id ? 'bg-[#FFF0E8]' : 'bg-white'}`}
                            >
                                <Avatar src={c.otherUser?.profilePictureUrl} name={name} size={36} />
                                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-[13px] font-semibold text-[#1D181A]">{name}</span>{c.lastMessage?.createdAt && <span className="shrink-0 text-[10px] text-[#B98A78]">{formatTime(c.lastMessage.createdAt)}</span>}</span><span className="mt-0.5 flex items-center justify-between gap-2"><span className="truncate text-[11px] text-[#80576A]">{c.chatPreference?.candidateClearedAt ? '' : c.lastMessage?.text}</span>{c.unreadCount > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C75560] px-1 text-[9px] font-bold text-white">{c.unreadCount}</span>}</span></span>
                            </button>
                            );
                        })}</div>
                    )}
                </aside>

                <div className={`${showConversationList ? 'hidden' : 'flex'} min-h-0 min-w-0 flex-1 flex-col bg-[#FFFDFB] md:flex`}>
                    {!activeId ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-[#80576A]">
                            <MessageCircle size={30} className="text-[#D5A99B]" /><p className="text-sm font-semibold text-[#1D181A]">Select a recruiter</p><p className="text-xs">Messages from recruiters will appear here.</p><button type="button" onClick={() => setShowConversationList(true)} className="mt-3 rounded-lg bg-[#C75560] px-4 py-2 text-xs font-bold text-white md:hidden">View recruiter messages</button>
                        </div>
                    ) : (
                        <>
                            <div data-chat-tools className="flex items-center gap-3 border-b border-[#F0D1BF] px-5 py-3.5">
                                <button type="button" onClick={() => setShowConversationList(true)} aria-label="Back to recruiter messages" title="Back to recruiter messages" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8] md:hidden"><ArrowLeft size={16} /></button>
                                <Avatar src={activeConvo?.otherUser?.profilePictureUrl} name={activeName} size={36} />
                                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#1D181A]">{activeName}</p><p className="mt-0.5 text-xs text-[#80576A]">{activeCompany}</p></div>
                                <div className="relative ml-auto">
                                    <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Chat options" title="Chat options" className="flex h-8 w-8 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#C75560]"><MoreVertical size={18} /></button>
                                    {menuOpen && <div className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-[#EBC2AE] bg-white p-1.5 shadow-xl"><button type="button" onClick={() => { setSearchOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"><Search size={14} /> Search chat</button><button type="button" onClick={clearChat} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#B3261E] hover:bg-[#FFF0EE]">Clear chat</button></div>}
                                </div>
                            </div>
                            {searchOpen && <div data-chat-tools className="border-b border-[#F0D1BF] px-5 py-2"><input autoFocus value={searchChat} onChange={(event) => setSearchChat(event.target.value)} placeholder="Search in this chat" className="w-full rounded-lg border border-[#EBC2AE] px-3 py-2 text-xs outline-none focus:border-[#C75560]" /></div>}
                            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                <div className="flex flex-col gap-4">{visibleDayGroups.map((group, groupIndex) => <div key={groupIndex} className="flex flex-col gap-1.5">{group.label && <div className="my-1 flex justify-center"><span className="rounded-full bg-[#FFF0E8] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#9A671A]">{group.label}</span></div>}{group.messages.map((m) => { const mine = m.sender === 'candidate'; return <div key={m._id} className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}><div className={`flex items-end gap-1.5 ${mine ? 'flex-row' : 'flex-row-reverse'}`}><div className={`max-w-[340px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[420px] ${mine ? 'rounded-br-sm bg-[#C75560] text-white' : 'rounded-bl-sm border border-[#F0D1BF] bg-white text-[#1D181A]'}`}>{m.text}</div><button type="button" onClick={() => copyMessage(m)} title="Copy message" aria-label="Copy message" className="hidden h-6 w-6 items-center justify-center rounded-full text-[#B98A78] opacity-0 hover:bg-[#FFF0E8] hover:text-[#C75560] group-hover:opacity-100 sm:flex">{copiedId === m._id ? <Check size={12} /> : <Copy size={12} />}</button></div><div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-[#B98A78] ${mine ? 'flex-row' : 'flex-row-reverse'}`}><span>{formatTime(m.createdAt)}</span>{mine && (m.read ? <CheckCheck size={11} className="text-[#C75560]" /> : <Check size={11} />)}</div></div>;})}</div>)}</div>
                            </div>
                            {canReply ? <div className="flex items-center gap-2 border-t border-[#F0D1BF] bg-white p-2 sm:p-3">
                                <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && sendReply()} placeholder={`Reply to ${activeName}`} className="min-w-0 flex-1 rounded-full border border-[#EBC2AE] bg-[#FFFDFC] px-4 py-2.5 text-sm outline-none focus:border-[#C75560]" />
                                <button type="button" onClick={sendReply} disabled={sending || !draft.trim()} aria-label="Send reply" title="Send reply" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C75560] text-white transition-colors hover:bg-[#A94658] disabled:cursor-not-allowed disabled:opacity-50">
                                    {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                </button>
                            </div> : <div className="border-t border-[#F0D1BF] bg-white px-4 py-3 text-center text-xs text-[#80576A]">{candidateRepliesEnabled ? 'You can reply after the recruiter sends the first message.' : 'This recruiter has disabled candidate replies.'}</div>}
                        </>
                    )}
                </div>
                </section>
            </div>
        </div>
    );
}
