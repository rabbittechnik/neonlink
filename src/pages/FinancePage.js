import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Banknote, Calendar, Check, Loader2, Plus, Receipt, Trash2, Users, } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FINANCE_CATEGORY_LABELS, FINANCE_CATEGORY_OPTIONS } from "@/constants/financeCategories";
import { FinanceHouseholdWizard } from "@/components/finance/FinanceHouseholdWizard";
import { HouseholdBudgetPanel } from "@/components/finance/HouseholdBudgetPanel";
import { fileToAvatarDataUrl } from "@/utils/fileToAvatarDataUrl";
import { readFilesFromFileInputEvent } from "@/utils/readFileInputFiles";
function formatMoney(cents, currency) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: currency || "EUR" }).format(cents / 100);
}
function statusLabel(s) {
    switch (s) {
        case "paid":
            return "Bezahlt";
        case "overdue":
            return "Offen / überfällig";
        default:
            return "Noch zu zahlen";
    }
}
export default function FinancePage() {
    const { user, authFetch, logout } = useAuth();
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState([]);
    const [workspaceId, setWorkspaceId] = useState(null);
    const [kind, setKind] = useState("expense");
    const [scope, setScope] = useState("personal");
    const [ownerFilter, setOwnerFilter] = useState(""); // "" = alle sichtbaren
    const [records, setRecords] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState(null);
    const [detail, setDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formTitle, setFormTitle] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formCategory, setFormCategory] = useState("strom");
    const [formPayee, setFormPayee] = useState("");
    const [formDue, setFormDue] = useState("");
    const [formPaid, setFormPaid] = useState(false);
    const [formNotes, setFormNotes] = useState("");
    const [formImage, setFormImage] = useState(null);
    const [formExtra, setFormExtra] = useState(null);
    const [formImageError, setFormImageError] = useState(null);
    const [formImageProcessing, setFormImageProcessing] = useState(false);
    const [formVisibility, setFormVisibility] = useState({});
    const [householdLoading, setHouseholdLoading] = useState(true);
    const [householdNeedsSetup, setHouseholdNeedsSetup] = useState(false);
    const [householdPlan, setHouseholdPlan] = useState(null);
    const [householdFilter, setHouseholdFilter] = useState("");
    const [formLinkedHouseholdId, setFormLinkedHouseholdId] = useState("");
    const [detailHouseholdDraft, setDetailHouseholdDraft] = useState("");
    const [detailHouseholdSaving, setDetailHouseholdSaving] = useState(false);
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
    const reloadRecords = useCallback(async () => {
        if (!workspaceId)
            return;
        setListError(null);
        try {
            const qs = new URLSearchParams({ workspaceId, scope, kind });
            if (ownerFilter)
                qs.set("ownerUserId", ownerFilter);
            if (householdFilter === "__none__")
                qs.set("linkedHouseholdId", "none");
            else if (householdFilter)
                qs.set("linkedHouseholdId", householdFilter);
            const rows = await fetchJson(`/finance/records?${qs.toString()}`);
            setRecords(rows);
        }
        catch {
            setListError("Konnte Einträge nicht laden.");
        }
    }, [workspaceId, scope, kind, ownerFilter, householdFilter, fetchJson]);
    useEffect(() => {
        void reloadRecords();
    }, [reloadRecords]);
    const reloadHouseholdPlan = useCallback(async () => {
        if (!workspaceId) {
            setHouseholdLoading(false);
            setHouseholdPlan(null);
            setHouseholdNeedsSetup(false);
            return;
        }
        setHouseholdLoading(true);
        try {
            const data = await fetchJson(`/finance/household-plan?workspaceId=${encodeURIComponent(workspaceId)}`);
            setHouseholdNeedsSetup(Boolean(data.needsSetup));
            setHouseholdPlan(data.plan);
        }
        catch {
            setHouseholdNeedsSetup(false);
            setHouseholdPlan(null);
        }
        finally {
            setHouseholdLoading(false);
        }
    }, [workspaceId, fetchJson]);
    useEffect(() => {
        void reloadHouseholdPlan();
    }, [reloadHouseholdPlan]);
    const openDetail = async (id) => {
        setDetailLoading(true);
        setDetail(null);
        try {
            const d = await fetchJson(`/finance/records/${id}`);
            setDetail(d);
            setDetailHouseholdDraft(d.linkedHouseholdId ?? "");
        }
        catch {
            setDetail(null);
        }
        finally {
            setDetailLoading(false);
        }
    };
    const resetForm = () => {
        setFormTitle("");
        setFormAmount("");
        setFormCategory("strom");
        setFormPayee("");
        setFormDue("");
        setFormPaid(false);
        setFormNotes("");
        setFormImage(null);
        setFormExtra(null);
        setFormImageError(null);
        setFormImageProcessing(false);
        setFormVisibility({});
        setFormLinkedHouseholdId("");
    };
    const householdNameById = useMemo(() => {
        const m = new Map();
        if (!householdPlan)
            return m;
        for (const h of householdPlan.households)
            m.set(h.id, h.name);
        return m;
    }, [householdPlan]);
    const canEditFinanceDetail = useMemo(() => {
        if (!detail || !user)
            return false;
        if (detail.ownerUserId === user.id)
            return true;
        if (!householdPlan)
            return false;
        return (householdPlan.memberUserIds.includes(user.id) &&
            householdPlan.memberUserIds.includes(detail.ownerUserId));
    }, [detail, user, householdPlan]);
    const saveDetailLinkedHousehold = async () => {
        if (!detail || !canEditFinanceDetail)
            return;
        setDetailHouseholdSaving(true);
        try {
            const res = await authFetch(`/finance/records/${detail.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    linkedHouseholdId: detailHouseholdDraft || null,
                }),
            });
            if (!res.ok)
                return;
            await openDetail(detail.id);
            await reloadRecords();
        }
        finally {
            setDetailHouseholdSaving(false);
        }
    };
    const submitCreate = async () => {
        if (!workspaceId || !user || !formImage || !formTitle.trim())
            return;
        const euros = formAmount.replace(",", ".").trim();
        const cents = Math.round((Number.parseFloat(euros) || 0) * 100);
        const vis = Object.entries(formVisibility)
            .filter(([, v]) => v)
            .map(([id]) => id);
        setSaving(true);
        try {
            const res = await authFetch("/finance/records", {
                method: "POST",
                body: JSON.stringify({
                    workspaceId,
                    scope,
                    kind,
                    category: formCategory,
                    title: formTitle.trim(),
                    amountCents: cents,
                    currency: "EUR",
                    dueDate: formDue ? new Date(formDue).toISOString() : null,
                    paidAt: formPaid ? new Date().toISOString() : null,
                    payee: formPayee.trim() || null,
                    notes: formNotes.trim() || null,
                    imageDataUrl: formImage,
                    extraAttachmentDataUrl: formExtra,
                    visibilityUserIds: vis,
                    linkedHouseholdId: formLinkedHouseholdId || null,
                }),
            });
            if (res.status === 401) {
                await logout();
                navigate("/login", { replace: true });
                return;
            }
            if (!res.ok) {
                const e = (await res.json().catch(() => ({})));
                setListError(e.error ?? "Speichern fehlgeschlagen.");
                return;
            }
            setCreateOpen(false);
            resetForm();
            await reloadRecords();
        }
        finally {
            setSaving(false);
        }
    };
    const markPaid = async (id) => {
        try {
            const res = await authFetch(`/finance/records/${id}`, {
                method: "PATCH",
                body: JSON.stringify({ paidAt: new Date().toISOString() }),
            });
            if (!res.ok)
                return;
            if (detail?.id === id) {
                await openDetail(id);
            }
            await reloadRecords();
        }
        catch {
            /* ignore */
        }
    };
    const removeRecord = async (id) => {
        if (!confirm("Eintrag wirklich löschen?"))
            return;
        try {
            const res = await authFetch(`/finance/records/${id}`, { method: "DELETE" });
            if (!res.ok)
                return;
            setDetail(null);
            await reloadRecords();
        }
        catch {
            /* ignore */
        }
    };
    const mine = useMemo(() => user?.id ?? "", [user?.id]);
    return (_jsxs("div", { className: "min-h-screen w-full bg-[#050816] text-white overflow-x-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.15),transparent_30%)]" }), _jsxs("div", { className: "relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-8", children: [_jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Zur\u00FCck zur App"] }), _jsx(Link, { to: "/vertraege", className: "inline-flex items-center gap-2 text-sm text-violet-300/90 hover:text-violet-100", children: "Zu Vertr\u00E4gen" }), _jsxs("div", { className: "flex items-center gap-2 text-emerald-300", children: [_jsx(Banknote, { className: "h-6 w-6" }), _jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Finanzen" })] })] }), _jsxs("p", { className: "text-sm text-white/60 max-w-3xl mb-6 leading-relaxed", children: ["Dein privater Bereich f\u00FCr ", _jsx("span", { className: "text-white/85", children: "Rechnungen" }), " und", " ", _jsx("span", { className: "text-white/85", children: "Einnahmen" }), " (Lohn, Verk\u00E4ufe, \u2026). Nach dem Fotografieren der Beleg bitte Betrag, F\u00E4lligkeit und Empf\u00E4nger eintragen \u2014 automatische Texterkennung (OCR) k\u00F6nnen wir sp\u00E4ter anbinden. Mit einem eingerichteten Haushaltsplan kannst du Belege optional einem", " ", _jsx("span", { className: "text-white/85", children: "Haushalt zuordnen" }), " (Filter & \u00DCbersicht).", " ", _jsx("span", { className: "text-amber-200/90", children: "Sichtbarkeit: nur du, bis du Workspace-Mitglieder ausw\u00E4hlst. Pro Person filterbar, damit nichts vermischt." })] }), !loading && workspaceId && user ? (householdLoading ? (_jsxs("div", { className: "flex items-center gap-2 text-cyan-200/80 mb-6", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), " Haushaltsplan wird geladen\u2026"] })) : householdNeedsSetup ? (_jsx(FinanceHouseholdWizard, { workspaceId: workspaceId, members: members, currentUserId: user.id, authFetch: authFetch, onDone: () => void reloadHouseholdPlan() })) : householdPlan ? (_jsx(HouseholdBudgetPanel, { plan: householdPlan, workspaceId: workspaceId, currentUserId: user.id, members: members, authFetch: authFetch, onUpdated: () => void reloadHouseholdPlan() })) : null) : null, loading ? (_jsxs("div", { className: "flex items-center gap-2 text-cyan-200/80", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin" }), " Lade Workspaces\u2026"] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex flex-wrap gap-3 mb-6 items-end", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-white/50 mb-1", children: "Workspace" }), _jsx("select", { className: "rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm", value: workspaceId ?? "", onChange: (e) => setWorkspaceId(e.target.value || null), children: workspaces.map((w) => (_jsx("option", { value: w.id, children: w.name }, w.id))) })] }), _jsxs("div", { className: "flex rounded-xl border border-white/15 p-1 bg-black/20", children: [_jsx("button", { type: "button", onClick: () => setKind("expense"), className: `px-4 py-2 rounded-lg text-sm font-medium ${kind === "expense" ? "bg-rose-500/25 text-rose-100" : "text-white/55"}`, children: "Ausgaben" }), _jsx("button", { type: "button", onClick: () => setKind("income"), className: `px-4 py-2 rounded-lg text-sm font-medium ${kind === "income" ? "bg-emerald-500/25 text-emerald-100" : "text-white/55"}`, children: "Einnahmen" })] }), _jsxs("div", { className: "flex rounded-xl border border-white/15 p-1 bg-black/20", children: [_jsx("button", { type: "button", onClick: () => setScope("personal"), className: `px-4 py-2 rounded-lg text-sm ${scope === "personal" ? "bg-cyan-500/20 text-cyan-100" : "text-white/55"}`, children: "Privat" }), _jsx("button", { type: "button", onClick: () => setScope("family"), className: `px-4 py-2 rounded-lg text-sm ${scope === "family" ? "bg-fuchsia-500/20 text-fuchsia-100" : "text-white/55"}`, children: "Familie" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-white/50 mb-1", children: "Eintr\u00E4ge von" }), _jsxs("select", { className: "rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm max-w-[14rem]", value: ownerFilter, onChange: (e) => setOwnerFilter(e.target.value), children: [_jsx("option", { value: "", children: "Alle (die ich sehen darf)" }), _jsx("option", { value: mine, children: "Nur meine" }), members
                                                        .filter((m) => m.userId !== mine)
                                                        .map((m) => (_jsx("option", { value: m.userId, children: m.displayName }, m.userId)))] })] }), householdPlan && !householdNeedsSetup ? (_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-white/50 mb-1", children: "Haushalt" }), _jsxs("select", { className: "rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm max-w-[14rem]", value: householdFilter, onChange: (e) => setHouseholdFilter(e.target.value), children: [_jsx("option", { value: "", children: "Alle Belege" }), _jsx("option", { value: "__none__", children: "Ohne Zuordnung" }), householdPlan.households.map((h) => (_jsx("option", { value: h.id, children: h.name }, h.id)))] })] })) : null, _jsxs(Button, { type: "button", onClick: () => {
                                            resetForm();
                                            setCreateOpen(true);
                                        }, className: "rounded-xl bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 border border-emerald-400/30 text-white ml-auto", children: [_jsx(Plus, { className: "h-4 w-4 mr-2" }), "Neuer Eintrag"] })] }), listError ? _jsx("p", { className: "text-sm text-red-300 mb-4", children: listError }) : null, _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: records.length === 0 ? (_jsx("div", { className: "rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55", children: "Noch keine Eintr\u00E4ge in dieser Ansicht." })) : (records.map((r) => (_jsxs(motion.button, { type: "button", initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, onClick: () => void openDetail(r.id), className: "text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-colors", children: [_jsxs("div", { className: "flex justify-between gap-2 items-start", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-xs text-white/45 uppercase tracking-wide", children: [FINANCE_CATEGORY_LABELS[r.category] ?? r.category, r.ownerUserId === mine ? "" : ` · ${members.find((m) => m.userId === r.ownerUserId)?.displayName ?? "Mitglied"}`] }), _jsx("div", { className: "font-semibold text-lg mt-1", children: r.title }), _jsx("div", { className: "text-emerald-200/90 text-xl mt-1", children: formatMoney(r.amountCents, r.currency) }), r.linkedHouseholdId ? (_jsxs("div", { className: "text-[11px] text-cyan-200/80 mt-1.5", children: ["Haushalt: ", householdNameById.get(r.linkedHouseholdId) ?? "—"] })) : null] }), _jsx("span", { className: `text-xs px-2 py-1 rounded-full shrink-0 ${r.status === "paid"
                                                        ? "bg-emerald-500/20 text-emerald-200"
                                                        : r.status === "overdue"
                                                            ? "bg-red-500/20 text-red-200"
                                                            : "bg-amber-500/20 text-amber-100"}`, children: statusLabel(r.status) })] }), r.dueDate ? (_jsxs("div", { className: "text-xs text-white/50 mt-2 flex items-center gap-1", children: [_jsx(Calendar, { className: "h-3 w-3" }), "F\u00E4llig: ", new Date(r.dueDate).toLocaleDateString("de-DE")] })) : null] }, r.id)))) })] }))] }), createOpen ? (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm", children: _jsxs(Card, { className: "w-full max-w-lg max-h-[90vh] overflow-y-auto border border-cyan-400/25 bg-[#0a1020] text-white", children: [_jsx(CardHeader, { children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Receipt, { className: "h-5 w-5 text-cyan-300" }), kind === "expense" ? "Ausgabe" : "Einnahme", " erfassen"] }) }), _jsxs(CardContent, { className: "space-y-4", children: [_jsx("p", { className: "text-xs text-amber-200/80 bg-amber-500/10 border border-amber-400/20 rounded-lg p-2", children: "Automatische Erkennung von Betrag / F\u00E4lligkeit folgt sp\u00E4ter (OCR/KI). Bitte jetzt ausf\u00FCllen, was auf dem Beleg steht." }), _jsxs("p", { className: "text-xs text-cyan-200/70 border border-cyan-400/15 rounded-lg px-2 py-1.5", children: ["Beleg w\u00E4hlen \u2014 die Vorschau erscheint darunter. Anschlie\u00DFend ", _jsx("strong", { children: "Titel" }), " ausf\u00FCllen und", " ", _jsx("strong", { children: "Speichern" }), " dr\u00FCcken, sonst wird nichts hochgeladen."] }), formImageError ? (_jsx("p", { className: "text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2", children: formImageError })) : null, _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Beleg-Foto *" }), _jsx("input", { type: "file", accept: "image/*", className: "mt-1 text-sm w-full", disabled: formImageProcessing, onChange: (e) => {
                                                const list = readFilesFromFileInputEvent(e);
                                                const f = list[0];
                                                if (!f)
                                                    return;
                                                setFormImageError(null);
                                                setListError(null);
                                                setFormImageProcessing(true);
                                                void (async () => {
                                                    try {
                                                        const url = await fileToAvatarDataUrl(f, 1600, 0.85);
                                                        setFormImage(url);
                                                    }
                                                    catch (err) {
                                                        const msg = err instanceof Error ? err.message : "";
                                                        if (msg === "image_load_failed") {
                                                            setFormImageError("Dieses Bild kann der Browser nicht öffnen (oft: iPhone-HEIC). Bitte als JPEG/PNG speichern oder mit der Kamera „Kompatibel“ nutzen.");
                                                        }
                                                        else {
                                                            setFormImageError("Bild konnte nicht verarbeitet werden. Bitte JPEG oder PNG versuchen.");
                                                        }
                                                    }
                                                    finally {
                                                        setFormImageProcessing(false);
                                                    }
                                                })();
                                            } }), formImageProcessing ? (_jsxs("p", { className: "text-xs text-cyan-200/80 mt-2 flex items-center gap-2", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin shrink-0" }), "Bild wird vorbereitet\u2026"] })) : null, formImage ? (_jsx("div", { className: "mt-3 rounded-xl border border-white/10 overflow-hidden max-h-48 bg-black/30", children: _jsx("img", { src: formImage, alt: "Belegvorschau", className: "w-full max-h-48 object-contain" }) })) : null] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Optional: Vertrag / zweites Bild" }), _jsx("input", { type: "file", accept: "image/*", className: "mt-1 text-sm w-full", onChange: (e) => {
                                                const list = readFilesFromFileInputEvent(e);
                                                const f = list[0];
                                                if (!f)
                                                    return;
                                                void (async () => {
                                                    try {
                                                        setFormExtra(await fileToAvatarDataUrl(f, 1600, 0.85));
                                                    }
                                                    catch {
                                                        /* ignore */
                                                    }
                                                })();
                                            } })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Titel *" }), _jsx(Input, { value: formTitle, onChange: (e) => setFormTitle(e.target.value), className: "mt-1 bg-white/5 border-white/15", placeholder: "z. B. Strom Oktober" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Betrag (EUR)" }), _jsx(Input, { value: formAmount, onChange: (e) => setFormAmount(e.target.value), className: "mt-1 bg-white/5 border-white/15", placeholder: "82,50" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Kategorie" }), _jsx("select", { className: "mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm", value: formCategory, onChange: (e) => setFormCategory(e.target.value), children: FINANCE_CATEGORY_OPTIONS.map(([k, lab]) => (_jsx("option", { value: k, children: lab }, k))) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "An wen zahlen / von wem" }), _jsx(Input, { value: formPayee, onChange: (e) => setFormPayee(e.target.value), className: "mt-1 bg-white/5 border-white/15", placeholder: "z. B. Stadtwerke, Arbeitgeber" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "F\u00E4llig am" }), _jsx(Input, { type: "date", value: formDue, onChange: (e) => setFormDue(e.target.value), className: "mt-1 bg-white/5 border-white/15" })] }), _jsx("div", { className: "flex items-end pb-1", children: _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: formPaid, onChange: (e) => setFormPaid(e.target.checked), className: "rounded" }), "Bereits bezahlt / eingegangen"] }) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Notizen" }), _jsx(Input, { value: formNotes, onChange: (e) => setFormNotes(e.target.value), className: "mt-1 bg-white/5 border-white/15", placeholder: "Vertragsnummer, IBAN, \u2026" })] }), householdPlan && !householdNeedsSetup ? (_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Beleg einem Haushalt zuordnen (optional)" }), _jsxs("select", { className: "mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm", value: formLinkedHouseholdId, onChange: (e) => setFormLinkedHouseholdId(e.target.value), children: [_jsx("option", { value: "", children: "Keine Zuordnung" }), householdPlan.households.map((h) => (_jsx("option", { value: h.id, children: h.name }, h.id)))] })] })) : null, _jsxs("div", { children: [_jsxs("label", { className: "text-xs text-white/55 flex items-center gap-1", children: [_jsx(Users, { className: "h-3 w-3" }), " Mit Workspace-Mitgliedern teilen (Lesen)"] }), _jsxs("div", { className: "mt-2 space-y-2 max-h-32 overflow-y-auto", children: [members
                                                    .filter((m) => m.userId !== mine)
                                                    .map((m) => (_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(formVisibility[m.userId]), onChange: (e) => setFormVisibility((prev) => ({ ...prev, [m.userId]: e.target.checked })) }), m.displayName] }, m.userId))), members.filter((m) => m.userId !== mine).length === 0 ? (_jsx("span", { className: "text-xs text-white/45", children: "Keine weiteren Mitglieder im Workspace." })) : null] })] }), _jsxs("div", { className: "flex gap-2 pt-2", children: [_jsx(Button, { type: "button", disabled: saving || !formImage || !formTitle.trim(), onClick: () => void submitCreate(), className: "flex-1 rounded-xl bg-cyan-500/25 border border-cyan-400/35", children: saving ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : "Speichern" }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setCreateOpen(false), className: "rounded-xl", children: "Abbrechen" })] })] })] }) })) : null, detail || detailLoading ? (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm", children: _jsxs(Card, { className: "w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-violet-400/25 bg-[#0a1020] text-white", children: [_jsxs(CardHeader, { className: "flex flex-row items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: detailLoading ? "…" : detail?.title }), detail ? (_jsxs("p", { className: "text-sm text-white/55 mt-1", children: [FINANCE_CATEGORY_LABELS[detail.category] ?? detail.category, " \u00B7", " ", formatMoney(detail.amountCents, detail.currency)] })) : null] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => setDetail(null), className: "shrink-0", children: "Schlie\u00DFen" })] }), _jsx(CardContent, { className: "space-y-4", children: detailLoading ? (_jsx(Loader2, { className: "h-8 w-8 animate-spin text-cyan-400" })) : detail ? (_jsxs(_Fragment, { children: [detail.imageDataUrl ? (_jsx("div", { className: "rounded-xl overflow-hidden border border-white/10", children: _jsx("img", { src: detail.imageDataUrl, alt: "", className: "w-full max-h-80 object-contain bg-black/40" }) })) : null, detail.extraAttachmentDataUrl ? (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-white/50 mb-1", children: "Zweites Dokument" }), _jsx("div", { className: "rounded-xl overflow-hidden border border-white/10", children: _jsx("img", { src: detail.extraAttachmentDataUrl, alt: "", className: "w-full max-h-64 object-contain bg-black/40" }) })] })) : null, _jsxs("div", { className: "grid grid-cols-2 gap-2 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-white/45", children: "Status:" }), " ", statusLabel(detail.status)] }), detail.payee ? (_jsxs("div", { children: [_jsx("span", { className: "text-white/45", children: "Empf\u00E4nger:" }), " ", detail.payee] })) : null, detail.dueDate ? (_jsxs("div", { children: [_jsx("span", { className: "text-white/45", children: "F\u00E4llig:" }), " ", new Date(detail.dueDate).toLocaleDateString("de-DE")] })) : null, detail.paidAt ? (_jsxs("div", { children: [_jsx("span", { className: "text-white/45", children: "Bezahlt am:" }), " ", new Date(detail.paidAt).toLocaleDateString("de-DE")] })) : null, householdPlan && !householdNeedsSetup ? (_jsxs("div", { className: "col-span-2 space-y-2", children: [_jsx("span", { className: "text-white/45", children: "Haushalt:" }), " ", canEditFinanceDetail ? (_jsxs("div", { className: "flex flex-wrap items-center gap-2 mt-1", children: [_jsxs("select", { className: "rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm flex-1 min-w-[12rem]", value: detailHouseholdDraft, onChange: (e) => setDetailHouseholdDraft(e.target.value), children: [_jsx("option", { value: "", children: "Keine Zuordnung" }), householdPlan.households.map((h) => (_jsx("option", { value: h.id, children: h.name }, h.id)))] }), _jsx(Button, { type: "button", variant: "ghost", disabled: detailHouseholdSaving ||
                                                                    (detailHouseholdDraft || "") === (detail.linkedHouseholdId ?? ""), onClick: () => void saveDetailLinkedHousehold(), className: "text-xs py-2 px-3 border border-white/15 shrink-0", children: detailHouseholdSaving ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : ("Speichern") })] })) : (_jsx("span", { className: "text-white/85", children: detail.linkedHouseholdId
                                                            ? householdNameById.get(detail.linkedHouseholdId) ?? "—"
                                                            : "—" }))] })) : null] }), detail.notes ? (_jsx("p", { className: "text-sm text-white/75 whitespace-pre-wrap", children: detail.notes })) : null, canEditFinanceDetail ? (_jsxs("div", { className: "flex flex-wrap gap-2 pt-2", children: [detail.status !== "paid" && detail.kind === "expense" ? (_jsxs(Button, { type: "button", onClick: () => void markPaid(detail.id), className: "rounded-xl bg-emerald-500/25 border border-emerald-400/35", children: [_jsx(Check, { className: "h-4 w-4 mr-2" }), " Als bezahlt markieren"] })) : null, detail.status !== "paid" && detail.kind === "income" ? (_jsxs(Button, { type: "button", onClick: () => void markPaid(detail.id), className: "rounded-xl bg-emerald-500/25 border border-emerald-400/35", children: [_jsx(Check, { className: "h-4 w-4 mr-2" }), " Als eingegangen markieren"] })) : null, _jsxs(Button, { type: "button", variant: "ghost", onClick: () => void removeRecord(detail.id), className: "text-red-300 hover:text-red-100 hover:bg-red-500/15", children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), " L\u00F6schen"] })] })) : (_jsx("p", { className: "text-xs text-white/45", children: "Keine Berechtigung zum \u00C4ndern oder L\u00F6schen." }))] })) : (_jsx("p", { className: "text-red-300", children: "Konnte Details nicht laden." })) })] }) })) : null] }));
}
