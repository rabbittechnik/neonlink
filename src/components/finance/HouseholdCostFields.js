import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HOUSEHOLD_SIMPLE_COST_KEYS, MIETE_PAID_LABELS, centsToEurosInput, eurosStringToCents, } from "@/constants/householdFixedCosts";
import { Input } from "@/components/ui/input";
export function HouseholdCostFields({ costs, onChange, disabled }) {
    const setMietePaidBy = (mietePaidBy) => onChange({ ...costs, mietePaidBy });
    const setCents = (centsKey, raw) => {
        if (centsKey === "mietePaidBy")
            return;
        onChange({ ...costs, [centsKey]: eurosStringToCents(raw) });
    };
    return (_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55 block mb-1", children: "Miete (monatlich, EUR)" }), _jsx(Input, { disabled: disabled, value: centsToEurosInput(costs.mieteCents), onChange: (e) => setCents("mieteCents", e.target.value), className: "bg-white/5 border-white/15", placeholder: "0,00" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-white/55 block mb-1", children: "Miete zahlt" }), _jsx("select", { disabled: disabled, className: "w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm", value: costs.mietePaidBy, onChange: (e) => setMietePaidBy(e.target.value), children: Object.keys(MIETE_PAID_LABELS).map((k) => (_jsx("option", { value: k, className: "bg-[#121c31]", children: MIETE_PAID_LABELS[k] }, k))) })] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: HOUSEHOLD_SIMPLE_COST_KEYS.map(({ centsKey, label, hint }) => (_jsxs("div", { children: [_jsxs("label", { className: "text-xs text-white/55 block mb-1", title: hint, children: [label, hint ? _jsxs("span", { className: "text-white/35 ml-1", children: ["(", hint, ")"] }) : null] }), _jsx(Input, { disabled: disabled, value: centsToEurosInput(costs[centsKey]), onChange: (e) => setCents(centsKey, e.target.value), className: "bg-white/5 border-white/15", placeholder: "0,00" })] }, centsKey))) })] }));
}
