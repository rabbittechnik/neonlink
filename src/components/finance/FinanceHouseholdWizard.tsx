import React, { useEffect, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HouseholdMonthlyFixedCosts } from "@/types/financeHousehold";
import { emptyHouseholdCosts } from "@/constants/householdFixedCosts";
import { HouseholdCostFields } from "./HouseholdCostFields";

type Props = {
  workspaceId: string;
  members: Array<{ userId: string; displayName: string }>;
  currentUserId: string;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  onDone: () => void;
};

export function FinanceHouseholdWizard({ workspaceId, members, currentUserId, authFetch, onDone }: Props) {
  const others = members.filter((m) => m.userId !== currentUserId);
  const [count, setCount] = useState(1);
  const [shareIds, setShareIds] = useState<string[]>([]);
  const [households, setHouseholds] = useState<
    Array<{ name: string; costs: HouseholdMonthlyFixedCosts }>
  >([{ name: "Haushalt 1", costs: emptyHouseholdCosts() }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const updateHousehold = (idx: number, patch: Partial<{ name: string; costs: HouseholdMonthlyFixedCosts }>) => {
    setHouseholds((prev) =>
      prev.map((h, i) => (i === idx ? { ...h, ...patch, costs: patch.costs ?? h.costs } : h))
    );
  };

  const toggleShare = (userId: string) => {
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
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 409) {
          setError(
            j.error === "user_in_existing_shared_plan"
              ? "Mindestens eine ausgewählte Person ist bereits in einem gemeinsamen Finanzplan."
              : j.error === "plan_already_exists"
                ? "Für dich existiert bereits ein Haushaltsplan – bitte Seite neu laden."
                : "Konnte nicht speichern."
          );
        } else {
          setError("Ersteinrichtung fehlgeschlagen. Bitte prüfen und erneut versuchen.");
        }
        return;
      }
      onDone();
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border border-emerald-400/25 bg-[#0a1020]/95 text-white mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-emerald-100">
          <Users className="h-5 w-5 text-emerald-300" />
          Finanzen – Ersteinrichtung Haushalte
        </CardTitle>
        <p className="text-sm text-white/60 font-normal leading-relaxed">
          Lege fest, wie viele Haushalte du führst und welche Fixkosten monatlich anfallen. Optional wählst du
          Workspace-Mitglieder, die <strong className="text-white/85">denselben Plan</strong> sehen – inkl.
          Verträge. Diese Personen haben <strong className="text-white/85">keine eigene Ersteinrichtung</strong>
          ; alles bleibt synchron, ohne doppelte Erfassung.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs text-white/55 block mb-2">Wie viele Haushalte gibt es?</label>
            <select
              className="w-full max-w-xs rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            >
              {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className="bg-[#121c31]">
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/55 block mb-2">
              Wer darf Finanzplan &amp; Verträge sehen? (optional)
            </label>
            {others.length === 0 ? (
              <p className="text-sm text-white/45">Keine weiteren Mitglieder in diesem Workspace.</p>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto rounded-xl border border-white/10 p-2 bg-black/20">
                {others.map((m) => (
                  <li key={m.userId}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={shareIds.includes(m.userId)}
                        onChange={() => toggleShare(m.userId)}
                        className="rounded border-white/30"
                      />
                      {m.displayName}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-semibold text-cyan-200/90">Monatliche Fixkosten pro Haushalt</h3>
          {households.map((h, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3"
            >
              <div>
                <label className="text-xs text-white/55 block mb-1">Name des Haushalts</label>
                <Input
                  value={h.name}
                  onChange={(e) => updateHousehold(idx, { name: e.target.value })}
                  className="max-w-md bg-white/5 border-white/15"
                  placeholder={`Haushalt ${idx + 1}`}
                />
              </div>
              <HouseholdCostFields
                costs={h.costs}
                onChange={(costs) => updateHousehold(idx, { costs })}
              />
            </div>
          ))}
        </div>

        {error ? <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2">{error}</p> : null}

        <Button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="rounded-xl bg-gradient-to-r from-emerald-500/40 to-cyan-500/35 border border-emerald-400/30 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin inline" /> Speichern…
            </>
          ) : (
            "Ersteinrichtung abschließen"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
