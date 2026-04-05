import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, CalendarRange, Loader2, MessageSquare, Palmtree, Plus, Save, Send, Trash2, } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const EMPLOYMENT_LABELS = {
    vollzeit: "Vollzeit",
    teilzeit: "Teilzeit",
    aushilfe: "Aushilfe",
};
const WD_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
function ymNow() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function toggleDay(arr, d) {
    return arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].sort((a, b) => a - b);
}
function PatternRow({ label, value, onChange, disabled, }) {
    return (_jsxs("div", { className: "flex flex-wrap items-center gap-2 py-2 border-b border-white/10 last:border-0", children: [_jsx("span", { className: "text-sm text-white/75 w-24 shrink-0", children: label }), _jsx("div", { className: "flex flex-wrap gap-1", children: WD_SHORT.map((abbr, d) => (_jsx("button", { type: "button", disabled: disabled, onClick: () => onChange(toggleDay(value, d)), className: `rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-40 disabled:pointer-events-none ${value.includes(d)
                        ? "bg-cyan-500/35 text-cyan-100 ring-1 ring-cyan-400/40"
                        : "bg-white/5 text-white/45 hover:bg-white/10"}`, children: abbr }, d))) })] }));
}
function shiftWishKey(e) {
    return `${e.weekday}:${e.slotId}`;
}
export default function WorkSchedulePage() {
    const { authFetch, logout } = useAuth();
    const navigate = useNavigate();
    const [contexts, setContexts] = useState([]);
    const [workspaceId, setWorkspaceId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [rules, setRules] = useState(null);
    const [wishes, setWishes] = useState([]);
    const [absences, setAbsences] = useState([]);
    const [plans, setPlans] = useState([]);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState("vollzeit");
    const [savingRules, setSavingRules] = useState(false);
    const [yearMonth, setYearMonth] = useState(ymNow);
    const [generating, setGenerating] = useState(false);
    const [wishEmpId, setWishEmpId] = useState("");
    const [wishPref, setWishPref] = useState([]);
    const [wishAvoid, setWishAvoid] = useState([]);
    const [wishPrefShifts, setWishPrefShifts] = useState([]);
    const [wishAvoidShifts, setWishAvoidShifts] = useState([]);
    const [pickWishWeekday, setPickWishWeekday] = useState(0);
    const [pickWishSlotId, setPickWishSlotId] = useState("");
    const [wishNotes, setWishNotes] = useState("");
    const [absEmpId, setAbsEmpId] = useState("");
    const [absStart, setAbsStart] = useState("");
    const [absEnd, setAbsEnd] = useState("");
    const [absLabel, setAbsLabel] = useState("");
    const [savingAbsence, setSavingAbsence] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatBody, setChatBody] = useState("");
    const [chatSending, setChatSending] = useState(false);
    const [contacts, setContacts] = useState([]);
    const [viewerIdsDraft, setViewerIdsDraft] = useState([]);
    const [savingViewers, setSavingViewers] = useState(false);
    const fetchJson = useCallback(async (path, init) => {
        const res = await authFetch(path, init);
        if (res.status === 401) {
            await logout();
            navigate("/login", { replace: true });
            throw new Error("unauthorized");
        }
        if (!res.ok)
            throw new Error(String(res.status));
        return res.json();
    }, [authFetch, logout, navigate]);
    useEffect(() => {
        let c = false;
        void (async () => {
            try {
                const list = await fetchJson("/work-schedule/my-contexts");
                if (c)
                    return;
                setContexts(list);
                setWorkspaceId((prev) => {
                    if (prev && list.some((x) => x.workspaceId === prev))
                        return prev;
                    return list[0]?.workspaceId ?? null;
                });
            }
            catch {
                setContexts([]);
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
    }, [fetchJson]);
    const activeContext = useMemo(() => contexts.find((x) => x.workspaceId === workspaceId) ?? null, [contexts, workspaceId]);
    const isEditor = activeContext?.role === "editor";
    const reloadChat = useCallback(async () => {
        if (!workspaceId)
            return;
        try {
            const rows = await fetchJson(`/workspaces/${workspaceId}/work-schedule/chat`);
            setChatMessages(rows);
        }
        catch {
            setChatMessages([]);
        }
    }, [workspaceId, fetchJson]);
    useEffect(() => {
        void reloadChat();
    }, [reloadChat]);
    useEffect(() => {
        if (!isEditor || !workspaceId) {
            setContacts([]);
            setViewerIdsDraft([]);
            return;
        }
        let c = false;
        void (async () => {
            try {
                const [co, vw] = await Promise.all([
                    fetchJson("/contacts"),
                    fetchJson(`/workspaces/${workspaceId}/work-schedule/viewers`),
                ]);
                if (c)
                    return;
                setContacts(co);
                setViewerIdsDraft(vw.viewerUserIds);
            }
            catch {
                if (!c) {
                    setContacts([]);
                    setViewerIdsDraft([]);
                }
            }
        })();
        return () => {
            c = true;
        };
    }, [isEditor, workspaceId, fetchJson]);
    const reloadAll = useCallback(async () => {
        if (!workspaceId)
            return;
        setErr(null);
        try {
            const [em, ru, wi, ab, pl] = await Promise.all([
                fetchJson(`/workspaces/${workspaceId}/work-schedule/employees`),
                fetchJson(`/workspaces/${workspaceId}/work-schedule/rules`),
                fetchJson(`/workspaces/${workspaceId}/work-schedule/wishes`),
                fetchJson(`/workspaces/${workspaceId}/work-schedule/absences`),
                fetchJson(`/workspaces/${workspaceId}/work-schedule/plans`),
            ]);
            setEmployees(em);
            setRules(ru);
            setWishes(wi);
            setAbsences(ab);
            setPlans(pl);
        }
        catch {
            setErr("Daten konnten nicht geladen werden.");
        }
    }, [workspaceId, fetchJson]);
    useEffect(() => {
        void reloadAll();
    }, [reloadAll]);
    const activePlan = useMemo(() => {
        const m = yearMonth.trim();
        return plans.find((p) => p.yearMonth === m) ?? null;
    }, [plans, yearMonth]);
    const empById = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);
    const slotById = useMemo(() => Object.fromEntries((rules?.slots ?? []).map((s) => [s.id, s])), [rules?.slots]);
    useEffect(() => {
        if (!rules?.slots?.length) {
            setPickWishSlotId("");
            return;
        }
        setPickWishSlotId((prev) => prev && rules.slots.some((s) => s.id === prev) ? prev : rules.slots[0].id);
    }, [rules]);
    const formatShiftWishLabel = (e) => {
        const slot = slotById[e.slotId];
        const slotLabel = slot ? `${slot.label} (${slot.startTime}–${slot.endTime})` : e.slotId;
        return `${WD_SHORT[e.weekday]} · ${slotLabel}`;
    };
    const addWishPrefShift = () => {
        if (!pickWishSlotId)
            return;
        const entry = { weekday: pickWishWeekday, slotId: pickWishSlotId };
        const k = shiftWishKey(entry);
        setWishAvoidShifts((prev) => prev.filter((x) => shiftWishKey(x) !== k));
        setWishPrefShifts((prev) => (prev.some((x) => shiftWishKey(x) === k) ? prev : [...prev, entry]));
    };
    const addWishAvoidShift = () => {
        if (!pickWishSlotId)
            return;
        const entry = { weekday: pickWishWeekday, slotId: pickWishSlotId };
        const k = shiftWishKey(entry);
        setWishPrefShifts((prev) => prev.filter((x) => shiftWishKey(x) !== k));
        setWishAvoidShifts((prev) => (prev.some((x) => shiftWishKey(x) === k) ? prev : [...prev, entry]));
    };
    const addEmployee = async () => {
        if (!workspaceId || !newName.trim())
            return;
        setErr(null);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/employees`, {
                method: "POST",
                body: JSON.stringify({ name: newName.trim(), employmentType: newType }),
            });
            if (res.status === 401) {
                await logout();
                navigate("/login", { replace: true });
                return;
            }
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setErr(e.error ?? "Speichern fehlgeschlagen.");
                return;
            }
            setNewName("");
            await reloadAll();
        }
        catch {
            setErr("Netzwerkfehler.");
        }
    };
    const removeEmployee = async (id) => {
        if (!workspaceId || !confirm("Mitarbeiter wirklich löschen?"))
            return;
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/employees/${id}`, {
                method: "DELETE",
            });
            if (res.ok)
                await reloadAll();
        }
        catch {
            /* ignore */
        }
    };
    const saveRules = async () => {
        if (!workspaceId || !rules)
            return;
        setSavingRules(true);
        setErr(null);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/rules`, {
                method: "PUT",
                body: JSON.stringify({
                    slots: rules.slots,
                    dayPatterns: rules.dayPatterns,
                }),
            });
            if (res.status === 401) {
                await logout();
                navigate("/login", { replace: true });
                return;
            }
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setErr(e.error ?? "Regeln konnten nicht gespeichert werden.");
                return;
            }
            const next = (await res.json());
            setRules(next);
        }
        finally {
            setSavingRules(false);
        }
    };
    const updatePattern = (key, days) => {
        setRules((r) => (r ? { ...r, dayPatterns: { ...r.dayPatterns, [key]: days } } : r));
    };
    const updateSlot = (idx, patch) => {
        setRules((r) => {
            if (!r)
                return r;
            const slots = [...r.slots];
            const cur = slots[idx];
            if (!cur)
                return r;
            slots[idx] = { ...cur, ...patch };
            return { ...r, slots };
        });
    };
    const addSlot = () => {
        setRules((r) => {
            if (!r)
                return r;
            return {
                ...r,
                slots: [
                    ...r.slots,
                    {
                        id: `slot-${Date.now()}`,
                        label: "Schicht",
                        startTime: "14:00",
                        endTime: "22:00",
                    },
                ],
            };
        });
    };
    const removeSlot = (idx) => {
        setRules((r) => {
            if (!r || r.slots.length <= 1)
                return r;
            return { ...r, slots: r.slots.filter((_, i) => i !== idx) };
        });
    };
    const saveWish = async () => {
        if (!workspaceId || !wishEmpId)
            return;
        setErr(null);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/wishes`, {
                method: "POST",
                body: JSON.stringify({
                    employeeId: wishEmpId,
                    preferredWeekdays: wishPref,
                    avoidWeekdays: wishAvoid,
                    preferredShifts: wishPrefShifts,
                    avoidShifts: wishAvoidShifts,
                    notes: wishNotes,
                }),
            });
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setErr(e.error ?? "Wunsch konnte nicht gespeichert werden.");
                return;
            }
            setWishNotes("");
            setWishPref([]);
            setWishAvoid([]);
            setWishPrefShifts([]);
            setWishAvoidShifts([]);
            setWishEmpId("");
            await reloadAll();
        }
        catch {
            setErr("Netzwerkfehler.");
        }
    };
    const loadWishForEdit = (w) => {
        setWishEmpId(w.employeeId);
        setWishPref([...w.preferredWeekdays]);
        setWishAvoid([...w.avoidWeekdays]);
        setWishPrefShifts([...(w.preferredShifts ?? [])]);
        setWishAvoidShifts([...(w.avoidShifts ?? [])]);
        setWishNotes(w.notes);
    };
    const deleteWish = async (id) => {
        if (!workspaceId || !confirm("Wunsch löschen?"))
            return;
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/wishes/${id}`, {
                method: "DELETE",
            });
            if (res.ok)
                await reloadAll();
        }
        catch {
            /* ignore */
        }
    };
    const saveAbsence = async () => {
        if (!workspaceId || !absEmpId || !absStart || !absEnd)
            return;
        setSavingAbsence(true);
        setErr(null);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/absences`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    employeeId: absEmpId,
                    startDate: absStart,
                    endDate: absEnd,
                    label: absLabel,
                }),
            });
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setErr(e.error ?? "Abwesenheit konnte nicht gespeichert werden.");
                return;
            }
            setAbsStart("");
            setAbsEnd("");
            setAbsLabel("");
            await reloadAll();
        }
        catch {
            setErr("Netzwerkfehler.");
        }
        finally {
            setSavingAbsence(false);
        }
    };
    const deleteAbsence = async (id) => {
        if (!workspaceId || !confirm("Diesen Zeitraum löschen?"))
            return;
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/absences/${id}`, {
                method: "DELETE",
            });
            if (res.ok)
                await reloadAll();
        }
        catch {
            /* ignore */
        }
    };
    const generatePlan = async () => {
        if (!workspaceId)
            return;
        setGenerating(true);
        setErr(null);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/generate`, {
                method: "POST",
                body: JSON.stringify({ yearMonth: yearMonth.trim() }),
            });
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setErr(e.error ?? "Plan konnte nicht erstellt werden.");
                return;
            }
            await reloadAll();
        }
        catch {
            setErr("Netzwerkfehler.");
        }
        finally {
            setGenerating(false);
        }
    };
    const sendChat = async () => {
        if (!workspaceId || !chatBody.trim())
            return;
        setChatSending(true);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: chatBody.trim() }),
            });
            if (res.status === 401) {
                await logout();
                navigate("/login", { replace: true });
                return;
            }
            if (res.ok) {
                setChatBody("");
                await reloadChat();
            }
        }
        finally {
            setChatSending(false);
        }
    };
    const toggleViewerId = (userId) => {
        setViewerIdsDraft((prev) => prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]);
    };
    const saveViewers = async () => {
        if (!workspaceId)
            return;
        setSavingViewers(true);
        setErr(null);
        try {
            const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/viewers`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ viewerUserIds: viewerIdsDraft }),
            });
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setErr(e.error ?? "Freigaben konnten nicht gespeichert werden.");
                return;
            }
            const data = (await res.json());
            setViewerIdsDraft(data.viewerUserIds);
        }
        catch {
            setErr("Netzwerkfehler.");
        }
        finally {
            setSavingViewers(false);
        }
    };
    const neonContacts = useMemo(() => contacts.filter((c) => c.isNeonLinkUser && c.linkedUserId), [contacts]);
    const groupedAssignments = useMemo(() => {
        if (!activePlan)
            return [];
        const byDate = new Map();
        for (const a of activePlan.assignments) {
            const list = byDate.get(a.date) ?? [];
            list.push(a);
            byDate.set(a.date, list);
        }
        return [...byDate.entries()].sort(([da], [db]) => da.localeCompare(db));
    }, [activePlan]);
    return (_jsxs("div", { className: "min-h-screen w-full bg-[#050816] text-white overflow-x-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.12),transparent_30%)]" }), _jsxs("div", { className: "relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-8", children: [_jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Zur\u00FCck zur App"] }), _jsxs("div", { className: "flex items-center gap-2 text-amber-200/95", children: [_jsx(Briefcase, { className: "h-6 w-6" }), _jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Arbeitsplan" })] })] }), _jsx("p", { className: "text-sm text-white/60 max-w-3xl mb-6 leading-relaxed", children: !loading && contexts.length === 0 ? (_jsxs(_Fragment, { children: ["F\u00FCr dich ist noch kein Arbeitsplan freigeschaltet. Als", " ", _jsx("span", { className: "text-white/85", children: "Workspace-Besitzerin bzw. -Besitzer" }), " richtest du den Plan ein; andere NeonLink-Nutzer kannst du unter \u201ELesende\u201C nur freigeben, wenn sie in deinen", " ", _jsx("span", { className: "text-white/85", children: "Kontakten" }), " mit verkn\u00FCpftem Konto stehen."] })) : activeContext?.role === "viewer" ? (_jsxs(_Fragment, { children: ["Du siehst den Plan von ", _jsx("span", { className: "text-white/85", children: activeContext.editorDisplayName }), " nur zur Ansicht. Tauschw\u00FCnsche oder Absprachen f\u00FCr einzelne Tage schreibst du unten im", " ", _jsx("span", { className: "text-white/85", children: "Kurz-Chat" }), " \u2014 die Planung selbst nimmt nur die Bearbeiterin bzw. der Bearbeiter vor."] })) : (_jsxs(_Fragment, { children: ["Lege ", _jsx("span", { className: "text-white/85", children: "Mitarbeiter" }), " mit Besch\u00E4ftigungsart an, definiere", " ", _jsx("span", { className: "text-white/85", children: "Schichten und Wochentage" }), " pro Art, trage", " ", _jsx("span", { className: "text-white/85", children: "Wunsch- und Sperrtage" }), " ein \u2014 dann erzeugst du einen", " ", _jsx("span", { className: "text-white/85", children: "Monatsplan" }), ". Unter \u201ELesende\u201C bestimmst du, wer den Plan nur lesen darf (registrierte Kontakte). Die erste Version verteilt pro Tag und Schicht fair im Wechsel."] })) }), err ? (_jsx("div", { className: "mb-4 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-2 text-sm text-red-200", children: err })) : null, loading ? (_jsxs("div", { className: "flex items-center gap-2 text-white/60", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), "Lade Zugriffe\u2026"] })) : contexts.length === 0 ? null : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-6 flex flex-wrap items-center gap-3", children: [_jsx("label", { className: "text-sm text-white/55", children: "Arbeitsplan" }), _jsx("select", { value: workspaceId ?? "", onChange: (e) => setWorkspaceId(e.target.value || null), className: "rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm max-w-[min(100%,24rem)]", children: contexts.map((c) => (_jsxs("option", { value: c.workspaceId, children: [c.workspaceName, c.role === "viewer" ? " (nur lesen)" : " (Bearbeitung)"] }, c.workspaceId))) })] }), activeContext?.role === "viewer" ? (_jsx("div", { className: "mb-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90", children: "Nur-Lese-Modus \u2014 du kannst den Plan einsehen und im Chat schreiben, aber keine Daten \u00E4ndern." })) : null, isEditor ? (_jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, className: "mb-6", children: _jsxs(Card, { className: "border-white/10 bg-white/5 backdrop-blur-xl", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "Lesende (Nur-Ansicht)" }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-white/50", children: "Nur registrierte Kontakte mit NeonLink-Konto (Telefonbuch) k\u00F6nnen ausgew\u00E4hlt werden. Sie sehen Mitarbeiter, Regeln, W\u00FCnsche und Pl\u00E4ne wie du \u2014 d\u00FCrfen aber nichts bearbeiten." }), neonContacts.length === 0 ? (_jsx("p", { className: "text-sm text-amber-200/80", children: "Keine verkn\u00FCpften NeonLink-Kontakte. Unter Kontakte im Men\u00FC Nummern speichern, die bereits registriert sind." })) : (_jsx("ul", { className: "space-y-2 max-h-40 overflow-y-auto", children: neonContacts.map((c) => {
                                                        const uid = c.linkedUserId;
                                                        const on = viewerIdsDraft.includes(uid);
                                                        return (_jsxs("li", { className: "flex items-center gap-3 text-sm", children: [_jsx("input", { type: "checkbox", id: `vw-${c.id}`, checked: on, onChange: () => toggleViewerId(uid), className: "rounded border-white/30" }), _jsx("label", { htmlFor: `vw-${c.id}`, className: "cursor-pointer text-white/85", children: c.displayName })] }, c.id));
                                                    }) })), _jsxs(Button, { type: "button", onClick: () => void saveViewers(), disabled: savingViewers, children: [savingViewers ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(Save, { className: "h-4 w-4 mr-2" }), "Freigaben speichern"] })] })] }) })) : null, _jsxs("div", { className: "grid gap-6 lg:grid-cols-2", children: [_jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, children: _jsxs(Card, { className: "border-white/10 bg-white/5 backdrop-blur-xl", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "Mitarbeiter" }) }), _jsxs(CardContent, { className: "space-y-4", children: [isEditor ? (_jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsx(Input, { placeholder: "Name", value: newName, onChange: (e) => setNewName(e.target.value), className: "bg-white/5 border-white/15" }), _jsx("select", { value: newType, onChange: (e) => setNewType(e.target.value), className: "rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm", children: Object.keys(EMPLOYMENT_LABELS).map((k) => (_jsx("option", { value: k, children: EMPLOYMENT_LABELS[k] }, k))) }), _jsxs(Button, { type: "button", onClick: () => void addEmployee(), className: "shrink-0", children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Anlegen"] })] })) : null, _jsxs("ul", { className: "space-y-2 max-h-56 overflow-y-auto", children: [employees.map((e) => (_jsxs("li", { className: "flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm", children: [_jsxs("span", { children: [_jsx("span", { className: "font-medium text-white/90", children: e.name }), _jsxs("span", { className: "text-white/45", children: [" \u00B7 ", EMPLOYMENT_LABELS[e.employmentType]] })] }), isEditor ? (_jsx("button", { type: "button", onClick: () => void removeEmployee(e.id), className: "p-1.5 rounded-lg text-red-300/90 hover:bg-red-500/15", "aria-label": "L\u00F6schen", children: _jsx(Trash2, { className: "h-4 w-4" }) })) : null] }, e.id))), employees.length === 0 ? (_jsx("li", { className: "text-sm text-white/40", children: "Noch keine Eintr\u00E4ge." })) : null] })] })] }) }), _jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.05 }, children: _jsxs(Card, { className: "border-white/10 bg-white/5 backdrop-blur-xl", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "Schichten & Wochentage" }) }), _jsx(CardContent, { className: "space-y-4", children: rules ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-3", children: [rules.slots.map((s, idx) => (_jsxs("div", { className: "flex flex-wrap items-end gap-2 rounded-lg border border-white/10 p-3 bg-black/15", children: [_jsxs("div", { className: "flex-1 min-w-[8rem]", children: [_jsx("label", { className: "text-xs text-white/45", children: "Bezeichnung" }), _jsx(Input, { value: s.label, disabled: !isEditor, onChange: (e) => updateSlot(idx, { label: e.target.value }), className: "bg-white/5 border-white/15 mt-0.5" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/45", children: "Von" }), _jsx(Input, { type: "time", disabled: !isEditor, value: s.startTime.length === 5 ? s.startTime : s.startTime.padStart(5, "0"), onChange: (e) => updateSlot(idx, { startTime: e.target.value }), className: "bg-white/5 border-white/15 mt-0.5 w-[7rem]" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/45", children: "Bis" }), _jsx(Input, { type: "time", disabled: !isEditor, value: s.endTime.length === 5 ? s.endTime : s.endTime.padStart(5, "0"), onChange: (e) => updateSlot(idx, { endTime: e.target.value }), className: "bg-white/5 border-white/15 mt-0.5 w-[7rem]" })] }), isEditor && rules.slots.length > 1 ? (_jsx(Button, { type: "button", variant: "ghost", onClick: () => removeSlot(idx), children: _jsx(Trash2, { className: "h-4 w-4" }) })) : null] }, s.id))), isEditor ? (_jsx(Button, { type: "button", onClick: addSlot, className: "border border-white/20 bg-transparent hover:bg-white/10", children: "Schicht hinzuf\u00FCgen" })) : null] }), _jsxs("div", { className: "rounded-xl border border-white/10 p-3 bg-black/10", children: [_jsx("div", { className: "text-xs uppercase tracking-wider text-white/45 mb-2", children: "Standard: an welchen Wochentagen darf wer grunds\u00E4tzlich arbeiten?" }), _jsx(PatternRow, { label: "Vollzeit", value: rules.dayPatterns.vollzeitWeekdays, disabled: !isEditor, onChange: (d) => updatePattern("vollzeitWeekdays", d) }), _jsx(PatternRow, { label: "Teilzeit", value: rules.dayPatterns.teilzeitWeekdays, disabled: !isEditor, onChange: (d) => updatePattern("teilzeitWeekdays", d) }), _jsx(PatternRow, { label: "Aushilfe", value: rules.dayPatterns.aushilfeWeekdays, disabled: !isEditor, onChange: (d) => updatePattern("aushilfeWeekdays", d) })] }), isEditor ? (_jsxs(Button, { type: "button", onClick: () => void saveRules(), disabled: savingRules, children: [savingRules ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(Save, { className: "h-4 w-4 mr-2" }), "Regeln speichern"] })) : null] })) : (_jsx("p", { className: "text-sm text-white/45", children: "Lade Regeln\u2026" })) })] }) })] }), _jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 }, className: "mt-6", children: _jsxs(Card, { className: "border-white/10 bg-white/5 backdrop-blur-xl", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { className: "text-lg", children: "W\u00FCnsche, Sperren & Schichten" }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-white/50", children: [_jsx("span", { className: "text-emerald-200/90", children: "Wunsch-Tage" }), " gelten f\u00FCr alle Schichten an dem Wochentag. ", _jsx("span", { className: "text-emerald-300/90", children: "Wunsch-Schicht" }), " bevorzugt nur diese eine Schicht (z. B. Sonntag fr\u00FCh). ", _jsx("span", { className: "text-rose-200/90", children: "Sperr-Tage" }), " schlie\u00DFen den ganzen Tag aus, ", _jsx("span", { className: "text-rose-300/90", children: "Sperr-Schicht" }), " nur eine bestimmte Schicht (z. B. kein Sonntag sp\u00E4t \u2014 aber Sonntag fr\u00FCh m\u00F6glich)."] }), _jsxs("div", { className: "flex flex-col lg:flex-row gap-4", children: [isEditor ? (_jsxs("div", { className: "flex-1 space-y-3", children: [_jsx("label", { className: "text-xs text-white/45", children: "Mitarbeiter" }), _jsxs("select", { value: wishEmpId, onChange: (e) => setWishEmpId(e.target.value), className: "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "\u2014 w\u00E4hlen \u2014" }), employees.map((e) => (_jsx("option", { value: e.id, children: e.name }, e.id)))] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-emerald-300/80 mb-1", children: "Wunsch-Wochentage" }), _jsx("div", { className: "flex flex-wrap gap-1", children: WD_SHORT.map((abbr, d) => (_jsx("button", { type: "button", onClick: () => setWishPref((p) => toggleDay(p, d)), className: `rounded-lg px-2 py-1 text-xs font-medium ${wishPref.includes(d)
                                                                                    ? "bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-400/35"
                                                                                    : "bg-white/5 text-white/45"}`, children: abbr }, d))) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-xs text-rose-300/80 mb-1", children: "Sperr-Wochentage" }), _jsx("div", { className: "flex flex-wrap gap-1", children: WD_SHORT.map((abbr, d) => (_jsx("button", { type: "button", onClick: () => setWishAvoid((p) => toggleDay(p, d)), className: `rounded-lg px-2 py-1 text-xs font-medium ${wishAvoid.includes(d)
                                                                                    ? "bg-rose-500/25 text-rose-100 ring-1 ring-rose-400/35"
                                                                                    : "bg-white/5 text-white/45"}`, children: abbr }, d))) })] }), _jsxs("div", { className: "rounded-xl border border-white/10 bg-black/25 p-3 space-y-3", children: [_jsx("div", { className: "text-xs text-violet-200/85 font-medium", children: "Pro Schicht (aus den gespeicherten Schicht-Regeln \u2014 bei neuen Schichten zuerst \u201ERegeln speichern\u201C)" }), _jsxs("div", { className: "flex flex-wrap items-end gap-2", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs text-white/45 block mb-0.5", children: "Wochentag" }), _jsx("select", { value: pickWishWeekday, onChange: (e) => setPickWishWeekday(Number(e.target.value)), className: "rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm", children: WD_SHORT.map((abbr, d) => (_jsx("option", { value: d, children: abbr }, abbr))) })] }), _jsxs("div", { className: "min-w-[9rem]", children: [_jsx("span", { className: "text-xs text-white/45 block mb-0.5", children: "Schicht" }), _jsx("select", { value: pickWishSlotId, onChange: (e) => setPickWishSlotId(e.target.value), disabled: !rules?.slots.length, className: "w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm disabled:opacity-40", children: (rules?.slots ?? []).map((s) => (_jsx("option", { value: s.id, children: s.label }, s.id))) })] }), _jsx(Button, { type: "button", onClick: addWishPrefShift, disabled: !pickWishSlotId, className: "bg-emerald-500/20 text-emerald-100 border border-emerald-400/35 hover:bg-emerald-500/30", children: "+ Wunsch-Schicht" }), _jsx(Button, { type: "button", onClick: addWishAvoidShift, disabled: !pickWishSlotId, className: "bg-rose-500/15 text-rose-100 border border-rose-400/35 hover:bg-rose-500/25", children: "+ Sperr-Schicht" })] }), wishPrefShifts.length > 0 ? (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-emerald-300/80 mb-1", children: "Wunsch-Schichten" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: wishPrefShifts.map((e) => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-100/95", children: [formatShiftWishLabel(e), _jsx("button", { type: "button", className: "text-white/50 hover:text-white leading-none px-0.5", onClick: () => setWishPrefShifts((prev) => prev.filter((x) => shiftWishKey(x) !== shiftWishKey(e))), "aria-label": "Entfernen", children: "\u00D7" })] }, shiftWishKey(e)))) })] })) : null, wishAvoidShifts.length > 0 ? (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-rose-300/80 mb-1", children: "Sperr-Schichten" }), _jsx("div", { className: "flex flex-wrap gap-1.5", children: wishAvoidShifts.map((e) => (_jsxs("span", { className: "inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-1 text-[11px] text-rose-100/95", children: [formatShiftWishLabel(e), _jsx("button", { type: "button", className: "text-white/50 hover:text-white leading-none px-0.5", onClick: () => setWishAvoidShifts((prev) => prev.filter((x) => shiftWishKey(x) !== shiftWishKey(e))), "aria-label": "Entfernen", children: "\u00D7" })] }, shiftWishKey(e)))) })] })) : null] }), _jsx(Input, { placeholder: "Notiz (optional)", value: wishNotes, onChange: (e) => setWishNotes(e.target.value), className: "bg-white/5 border-white/15" }), _jsx(Button, { type: "button", onClick: () => void saveWish(), disabled: !wishEmpId, children: "Wunsch speichern" })] })) : null, _jsxs("div", { className: `min-h-[12rem] rounded-xl border border-white/10 bg-black/15 p-3 overflow-y-auto max-h-72 ${isEditor ? "flex-1" : "w-full"}`, children: [_jsx("div", { className: "text-xs text-white/45 mb-2", children: "Gespeicherte W\u00FCnsche" }), _jsxs("ul", { className: "space-y-2 text-sm", children: [wishes.map((w) => {
                                                                            const en = empById[w.employeeId];
                                                                            return (_jsxs("li", { className: "flex flex-col gap-1 rounded-lg border border-white/10 px-3 py-2 bg-white/[0.03]", children: [_jsxs("div", { className: "flex justify-between gap-2", children: [_jsx("span", { className: "font-medium", children: en?.name ?? w.employeeId }), isEditor ? (_jsxs("div", { className: "flex gap-1", children: [_jsx("button", { type: "button", className: "text-xs text-cyan-300 hover:underline", onClick: () => loadWishForEdit(w), children: "Bearbeiten" }), _jsx("button", { type: "button", className: "text-xs text-red-300/90 hover:underline", onClick: () => void deleteWish(w.id), children: "L\u00F6schen" })] })) : null] }), _jsxs("div", { className: "text-white/55 text-xs space-y-0.5", children: [_jsxs("div", { children: ["Wunsch-Tage: ", w.preferredWeekdays.map((d) => WD_SHORT[d]).join(", ") || "—"] }), (w.preferredShifts ?? []).length > 0 ? (_jsxs("div", { children: ["Wunsch-Schichten:", " ", (w.preferredShifts ?? []).map((s) => formatShiftWishLabel(s)).join(" · ")] })) : null, _jsxs("div", { children: ["Sperr-Tage: ", w.avoidWeekdays.map((d) => WD_SHORT[d]).join(", ") || "—"] }), (w.avoidShifts ?? []).length > 0 ? (_jsxs("div", { children: ["Sperr-Schichten:", " ", (w.avoidShifts ?? []).map((s) => formatShiftWishLabel(s)).join(" · ")] })) : null] }), w.notes ? _jsx("div", { className: "text-white/40 text-xs", children: w.notes }) : null] }, w.id));
                                                                        }), wishes.length === 0 ? _jsx("li", { className: "text-white/35", children: "Keine Eintr\u00E4ge." }) : null] })] })] })] })] }) }), _jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.11 }, className: "mt-6", children: _jsxs(Card, { className: "border-white/10 bg-white/5 backdrop-blur-xl", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [_jsx(Palmtree, { className: "h-5 w-5 text-amber-200/90" }), "Urlaub & Abwesenheit"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsxs("p", { className: "text-sm text-white/50", children: ["In den eingetragenen Zeitr\u00E4umen wird die Person bei der", " ", _jsx("span", { className: "text-white/70", children: "Arbeitsplan-Erstellung" }), " an keinem Kalendertag und in keiner Schicht eingeteilt (z. B. Urlaub, Krankheit, Fortbildung)."] }), _jsxs("div", { className: "flex flex-col lg:flex-row gap-4", children: [isEditor ? (_jsxs("div", { className: "flex-1 space-y-3", children: [_jsx("label", { className: "text-xs text-white/45", children: "Mitarbeiter" }), _jsxs("select", { value: absEmpId, onChange: (e) => setAbsEmpId(e.target.value), className: "w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm", children: [_jsx("option", { value: "", children: "\u2014 w\u00E4hlen \u2014" }), employees.map((e) => (_jsx("option", { value: e.id, children: e.name }, e.id)))] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs text-white/45 block mb-0.5", children: "Von" }), _jsx(Input, { type: "date", value: absStart, onChange: (e) => setAbsStart(e.target.value), className: "w-auto bg-white/5 border-white/15" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-xs text-white/45 block mb-0.5", children: "Bis" }), _jsx(Input, { type: "date", value: absEnd, onChange: (e) => setAbsEnd(e.target.value), className: "w-auto bg-white/5 border-white/15" })] })] }), _jsx(Input, { placeholder: "Bezeichnung (optional, z. B. Urlaub)", value: absLabel, onChange: (e) => setAbsLabel(e.target.value), className: "bg-white/5 border-white/15" }), _jsxs(Button, { type: "button", onClick: () => void saveAbsence(), disabled: savingAbsence || !absEmpId || !absStart || !absEnd, children: [savingAbsence ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : _jsx(Plus, { className: "h-4 w-4 mr-2" }), "Zeitraum hinzuf\u00FCgen"] })] })) : null, _jsxs("div", { className: `min-h-[10rem] rounded-xl border border-white/10 bg-black/15 p-3 overflow-y-auto max-h-64 ${isEditor ? "flex-1" : "w-full"}`, children: [_jsx("div", { className: "text-xs text-white/45 mb-2", children: "Eingetragene Zeitr\u00E4ume" }), _jsxs("ul", { className: "space-y-2 text-sm", children: [absences.map((a) => {
                                                                            const en = empById[a.employeeId];
                                                                            return (_jsxs("li", { className: "flex flex-col gap-1 rounded-lg border border-white/10 px-3 py-2 bg-white/[0.03]", children: [_jsxs("div", { className: "flex justify-between gap-2", children: [_jsx("span", { className: "font-medium", children: en?.name ?? a.employeeId }), isEditor ? (_jsx("button", { type: "button", className: "text-xs text-red-300/90 hover:underline shrink-0", onClick: () => void deleteAbsence(a.id), children: "L\u00F6schen" })) : null] }), _jsxs("div", { className: "text-white/60 text-xs", children: [a.startDate, " \u2014 ", a.endDate, a.label ? _jsxs("span", { className: "text-white/45", children: [" \u00B7 ", a.label] }) : null] })] }, a.id));
                                                                        }), absences.length === 0 ? _jsx("li", { className: "text-white/35", children: "Keine Eintr\u00E4ge." }) : null] })] })] })] })] }) }), _jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.12 }, className: "mt-6", children: _jsxs(Card, { className: "border-white/10 bg-white/5 backdrop-blur-xl", children: [_jsxs(CardHeader, { className: "flex flex-row flex-wrap items-center justify-between gap-3", children: [_jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [_jsx(CalendarRange, { className: "h-5 w-5 text-cyan-300/90" }), "Monatsplan"] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx(Input, { type: "month", value: yearMonth, onChange: (e) => setYearMonth(e.target.value), className: "w-auto bg-white/5 border-white/15" }), isEditor ? (_jsxs(Button, { type: "button", onClick: () => void generatePlan(), disabled: generating || !workspaceId, children: [generating ? _jsx(Loader2, { className: "h-4 w-4 animate-spin mr-2" }) : null, "Arbeitsplan erstellen"] })) : null] })] }), _jsx(CardContent, { children: !activePlan ? (_jsx("p", { className: "text-sm text-white/45", children: isEditor ? (_jsxs(_Fragment, { children: ["F\u00FCr ", _jsx("span", { className: "text-white/70", children: yearMonth }), " liegt noch kein Plan vor \u2014 Button oben dr\u00FCcken (\u00FCberschreibt einen vorhandenen Plan f\u00FCr denselben Monat)."] })) : (_jsxs(_Fragment, { children: ["F\u00FCr ", _jsx("span", { className: "text-white/70", children: yearMonth }), " liegt noch kein Plan vor. Die Bearbeiterin bzw. der Bearbeiter kann ihn erzeugen."] })) })) : (_jsxs("div", { className: "space-y-2 max-h-[28rem] overflow-y-auto pr-1", children: [_jsxs("p", { className: "text-xs text-white/45 mb-2", children: ["Erstellt ", new Date(activePlan.generatedAt).toLocaleString("de-DE"), " \u00B7 ", activePlan.assignments.length, " ", "Zuordnungen"] }), groupedAssignments.map(([date, rows]) => {
                                                        const [Y, M, D] = date.split("-").map(Number);
                                                        const label = new Date(Y, M - 1, D).toLocaleDateString("de-DE", {
                                                            weekday: "short",
                                                            day: "numeric",
                                                            month: "short",
                                                        });
                                                        return (_jsxs("div", { className: "rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm", children: [_jsx("div", { className: "font-medium text-cyan-200/90 mb-1", children: label }), _jsx("ul", { className: "space-y-1 text-white/75", children: rows.map((a, i) => {
                                                                        const slot = slotById[a.slotId];
                                                                        const emp = a.employeeId ? empById[a.employeeId] : null;
                                                                        return (_jsxs("li", { children: [slot ? `${slot.label} (${slot.startTime}–${slot.endTime})` : a.slotId, ":", " ", _jsx("span", { className: "text-white/90", children: emp?.name ?? "— offen" })] }, `${a.slotId}-${i}`));
                                                                    }) })] }, date));
                                                    })] })) })] }) }), _jsx(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.14 }, className: "mt-6", children: _jsxs(Card, { className: "border-white/10 bg-white/5 backdrop-blur-xl", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "text-lg flex items-center gap-2", children: [_jsx(MessageSquare, { className: "h-5 w-5 text-violet-300/90" }), "Absprachen & Tauschw\u00FCnsche"] }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-white/50", children: "Kurzer Austausch zum Plan \u2014 z.\u202FB. \u201EAm 15. nicht verf\u00FCgbar\u201C, \u201ETausch mit Max\u201C. Alle, die den Plan sehen d\u00FCrfen, k\u00F6nnen hier schreiben; nur die Bearbeiterin bzw. der Bearbeiter \u00E4ndert den Plan selbst." }), _jsx("div", { className: "max-h-52 overflow-y-auto space-y-2 rounded-xl border border-white/10 bg-black/20 p-3", children: chatMessages.length === 0 ? (_jsx("p", { className: "text-sm text-white/35", children: "Noch keine Nachrichten." })) : (chatMessages.map((m) => (_jsxs("div", { className: "text-sm rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2", children: [_jsxs("div", { className: "text-xs text-white/45", children: [_jsx("span", { className: "text-cyan-200/90", children: m.authorDisplayName }), " · ", new Date(m.createdAt).toLocaleString("de-DE", {
                                                                        day: "2-digit",
                                                                        month: "2-digit",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })] }), _jsx("div", { className: "text-white/85 mt-1 whitespace-pre-wrap break-words", children: m.body })] }, m.id)))) }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2", children: [_jsx(Input, { placeholder: "Nachricht schreiben\u2026", value: chatBody, onChange: (e) => setChatBody(e.target.value), onKeyDown: (e) => {
                                                                if (e.key === "Enter" && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    void sendChat();
                                                                }
                                                            }, className: "bg-white/5 border-white/15 flex-1" }), _jsx(Button, { type: "button", onClick: () => void sendChat(), disabled: chatSending || !chatBody.trim(), className: "shrink-0", children: chatSending ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "h-4 w-4 mr-2" }), "Senden"] })) })] })] })] }) })] }))] })] }));
}
