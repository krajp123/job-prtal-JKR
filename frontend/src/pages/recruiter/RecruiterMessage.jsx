import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCheck, Copy, Loader2, MessageCircle, MoreVertical, Search, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import RecruiterNavbar from '../../components/RecruiterNavbar';
import axiosInstance from '../../api/axiosInstance';
import { connectSocket } from '../../socket';
import Avatar from '../../components/Avatar';

// ---- DUMMY DATA (preview only — real file wires this to axiosInstance) ----
const DUMMY_CONVERSATIONS = [
    {
        _id: 'c1',
        otherUser: { name: 'Nina Jordan' },
        lastMessage: { text: "Exactly my thoughts. I'll finalize the assets by tomorrow morning.", createdAt: '2026-08-21T12:34:00' },
        unreadCount: 2,
    },
    {
        _id: 'c2',
        otherUser: { name: 'Dr Nike Verma' },
        lastMessage: { text: 'Sure, I can join the 4 PM call.', createdAt: '2026-08-21T09:12:00' },
        unreadCount: 0,
    },
    {
        _id: 'c3',
        otherUser: { name: 'Janine Fernandes' },
        lastMessage: { text: 'Thanks for the update on the offer letter!', createdAt: '2026-08-20T18:03:00' },
        unreadCount: 0,
    },
    {
        _id: 'c4',
        otherUser: { name: 'Siren Cole' },
        lastMessage: { text: 'Will share my portfolio by tonight.', createdAt: '2026-08-19T10:37:00' },
        unreadCount: 1,
    },
    {
        _id: 'c5',
        otherUser: { name: 'Anna Holly' },
        lastMessage: { text: 'Got it, see you at the interview.', createdAt: '2026-08-17T15:20:00' },
        unreadCount: 0,
    },
];

const DUMMY_THREADS = {
    c1: [
        { _id: 'm1', sender: 'candidate', text: "I've reviewed the entire onboarding flow again — the screens still feel a bit complicated. Added a simplified version to Figma.", createdAt: '2026-08-20T12:34:00', read: true },
        { _id: 'm2', sender: 'recruiter', text: 'Just opened it. I agree, the shorter version feels smoother. The updated progress indicator also makes the steps clearer for new users.', createdAt: '2026-08-20T12:35:00', read: true },
        { _id: 'm3', sender: 'candidate', text: "Exactly my thoughts. If we all settle on this direction, I'll finalize the micro-interactions and export the assets by tomorrow morning.", createdAt: '2026-08-20T12:36:00', read: true },
        { _id: 'm4', sender: 'candidate', text: 'Sharing the updated resume too, let me know if the format works for your ATS.', createdAt: '2026-08-21T09:05:00', read: false },
        { _id: 'm5', sender: 'candidate', text: 'Also, are we still on for the technical round on Friday?', createdAt: '2026-08-21T09:06:00', read: false },
    ],
    c2: [
        { _id: 'm6', sender: 'recruiter', text: 'Hi Nike, are you available for a quick call at 4 PM today?', createdAt: '2026-08-21T09:10:00', read: true },
        { _id: 'm7', sender: 'candidate', text: 'Sure, I can join the 4 PM call.', createdAt: '2026-08-21T09:12:00', read: true },
    ],
    c3: [
        { _id: 'm8', sender: 'recruiter', text: 'Congratulations! Your offer letter has been sent to your registered email.', createdAt: '2026-08-20T18:00:00', read: true },
        { _id: 'm9', sender: 'candidate', text: 'Thanks for the update on the offer letter!', createdAt: '2026-08-20T18:03:00', read: true },
    ],
    c4: [
        { _id: 'm10', sender: 'recruiter', text: 'Could you share your latest portfolio when you get a chance?', createdAt: '2026-08-19T10:30:00', read: true },
        { _id: 'm11', sender: 'candidate', text: 'Will share my portfolio by tonight.', createdAt: '2026-08-19T10:37:00', read: false },
    ],
    c5: [
        { _id: 'm12', sender: 'recruiter', text: 'Your interview is confirmed for Monday, 11 AM.', createdAt: '2026-08-17T15:18:00', read: true },
        { _id: 'm13', sender: 'candidate', text: 'Got it, see you at the interview.', createdAt: '2026-08-17T15:20:00', read: true },
    ],
};
// ---- END DUMMY DATA ----

