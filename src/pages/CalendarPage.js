import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, CalendarDays, ChevronLeft, ChevronRight, Flame, FolderKanban, GraduationCap, HeartHandshake, Home, Loader2, Palmtree, Plus, Trash2, Users, Video, } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CALENDAR_SECTION_IDS, CALENDAR_SECTION_META } from "@/constants/calendarSections";
import { FAMILY_CALENDAR_SELF_SLOT_ID, } from "@/types/calendar";
const SECTION_ICONS = {
    familie: Home,
    freunde: Users,
    verwandte: HeartHandshake,
    feuerwehr: Flame,
    arbeit: Briefcase,
    ideen: FolderKanban,
};
const COL_GEMEINSAM = "__gemeinsam__";
const COL_GETEILT = "__geteilt__";
/** Dunkles Select: color-scheme dark + Hintergrund, damit Optionen unter Windows/Chrome lesbar bleiben. */
const SELECT_DARK = "rounded-xl border border-white/20 bg-[#121c31] px-3 py-2 text-sm text-white shadow-inner [color-scheme:dark]";
const OPTION_DARK = "bg-[#121c31] text-white";
function monthRangeIso(year, monthIndex) {
    const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
}
function daysInMonth(year, monthIndex) {
    const n = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: n }, (_, i) => new Date(year, monthIndex, i + 1));
}
function dayBoundsMs(d) {
    const a = new Date(d);
    a.setHours(0, 0, 0, 0);
    const b = new Date(d);
    b.setHours(23, 59, 59, 999);
    return { start: a.getTime(), end: b.getTime() };
}
function eventTouchesDay(ev, d) {
    const { start, end } = dayBoundsMs(d);
    const es = new Date(ev.startsAt).getTime();
    const ee = ev.endsAt ? new Date(ev.endsAt).getTime() : es;
    return es <= end && ee >= start;
}
function assignColumn(ev, viewerId, mySlots, myDisplayName) {
    if (ev.createdByUserId !== viewerId) {
        if (ev.familySlotId === null)
            return COL_GEMEINSAM;
        if (ev.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) {
            const theirs = (ev.familySlotLabel ?? "").toLowerCase().trim();
            const mine = myDisplayName.toLowerCase().trim();
            if (theirs && mine && theirs === mine)
                return FAMILY_CALENDAR_SELF_SLOT_ID;
            return COL_GETEILT;
        }
        const label = (ev.familySlotLabel ?? "").toLowerCase().trim();
        if (label) {
            const match = mySlots.find((s) => s.label.toLowerCase().trim() === label);
            if (match)
                return match.id;
        }
        return COL_GETEILT;
    }
    if (!ev.familySlotId)
        return COL_GEMEINSAM;
    if (ev.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID)
        return FAMILY_CALENDAR_SELF_SLOT_ID;
    if (mySlots.some((s) => s.id === ev.familySlotId))
        return ev.familySlotId;
    return COL_GETEILT;
}
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
function dateKeyLocal(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** Erster/letzter Tag-Index im Monatsraster, den das Event berührt (für durchgehenden Urlaubs-Balken). */
function eventDayIndexSpan(ev, days) {
    let start = -1;
    let end = -1;
    days.forEach((d, i) => {
        if (eventTouchesDay(ev, d)) {
            if (start < 0)
                start = i;
            end = i;
        }
    });
    if (start < 0)
        return null;
    return { start, end };
}
const FAMILY_GRID_ROW_H = "3.5rem";
function isCalendarRangeKind(k) {
    return k === "vacation" || k === "ferien";
}
/** Anzeigename der Familien-Spalte (für „Wer hat Urlaub/Ferien?“). */
function familySlotOwnerLabel(ev, selfColumnFallback) {
    if (!ev.familySlotId)
        return "Gemeinsam";
    if (ev.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID)
        return ev.familySlotLabel ?? selfColumnFallback;
    return ev.familySlotLabel ?? "Person";
}
function showRangeOwnerInList(ev) {
    return isCalendarRangeKind(ev.kind);
}
export default function CalendarPage() {
    const { user, authFetch, logout } = useAuth();
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState([]);
    const [workspaceId, setWorkspaceId] = useState(null);
    const [cursor, setCursor] = useState(() => {
        const n = new Date();
        return { y: n.getFullYear(), m: n.getMonth() };
    });
    const [events, setEvents] = useState([]);
    const [slots, setSlots] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [view, setView] = useState("liste");
    const [slotsEditorOpen, setSlotsEditorOpen] = useState(false);
    const [slotDraft, setSlotDraft] = useState([]);
    const [savingSlots, setSavingSlots] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [savingEvent, setSavingEvent] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formKind, setFormKind] = useState("appointment");
    const [formSection, setFormSection] = useState("familie");
    const [formTitle, setFormTitle] = useState("");
    const [formStart, setFormStart] = useState("");
    const [formEnd, setFormEnd] = useState("");
    const [formAllDay, setFormAllDay] = useState(false);
    const [formLocation, setFormLocation] = useState("");
    const [formSlotId, setFormSlotId] = useState("");
    const [formVis, setFormVis] = useState({});
    const [modalError, setModalError] = useState(null);
    /** Alte Slot-ID, die nach Personen-Änderung noch nicht in slots[] vorkommt (verhindert Zurückspringen auf Gemeinsam). */
    const [formLegacySlot, setFormLegacySlot] = useState(null);
    const fetchJson = useCallback(async (path) => {
        const res = await authFetch(path);
        if (res.status === 401) {
            await logout();
            navigate("/login", { replace: true });
            throw new Error("unauthorized");
        }
        if (!res.ok)
            throw new Error(String(res.status));
        return res.json();
    }, [authFetch, logout, navigate]);
    const mine = user?.id ?? "";
    useEffect(() => {
        let c = false;
        void (async () => {
            try {
                const list = await fetchJson("/workspaces");
                if (c)
                    return;
                setWorkspaces(list);
                const own = list.find((w) => w.ownerUserId === user?.id);
                setWorkspaceId(own?.id ?? list[0]?.id ?? null);
            }
            catch {
                setWorkspaceId(null);
            }
            finally {
                if (!c)
                    setLoading(false);
            }
        })();
        return () => {
            c = true;
        };
    }, [fetchJson, user?.id]);
    useEffect(() => {
        if (!workspaceId)
            return;
        let c = false;
        void (async () => {
            try {
                const m = await fetchJson(`/workspaces/${workspaceId}/members`);
                if (c)
                    return;
                setMembers(m
                    .filter((x) => x.user)
                    .map((x) => ({ userId: x.user.id, displayName: x.user.displayName })));
            }
            catch {
                setMembers([]);
            }
        })();
        return () => {
            c = true;
        };
    }, [workspaceId, fetchJson]);
    const reloadSlots = useCallback(async () => {
        if (!workspaceId)
            return;
        try {
            const s = await fetchJson(`/workspaces/${workspaceId}/calendar/family-slots`);
            setSlots(s);
        }
        catch {
            setSlots([]);
        }
    }, [workspaceId, fetchJson]);
    const reloadEvents = useCallback(async () => {
        if (!workspaces.length) {
            setEvents([]);
            return;
        }
        setListError(null);
        const { from, to } = monthRangeIso(cursor.y, cursor.m);
        try {
            const results = await Promise.all(workspaces.map((w) => fetchJson(`/workspaces/${w.id}/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)));
            const merged = [];
            const seen = new Set();
            workspaces.forEach((w, i) => {
                for (const e of results[i] ?? []) {
                    if (seen.has(e.id))
                        continue;
                    seen.add(e.id);
                    merged.push({ ...e, workspaceName: w.name });
                }
            });
            setEvents(merged);
        }
        catch {
            setListError("Kalender konnte nicht geladen werden.");
        }
    }, [workspaces, cursor.y, cursor.m, fetchJson]);
    useEffect(() => {
        void reloadSlots();
    }, [reloadSlots]);
    useEffect(() => {
        void reloadEvents();
    }, [reloadEvents]);
    const days = useMemo(() => daysInMonth(cursor.y, cursor.m), [cursor.y, cursor.m]);
    const eventsByDay = useMemo(() => {
        const map = new Map();
        for (const d of days) {
            const key = dateKeyLocal(d);
            map.set(key, events.filter((e) => eventTouchesDay(e, d)));
        }
        return map;
    }, [days, events]);
    const myColumnLabel = user?.displayName ?? "Mein Name";
    const columns = useMemo(() => {
        const base = [
            { id: COL_GEMEINSAM, label: "Gemeinsam" },
            { id: FAMILY_CALENDAR_SELF_SLOT_ID, label: myColumnLabel },
        ];
        slots.forEach((s) => base.push({ id: s.id, label: s.label }));
        base.push({ id: COL_GETEILT, label: "Geteilt / andere" });
        return base;
    }, [slots, myColumnLabel]);
    const openNewModal = () => {
        setEditId(null);
        setModalError(null);
        setFormKind("appointment");
        setFormSection("familie");
        setFormTitle("");
        const now = new Date();
        setFormStart(toDatetimeLocal(now.toISOString()));
        setFormEnd("");
        setFormAllDay(false);
        setFormLocation("");
        setFormSlotId("");
        setFormVis({});
        setFormLegacySlot(null);
        setModalOpen(true);
    };
    const openEdit = (ev) => {
        if (ev.createdByUserId !== mine)
            return;
        if (ev.kind === "meeting")
            return;
        setEditId(ev.id);
        setModalError(null);
        setFormKind(ev.kind);
        setFormSection(ev.sectionId);
        setFormTitle(ev.kind === "appointment" ? ev.title : "");
        setFormStart(toDatetimeLocal(ev.startsAt));
        setFormEnd(ev.endsAt ? toDatetimeLocal(ev.endsAt) : "");
        setFormAllDay(ev.allDay);
        setFormLocation(ev.location);
        const sid = ev.familySlotId ?? "";
        const slotKnown = sid === "" ||
            sid === FAMILY_CALENDAR_SELF_SLOT_ID ||
            slots.some((s) => s.id === sid);
        setFormLegacySlot(sid && !slotKnown ? { id: sid, label: (ev.familySlotLabel ?? "").trim() || sid } : null);
        setFormSlotId(sid);
        const v = {};
        ev.visibilityUserIds.forEach((id) => {
            v[id] = true;
        });
        setFormVis(v);
        setModalOpen(true);
    };
    const submitSlots = async () => {
        if (!workspaceId)
            return;
        setSavingSlots(true);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/calendar/family-slots`, {
                method: "PUT",
                body: JSON.stringify({
                    slots: slotDraft
                        .filter((r) => r.label.trim())
                        .slice(0, 6)
                        .map((r) => ({ label: r.label.trim() })),
                }),
            });
            if (!res.ok)
                return;
            setSlotsEditorOpen(false);
            await reloadSlots();
        }
        finally {
            setSavingSlots(false);
        }
    };
    const submitEvent = async () => {
        if (!workspaceId)
            return;
        setSavingEvent(true);
        setModalError(null);
        try {
            let startsAt = fromDatetimeLocal(formStart);
            let endsAt = formEnd ? fromDatetimeLocal(formEnd) : null;
            if (formAllDay) {
                const d0 = formStart.slice(0, 10);
                const d1 = (formEnd || formStart).slice(0, 10);
                startsAt = new Date(d0 + "T00:00:00").toISOString();
                endsAt = new Date(d1 + "T23:59:59.999").toISOString();
            }
            const vis = Object.entries(formVis)
                .filter(([, on]) => on)
                .map(([id]) => id);
            const familySlotId = formSlotId || null;
            const body = {
                sectionId: formSection,
                kind: formKind,
                title: formKind === "appointment" ? formTitle.trim() : "",
                startsAt,
                endsAt,
                allDay: formAllDay,
                location: formLocation.trim(),
                visibilityUserIds: vis,
                familySlotId: familySlotId || null,
            };
            const res = editId
                ? await authFetch(`/calendar/events/${editId}`, {
                    method: "PATCH",
                    body: JSON.stringify(body),
                })
                : await authFetch(`/workspaces/${workspaceId}/calendar/events`, {
                    method: "POST",
                    body: JSON.stringify(body),
                });
            if (res.status === 401) {
                await logout();
                navigate("/login", { replace: true });
                return;
            }
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setModalError(e.error ?? "Speichern fehlgeschlagen.");
                return;
            }
            setModalOpen(false);
            await reloadEvents();
        }
        finally {
            setSavingEvent(false);
        }
    };
    const deleteEvent = async (id) => {
        if (!confirm("Termin wirklich löschen?"))
            return;
        try {
            const res = await authFetch(`/calendar/events/${id}`, { method: "DELETE" });
            if (res.ok)
                await reloadEvents();
        }
        catch {
            /* ignore */
        }
    };
    const openFamilySlotsEditor = useCallback(() => {
        setSlotDraft(slots.length ? slots.map((s) => ({ label: s.label })) : []);
        setSlotsEditorOpen(true);
    }, [slots]);
    const deleteEditingEvent = async () => {
        if (!editId)
            return;
        if (!confirm("Termin wirklich löschen?"))
            return;
        setSavingEvent(true);
        try {
            const res = await authFetch(`/calendar/events/${editId}`, { method: "DELETE" });
            if (res.ok) {
                setModalOpen(false);
                setEditId(null);
                await reloadEvents();
            }
        }
        catch {
            /* ignore */
        }
        finally {
            setSavingEvent(false);
        }
    };
    const monthTitle = new Date(cursor.y, cursor.m, 1).toLocaleDateString("de-DE", {
        month: "long",
        year: "numeric",
    });
    return (_jsxs("div", { className: "min-h-screen w-full bg-[#050816] text-white overflow-x-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.12),transparent_30%)]" }), _jsxs("div", { className: "relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-6", children: [_jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Zur\u00FCck zur App"] }), _jsxs("div", { className: "flex items-center gap-2 text-sky-200", children: [_jsx(CalendarDays, { className: "h-6 w-6" }), _jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Kalender" })] })] }), _jsxs("p", { className: "text-sm text-white/60 max-w-3xl mb-6", children: ["Hier siehst du ", _jsx("strong", { children: "alle Termine" }), ", die f\u00FCr dich in ", _jsx("strong", { children: "allen Workspaces" }), " sichtbar sind (z.\u00A0B. Feuerwehr-\u00DCbung im Familien-Kalender mit Rubrik-Farbe). Neu anlegen tust du im gew\u00E4hlten Workspace unten. Pro Termin w\u00E4hlst du die ", _jsx("strong", { children: "Rubrik" }), " (Farbe & Symbol) und optional, bei wem der Eintrag", " ", _jsx("strong", { children: "mit angezeigt" }), " wird. Im Familienkalender gibt es fest ", _jsx("strong", { children: "Gemeinsam" }), " und deine Spalte mit ", _jsx("strong", { children: "Profilnamen" }), "; zus\u00E4tzlich bis zu ", _jsx("strong", { children: "6 weitere Personen" }), ".", " ", _jsx("strong", { children: "Urlaub" }), "/", _jsx("strong", { children: "Ferien" }), " als durchgehender Balken; in der ", _jsx("strong", { children: "Monatsliste" }), " ", "bei Urlaub/Ferien ", _jsx("strong", { children: "Wer:" }), " (Spalte oder Gemeinsam)."] }), loading ? (_jsx(Loader2, { className: "h-8 w-8 animate-spin text-cyan-400" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-wrap gap-3 mb-6 items-end", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-white/50 mb-1", children: "Workspace" }), _jsx("select", { className: SELECT_DARK, value: workspaceId ?? "", onChange: (e) => setWorkspaceId(e.target.value || null), children: workspaces.map((w) => (_jsx("option", { value: w.id, className: OPTION_DARK, children: w.name }, w.id))) })] }), _jsxs("div", { className: "flex rounded-xl border border-white/15 p-1 bg-black/20", children: [_jsx("button", { type: "button", onClick: () => setView("liste"), className: `px-4 py-2 rounded-lg text-sm ${view === "liste" ? "bg-sky-500/25 text-sky-100" : "text-white/55"}`, children: "Monatsliste" }), _jsx("button", { type: "button", onClick: () => setView("familie"), className: `px-4 py-2 rounded-lg text-sm ${view === "familie" ? "bg-fuchsia-500/25 text-fuchsia-100" : "text-white/55"}`, children: "Familien-Spalten" })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-xl border border-white/15 px-2 py-1 bg-black/20", children: [_jsx("button", { type: "button", "aria-label": "Vorheriger Monat", className: "p-2 rounded-lg hover:bg-white/10", onClick: () => setCursor((c) => (c.m <= 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 })), children: _jsx(ChevronLeft, { className: "h-5 w-5" }) }), _jsx("span", { className: "text-sm font-medium min-w-[10rem] text-center capitalize", children: monthTitle }), _jsx("button", { type: "button", "aria-label": "N\u00E4chster Monat", className: "p-2 rounded-lg hover:bg-white/10", onClick: () => setCursor((c) => (c.m >= 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 })), children: _jsx(ChevronRight, { className: "h-5 w-5" }) })] }), _jsxs(Button, { type: "button", onClick: openNewModal, className: "rounded-xl bg-gradient-to-r from-sky-500/30 to-violet-500/25 border border-sky-400/30 ml-auto", children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Termin \u00B7 Urlaub \u00B7 Ferien"] }), _jsxs(Button, { type: "button", variant: "ghost", className: "rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100", onClick: () => openFamilySlotsEditor(), children: [_jsx(Users, { className: "h-4 w-4 mr-2" }), "Personen-Spalten", _jsx("span", { className: "ml-1.5 text-xs text-fuchsia-200/80", children: "(max. 6)" })] })] }), listError ? _jsx("p", { className: "text-sm text-red-300 mb-4", children: listError }) : null, view === "liste" ? (_jsxs("div", { className: "space-y-4", children: [days.map((d) => {
                                        const key = dateKeyLocal(d);
                                        const dayEvents = eventsByDay.get(key) ?? [];
                                        if (dayEvents.length === 0)
                                            return null;
                                        return (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-4", children: [_jsx("div", { className: "text-sm text-white/50 mb-2", children: d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) }), _jsx("div", { className: "space-y-2", children: dayEvents.map((ev) => {
                                                        const meta = CALENDAR_SECTION_META[ev.sectionId] ?? CALENDAR_SECTION_META.familie;
                                                        const Icon = SECTION_ICONS[ev.sectionId] ?? Home;
                                                        const canOpenEditor = ev.createdByUserId === mine && ev.kind !== "meeting";
                                                        return (_jsxs(motion.button, { type: "button", initial: { opacity: 0, x: -6 }, animate: { opacity: 1, x: 0 }, onClick: () => canOpenEditor && openEdit(ev), className: `w-full text-left rounded-xl border px-3 py-2 flex items-start gap-3 ${meta.border} bg-black/20 ${canOpenEditor ? "hover:bg-white/5 cursor-pointer" : "cursor-default opacity-95"}`, children: [_jsx("div", { className: `mt-0.5 p-1.5 rounded-lg ${meta.chip}`, children: _jsx(Icon, { className: "h-4 w-4" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "font-medium flex items-center gap-2 flex-wrap", children: [ev.kind === "vacation" ? (_jsx(Palmtree, { className: "h-4 w-4 text-amber-300 shrink-0" })) : ev.kind === "ferien" ? (_jsx(GraduationCap, { className: "h-4 w-4 text-violet-300 shrink-0" })) : ev.kind === "meeting" ? (_jsx(Video, { className: "h-4 w-4 text-cyan-300 shrink-0" })) : null, ev.title, ev.kind === "meeting" ? (_jsx("span", { className: "text-[10px] font-normal text-cyan-200/70 px-1.5 py-0.5 rounded border border-cyan-400/30", children: "Meeting" })) : null] }), _jsxs("div", { className: "text-xs text-white/50 mt-0.5", children: [showRangeOwnerInList(ev) ? (_jsxs("span", { className: "text-sky-300/90 font-medium", children: ["Wer: ", familySlotOwnerLabel(ev, myColumnLabel)] })) : null, showRangeOwnerInList(ev) ? " · " : null, ev.allDay
                                                                                    ? "Ganztägig"
                                                                                    : new Date(ev.startsAt).toLocaleTimeString("de-DE", {
                                                                                        hour: "2-digit",
                                                                                        minute: "2-digit",
                                                                                    }), ev.location ? ` · ${ev.location}` : "", ev.workspaceId !== workspaceId && ev.workspaceName
                                                                                    ? ` · ${ev.workspaceName}`
                                                                                    : "", ev.createdByUserId !== mine
                                                                                    ? ` · von ${members.find((m) => m.userId === ev.createdByUserId)?.displayName ?? "Mitglied"}`
                                                                                    : ""] })] }), ev.createdByUserId === mine ? (_jsx("button", { type: "button", className: "p-1.5 rounded-lg hover:bg-red-500/20 text-red-300 shrink-0", "aria-label": "L\u00F6schen", onClick: (e) => {
                                                                        e.stopPropagation();
                                                                        void deleteEvent(ev.id);
                                                                    }, children: _jsx(Trash2, { className: "h-4 w-4" }) })) : null] }, ev.id));
                                                    }) })] }, key));
                                    }), events.length === 0 ? (_jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50", children: "Keine Termine in diesem Monat." })) : null] })) : (_jsx("div", { className: "overflow-x-auto rounded-2xl border border-white/10 bg-white/5 text-sm", children: _jsxs("div", { className: "flex min-w-[720px] w-full", children: [_jsxs("div", { className: "sticky left-0 z-30 flex flex-col w-36 shrink-0 border-r border-white/10 bg-[#0a1020]/98", children: [_jsx("div", { className: "h-10 flex items-center px-2 border-b border-white/10 text-white/60 text-xs font-medium", children: "Tag" }), days.map((d) => (_jsx("div", { className: "h-[3.5rem] shrink-0 flex items-center px-2 border-b border-white/5 text-white/70 text-xs whitespace-nowrap", children: d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" }) }, dateKeyLocal(d))))] }), columns.map((col) => {
                                            const rangeBarsSource = events.filter((ev) => isCalendarRangeKind(ev.kind) &&
                                                assignColumn(ev, mine, slots, myColumnLabel) === col.id);
                                            const vacationBars = rangeBarsSource
                                                .map((ev) => {
                                                const span = eventDayIndexSpan(ev, days);
                                                return span ? { ev, span } : null;
                                            })
                                                .filter(Boolean);
                                            return (_jsxs("div", { className: "flex-1 min-w-[7rem] shrink-0 border-l border-white/10 flex flex-col", children: [_jsx("div", { className: "h-10 flex items-center justify-center px-1 border-b border-white/10 text-white/80 text-xs font-medium text-center", children: col.label }), _jsxs("div", { className: "relative flex flex-col", children: [vacationBars.map(({ ev, span }) => {
                                                                const canEdit = ev.createdByUserId === mine;
                                                                const rows = span.end - span.start + 1;
                                                                const ferien = ev.kind === "ferien";
                                                                return (_jsx("button", { type: "button", onClick: () => canEdit && openEdit(ev), className: `absolute left-0.5 right-0.5 rounded-md z-0 text-left px-1 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${ferien
                                                                        ? "border border-violet-400/50 bg-violet-600/50"
                                                                        : "border border-amber-400/50 bg-amber-600/50"} ${canEdit
                                                                        ? ferien
                                                                            ? "cursor-pointer hover:bg-violet-600/65"
                                                                            : "cursor-pointer hover:bg-amber-600/65"
                                                                        : "cursor-default opacity-95"}`, style: {
                                                                        top: `calc(${span.start} * ${FAMILY_GRID_ROW_H})`,
                                                                        height: `calc(${rows} * ${FAMILY_GRID_ROW_H})`,
                                                                    }, children: _jsxs("span", { className: `flex items-start gap-0.5 text-[10px] font-medium leading-tight line-clamp-3 ${ferien ? "text-violet-50" : "text-amber-50"}`, children: [ferien ? (_jsx(GraduationCap, { className: "h-3 w-3 shrink-0 mt-0.5 opacity-95" })) : (_jsx(Palmtree, { className: "h-3 w-3 shrink-0 mt-0.5 opacity-95" })), ev.title] }) }, ev.id));
                                                            }), days.map((d) => {
                                                                const key = dateKeyLocal(d);
                                                                const cell = events.filter((ev) => !isCalendarRangeKind(ev.kind) &&
                                                                    eventTouchesDay(ev, d) &&
                                                                    assignColumn(ev, mine, slots, myColumnLabel) === col.id);
                                                                return (_jsx("div", { className: "h-[3.5rem] shrink-0 border-b border-white/5 relative pointer-events-none", children: _jsx("div", { className: "absolute inset-0 p-1 flex flex-col gap-1 z-20 pointer-events-auto", children: cell.map((ev) => {
                                                                            const meta = CALENDAR_SECTION_META[ev.sectionId] ?? CALENDAR_SECTION_META.familie;
                                                                            const Icon = SECTION_ICONS[ev.sectionId] ?? Home;
                                                                            const canEdit = ev.createdByUserId === mine && ev.kind !== "meeting";
                                                                            return (_jsxs("div", { className: "relative group flex gap-0.5 items-start min-w-0", children: [_jsxs("button", { type: "button", onClick: () => canEdit && openEdit(ev), className: `text-left flex-1 min-w-0 rounded-lg px-1.5 py-0.5 text-[11px] leading-tight border ${meta.border} ${meta.chip} line-clamp-2 ${canEdit ? "" : "opacity-90"}`, children: [ev.kind === "meeting" ? (_jsx(Video, { className: "inline h-3 w-3 mr-0.5 align-middle text-cyan-300 opacity-90" })) : (_jsx(Icon, { className: "inline h-3 w-3 mr-0.5 align-middle opacity-80" })), ev.title] }), ev.createdByUserId === mine ? (_jsx("button", { type: "button", className: "shrink-0 p-0.5 rounded hover:bg-red-500/25 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity", "aria-label": "L\u00F6schen", onClick: (e) => {
                                                                                            e.stopPropagation();
                                                                                            void deleteEvent(ev.id);
                                                                                        }, children: _jsx(Trash2, { className: "h-3 w-3" }) })) : null] }, ev.id));
                                                                        }) }) }, key));
                                                            })] })] }, col.id));
                                        })] }) }))] }))] }), slotsEditorOpen ? (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm", children: _jsxs(Card, { className: "w-full max-w-md border border-fuchsia-400/25 bg-[#0a1020] text-white max-h-[90vh] overflow-y-auto", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Familien-Spalten (max. 6)" }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("p", { className: "text-xs text-white/55", children: ["\u201EGemeinsam\u201C und dein Profilname sind immer als Spalten dabei und hier nicht \u00E4nderbar. Darunter bis zu 6 weitere Namen \u2014 mit ", _jsx("strong", { children: "+ Person" }), " hinzuf\u00FCgen, mit \u00D7 entfernen."] }), _jsxs("div", { className: "space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3", children: [_jsx("div", { className: "flex gap-2 items-center", children: _jsx(Input, { value: "Gemeinsam", readOnly: true, disabled: true, className: "flex-1 bg-white/5 border-white/10 opacity-80 cursor-not-allowed" }) }), _jsx("div", { className: "flex gap-2 items-center", children: _jsx(Input, { value: myColumnLabel, readOnly: true, disabled: true, className: "flex-1 bg-white/5 border-white/10 opacity-80 cursor-not-allowed" }) })] }), slotDraft.map((row, i) => (_jsxs("div", { className: "flex gap-2 items-center", children: [_jsx(Input, { value: row.label, onChange: (e) => setSlotDraft((prev) => prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r))), placeholder: `Person ${i + 1}`, className: "flex-1 bg-white/5 border-white/15" }), _jsx(Button, { type: "button", variant: "ghost", className: "shrink-0 text-red-300", onClick: () => setSlotDraft((prev) => prev.filter((_, j) => j !== i)), children: "\u00D7" })] }, i))), slotDraft.length < 6 ? (_jsx(Button, { type: "button", variant: "ghost", onClick: () => setSlotDraft((p) => [...p, { label: "" }]), children: "+ Person" })) : null, _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx(Button, { type: "button", disabled: savingSlots, onClick: () => void submitSlots(), className: "flex-1 rounded-xl bg-fuchsia-500/25 border border-fuchsia-400/35", children: savingSlots ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Speichern" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setSlotsEditorOpen(false), children: "Abbrechen" })] })] })] }) })) : null, modalOpen ? (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm", children: _jsxs(Card, { className: "w-full max-w-lg max-h-[92vh] overflow-y-auto border border-sky-400/25 bg-[#0a1020] text-white", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: editId ? "Eintrag bearbeiten" : "Termin, Urlaub oder Ferien" }) }), _jsxs(CardContent, { className: "space-y-4", children: [modalError ? (_jsx("p", { className: "text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2", children: modalError })) : null, _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Art" }), _jsxs("div", { className: "grid grid-cols-3 gap-2 mt-1", children: [_jsx("button", { type: "button", onClick: () => setFormKind("appointment"), className: `py-2 rounded-xl text-sm border ${formKind === "appointment"
                                                        ? "bg-sky-500/25 border-sky-400/40"
                                                        : "border-white/15 bg-white/5"}`, children: "Termin" }), _jsx("button", { type: "button", onClick: () => setFormKind("vacation"), className: `py-2 rounded-xl text-sm border ${formKind === "vacation"
                                                        ? "bg-amber-500/25 border-amber-400/40"
                                                        : "border-white/15 bg-white/5"}`, children: "Urlaub" }), _jsx("button", { type: "button", onClick: () => setFormKind("ferien"), className: `py-2 rounded-xl text-sm border ${formKind === "ferien"
                                                        ? "bg-violet-500/25 border-violet-400/40"
                                                        : "border-white/15 bg-white/5"}`, children: "Ferien" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Rubrik" }), _jsx("div", { className: "grid grid-cols-2 gap-2 mt-2", children: CALENDAR_SECTION_IDS.map((sid) => {
                                                const meta = CALENDAR_SECTION_META[sid];
                                                const Icon = SECTION_ICONS[sid];
                                                return (_jsxs("button", { type: "button", onClick: () => setFormSection(sid), className: `flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${formSection === sid ? `${meta.chip} ring-1 ring-white/30` : "border-white/10 bg-white/5"}`, children: [_jsx(Icon, { className: "h-4 w-4 shrink-0" }), meta.label] }, sid));
                                            }) })] }), formKind === "appointment" ? (_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Titel *" }), _jsx(Input, { value: formTitle, onChange: (e) => setFormTitle(e.target.value), className: "mt-1 bg-white/5 border-white/15", placeholder: "z. B. Zahnarzt" })] })) : (_jsx("p", { className: `text-xs rounded-lg p-2 border ${formKind === "ferien"
                                        ? "text-violet-200/90 bg-violet-500/10 border-violet-400/25"
                                        : "text-amber-200/80 bg-amber-500/10 border-amber-400/20"}`, children: formKind === "ferien" ? (_jsxs(_Fragment, { children: ["Titel automatisch: ", _jsx("strong", { children: "Gemeinsam" }), " / deine Spalte \u2192 ", _jsx("strong", { children: "Ferien" }), ", sonst", " ", _jsx("strong", { children: "Ferien von \u2026" }), " (z. B. Kinderspalte)."] })) : (_jsxs(_Fragment, { children: ["Titel automatisch: ", _jsx("strong", { children: "Gemeinsam" }), " / deine Spalte \u2192 ", _jsx("strong", { children: "Urlaub" }), ", sonst", " ", _jsx("strong", { children: "Urlaub von \u2026" })] })) })), _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: formAllDay, onChange: (e) => {
                                                setFormAllDay(e.target.checked);
                                                if (e.target.checked && formStart) {
                                                    const d = formStart.slice(0, 10);
                                                    setFormStart(d);
                                                    if (!formEnd)
                                                        setFormEnd(d);
                                                }
                                            } }), "Ganzt\u00E4gig (Datum von / bis)"] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: formAllDay ? "Von (Datum)" : "Beginn" }), _jsx(Input, { type: formAllDay ? "date" : "datetime-local", value: formAllDay ? formStart.slice(0, 10) : formStart, onChange: (e) => setFormStart(e.target.value), className: "mt-1 bg-white/5 border-white/15" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: formAllDay ? "Bis (Datum)" : "Ende (optional)" }), _jsx(Input, { type: formAllDay ? "date" : "datetime-local", value: formAllDay ? (formEnd || formStart).slice(0, 10) : formEnd, onChange: (e) => setFormEnd(e.target.value), className: "mt-1 bg-white/5 border-white/15" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Ort (optional)" }), _jsx(Input, { value: formLocation, onChange: (e) => setFormLocation(e.target.value), className: "mt-1 bg-white/5 border-white/15" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-2", children: [_jsx("label", { className: "text-xs text-white/55", children: formKind === "vacation" || formKind === "ferien"
                                                        ? "Spalte (Person)"
                                                        : "Spalte im Familienkalender (optional)" }), _jsxs(Button, { type: "button", variant: "ghost", className: "h-8 px-2 text-xs text-fuchsia-300 hover:text-fuchsia-100 hover:bg-fuchsia-500/15 shrink-0", onClick: () => {
                                                        setModalOpen(false);
                                                        openFamilySlotsEditor();
                                                    }, children: [_jsx(Plus, { className: "h-3.5 w-3.5 mr-1" }), "Personen-Spalte"] })] }), _jsxs("select", { className: `mt-1 w-full ${SELECT_DARK}`, value: formSlotId, onChange: (e) => {
                                                setFormSlotId(e.target.value);
                                                if (formLegacySlot && e.target.value !== formLegacySlot.id)
                                                    setFormLegacySlot(null);
                                            }, children: [_jsx("option", { value: "", className: OPTION_DARK, children: formKind === "appointment"
                                                        ? "Gemeinsam (keine Personen-Spalte)"
                                                        : "Gemeinsam" }), _jsx("option", { value: FAMILY_CALENDAR_SELF_SLOT_ID, className: OPTION_DARK, children: myColumnLabel }), formLegacySlot ? (_jsxs("option", { value: formLegacySlot.id, className: OPTION_DARK, children: [formLegacySlot.label, " (bisherige Zuordnung)"] })) : null, slots.map((s) => (_jsx("option", { value: s.id, className: OPTION_DARK, children: s.label }, s.id)))] }), _jsx("p", { className: "text-[11px] text-white/40 mt-1", children: "Zus\u00E4tzliche Spalten (Kind, Oma, \u2026) legst du \u00FCber \u201EPersonen-Spalte\u201C an \u2014 nicht \u00FCber die Checkboxen unten (das sind Workspace-Mitglieder)." })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Auch anzeigen bei \u2026 (Workspace-Mitglieder)" }), _jsxs("div", { className: "mt-2 space-y-2 max-h-32 overflow-y-auto", children: [members
                                                    .filter((m) => m.userId !== mine)
                                                    .map((m) => (_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(formVis[m.userId]), onChange: (e) => setFormVis((p) => ({ ...p, [m.userId]: e.target.checked })) }), m.displayName] }, m.userId))), members.filter((m) => m.userId !== mine).length === 0 ? (_jsx("span", { className: "text-xs text-white/45", children: "Keine weiteren Mitglieder." })) : null] })] }), _jsxs("div", { className: "flex flex-wrap gap-2 pt-2 items-center", children: [editId ? (_jsxs(Button, { type: "button", variant: "ghost", disabled: savingEvent, onClick: () => void deleteEditingEvent(), className: "rounded-xl border border-red-400/30 text-red-300 hover:bg-red-500/15", children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), "L\u00F6schen"] })) : null, _jsx(Button, { type: "button", disabled: savingEvent || (formKind === "appointment" && !formTitle.trim()), onClick: () => void submitEvent(), className: "flex-1 min-w-[8rem] rounded-xl bg-sky-500/25 border border-sky-400/35", children: savingEvent ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Speichern" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setModalOpen(false), children: "Abbrechen" })] })] })] }) })) : null] }));
}
