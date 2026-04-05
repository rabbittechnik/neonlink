import type { HouseholdMonthlyFixedCosts, MietePaidBy } from "@/types/financeHousehold";
import {
  HOUSEHOLD_SIMPLE_COST_KEYS,
  MIETE_PAID_LABELS,
  centsToEurosInput,
  eurosStringToCents,
} from "@/constants/householdFixedCosts";
import { Input } from "@/components/ui/input";

type Props = {
  costs: HouseholdMonthlyFixedCosts;
  onChange: (next: HouseholdMonthlyFixedCosts) => void;
  disabled?: boolean;
};

export function HouseholdCostFields({ costs, onChange, disabled }: Props) {
  const setMietePaidBy = (mietePaidBy: MietePaidBy) => onChange({ ...costs, mietePaidBy });

  const setCents = (centsKey: keyof HouseholdMonthlyFixedCosts, raw: string) => {
    if (centsKey === "mietePaidBy") return;
    onChange({ ...costs, [centsKey]: eurosStringToCents(raw) } as HouseholdMonthlyFixedCosts);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/55 block mb-1">Miete (monatlich, EUR)</label>
          <Input
            disabled={disabled}
            value={centsToEurosInput(costs.mieteCents)}
            onChange={(e) => setCents("mieteCents", e.target.value)}
            className="bg-white/5 border-white/15"
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="text-xs text-white/55 block mb-1">Miete zahlt</label>
          <select
            disabled={disabled}
            className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm"
            value={costs.mietePaidBy}
            onChange={(e) => setMietePaidBy(e.target.value as MietePaidBy)}
          >
            {(Object.keys(MIETE_PAID_LABELS) as MietePaidBy[]).map((k) => (
              <option key={k} value={k} className="bg-[#121c31]">
                {MIETE_PAID_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HOUSEHOLD_SIMPLE_COST_KEYS.map(({ centsKey, label, hint }) => (
          <div key={centsKey}>
            <label className="text-xs text-white/55 block mb-1" title={hint}>
              {label}
              {hint ? <span className="text-white/35 ml-1">({hint})</span> : null}
            </label>
            <Input
              disabled={disabled}
              value={centsToEurosInput(costs[centsKey] as number)}
              onChange={(e) => setCents(centsKey, e.target.value)}
              className="bg-white/5 border-white/15"
              placeholder="0,00"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
