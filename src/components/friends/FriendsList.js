import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePresenceForSection } from "@/utils/resolveUserPresence";
import { FRIENDSHIP_FLOW_KEYS } from "./FriendCategoryModal";
const FLOW_SET = new Set(FRIENDSHIP_FLOW_KEYS);
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
        className: "bg-red-600/30 text-red-100 font-semibold border-red-400/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
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
export function FriendsList({ friends, activeSection, groupOptions, onSetFriendGroups, onOpenFriendProfile, onOpenPrivateChat, chatBusyId, }) {
    return (_jsxs(Card, { className: "rounded-3xl border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white backdrop-blur-xl shadow-lg shadow-black/25", children: [_jsx(CardHeader, { className: "pb-2", children: _jsxs(CardTitle, { className: "text-sm font-semibold flex items-center gap-2", children: [_jsx("span", { className: "text-base", "aria-hidden": true, children: "\uD83D\uDC65" }), "Deine Freunde"] }) }), _jsx(CardContent, { className: "space-y-1.5 pt-0 max-h-56 overflow-y-auto pr-1", children: friends.length === 0 ? (_jsx("p", { className: "text-xs font-medium text-white py-6 text-center leading-relaxed px-2", children: "Noch keine Freunde. Nutze Code oder Suche, um Kontakte hinzuzuf\u00FCgen." })) : (friends.map((friend) => {
                    const presence = resolvePresenceForSection(friend.status, friend.statusBySection, activeSection);
                    const effective = friend.groups && friend.groups.length > 0 ? friend.groups : [friend.group];
                    const legacy = effective.filter((g) => !FLOW_SET.has(g));
                    const flowSelected = FRIENDSHIP_FLOW_KEYS.filter((k) => effective.includes(k));
                    const primaryGroup = effective[0] ?? friend.group;
                    const opt = groupOptions.find((g) => g.value === primaryGroup);
                    const toggleFlow = (key) => {
                        const nextFlow = new Set(flowSelected);
                        if (nextFlow.has(key))
                            nextFlow.delete(key);
                        else
                            nextFlow.add(key);
                        if (activeSection === "familie")
                            nextFlow.add("familie");
                        if (nextFlow.size === 0)
                            nextFlow.add("freunde");
                        const orderedFlow = FRIENDSHIP_FLOW_KEYS.filter((k) => nextFlow.has(k));
                        const merged = [...legacy, ...orderedFlow];
                        onSetFriendGroups(friend.id, merged);
                    };
                    return (_jsxs("div", { className: "w-full rounded-2xl border border-white/10 bg-black/20 p-2.5 hover:bg-white/[0.07] hover:border-cyan-400/25 transition-all group flex flex-col gap-2 min-w-0", children: [_jsxs("div", { className: "flex gap-2 items-start min-w-0", children: [_jsxs("button", { type: "button", onClick: () => onOpenFriendProfile(friend.id), className: "min-w-0 flex-1 text-left flex gap-2.5 items-center rounded-xl -m-0.5 p-0.5 hover:bg-white/[0.06] transition-colors", children: [_jsxs("div", { className: "relative shrink-0", children: [_jsx(Avatar, { className: "h-11 w-11 overflow-hidden rounded-full border border-white/15 ring-2 ring-transparent group-hover:ring-cyan-400/30 transition-all", children: friend.avatarUrl ? (_jsx("img", { src: friend.avatarUrl, alt: "", className: "h-full w-full object-cover" })) : (_jsx(AvatarFallback, { className: "flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/30 to-violet-500/20 text-sm", children: friend.displayName.slice(0, 2).toUpperCase() })) }), _jsx("span", { className: `absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a1020] ${presence === "online"
                                                            ? "bg-emerald-400"
                                                            : presence === "away"
                                                                ? "bg-amber-400"
                                                                : presence === "busy"
                                                                    ? "bg-violet-400"
                                                                    : presence === "on_call"
                                                                        ? "bg-red-400 animate-pulse"
                                                                        : "bg-red-500"}`, title: STATUS_PILL[presence].label })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "flex items-center gap-2 min-w-0", children: _jsx("span", { className: "text-sm font-semibold truncate text-white", children: friend.displayName }) }), _jsxs("div", { className: "flex flex-wrap items-center gap-1.5 mt-1", children: [_jsx(StatusDot, { presence: presence }), _jsxs("span", { className: "text-[10px] font-medium text-white/90", title: opt?.label, children: [opt?.emoji, " ", opt?.label ?? primaryGroup, effective.length > 1 ? ` +${effective.length - 1}` : ""] })] })] })] }), _jsx("button", { type: "button", onClick: () => void onOpenPrivateChat(friend.id), disabled: chatBusyId === friend.id, title: "Direktchat \u00F6ffnen", className: "shrink-0 rounded-xl p-2 text-cyan-100 hover:bg-cyan-500/15 hover:text-cyan-50 disabled:opacity-50 transition-colors", children: _jsx(MessageCircle, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "rounded-lg border border-white/10 bg-white/[0.04] p-2 space-y-1.5", children: [_jsx("div", { className: "text-[9px] uppercase tracking-wider text-white/80 font-semibold", children: "Kategorien (Mehrfach)" }), _jsx("div", { className: "flex flex-wrap gap-x-3 gap-y-1", children: FRIENDSHIP_FLOW_KEYS.map((key) => {
                                            const o = groupOptions.find((g) => g.value === key);
                                            return (_jsxs("label", { className: "inline-flex items-center gap-1.5 text-[10px] text-white cursor-pointer select-none", children: [_jsx("input", { type: "checkbox", checked: flowSelected.includes(key), onChange: () => toggleFlow(key), className: "rounded border-white/30 w-3.5 h-3.5 accent-cyan-500" }), _jsxs("span", { children: [o?.emoji, " ", o?.label ?? key] })] }, key));
                                        }) }), legacy.length > 0 ? (_jsxs("p", { className: "text-[9px] text-white/55 leading-snug", children: ["Weitere Gruppen: ", legacy.map((g) => groupOptions.find((o) => o.value === g)?.label ?? g).join(", ")] })) : null] })] }, friend.id));
                })) })] }));
}
