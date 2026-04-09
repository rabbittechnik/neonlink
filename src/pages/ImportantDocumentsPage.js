import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileBadge2, Loader2, Search, Trash2, Upload, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/auth/AuthContext";
import { readFilesFromFileInputEvent } from "@/utils/readFileInputFiles";
import { fileToContractDataUrl } from "@/utils/fileToContractDataUrl";
const DOC_CATEGORIES = [
    "geburtsurkunde",
    "heiratsurkunde",
    "meldebestaetigung",
    "personalausweis",
    "reisepass",
    "krankenkasse",
    "kfz_versicherung",
    "versicherungsschein",
    "lohnabrechnung",
    "rentenunterlagen",
    "steuer",
    "schule_kita",
    "sonstiges",
];
const DOC_LABELS = {
    geburtsurkunde: "Geburtsurkunde",
    heiratsurkunde: "Heiratsurkunde",
    meldebestaetigung: "Meldebestätigung",
    personalausweis: "Personalausweis",
    reisepass: "Reisepass",
    krankenkasse: "Krankenkasse",
    kfz_versicherung: "Kfz-Versicherung",
    versicherungsschein: "Versicherungsschein",
    lohnabrechnung: "Lohnabrechnung",
    rentenunterlagen: "Rentenunterlagen",
    steuer: "Steuer",
    schule_kita: "Schule / Kita",
    sonstiges: "Sonstiges",
};
export default function ImportantDocumentsPage() {
    const { user, authFetch, logout } = useAuth();
    const navigate = useNavigate();
    const [workspaces, setWorkspaces] = useState([]);
    const [workspaceId, setWorkspaceId] = useState(null);
    const [members, setMembers] = useState([]);
    const [records, setRecords] = useState([]);
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [ownerFilter, setOwnerFilter] = useState("");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("geburtsurkunde");
    const [newFiles, setNewFiles] = useState([]);
    const [newVisibility, setNewVisibility] = useState({});
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [selected, setSelected] = useState(null);
    const [selectedLoading, setSelectedLoading] = useState(false);
    const mine = useMemo(() => user?.id ?? "", [user?.id]);
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
                if (!c)
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
                if (!c)
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
        setError(null);
        try {
            const rows = [];
            const cats = activeCategory === "all" ? DOC_CATEGORIES : [activeCategory];
            for (const cat of cats) {
                const qs = new URLSearchParams({ workspaceId, scope: "family", categoryKey: cat });
                if (ownerFilter)
                    qs.set("ownerUserId", ownerFilter);
                const batch = await fetchJson(`/contracts/bundles?${qs.toString()}`);
                rows.push(...batch);
            }
            rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
            setRecords(rows);
        }
        catch {
            setError("Konnte Unterlagen nicht laden.");
            setRecords([]);
        }
    }, [workspaceId, activeCategory, ownerFilter, fetchJson]);
    useEffect(() => {
        void reloadRecords();
    }, [reloadRecords]);
    useEffect(() => {
        if (!selectedId) {
            setSelected(null);
            return;
        }
        let cancelled = false;
        setSelectedLoading(true);
        void (async () => {
            try {
                const d = await fetchJson(`/contracts/bundles/${selectedId}`);
                if (!cancelled)
                    setSelected(d);
            }
            catch {
                if (!cancelled)
                    setSelected(null);
            }
            finally {
                if (!cancelled)
                    setSelectedLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [selectedId, fetchJson]);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return records.filter((doc) => {
            if (!q)
                return true;
            return (doc.title.toLowerCase().includes(q) ||
                DOC_LABELS[doc.categoryKey]?.toLowerCase().includes(q));
        });
    }, [records, activeCategory, search]);
    const uploadDoc = async () => {
        if (!workspaceId || !title.trim() || newFiles.length === 0)
            return;
        setSaving(true);
        try {
            const pages = await Promise.all(newFiles.map((f) => fileToContractDataUrl(f)));
            const visibilityUserIds = Object.entries(newVisibility)
                .filter(([, v]) => v)
                .map(([id]) => id);
            const res = await authFetch("/contracts/bundles", {
                method: "POST",
                body: JSON.stringify({
                    workspaceId,
                    scope: "family",
                    categoryKey: category,
                    title: title.trim(),
                    pageDataUrls: pages,
                    visibilityUserIds,
                }),
            });
            if (!res.ok) {
                setError("Speichern fehlgeschlagen.");
                return;
            }
            setTitle("");
            setCategory("geburtsurkunde");
            setNewFiles([]);
            setNewVisibility({});
            await reloadRecords();
        }
        finally {
            setSaving(false);
        }
    };
    const removeDoc = (id) => {
        void (async () => {
            if (!confirm("Unterlage wirklich löschen?"))
                return;
            const res = await authFetch(`/contracts/bundles/${id}`, { method: "DELETE" });
            if (!res.ok)
                return;
            setSelected(null);
            setSelectedId(null);
            await reloadRecords();
        })();
    };
    return (_jsxs("div", { className: "min-h-screen w-full bg-[#050816] text-white overflow-x-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(16,185,129,0.16),transparent_30%)]" }), _jsxs("div", { className: "relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4 mb-6", children: [_jsxs(Link, { to: "/", className: "inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100", children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Zur\u00FCck zur App"] }), _jsxs("div", { className: "flex items-center gap-2 text-emerald-300", children: [_jsx(FileBadge2, { className: "h-6 w-6" }), _jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Wichtige Unterlagen" })] })] }), _jsxs("p", { className: "text-sm text-white/65 max-w-3xl mb-6", children: ["Pro Upload w\u00E4hlst du, welche Workspace-Mitglieder Zugriff erhalten. Ohne Auswahl bleibt die Unterlage nur f\u00FCr dich sichtbar. \u00DCber Rubriken wie ", _jsx("span", { className: "text-white/90", children: "Geburtsurkunde" }), " findest du alles schneller wieder."] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4", children: [_jsxs(Card, { className: "lg:col-span-4 border border-emerald-400/25 bg-[#0a1020] text-white", children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "Neue Unterlage" }) }), _jsxs(CardContent, { className: "space-y-3", children: [error ? _jsx("p", { className: "text-sm text-red-300", children: error }) : null, _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Workspace" }), _jsx("select", { value: workspaceId ?? "", onChange: (e) => setWorkspaceId(e.target.value || null), className: "mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm", children: workspaces.map((w) => (_jsx("option", { value: w.id, children: w.name }, w.id))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Datei(en) (Bild/PDF) *" }), _jsx("input", { type: "file", multiple: true, accept: "image/*,application/pdf", className: "mt-1 text-sm w-full", onChange: (e) => {
                                                            setError(null);
                                                            setNewFiles(readFilesFromFileInputEvent(e));
                                                        } })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Titel *" }), _jsx(Input, { value: title, onChange: (e) => setTitle(e.target.value), className: "mt-1 bg-white/5 border-white/15", placeholder: "z. B. Max Mustermann Geburtsurkunde" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55", children: "Rubrik" }), _jsx("select", { value: category, onChange: (e) => setCategory(e.target.value), className: "mt-1 w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm", children: DOC_CATEGORIES.map((key) => (_jsx("option", { value: key, children: DOC_LABELS[key] }, key))) })] }), _jsxs("div", { children: [_jsxs("label", { className: "text-xs text-white/55 flex items-center gap-1", children: [_jsx(Users, { className: "h-3 w-3" }), " Sichtbar f\u00FCr Mitglieder (optional)"] }), _jsx("div", { className: "mt-2 space-y-2 max-h-32 overflow-y-auto", children: members
                                                            .filter((m) => m.userId !== mine)
                                                            .map((m) => (_jsxs("label", { className: "flex items-center gap-2 text-sm", children: [_jsx("input", { type: "checkbox", checked: Boolean(newVisibility[m.userId]), onChange: (e) => setNewVisibility((prev) => ({ ...prev, [m.userId]: e.target.checked })) }), m.displayName] }, m.userId))) })] }), _jsxs(Button, { type: "button", disabled: !workspaceId || newFiles.length === 0 || !title.trim() || saving, onClick: () => void uploadDoc(), className: "w-full rounded-xl bg-emerald-500/25 border border-emerald-400/35", children: [_jsx(Upload, { className: "h-4 w-4 mr-2" }), saving ? "Speichern…" : "Unterlage speichern"] })] })] }), _jsxs("div", { className: "lg:col-span-8 space-y-4", children: [_jsx(Card, { className: "border border-white/10 bg-white/5 text-white", children: _jsxs(CardContent, { className: "pt-5 space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" }), _jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), className: "pl-9 bg-white/5 border-white/15", placeholder: "Schnellsuche nach Titel, Datei, Rubrik\u2026" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-white/50 mb-1", children: "Eintr\u00E4ge von" }), _jsxs("select", { className: "rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm max-w-[14rem]", value: ownerFilter, onChange: (e) => setOwnerFilter(e.target.value), children: [_jsx("option", { value: "", children: "Alle (die ich sehen darf)" }), _jsx("option", { value: mine, children: "Nur meine" }), members
                                                                    .filter((m) => m.userId !== mine)
                                                                    .map((m) => (_jsx("option", { value: m.userId, children: m.displayName }, m.userId)))] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("button", { type: "button", onClick: () => setActiveCategory("all"), className: `px-3 py-1.5 rounded-full text-xs border ${activeCategory === "all"
                                                                ? "bg-cyan-500/25 border-cyan-300/40 text-cyan-100"
                                                                : "bg-white/5 border-white/10 text-white/70"}`, children: "Alle" }), DOC_CATEGORIES.map((key) => (_jsx("button", { type: "button", onClick: () => setActiveCategory(key), className: `px-3 py-1.5 rounded-full text-xs border ${activeCategory === key
                                                                ? "bg-emerald-500/25 border-emerald-300/40 text-emerald-100"
                                                                : "bg-white/5 border-white/10 text-white/70"}`, children: DOC_LABELS[key] }, key)))] })] }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: loading ? (_jsxs("div", { className: "md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55", children: [_jsx(Loader2, { className: "h-5 w-5 animate-spin inline-block mr-2" }), "Lade Unterlagen\u2026"] })) : filtered.length === 0 ? (_jsx("div", { className: "md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/55", children: "Keine Unterlagen f\u00FCr diese Auswahl gefunden." })) : (filtered.map((doc) => (_jsxs("button", { type: "button", onClick: () => setSelectedId(doc.id), className: "text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-colors", children: [_jsx("div", { className: "text-[11px] uppercase tracking-wide text-white/55", children: DOC_LABELS[doc.categoryKey ?? "sonstiges"] ?? doc.categoryKey }), _jsx("div", { className: "text-base font-semibold mt-1", children: doc.title }), _jsxs("div", { className: "text-xs text-white/60 mt-1 truncate", children: [doc.pageCount, " Seite(n)"] }), _jsx("div", { className: "text-xs text-white/45 mt-2", children: new Date(doc.createdAt).toLocaleDateString("de-DE") })] }, doc.id)))) })] })] })] }), selected || selectedLoading ? (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm", children: _jsxs(Card, { className: "w-full max-w-3xl max-h-[92vh] overflow-y-auto border border-emerald-400/25 bg-[#0a1020] text-white", children: [_jsxs(CardHeader, { className: "flex flex-row items-start justify-between gap-4", children: [_jsxs("div", { children: [_jsx(CardTitle, { children: selectedLoading ? "Lädt…" : selected?.title }), selected ? (_jsx("p", { className: "text-sm text-white/60 mt-1", children: DOC_LABELS[selected.categoryKey ?? "sonstiges"] ?? selected.categoryKey })) : null] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Button, { type: "button", variant: "ghost", onClick: () => selected && removeDoc(selected.id), className: "text-red-300", disabled: !selected, children: [_jsx(Trash2, { className: "h-4 w-4 mr-2" }), " L\u00F6schen"] }), _jsx(Button, { type: "button", variant: "ghost", onClick: () => {
                                                setSelectedId(null);
                                                setSelected(null);
                                            }, children: "Schlie\u00DFen" })] })] }), _jsxs(CardContent, { className: "space-y-4", children: [selectedLoading ? _jsx(Loader2, { className: "h-6 w-6 animate-spin text-cyan-200" }) : null, selected?.pageDataUrls?.map((url, idx) => (_jsx("div", { className: "rounded-xl overflow-hidden border border-white/10 bg-black/40", children: url.startsWith("data:application/pdf") ? (_jsxs("a", { href: url, download: `${selected.title}-seite-${idx + 1}.pdf`, className: "inline-flex items-center gap-2 rounded-xl border border-cyan-300/35 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/25 m-3", children: ["PDF Seite ", idx + 1, " herunterladen"] })) : (_jsx("img", { src: url, alt: `${selected.title} ${idx + 1}`, className: "w-full max-h-[70vh] object-contain" })) }, `${selected.id}-${idx}`)))] })] }) })) : null] }));
}
