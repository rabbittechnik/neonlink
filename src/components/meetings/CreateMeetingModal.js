import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { CalendarDays, Clock, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
function toDatetimeLocal(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromDatetimeLocal(s) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
export function CreateMeetingModal({ open, onClose, rooms, members, currentUserId, activeSection, onSubmit, }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [roomId, setRoomId] = useState("");
    const [start, setStart] = useState(() => toDatetimeLocal(new Date().toISOString()));
    const [end, setEnd] = useState(() => {
        const t = new Date();
        t.setHours(t.getHours() + 1);
        return toDatetimeLocal(t.toISOString());
    });
    const [pick, setPick] = useState({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);
    const others = useMemo(() => members.filter((m) => m.id !== currentUserId), [members, currentUserId]);
    React.useEffect(() => {
        if (!open)
            return;
        setError(null);
        if (rooms.length && !roomId)
            setRoomId(rooms[0].id);
    }, [open, rooms, roomId]);
    if (!open)
        return null;
    const handleClose = () => {
        if (busy)
            return;
        onClose();
    };
    const submit = async () => {
        if (!title.trim()) {
            setError("Bitte einen Titel eingeben.");
            return;
        }
        if (!roomId) {
            setError("Bitte einen Raum wählen.");
            return;
        }
        const participantUserIds = Object.entries(pick)
            .filter(([, v]) => v)
            .map(([id]) => id);
        setBusy(true);
        setError(null);
        try {
            await onSubmit({
                meetingRoomId: roomId,
                title: title.trim(),
                description: description.trim(),
                participantUserIds,
                startsAt: fromDatetimeLocal(start),
                endsAt: fromDatetimeLocal(end),
                sectionId: activeSection,
            });
            setTitle("");
            setDescription("");
            setPick({});
            onClose();
        }
        catch (e) {
            const code = e instanceof Error ? e.message : "";
            const friendly = {
                room_already_booked: "Dieser Meetingraum ist zu dieser Zeit schon belegt — bitte anderen Zeitraum oder Raum wählen.",
                invalid_time_range: "Ende muss nach dem Start liegen.",
                title_required: "Bitte einen Titel eingeben.",
                create_failed: "Meeting konnte nicht erstellt werden.",
            };
            setError(friendly[code] ?? (e instanceof Error ? e.message : "Speichern fehlgeschlagen."));
        }
        finally {
            setBusy(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm", role: "dialog", "aria-modal": "true", "aria-labelledby": "create-meeting-title", children: _jsxs("div", { className: "w-full max-w-lg rounded-3xl border border-white/15 bg-[#0a1020] shadow-2xl shadow-cyan-500/10 overflow-hidden max-h-[min(90vh,640px)] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 shrink-0", children: [_jsxs("h2", { id: "create-meeting-title", className: "text-lg font-semibold text-white flex items-center gap-2", children: [_jsx(CalendarDays, { className: "h-5 w-5 text-cyan-300" }), "Meeting planen"] }), _jsx("button", { type: "button", onClick: handleClose, disabled: busy, className: "p-2 rounded-xl text-white hover:text-white hover:bg-white/10 disabled:opacity-40", "aria-label": "Schliessen", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "px-5 py-4 space-y-4 overflow-y-auto flex-1 min-h-0", children: [_jsx("p", { className: "text-xs text-white/90 leading-relaxed", children: "Nur ausgew\u00E4hlte Teilnehmer sehen das Meeting und erhalten den Kalendereintrag \u2014 keine Gruppe automatisch." }), _jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-semibold uppercase tracking-wider text-white/90", children: "Titel" }), _jsx(Input, { value: title, onChange: (e) => setTitle(e.target.value), placeholder: "z. B. Familien-Check-in", className: "mt-1 bg-white/5 border-white/10 rounded-xl text-white placeholder:text-white/55" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-[11px] font-semibold uppercase tracking-wider text-white/90", children: "Beschreibung" }), _jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), rows: 3, placeholder: "Optional", className: "mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/55 resize-none" })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-[11px] font-semibold uppercase tracking-wider text-white/90 flex items-center gap-1", children: [_jsx(Users, { className: "h-3 w-3" }), " Raum"] }), _jsx("select", { value: roomId, onChange: (e) => setRoomId(e.target.value), className: "mt-1 w-full rounded-xl bg-[#121c31] border border-white/15 px-3 py-2.5 text-sm text-white [color-scheme:dark]", children: rooms.map((r) => (_jsx("option", { value: r.id, className: "bg-[#121c31]", children: r.name }, r.id))) })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsxs("label", { className: "text-[11px] font-semibold uppercase tracking-wider text-white/90 flex items-center gap-1", children: [_jsx(Clock, { className: "h-3 w-3" }), " Start"] }), _jsx(Input, { type: "datetime-local", value: start, onChange: (e) => setStart(e.target.value), className: "mt-1 bg-white/5 border-white/10 rounded-xl text-white" })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-[11px] font-semibold uppercase tracking-wider text-white/90 flex items-center gap-1", children: [_jsx(Clock, { className: "h-3 w-3" }), " Ende"] }), _jsx(Input, { type: "datetime-local", value: end, onChange: (e) => setEnd(e.target.value), className: "mt-1 bg-white/5 border-white/10 rounded-xl text-white" })] })] }), _jsxs("div", { children: [_jsxs("div", { className: "text-[11px] font-semibold uppercase tracking-wider text-white/90 flex items-center gap-1 mb-2", children: [_jsx(Users, { className: "h-3 w-3" }), " Teilnehmer (Workspace)"] }), _jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 max-h-36 overflow-y-auto divide-y divide-white/5", children: others.length === 0 ? (_jsx("div", { className: "p-3 text-xs text-white/90", children: "Keine weiteren Mitglieder im Workspace." })) : (others.map((m) => (_jsxs("label", { className: "flex items-center gap-3 px-3 py-2 hover:bg-white/5 cursor-pointer text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(pick[m.id]), onChange: (e) => setPick((p) => ({ ...p, [m.id]: e.target.checked })), className: "rounded border-white/30" }), _jsx("span", { className: "truncate", children: m.displayName })] }, m.id)))) }), _jsx("p", { className: "text-[10px] text-white/85 mt-1.5", children: "Du bist als Organisator automatisch dabei." })] }), error ? _jsx("p", { className: "text-sm text-red-300", children: error }) : null] }), _jsxs("div", { className: "px-5 py-4 border-t border-white/10 flex gap-2 justify-end shrink-0", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: handleClose, disabled: busy, className: "rounded-xl text-white hover:bg-white/10", children: "Abbrechen" }), _jsx(Button, { type: "button", onClick: () => void submit(), disabled: busy, className: "rounded-xl bg-cyan-500/25 border border-cyan-400/35 text-cyan-100 hover:bg-cyan-500/35", children: busy ? "Speichern…" : "Meeting erstellen" })] })] }) }));
}
