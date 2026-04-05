import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateMeetingModal } from "./CreateMeetingModal";
function formatRange(startsAt, endsAt) {
    const a = new Date(startsAt);
    const b = new Date(endsAt);
    if (Number.isNaN(a.getTime()))
        return startsAt;
    const d = a.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
    const ta = a.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const tb = b.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    return `${d} · ${ta} – ${tb}`;
}
export function MeetingsWorkspacePanel({ rooms, activeRoomId, onSelectRoom, meetings, members, currentUserId, activeSection, namesById, onRefreshMeetings, onRefreshRooms, onCreateMeeting, onDeleteMeeting, onCreateRoom, onRenameRoom, onDeleteRoom, }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [detailId, setDetailId] = useState(null);
    const [newRoomOpen, setNewRoomOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState("Neuer Raum");
    const [roomBusy, setRoomBusy] = useState(false);
    const [renamingRoomId, setRenamingRoomId] = useState(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [renameBusy, setRenameBusy] = useState(false);
    const [roomListError, setRoomListError] = useState(null);
    const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
    const detail = meetings.find((m) => m.id === detailId) ?? null;
    const nowMs = Date.now();
    const createRoom = async () => {
        setRoomBusy(true);
        setRoomListError(null);
        try {
            await onCreateRoom(newRoomName.trim() || "Neuer Raum");
            onRefreshRooms();
            setNewRoomOpen(false);
            setNewRoomName("Neuer Raum");
        }
        finally {
            setRoomBusy(false);
        }
    };
    const saveRename = async () => {
        if (!renamingRoomId)
            return;
        const n = renameDraft.trim();
        if (!n)
            return;
        setRenameBusy(true);
        setRoomListError(null);
        try {
            await onRenameRoom(renamingRoomId, n);
            setRenamingRoomId(null);
            onRefreshRooms();
        }
        catch (e) {
            const code = e instanceof Error ? e.message : "";
            const friendly = {
                name_locked: "Dieser Name ist fest vergeben.",
                not_found: "Raum nicht gefunden.",
                forbidden: "Keine Berechtigung.",
                rename_failed: "Umbenennen fehlgeschlagen.",
            };
            setRoomListError(friendly[code] ?? (e instanceof Error ? e.message : "Fehler"));
        }
        finally {
            setRenameBusy(false);
        }
    };
    const deleteRoom = async (roomId) => {
        if (!confirm("Diesen Meetingraum wirklich löschen? (Nur möglich ohne geplante Meetings im Raum.)"))
            return;
        setRoomListError(null);
        try {
            await onDeleteRoom(roomId);
            if (renamingRoomId === roomId)
                setRenamingRoomId(null);
            onRefreshRooms();
        }
        catch (e) {
            const code = e instanceof Error ? e.message : "";
            const friendly = {
                cannot_delete_default_room: "Standard-Räume können nicht gelöscht werden.",
                room_has_meetings: "Zuerst alle Meetings in diesem Raum löschen oder verschieben.",
                not_found: "Raum nicht gefunden.",
                forbidden: "Keine Berechtigung.",
                delete_room_failed: "Löschen fehlgeschlagen.",
            };
            setRoomListError(friendly[code] ?? (e instanceof Error ? e.message : "Fehler"));
        }
    };
    return (_jsxs("div", { className: "flex flex-col gap-4 min-h-0 min-w-0 h-full", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0", children: [_jsxs(Card, { className: "lg:col-span-4 rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 min-w-0", children: [_jsx(CardHeader, { className: "pb-2 shrink-0", children: _jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [_jsx("span", { "aria-hidden": true, children: "\uD83D\uDCC5" }), " Meetings"] }) }), _jsxs(CardContent, { className: "space-y-1 flex-1 min-h-0 overflow-y-auto pr-1", children: [roomListError ? (_jsx("p", { className: "text-xs text-red-300/90 mb-2 px-1", children: roomListError })) : null, rooms.map((r) => renamingRoomId === r.id ? (_jsxs("div", { className: "rounded-2xl border border-cyan-400/30 bg-black/30 p-2 space-y-2 mb-1", children: [_jsx("input", { value: renameDraft, onChange: (e) => setRenameDraft(e.target.value), className: "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white", autoFocus: true }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", disabled: renameBusy || !renameDraft.trim(), onClick: () => void saveRename(), className: "flex-1 h-8 rounded-lg bg-cyan-500/25 border border-cyan-400/35 text-cyan-100 text-xs", children: "Speichern" }), _jsx(Button, { type: "button", variant: "ghost", disabled: renameBusy, onClick: () => setRenamingRoomId(null), className: "h-8 rounded-lg text-white/70 text-xs", children: "Abbrechen" })] })] }, r.id)) : (_jsxs("div", { className: `flex items-stretch gap-0.5 rounded-2xl border mb-1 transition-colors ${r.id === activeRoomId
                                            ? "border-cyan-400/40 bg-cyan-500/15"
                                            : "border-white/10 bg-white/5"}`, children: [_jsxs("button", { type: "button", onClick: () => onSelectRoom(r.id), className: "flex-1 min-w-0 text-left px-3 py-2.5 text-sm text-white/90 hover:bg-white/[0.06] rounded-l-2xl", children: [_jsx(Video, { className: "inline h-3.5 w-3.5 mr-2 -mt-0.5 text-cyan-300/80" }), _jsx("span", { className: "truncate align-middle", children: r.name })] }), !r.lockedName ? (_jsx("button", { type: "button", title: "Umbenennen", "aria-label": `${r.name} umbenennen`, onClick: () => {
                                                    setRoomListError(null);
                                                    setRenamingRoomId(r.id);
                                                    setRenameDraft(r.name);
                                                }, className: "shrink-0 w-9 flex items-center justify-center text-white/45 hover:text-cyan-200 hover:bg-white/10 rounded-none border-l border-white/10", children: _jsx(Pencil, { className: "h-3.5 w-3.5" }) })) : null, !r.isDefault ? (_jsx("button", { type: "button", title: "Raum l\u00F6schen", "aria-label": `${r.name} löschen`, onClick: () => void deleteRoom(r.id), className: "shrink-0 w-9 flex items-center justify-center text-red-300/70 hover:text-red-200 hover:bg-red-500/15 rounded-r-2xl border-l border-white/10", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })) : null] }, r.id))), _jsxs(Button, { type: "button", variant: "ghost", onClick: () => setNewRoomOpen((v) => !v), className: "w-full mt-2 rounded-2xl border border-dashed border-white/20 text-white/60 hover:text-cyan-200 hover:border-cyan-400/30 text-xs h-9", children: [_jsx(Plus, { className: "h-3.5 w-3.5 mr-1 inline" }), "Raum erstellen"] }), newRoomOpen ? (_jsxs("div", { className: "mt-2 space-y-2 rounded-2xl border border-white/10 p-3 bg-black/20", children: [_jsx("input", { value: newRoomName, onChange: (e) => setNewRoomName(e.target.value), className: "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" }), _jsx(Button, { type: "button", disabled: roomBusy, onClick: () => void createRoom(), className: "w-full h-8 rounded-xl bg-violet-500/20 border border-violet-300/30 text-violet-100 text-xs", children: "Anlegen" })] })) : null] })] }), _jsxs(Card, { className: "lg:col-span-8 rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 min-w-0", children: [_jsxs(CardHeader, { className: "flex flex-row flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 shrink-0", children: [_jsxs(CardTitle, { className: "text-lg flex items-center gap-2 min-w-0", children: [_jsx(Video, { className: "h-5 w-5 text-cyan-300 shrink-0" }), _jsx("span", { className: "truncate", children: activeRoom ? activeRoom.name : "Raum wählen" })] }), _jsxs(Button, { type: "button", disabled: !activeRoomId, onClick: () => setModalOpen(true), className: "rounded-xl bg-cyan-500/20 border border-cyan-400/35 text-cyan-100 hover:bg-cyan-500/30 text-sm shrink-0", children: [_jsx(Plus, { className: "h-4 w-4 mr-1.5 inline" }), "Meeting planen"] })] }), _jsx(CardContent, { className: "flex-1 min-h-0 overflow-y-auto pt-4 space-y-3", children: !activeRoomId ? (_jsx("p", { className: "text-sm text-white/45 text-center py-12", children: "Links einen Meetingraum ausw\u00E4hlen." })) : meetings.length === 0 ? (_jsx("p", { className: "text-sm text-white/45 text-center py-12", children: "Noch keine Meetings, an denen du teilnimmst. Plane eines mit \u201EMeeting planen\u201C." })) : (meetings.map((m) => {
                                    const startMs = new Date(m.startsAt).getTime();
                                    const live = startMs <= nowMs && nowMs <= new Date(m.endsAt).getTime();
                                    return (_jsx("button", { type: "button", onClick: () => setDetailId(m.id), className: "w-full text-left rounded-2xl border border-white/10 bg-black/25 hover:border-cyan-400/25 hover:bg-white/[0.04] p-4 transition-colors", children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "font-medium text-white flex items-center gap-2 flex-wrap", children: [m.title, live ? (_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 animate-pulse", children: "l\u00E4uft" })) : null] }), _jsxs("div", { className: "text-xs text-cyan-200/70 mt-1 flex items-center gap-1", children: [_jsx(CalendarDays, { className: "h-3.5 w-3.5" }), formatRange(m.startsAt, m.endsAt)] }), _jsxs("div", { className: "text-[11px] text-white/45 mt-1 flex items-center gap-1", children: [_jsx(Users, { className: "h-3 w-3" }), m.participantUserIds.length + 1, " Teilnehmer (inkl. Organisator)"] })] }), m.createdByUserId === currentUserId ? (_jsx("span", { role: "button", tabIndex: 0, onClick: (e) => {
                                                        e.stopPropagation();
                                                        if (confirm("Meeting löschen? Kalendereintrag wird entfernt.")) {
                                                            void onDeleteMeeting(m.id).then(() => {
                                                                onRefreshMeetings();
                                                                setDetailId(null);
                                                            });
                                                        }
                                                    }, onKeyDown: (e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                        }
                                                    }, className: "p-2 rounded-xl text-red-300/80 hover:bg-red-500/15 shrink-0", "aria-label": "Meeting l\u00F6schen", children: _jsx(Trash2, { className: "h-4 w-4" }) })) : null] }) }, m.id));
                                })) })] })] }), detail ? (_jsxs("div", { className: "fixed inset-0 z-[84] flex items-end sm:items-center justify-center p-4 bg-black/50", role: "dialog", "aria-modal": "true", children: [_jsx("button", { type: "button", className: "absolute inset-0 cursor-default", "aria-label": "Schliessen", onClick: () => setDetailId(null) }), _jsxs("div", { className: "relative w-full max-w-md rounded-3xl border border-white/15 bg-[#0c1428] p-5 shadow-xl", children: [_jsx("h3", { className: "text-lg font-semibold text-white pr-8", children: detail.title }), _jsx("p", { className: "text-xs text-cyan-200/80 mt-1", children: formatRange(detail.startsAt, detail.endsAt) }), detail.description ? (_jsx("p", { className: "text-sm text-white/65 mt-3 leading-relaxed", children: detail.description })) : null, _jsxs("div", { className: "mt-4 text-xs text-white/50", children: [_jsx("div", { className: "font-medium text-white/70 mb-1", children: "Teilnehmer" }), _jsxs("ul", { className: "space-y-1", children: [_jsxs("li", { children: ["\u2022 ", namesById[detail.createdByUserId] ?? "Organisator", " (Organisator)"] }), detail.participantUserIds.map((id) => (_jsxs("li", { children: ["\u2022 ", namesById[id] ?? id] }, id)))] })] }), _jsx(Button, { type: "button", variant: "ghost", className: "mt-4 w-full rounded-xl text-white/70", onClick: () => setDetailId(null), children: "Schliessen" })] })] })) : null, _jsx(CreateMeetingModal, { open: modalOpen, onClose: () => setModalOpen(false), rooms: rooms, members: members, currentUserId: currentUserId, activeSection: activeSection, onSubmit: async (payload) => {
                    await onCreateMeeting(payload);
                    onRefreshMeetings();
                } })] }));
}
