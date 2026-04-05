import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Banknote, Briefcase, CalendarDays, ClipboardList, Clock3, Download, File, FileText, Flame, FolderKanban, HeartHandshake, Home, LogOut, MoreHorizontal, MessageSquare, Mic, Paperclip, Plus, Globe, User as UserIcon, Pin, Phone, Reply, Search, Send, Settings, Shield, Smile, Users, Video, } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { mockWorkspace } from "@/data/mockWorkspace";
import { CALENDAR_SECTION_META, CALENDAR_UPCOMING_CARD } from "@/constants/calendarSections";
import { io } from "socket.io-client";
import { useAuth } from "@/auth/AuthContext";
import { API_BASE_URL, SOCKET_ORIGIN } from "@/config";
import { useNavigate } from "react-router-dom";
import { CalendarAnnouncementMessage } from "@/components/chat/CalendarAnnouncementMessage";
import { NewChatModal } from "@/components/chat/NewChatModal";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { FriendsPanel } from "@/components/friends/FriendsPanel";
import { MeetingsWorkspacePanel } from "@/components/meetings/MeetingsWorkspacePanel";
import { NewsFeedPanel } from "@/components/news/NewsFeedPanel";
import { resolvePresenceForSection } from "@/utils/resolveUserPresence";
import { maskPhoneDigits } from "@/utils/maskPhone";
import { displayChatTitle, enrichOfflineRooms, lastRoomStorageKey, pickDefaultRoomForSection, roomsForSection, sortByActivity, sortGlobalsMainFirst, } from "@/utils/workspaceChats";
const iconBySection = {
    familie: Home,
    freunde: Users,
    verwandte: HeartHandshake,
    feuerwehr: Flame,
    arbeit: Briefcase,
    ideen: FolderKanban,
};
const sectionTheme = {
    familie: {
        chip: "text-cyan-200",
        border: "border-cyan-300/30",
        panel: "from-cyan-500/20 to-blue-500/10",
        led: "from-cyan-400 via-blue-400 to-cyan-300",
    },
    freunde: {
        chip: "text-fuchsia-200",
        border: "border-fuchsia-300/30",
        panel: "from-fuchsia-500/20 to-pink-500/10",
        led: "from-fuchsia-400 via-violet-400 to-pink-300",
    },
    verwandte: {
        chip: "text-rose-200",
        border: "border-rose-300/30",
        panel: "from-rose-500/20 to-pink-500/10",
        led: "from-rose-400 via-pink-400 to-rose-300",
    },
    feuerwehr: {
        chip: "text-orange-200",
        border: "border-orange-300/30",
        panel: "from-red-500/20 to-orange-500/10",
        led: "from-red-400 via-orange-400 to-yellow-300",
    },
    arbeit: {
        chip: "text-amber-200",
        border: "border-amber-300/30",
        panel: "from-amber-500/20 to-yellow-500/10",
        led: "from-amber-400 via-yellow-400 to-amber-300",
    },
    ideen: {
        chip: "text-emerald-200",
        border: "border-emerald-300/30",
        panel: "from-emerald-500/20 to-teal-500/10",
        led: "from-emerald-400 via-teal-400 to-emerald-300",
    },
};
function currentTimeHHMM() {
    return new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
const friendGroupOptions = [
    { value: "familie", label: "Familie", emoji: "👨‍👩‍👧" },
    { value: "freunde", label: "Freunde", emoji: "🤝" },
    { value: "verwandte", label: "Verwandte", emoji: "💞" },
    { value: "feuerwehr", label: "Feuerwehr", emoji: "🚒" },
    { value: "arbeit", label: "Arbeit", emoji: "💼" },
    { value: "ideen", label: "Ideen", emoji: "💡" },
    { value: "schule", label: "Schule", emoji: "🎓" },
    { value: "verein", label: "Verein", emoji: "⚽" },
    { value: "nachbarn", label: "Nachbarn", emoji: "🏡" },
    { value: "sonstiges", label: "Sonstiges", emoji: "✨" },
];
function formatBytes(n) {
    if (n < 1024)
        return `${n} B`;
    if (n < 1024 * 1024)
        return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
const STATUS_PILL = {
    online: {
        label: "Online",
        className: "bg-emerald-500/20 text-emerald-200 border-emerald-400/35",
    },
    away: {
        label: "Abwesend",
        className: "bg-amber-500/20 text-amber-100 border-amber-400/35",
    },
    busy: {
        label: "Beschäftigt",
        className: "bg-violet-500/20 text-violet-100 border-violet-400/35",
    },
    offline: {
        label: "Offline",
        className: "bg-white/10 text-white/55 border-white/15",
    },
    on_call: {
        label: "Im Einsatz",
        className: "bg-red-600/35 text-red-100 border-red-400/55 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse",
    },
};
function formatSidebarUpcomingTime(iso, allDay) {
    if (allDay)
        return "Ganztägig";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    const now = new Date();
    const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const d0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((d0 - day0) / 86400000);
    const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 0)
        return `Heute ${time}`;
    if (diffDays === 1)
        return `Morgen ${time}`;
    if (diffDays === 2)
        return `Übermorgen ${time}`;
    if (diffDays > 0 && diffDays < 7) {
        return `${d.toLocaleDateString("de-DE", { weekday: "short" })} ${time}`;
    }
    return d.toLocaleDateString("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function upcomingCardClasses(sectionId) {
    const sid = sectionId in CALENDAR_UPCOMING_CARD ? sectionId : "familie";
    return CALENDAR_UPCOMING_CARD[sid];
}
function StatusPill({ presence }) {
    const s = STATUS_PILL[presence];
    return (_jsx("span", { className: `inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full border ${s.className}`, children: s.label }));
}
export default function NeonLinkMockup() {
    const { user: authUser, token, authFetch, logout, regenerateFriendCode } = useAuth();
    const navigate = useNavigate();
    const currentUser = authUser;
    const [activeSection, setActiveSection] = useState(mockWorkspace.sections[0].id);
    const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
    const [workspaceLabel, setWorkspaceLabel] = useState("");
    const [activeRoomId, setActiveRoomId] = useState("");
    const [chatMessages, setChatMessages] = useState([]);
    const [messageInput, setMessageInput] = useState("");
    const [serverRooms, setServerRooms] = useState([]);
    const [newChatOpen, setNewChatOpen] = useState(false);
    const [unreadByRoomId, setUnreadByRoomId] = useState({});
    const [workspaceChatMembers, setWorkspaceChatMembers] = useState([]);
    const [usersById, setUsersById] = useState({});
    const [isBackendOnline, setIsBackendOnline] = useState(false);
    const [inviteCode, setInviteCode] = useState("");
    const [generatedInviteCode, setGeneratedInviteCode] = useState("");
    const [inviteInfo, setInviteInfo] = useState("");
    const [friendSearch, setFriendSearch] = useState("");
    const [friendSearchResults, setFriendSearchResults] = useState([]);
    const [incomingFriendRequests, setIncomingFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [friendInfo, setFriendInfo] = useState("");
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [mainView, setMainView] = useState("chat");
    const [meetingRooms, setMeetingRooms] = useState([]);
    const [meetingInviteEvents, setMeetingInviteEvents] = useState([]);
    const [seenMeetingInviteIds, setSeenMeetingInviteIds] = useState(() => new Set());
    const [calendarNewsEvents, setCalendarNewsEvents] = useState([]);
    const [seenCalendarNewsIds, setSeenCalendarNewsIds] = useState(() => new Set());
    const [activeMeetingRoomId, setActiveMeetingRoomId] = useState(null);
    const [meetingsInRoom, setMeetingsInRoom] = useState([]);
    const [replyToMessageId, setReplyToMessageId] = useState(null);
    const [pendingAttachments, setPendingAttachments] = useState([]);
    const [typingByUser, setTypingByUser] = useState({});
    const [appNotice, setAppNotice] = useState(null);
    const [chatSidebarSearch, setChatSidebarSearch] = useState("");
    const [reactionBarForMessageId, setReactionBarForMessageId] = useState(null);
    const [messageOverflowId, setMessageOverflowId] = useState(null);
    const [emojiBarOpen, setEmojiBarOpen] = useState(false);
    const socketRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageInputRef = useRef(null);
    const usersByIdRef = useRef({});
    const senderUserIdRef = useRef("");
    const currentUserRef = useRef(null);
    const activeRoomIdRef = useRef(activeRoomId);
    const activeSectionRef = useRef(activeSection);
    const typingStopTimerRef = useRef(null);
    const skipNextUnreadPersistRef = useRef(false);
    const sections = mockWorkspace.sections;
    const [sidebarUpcoming, setSidebarUpcoming] = useState([]);
    const workspaceScopeId = activeWorkspaceId ?? mockWorkspace.id;
    const sourceRooms = useMemo(() => {
        if (serverRooms.length > 0)
            return serverRooms;
        if (activeWorkspaceId)
            return [];
        return enrichOfflineRooms(mockWorkspace.rooms, mockWorkspace.id);
    }, [serverRooms, activeWorkspaceId]);
    const rooms = useMemo(() => roomsForSection(sourceRooms, activeSection).filter((room) => room.workspaceId === workspaceScopeId), [sourceRooms, activeSection, workspaceScopeId]);
    const lastActivityByRoom = useMemo(() => {
        const m = {};
        for (const msg of chatMessages) {
            const t = msg.createdAtMs;
            if (t == null)
                continue;
            const prev = m[msg.roomId] ?? 0;
            if (t > prev)
                m[msg.roomId] = t;
        }
        return m;
    }, [chatMessages]);
    const previewByRoomId = useMemo(() => {
        const best = {};
        for (const msg of chatMessages) {
            const t = msg.createdAtMs ?? 0;
            const prev = best[msg.roomId];
            if (!prev || t >= prev.t)
                best[msg.roomId] = { t, text: msg.text };
        }
        const out = {};
        for (const [id, v] of Object.entries(best)) {
            out[id] = v.text.length > 44 ? `${v.text.slice(0, 41)}…` : v.text;
        }
        return out;
    }, [chatMessages]);
    const globalRooms = useMemo(() => [...rooms].filter((r) => r.chatType === "global").sort(sortGlobalsMainFirst), [rooms]);
    const groupRooms = useMemo(() => sortByActivity(rooms.filter((r) => r.chatType === "group"), lastActivityByRoom), [rooms, lastActivityByRoom]);
    const privateRooms = useMemo(() => sortByActivity(rooms.filter((r) => r.chatType === "private"), lastActivityByRoom), [rooms, lastActivityByRoom]);
    const userNamesById = useMemo(() => {
        const m = {};
        for (const [id, u] of Object.entries(usersById)) {
            m[id] = u.displayName;
        }
        return m;
    }, [usersById]);
    const meetingNamesById = useMemo(() => {
        const m = { ...userNamesById };
        if (currentUser)
            m[currentUser.id] = currentUser.displayName;
        return m;
    }, [userNamesById, currentUser]);
    const membersExcludingSelf = useMemo(() => workspaceChatMembers.filter((m) => m.id !== currentUser?.id), [workspaceChatMembers, currentUser?.id]);
    const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) ?? rooms[0], [rooms, activeRoomId]);
    const roomMessages = useMemo(() => chatMessages.filter((message) => message.roomId === (activeRoom?.id ?? "")), [chatMessages, activeRoom]);
    const replyTarget = useMemo(() => (replyToMessageId ? roomMessages.find((m) => m.id === replyToMessageId) ?? null : null), [replyToMessageId, roomMessages]);
    const typingNames = Object.values(typingByUser);
    const typingOthersLabel = typingNames.length === 0
        ? null
        : typingNames.length === 1
            ? `${typingNames[0]} tippt gerade...`
            : `${typingNames.join(", ")} tippen gerade...`;
    const activeSectionData = useMemo(() => sections.find((section) => section.id === activeSection) ?? sections[0], [activeSection]);
    const visibleFriendsForSection = useMemo(() => friends.filter((friend) => friend.group === activeSection), [friends, activeSection]);
    const pinnedMessage = roomMessages[0];
    const roomParticipants = Math.max(1, visibleFriendsForSection.length + 1);
    const roomOnline = visibleFriendsForSection.filter((friend) => friend.status === "online").length + 1;
    const activeTheme = sectionTheme[activeSection];
    const myEffectivePresence = useMemo(() => {
        if (!currentUser)
            return "offline";
        return resolvePresenceForSection(currentUser.status, currentUser.statusBySection, activeSection);
    }, [currentUser, activeSection]);
    const onSelectSection = (sectionId) => {
        setMainView("chat");
        setActiveSection(sectionId);
        const inSection = sourceRooms.filter((room) => room.sectionId === sectionId && room.workspaceId === workspaceScopeId);
        if (inSection.length === 0)
            return;
        const key = activeWorkspaceId ? lastRoomStorageKey(activeWorkspaceId, sectionId) : null;
        const saved = key ? localStorage.getItem(key) : null;
        const nextId = saved && inSection.some((r) => r.id === saved)
            ? saved
            : pickDefaultRoomForSection(inSection);
        setActiveRoomId(nextId);
    };
    const selectChatRoom = (roomId) => {
        setMainView("chat");
        setActiveRoomId(roomId);
    };
    const senderUserId = currentUser?.id ?? "";
    const chatSearchLower = chatSidebarSearch.trim().toLowerCase();
    const roomMatchesSearch = useCallback((room) => {
        if (!chatSearchLower)
            return true;
        const title = displayChatTitle(room, senderUserId, userNamesById);
        return (room.name.toLowerCase().includes(chatSearchLower) ||
            title.toLowerCase().includes(chatSearchLower));
    }, [chatSearchLower, senderUserId, userNamesById]);
    const globalRoomsFiltered = useMemo(() => globalRooms.filter(roomMatchesSearch), [globalRooms, roomMatchesSearch]);
    const groupRoomsFiltered = useMemo(() => groupRooms.filter(roomMatchesSearch), [groupRooms, roomMatchesSearch]);
    const privateRoomsFiltered = useMemo(() => privateRooms.filter(roomMatchesSearch), [privateRooms, roomMatchesSearch]);
    const markMeetingInviteSeen = (eventId) => {
        if (!currentUser)
            return;
        setSeenMeetingInviteIds((prev) => {
            if (prev.has(eventId))
                return prev;
            const next = new Set(prev);
            next.add(eventId);
            try {
                localStorage.setItem(`neonlink:seenMeetInv:${currentUser.id}`, JSON.stringify([...next]));
            }
            catch {
                /* ignore quota */
            }
            return next;
        });
    };
    const newsFeedItems = useMemo(() => {
        const uid = senderUserId;
        if (!uid)
            return [];
        const items = [];
        for (const req of incomingFriendRequests) {
            const name = req.fromDisplayName ?? usersById[req.fromUserId]?.displayName ?? "Jemand";
            items.push({
                id: `fr-${req.id}`,
                kind: "friend_request",
                title: `Freundschaftsanfrage von ${name}`,
                subtitle: "Im Freunde-Bereich rechts annehmen oder ablehnen.",
                at: 0,
                requestId: req.id,
            });
        }
        for (const [roomId, count] of Object.entries(unreadByRoomId)) {
            if (!count || count <= 0)
                continue;
            const room = sourceRooms.find((r) => r.id === roomId);
            if (!room)
                continue;
            const title = displayChatTitle(room, uid, userNamesById);
            items.push({
                id: `chat-${roomId}`,
                kind: "chat_unread",
                title: `${count} neue Nachricht${count > 1 ? "en" : ""} in „${title}“`,
                subtitle: "Zum Chat wechseln und lesen.",
                at: lastActivityByRoom[roomId] ?? 0,
                roomId,
                sectionId: room.sectionId,
                unreadCount: count,
            });
        }
        for (const ev of meetingInviteEvents) {
            if (seenMeetingInviteIds.has(ev.id))
                continue;
            const creator = usersById[ev.createdByUserId]?.displayName ?? "Jemand";
            const start = new Date(ev.startsAt);
            const fmt = start.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
            const nowMs = Date.now();
            items.push({
                id: `meet-${ev.id}`,
                kind: "meeting_invite",
                title: `Meeting-Einladung: ${ev.title}`,
                subtitle: `Von ${creator} · ${fmt}`,
                at: start.getTime() > nowMs ? start.getTime() : nowMs,
                calendarEventId: ev.id,
                meetingRoomId: ev.meetingRoomId ?? null,
                sectionId: ev.sectionId,
            });
        }
        for (const ev of calendarNewsEvents) {
            if (seenCalendarNewsIds.has(ev.id))
                continue;
            const creator = usersById[ev.createdByUserId]?.displayName ?? "Jemand";
            const rub = CALENDAR_SECTION_META[ev.sectionId] ?? CALENDAR_SECTION_META.familie;
            const art = ev.kind === "vacation" ? "Urlaub" : ev.kind === "ferien" ? "Ferien" : "Termin";
            const start = new Date(ev.startsAt);
            const fmt = start.toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
            const atMs = ev.createdAt ? new Date(ev.createdAt).getTime() : start.getTime();
            items.push({
                id: `caln-${ev.id}`,
                kind: "calendar_event",
                title: `Neuer Termin: ${ev.title}`,
                subtitle: `Von ${creator} · ${fmt} · ${rub.label} · ${art}`,
                at: atMs,
                calendarNewsEventId: ev.id,
                sectionId: ev.sectionId,
            });
        }
        const kindPrio = (k) => k === "friend_request" ? 3 : k === "meeting_invite" || k === "calendar_event" ? 2 : 1;
        items.sort((a, b) => {
            const d = kindPrio(b.kind) - kindPrio(a.kind);
            if (d !== 0)
                return d;
            return b.at - a.at;
        });
        return items;
    }, [
        incomingFriendRequests,
        meetingInviteEvents,
        unreadByRoomId,
        sourceRooms,
        senderUserId,
        userNamesById,
        lastActivityByRoom,
        seenMeetingInviteIds,
        usersById,
        calendarNewsEvents,
        seenCalendarNewsIds,
    ]);
    const newsBellCount = useMemo(() => {
        let n = incomingFriendRequests.length;
        n += Object.values(unreadByRoomId).filter((c) => c > 0).length;
        n += meetingInviteEvents.filter((e) => !seenMeetingInviteIds.has(e.id)).length;
        n += calendarNewsEvents.filter((e) => !seenCalendarNewsIds.has(e.id)).length;
        return n;
    }, [
        incomingFriendRequests.length,
        unreadByRoomId,
        meetingInviteEvents,
        seenMeetingInviteIds,
        calendarNewsEvents,
        seenCalendarNewsIds,
    ]);
    const fetchJson = async (path) => {
        const response = await authFetch(path);
        if (response.status === 401) {
            await logout();
            navigate("/login", { replace: true });
            throw new Error("unauthorized");
        }
        if (!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
    };
    useEffect(() => {
        if (currentUser) {
            const su = {
                id: currentUser.id,
                displayName: currentUser.displayName,
                email: currentUser.email,
                status: currentUser.status,
                friendCode: currentUser.friendCode,
                avatarUrl: currentUser.avatarUrl,
                phoneDigits: currentUser.phoneDigits,
                bio: currentUser.bio,
                statusMessage: currentUser.statusMessage,
                statusBySection: currentUser.statusBySection,
            };
            setUsersById((prev) => ({ ...prev, [currentUser.id]: su }));
        }
    }, [currentUser]);
    usersByIdRef.current = usersById;
    senderUserIdRef.current = senderUserId || "local";
    currentUserRef.current = currentUser;
    activeRoomIdRef.current = activeRoomId;
    activeSectionRef.current = activeSection;
    const mapServerMessageToChat = (message) => {
        const uidRef = senderUserIdRef.current;
        const users = usersByIdRef.current;
        const sender = users[message.senderUserId];
        const senderName = message.senderUserId === uidRef ? "Du" : sender?.displayName ?? `User ${message.senderUserId}`;
        let replyTo;
        if (message.replyToId && message.replyPreview) {
            const replyFromId = message.replySenderId;
            const replyFrom = replyFromId === uidRef
                ? "Du"
                : replyFromId
                    ? users[replyFromId]?.displayName ?? "Unbekannt"
                    : "Nachricht";
            replyTo = { messageId: message.replyToId, from: replyFrom, preview: message.replyPreview };
        }
        const pres = sender
            ? resolvePresenceForSection(sender.status, sender.statusBySection, activeSectionRef.current)
            : "offline";
        const roleFromPeer = pres === "on_call" ? "alert" : pres === "busy" ? "admin" : pres === "online" ? "online" : "away";
        return {
            id: message.id,
            roomId: message.roomId,
            from: senderName,
            role: message.senderUserId === uidRef ? "online" : roleFromPeer,
            text: message.body,
            time: new Date(message.createdAt).toLocaleTimeString("de-DE", {
                hour: "2-digit",
                minute: "2-digit",
            }),
            createdAtMs: new Date(message.createdAt).getTime(),
            senderUserId: message.senderUserId,
            avatarUrl: message.senderUserId === uidRef
                ? currentUserRef.current?.avatarUrl ?? null
                : sender?.avatarUrl ?? null,
            replyTo,
            attachments: message.attachments,
            calendarAnnouncement: message.calendarAnnouncement,
        };
    };
    const sendMessage = async () => {
        const trimmed = messageInput.trim();
        const hasFiles = pendingAttachments.length > 0;
        if ((!trimmed && !hasFiles) || !activeRoom)
            return;
        try {
            const response = await authFetch(`/rooms/${activeRoom.id}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    senderUserId,
                    body: trimmed,
                    replyToId: replyToMessageId ?? undefined,
                    attachments: hasFiles ? pendingAttachments : undefined,
                }),
            });
            if (response.status === 401) {
                await logout();
                navigate("/login", { replace: true });
                return;
            }
            if (!response.ok)
                throw new Error("Message send failed");
            setMessageInput("");
            setReplyToMessageId(null);
            setPendingAttachments([]);
        }
        catch {
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `msg-local-${Date.now()}`,
                    roomId: activeRoom.id,
                    from: "Du",
                    role: "online",
                    text: trimmed || "(Anhang lokal)",
                    time: currentTimeHHMM(),
                    createdAtMs: Date.now(),
                    senderUserId: senderUserId || undefined,
                    avatarUrl: currentUser?.avatarUrl ?? null,
                },
            ]);
            setMessageInput("");
            setReplyToMessageId(null);
            setPendingAttachments([]);
        }
    };
    /** Kurznachricht (z. B. Emoji-Reaktion) ohne Eingabefeld zu leeren. */
    const sendTextToActiveRoom = async (text, replyToId) => {
        const trimmed = text.trim();
        if (!trimmed || !activeRoom)
            return;
        try {
            const response = await authFetch(`/rooms/${activeRoom.id}/messages`, {
                method: "POST",
                body: JSON.stringify({
                    senderUserId,
                    body: trimmed,
                    replyToId: replyToId ?? undefined,
                }),
            });
            if (response.status === 401) {
                await logout();
                navigate("/login", { replace: true });
                return;
            }
            if (!response.ok)
                throw new Error("Message send failed");
        }
        catch {
            setChatMessages((prev) => [
                ...prev,
                {
                    id: `msg-local-${Date.now()}`,
                    roomId: activeRoom.id,
                    from: "Du",
                    role: "online",
                    text: trimmed,
                    time: currentTimeHHMM(),
                    createdAtMs: Date.now(),
                    senderUserId: senderUserId || undefined,
                    avatarUrl: currentUser?.avatarUrl ?? null,
                },
            ]);
        }
    };
    const openVoiceRoom = () => {
        const vr = rooms.find((r) => r.kind === "voice");
        if (vr) {
            setMainView("chat");
            setActiveRoomId(vr.id);
            setAppNotice(null);
            return;
        }
        setAppNotice("In diesem Bereich gibt es keinen Sprachraum (voice).");
    };
    const focusMessageInput = () => {
        requestAnimationFrame(() => messageInputRef.current?.focus());
    };
    const openFilePicker = () => fileInputRef.current?.click();
    const onFilesSelected = (e) => {
        const files = e.target.files;
        if (!files?.length)
            return;
        const next = Array.from(files).map((f) => ({
            fileName: f.name,
            mimeType: f.type || "application/octet-stream",
            sizeBytes: f.size,
        }));
        setPendingAttachments((prev) => [...prev, ...next]);
        e.target.value = "";
    };
    useEffect(() => {
        let isMounted = true;
        const ping = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/health`);
                if (!isMounted)
                    return;
                setIsBackendOnline(res.ok);
            }
            catch {
                if (!isMounted)
                    return;
                setIsBackendOnline(false);
            }
        };
        void ping();
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        if (!appNotice)
            return;
        const t = window.setTimeout(() => setAppNotice(null), 4800);
        return () => window.clearTimeout(t);
    }, [appNotice]);
    useEffect(() => {
        if (!messageOverflowId)
            return;
        const close = () => setMessageOverflowId(null);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [messageOverflowId]);
    useEffect(() => {
        if (!emojiBarOpen)
            return;
        const close = () => setEmojiBarOpen(false);
        window.addEventListener("click", close);
        return () => window.removeEventListener("click", close);
    }, [emojiBarOpen]);
    useEffect(() => {
        if (!token || !currentUser)
            return;
        let cancelled = false;
        void (async () => {
            try {
                const list = await fetchJson("/workspaces");
                if (cancelled)
                    return;
                const owned = list.find((w) => w.ownerUserId === currentUser.id);
                const pick = owned ?? list[0];
                if (pick) {
                    setActiveWorkspaceId(pick.id);
                    setWorkspaceLabel(pick.name);
                }
                else {
                    setActiveWorkspaceId(null);
                    setWorkspaceLabel("");
                }
            }
            catch {
                if (!cancelled) {
                    setActiveWorkspaceId(null);
                    setWorkspaceLabel("");
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, currentUser?.id]);
    useEffect(() => {
        setChatMessages([]);
    }, [activeWorkspaceId]);
    useEffect(() => {
        if (!activeWorkspaceId) {
            setServerRooms([]);
            setWorkspaceChatMembers([]);
            return;
        }
        let isMounted = true;
        void (async () => {
            const wsId = activeWorkspaceId;
            try {
                const loadedRooms = await fetchJson(`/workspaces/${wsId}/rooms`);
                if (!isMounted)
                    return;
                setServerRooms(loadedRooms);
                if (loadedRooms.length > 0) {
                    const sec = activeSectionRef.current;
                    const inSec = loadedRooms.filter((r) => r.sectionId === sec);
                    const cur = activeRoomIdRef.current;
                    if (inSec.length > 0) {
                        const key = lastRoomStorageKey(wsId, sec);
                        const saved = localStorage.getItem(key);
                        const nextId = cur && inSec.some((r) => r.id === cur)
                            ? cur
                            : saved && inSec.some((r) => r.id === saved)
                                ? saved
                                : pickDefaultRoomForSection(inSec);
                        setActiveRoomId(nextId);
                    }
                    else {
                        const first = loadedRooms[0];
                        setActiveSection(first.sectionId);
                        const fallbackSec = first.sectionId;
                        const inFirst = loadedRooms.filter((r) => r.sectionId === fallbackSec);
                        setActiveRoomId(pickDefaultRoomForSection(inFirst));
                    }
                }
                try {
                    const members = await fetchJson(`/workspaces/${wsId}/members`);
                    if (!isMounted)
                        return;
                    const memList = [];
                    for (const m of members) {
                        if (m.user) {
                            memList.push({ id: m.user.id, displayName: m.user.displayName });
                        }
                    }
                    setWorkspaceChatMembers(memList);
                    setUsersById((prev) => {
                        const next = { ...prev };
                        for (const m of members) {
                            if (m.user) {
                                const u = m.user;
                                next[u.id] = {
                                    id: u.id,
                                    displayName: u.displayName,
                                    email: u.contactEmail ?? "",
                                    status: u.status,
                                    friendCode: u.friendCode,
                                    avatarUrl: u.avatarUrl,
                                    bio: u.bio,
                                    statusMessage: u.statusMessage,
                                    statusBySection: u.statusBySection,
                                    contactEmail: u.contactEmail,
                                    phoneMasked: u.phoneMasked,
                                };
                            }
                        }
                        return next;
                    });
                }
                catch {
                    setWorkspaceChatMembers([]);
                }
            }
            catch {
                if (isMounted)
                    setServerRooms([]);
            }
        })();
        return () => {
            isMounted = false;
        };
    }, [activeWorkspaceId]);
    useEffect(() => {
        let cancelled = false;
        if (!activeWorkspaceId || !token) {
            setMeetingRooms([]);
            setMeetingsInRoom([]);
            setActiveMeetingRoomId(null);
            return;
        }
        void (async () => {
            try {
                const rows = await fetchJson(`/workspaces/${activeWorkspaceId}/meeting-rooms`);
                if (cancelled)
                    return;
                setMeetingRooms(rows);
                setActiveMeetingRoomId((prev) => {
                    if (prev && rows.some((r) => r.id === prev))
                        return prev;
                    return rows[0]?.id ?? null;
                });
            }
            catch {
                if (!cancelled)
                    setMeetingRooms([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeWorkspaceId, token]);
    useEffect(() => {
        let cancelled = false;
        if (!activeWorkspaceId || !activeMeetingRoomId) {
            setMeetingsInRoom([]);
            return;
        }
        void (async () => {
            try {
                const rows = await fetchJson(`/workspaces/${activeWorkspaceId}/meeting-rooms/${activeMeetingRoomId}/meetings`);
                if (!cancelled)
                    setMeetingsInRoom(rows);
            }
            catch {
                if (!cancelled)
                    setMeetingsInRoom([]);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [activeWorkspaceId, activeMeetingRoomId]);
    const loadFriendData = async (userId) => {
        try {
            const [incoming, friendList] = await Promise.all([
                fetchJson(`/friends/requests/${userId}?type=incoming`),
                fetchJson(`/friends/${userId}`),
            ]);
            setIncomingFriendRequests(incoming);
            setFriends(friendList);
            setUsersById((prev) => {
                const next = { ...prev };
                for (const f of friendList) {
                    next[f.id] = {
                        ...(next[f.id] ?? { id: f.id, displayName: f.displayName, email: "", status: f.status }),
                        id: f.id,
                        displayName: f.displayName,
                        status: f.status,
                        friendCode: f.friendCode,
                        avatarUrl: f.avatarUrl ?? null,
                        bio: f.bio,
                        statusMessage: f.statusMessage,
                        statusBySection: f.statusBySection,
                        contactEmail: f.contactEmail,
                        phoneMasked: f.phoneMasked,
                    };
                }
                return next;
            });
        }
        catch {
            // Keep previous values.
        }
    };
    useEffect(() => {
        if (!currentUser)
            return;
        void loadFriendData(currentUser.id);
    }, [currentUser]);
    useEffect(() => {
        if (!currentUser?.id) {
            setSeenMeetingInviteIds(new Set());
            return;
        }
        try {
            const raw = localStorage.getItem(`neonlink:seenMeetInv:${currentUser.id}`);
            const arr = raw ? JSON.parse(raw) : [];
            setSeenMeetingInviteIds(new Set(Array.isArray(arr) ? arr : []));
        }
        catch {
            setSeenMeetingInviteIds(new Set());
        }
    }, [currentUser?.id]);
    useEffect(() => {
        if (!currentUser?.id) {
            setSeenCalendarNewsIds(new Set());
            return;
        }
        try {
            const raw = localStorage.getItem(`neonlink:seenCalNews:${currentUser.id}`);
            const arr = raw ? JSON.parse(raw) : [];
            setSeenCalendarNewsIds(new Set(Array.isArray(arr) ? arr : []));
        }
        catch {
            setSeenCalendarNewsIds(new Set());
        }
    }, [currentUser?.id]);
    useEffect(() => {
        if (mainView !== "news" || !currentUser)
            return;
        void loadFriendData(currentUser.id);
    }, [mainView, currentUser?.id]);
    useEffect(() => {
        let cancelled = false;
        if (!activeWorkspaceId || !senderUserId) {
            setMeetingInviteEvents([]);
            return;
        }
        const load = async () => {
            const from = new Date();
            from.setHours(0, 0, 0, 0);
            const to = new Date(from.getTime() + 90 * 86400000);
            try {
                const rows = await fetchJson(`/workspaces/${activeWorkspaceId}/calendar/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`);
                if (cancelled)
                    return;
                const uid = senderUserId;
                const mine = rows.filter((e) => e.kind === "meeting" &&
                    (e.meetingInvitees ?? []).includes(uid) &&
                    e.createdByUserId !== uid &&
                    new Date(e.startsAt).getTime() > Date.now() - 86400000);
                setMeetingInviteEvents(mine);
            }
            catch {
                if (!cancelled)
                    setMeetingInviteEvents([]);
            }
        };
        void load();
        const tick = setInterval(load, 120000);
        return () => {
            cancelled = true;
            clearInterval(tick);
        };
    }, [activeWorkspaceId, senderUserId]);
    useEffect(() => {
        if (!token || !currentUser) {
            setSidebarUpcoming([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            const from = new Date();
            const to = new Date(from.getTime() + 366 * 86400000);
            try {
                const qs = new URLSearchParams({
                    from: from.toISOString(),
                    to: to.toISOString(),
                    limit: "3",
                });
                const rows = await fetchJson(`/me/calendar/upcoming?${qs}`);
                if (!cancelled)
                    setSidebarUpcoming(rows);
            }
            catch {
                if (!cancelled)
                    setSidebarUpcoming([]);
            }
        };
        void load();
        const tick = setInterval(load, 120000);
        return () => {
            cancelled = true;
            clearInterval(tick);
        };
    }, [token, currentUser?.id]);
    useEffect(() => {
        if (!token || !currentUser) {
            setCalendarNewsEvents([]);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const rows = await fetchJson(`/me/calendar/recent-news?days=14`);
                if (!cancelled)
                    setCalendarNewsEvents(rows);
            }
            catch {
                if (!cancelled)
                    setCalendarNewsEvents([]);
            }
        };
        void load();
        const tick = setInterval(load, 120000);
        return () => {
            cancelled = true;
            clearInterval(tick);
        };
    }, [token, currentUser?.id]);
    useEffect(() => {
        if (!currentUser?.id || !activeWorkspaceId) {
            setUnreadByRoomId({});
            return;
        }
        skipNextUnreadPersistRef.current = true;
        try {
            const raw = localStorage.getItem(`neonlink:unreadByRoom:${currentUser.id}:${activeWorkspaceId}`);
            setUnreadByRoomId(raw ? JSON.parse(raw) : {});
        }
        catch {
            setUnreadByRoomId({});
        }
    }, [currentUser?.id, activeWorkspaceId]);
    useEffect(() => {
        if (!currentUser?.id || !activeWorkspaceId)
            return;
        if (skipNextUnreadPersistRef.current) {
            skipNextUnreadPersistRef.current = false;
            return;
        }
        const t = window.setTimeout(() => {
            try {
                localStorage.setItem(`neonlink:unreadByRoom:${currentUser.id}:${activeWorkspaceId}`, JSON.stringify(unreadByRoomId));
            }
            catch {
                /* ignore quota */
            }
        }, 200);
        return () => clearTimeout(t);
    }, [unreadByRoomId, currentUser?.id, activeWorkspaceId]);
    const searchFriends = async () => {
        const q = friendSearch.trim();
        if (!q || !currentUser)
            return;
        try {
            const results = await fetchJson(`/users/search?requesterUserId=${encodeURIComponent(currentUser.id)}&q=${encodeURIComponent(q)}`);
            setFriendSearchResults(results);
        }
        catch {
            setFriendInfo("Suche fehlgeschlagen.");
        }
    };
    const sendFriendRequest = async (toUserId) => {
        if (!currentUser)
            return;
        try {
            const response = await authFetch(`/friends/requests`, {
                method: "POST",
                body: JSON.stringify({ fromUserId: currentUser.id, toUserId }),
            });
            if (!response.ok) {
                const data = (await response.json());
                throw new Error(data.error ?? "request_failed");
            }
            setFriendInfo("Freundesanfrage gesendet.");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "request_failed";
            setFriendInfo(`Anfrage fehlgeschlagen: ${message}`);
        }
    };
    const respondFriendRequest = async (requestId, action) => {
        if (!currentUser)
            return;
        try {
            const response = await authFetch(`/friends/requests/${requestId}/respond`, {
                method: "POST",
                body: JSON.stringify({ userId: currentUser.id, action }),
            });
            if (!response.ok)
                throw new Error("response_failed");
            await loadFriendData(currentUser.id);
            setFriendInfo(action === "accept" ? "Anfrage bestaetigt." : "Anfrage abgelehnt.");
        }
        catch {
            setFriendInfo("Antwort auf Anfrage fehlgeschlagen.");
        }
    };
    const setFriendGroup = async (friendUserId, group) => {
        if (!currentUser)
            return;
        try {
            const response = await authFetch(`/friends/group`, {
                method: "POST",
                body: JSON.stringify({ ownerUserId: currentUser.id, friendUserId, group }),
            });
            if (!response.ok)
                throw new Error("group_update_failed");
            await loadFriendData(currentUser.id);
            setFriendInfo("Freundesgruppe aktualisiert.");
        }
        catch {
            setFriendInfo("Gruppe konnte nicht gespeichert werden.");
        }
    };
    const createInviteCode = async () => {
        if (!currentUser) {
            setInviteInfo("Bitte zuerst einloggen oder registrieren.");
            return;
        }
        if (!activeWorkspaceId) {
            setInviteInfo("Kein Workspace geladen. Bitte Seite neu laden.");
            return;
        }
        try {
            const response = await authFetch(`/workspaces/${activeWorkspaceId}/invites`, {
                method: "POST",
                body: JSON.stringify({ createdBy: currentUser.id, maxUses: 20 }),
            });
            if (!response.ok)
                throw new Error("Invite creation failed");
            const data = (await response.json());
            setGeneratedInviteCode(data.code);
            setInviteInfo("Einladung fuer diesen Workspace erstellt. Eingeladene koennen dieselben Raeume nutzen wie du — nicht deine Freundes-Gruppen bei anderen.");
        }
        catch {
            setInviteInfo("Einladung konnte nicht erstellt werden.");
        }
    };
    const joinWithInviteCode = async (codeOverride) => {
        const code = (codeOverride ?? inviteCode).trim().toUpperCase();
        if (!code) {
            setInviteInfo("Bitte Invite-Code eingeben.");
            return;
        }
        if (!currentUser) {
            setInviteInfo("Bitte zuerst registrieren oder einloggen.");
            return;
        }
        try {
            const response = await authFetch(`/invites/join`, {
                method: "POST",
                body: JSON.stringify({ code, userId: currentUser.id }),
            });
            if (!response.ok) {
                const data = (await response.json());
                throw new Error(data.error ?? "join_failed");
            }
            const joined = (await response.json());
            if (joined.workspaceId) {
                setActiveWorkspaceId(joined.workspaceId);
                try {
                    const ws = await fetchJson(`/workspaces/${joined.workspaceId}`);
                    setWorkspaceLabel(ws.name);
                }
                catch {
                    setWorkspaceLabel("");
                }
            }
            setInviteInfo("Workspace-Beitritt erfolgreich. Du siehst jetzt Raeume und Chats dieses Workspaces.");
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "join_failed";
            setInviteInfo(`Beitritt fehlgeschlagen: ${message}`);
        }
    };
    const addFriendByCode = async (raw) => {
        const q = raw.trim();
        if (!q || !currentUser) {
            setFriendInfo("Bitte Code eingeben.");
            return;
        }
        try {
            const results = await fetchJson(`/users/search?requesterUserId=${encodeURIComponent(currentUser.id)}&q=${encodeURIComponent(q)}`);
            const upper = q.toUpperCase();
            const exact = results.find((r) => (r.friendCode ?? "").toUpperCase() === upper);
            if (exact) {
                await sendFriendRequest(exact.id);
                return;
            }
            if (results.length === 1) {
                await sendFriendRequest(results[0].id);
                return;
            }
            setFriendInfo("Kein eindeutiger Treffer — bitte exakten Freundescode oder Suche nutzen.");
        }
        catch {
            setFriendInfo("Suche fehlgeschlagen.");
        }
    };
    const handleRegenerateFriendCode = async () => {
        try {
            await regenerateFriendCode();
            setFriendInfo("Neuer Freundescode ist aktiv.");
        }
        catch (e) {
            setFriendInfo(e instanceof Error ? e.message : "Code konnte nicht erneuert werden.");
        }
    };
    const createPrivateChat = async (otherUserId) => {
        if (!activeWorkspaceId || !currentUser)
            throw new Error("Nicht angemeldet");
        const response = await authFetch(`/workspaces/${activeWorkspaceId}/rooms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sectionId: activeSection,
                chatType: "private",
                otherUserId,
            }),
        });
        const data = (await response.json());
        if (!response.ok)
            throw new Error(data.error ?? "request_failed");
        if (!data.room)
            throw new Error("no_room");
        setServerRooms((prev) => (prev.some((r) => r.id === data.room.id) ? prev : [...prev, data.room]));
        setActiveRoomId(data.room.id);
    };
    const openPrivateChatWithFriend = async (friendUserId) => {
        if (!activeWorkspaceId) {
            setFriendInfo("Workspace laedt noch — Privatchat gleich verfuegbar.");
            return;
        }
        try {
            await createPrivateChat(friendUserId);
        }
        catch (e) {
            setFriendInfo(e instanceof Error ? e.message : "Chat konnte nicht geoeffnet werden.");
        }
    };
    const createGroupChat = async (name, participantUserIds) => {
        if (!activeWorkspaceId || !currentUser)
            throw new Error("Nicht angemeldet");
        const response = await authFetch(`/workspaces/${activeWorkspaceId}/rooms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sectionId: activeSection,
                chatType: "group",
                name,
                participantUserIds,
            }),
        });
        const data = (await response.json());
        if (!response.ok)
            throw new Error(data.error ?? "request_failed");
        if (!data.room)
            throw new Error("no_room");
        setServerRooms((prev) => [...prev, data.room]);
        setActiveRoomId(data.room.id);
    };
    useEffect(() => {
        let isMounted = true;
        const loadMessages = async () => {
            if (!activeRoomId)
                return;
            try {
                const loadedMessages = await fetchJson(`/rooms/${activeRoomId}/messages`);
                if (!isMounted)
                    return;
                const mappedMessages = loadedMessages.map((message) => mapServerMessageToChat(message));
                setChatMessages((prev) => {
                    const others = prev.filter((message) => message.roomId !== activeRoomId);
                    return [...others, ...mappedMessages];
                });
            }
            catch {
                // Keep current local messages.
            }
        };
        void loadMessages();
        return () => {
            isMounted = false;
        };
    }, [activeRoomId, usersById]);
    useEffect(() => {
        setTypingByUser({});
    }, [activeRoomId]);
    useEffect(() => {
        if (!activeWorkspaceId || !activeRoomId)
            return;
        try {
            localStorage.setItem(lastRoomStorageKey(activeWorkspaceId, activeSection), activeRoomId);
        }
        catch {
            /* ignore quota */
        }
    }, [activeWorkspaceId, activeSection, activeRoomId]);
    useEffect(() => {
        if (!activeRoomId)
            return;
        setUnreadByRoomId((prev) => {
            if (!prev[activeRoomId])
                return prev;
            const next = { ...prev };
            delete next[activeRoomId];
            return next;
        });
    }, [activeRoomId]);
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket?.connected || !activeRoomId || !currentUser)
            return;
        if (typingStopTimerRef.current)
            clearTimeout(typingStopTimerRef.current);
        if (messageInput.trim()) {
            socket.emit("chat:typing", {
                roomId: activeRoomId,
                userId: currentUser.id,
                displayName: currentUser.displayName,
                isTyping: true,
            });
            typingStopTimerRef.current = setTimeout(() => {
                socket.emit("chat:typing", {
                    roomId: activeRoomId,
                    userId: currentUser.id,
                    displayName: currentUser.displayName,
                    isTyping: false,
                });
            }, 2000);
        }
        else {
            socket.emit("chat:typing", {
                roomId: activeRoomId,
                userId: currentUser.id,
                displayName: currentUser.displayName,
                isTyping: false,
            });
        }
        return () => {
            if (typingStopTimerRef.current)
                clearTimeout(typingStopTimerRef.current);
        };
    }, [messageInput, activeRoomId, currentUser]);
    useEffect(() => {
        if (!token) {
            socketRef.current?.disconnect();
            socketRef.current = null;
            return;
        }
        const socket = io(SOCKET_ORIGIN, {
            transports: ["websocket"],
            auth: { token },
        });
        socketRef.current = socket;
        socket.on("connect", () => setIsBackendOnline(true));
        socket.on("disconnect", () => setIsBackendOnline(false));
        socket.on("connect_error", () => setIsBackendOnline(false));
        socket.on("chat:messageCreated", (message) => {
            const me = currentUserRef.current?.id;
            if (me && message.senderUserId === me) {
                /* eigene Nachrichten nicht als ungelesen zählen */
            }
            else if (message.roomId !== activeRoomIdRef.current) {
                setUnreadByRoomId((prev) => ({
                    ...prev,
                    [message.roomId]: (prev[message.roomId] ?? 0) + 1,
                }));
            }
            setChatMessages((prev) => {
                const exists = prev.some((entry) => entry.id === message.id);
                if (exists)
                    return prev;
                return [...prev, mapServerMessageToChat(message)];
            });
        });
        socket.on("chat:typing", (payload) => {
            if (payload.roomId !== activeRoomIdRef.current)
                return;
            if (payload.userId === currentUserRef.current?.id)
                return;
            setTypingByUser((prev) => {
                const next = { ...prev };
                if (payload.isTyping)
                    next[payload.userId] = payload.displayName;
                else
                    delete next[payload.userId];
                return next;
            });
        });
        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [token]);
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !activeRoomId)
            return;
        const user = currentUserRef.current;
        socket.emit("room:join", activeRoomId);
        return () => {
            if (user) {
                socket.emit("chat:typing", {
                    roomId: activeRoomId,
                    userId: user.id,
                    displayName: user.displayName,
                    isTyping: false,
                });
            }
            socket.emit("room:leave", activeRoomId);
        };
    }, [activeRoomId]);
    const openChatFromNews = (roomId, sectionId) => {
        setMainView("chat");
        setActiveSection(sectionId);
        setActiveRoomId(roomId);
        if (activeWorkspaceId) {
            try {
                localStorage.setItem(lastRoomStorageKey(activeWorkspaceId, sectionId), roomId);
            }
            catch {
                /* ignore */
            }
        }
    };
    const openFriendRequestsFromNews = () => {
        setMainView("chat");
        window.setTimeout(() => {
            document.getElementById("neonlink-friend-requests")?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }, 80);
    };
    const openMeetingInviteFromNews = (item) => {
        if (item.calendarEventId)
            markMeetingInviteSeen(item.calendarEventId);
        if (!item.sectionId) {
            navigate("/kalender");
            return;
        }
        setActiveSection(item.sectionId);
        if (activeWorkspaceId && meetingRooms.length > 0) {
            setMainView("meetings");
            const rid = item.meetingRoomId;
            if (rid && meetingRooms.some((r) => r.id === rid))
                setActiveMeetingRoomId(rid);
            else
                setActiveMeetingRoomId(meetingRooms[0].id);
        }
        else {
            navigate("/kalender");
        }
    };
    const openCalendarNewsFromNews = (eventId) => {
        if (!currentUser)
            return;
        setSeenCalendarNewsIds((prev) => {
            if (prev.has(eventId))
                return prev;
            const next = new Set(prev);
            next.add(eventId);
            try {
                localStorage.setItem(`neonlink:seenCalNews:${currentUser.id}`, JSON.stringify([...next]));
            }
            catch {
                /* ignore */
            }
            return next;
        });
        navigate("/kalender");
    };
    return (_jsxs("div", { className: "min-h-screen w-full bg-[#050816] text-white overflow-hidden", children: [_jsx("input", { ref: fileInputRef, type: "file", multiple: true, className: "hidden", onChange: onFilesSelected, accept: "image/*,video/*,audio/*,.zip,application/zip,application/x-zip-compressed" }), _jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(239,68,68,0.14),transparent_24%)]" }), _jsx("div", { className: "absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" }), _jsxs("div", { className: "relative z-10 flex h-screen min-h-0 min-w-0 max-w-[100vw] p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden", children: [_jsxs(motion.aside, { initial: { x: -20, opacity: 0 }, animate: { x: 0, opacity: 1 }, className: "w-24 rounded-3xl border border-cyan-400/20 bg-white/5 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 flex flex-col items-center py-4 gap-4", children: [_jsx("div", { className: "h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-cyan-500/30", children: "NL" }), sections.map((s) => {
                                const Icon = iconBySection[s.id];
                                const active = activeSection === s.id;
                                const theme = sectionTheme[s.id];
                                return (_jsxs("button", { onClick: () => onSelectSection(s.id), className: `relative h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${active
                                        ? `bg-white/15 ring-1 ${theme.border} shadow-lg`
                                        : "bg-white/5 hover:bg-white/10"}`, title: s.label, "aria-label": `${s.label} Bereich waehlen`, children: [active && _jsx("span", { className: `absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b ${theme.led}` }), _jsx(Icon, { className: `h-6 w-6 ${active ? "text-cyan-200" : "text-white/75"}` })] }, s.id));
                            }), _jsxs("div", { className: "mt-auto flex flex-col gap-3", children: [_jsxs("button", { type: "button", onClick: () => setMainView("news"), className: `relative h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${newsBellCount > 0 ? "animate-neonlink-bell" : ""}`, "aria-label": `Neuigkeiten${newsBellCount > 0 ? `, ${newsBellCount} ungelesen` : ""}`, children: [_jsx(Bell, { className: `h-5 w-5 ${newsBellCount > 0 ? "text-cyan-200" : "text-white/70"}` }), newsBellCount > 0 ? (_jsx("span", { className: "absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-0.5 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center leading-none shadow-lg shadow-rose-500/40 border border-rose-300/60", children: newsBellCount > 99 ? "99+" : newsBellCount })) : null] }), _jsx("button", { type: "button", onClick: () => setProfileModalOpen(true), className: "h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10", "aria-label": "Einstellungen", children: _jsx(Settings, { className: "h-5 w-5 text-white/70" }) })] })] }), _jsxs(motion.aside, { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, className: "w-80 min-w-0 max-w-[min(20rem,calc(100vw-7rem))] shrink-0 overflow-y-auto overflow-x-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 flex flex-col gap-4 shadow-2xl shadow-black/20", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 min-w-0", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.25em] text-cyan-300/80", children: "NeonLink" }), workspaceLabel ? (_jsx("div", { className: "text-[11px] text-white/50 mt-0.5 truncate", title: workspaceLabel, children: workspaceLabel })) : null, _jsx("div", { className: "text-2xl font-semibold mt-1 truncate", children: activeSectionData.label })] }), _jsx(Shield, { className: "h-5 w-5 text-cyan-300" })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" }), _jsx(Input, { value: chatSidebarSearch, onChange: (e) => setChatSidebarSearch(e.target.value), className: "pl-9 bg-white/5 border-white/10 rounded-2xl h-11 text-white placeholder:text-white/35", placeholder: "Chats filtern\u2026", "aria-label": "Chats filtern" })] }), _jsx(Card, { className: `bg-gradient-to-br ${activeTheme.border} ${activeTheme.panel} rounded-3xl text-white`, children: _jsxs(CardContent, { className: "p-4", children: [_jsx("div", { className: `text-sm ${activeTheme.chip}`, children: "Aktiver Bereich" }), _jsx("div", { className: "text-lg font-semibold mt-1", children: activeSectionData.label }), _jsx("div", { className: "text-xs text-white/60 mt-2", children: "Chats, Meetings, Dateien und gemeinsame Planung in einem Bereich." })] }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between gap-2 mb-3 min-w-0", children: [_jsx("div", { className: "text-sm uppercase tracking-[0.2em] text-white/45 shrink-0", children: "Chats" }), _jsxs(Button, { type: "button", onClick: () => setNewChatOpen(true), className: "h-8 shrink-0 rounded-xl border border-cyan-400/35 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25 text-xs px-2.5", children: [_jsx(Plus, { className: "h-3.5 w-3.5 inline-block mr-1 -mt-0.5 align-middle" }), "Neu"] })] }), _jsxs("div", { className: "space-y-5", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-[11px] text-white/50 mb-2 uppercase tracking-wider", children: [_jsx(Globe, { className: "h-3.5 w-3.5 text-cyan-300" }), "Hauptchat"] }), _jsxs("div", { className: "space-y-2", children: [globalRooms.length > 0 && globalRoomsFiltered.length === 0 ? (_jsxs("p", { className: "text-xs text-amber-200/80 px-1", children: ["Kein Treffer f\u00FCr \u201E", chatSidebarSearch.trim(), "\u201C."] })) : null, globalRoomsFiltered.map((room) => (_jsx(motion.button, { whileHover: { x: 4 }, type: "button", onClick: () => selectChatRoom(room.id), className: `w-full rounded-2xl p-3 text-left border ${room.id === activeRoom?.id
                                                                    ? `${activeTheme.border} bg-white/10`
                                                                    : "border-white/10 bg-white/5"}`, children: _jsxs("div", { className: "flex items-start justify-between gap-2 min-w-0", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "font-medium truncate", children: displayChatTitle(room, senderUserId, userNamesById) }), room.kind !== "text" ? (_jsx("span", { className: "text-[10px] text-white/40 uppercase shrink-0", children: room.kind })) : null] }), previewByRoomId[room.id] ? (_jsx("div", { className: "text-[11px] text-white/45 truncate mt-0.5", children: previewByRoomId[room.id] })) : null] }), _jsxs("div", { className: "flex flex-col items-end gap-1 shrink-0", children: [(() => {
                                                                                    const uc = unreadByRoomId[room.id] ?? 0;
                                                                                    return uc > 0 ? (_jsx("span", { className: "text-[10px] font-semibold rounded-full bg-cyan-500/90 text-[#050816] px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none", children: uc > 99 ? "99+" : uc })) : null;
                                                                                })(), _jsx(MessageSquare, { className: "h-4 w-4 text-white/50" })] })] }) }, room.id)))] })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-[11px] text-white/50 mb-2 uppercase tracking-wider", children: [_jsx(Users, { className: "h-3.5 w-3.5 text-fuchsia-300" }), "Gruppen"] }), _jsx("div", { className: "space-y-2", children: groupRooms.length === 0 ? (_jsx("p", { className: "text-xs text-white/35 px-1", children: "Noch keine Gruppen in diesem Bereich." })) : groupRoomsFiltered.length === 0 ? (_jsxs("p", { className: "text-xs text-amber-200/80 px-1", children: ["Kein Treffer f\u00FCr \u201E", chatSidebarSearch.trim(), "\u201C."] })) : (groupRoomsFiltered.map((room) => (_jsx(motion.button, { whileHover: { x: 4 }, type: "button", onClick: () => selectChatRoom(room.id), className: `w-full rounded-2xl p-3 text-left border ${room.id === activeRoom?.id
                                                                ? `${activeTheme.border} bg-white/10`
                                                                : "border-white/10 bg-white/5"}`, children: _jsxs("div", { className: "flex items-start justify-between gap-2 min-w-0", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "font-medium truncate", children: room.name }), previewByRoomId[room.id] ? (_jsx("div", { className: "text-[11px] text-white/45 truncate mt-0.5", children: previewByRoomId[room.id] })) : null] }), _jsxs("div", { className: "flex flex-col items-end gap-1 shrink-0", children: [(() => {
                                                                                const uc = unreadByRoomId[room.id] ?? 0;
                                                                                return uc > 0 ? (_jsx("span", { className: "text-[10px] font-semibold rounded-full bg-fuchsia-500/90 text-[#050816] px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none", children: uc > 99 ? "99+" : uc })) : null;
                                                                            })(), _jsx(MessageSquare, { className: "h-4 w-4 text-white/50" })] })] }) }, room.id)))) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-[11px] text-white/50 mb-2 uppercase tracking-wider", children: [_jsx(UserIcon, { className: "h-3.5 w-3.5 text-emerald-300" }), "Privat"] }), _jsx("div", { className: "space-y-2", children: privateRooms.length === 0 ? (_jsx("p", { className: "text-xs text-white/35 px-1", children: "Keine Direktchats \u2014 \u201ENeu\u201C nutzen." })) : privateRoomsFiltered.length === 0 ? (_jsxs("p", { className: "text-xs text-amber-200/80 px-1", children: ["Kein Treffer f\u00FCr \u201E", chatSidebarSearch.trim(), "\u201C."] })) : (privateRoomsFiltered.map((room) => (_jsx(motion.button, { whileHover: { x: 4 }, type: "button", onClick: () => selectChatRoom(room.id), className: `w-full rounded-2xl p-3 text-left border ${room.id === activeRoom?.id
                                                                ? `${activeTheme.border} bg-white/10`
                                                                : "border-white/10 bg-white/5"}`, children: _jsxs("div", { className: "flex items-start justify-between gap-2 min-w-0", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "font-medium truncate", children: displayChatTitle(room, senderUserId, userNamesById) }), previewByRoomId[room.id] ? (_jsx("div", { className: "text-[11px] text-white/45 truncate mt-0.5", children: previewByRoomId[room.id] })) : null] }), _jsxs("div", { className: "flex flex-col items-end gap-1 shrink-0", children: [(() => {
                                                                                const uc = unreadByRoomId[room.id] ?? 0;
                                                                                return uc > 0 ? (_jsx("span", { className: "text-[10px] font-semibold rounded-full bg-emerald-500/90 text-[#050816] px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none", children: uc > 99 ? "99+" : uc })) : null;
                                                                            })(), _jsx(MessageSquare, { className: "h-4 w-4 text-white/50" })] })] }) }, room.id)))) })] }), activeWorkspaceId && meetingRooms.length > 0 ? (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 text-[11px] text-white/50 mb-2 uppercase tracking-wider", children: [_jsx(CalendarDays, { className: "h-3.5 w-3.5 text-sky-300" }), "Meetings"] }), _jsx("div", { className: "space-y-2", children: meetingRooms.map((mr) => (_jsx(motion.button, { whileHover: { x: 4 }, type: "button", onClick: () => {
                                                                setMainView("meetings");
                                                                setActiveMeetingRoomId(mr.id);
                                                            }, className: `w-full rounded-2xl p-3 text-left border ${mainView === "meetings" && mr.id === activeMeetingRoomId
                                                                ? "border-sky-400/40 bg-sky-500/15"
                                                                : "border-white/10 bg-white/5"}`, children: _jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx(Video, { className: "h-4 w-4 text-sky-300 shrink-0" }), _jsx("span", { className: "font-medium truncate text-sm", children: mr.name })] }) }, mr.id))) })] })) : null] })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm uppercase tracking-[0.2em] text-white/45 mb-3", children: "Schnellzugriff" }), _jsx("div", { className: "grid grid-cols-2 gap-2 min-w-0", children: [
                                            ...(activeSection === "arbeit"
                                                ? [
                                                    {
                                                        label: "Arbeitsplan",
                                                        icon: ClipboardList,
                                                        path: "/arbeitsplan",
                                                    },
                                                ]
                                                : []),
                                            { label: "Kalender", icon: CalendarDays, path: "/kalender" },
                                            { label: "Kontakte", icon: Users, path: "/kontakte" },
                                            { label: "Meeting", icon: Video },
                                            { label: "Sprachraum", icon: Mic },
                                            { label: "Finanzen", icon: Banknote, path: "/finance" },
                                            { label: "Verträge", icon: FileText, path: "/vertraege" },
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            return (_jsxs("button", { type: "button", onClick: () => {
                                                    if ("path" in item && item.path) {
                                                        navigate(item.path);
                                                        return;
                                                    }
                                                    if (item.label === "Meeting") {
                                                        if (!activeWorkspaceId) {
                                                            setAppNotice("Workspace wird geladen …");
                                                            return;
                                                        }
                                                        setMainView("meetings");
                                                        if (meetingRooms.length > 0) {
                                                            setActiveMeetingRoomId((prev) => prev && meetingRooms.some((r) => r.id === prev) ? prev : meetingRooms[0].id);
                                                            setAppNotice(null);
                                                        }
                                                        else {
                                                            setActiveMeetingRoomId(null);
                                                            setAppNotice("Lege mit „Neuer Meetingraum“ in der Meeting-Ansicht einen Raum an.");
                                                        }
                                                        return;
                                                    }
                                                    if (item.label === "Sprachraum") {
                                                        openVoiceRoom();
                                                    }
                                                }, className: "rounded-2xl border border-white/10 bg-white/5 px-2.5 py-3 sm:px-3 sm:py-3.5 hover:bg-white/10 flex flex-col items-center justify-center gap-1.5 min-h-[5rem] text-center min-w-0", "aria-label": `${item.label} oeffnen`, children: [_jsx(Icon, { className: "h-5 w-5 text-cyan-300 shrink-0" }), _jsx("span", { className: "text-[11px] sm:text-sm leading-tight text-white/90 break-words hyphens-auto w-full", children: item.label })] }, item.label));
                                        }) })] })] }), _jsxs("main", { className: "flex-1 flex flex-col gap-4 min-w-0 min-h-0", children: [appNotice ? (_jsx("div", { role: "status", className: "rounded-2xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm text-amber-50/95 shadow-lg shadow-black/20", children: appNotice })) : null, _jsxs(motion.div, { initial: { opacity: 0, y: -14 }, animate: { opacity: 1, y: 0 }, className: "relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-4 sm:px-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between shadow-2xl shadow-black/20 min-w-0", children: [_jsx("div", { className: `pointer-events-none absolute left-4 right-4 sm:left-6 sm:right-6 top-0 h-1 rounded-full bg-gradient-to-r ${activeTheme.led} animate-pulse` }), _jsxs("div", { className: "min-w-0 pt-1", children: [_jsx("div", { className: "text-xs uppercase tracking-[0.25em] text-cyan-300/80", children: mainView === "meetings" ? "Meetings" : mainView === "news" ? "Neuigkeiten" : "Chat" }), _jsx("div", { className: "text-xl sm:text-2xl font-semibold mt-1 truncate", children: mainView === "meetings"
                                                    ? meetingRooms.find((r) => r.id === activeMeetingRoomId)?.name ?? "Meetingraum"
                                                    : mainView === "news"
                                                        ? "Überblick"
                                                        : activeRoom
                                                            ? displayChatTitle(activeRoom, senderUserId, userNamesById)
                                                            : "Kein Raum" }), _jsx("div", { className: "text-xs text-white/60 mt-1", children: mainView === "meetings"
                                                    ? "Workspace-Meetings · Kalender nur für Eingeladene"
                                                    : mainView === "news"
                                                        ? "Nachrichten, Anfragen und Einladungen — Klick in der Liste zum Springen"
                                                        : `${roomParticipants} Teilnehmer · ${roomOnline} online` })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 lg:max-w-[min(100%,42rem)] lg:justify-end", children: [_jsx("button", { type: "button", onClick: () => setProfileModalOpen(true), title: "Profil bearbeiten", className: `shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 ${!isBackendOnline ? "ring-2 ring-red-400/60 ring-offset-2 ring-offset-[#0a0f1a]" : ""}`, children: _jsx(Avatar, { className: `h-9 w-9 sm:h-10 sm:w-10 overflow-hidden border-2 ${isBackendOnline ? "border-white/25" : "border-red-400/50"}`, children: currentUser?.avatarUrl ? (_jsx("img", { src: currentUser.avatarUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/30 to-violet-600/30 text-xs sm:text-sm font-semibold text-white", children: (currentUser?.displayName ?? "?").slice(0, 2).toUpperCase() })) }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 shrink-0 min-w-0", children: [currentUser ? _jsx(StatusPill, { presence: myEffectivePresence }) : null, _jsx("button", { type: "button", onClick: () => setProfileModalOpen(true), className: "text-xs text-cyan-200/90 hover:text-cyan-100 truncate max-w-[10rem] sm:max-w-[14rem] text-left underline-offset-2 hover:underline", children: currentUser?.displayName ?? "—" })] }), _jsx(Button, { type: "button", onClick: () => {
                                                    void logout().then(() => navigate("/login", { replace: true }));
                                                }, className: "rounded-xl bg-white/10 border border-white/15 text-white/80 hover:bg-red-500/25 hover:border-red-400/40 hover:text-red-100 shrink-0 h-9 w-9 p-0 inline-flex items-center justify-center", title: "Abmelden", children: _jsx(LogOut, { className: "h-4 w-4" }) }), _jsx(Button, { type: "button", onClick: openFilePicker, className: "rounded-xl bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 shrink-0 h-9 w-9 p-0 inline-flex items-center justify-center", children: _jsx(Paperclip, { className: "h-4 w-4" }) }), _jsx(Button, { className: "rounded-xl bg-white/10 border border-white/15 text-white/80 hover:bg-white/20 shrink-0 h-9 w-9 p-0 inline-flex items-center justify-center", children: _jsx(Search, { className: "h-4 w-4" }) }), _jsxs(Button, { className: "rounded-2xl bg-cyan-500/20 border border-cyan-300/30 text-cyan-100 hover:bg-cyan-500/30 shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm whitespace-nowrap", children: [_jsx(Phone, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: "Anrufen" })] }), _jsxs(Button, { type: "button", onClick: () => {
                                                    if (activeWorkspaceId && meetingRooms.length > 0) {
                                                        setMainView("meetings");
                                                        setActiveMeetingRoomId((prev) => prev && meetingRooms.some((r) => r.id === prev) ? prev : meetingRooms[0].id);
                                                    }
                                                }, disabled: !activeWorkspaceId || meetingRooms.length === 0, className: "rounded-2xl bg-violet-500/20 border border-violet-300/30 text-violet-100 hover:bg-violet-500/30 shrink-0 inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-sm whitespace-nowrap disabled:opacity-40", children: [_jsx(Video, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: "Meeting" })] })] })] }), _jsxs("div", { className: "flex-1 grid grid-cols-1 lg:grid-cols-12 lg:[grid-template-rows:minmax(0,1fr)] gap-4 min-h-0 min-w-0", children: [mainView === "news" ? (_jsx("div", { className: "lg:col-span-8 min-w-0 min-h-0 max-h-full h-full flex flex-col overflow-hidden", children: _jsx(NewsFeedPanel, { items: newsFeedItems, onOpenChat: openChatFromNews, onOpenFriendRequests: openFriendRequestsFromNews, onOpenMeetingInvite: openMeetingInviteFromNews, onOpenCalendarNews: openCalendarNewsFromNews }) })) : mainView === "meetings" && activeWorkspaceId ? (_jsx("div", { className: "lg:col-span-8 min-w-0 rounded-3xl border border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 lg:h-full lg:max-h-full overflow-hidden p-3 sm:p-4", children: _jsx(MeetingsWorkspacePanel, { workspaceId: activeWorkspaceId, rooms: meetingRooms, activeRoomId: activeMeetingRoomId, onSelectRoom: (id) => setActiveMeetingRoomId(id), meetings: meetingsInRoom, members: workspaceChatMembers.map((m) => ({ id: m.id, displayName: m.displayName })), currentUserId: senderUserId, activeSection: activeSection, namesById: meetingNamesById, onRefreshRooms: async () => {
                                                if (!activeWorkspaceId)
                                                    return;
                                                try {
                                                    const rows = await fetchJson(`/workspaces/${activeWorkspaceId}/meeting-rooms`);
                                                    setMeetingRooms(rows);
                                                    setActiveMeetingRoomId((prev) => {
                                                        if (prev && rows.some((r) => r.id === prev))
                                                            return prev;
                                                        return rows[0]?.id ?? null;
                                                    });
                                                }
                                                catch {
                                                    /* ignore */
                                                }
                                            }, onRenameRoom: async (roomId, name) => {
                                                if (!activeWorkspaceId)
                                                    return;
                                                const res = await authFetch(`/workspaces/${activeWorkspaceId}/meeting-rooms/${roomId}`, {
                                                    method: "PATCH",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ name }),
                                                });
                                                if (!res.ok) {
                                                    const d = (await res.json().catch(() => ({})));
                                                    throw new Error(d.error ?? "rename_failed");
                                                }
                                            }, onDeleteRoom: async (roomId) => {
                                                if (!activeWorkspaceId)
                                                    return;
                                                const res = await authFetch(`/workspaces/${activeWorkspaceId}/meeting-rooms/${roomId}`, { method: "DELETE" });
                                                if (!res.ok) {
                                                    const d = (await res.json().catch(() => ({})));
                                                    throw new Error(d.error ?? "delete_room_failed");
                                                }
                                            }, onRefreshMeetings: async () => {
                                                if (!activeWorkspaceId || !activeMeetingRoomId)
                                                    return;
                                                try {
                                                    const rows = await fetchJson(`/workspaces/${activeWorkspaceId}/meeting-rooms/${activeMeetingRoomId}/meetings`);
                                                    setMeetingsInRoom(rows);
                                                }
                                                catch {
                                                    /* ignore */
                                                }
                                            }, onCreateMeeting: async (payload) => {
                                                if (!activeWorkspaceId)
                                                    throw new Error("no_workspace");
                                                const res = await authFetch(`/workspaces/${activeWorkspaceId}/meetings`, {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify(payload),
                                                });
                                                if (!res.ok) {
                                                    const d = (await res.json().catch(() => ({})));
                                                    throw new Error(d.error ?? "create_failed");
                                                }
                                            }, onDeleteMeeting: async (meetingId) => {
                                                if (!activeWorkspaceId)
                                                    return;
                                                const res = await authFetch(`/workspaces/${activeWorkspaceId}/meetings/${meetingId}`, { method: "DELETE" });
                                                if (!res.ok)
                                                    throw new Error("delete_failed");
                                            }, onCreateRoom: async (name) => {
                                                if (!activeWorkspaceId)
                                                    return;
                                                const res = await authFetch(`/workspaces/${activeWorkspaceId}/meeting-rooms`, {
                                                    method: "POST",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({ name }),
                                                });
                                                if (!res.ok)
                                                    throw new Error("room_failed");
                                            } }) })) : (_jsxs(Card, { className: "lg:col-span-8 min-w-0 rounded-3xl border border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 min-w-0 lg:h-full lg:max-h-full", children: [_jsx(CardHeader, { className: "rounded-t-3xl border-b border-white/10 px-6 sm:px-10 pt-7 pb-4 flex justify-center items-center shrink-0", children: _jsx(CardTitle, { className: "text-lg sm:text-xl text-center font-semibold tracking-wide text-white/95 leading-normal", children: "Live-Chat" }) }), _jsxs(CardContent, { className: "flex-1 min-h-0 min-w-0 rounded-b-3xl p-4 flex flex-col gap-4 overflow-x-hidden overflow-y-auto", children: [sourceRooms.length === 0 && activeWorkspaceId ? (_jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-white/65 text-center leading-relaxed", children: "In diesem Workspace sind noch keine Raeume geladen \u2014 bitte Seite neu laden oder kurz warten. Ohne Backend bleibt die Liste leer." })) : null, !activeWorkspaceId && token ? (_jsx("div", { className: "rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-8 text-sm text-cyan-100/90 text-center", children: "Workspace wird geladen \u2026" })) : null, pinnedMessage ? (_jsxs("div", { className: "rounded-2xl border border-yellow-300/30 bg-yellow-500/10 p-3 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2 text-yellow-200", children: [_jsx(Pin, { className: "h-3 w-3" }), " Angepinnt"] }), _jsx("div", { className: "mt-1 text-white/90", children: pinnedMessage.calendarAnnouncement ? (_jsx(CalendarAnnouncementMessage, { payload: pinnedMessage.calendarAnnouncement })) : (pinnedMessage.text) })] })) : null, roomMessages.map((m, i) => {
                                                        const msgAvatarSrc = m.senderUserId && m.senderUserId === currentUser?.id
                                                            ? currentUser?.avatarUrl
                                                            : m.senderUserId
                                                                ? usersById[m.senderUserId]?.avatarUrl ?? m.avatarUrl
                                                                : m.avatarUrl;
                                                        return (_jsxs(motion.div, { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.08 }, className: "group flex gap-3", children: [_jsx(Avatar, { className: "relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15", children: msgAvatarSrc ? (_jsx("img", { src: msgAvatarSrc, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "flex h-full w-full items-center justify-center bg-white/10 text-xs font-medium text-white", children: m.from.slice(0, 2).toUpperCase() })) }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm", children: [_jsx("span", { className: "font-semibold", children: m.from }), _jsx("span", { className: `h-2 w-2 rounded-full ${m.role === "online"
                                                                                        ? "bg-emerald-400"
                                                                                        : m.role === "alert"
                                                                                            ? "bg-red-400 animate-pulse"
                                                                                            : m.role === "admin"
                                                                                                ? "bg-cyan-400"
                                                                                                : "bg-yellow-400"}` }), _jsx("span", { className: "text-white/40", children: m.time })] }), _jsxs("div", { className: "mt-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/90 shadow-lg shadow-black/10", children: [m.replyTo ? (_jsxs("div", { className: "mb-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-white/70", children: [_jsx("span", { className: "text-cyan-200/90", children: m.replyTo.from }), _jsx("span", { className: "text-white/50", children: " \u00B7 " }), m.replyTo.preview] })) : null, m.calendarAnnouncement ? (_jsx(CalendarAnnouncementMessage, { payload: m.calendarAnnouncement })) : (m.text)] }), m.attachments?.length ? (_jsx("div", { className: "mt-2 space-y-2", children: m.attachments.map((att) => (_jsxs("div", { className: "rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-2 text-xs flex items-center justify-between gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx(File, { className: "h-4 w-4 text-cyan-200 shrink-0" }), _jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "truncate font-medium", children: att.fileName }), _jsxs("div", { className: "text-white/50", children: [att.mimeType, " \u00B7 ", formatBytes(att.sizeBytes)] })] })] }), _jsxs("a", { href: `${API_BASE_URL}/attachments/${att.id}/download`, download: att.fileName, className: "shrink-0 rounded-lg bg-white/10 border border-white/15 px-2 py-1 hover:bg-white/20 flex items-center gap-1 text-white/90", children: [_jsx(Download, { className: "h-3 w-3" }), "Laden"] })] }, att.id))) })) : !m.calendarAnnouncement &&
                                                                            (m.text.toLowerCase().includes("zip") || m.text.toLowerCase().includes("bilder")) ? (_jsxs("div", { className: "mt-2 rounded-xl border border-white/10 bg-white/5 p-2 text-xs flex items-center gap-2", children: [_jsx(File, { className: "h-4 w-4 text-cyan-200" }), _jsxs("div", { children: [_jsx("div", { children: "Anhang vorhanden (Demo)" }), _jsx("div", { className: "text-white/50", children: "Bild/Video/Musik/ZIP" })] })] })) : null, _jsxs("div", { className: `mt-1 items-center gap-2 text-[11px] text-white/60 ${reactionBarForMessageId === m.id || messageOverflowId === m.id
                                                                                ? "flex"
                                                                                : "hidden group-hover:flex"}`, children: [_jsxs("button", { type: "button", onClick: () => setReplyToMessageId(m.id), className: "hover:text-white flex items-center gap-1", children: [_jsx(Reply, { className: "h-3 w-3" }), " Antworten"] }), _jsx("button", { type: "button", onClick: (e) => {
                                                                                        e.stopPropagation();
                                                                                        setReactionBarForMessageId((prev) => (prev === m.id ? null : m.id));
                                                                                        setMessageOverflowId(null);
                                                                                    }, className: "hover:text-white", children: "Reagieren" }), _jsxs("div", { className: "relative", children: [_jsx("button", { type: "button", onClick: (e) => {
                                                                                                e.stopPropagation();
                                                                                                setMessageOverflowId((prev) => (prev === m.id ? null : m.id));
                                                                                                setReactionBarForMessageId(null);
                                                                                            }, className: "hover:text-white", "aria-expanded": messageOverflowId === m.id, "aria-label": "Weitere Aktionen", children: _jsx(MoreHorizontal, { className: "h-3 w-3" }) }), messageOverflowId === m.id ? (_jsx("div", { className: "absolute left-0 top-full z-20 mt-1 min-w-[10.5rem] rounded-xl border border-white/15 bg-[#0f172a] py-1 shadow-xl shadow-black/50", onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation(), children: _jsx("button", { type: "button", className: "w-full text-left px-3 py-2 text-xs text-white/90 hover:bg-white/10", onClick: () => {
                                                                                                    const t = m.calendarAnnouncement
                                                                                                        ? `${m.calendarAnnouncement.title} · ${m.calendarAnnouncement.dateLabel} ${m.calendarAnnouncement.timeLabel}`
                                                                                                        : m.text;
                                                                                                    void navigator.clipboard.writeText(t).catch(() => { });
                                                                                                    setMessageOverflowId(null);
                                                                                                }, children: "Text kopieren" }) })) : null] })] }), reactionBarForMessageId === m.id ? (_jsx("div", { className: "mt-1.5 flex flex-wrap gap-1", children: ["👍", "❤️", "😊", "🙏", "👏"].map((emoji) => (_jsx("button", { type: "button", className: "rounded-lg border border-white/10 bg-white/10 px-2 py-0.5 text-base leading-none hover:bg-white/20", onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    void sendTextToActiveRoom(emoji, m.id);
                                                                                    setReactionBarForMessageId(null);
                                                                                }, children: emoji }, emoji))) })) : null] })] }, `${m.from}-${m.time}-${i}`));
                                                    }), typingOthersLabel ? (_jsx("div", { className: "text-xs text-emerald-200/90 animate-pulse", children: typingOthersLabel })) : null, messageInput.trim().length > 0 ? (_jsx("div", { className: "text-xs text-cyan-200/80", children: "Du tippst gerade..." })) : null] }), _jsxs("div", { className: "border-t border-white/10 p-4", children: [replyToMessageId ? (_jsxs("div", { className: "mb-2 text-xs text-cyan-200 rounded-lg border border-cyan-400/20 bg-cyan-500/10 p-2", children: ["Antwort auf ", replyTarget?.from ?? "Nachricht", replyTarget ? (_jsxs("span", { className: "text-white/60", children: [" \u00B7 ", replyTarget.text.slice(0, 80), replyTarget.text.length > 80 ? "…" : ""] })) : null, _jsx("button", { type: "button", onClick: () => setReplyToMessageId(null), className: "ml-2 text-white/70 hover:text-white", children: "abbrechen" })] })) : null, pendingAttachments.length > 0 ? (_jsx("div", { className: "mb-2 flex flex-wrap gap-2", children: pendingAttachments.map((a, idx) => (_jsxs("span", { className: "text-[11px] rounded-full border border-white/15 bg-white/10 px-2 py-1 flex items-center gap-1", children: [a.fileName, _jsx("button", { type: "button", className: "text-white/60 hover:text-white", onClick: () => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx)), children: "\u00D7" })] }, `${a.fileName}-${idx}`))) })) : null, _jsxs("div", { className: "rounded-2xl border border-cyan-300/20 bg-[#0b1128]/80 px-2 py-2 sm:px-3 flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2 min-w-0 max-w-full", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: openFilePicker, className: "rounded-xl text-white/60 hover:text-white hover:bg-white/10 shrink-0 h-10 w-10 p-0 inline-flex items-center justify-center", "aria-label": "Datei anhaengen", children: _jsx(Paperclip, { className: "h-5 w-5" }) }), _jsx("input", { ref: messageInputRef, className: "min-w-0 flex-1 basis-[8rem] sm:basis-auto bg-transparent outline-none text-sm placeholder:text-white/35 px-1 py-2", placeholder: "Nachricht \u2026 (Enter zum Senden)", value: messageInput, onChange: (e) => setMessageInput(e.target.value), onKeyDown: (e) => {
                                                                    if (e.key === "Enter") {
                                                                        void sendMessage();
                                                                    }
                                                                } }), _jsxs("div", { className: "flex items-center gap-2 shrink-0 ml-auto sm:ml-0 relative", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: (e) => {
                                                                            e.stopPropagation();
                                                                            setEmojiBarOpen((o) => !o);
                                                                        }, className: "rounded-xl text-white/60 hover:text-white hover:bg-white/10 h-10 w-10 p-0 inline-flex items-center justify-center", "aria-label": "Emoji einf\u00FCgen", "aria-expanded": emojiBarOpen, children: _jsx(Smile, { className: "h-5 w-5" }) }), emojiBarOpen ? (_jsx("div", { className: "absolute bottom-full right-0 mb-2 z-30 flex flex-wrap gap-1 max-w-[14rem] rounded-xl border border-white/15 bg-[#0f172a] p-2 shadow-xl shadow-black/50", onClick: (e) => e.stopPropagation(), children: ["😀", "😊", "👍", "❤️", "🎉", "🔥", "🙏", "👏"].map((emoji) => (_jsx("button", { type: "button", className: "rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-lg leading-none hover:bg-white/20", onClick: () => {
                                                                                setMessageInput((p) => `${p}${emoji}`);
                                                                                setEmojiBarOpen(false);
                                                                                focusMessageInput();
                                                                            }, children: emoji }, emoji))) })) : null, _jsxs(Button, { type: "button", className: "rounded-xl bg-cyan-500/20 border border-cyan-300/30 text-cyan-100 hover:bg-cyan-500/30 inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm whitespace-nowrap shrink-0", onClick: () => {
                                                                            void sendMessage();
                                                                        }, disabled: !messageInput.trim() && pendingAttachments.length === 0, children: [_jsx(Send, { className: "h-4 w-4 shrink-0" }), _jsx("span", { children: "Senden" })] })] })] })] })] })), _jsxs("div", { className: "lg:col-span-4 min-w-0 flex flex-col gap-4 min-h-0 lg:h-full lg:max-h-full", children: [_jsx(motion.button, { type: "button", whileHover: { scale: 1.01 }, whileTap: { scale: 0.99 }, onClick: () => setProfileModalOpen(true), className: `shrink-0 w-full text-left rounded-3xl border transition-colors ${myEffectivePresence === "on_call"
                                                    ? "border-red-400/50 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                                                    : "border-violet-400/20 bg-white/5 hover:bg-white/[0.07]"} text-white backdrop-blur-xl overflow-hidden`, children: _jsxs("div", { className: "p-4 sm:p-5 flex gap-4 items-start min-w-0", children: [_jsx("div", { className: "relative shrink-0", children: _jsx(Avatar, { className: `h-[5rem] w-[5rem] sm:h-[5.25rem] sm:w-[5.25rem] overflow-hidden rounded-2xl border-2 ${myEffectivePresence === "on_call"
                                                                    ? "border-red-400/60 ring-2 ring-red-500/40 animate-pulse"
                                                                    : "border-violet-400/35 ring-2 ring-cyan-500/10"}`, children: currentUser?.avatarUrl ? (_jsx("img", { src: currentUser.avatarUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "flex h-full w-full items-center justify-center bg-white/10 text-xl font-semibold text-white", children: (currentUser?.displayName ?? "?").slice(0, 2).toUpperCase() })) }) }), _jsxs("div", { className: "min-w-0 flex-1 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsxs("span", { className: "text-xs uppercase tracking-wider text-violet-200/80 flex items-center gap-1.5", children: [_jsx(UserIcon, { className: "h-3.5 w-3.5" }), "Dein Profil"] }), _jsx(StatusPill, { presence: myEffectivePresence })] }), _jsx("div", { className: "text-lg font-semibold truncate", children: currentUser?.displayName ?? "Gast" }), currentUser?.statusMessage ? (_jsxs("p", { className: "text-xs text-white/55 line-clamp-2 leading-snug", children: ["\u201E", currentUser.statusMessage, "\u201C"] })) : (_jsx("p", { className: "text-xs text-white/40", children: "Kein Statustext \u2014 im Profil erg\u00E4nzen." })), _jsxs("div", { className: "text-[11px] text-white/45 space-y-0.5", children: [_jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "text-white/35", children: "E-Mail (Profil):" }), _jsx("span", { className: "truncate", children: currentUser?.contactEmail ?? "—" })] }), _jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [_jsx("span", { className: "text-white/35", children: "Telefon:" }), _jsx("span", { children: currentUser?.phoneDigits
                                                                                        ? maskPhoneDigits(currentUser.phoneDigits)
                                                                                        : "—" })] })] }), _jsx("div", { className: "pt-1", children: _jsx("span", { className: "text-xs font-medium text-cyan-300/90", children: "Profil bearbeiten \u2192" }) })] })] }) }), _jsxs("div", { className: "flex flex-col gap-4 min-h-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden lg:overscroll-y-contain [scrollbar-gutter:stable] pr-0.5", children: [_jsxs(Card, { className: "rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl shrink-0", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-lg", children: ["Status (", activeSectionData.label, ")"] }) }), _jsxs(CardContent, { className: "space-y-3", children: [visibleFriendsForSection.length === 0 ? (_jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-3 text-xs text-white/70", children: "Keine Freunde in dieser Gruppe." })) : null, visibleFriendsForSection.map((friend) => {
                                                                        const option = friendGroupOptions.find((entry) => entry.value === friend.group);
                                                                        const fp = resolvePresenceForSection(friend.status, friend.statusBySection, activeSection);
                                                                        return (_jsxs("div", { className: `rounded-2xl border p-3 flex gap-3 items-start transition-colors ${fp === "on_call"
                                                                                ? "border-red-400/40 bg-red-950/25"
                                                                                : "border-emerald-400/20 bg-emerald-500/10"}`, children: [_jsx(Avatar, { className: "h-9 w-9 shrink-0 overflow-hidden rounded-full border border-emerald-300/25", children: friend.avatarUrl ? (_jsx("img", { src: friend.avatarUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "flex h-full w-full items-center justify-center bg-emerald-900/30 text-[10px] text-emerald-100", children: friend.displayName.slice(0, 2).toUpperCase() })) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "text-sm text-emerald-200", children: [friend.displayName, " ", _jsx("span", { title: option?.label ?? friend.group, children: option?.emoji ?? "👤" })] }), _jsx(StatusPill, { presence: fp })] }), friend.statusMessage ? (_jsx("div", { className: "text-[11px] text-white/55 mt-1 line-clamp-2", children: friend.statusMessage })) : null, friend.contactEmail ? (_jsxs("div", { className: "text-[10px] text-white/40 mt-1 truncate", children: ["\u2709 ", friend.contactEmail] })) : null, friend.phoneMasked ? (_jsxs("div", { className: "text-[10px] text-white/40 truncate", children: ["\uD83D\uDCDE ", friend.phoneMasked] })) : null, _jsx("div", { className: "text-[10px] text-white/35 mt-1", children: option?.label ?? friend.group })] })] }, friend.id));
                                                                    })] })] }), _jsxs(Card, { className: "rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl shrink-0", children: [_jsxs(CardHeader, { children: [_jsx(CardTitle, { className: "text-lg", children: "Naechste Termine" }), _jsx("p", { className: "text-[11px] text-white/45 font-normal mt-1 leading-snug", children: "Aus allen Workspaces \u00B7 Farbe = Rubrik (z.\u00A0B. Feuerwehr rot, Familie t\u00FCrkis)" })] }), _jsx(CardContent, { className: "space-y-3", children: !token || !currentUser ? (_jsx("div", { className: "text-xs text-white/45 py-4 text-center", children: "Anmelden, um Termine zu sehen." })) : sidebarUpcoming.length === 0 ? (_jsxs("div", { className: "text-xs text-white/45 py-4 text-center leading-relaxed", children: ["Keine anstehenden Termine. Unter ", _jsx("strong", { className: "text-white/70", children: "Kalender" }), " kannst du welche anlegen \u2014 sie erscheinen hier und im Kalender \u00FCber alle Bereiche."] })) : (sidebarUpcoming.map((ev) => {
                                                                    const card = upcomingCardClasses(ev.sectionId);
                                                                    const sec = CALENDAR_SECTION_META[ev.sectionId] ?? CALENDAR_SECTION_META.familie;
                                                                    const timePart = formatSidebarUpcomingTime(ev.startsAt, ev.allDay);
                                                                    const loc = (ev.location ?? "").trim();
                                                                    const sub = [
                                                                        timePart,
                                                                        loc || null,
                                                                        sec.label,
                                                                        ev.workspaceName ?? null,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(" · ");
                                                                    return (_jsxs("button", { type: "button", onClick: () => navigate("/kalender"), className: `w-full text-left rounded-2xl border px-4 py-3 flex items-start gap-3 min-w-0 transition-colors hover:brightness-110 ${card.wrap}`, children: [_jsx("div", { className: `h-10 w-10 shrink-0 rounded-2xl border flex items-center justify-center ${card.iconWrap}`, children: _jsx(Clock3, { className: `h-5 w-5 ${card.clockClass}` }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium leading-snug break-words", children: ev.title }), _jsx("div", { className: "text-xs text-white/65 mt-1 leading-snug break-words", children: sub })] })] }, ev.id));
                                                                })) })] }), _jsxs(Card, { className: "rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl shrink-0", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "Schnellaktionen" }) }), _jsx(CardContent, { className: "grid grid-cols-2 gap-2 sm:gap-3 min-w-0", children: [
                                                                    "Neuer Chat",
                                                                    "Kalender",
                                                                    "Kontakte",
                                                                    ...(activeSection === "feuerwehr"
                                                                        ? ["Alarm senden", "Status melden", "Sprachkanal", "Einsatzplan"]
                                                                        : activeSection === "arbeit"
                                                                            ? ["Task erstellen", "Datei teilen", "Meeting starten", "Schicht planen"]
                                                                            : activeSection === "ideen"
                                                                                ? ["Idee starten", "To-do erstellen", "Bearbeiter einladen", "Fortschritt updaten"]
                                                                                : ["Raum erstellen"]),
                                                                ].map((label) => {
                                                                    const opensChatModal = label === "Neuer Chat" || label === "Raum erstellen";
                                                                    return (_jsx(Button, { type: "button", onClick: () => {
                                                                            if (opensChatModal) {
                                                                                setNewChatOpen(true);
                                                                                return;
                                                                            }
                                                                            if (label === "Kalender" || label === "Einsatzplan") {
                                                                                navigate("/kalender");
                                                                                return;
                                                                            }
                                                                            if (label === "Kontakte") {
                                                                                navigate("/kontakte");
                                                                                return;
                                                                            }
                                                                            if (label === "Schicht planen") {
                                                                                navigate("/arbeitsplan");
                                                                                return;
                                                                            }
                                                                            if (label === "Meeting starten") {
                                                                                if (!activeWorkspaceId) {
                                                                                    setAppNotice("Workspace wird geladen …");
                                                                                    return;
                                                                                }
                                                                                setMainView("meetings");
                                                                                if (meetingRooms.length > 0) {
                                                                                    setActiveMeetingRoomId((prev) => prev && meetingRooms.some((r) => r.id === prev) ? prev : meetingRooms[0].id);
                                                                                    setAppNotice(null);
                                                                                }
                                                                                else {
                                                                                    setActiveMeetingRoomId(null);
                                                                                    setAppNotice("Zuerst einen Meetingraum anlegen (Plus in der Meeting-Ansicht).");
                                                                                }
                                                                                return;
                                                                            }
                                                                            if (label === "Datei teilen") {
                                                                                setMainView("chat");
                                                                                openFilePicker();
                                                                                return;
                                                                            }
                                                                            if (label === "Task erstellen") {
                                                                                setMainView("chat");
                                                                                setMessageInput((p) => (p.trim() ? p : "📋 Task: "));
                                                                                focusMessageInput();
                                                                                return;
                                                                            }
                                                                            if (label === "Alarm senden") {
                                                                                setMainView("chat");
                                                                                setMessageInput((p) => (p.trim() ? p : "🚨 ALARM / EINSATZ: "));
                                                                                focusMessageInput();
                                                                                return;
                                                                            }
                                                                            if (label === "Status melden") {
                                                                                setMainView("chat");
                                                                                setMessageInput((p) => (p.trim() ? p : "📟 Status: "));
                                                                                focusMessageInput();
                                                                                return;
                                                                            }
                                                                            if (label === "Sprachkanal") {
                                                                                openVoiceRoom();
                                                                                return;
                                                                            }
                                                                            if (label === "Idee starten") {
                                                                                setMainView("chat");
                                                                                setMessageInput((p) => (p.trim() ? p : "💡 Idee: "));
                                                                                focusMessageInput();
                                                                                return;
                                                                            }
                                                                            if (label === "To-do erstellen") {
                                                                                setMainView("chat");
                                                                                setMessageInput((p) => (p.trim() ? p : "☐ To-do: "));
                                                                                focusMessageInput();
                                                                                return;
                                                                            }
                                                                            if (label === "Bearbeiter einladen") {
                                                                                setNewChatOpen(true);
                                                                                return;
                                                                            }
                                                                            if (label === "Fortschritt updaten") {
                                                                                setMainView("chat");
                                                                                setMessageInput((p) => (p.trim() ? p : "📊 Fortschritt: "));
                                                                                focusMessageInput();
                                                                                return;
                                                                            }
                                                                        }, className: "rounded-2xl min-h-[4.5rem] h-auto py-3 px-2 sm:px-3 bg-cyan-500/15 border border-cyan-300/30 text-cyan-100 hover:bg-cyan-500/25 text-[11px] sm:text-xs leading-snug text-center whitespace-normal break-words hyphens-auto disabled:opacity-40 disabled:pointer-events-none", children: label }, label));
                                                                }) })] }), _jsx("div", { className: "rounded-[1.35rem] border border-white/10 bg-[#070d18]/90 backdrop-blur-xl p-3 min-w-0 min-h-0 shadow-xl shadow-black/40 shrink-0", children: _jsx(FriendsPanel, { displayName: currentUser?.displayName ?? "", friendCode: currentUser?.friendCode ?? "", activeWorkspaceId: activeWorkspaceId, activeSection: activeSection, workspaceInviteCode: inviteCode, onWorkspaceInviteCodeChange: setInviteCode, onJoinWorkspace: (c) => void joinWithInviteCode(c), generatedWorkspaceInviteCode: generatedInviteCode, onCreateWorkspaceInvite: () => void createInviteCode(), onRegenerateFriendCode: handleRegenerateFriendCode, inviteInfo: inviteInfo, friendInfo: friendInfo, friendSearch: friendSearch, onFriendSearchChange: setFriendSearch, onSearchFriends: () => void searchFriends(), friendSearchResults: friendSearchResults, onSendFriendRequest: (id) => void sendFriendRequest(id), incomingFriendRequests: incomingFriendRequests, resolveRequestUser: (id) => usersById[id], onRespondRequest: (rid, a) => void respondFriendRequest(rid, a), friends: friends, friendGroupOptions: friendGroupOptions, onSetFriendGroup: (fid, g) => void setFriendGroup(fid, g), onAddFriendByCode: addFriendByCode, onOpenPrivateChat: openPrivateChatWithFriend }) })] })] })] })] })] }), _jsx(NewChatModal, { open: newChatOpen, onClose: () => setNewChatOpen(false), sectionLabel: activeSectionData.label, membersExcludingSelf: membersExcludingSelf, onCreatePrivate: createPrivateChat, onCreateGroup: createGroupChat }), _jsx(ProfileModal, { open: profileModalOpen, onClose: () => setProfileModalOpen(false), activeSectionId: activeSection, activeSectionLabel: activeSectionData.label })] }));
}