function initials(name) {
    if (!name) return '?';
    return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
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
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDayLabel(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';
    const today = new Date('2026-08-21T12:00:00');
    const yesterday = new Date('2026-08-20T12:00:00');
    const isSameDay = (a, b) => a.toDateString() === b.toDateString();
    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';
    return date.toLocaleDateString([], { day: 'numeric', month: 'long' });
}

function groupByDay(messages) {
    const groups = [];
    messages.forEach((message) => {
        const label = message.createdAt ? formatDayLabel(message.createdAt) : '';
        const lastGroup = groups[groups.length - 1];
        if (lastGroup && lastGroup.label === label) {
            lastGroup.messages.push(message);
        } else {
            groups.push({ label, messages: [message] });
        }
    });
    return groups;
}

export default function RecruiterMessagesPreview() {
    const [searchParams] = useSearchParams();
    const candidateIdFromUrl = searchParams.get('candidateId');
    const candidateNameFromUrl = searchParams.get('candidateName');
    const [conversations, setConversations] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [thread, setThread] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [error, setError] = useState('');
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [showConversationList, setShowConversationList] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchChat, setSearchChat] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [candidateRepliesEnabled, setCandidateRepliesEnabled] = useState(true);
    const [clearChatOpen, setClearChatOpen] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const sendingRef = useRef(false);
    const threadRequestRef = useRef(0);

    async function loadConversations() {
        try {
            const { data } = await axiosInstance.get('/messages/mine');
            setConversations(data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not load messages.');
        } finally {
            setLoadingConversations(false);
        }
    }

    async function openThread(candidateId) {
        const requestId = ++threadRequestRef.current;
        setShowConversationList(false);
        setError('');
        setMenuOpen(false);
        setSearchChat('');
        setSearchOpen(false);
        try {
            const [{ data }, { data: preference }] = await Promise.all([
                axiosInstance.get(`/messages/${candidateId}`),
                axiosInstance.get(`/messages/preference/${candidateId}`),
                axiosInstance.patch(`/messages/${candidateId}/read`),
            ]);
            if (requestId !== threadRequestRef.current) return;
            if (!data?.length && !conversations.some((conversation) => String(conversation._id) === String(candidateId))) {
                setActiveId(null);
                setThread([]);
                return;
            }
            setActiveId(candidateId);
            setThread(data || []);
            setCandidateRepliesEnabled(preference.candidateRepliesEnabled !== false);
            setConversations((previous) => previous.map((conversation) => (
                String(conversation._id) === String(candidateId) ? { ...conversation, unreadCount: 0 } : conversation
            )));
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Could not load this conversation.');
        } finally {
            inputRef.current?.focus();
        }
    }

    useEffect(() => {
        loadConversations();
        const socket = connectSocket();
        const handleNewMessage = (message) => {
            setActiveId((currentId) => {
                if (currentId && String(message.candidate) === String(currentId)) {
                    setThread((previous) => previous.some((item) => item._id === message._id) ? previous : [...previous, message]);
                    axiosInstance.patch(`/messages/${currentId}/read`).catch(() => {});
                    loadConversations().then(() => {
                        setConversations((previous) => previous.map((conversation) => (
                            String(conversation._id) === String(currentId) ? { ...conversation, unreadCount: 0 } : conversation
                        )));
                    });
                } else {
                    loadConversations();
                }
                return currentId;
            });
        };
        socket.on('newMessage', handleNewMessage);
        return () => socket.off('newMessage', handleNewMessage);
    }, []);

    useEffect(() => {
        if (candidateIdFromUrl) openThread(candidateIdFromUrl);
    }, [candidateIdFromUrl]);

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

    const activeConversation = useMemo(
        () => conversations.find((conversation) => String(conversation._id) === String(activeId)),
        [conversations, activeId]
    );
    const activeName = activeConversation?.otherUser?.name || activeConversation?.otherUser?.fullName || candidateNameFromUrl || 'Candidate';
    const activeEmail = activeConversation?.otherUser?.email || 'Email not available';

    const filteredConversations = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return conversations;
        return conversations.filter((conversation) => (
            (conversation.otherUser?.name || '').toLowerCase().includes(query)
            || (conversation.lastMessage?.text || '').toLowerCase().includes(query)
        ));
    }, [conversations, searchQuery]);

    const totalUnread = useMemo(
        () => conversations.reduce((sum, conversation) => sum + (conversation.unreadCount || 0), 0),
        [conversations]
    );

    const dayGroups = useMemo(() => groupByDay(thread), [thread]);

    const visibleThread = useMemo(() => {
        const query = searchChat.trim().toLowerCase();
        return query ? thread.filter((message) => message.text?.toLowerCase().includes(query)) : thread;
    }, [thread, searchChat]);

    const visibleDayGroups = useMemo(() => groupByDay(visibleThread), [visibleThread]);

    function clearChat() {
        if (!activeId) return;
        setMenuOpen(false);
        setClearChatOpen(true);
    }

    async function confirmClearChat() {
        if (!activeId) return;
        await axiosInstance.delete(`/messages/${activeId}`);
        setThread([]);
        setConversations((previous) => previous.map((conversation) => (
            String(conversation._id) === String(activeId)
                ? { ...conversation, lastMessage: { ...conversation.lastMessage, text: '' }, unreadCount: 0 }
                : conversation
        )));
            setClearChatOpen(false);
    }

    async function toggleCandidateReplies() {
        const nextValue = !candidateRepliesEnabled;
        await axiosInstance.patch(`/messages/preference/${activeId}`, { candidateRepliesEnabled: nextValue });
        setCandidateRepliesEnabled(nextValue);
        setMenuOpen(false);
    }

    async function sendMessage() {
        const text = draft.trim();
        if (!text || !activeId || sendingRef.current) return;
        sendingRef.current = true;
        setSending(true);
        setDraft('');
        try {
            const endpoint = activeConversation || thread.length ? '/messages/reply' : '/messages/start';
            const { data } = await axiosInstance.post(endpoint, { candidateId: activeId, text });
            setThread((previous) => previous.some((item) => item._id === data._id) ? previous : [...previous, data]);
            loadConversations();
        } catch (requestError) {
            setDraft(text);
            setError(requestError.response?.data?.error || 'Message could not be sent.');
        } finally {
            sendingRef.current = false;
            setSending(false);
            inputRef.current?.focus();
        }
    }

    async function copyMessage(message) {
        try {
            await navigator.clipboard.writeText(message.text || '');
            setCopiedId(message._id);
            setTimeout(() => setCopiedId((current) => (current === message._id ? null : current)), 1500);
        } catch {
            // Clipboard not available in this environment — nothing to recover from
        }
    }

    return (
        <div className="flex min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#FFF7F2]">
            <RecruiterNavbar />
            <div className="recruiter-page mx-auto mb-3 w-full max-w-6xl px-4 pt-3 sm:px-6 sm:pt-4">
                <h1 className="mt-1 text-2xl font-bold text-[#1D181A]">Messages</h1>
                <p className="mt-1 text-sm text-[#80576A]">
                    Connect with candidates from one focused inbox.
                    {totalUnread > 0 && <span className="ml-1 font-semibold text-[#C75560]">{totalUnread} unread</span>}
                </p>
                {error && <p className="mt-3 rounded-lg border border-[#E9B6AF] bg-[#FFF0EE] px-3 py-2 text-sm text-[#B3261E]">{error}</p>}
            </div>

            <section className="relative mx-auto mb-4 flex h-[calc(100dvh-190px)] w-[calc(100%-2rem)] min-h-[420px] max-w-6xl flex-none overflow-hidden rounded-none border border-[#EBC2AE] bg-white shadow-sm sm:mb-6 sm:w-[calc(100%-3rem)] md:max-h-[560px]">
                <aside className={`absolute inset-0 z-10 flex min-h-0 w-full shrink-0 flex-col border-r border-[#F0D1BF] bg-[#FFFBF8] transition-[transform,opacity] duration-300 ease-out will-change-transform md:static md:z-auto md:flex md:w-[300px] md:translate-x-0 md:opacity-100 ${activeId && !showConversationList ? 'pointer-events-none -translate-x-full opacity-0' : 'translate-x-0 opacity-100'}`}>
                    <div className="border-b border-[#F0D1BF] px-4 py-4">
                        <p className="text-sm font-bold text-[#1D181A]">Chats</p>
                        <div className="relative mt-3">
                            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#B98A78]" />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Search candidates"
                                className="w-full rounded-lg border border-[#EBC2AE] bg-white py-2 pl-8 pr-3 text-xs text-[#1D181A] outline-none transition-colors placeholder:text-[#B98A78] focus:border-[#C75560]"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {loadingConversations ? (
                            <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-[#C75560]" /></div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="px-5 py-12 text-center text-xs leading-5 text-[#80576A]">
                                <MessageCircle size={25} className="mx-auto mb-2 text-[#D5A99B]" />
                                {searchQuery ? 'No candidates match your search.' : 'No candidate messages yet.'}
                            </div>
                        ) : filteredConversations.map((conversation) => {
                            const isActive = String(activeId) === String(conversation._id);
                            const candidateName = conversation.otherUser?.name || conversation.otherUser?.fullName || 'Candidate';
                            return (
                                <button
                                    key={conversation._id}
                                    type="button"
                                    onClick={() => openThread(conversation._id)}
                                    className={`mx-2 my-1 flex w-[calc(100%-1rem)] items-center gap-3 rounded-full border border-[#F7E9E2] px-4 py-2 text-left transition-colors hover:bg-[#FFF0E8] ${isActive ? 'bg-[#FFF0E8]' : 'bg-white'}`}
                                >
                                    <Avatar src={conversation.otherUser?.profile?.profilePictureUrl} name={candidateName} size={36} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className={`truncate text-[13px] ${conversation.unreadCount > 0 ? 'font-bold text-[#1D181A]' : 'font-semibold text-[#1D181A]'}`}>
                                                {candidateName}
                                            </span>
                                            {conversation.lastMessage?.createdAt && (
                                                <span className="shrink-0 text-[10px] text-[#B98A78]">{formatTime(conversation.lastMessage.createdAt)}</span>
                                            )}
                                        </span>
                                        <span className="mt-0.5 flex items-center justify-between gap-2">
                                            <span className={`truncate text-[11px] ${conversation.unreadCount > 0 ? 'font-semibold text-[#1D181A]' : 'text-[#80576A]'}`}>
                                                {conversation.chatPreference?.recruiterClearedAt ? '' : conversation.lastMessage?.text}
                                            </span>
                                            {conversation.unreadCount > 0 && (
                                                <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[#C75560] px-1 text-[9px] font-bold text-white">
                                                    {conversation.unreadCount}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <div className={`${activeId ? 'flex' : 'hidden md:flex'} absolute inset-0 z-20 min-h-0 min-w-0 flex-col overflow-hidden bg-[#FFFDFB] transition-[transform,opacity] duration-300 ease-out will-change-transform md:static md:z-auto md:flex-1 md:translate-x-0 md:opacity-100 ${activeId && !showConversationList ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-full opacity-0 md:pointer-events-auto'}`}>
                    {!activeId ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-[#80576A]">
                            <MessageCircle size={30} className="text-[#D5A99B]" />
                            <p className="text-sm font-semibold text-[#1D181A]">Select a candidate</p>
                            <p className="text-xs">Messages from candidates will appear here.</p>
                            <button type="button" onClick={() => setShowConversationList(true)} className="mt-3 rounded-lg bg-[#C75560] px-4 py-2 text-xs font-bold text-white md:hidden">View candidate messages</button>
                        </div>
                    ) : (
                        <>
                    <div data-chat-tools className="flex items-center gap-3 border-b border-[#F0D1BF] px-5 py-3.5">
                        <button
                            type="button"
                            onClick={() => setShowConversationList(true)}
                            aria-label="Back to conversations"
                            title="Back to conversations"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#80576A] transition-colors hover:bg-[#FFF0E8] hover:text-[#C75560] md:hidden"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <Avatar src={activeConversation?.otherUser?.profile?.profilePictureUrl} name={activeName} size={36} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-[#1D181A]">{activeName}</p>
                            <p className="mt-0.5 truncate text-xs text-[#80576A]">{activeEmail}</p>
                        </div>
                        <div className="relative ml-auto">
                            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="Chat options" title="Chat options" className="flex h-8 w-8 items-center justify-center rounded-full text-[#80576A] hover:bg-[#FFF0E8] hover:text-[#C75560]"><MoreVertical size={18} /></button>
                            {menuOpen && <div className="absolute right-0 top-10 z-20 w-64 rounded-xl border border-[#EBC2AE] bg-white p-1.5 shadow-xl">
                                <button type="button" onClick={() => { setSearchOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"><Search size={14} /> Search chat</button>
                                <button type="button" onClick={clearChat} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#B3261E] hover:bg-[#FFF0EE]">Clear chat</button>
                                <button type="button" onClick={toggleCandidateReplies} className="flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#1D181A] hover:bg-[#FFF0E8]"><span className={`mt-0.5 h-3 w-3 rounded-sm border ${candidateRepliesEnabled ? 'border-[#C75560] bg-[#C75560]' : 'border-[#B98A78]'}`} />{candidateRepliesEnabled ? 'Disable candidate replies' : 'Allow candidate replies'}</button>
                            </div>}
                        </div>
                    </div>
                    {searchOpen && <div data-chat-tools className="border-b border-[#F0D1BF] px-5 py-2"><input autoFocus value={searchChat} onChange={(event) => setSearchChat(event.target.value)} placeholder="Search in this chat" className="w-full rounded-lg border border-[#EBC2AE] px-3 py-2 text-xs outline-none focus:border-[#C75560]" /></div>}

                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <div className="flex flex-col gap-4">
                                {visibleDayGroups.map((group, groupIndex) => (
                                    <div key={groupIndex} className="flex flex-col gap-1.5">
                                        {group.label && (
                                            <div className="my-1 flex items-center justify-center">
                                                <span className="rounded-full bg-[#FFF0E8] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#9A671A]">
                                                    {group.label}
                                                </span>
                                            </div>
                                        )}
                                        {group.messages.map((message) => {
                                            const mine = message.sender === 'recruiter';
                                            return (
                                                <div key={message._id} className={`group flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                                                    <div className={`flex items-end gap-1.5 ${mine ? 'flex-row' : 'flex-row-reverse'}`}>
                                                        <div
                                                            className={`max-w-[340px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed sm:max-w-[420px] ${
                                                                mine
                                                                    ? 'rounded-br-sm bg-[#C75560] text-white'
                                                                    : 'rounded-bl-sm border border-[#F0D1BF] bg-white text-[#1D181A]'
                                                            }`}
                                                        >
                                                            {message.text}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => copyMessage(message)}
                                                            title="Copy message"
                                                            className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#B98A78] opacity-0 transition-opacity hover:bg-[#FFF0E8] hover:text-[#C75560] group-hover:opacity-100 sm:flex"
                                                        >
                                                            {copiedId === message._id ? <Check size={12} /> : <Copy size={12} />}
                                                        </button>
                                                    </div>
                                                    <div className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-[#B98A78] ${mine ? 'flex-row' : 'flex-row-reverse'}`}>
                                                        <span>{formatTime(message.createdAt)}</span>
                                                        {mine && (message.read ? <CheckCheck size={11} className="text-[#C75560]" /> : <Check size={11} />)}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border-t border-[#F0D1BF] bg-white p-3">
                        <input
                            ref={inputRef}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => event.key === 'Enter' && sendMessage()}
                            placeholder={`Write a message to ${activeName}`}
                            className="min-w-0 flex-1 rounded-full border border-[#EBC2AE] bg-[#FFFDFC] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#C75560]"
                        />
                        <button
                            type="button"
                            onClick={sendMessage}
                            disabled={sending || !draft.trim()}
                            aria-label="Send message"
                            title="Send message"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C75560] text-white transition-colors hover:bg-[#A94658] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                    </div>
                        </>
                    )}
                </div>
            </section>
            {clearChatOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D181A]/35 px-4" role="dialog" aria-modal="true" aria-labelledby="clear-chat-title">
                    <div className="w-full max-w-sm rounded-2xl border border-[#EBC2AE] bg-[#FFFDFB] p-5 shadow-2xl">
                        <h2 id="clear-chat-title" className="text-base font-bold text-[#1D181A]">Clear this chat?</h2>
                        <p className="mt-2 text-sm leading-5 text-[#80576A]">All messages in this conversation will be removed for you.</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" onClick={() => setClearChatOpen(false)} className="rounded-lg border border-[#EBC2AE] px-4 py-2 text-xs font-semibold text-[#80576A] transition-colors hover:bg-[#FFF0E8]">Cancel</button>
                            <button type="button" onClick={confirmClearChat} className="rounded-lg bg-[#C75560] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#A94658]">Clear chat</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}