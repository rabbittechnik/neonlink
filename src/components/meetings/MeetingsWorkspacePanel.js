import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Pencil, Plus, Trash2, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jitsiRoomForWorkspaceRoom, videoMeetingPath } from "@/utils/jitsiRoomNames";
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
export function MeetingsWorkspacePanel({ workspaceId, rooms, activeRoomId, onSelectRoom, meetings, members, currentUserId, activeSection, namesById, onRefreshMeetings, onRefreshRooms, onCreateMeeting, onDeleteMeeting, onCreateRoom, onRenameRoom, onDeleteRoom, currentUserDisplayName, }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [detailId, setDetailId] = useState(null);
    const [newRoomOpen, setNewRoomOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState("Neuer Raum");
    const [roomBusy, setRoomBusy] = useState(false);
    const [renamingRoomId, setRenamingRoomId] = useState(null);
    const [renameDraft, setRenameDraft] = useState("");
    const [renameBusy, setRenameBusy] = useState(false);
    const [roomListError, setRoomListError] = useState(null);
    const [quickBusy, setQuickBusy] = useState(false);
    const [quickInvite, setQuickInvite] = useState({});
    const [quickInviteError, setQuickInviteError] = useState(null);
    const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
    const detail = meetings.find((m) => m.id === detailId) ?? null;
    const nowMs = Date.now();
    const quickRoomName = activeRoomId ? jitsiRoomForWorkspaceRoom(workspaceId, activeRoomId) : "";
    const quickJoinLink = quickRoomName ? `https://meet.jit.si/${encodeURIComponent(quickRoomName)}` : "";
    const copyQuickLink = async () => {
        if (!quickJoinLink)
            return;
        try {
            await navigator.clipboard.writeText(quickJoinLink);
            setQuickInviteError("Link kopiert.");
        }
        catch {
            setQuickInviteError("Link konnte nicht kopiert werden.");
        }
    };
    const startRoomNow = () => {
        if (!activeRoom || !activeRoomId)
            return;
        const path = videoMeetingPath({
            workspaceId,
            roomId: activeRoomId,
            title: `Live: ${activeRoom.name}`,
        });
        window.open(path, "_blank", "noopener,noreferrer");
    };
    const sendQuickInvites = async () => {
        if (!activeRoomId || !activeRoom)
            return;
        const participantUserIds = Object.entries(quickInvite)
            .filter(([, on]) => on)
            .map(([id]) => id);
        if (participantUserIds.length === 0) {
            setQuickInviteError("Bitte mindestens einen Benutzer auswählen.");
            return;
        }
        const start = new Date();
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        setQuickBusy(true);
        setQuickInviteError(null);
        try {
            await onCreateMeeting({
                meetingRoomId: activeRoomId,
                title: `Sofort-Meeting: ${activeRoom.name}`,
                description: `Direkt beitreten: ${quickJoinLink}`,
                participantUserIds,
                startsAt: start.toISOString(),
                endsAt: end.toISOString(),
                sectionId: activeSection,
            });
            setQuickInvite({});
            onRefreshMeetings();
            setQuickInviteError("Einladungen gesendet.");
        }
        catch (e) {
            setQuickInviteError(e instanceof Error ? e.message : "Einladungen fehlgeschlagen.");
        }
        finally {
            setQuickBusy(false);
        }
    };
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
    return (_jsxs("div", { className: "flex flex-col gap-4 min-h-0 min-w-0 h-full", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0", children: [_jsxs(Card, { className: "lg:col-span-4 rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 min-w-0", children: [_jsx(CardHeader, { className: "pb-2 shrink-0", children: _jsxs(CardTitle, { className: "text-base flex items-center gap-2", children: [_jsx("span", { "aria-hidden": true, children: "\uD83D\uDCC5" }), " Meetings"] }) }), _jsxs(CardContent, { className: "space-y-1 flex-1 min-h-0 overflow-y-auto pr-1", children: [roomListError ? (_jsx("p", { className: "text-xs text-red-300/90 mb-2 px-1", children: roomListError })) : null, rooms.map((r) => renamingRoomId === r.id ? (_jsxs("div", { className: "rounded-2xl border border-cyan-400/30 bg-black/30 p-2 space-y-2 mb-1", children: [_jsx("input", { value: renameDraft, onChange: (e) => setRenameDraft(e.target.value), className: "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white", autoFocus: true }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { type: "button", disabled: renameBusy || !renameDraft.trim(), onClick: () => void saveRename(), className: "flex-1 h-8 rounded-lg bg-cyan-500/25 border border-cyan-400/35 text-cyan-100 text-xs", children: "Speichern" }), _jsx(Button, { type: "button", variant: "ghost", disabled: renameBusy, onClick: () => setRenamingRoomId(null), className: "h-8 rounded-lg text-white text-xs", children: "Abbrechen" })] })] }, r.id)) : (_jsxs("div", { className: `flex items-stretch gap-0.5 rounded-2xl border mb-1 transition-colors ${r.id === activeRoomId
                                            ? "border-cyan-400/40 bg-cyan-500/15"
                                            : "border-white/10 bg-white/5"}`, children: [_jsxs("button", { type: "button", onClick: () => onSelectRoom(r.id), className: "flex-1 min-w-0 text-left px-3 py-2.5 text-sm text-white hover:bg-white/[0.06] rounded-l-2xl", children: [_jsx(Video, { className: "inline h-3.5 w-3.5 mr-2 -mt-0.5 text-cyan-300/80" }), _jsx("span", { className: "truncate align-middle", children: r.name })] }), !r.lockedName ? (_jsx("button", { type: "button", title: "Umbenennen", "aria-label": `${r.name} umbenennen`, onClick: () => {
                                                    setRoomListError(null);
                                                    setRenamingRoomId(r.id);
                                                    setRenameDraft(r.name);
                                                }, className: "shrink-0 w-9 flex items-center justify-center text-white/90 hover:text-cyan-200 hover:bg-white/10 rounded-none border-l border-white/10", children: _jsx(Pencil, { className: "h-3.5 w-3.5" }) })) : null, !r.isDefault ? (_jsx("button", { type: "button", title: "Raum l\u00F6schen", "aria-label": `${r.name} löschen`, onClick: () => void deleteRoom(r.id), className: "shrink-0 w-9 flex items-center justify-center text-red-300/70 hover:text-red-200 hover:bg-red-500/15 rounded-r-2xl border-l border-white/10", children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })) : null] }, r.id))), _jsxs(Button, { type: "button", variant: "ghost", onClick: () => setNewRoomOpen((v) => !v), className: "w-full mt-2 rounded-2xl border border-dashed border-white/20 text-white hover:text-cyan-200 hover:border-cyan-400/30 text-xs h-9", children: [_jsx(Plus, { className: "h-3.5 w-3.5 mr-1 inline" }), "Raum erstellen"] }), newRoomOpen ? (_jsxs("div", { className: "mt-2 space-y-2 rounded-2xl border border-white/10 p-3 bg-black/20", children: [_jsx("input", { value: newRoomName, onChange: (e) => setNewRoomName(e.target.value), className: "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm" }), _jsx(Button, { type: "button", disabled: roomBusy, onClick: () => void createRoom(), className: "w-full h-8 rounded-xl bg-violet-500/20 border border-violet-300/30 text-violet-100 text-xs", children: "Anlegen" })] })) : null] })] }), _jsxs(Card, { className: "lg:col-span-8 rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 min-w-0", children: [_jsxs(CardHeader, { className: "flex flex-row flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 shrink-0", children: [_jsxs(CardTitle, { className: "text-lg flex items-center gap-2 min-w-0", children: [_jsx(Video, { className: "h-5 w-5 text-cyan-300 shrink-0" }), _jsx("span", { className: "truncate", children: activeRoom ? activeRoom.name : "Raum wählen" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 justify-end shrink-0", children: [_jsxs(Button, { type: "button", disabled: !activeRoomId, onClick: startRoomNow, className: "rounded-xl bg-gradient-to-r from-emerald-500/35 to-cyan-500/30 border border-emerald-400/45 text-white hover:from-emerald-500/45 hover:to-cyan-500/40 text-sm font-medium shadow-[0_0_20px_rgba(52,211,153,0.15)]", children: [_jsx(Video, { className: "h-4 w-4 mr-1.5 inline" }), "Video-Raum jetzt"] }), _jsxs(Button, { type: "button", disabled: !activeRoomId, onClick: () => setModalOpen(true), className: "rounded-xl bg-cyan-500/20 border border-cyan-400/35 text-cyan-100 hover:bg-cyan-500/30 text-sm", children: [_jsx(Plus, { className: "h-4 w-4 mr-1.5 inline" }), "Meeting planen"] })] })] }), _jsxs(CardContent, { className: "flex-1 min-h-0 overflow-y-auto pt-4 space-y-3", children: [activeRoomId ? (_jsxs("div", { className: "rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 space-y-3", children: [_jsx("div", { className: "font-medium text-cyan-100", children: "Video-Raum aktivieren" }), _jsxs("p", { className: "text-xs text-white/80", children: ["\u00D6ffne ", _jsx("strong", { children: activeRoom?.name }), " sofort als Videokonferenzraum mit Kamera und Bildschirmfreigabe."] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs(Button, { type: "button", onClick: startRoomNow, className: "rounded-xl bg-cyan-500/25 border border-cyan-400/35 text-cyan-100", children: [_jsx(Video, { className: "h-4 w-4 mr-1.5" }), "Raum jetzt er\u00F6ffnen"] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => void copyQuickLink(), className: "rounded-xl border border-white/20 text-white hover:bg-white/10", children: "Link kopieren" })] }), _jsxs("div", { children: [_jsx("div", { className: "text-[11px] text-white/70 mb-1", children: "Benutzer direkt einladen" }), _jsx("div", { className: "max-h-28 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2 space-y-1", children: members
                                                            .filter((m) => m.id !== currentUserId)
                                                            .map((m) => (_jsxs("label", { className: "flex items-center gap-2 text-xs text-white/90", children: [_jsx("input", { type: "checkbox", checked: Boolean(quickInvite[m.id]), onChange: (e) => setQuickInvite((prev) => ({ ...prev, [m.id]: e.target.checked })) }), m.displayName] }, m.id))) }), _jsx(Button, { type: "button", disabled: quickBusy, onClick: () => void sendQuickInvites(), className: "mt-2 rounded-xl bg-violet-500/20 border border-violet-300/30 text-violet-100 text-xs", children: quickBusy ? "Sende Einladungen..." : "Einladungen an Benutzer senden" }), quickInviteError ? _jsx("p", { className: "mt-1 text-xs text-white/80", children: quickInviteError }) : null] })] })) : null, !activeRoomId ? (_jsx("p", { className: "text-sm text-white/90 text-center py-12", children: "Links einen Meetingraum ausw\u00E4hlen." })) : meetings.length === 0 ? (_jsx("p", { className: "text-sm text-white/80 text-center py-6", children: "Noch keine Meetings, an denen du teilnimmst. Du kannst den Raum sofort er\u00F6ffnen oder ein Meeting planen." })) : (meetings.map((m) => {
                                        const startMs = new Date(m.startsAt).getTime();
                                        const endMs = new Date(m.endsAt).getTime();
                                        const live = startMs <= nowMs && nowMs <= endMs;
                                        return (_jsxs("div", { className: "w-full rounded-2xl border border-white/10 bg-black/25 hover:border-cyan-400/25 hover:bg-white/[0.04] p-4 transition-colors flex flex-col gap-3", children: [_jsxs("div", { role: "button", tabIndex: 0, className: "min-w-0 text-left cursor-pointer rounded-xl -m-1 p-1", onClick: () => {
                                                        if (live) {
                                                            window.open(videoMeetingPath({
                                                                workspaceId,
                                                                meetingId: m.id,
                                                                title: m.title,
                                                            }), "_blank", "noopener,noreferrer");
                                                        }
                                                        else {
                                                            setDetailId(m.id);
                                                        }
                                                    }, onKeyDown: (e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            if (live) {
                                                                window.open(videoMeetingPath({
                                                                    workspaceId,
                                                                    meetingId: m.id,
                                                                    title: m.title,
                                                                }), "_blank", "noopener,noreferrer");
                                                            }
                                                            else {
                                                                setDetailId(m.id);
                                                            }
                                                        }
                                                    }, children: [_jsxs("div", { className: "font-medium text-white flex items-center gap-2 flex-wrap", children: [m.title, live ? (_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 animate-pulse", children: "l\u00E4uft" })) : null, live ? (_jsx("button", { type: "button", className: "text-[10px] font-normal text-cyan-300/90 underline underline-offset-2 hover:text-cyan-100", onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        setDetailId(m.id);
                                                                    }, children: "Infos" })) : null] }), _jsxs("div", { className: "text-xs text-cyan-200/70 mt-1 flex items-center gap-1", children: [_jsx(CalendarDays, { className: "h-3.5 w-3.5" }), formatRange(m.startsAt, m.endsAt)] }), _jsxs("div", { className: "text-[11px] text-white/90 mt-1 flex items-center gap-1", children: [_jsx(Users, { className: "h-3 w-3" }), m.participantUserIds.length + 1, " Teilnehmer (inkl. Organisator)"] }), _jsx("p", { className: "text-[10px] text-white/50 mt-1.5", children: live
                                                                ? "Klick auf diesen Bereich: Video · „Infos“: Teilnehmerliste"
                                                                : "Tippen für Details zum Termin" })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10", children: [_jsxs("button", { type: "button", className: `inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-md ${live
                                                                ? "bg-gradient-to-r from-emerald-500/50 to-cyan-600/45 border border-emerald-400/60 text-white animate-pulse"
                                                                : "bg-violet-500/30 border border-violet-400/50 text-violet-50 hover:bg-violet-500/40"}`, onClick: () => window.open(videoMeetingPath({
                                                                workspaceId,
                                                                meetingId: m.id,
                                                                title: m.title,
                                                            }), "_blank", "noopener,noreferrer"), children: [_jsx(Video, { className: "h-4 w-4 shrink-0", "aria-hidden": true }), "Beitreten"] }), m.createdByUserId === currentUserId ? (_jsx(Button, { type: "button", variant: "ghost", onClick: () => {
                                                                if (confirm("Meeting löschen? Kalendereintrag wird entfernt.")) {
                                                                    void onDeleteMeeting(m.id).then(() => {
                                                                        onRefreshMeetings();
                                                                        setDetailId(null);
                                                                    });
                                                                }
                                                            }, className: "rounded-xl h-11 w-11 p-0 text-red-300/90 hover:bg-red-500/15 hover:text-red-100 border border-red-400/30", "aria-label": "Meeting l\u00F6schen (nur Organisator)", title: "Meeting l\u00F6schen \u2014 nur du als Organisator", children: _jsx(Trash2, { className: "h-5 w-5" }) })) : null] })] }, m.id));
                                    }))] })] })] }), detail
                ? createPortal(_jsxs("div", { className: "fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 bg-black/50", role: "dialog", "aria-modal": "true", "aria-labelledby": "meeting-detail-title", children: [_jsx("button", { type: "button", className: "absolute inset-0 z-0 cursor-default", "aria-label": "Dialog schliessen (Hintergrund)", onClick: () => setDetailId(null) }), _jsxs("div", { className: "relative z-10 flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0c1428] shadow-xl", children: [_jsxs("div", { className: "min-h-0 flex-1 overflow-y-auto p-5 space-y-3", children: [_jsx("h3", { id: "meeting-detail-title", className: "text-lg font-semibold text-white pr-2", children: detail.title }), _jsx("p", { className: "text-xs text-cyan-200/80", children: formatRange(detail.startsAt, detail.endsAt) }), _jsxs("p", { className: "text-[10px] text-white/55 leading-snug", children: ["Video l\u00E4uft in einem ", _jsx("strong", { className: "text-cyan-100/90", children: "neuen Tab" }), " (Hauptseite bleibt offen). Mikrofon/Kamera freigeben; Bildschirmfreigabe in der Jitsi-Leiste."] }), detail.description ? (_jsx("p", { className: "text-sm text-white/90 leading-relaxed border-t border-white/10 pt-3", children: detail.description })) : null, _jsxs("div", { className: "text-xs text-white/90 border-t border-white/10 pt-3", children: [_jsx("div", { className: "font-medium text-white mb-1", children: "Teilnehmer" }), _jsxs("ul", { className: "space-y-1", children: [_jsxs("li", { children: ["\u2022 ", namesById[detail.createdByUserId] ?? "Organisator", " (Organisator)"] }), detail.participantUserIds.map((id) => (_jsxs("li", { children: ["\u2022 ", namesById[id] ?? id] }, id)))] })] }), _jsxs("p", { className: "text-[10px] text-white/45 pb-1", children: ["In Jitsi als ", _jsx("span", { className: "text-cyan-200/90", children: currentUserDisplayName }), "."] })] }), _jsxs("div", { className: "shrink-0 border-t border-white/15 bg-[#0c1428] p-4 space-y-2", children: [_jsxs("button", { type: "button", className: "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/45 to-cyan-600/40 border border-emerald-400/55 text-white font-semibold py-4 text-base hover:from-emerald-500/55 hover:to-cyan-600/50 shadow-[0_0_28px_rgba(34,211,238,0.22)]", onClick: () => {
                                                window.open(videoMeetingPath({
                                                    workspaceId,
                                                    meetingId: detail.id,
                                                    title: detail.title,
                                                }), "_blank", "noopener,noreferrer");
                                                setDetailId(null);
                                            }, children: [_jsx(Video, { className: "h-5 w-5 shrink-0", "aria-hidden": true }), "Jetzt beitreten"] }), _jsx(Button, { type: "button", variant: "ghost", className: "w-full rounded-xl text-white/80 hover:bg-white/5", onClick: () => setDetailId(null), children: "Schliessen" })] })] })] }), document.body)
                : null, _jsx(CreateMeetingModal, { open: modalOpen, onClose: () => setModalOpen(false), rooms: rooms, members: members, currentUserId: currentUserId, activeSection: activeSection, onSubmit: async (payload) => {
                    await onCreateMeeting(payload);
                    onRefreshMeetings();
                } })] }));
}
