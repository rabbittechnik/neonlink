import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { FriendsHeader } from "./FriendsHeader";
import { InviteCodeCard } from "./InviteCodeCard";
import { JoinByCodeCard } from "./JoinByCodeCard";
import { FriendSearchStrip } from "./FriendSearchStrip";
import { FriendRequestsCard } from "./FriendRequestsCard";
import { FriendsList } from "./FriendsList";
export function FriendsPanel({ displayName, friendCode, activeWorkspaceId, activeSection, workspaceInviteCode, onWorkspaceInviteCodeChange, onJoinWorkspace, generatedWorkspaceInviteCode, onCreateWorkspaceInvite, onRegenerateFriendCode, inviteInfo, friendInfo, friendSearch, onFriendSearchChange, onSearchFriends, friendSearchResults, onSendFriendRequest, incomingFriendRequests, resolveRequestUser, onRespondRequest, friends, friendGroupOptions, onSetFriendGroup, onAddFriendByCode, onOpenPrivateChat, }) {
    const [copyHint, setCopyHint] = useState(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [joinPulse, setJoinPulse] = useState(false);
    const [chatBusyId, setChatBusyId] = useState(null);
    const copyTimer = useRef(null);
    const pulseTimer = useRef(null);
    useEffect(() => {
        return () => {
            if (copyTimer.current)
                clearTimeout(copyTimer.current);
            if (pulseTimer.current)
                clearTimeout(pulseTimer.current);
        };
    }, []);
    const copyFriendCode = useCallback(() => {
        if (!friendCode)
            return;
        void navigator.clipboard.writeText(friendCode).then(() => {
            setCopyHint("In Zwischenablage kopiert.");
            if (copyTimer.current)
                clearTimeout(copyTimer.current);
            copyTimer.current = setTimeout(() => setCopyHint(null), 2200);
        });
    }, [friendCode]);
    const handleRegenerate = useCallback(async () => {
        await onRegenerateFriendCode();
    }, [onRegenerateFriendCode]);
    const scrollToJoin = useCallback(() => {
        document.getElementById("friends-join-by-code")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        setJoinPulse(true);
        if (pulseTimer.current)
            clearTimeout(pulseTimer.current);
        pulseTimer.current = setTimeout(() => setJoinPulse(false), 2400);
    }, []);
    const handleOpenChat = useCallback(async (friendId) => {
        setChatBusyId(friendId);
        try {
            await onOpenPrivateChat(friendId);
        }
        finally {
            setChatBusyId(null);
        }
    }, [onOpenPrivateChat]);
    return (_jsxs("div", { className: "space-y-3 min-w-0", children: [_jsx(FriendsHeader, { onAddFriend: scrollToJoin, onSearch: () => setSearchOpen((v) => !v), searchActive: searchOpen }), searchOpen ? (_jsx(FriendSearchStrip, { friendSearch: friendSearch, onFriendSearchChange: onFriendSearchChange, onSearchFriends: onSearchFriends, results: friendSearchResults, onSendFriendRequest: onSendFriendRequest })) : null, _jsxs("p", { className: "text-[10px] text-white/40 leading-relaxed px-0.5", children: ["Eingeloggt als ", _jsx("span", { className: "text-cyan-200/90", children: displayName }), ". Gruppen (Familie, Feuerwehr, \u2026) ordnest du nur f\u00FCr dich zu \u2014 andere sehen deine Zuordnung nicht."] }), (inviteInfo || friendInfo) && (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 px-3 py-2 space-y-1 text-[11px]", children: [inviteInfo ? _jsx("p", { className: "text-white/70 leading-snug", children: inviteInfo }) : null, friendInfo ? _jsx("p", { className: "text-cyan-200/90 leading-snug", children: friendInfo }) : null] })), _jsx(InviteCodeCard, { friendCode: friendCode, onCopyFriendCode: copyFriendCode, onRegenerateFriendCode: handleRegenerate, activeWorkspaceId: activeWorkspaceId, workspaceInviteCode: workspaceInviteCode, onWorkspaceInviteCodeChange: onWorkspaceInviteCodeChange, onJoinWorkspace: () => onJoinWorkspace(), generatedWorkspaceInviteCode: generatedWorkspaceInviteCode, onCreateWorkspaceInvite: onCreateWorkspaceInvite, copyHint: copyHint }), _jsx(JoinByCodeCard, { highlight: joinPulse, onAddFriendByCode: onAddFriendByCode }), _jsx(FriendRequestsCard, { requests: incomingFriendRequests, resolveUser: resolveRequestUser, onRespond: onRespondRequest }), _jsx(FriendsList, { friends: friends, activeSection: activeSection, groupOptions: friendGroupOptions, onSetFriendGroup: onSetFriendGroup, onOpenPrivateChat: handleOpenChat, chatBusyId: chatBusyId })] }));
}
