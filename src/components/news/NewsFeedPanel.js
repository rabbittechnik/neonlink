import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CalendarDays, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
function iconForKind(kind) {
    switch (kind) {
        case "friend_request":
            return Users;
        case "meeting_invite":
        case "calendar_event":
            return CalendarDays;
        default:
            return MessageSquare;
    }
}
export function NewsFeedPanel({ items, onOpenChat, onOpenFriendRequests, onOpenMeetingInvite, onOpenCalendarNews, }) {
    return (_jsx("div", { className: "flex flex-col min-h-0 min-w-0 h-full", children: _jsxs(Card, { className: "flex-1 min-h-0 rounded-3xl border border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col overflow-hidden", children: [_jsxs(CardHeader, { className: "shrink-0 border-b border-white/10 py-4 px-5", children: [_jsx(CardTitle, { className: "text-lg font-semibold tracking-tight", children: "Neuigkeiten" }), _jsx("p", { className: "text-xs text-white/50 mt-1 font-normal", children: "Nachrichten, neue Termine von anderen, Freundschaftsanfragen und Meeting-Einladungen \u2014 ohne deine eigenen Aktivit\u00E4ten." })] }), _jsx(CardContent, { className: "flex-1 min-h-0 overflow-y-auto p-4 space-y-2", children: items.length === 0 ? (_jsx("div", { className: "rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-12 text-center text-sm text-white/50", children: "Keine neuen Neuigkeiten." })) : (items.map((item) => {
                        const Icon = iconForKind(item.kind);
                        return (_jsxs("button", { type: "button", onClick: () => {
                                if (item.kind === "chat_unread" && item.roomId && item.sectionId) {
                                    onOpenChat(item.roomId, item.sectionId);
                                    return;
                                }
                                if (item.kind === "friend_request") {
                                    onOpenFriendRequests();
                                    return;
                                }
                                if (item.kind === "meeting_invite") {
                                    onOpenMeetingInvite(item);
                                    return;
                                }
                                if (item.kind === "calendar_event" && item.calendarNewsEventId) {
                                    onOpenCalendarNews(item.calendarNewsEventId);
                                }
                            }, className: "w-full text-left rounded-2xl border border-white/10 bg-black/25 hover:bg-white/[0.07] hover:border-cyan-400/25 transition-colors p-3 flex gap-3 min-w-0", children: [_jsx("div", { className: "shrink-0 h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center", children: _jsx(Icon, { className: "h-5 w-5 text-cyan-200" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium text-white leading-snug break-words", children: item.title }), item.subtitle ? (_jsx("div", { className: "text-xs text-white/50 mt-1 leading-snug break-words", children: item.subtitle })) : null] })] }, item.id));
                    })) })] }) }));
}
