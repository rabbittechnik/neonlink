import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Home, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sumHouseholdMonthlyCents } from "@/constants/householdFixedCosts";
import { HouseholdCostFields } from "./HouseholdCostFields";
function formatMoney(cents) {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
export function HouseholdBudgetPanel({ plan, workspaceId, currentUserId, members, authFetch, onUpdated, }) {
    const [rows, setRows] = useState(plan.households);
    const [memberIds, setMemberIds] = useState(plan.memberUserIds);
    const [savingCosts, setSavingCosts] = useState(false);
    const [savingMembers, setSavingMembers] = useState(false);
    const [notice, setNotice] = useState(null);
    useEffect(() => {
        setRows(plan.households);
        setMemberIds(plan.memberUserIds);
    }, [plan]);
    const isOwner = plan.ownerUserId === currentUserId;
    const others = members.filter((m) => m.userId !== plan.ownerUserId);
    const grandTotal = useMemo(() => rows.reduce((acc, h) => acc + sumHouseholdMonthlyCents(h.costs), 0), [rows]);
    const updateRow = (idx, patch) => {
        setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch, costs: patch.costs ?? r.costs } : r)));
    };
    const saveCosts = async () => {
        setSavingCosts(true);
        setNotice(null);
        try {
            const res = await authFetch("/finance/household-plan", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId, households: rows }),
            });
            if (!res.ok) {
                setNotice("Fixkosten konnten nicht gespeichert werden.");
                return;
            }
            setNotice("Fixkosten gespeichert.");
            onUpdated();
        }
        catch {
            setNotice("Netzwerkfehler.");
        }
        finally {
            setSavingCosts(false);
        }
    };
    const toggleMember = (userId) => {
        if (userId === plan.ownerUserId)
            return;
        setMemberIds((prev) => prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]);
    };
    const saveMembers = async () => {
        if (!isOwner)
            return;
        setSavingMembers(true);
        setNotice(null);
        try {
            const next = [...new Set([plan.ownerUserId, ...memberIds.filter((id) => id !== plan.ownerUserId)])];
            const res = await authFetch("/finance/household-plan", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId, memberUserIds: next }),
            });
            if (!res.ok) {
                const j = (await res.json().catch(() => ({})));
                setNotice(j.error === "user_in_existing_shared_plan"
                    ? "Eine Person ist bereits in einem anderen gemeinsamen Plan."
                    : "Mitglieder konnten nicht aktualisiert werden.");
                return;
            }
            setNotice("Mitglieder aktualisiert.");
            onUpdated();
        }
        catch {
            setNotice("Netzwerkfehler.");
        }
        finally {
            setSavingMembers(false);
        }
    };
    const nameFor = (uid) => members.find((m) => m.userId === uid)?.displayName ?? uid;
    return (_jsxs(Card, { className: "border border-cyan-400/20 bg-[#0a1020]/90 text-white mb-8", children: [_jsxs(CardHeader, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2 text-lg text-cyan-100", children: [_jsx(Home, { className: "h-5 w-5 text-cyan-300" }), "Haushalte & monatliche Fixkosten"] }), _jsxs("p", { className: "text-sm text-white/55 font-normal", children: ["Alle Betr\u00E4ge sind ", _jsx("strong", { className: "text-white/80", children: "monatlich wiederkehrend" }), ". Summe aller Haushalte:", " ", _jsx("span", { className: "text-emerald-200 font-semibold", children: formatMoney(grandTotal) })] })] }), _jsxs(CardContent, { className: "space-y-6", children: [_jsxs("div", { className: "rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3", children: [_jsx("div", { className: "text-xs text-white/50 uppercase tracking-wide", children: "Gemeinsamer Zugriff" }), !isOwner ? (_jsxs("p", { className: "text-sm text-white/70", children: ["Du nutzt den gemeinsamen Plan von ", _jsx("strong", { className: "text-white", children: nameFor(plan.ownerUserId) }), ". Mit im Plan: ", plan.memberUserIds.map((id) => nameFor(id)).join(", ")] })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-sm text-white/60", children: "Ausgew\u00E4hlte Personen sehen denselben Haushaltsplan und eure Vertr\u00E4ge in diesem Workspace." }), others.length === 0 ? (_jsx("p", { className: "text-sm text-white/45", children: "Keine weiteren Mitglieder." })) : (_jsx("ul", { className: "space-y-2 max-h-36 overflow-y-auto", children: others.map((m) => (_jsx("li", { children: _jsxs("label", { className: "flex items-center gap-2 text-sm cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: memberIds.includes(m.userId), onChange: () => toggleMember(m.userId), className: "rounded border-white/30" }), m.displayName] }) }, m.userId))) })), _jsx(Button, { type: "button", variant: "ghost", disabled: savingMembers, onClick: () => void saveMembers(), className: "text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15", children: savingMembers ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "h-4 w-4 mr-1 inline" }), " Mitglieder speichern"] })) })] }))] }), rows.map((h, idx) => (_jsxs("div", { className: "rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap justify-between gap-2 items-end", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("label", { className: "text-xs text-white/55 block mb-1", children: "Haushalt" }), _jsx(Input, { value: h.name, onChange: (e) => updateRow(idx, { name: e.target.value }), className: "max-w-md bg-white/5 border-white/15" })] }), _jsxs("div", { className: "text-right", children: [_jsx("div", { className: "text-[10px] text-white/45 uppercase", children: "Summe / Monat" }), _jsx("div", { className: "text-lg font-semibold text-emerald-200", children: formatMoney(sumHouseholdMonthlyCents(h.costs)) })] })] }), _jsx(HouseholdCostFields, { costs: h.costs, onChange: (costs) => updateRow(idx, { costs }) })] }, h.id))), _jsxs(Button, { type: "button", disabled: savingCosts, onClick: () => void saveCosts(), className: "rounded-xl bg-gradient-to-r from-cyan-500/30 to-emerald-500/25 border border-cyan-400/25 text-white", children: [savingCosts ? (_jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin inline" })) : (_jsx(Save, { className: "h-4 w-4 mr-2 inline" })), "Fixkosten speichern"] }), notice ? (_jsx("p", { className: "text-sm text-cyan-200/90 border border-cyan-400/20 rounded-lg px-3 py-2 bg-cyan-500/10", children: notice })) : null] })] }));
}
