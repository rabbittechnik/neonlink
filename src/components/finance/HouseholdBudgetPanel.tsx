import React, { useEffect, useMemo, useState } from "react";
import { Home, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FinanceHouseholdEntry, FinanceHouseholdPlan } from "@/types/financeHousehold";
import { sumHouseholdMonthlyCents } from "@/constants/householdFixedCosts";
import { HouseholdCostFields } from "./HouseholdCostFields";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

type Props = {
  plan: FinanceHouseholdPlan;
  workspaceId: string;
  currentUserId: string;
  members: Array<{ userId: string; displayName: string }>;
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
  onUpdated: () => void;
};

export function HouseholdBudgetPanel({
  plan,
  workspaceId,
  currentUserId,
  members,
  authFetch,
  onUpdated,
}: Props) {
  const [rows, setRows] = useState<FinanceHouseholdEntry[]>(plan.households);
  const [memberIds, setMemberIds] = useState<string[]>(plan.memberUserIds);
  const [savingCosts, setSavingCosts] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setRows(plan.households);
    setMemberIds(plan.memberUserIds);
  }, [plan]);

  const isOwner = plan.ownerUserId === currentUserId;
  const others = members.filter((m) => m.userId !== plan.ownerUserId);

  const grandTotal = useMemo(
    () => rows.reduce((acc, h) => acc + sumHouseholdMonthlyCents(h.costs), 0),
    [rows]
  );

  const updateRow = (idx: number, patch: Partial<FinanceHouseholdEntry>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch, costs: patch.costs ?? r.costs } : r))
    );
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
    } catch {
      setNotice("Netzwerkfehler.");
    } finally {
      setSavingCosts(false);
    }
  };

  const toggleMember = (userId: string) => {
    if (userId === plan.ownerUserId) return;
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]
    );
  };

  const saveMembers = async () => {
    if (!isOwner) return;
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
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setNotice(
          j.error === "user_in_existing_shared_plan"
            ? "Eine Person ist bereits in einem anderen gemeinsamen Plan."
            : "Mitglieder konnten nicht aktualisiert werden."
        );
        return;
      }
      setNotice("Mitglieder aktualisiert.");
      onUpdated();
    } catch {
      setNotice("Netzwerkfehler.");
    } finally {
      setSavingMembers(false);
    }
  };

  const nameFor = (uid: string) => members.find((m) => m.userId === uid)?.displayName ?? uid;

  return (
    <Card className="border border-cyan-400/20 bg-[#0a1020]/90 text-white mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg text-cyan-100">
          <Home className="h-5 w-5 text-cyan-300" />
          Haushalte &amp; monatliche Fixkosten
        </CardTitle>
        <p className="text-sm text-white/55 font-normal">
          Alle Beträge sind <strong className="text-white/80">monatlich wiederkehrend</strong>. Summe aller
          Haushalte:{" "}
          <span className="text-emerald-200 font-semibold">{formatMoney(grandTotal)}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="text-xs text-white/50 uppercase tracking-wide">Gemeinsamer Zugriff</div>
          {!isOwner ? (
            <p className="text-sm text-white/70">
              Du nutzt den gemeinsamen Plan von <strong className="text-white">{nameFor(plan.ownerUserId)}</strong>
              . Mit im Plan: {plan.memberUserIds.map((id) => nameFor(id)).join(", ")}
            </p>
          ) : (
            <>
              <p className="text-sm text-white/60">
                Ausgewählte Personen sehen denselben Haushaltsplan und eure Verträge in diesem Workspace.
              </p>
              {others.length === 0 ? (
                <p className="text-sm text-white/45">Keine weiteren Mitglieder.</p>
              ) : (
                <ul className="space-y-2 max-h-36 overflow-y-auto">
                  {others.map((m) => (
                    <li key={m.userId}>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={memberIds.includes(m.userId)}
                          onChange={() => toggleMember(m.userId)}
                          className="rounded border-white/30"
                        />
                        {m.displayName}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                type="button"
                variant="ghost"
                disabled={savingMembers}
                onClick={() => void saveMembers()}
                className="text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15"
              >
                {savingMembers ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1 inline" /> Mitglieder speichern
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {rows.map((h, idx) => (
          <div key={h.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
            <div className="flex flex-wrap justify-between gap-2 items-end">
              <div className="min-w-0 flex-1">
                <label className="text-xs text-white/55 block mb-1">Haushalt</label>
                <Input
                  value={h.name}
                  onChange={(e) => updateRow(idx, { name: e.target.value })}
                  className="max-w-md bg-white/5 border-white/15"
                />
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/45 uppercase">Summe / Monat</div>
                <div className="text-lg font-semibold text-emerald-200">
                  {formatMoney(sumHouseholdMonthlyCents(h.costs))}
                </div>
              </div>
            </div>
            <HouseholdCostFields
              costs={h.costs}
              onChange={(costs) => updateRow(idx, { costs })}
            />
          </div>
        ))}

        <Button
          type="button"
          disabled={savingCosts}
          onClick={() => void saveCosts()}
          className="rounded-xl bg-gradient-to-r from-cyan-500/30 to-emerald-500/25 border border-cyan-400/25 text-white"
        >
          {savingCosts ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
          ) : (
            <Save className="h-4 w-4 mr-2 inline" />
          )}
          Fixkosten speichern
        </Button>

        {notice ? (
          <p className="text-sm text-cyan-200/90 border border-cyan-400/20 rounded-lg px-3 py-2 bg-cyan-500/10">
            {notice}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
