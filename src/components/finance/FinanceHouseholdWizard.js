import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyHouseholdCosts } from "@/constants/householdFixedCosts";
import { HouseholdCostFields } from "./HouseholdCostFields";
export function FinanceHouseholdWizard({ workspaceId, members, currentUserId, authFetch, onDone }) {
    const others = members.filter((m) => m.userId !== currentUserId);
    const [count, setCount] = useState(1);
    const [shareIds, setShareIds] = useState([]);
    const [households, setHouseholds] = useState([{ name: "Haushalt 1", costs: emptyHouseholdCosts() }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        setHouseholds((prev) => {
            const next = prev.slice(0, count);
            while (next.length < count) {
                next.push({ name: `Haushalt ${next.length + 1}`, costs: emptyHouseholdCosts() });
            }
            return next.map((h, i) => ({
                ...h,
                name: h.name || `Haushalt ${i + 1}`,
            }));
        });
    }, [count]);
    const updateHousehold = (idx, patch) => {
        setHouseholds((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch, costs: patch.costs ?? h.costs } : h)));
    };
    const toggleShare = (userId) => {
        setShareIds((prev) => (prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]));
    };
    const submit = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await authFetch("/finance/household-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId,
                    shareWithUserIds: shareIds,
                    households: households.map((h) => ({ name: h.name.trim(), costs: h.costs })),
                }),
            });
            if (!res.ok) {
                const j = (await res.json().catch(() => ({})));
                if (res.status === 409) {
                    setError(j.error === "user_in_existing_shared_plan"
                        ? "Mindestens eine ausgewählte Person ist bereits in einem gemeinsamen Finanzplan."
                        : j.error === "plan_already_exists"
                            ? "Für dich existiert bereits ein Haushaltsplan – bitte Seite neu laden."
                            : "Konnte nicht speichern.");
                }
                else {
                    setError("Ersteinrichtung fehlgeschlagen. Bitte prüfen und erneut versuchen.");
                }
                return;
            }
            onDone();
        }
        catch {
            setError("Netzwerkfehler.");
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs(Card, { className: "border border-emerald-400/25 bg-[#0a1020]/95 text-white mb-8", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2 text-lg text-emerald-100", children: [_jsx(Users, { className: "h-5 w-5 text-emerald-300" }), "Finanzen \u2013 Ersteinrichtung Haushalte"] }), _jsxs("p", { className: "text-sm text-white/60 font-normal leading-relaxed", children: ["Lege fest, wie viele Haushalte du f\u00FChrst und welche Fixkosten monatlich anfallen. Optional w\u00E4hlst du Workspace-Mitglieder, die ", _jsx("strong", { className: "text-white/85", children: "denselben Plan" }), " sehen \u2013 inkl. Vertr\u00E4ge. Diese Personen haben ", _jsx("strong", { className: "text-white/85", children: "keine eigene Ersteinrichtung" }), "; alles bleibt synchron, ohne doppelte Erfassung."] })] }), _jsxs(CardContent, { className: "space-y-8", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55 block mb-2", children: "Wie viele Haushalte gibt es?" }), _jsx("select", { className: "w-full max-w-xs rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm", value: count, onChange: (e) => setCount(Number(e.target.value) || 1), children: Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (_jsx("option", { value: n, className: "bg-[#121c31]", children: n }, n))) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55 block mb-2", children: "Wer darf Finanzplan & Vertr\u00E4ge sehen? (optional)" }), others.length === 0 ? (_jsx("p", { className: "text-sm text-white/45", children: "Keine weiteren Mitglieder in diesem Workspace." })) : (_jsx("ul", { className: "space-y-2 max-h-40 overflow-y-auto rounded-xl border border-white/10 p-2 bg-black/20", children: others.map((m) => (_jsx("li", { children: _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: shareIds.includes(m.userId), onChange: () => toggleShare(m.userId), className: "rounded border-white/30" }), m.displayName] }) }, m.userId))) }))] })] }), _jsxs("div", { className: "space-y-6", children: [_jsx("h3", { className: "text-sm font-semibold text-cyan-200/90", children: "Monatliche Fixkosten pro Haushalt" }), households.map((h, idx) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55 block mb-1", children: "Name des Haushalts" }), _jsx(Input, { value: h.name, onChange: (e) => updateHousehold(idx, { name: e.target.value }), className: "max-w-md bg-white/5 border-white/15", placeholder: `Haushalt ${idx + 1}` })] }), _jsx(HouseholdCostFields, { costs: h.costs, onChange: (costs) => updateHousehold(idx, { costs }) })] }, idx)))] }), error ? _jsx("p", { className: "text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2", children: error }) : null, _jsx(Button, { type: "button", disabled: saving, onClick: () => void submit(), className: "rounded-xl bg-gradient-to-r from-emerald-500/40 to-cyan-500/35 border border-emerald-400/30 text-white", children: saving ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin inline" }), " Speichern\u2026"] })) : ("Ersteinrichtung abschließen") })] })] }));
}
