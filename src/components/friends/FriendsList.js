import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePresenceForSection } from "@/utils/resolveUserPresence";
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
        className: "bg-red-600/35 text-red-100 border-red-400/55",
    },
};
function StatusDot({ presence }) {
    const s = STATUS_PILL[presence];
    return (_jsx("span", { className: `inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${s.className}`, children: s.label }));
}
export function FriendsList({ friends, activeSection, groupOptions, onSetFriendGroup, onOpenPrivateChat, chatBusyId, }) {
    return (_jsxs(Card, { className: "rounded-3xl border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white backdrop-blur-xl shadow-lg shadow-black/25", children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs(CardTitle, { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx("span", { className: "text-base", "aria-hidden": true, children: "\uD83D\uDC65" }), "Deine Freunde"] }) }), _jsx(CardContent, { className: "space-y-1.5 pt-0 max-h-56 overflow-y-auto pr-1", children: friends.length === 0 ? (_jsx("p", { className: "text-xs text-white/45 py-6 text-center leading-relaxed px-2", children: "Noch keine Freunde. Nutze Code oder Suche, um Kontakte hinzuzuf\u00FCgen." })) : (friends.map((friend) => {
                    const presence = resolvePresenceForSection(friend.status, friend.statusBySection, activeSection);
                    const opt = groupOptions.find((g) => g.value === friend.group);
                    return (_jsxs("button", { type: "button", onClick: () => onOpenPrivateChat(friend.id), disabled: chatBusyId === friend.id, className: "w-full text-left rounded-2xl border border-white/10 bg-black/20 p-2.5 hover:bg-white/[0.07] hover:border-cyan-400/25 transition-all group flex gap-2.5 items-center min-w-0 disabled:opacity-60", children: [_jsxs("div", { className: "relative shrink-0", children: [_jsx(Avatar, { className: "h-11 w-11 overflow-hidden rounded-full border border-white/15 ring-2 ring-transparent group-hover:ring-cyan-400/30 transition-all", children: friend.avatarUrl ? (_jsx("img", { src: friend.avatarUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/30 to-violet-500/20 text-sm", children: friend.displayName.slice(0, 2).toUpperCase() })) }), _jsx("span", { className: `absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a1020] ${presence === "online"
                                            ? "bg-emerald-400"
                                            : presence === "away"
                                                ? "bg-amber-400"
                                                : presence === "busy"
                                                    ? "bg-violet-400"
                                                    : presence === "on_call"
                                                        ? "bg-red-400 animate-pulse"
                                                        : "bg-white/25"}`, title: STATUS_PILL[presence].label })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [_jsx("span", { className: "text-sm font-medium truncate text-white", children: friend.displayName }), _jsx(MessageCircle, { className: "h-3.5 w-3.5 text-cyan-400/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5 mt-1", children: [_jsx(StatusDot, { presence: presence }), _jsxs("span", { className: "text-[10px] text-white/40", title: opt?.label, children: [opt?.emoji, " ", opt?.label ?? friend.group] })] }), _jsx("select", { className: "mt-2 w-full max-w-full rounded-lg bg-white/5 border border-white/10 text-[11px] py-1 px-2 text-white/90 pointer-events-auto", value: friend.group, onClick: (e) => e.stopPropagation(), onChange: (e) => {
                                            onSetFriendGroup(friend.id, e.target.value);
                                        }, children: groupOptions.map((g) => (_jsxs("option", { value: g.value, className: "bg-[#121c31] text-white", children: [g.emoji, " ", g.label] }, g.value))) })] })] }, friend.id));
                })) })] }));
}
