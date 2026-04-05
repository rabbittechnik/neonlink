import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  CalendarRange,
  Loader2,
  MessageSquare,
  Palmtree,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  EmployeeAbsencePeriod,
  EmployeeScheduleWish,
  EmploymentKind,
  MonthlyWorkPlan,
  ShiftWishEntry,
  WorkScheduleDayPatterns,
  WorkScheduleRulesDoc,
  WorkplaceEmployee,
} from "@/types/workSchedule";

type WorkScheduleContext = {
  workspaceId: string;
  workspaceName: string;
  role: "editor" | "viewer";
  editorUserId: string;
  editorDisplayName: string;
};

type WorkScheduleChatRow = {
  id: string;
  workspaceId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  authorDisplayName: string;
};

type ContactPickRow = {
  id: string;
  displayName: string;
  linkedUserId: string | null;
  isNeonLinkUser: boolean;
};

const EMPLOYMENT_LABELS: Record<EmploymentKind, string> = {
  vollzeit: "Vollzeit",
  teilzeit: "Teilzeit",
  aushilfe: "Aushilfe",
};

const WD_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"] as const;

function ymNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toggleDay(arr: number[], d: number): number[] {
  return arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].sort((a, b) => a - b);
}

function PatternRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-white/10 last:border-0">
      <span className="text-sm text-white/75 w-24 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-1">
        {WD_SHORT.map((abbr, d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => onChange(toggleDay(value, d))}
            className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-40 disabled:pointer-events-none ${
              value.includes(d)
                ? "bg-cyan-500/35 text-cyan-100 ring-1 ring-cyan-400/40"
                : "bg-white/5 text-white/45 hover:bg-white/10"
            }`}
          >
            {abbr}
          </button>
        ))}
      </div>
    </div>
  );
}

function shiftWishKey(e: ShiftWishEntry): string {
  return `${e.weekday}:${e.slotId}`;
}

export default function WorkSchedulePage() {
  const { authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [contexts, setContexts] = useState<WorkScheduleContext[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [employees, setEmployees] = useState<WorkplaceEmployee[]>([]);
  const [rules, setRules] = useState<WorkScheduleRulesDoc | null>(null);
  const [wishes, setWishes] = useState<EmployeeScheduleWish[]>([]);
  const [absences, setAbsences] = useState<EmployeeAbsencePeriod[]>([]);
  const [plans, setPlans] = useState<MonthlyWorkPlan[]>([]);

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<EmploymentKind>("vollzeit");
  const [savingRules, setSavingRules] = useState(false);
  const [yearMonth, setYearMonth] = useState(ymNow);
  const [generating, setGenerating] = useState(false);
  const [wishEmpId, setWishEmpId] = useState("");
  const [wishPref, setWishPref] = useState<number[]>([]);
  const [wishAvoid, setWishAvoid] = useState<number[]>([]);
  const [wishPrefShifts, setWishPrefShifts] = useState<ShiftWishEntry[]>([]);
  const [wishAvoidShifts, setWishAvoidShifts] = useState<ShiftWishEntry[]>([]);
  const [pickWishWeekday, setPickWishWeekday] = useState(0);
  const [pickWishSlotId, setPickWishSlotId] = useState("");
  const [wishNotes, setWishNotes] = useState("");

  const [absEmpId, setAbsEmpId] = useState("");
  const [absStart, setAbsStart] = useState("");
  const [absEnd, setAbsEnd] = useState("");
  const [absLabel, setAbsLabel] = useState("");
  const [savingAbsence, setSavingAbsence] = useState(false);

  const [chatMessages, setChatMessages] = useState<WorkScheduleChatRow[]>([]);
  const [chatBody, setChatBody] = useState("");
  const [chatSending, setChatSending] = useState(false);

  const [contacts, setContacts] = useState<ContactPickRow[]>([]);
  const [viewerIdsDraft, setViewerIdsDraft] = useState<string[]>([]);
  const [savingViewers, setSavingViewers] = useState(false);

  const fetchJson = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const res = await authFetch(path, init);
      if (res.status === 401) {
        await logout();
        navigate("/login", { replace: true });
        throw new Error("unauthorized");
      }
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<T>;
    },
    [authFetch, logout, navigate]
  );

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const list = await fetchJson<WorkScheduleContext[]>("/work-schedule/my-contexts");
        if (c) return;
        setContexts(list);
        setWorkspaceId((prev) => {
          if (prev && list.some((x) => x.workspaceId === prev)) return prev;
          return list[0]?.workspaceId ?? null;
        });
      } catch {
        setContexts([]);
        setWorkspaceId(null);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [fetchJson]);

  const activeContext = useMemo(
    () => contexts.find((x) => x.workspaceId === workspaceId) ?? null,
    [contexts, workspaceId]
  );
  const isEditor = activeContext?.role === "editor";

  const reloadChat = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const rows = await fetchJson<WorkScheduleChatRow[]>(
        `/workspaces/${workspaceId}/work-schedule/chat`
      );
      setChatMessages(rows);
    } catch {
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
          fetchJson<ContactPickRow[]>("/contacts"),
          fetchJson<{ viewerUserIds: string[] }>(`/workspaces/${workspaceId}/work-schedule/viewers`),
        ]);
        if (c) return;
        setContacts(co);
        setViewerIdsDraft(vw.viewerUserIds);
      } catch {
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
    if (!workspaceId) return;
    setErr(null);
    try {
      const [em, ru, wi, ab, pl] = await Promise.all([
        fetchJson<WorkplaceEmployee[]>(`/workspaces/${workspaceId}/work-schedule/employees`),
        fetchJson<WorkScheduleRulesDoc>(`/workspaces/${workspaceId}/work-schedule/rules`),
        fetchJson<EmployeeScheduleWish[]>(`/workspaces/${workspaceId}/work-schedule/wishes`),
        fetchJson<EmployeeAbsencePeriod[]>(`/workspaces/${workspaceId}/work-schedule/absences`),
        fetchJson<MonthlyWorkPlan[]>(`/workspaces/${workspaceId}/work-schedule/plans`),
      ]);
      setEmployees(em);
      setRules(ru);
      setWishes(wi);
      setAbsences(ab);
      setPlans(pl);
    } catch {
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
  const slotById = useMemo(
    () => Object.fromEntries((rules?.slots ?? []).map((s) => [s.id, s])),
    [rules?.slots]
  );

  useEffect(() => {
    if (!rules?.slots?.length) {
      setPickWishSlotId("");
      return;
    }
    setPickWishSlotId((prev) =>
      prev && rules.slots.some((s) => s.id === prev) ? prev : rules.slots[0]!.id
    );
  }, [rules]);

  const formatShiftWishLabel = (e: ShiftWishEntry) => {
    const slot = slotById[e.slotId];
    const slotLabel = slot ? `${slot.label} (${slot.startTime}–${slot.endTime})` : e.slotId;
    return `${WD_SHORT[e.weekday]} · ${slotLabel}`;
  };

  const addWishPrefShift = () => {
    if (!pickWishSlotId) return;
    const entry: ShiftWishEntry = { weekday: pickWishWeekday, slotId: pickWishSlotId };
    const k = shiftWishKey(entry);
    setWishAvoidShifts((prev) => prev.filter((x) => shiftWishKey(x) !== k));
    setWishPrefShifts((prev) => (prev.some((x) => shiftWishKey(x) === k) ? prev : [...prev, entry]));
  };

  const addWishAvoidShift = () => {
    if (!pickWishSlotId) return;
    const entry: ShiftWishEntry = { weekday: pickWishWeekday, slotId: pickWishSlotId };
    const k = shiftWishKey(entry);
    setWishPrefShifts((prev) => prev.filter((x) => shiftWishKey(x) !== k));
    setWishAvoidShifts((prev) => (prev.some((x) => shiftWishKey(x) === k) ? prev : [...prev, entry]));
  };

  const addEmployee = async () => {
    if (!workspaceId || !newName.trim()) return;
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
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(e.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setNewName("");
      await reloadAll();
    } catch {
      setErr("Netzwerkfehler.");
    }
  };

  const removeEmployee = async (id: string) => {
    if (!workspaceId || !confirm("Mitarbeiter wirklich löschen?")) return;
    try {
      const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/employees/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await reloadAll();
    } catch {
      /* ignore */
    }
  };

  const saveRules = async () => {
    if (!workspaceId || !rules) return;
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
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(e.error ?? "Regeln konnten nicht gespeichert werden.");
        return;
      }
      const next = (await res.json()) as WorkScheduleRulesDoc;
      setRules(next);
    } finally {
      setSavingRules(false);
    }
  };

  const updatePattern = (key: keyof WorkScheduleDayPatterns, days: number[]) => {
    setRules((r) => (r ? { ...r, dayPatterns: { ...r.dayPatterns, [key]: days } } : r));
  };

  const updateSlot = (idx: number, patch: Partial<{ label: string; startTime: string; endTime: string }>) => {
    setRules((r) => {
      if (!r) return r;
      const slots = [...r.slots];
      const cur = slots[idx];
      if (!cur) return r;
      slots[idx] = { ...cur, ...patch };
      return { ...r, slots };
    });
  };

  const addSlot = () => {
    setRules((r) => {
      if (!r) return r;
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

  const removeSlot = (idx: number) => {
    setRules((r) => {
      if (!r || r.slots.length <= 1) return r;
      return { ...r, slots: r.slots.filter((_, i) => i !== idx) };
    });
  };

  const saveWish = async () => {
    if (!workspaceId || !wishEmpId) return;
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
        const e = (await res.json().catch(() => ({}))) as { error?: string };
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
    } catch {
      setErr("Netzwerkfehler.");
    }
  };

  const loadWishForEdit = (w: EmployeeScheduleWish) => {
    setWishEmpId(w.employeeId);
    setWishPref([...w.preferredWeekdays]);
    setWishAvoid([...w.avoidWeekdays]);
    setWishPrefShifts([...(w.preferredShifts ?? [])]);
    setWishAvoidShifts([...(w.avoidShifts ?? [])]);
    setWishNotes(w.notes);
  };

  const deleteWish = async (id: string) => {
    if (!workspaceId || !confirm("Wunsch löschen?")) return;
    try {
      const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/wishes/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await reloadAll();
    } catch {
      /* ignore */
    }
  };

  const saveAbsence = async () => {
    if (!workspaceId || !absEmpId || !absStart || !absEnd) return;
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
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(e.error ?? "Abwesenheit konnte nicht gespeichert werden.");
        return;
      }
      setAbsStart("");
      setAbsEnd("");
      setAbsLabel("");
      await reloadAll();
    } catch {
      setErr("Netzwerkfehler.");
    } finally {
      setSavingAbsence(false);
    }
  };

  const deleteAbsence = async (id: string) => {
    if (!workspaceId || !confirm("Diesen Zeitraum löschen?")) return;
    try {
      const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/absences/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await reloadAll();
    } catch {
      /* ignore */
    }
  };

  const generatePlan = async () => {
    if (!workspaceId) return;
    setGenerating(true);
    setErr(null);
    try {
      const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/generate`, {
        method: "POST",
        body: JSON.stringify({ yearMonth: yearMonth.trim() }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(e.error ?? "Plan konnte nicht erstellt werden.");
        return;
      }
      await reloadAll();
    } catch {
      setErr("Netzwerkfehler.");
    } finally {
      setGenerating(false);
    }
  };

  const sendChat = async () => {
    if (!workspaceId || !chatBody.trim()) return;
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
    } finally {
      setChatSending(false);
    }
  };

  const toggleViewerId = (userId: string) => {
    setViewerIdsDraft((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]
    );
  };

  const saveViewers = async () => {
    if (!workspaceId) return;
    setSavingViewers(true);
    setErr(null);
    try {
      const res = await authFetch(`/workspaces/${workspaceId}/work-schedule/viewers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerUserIds: viewerIdsDraft }),
      });
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(e.error ?? "Freigaben konnten nicht gespeichert werden.");
        return;
      }
      const data = (await res.json()) as { viewerUserIds: string[] };
      setViewerIdsDraft(data.viewerUserIds);
    } catch {
      setErr("Netzwerkfehler.");
    } finally {
      setSavingViewers(false);
    }
  };

  const neonContacts = useMemo(
    () => contacts.filter((c) => c.isNeonLinkUser && c.linkedUserId),
    [contacts]
  );

  const groupedAssignments = useMemo(() => {
    if (!activePlan) return [];
    const byDate = new Map<string, MonthlyWorkPlan["assignments"]>();
    for (const a of activePlan.assignments) {
      const list = byDate.get(a.date) ?? [];
      list.push(a);
      byDate.set(a.date, list);
    }
    return [...byDate.entries()].sort(([da], [db]) => da.localeCompare(db));
  }, [activePlan]);

  return (
    <div className="min-h-screen w-full bg-[#050816] text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.12),transparent_30%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur App
          </Link>
          <div className="flex items-center gap-2 text-amber-200/95">
            <Briefcase className="h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Arbeitsplan</h1>
          </div>
        </div>

        <p className="text-sm text-white/60 max-w-3xl mb-6 leading-relaxed">
          {!loading && contexts.length === 0 ? (
            <>
              Für dich ist noch kein Arbeitsplan freigeschaltet. Als{" "}
              <span className="text-white/85">Workspace-Besitzerin bzw. -Besitzer</span> richtest du den Plan ein;
              andere NeonLink-Nutzer kannst du unter „Lesende“ nur freigeben, wenn sie in deinen{" "}
              <span className="text-white/85">Kontakten</span> mit verknüpftem Konto stehen.
            </>
          ) : activeContext?.role === "viewer" ? (
            <>
              Du siehst den Plan von <span className="text-white/85">{activeContext.editorDisplayName}</span> nur zur
              Ansicht. Tauschwünsche oder Absprachen für einzelne Tage schreibst du unten im{" "}
              <span className="text-white/85">Kurz-Chat</span> — die Planung selbst nimmt nur die Bearbeiterin bzw.
              der Bearbeiter vor.
            </>
          ) : (
            <>
              Lege <span className="text-white/85">Mitarbeiter</span> mit Beschäftigungsart an, definiere{" "}
              <span className="text-white/85">Schichten und Wochentage</span> pro Art, trage{" "}
              <span className="text-white/85">Wunsch- und Sperrtage</span> ein — dann erzeugst du einen{" "}
              <span className="text-white/85">Monatsplan</span>. Unter „Lesende“ bestimmst du, wer den Plan nur lesen
              darf (registrierte Kontakte). Die erste Version verteilt pro Tag und Schicht fair im Wechsel.
            </>
          )}
        </p>

        {err ? (
          <div className="mb-4 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="h-5 w-5 animate-spin" />
            Lade Zugriffe…
          </div>
        ) : contexts.length === 0 ? null : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <label className="text-sm text-white/55">Arbeitsplan</label>
              <select
                value={workspaceId ?? ""}
                onChange={(e) => setWorkspaceId(e.target.value || null)}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm max-w-[min(100%,24rem)]"
              >
                {contexts.map((c) => (
                  <option key={c.workspaceId} value={c.workspaceId}>
                    {c.workspaceName}
                    {c.role === "viewer" ? " (nur lesen)" : " (Bearbeitung)"}
                  </option>
                ))}
              </select>
            </div>

            {activeContext?.role === "viewer" ? (
              <div className="mb-4 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
                Nur-Lese-Modus — du kannst den Plan einsehen und im Chat schreiben, aber keine Daten ändern.
              </div>
            ) : null}

            {isEditor ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Lesende (Nur-Ansicht)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-white/50">
                      Nur registrierte Kontakte mit NeonLink-Konto (Telefonbuch) können ausgewählt werden. Sie sehen
                      Mitarbeiter, Regeln, Wünsche und Pläne wie du — dürfen aber nichts bearbeiten.
                    </p>
                    {neonContacts.length === 0 ? (
                      <p className="text-sm text-amber-200/80">
                        Keine verknüpften NeonLink-Kontakte. Unter Kontakte im Menü Nummern speichern, die bereits
                        registriert sind.
                      </p>
                    ) : (
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {neonContacts.map((c) => {
                          const uid = c.linkedUserId!;
                          const on = viewerIdsDraft.includes(uid);
                          return (
                            <li key={c.id} className="flex items-center gap-3 text-sm">
                              <input
                                type="checkbox"
                                id={`vw-${c.id}`}
                                checked={on}
                                onChange={() => toggleViewerId(uid)}
                                className="rounded border-white/30"
                              />
                              <label htmlFor={`vw-${c.id}`} className="cursor-pointer text-white/85">
                                {c.displayName}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <Button type="button" onClick={() => void saveViewers()} disabled={savingViewers}>
                      {savingViewers ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Freigaben speichern
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Mitarbeiter</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isEditor ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="bg-white/5 border-white/15"
                        />
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as EmploymentKind)}
                          className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm"
                        >
                          {(Object.keys(EMPLOYMENT_LABELS) as EmploymentKind[]).map((k) => (
                            <option key={k} value={k}>
                              {EMPLOYMENT_LABELS[k]}
                            </option>
                          ))}
                        </select>
                        <Button type="button" onClick={() => void addEmployee()} className="shrink-0">
                          <Plus className="h-4 w-4 mr-1" />
                          Anlegen
                        </Button>
                      </div>
                    ) : null}
                    <ul className="space-y-2 max-h-56 overflow-y-auto">
                      {employees.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                        >
                          <span>
                            <span className="font-medium text-white/90">{e.name}</span>
                            <span className="text-white/45"> · {EMPLOYMENT_LABELS[e.employmentType]}</span>
                          </span>
                          {isEditor ? (
                            <button
                              type="button"
                              onClick={() => void removeEmployee(e.id)}
                              className="p-1.5 rounded-lg text-red-300/90 hover:bg-red-500/15"
                              aria-label="Löschen"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
                        </li>
                      ))}
                      {employees.length === 0 ? (
                        <li className="text-sm text-white/40">Noch keine Einträge.</li>
                      ) : null}
                    </ul>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Schichten &amp; Wochentage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {rules ? (
                      <>
                        <div className="space-y-3">
                          {rules.slots.map((s, idx) => (
                            <div
                              key={s.id}
                              className="flex flex-wrap items-end gap-2 rounded-lg border border-white/10 p-3 bg-black/15"
                            >
                              <div className="flex-1 min-w-[8rem]">
                                <label className="text-xs text-white/45">Bezeichnung</label>
                                <Input
                                  value={s.label}
                                  disabled={!isEditor}
                                  onChange={(e) => updateSlot(idx, { label: e.target.value })}
                                  className="bg-white/5 border-white/15 mt-0.5"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-white/45">Von</label>
                                <Input
                                  type="time"
                                  disabled={!isEditor}
                                  value={s.startTime.length === 5 ? s.startTime : s.startTime.padStart(5, "0")}
                                  onChange={(e) => updateSlot(idx, { startTime: e.target.value })}
                                  className="bg-white/5 border-white/15 mt-0.5 w-[7rem]"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-white/45">Bis</label>
                                <Input
                                  type="time"
                                  disabled={!isEditor}
                                  value={s.endTime.length === 5 ? s.endTime : s.endTime.padStart(5, "0")}
                                  onChange={(e) => updateSlot(idx, { endTime: e.target.value })}
                                  className="bg-white/5 border-white/15 mt-0.5 w-[7rem]"
                                />
                              </div>
                              {isEditor && rules.slots.length > 1 ? (
                                <Button type="button" variant="ghost" onClick={() => removeSlot(idx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              ) : null}
                            </div>
                          ))}
                          {isEditor ? (
                            <Button type="button" onClick={addSlot} className="border border-white/20 bg-transparent hover:bg-white/10">
                              Schicht hinzufügen
                            </Button>
                          ) : null}
                        </div>
                        <div className="rounded-xl border border-white/10 p-3 bg-black/10">
                          <div className="text-xs uppercase tracking-wider text-white/45 mb-2">
                            Standard: an welchen Wochentagen darf wer grundsätzlich arbeiten?
                          </div>
                          <PatternRow
                            label="Vollzeit"
                            value={rules.dayPatterns.vollzeitWeekdays}
                            disabled={!isEditor}
                            onChange={(d) => updatePattern("vollzeitWeekdays", d)}
                          />
                          <PatternRow
                            label="Teilzeit"
                            value={rules.dayPatterns.teilzeitWeekdays}
                            disabled={!isEditor}
                            onChange={(d) => updatePattern("teilzeitWeekdays", d)}
                          />
                          <PatternRow
                            label="Aushilfe"
                            value={rules.dayPatterns.aushilfeWeekdays}
                            disabled={!isEditor}
                            onChange={(d) => updatePattern("aushilfeWeekdays", d)}
                          />
                        </div>
                        {isEditor ? (
                          <Button type="button" onClick={() => void saveRules()} disabled={savingRules}>
                            {savingRules ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Regeln speichern
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-white/45">Lade Regeln…</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Wünsche, Sperren &amp; Schichten</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-white/50">
                    <span className="text-emerald-200/90">Wunsch-Tage</span> gelten für alle Schichten an dem
                    Wochentag. <span className="text-emerald-300/90">Wunsch-Schicht</span> bevorzugt nur diese eine
                    Schicht (z. B. Sonntag früh). <span className="text-rose-200/90">Sperr-Tage</span> schließen den
                    ganzen Tag aus, <span className="text-rose-300/90">Sperr-Schicht</span> nur eine bestimmte Schicht
                    (z. B. kein Sonntag spät — aber Sonntag früh möglich).
                  </p>
                  <div className="flex flex-col lg:flex-row gap-4">
                    {isEditor ? (
                      <div className="flex-1 space-y-3">
                        <label className="text-xs text-white/45">Mitarbeiter</label>
                        <select
                          value={wishEmpId}
                          onChange={(e) => setWishEmpId(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                        >
                          <option value="">— wählen —</option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                        </select>
                        <div>
                          <div className="text-xs text-emerald-300/80 mb-1">Wunsch-Wochentage</div>
                          <div className="flex flex-wrap gap-1">
                            {WD_SHORT.map((abbr, d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setWishPref((p) => toggleDay(p, d))}
                                className={`rounded-lg px-2 py-1 text-xs font-medium ${
                                  wishPref.includes(d)
                                    ? "bg-emerald-500/30 text-emerald-100 ring-1 ring-emerald-400/35"
                                    : "bg-white/5 text-white/45"
                                }`}
                              >
                                {abbr}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-rose-300/80 mb-1">Sperr-Wochentage</div>
                          <div className="flex flex-wrap gap-1">
                            {WD_SHORT.map((abbr, d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setWishAvoid((p) => toggleDay(p, d))}
                                className={`rounded-lg px-2 py-1 text-xs font-medium ${
                                  wishAvoid.includes(d)
                                    ? "bg-rose-500/25 text-rose-100 ring-1 ring-rose-400/35"
                                    : "bg-white/5 text-white/45"
                                }`}
                              >
                                {abbr}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-3">
                          <div className="text-xs text-violet-200/85 font-medium">
                            Pro Schicht (aus den gespeicherten Schicht-Regeln — bei neuen Schichten zuerst „Regeln
                            speichern“)
                          </div>
                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <span className="text-xs text-white/45 block mb-0.5">Wochentag</span>
                              <select
                                value={pickWishWeekday}
                                onChange={(e) => setPickWishWeekday(Number(e.target.value))}
                                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm"
                              >
                                {WD_SHORT.map((abbr, d) => (
                                  <option key={abbr} value={d}>
                                    {abbr}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="min-w-[9rem]">
                              <span className="text-xs text-white/45 block mb-0.5">Schicht</span>
                              <select
                                value={pickWishSlotId}
                                onChange={(e) => setPickWishSlotId(e.target.value)}
                                disabled={!rules?.slots.length}
                                className="w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-sm disabled:opacity-40"
                              >
                                {(rules?.slots ?? []).map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Button
                              type="button"
                              onClick={addWishPrefShift}
                              disabled={!pickWishSlotId}
                              className="bg-emerald-500/20 text-emerald-100 border border-emerald-400/35 hover:bg-emerald-500/30"
                            >
                              + Wunsch-Schicht
                            </Button>
                            <Button
                              type="button"
                              onClick={addWishAvoidShift}
                              disabled={!pickWishSlotId}
                              className="bg-rose-500/15 text-rose-100 border border-rose-400/35 hover:bg-rose-500/25"
                            >
                              + Sperr-Schicht
                            </Button>
                          </div>
                          {wishPrefShifts.length > 0 ? (
                            <div>
                              <div className="text-xs text-emerald-300/80 mb-1">Wunsch-Schichten</div>
                              <div className="flex flex-wrap gap-1.5">
                                {wishPrefShifts.map((e) => (
                                  <span
                                    key={shiftWishKey(e)}
                                    className="inline-flex items-center gap-1 rounded-md bg-emerald-500/20 px-2 py-1 text-[11px] text-emerald-100/95"
                                  >
                                    {formatShiftWishLabel(e)}
                                    <button
                                      type="button"
                                      className="text-white/50 hover:text-white leading-none px-0.5"
                                      onClick={() =>
                                        setWishPrefShifts((prev) =>
                                          prev.filter((x) => shiftWishKey(x) !== shiftWishKey(e))
                                        )
                                      }
                                      aria-label="Entfernen"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                          {wishAvoidShifts.length > 0 ? (
                            <div>
                              <div className="text-xs text-rose-300/80 mb-1">Sperr-Schichten</div>
                              <div className="flex flex-wrap gap-1.5">
                                {wishAvoidShifts.map((e) => (
                                  <span
                                    key={shiftWishKey(e)}
                                    className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-1 text-[11px] text-rose-100/95"
                                  >
                                    {formatShiftWishLabel(e)}
                                    <button
                                      type="button"
                                      className="text-white/50 hover:text-white leading-none px-0.5"
                                      onClick={() =>
                                        setWishAvoidShifts((prev) =>
                                          prev.filter((x) => shiftWishKey(x) !== shiftWishKey(e))
                                        )
                                      }
                                      aria-label="Entfernen"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <Input
                          placeholder="Notiz (optional)"
                          value={wishNotes}
                          onChange={(e) => setWishNotes(e.target.value)}
                          className="bg-white/5 border-white/15"
                        />
                        <Button type="button" onClick={() => void saveWish()} disabled={!wishEmpId}>
                          Wunsch speichern
                        </Button>
                      </div>
                    ) : null}
                    <div
                      className={`min-h-[12rem] rounded-xl border border-white/10 bg-black/15 p-3 overflow-y-auto max-h-72 ${isEditor ? "flex-1" : "w-full"}`}
                    >
                      <div className="text-xs text-white/45 mb-2">Gespeicherte Wünsche</div>
                      <ul className="space-y-2 text-sm">
                        {wishes.map((w) => {
                          const en = empById[w.employeeId];
                          return (
                            <li
                              key={w.id}
                              className="flex flex-col gap-1 rounded-lg border border-white/10 px-3 py-2 bg-white/[0.03]"
                            >
                              <div className="flex justify-between gap-2">
                                <span className="font-medium">{en?.name ?? w.employeeId}</span>
                                {isEditor ? (
                                  <div className="flex gap-1">
                                    <button
                                      type="button"
                                      className="text-xs text-cyan-300 hover:underline"
                                      onClick={() => loadWishForEdit(w)}
                                    >
                                      Bearbeiten
                                    </button>
                                    <button
                                      type="button"
                                      className="text-xs text-red-300/90 hover:underline"
                                      onClick={() => void deleteWish(w.id)}
                                    >
                                      Löschen
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                              <div className="text-white/55 text-xs space-y-0.5">
                                <div>
                                  Wunsch-Tage: {w.preferredWeekdays.map((d) => WD_SHORT[d]).join(", ") || "—"}
                                </div>
                                {(w.preferredShifts ?? []).length > 0 ? (
                                  <div>
                                    Wunsch-Schichten:{" "}
                                    {(w.preferredShifts ?? []).map((s) => formatShiftWishLabel(s)).join(" · ")}
                                  </div>
                                ) : null}
                                <div>
                                  Sperr-Tage: {w.avoidWeekdays.map((d) => WD_SHORT[d]).join(", ") || "—"}
                                </div>
                                {(w.avoidShifts ?? []).length > 0 ? (
                                  <div>
                                    Sperr-Schichten:{" "}
                                    {(w.avoidShifts ?? []).map((s) => formatShiftWishLabel(s)).join(" · ")}
                                  </div>
                                ) : null}
                              </div>
                              {w.notes ? <div className="text-white/40 text-xs">{w.notes}</div> : null}
                            </li>
                          );
                        })}
                        {wishes.length === 0 ? <li className="text-white/35">Keine Einträge.</li> : null}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
              className="mt-6"
            >
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palmtree className="h-5 w-5 text-amber-200/90" />
                    Urlaub &amp; Abwesenheit
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-white/50">
                    In den eingetragenen Zeiträumen wird die Person bei der{" "}
                    <span className="text-white/70">Arbeitsplan-Erstellung</span> an keinem Kalendertag und in keiner
                    Schicht eingeteilt (z. B. Urlaub, Krankheit, Fortbildung).
                  </p>
                  <div className="flex flex-col lg:flex-row gap-4">
                    {isEditor ? (
                      <div className="flex-1 space-y-3">
                        <label className="text-xs text-white/45">Mitarbeiter</label>
                        <select
                          value={absEmpId}
                          onChange={(e) => setAbsEmpId(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                        >
                          <option value="">— wählen —</option>
                          {employees.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.name}
                            </option>
                          ))}
                        </select>
                        <div className="flex flex-wrap gap-3">
                          <div>
                            <span className="text-xs text-white/45 block mb-0.5">Von</span>
                            <Input
                              type="date"
                              value={absStart}
                              onChange={(e) => setAbsStart(e.target.value)}
                              className="w-auto bg-white/5 border-white/15"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-white/45 block mb-0.5">Bis</span>
                            <Input
                              type="date"
                              value={absEnd}
                              onChange={(e) => setAbsEnd(e.target.value)}
                              className="w-auto bg-white/5 border-white/15"
                            />
                          </div>
                        </div>
                        <Input
                          placeholder="Bezeichnung (optional, z. B. Urlaub)"
                          value={absLabel}
                          onChange={(e) => setAbsLabel(e.target.value)}
                          className="bg-white/5 border-white/15"
                        />
                        <Button
                          type="button"
                          onClick={() => void saveAbsence()}
                          disabled={savingAbsence || !absEmpId || !absStart || !absEnd}
                        >
                          {savingAbsence ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                          Zeitraum hinzufügen
                        </Button>
                      </div>
                    ) : null}
                    <div
                      className={`min-h-[10rem] rounded-xl border border-white/10 bg-black/15 p-3 overflow-y-auto max-h-64 ${isEditor ? "flex-1" : "w-full"}`}
                    >
                      <div className="text-xs text-white/45 mb-2">Eingetragene Zeiträume</div>
                      <ul className="space-y-2 text-sm">
                        {absences.map((a) => {
                          const en = empById[a.employeeId];
                          return (
                            <li
                              key={a.id}
                              className="flex flex-col gap-1 rounded-lg border border-white/10 px-3 py-2 bg-white/[0.03]"
                            >
                              <div className="flex justify-between gap-2">
                                <span className="font-medium">{en?.name ?? a.employeeId}</span>
                                {isEditor ? (
                                  <button
                                    type="button"
                                    className="text-xs text-red-300/90 hover:underline shrink-0"
                                    onClick={() => void deleteAbsence(a.id)}
                                  >
                                    Löschen
                                  </button>
                                ) : null}
                              </div>
                              <div className="text-white/60 text-xs">
                                {a.startDate} — {a.endDate}
                                {a.label ? <span className="text-white/45"> · {a.label}</span> : null}
                              </div>
                            </li>
                          );
                        })}
                        {absences.length === 0 ? <li className="text-white/35">Keine Einträge.</li> : null}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="mt-6"
            >
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarRange className="h-5 w-5 text-cyan-300/90" />
                    Monatsplan
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="month"
                      value={yearMonth}
                      onChange={(e) => setYearMonth(e.target.value)}
                      className="w-auto bg-white/5 border-white/15"
                    />
                    {isEditor ? (
                      <Button type="button" onClick={() => void generatePlan()} disabled={generating || !workspaceId}>
                        {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Arbeitsplan erstellen
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {!activePlan ? (
                    <p className="text-sm text-white/45">
                      {isEditor ? (
                        <>
                          Für <span className="text-white/70">{yearMonth}</span> liegt noch kein Plan vor — Button oben
                          drücken (überschreibt einen vorhandenen Plan für denselben Monat).
                        </>
                      ) : (
                        <>
                          Für <span className="text-white/70">{yearMonth}</span> liegt noch kein Plan vor. Die
                          Bearbeiterin bzw. der Bearbeiter kann ihn erzeugen.
                        </>
                      )}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
                      <p className="text-xs text-white/45 mb-2">
                        Erstellt {new Date(activePlan.generatedAt).toLocaleString("de-DE")} · {activePlan.assignments.length}{" "}
                        Zuordnungen
                      </p>
                      {groupedAssignments.map(([date, rows]) => {
                        const [Y, M, D] = date.split("-").map(Number);
                        const label = new Date(Y, M - 1, D).toLocaleDateString("de-DE", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        });
                        return (
                          <div
                            key={date}
                            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
                          >
                            <div className="font-medium text-cyan-200/90 mb-1">{label}</div>
                            <ul className="space-y-1 text-white/75">
                              {rows.map((a, i) => {
                                const slot = slotById[a.slotId];
                                const emp = a.employeeId ? empById[a.employeeId] : null;
                                return (
                                  <li key={`${a.slotId}-${i}`}>
                                    {slot ? `${slot.label} (${slot.startTime}–${slot.endTime})` : a.slotId}:{" "}
                                    <span className="text-white/90">{emp?.name ?? "— offen"}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="mt-6"
            >
              <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-violet-300/90" />
                    Absprachen &amp; Tauschwünsche
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-white/50">
                    Kurzer Austausch zum Plan — z. B. „Am 15. nicht verfügbar“, „Tausch mit Max“. Alle, die den Plan
                    sehen dürfen, können hier schreiben; nur die Bearbeiterin bzw. der Bearbeiter ändert den Plan
                    selbst.
                  </p>
                  <div className="max-h-52 overflow-y-auto space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
                    {chatMessages.length === 0 ? (
                      <p className="text-sm text-white/35">Noch keine Nachrichten.</p>
                    ) : (
                      chatMessages.map((m) => (
                        <div
                          key={m.id}
                          className="text-sm rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                        >
                          <div className="text-xs text-white/45">
                            <span className="text-cyan-200/90">{m.authorDisplayName}</span>
                            {" · "}
                            {new Date(m.createdAt).toLocaleString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="text-white/85 mt-1 whitespace-pre-wrap break-words">{m.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Nachricht schreiben…"
                      value={chatBody}
                      onChange={(e) => setChatBody(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendChat();
                        }
                      }}
                      className="bg-white/5 border-white/15 flex-1"
                    />
                    <Button
                      type="button"
                      onClick={() => void sendChat()}
                      disabled={chatSending || !chatBody.trim()}
                      className="shrink-0"
                    >
                      {chatSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Senden
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
