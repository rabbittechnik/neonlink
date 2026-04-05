import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  FolderKanban,
  GraduationCap,
  HeartHandshake,
  Home,
  Loader2,
  Palmtree,
  Plus,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CALENDAR_SECTION_IDS, CALENDAR_SECTION_META } from "@/constants/calendarSections";
import {
  FAMILY_CALENDAR_SELF_SLOT_ID,
  type ApiCalendarEvent,
  type CalendarEventKind,
  type FamilyCalendarSlot,
} from "@/types/calendar";
import type { SectionId } from "@/types/collab";

const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  familie: Home,
  freunde: Users,
  verwandte: HeartHandshake,
  feuerwehr: Flame,
  arbeit: Briefcase,
  ideen: FolderKanban,
};

const COL_GEMEINSAM = "__gemeinsam__";
const COL_GETEILT = "__geteilt__";

/** Dunkles Select: color-scheme dark + Hintergrund, damit Optionen unter Windows/Chrome lesbar bleiben. */
const SELECT_DARK =
  "rounded-xl border border-white/20 bg-[#121c31] px-3 py-2 text-sm text-white shadow-inner [color-scheme:dark]";
const OPTION_DARK = "bg-[#121c31] text-white";

function monthRangeIso(year: number, monthIndex: number): { from: string; to: string } {
  const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

function daysInMonth(year: number, monthIndex: number): Date[] {
  const n = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: n }, (_, i) => new Date(year, monthIndex, i + 1));
}

function dayBoundsMs(d: Date): { start: number; end: number } {
  const a = new Date(d);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(23, 59, 59, 999);
  return { start: a.getTime(), end: b.getTime() };
}

function eventTouchesDay(ev: ApiCalendarEvent, d: Date): boolean {
  const { start, end } = dayBoundsMs(d);
  const es = new Date(ev.startsAt).getTime();
  const ee = ev.endsAt ? new Date(ev.endsAt).getTime() : es;
  return es <= end && ee >= start;
}

function assignColumn(
  ev: ApiCalendarEvent,
  viewerId: string,
  mySlots: FamilyCalendarSlot[],
  myDisplayName: string
): string {
  if (ev.createdByUserId !== viewerId) {
    if (ev.familySlotId === null) return COL_GEMEINSAM;
    if (ev.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) {
      const theirs = (ev.familySlotLabel ?? "").toLowerCase().trim();
      const mine = myDisplayName.toLowerCase().trim();
      if (theirs && mine && theirs === mine) return FAMILY_CALENDAR_SELF_SLOT_ID;
      return COL_GETEILT;
    }
    const label = (ev.familySlotLabel ?? "").toLowerCase().trim();
    if (label) {
      const match = mySlots.find((s) => s.label.toLowerCase().trim() === label);
      if (match) return match.id;
    }
    return COL_GETEILT;
  }
  if (!ev.familySlotId) return COL_GEMEINSAM;
  if (ev.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) return FAMILY_CALENDAR_SELF_SLOT_ID;
  if (mySlots.some((s) => s.id === ev.familySlotId)) return ev.familySlotId;
  return COL_GETEILT;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(s: string): string {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function dateKeyLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Erster/letzter Tag-Index im Monatsraster, den das Event berührt (für durchgehenden Urlaubs-Balken). */
function eventDayIndexSpan(ev: ApiCalendarEvent, days: Date[]): { start: number; end: number } | null {
  let start = -1;
  let end = -1;
  days.forEach((d, i) => {
    if (eventTouchesDay(ev, d)) {
      if (start < 0) start = i;
      end = i;
    }
  });
  if (start < 0) return null;
  return { start, end };
}

const FAMILY_GRID_ROW_H = "3.5rem";

function isCalendarRangeKind(k: CalendarEventKind): boolean {
  return k === "vacation" || k === "ferien";
}

/** Anzeigename der Familien-Spalte (für „Wer hat Urlaub/Ferien?“). */
function familySlotOwnerLabel(ev: ApiCalendarEvent, selfColumnFallback: string): string {
  if (!ev.familySlotId) return "Gemeinsam";
  if (ev.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) return ev.familySlotLabel ?? selfColumnFallback;
  return ev.familySlotLabel ?? "Person";
}

function showRangeOwnerInList(ev: ApiCalendarEvent): boolean {
  return isCalendarRangeKind(ev.kind);
}

export default function CalendarPage() {
  const { user, authFetch, logout } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Array<{ id: string; name: string; ownerUserId: string }>>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [events, setEvents] = useState<ApiCalendarEvent[]>([]);
  const [slots, setSlots] = useState<FamilyCalendarSlot[]>([]);
  const [members, setMembers] = useState<Array<{ userId: string; displayName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [view, setView] = useState<"liste" | "familie">("liste");
  const [slotsEditorOpen, setSlotsEditorOpen] = useState(false);
  const [slotDraft, setSlotDraft] = useState<Array<{ label: string }>>([]);
  const [savingSlots, setSavingSlots] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formKind, setFormKind] = useState<CalendarEventKind>("appointment");
  const [formSection, setFormSection] = useState<SectionId>("familie");
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formAllDay, setFormAllDay] = useState(false);
  const [formLocation, setFormLocation] = useState("");
  const [formSlotId, setFormSlotId] = useState<string>("");
  const [formVis, setFormVis] = useState<Record<string, boolean>>({});
  const [modalError, setModalError] = useState<string | null>(null);
  /** Alte Slot-ID, die nach Personen-Änderung noch nicht in slots[] vorkommt (verhindert Zurückspringen auf Gemeinsam). */
  const [formLegacySlot, setFormLegacySlot] = useState<{ id: string; label: string } | null>(null);

  const fetchJson = useCallback(
    async <T,>(path: string): Promise<T> => {
      const res = await authFetch(path);
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

  const mine = user?.id ?? "";

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const list = await fetchJson<Array<{ id: string; name: string; ownerUserId: string }>>("/workspaces");
        if (c) return;
        setWorkspaces(list);
        const own = list.find((w) => w.ownerUserId === user?.id);
        setWorkspaceId(own?.id ?? list[0]?.id ?? null);
      } catch {
        setWorkspaceId(null);
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [fetchJson, user?.id]);

  useEffect(() => {
    if (!workspaceId) return;
    let c = false;
    void (async () => {
      try {
        const m = await fetchJson<
          Array<{ userId: string; user: { id: string; displayName: string } | null }>
        >(`/workspaces/${workspaceId}/members`);
        if (c) return;
        setMembers(
          m
            .filter((x) => x.user)
            .map((x) => ({ userId: x.user!.id, displayName: x.user!.displayName }))
        );
      } catch {
        setMembers([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [workspaceId, fetchJson]);

  const reloadSlots = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const s = await fetchJson<FamilyCalendarSlot[]>(
        `/workspaces/${workspaceId}/calendar/family-slots`
      );
      setSlots(s);
    } catch {
      setSlots([]);
    }
  }, [workspaceId, fetchJson]);

  const reloadEvents = useCallback(async () => {
    if (!workspaces.length) {
      setEvents([]);
      return;
    }
    setListError(null);
    const { from, to } = monthRangeIso(cursor.y, cursor.m);
    try {
      const results = await Promise.all(
        workspaces.map((w) =>
          fetchJson<ApiCalendarEvent[]>(
            `/workspaces/${w.id}/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
          )
        )
      );
      const merged: ApiCalendarEvent[] = [];
      const seen = new Set<string>();
      workspaces.forEach((w, i) => {
        for (const e of results[i] ?? []) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          merged.push({ ...e, workspaceName: w.name });
        }
      });
      setEvents(merged);
    } catch {
      setListError("Kalender konnte nicht geladen werden.");
    }
  }, [workspaces, cursor.y, cursor.m, fetchJson]);

  useEffect(() => {
    void reloadSlots();
  }, [reloadSlots]);

  useEffect(() => {
    void reloadEvents();
  }, [reloadEvents]);

  const days = useMemo(() => daysInMonth(cursor.y, cursor.m), [cursor.y, cursor.m]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ApiCalendarEvent[]>();
    for (const d of days) {
      const key = dateKeyLocal(d);
      map.set(
        key,
        events.filter((e) => eventTouchesDay(e, d))
      );
    }
    return map;
  }, [days, events]);

  const myColumnLabel = user?.displayName ?? "Mein Name";

  const columns = useMemo(() => {
    const base: Array<{ id: string; label: string }> = [
      { id: COL_GEMEINSAM, label: "Gemeinsam" },
      { id: FAMILY_CALENDAR_SELF_SLOT_ID, label: myColumnLabel },
    ];
    slots.forEach((s) => base.push({ id: s.id, label: s.label }));
    base.push({ id: COL_GETEILT, label: "Geteilt / andere" });
    return base;
  }, [slots, myColumnLabel]);

  const openNewModal = () => {
    setEditId(null);
    setModalError(null);
    setFormKind("appointment");
    setFormSection("familie");
    setFormTitle("");
    const now = new Date();
    setFormStart(toDatetimeLocal(now.toISOString()));
    setFormEnd("");
    setFormAllDay(false);
    setFormLocation("");
    setFormSlotId("");
    setFormVis({});
    setFormLegacySlot(null);
    setModalOpen(true);
  };

  const openEdit = (ev: ApiCalendarEvent) => {
    if (ev.createdByUserId !== mine) return;
    if (ev.kind === "meeting") return;
    setEditId(ev.id);
    setModalError(null);
    setFormKind(ev.kind);
    setFormSection(ev.sectionId);
    setFormTitle(ev.kind === "appointment" ? ev.title : "");
    setFormStart(toDatetimeLocal(ev.startsAt));
    setFormEnd(ev.endsAt ? toDatetimeLocal(ev.endsAt) : "");
    setFormAllDay(ev.allDay);
    setFormLocation(ev.location);
    const sid = ev.familySlotId ?? "";
    const slotKnown =
      sid === "" ||
      sid === FAMILY_CALENDAR_SELF_SLOT_ID ||
      slots.some((s) => s.id === sid);
    setFormLegacySlot(
      sid && !slotKnown ? { id: sid, label: (ev.familySlotLabel ?? "").trim() || sid } : null
    );
    setFormSlotId(sid);
    const v: Record<string, boolean> = {};
    ev.visibilityUserIds.forEach((id) => {
      v[id] = true;
    });
    setFormVis(v);
    setModalOpen(true);
  };

  const submitSlots = async () => {
    if (!workspaceId) return;
    setSavingSlots(true);
    try {
      const res = await authFetch(`/workspaces/${workspaceId}/calendar/family-slots`, {
        method: "PUT",
        body: JSON.stringify({
          slots: slotDraft
            .filter((r) => r.label.trim())
            .slice(0, 6)
            .map((r) => ({ label: r.label.trim() })),
        }),
      });
      if (!res.ok) return;
      setSlotsEditorOpen(false);
      await reloadSlots();
    } finally {
      setSavingSlots(false);
    }
  };

  const submitEvent = async () => {
    if (!workspaceId) return;
    setSavingEvent(true);
    setModalError(null);
    try {
      let startsAt = fromDatetimeLocal(formStart);
      let endsAt: string | null = formEnd ? fromDatetimeLocal(formEnd) : null;
      if (formAllDay) {
        const d0 = formStart.slice(0, 10);
        const d1 = (formEnd || formStart).slice(0, 10);
        startsAt = new Date(d0 + "T00:00:00").toISOString();
        endsAt = new Date(d1 + "T23:59:59.999").toISOString();
      }
      const vis = Object.entries(formVis)
        .filter(([, on]) => on)
        .map(([id]) => id);
      const familySlotId = formSlotId || null;
      const body = {
        sectionId: formSection,
        kind: formKind,
        title: formKind === "appointment" ? formTitle.trim() : "",
        startsAt,
        endsAt,
        allDay: formAllDay,
        location: formLocation.trim(),
        visibilityUserIds: vis,
        familySlotId: familySlotId || null,
      };
      const res = editId
        ? await authFetch(`/calendar/events/${editId}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : await authFetch(`/workspaces/${workspaceId}/calendar/events`, {
            method: "POST",
            body: JSON.stringify(body),
          });
      if (res.status === 401) {
        await logout();
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        const e = (await res.json().catch(() => ({}))) as { error?: string };
        setModalError(e.error ?? "Speichern fehlgeschlagen.");
        return;
      }
      setModalOpen(false);
      await reloadEvents();
    } finally {
      setSavingEvent(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Termin wirklich löschen?")) return;
    try {
      const res = await authFetch(`/calendar/events/${id}`, { method: "DELETE" });
      if (res.ok) await reloadEvents();
    } catch {
      /* ignore */
    }
  };

  const openFamilySlotsEditor = useCallback(() => {
    setSlotDraft(slots.length ? slots.map((s) => ({ label: s.label })) : []);
    setSlotsEditorOpen(true);
  }, [slots]);

  const deleteEditingEvent = async () => {
    if (!editId) return;
    if (!confirm("Termin wirklich löschen?")) return;
    setSavingEvent(true);
    try {
      const res = await authFetch(`/calendar/events/${editId}`, { method: "DELETE" });
      if (res.ok) {
        setModalOpen(false);
        setEditId(null);
        await reloadEvents();
      }
    } catch {
      /* ignore */
    } finally {
      setSavingEvent(false);
    }
  };

  const monthTitle = new Date(cursor.y, cursor.m, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen w-full bg-[#050816] text-white overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.14),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.12),transparent_30%)]" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 pb-24">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-100">
            <ArrowLeft className="h-4 w-4" />
            Zurück zur App
          </Link>
          <div className="flex items-center gap-2 text-sky-200">
            <CalendarDays className="h-6 w-6" />
            <h1 className="text-2xl font-semibold tracking-tight">Kalender</h1>
          </div>
        </div>

        <p className="text-sm text-white/60 max-w-3xl mb-6">
          Hier siehst du <strong>alle Termine</strong>, die für dich in <strong>allen Workspaces</strong> sichtbar sind
          (z.&nbsp;B. Feuerwehr-Übung im Familien-Kalender mit Rubrik-Farbe). Neu anlegen tust du im gewählten Workspace
          unten. Pro Termin wählst du die <strong>Rubrik</strong> (Farbe & Symbol) und optional, bei wem der Eintrag{" "}
          <strong>mit angezeigt</strong> wird. Im Familienkalender gibt es fest <strong>Gemeinsam</strong> und deine
          Spalte mit <strong>Profilnamen</strong>; zusätzlich bis zu <strong>6 weitere Personen</strong>.{" "}
          <strong>Urlaub</strong>/<strong>Ferien</strong> als durchgehender Balken; in der <strong>Monatsliste</strong>{" "}
          bei Urlaub/Ferien <strong>Wer:</strong> (Spalte oder Gemeinsam).
        </p>

        {loading ? (
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        ) : (
          <>
            <div className="flex flex-wrap gap-3 mb-6 items-end">
              <div>
                <label className="block text-xs text-white/50 mb-1">Workspace</label>
                <select
                  className={SELECT_DARK}
                  value={workspaceId ?? ""}
                  onChange={(e) => setWorkspaceId(e.target.value || null)}
                >
                  {workspaces.map((w) => (
                    <option key={w.id} value={w.id} className={OPTION_DARK}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex rounded-xl border border-white/15 p-1 bg-black/20">
                <button
                  type="button"
                  onClick={() => setView("liste")}
                  className={`px-4 py-2 rounded-lg text-sm ${view === "liste" ? "bg-sky-500/25 text-sky-100" : "text-white/55"}`}
                >
                  Monatsliste
                </button>
                <button
                  type="button"
                  onClick={() => setView("familie")}
                  className={`px-4 py-2 rounded-lg text-sm ${view === "familie" ? "bg-fuchsia-500/25 text-fuchsia-100" : "text-white/55"}`}
                >
                  Familien-Spalten
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-white/15 px-2 py-1 bg-black/20">
                <button
                  type="button"
                  aria-label="Vorheriger Monat"
                  className="p-2 rounded-lg hover:bg-white/10"
                  onClick={() => setCursor((c) => (c.m <= 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }))}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <span className="text-sm font-medium min-w-[10rem] text-center capitalize">{monthTitle}</span>
                <button
                  type="button"
                  aria-label="Nächster Monat"
                  className="p-2 rounded-lg hover:bg-white/10"
                  onClick={() => setCursor((c) => (c.m >= 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }))}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <Button
                type="button"
                onClick={openNewModal}
                className="rounded-xl bg-gradient-to-r from-sky-500/30 to-violet-500/25 border border-sky-400/30 ml-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Termin · Urlaub · Ferien
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100"
                onClick={() => openFamilySlotsEditor()}
              >
                <Users className="h-4 w-4 mr-2" />
                Personen-Spalten
                <span className="ml-1.5 text-xs text-fuchsia-200/80">(max. 6)</span>
              </Button>
            </div>

            {listError ? <p className="text-sm text-red-300 mb-4">{listError}</p> : null}

            {view === "liste" ? (
              <div className="space-y-4">
                {days.map((d) => {
                  const key = dateKeyLocal(d);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  if (dayEvents.length === 0) return null;
                  return (
                    <div key={key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-sm text-white/50 mb-2">
                        {d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
                      </div>
                      <div className="space-y-2">
                        {dayEvents.map((ev) => {
                          const meta = CALENDAR_SECTION_META[ev.sectionId] ?? CALENDAR_SECTION_META.familie;
                          const Icon = SECTION_ICONS[ev.sectionId] ?? Home;
                          const canOpenEditor = ev.createdByUserId === mine && ev.kind !== "meeting";
                          return (
                            <motion.button
                              type="button"
                              key={ev.id}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              onClick={() => canOpenEditor && openEdit(ev)}
                              className={`w-full text-left rounded-xl border px-3 py-2 flex items-start gap-3 ${meta.border} bg-black/20 ${canOpenEditor ? "hover:bg-white/5 cursor-pointer" : "cursor-default opacity-95"}`}
                            >
                              <div className={`mt-0.5 p-1.5 rounded-lg ${meta.chip}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium flex items-center gap-2 flex-wrap">
                                  {ev.kind === "vacation" ? (
                                    <Palmtree className="h-4 w-4 text-amber-300 shrink-0" />
                                  ) : ev.kind === "ferien" ? (
                                    <GraduationCap className="h-4 w-4 text-violet-300 shrink-0" />
                                  ) : ev.kind === "meeting" ? (
                                    <Video className="h-4 w-4 text-cyan-300 shrink-0" />
                                  ) : null}
                                  {ev.title}
                                  {ev.kind === "meeting" ? (
                                    <span className="text-[10px] font-normal text-cyan-200/70 px-1.5 py-0.5 rounded border border-cyan-400/30">
                                      Meeting
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-xs text-white/50 mt-0.5">
                                  {showRangeOwnerInList(ev) ? (
                                    <span className="text-sky-300/90 font-medium">
                                      Wer: {familySlotOwnerLabel(ev, myColumnLabel)}
                                    </span>
                                  ) : null}
                                  {showRangeOwnerInList(ev) ? " · " : null}
                                  {ev.allDay
                                    ? "Ganztägig"
                                    : new Date(ev.startsAt).toLocaleTimeString("de-DE", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                  {ev.location ? ` · ${ev.location}` : ""}
                                  {ev.workspaceId !== workspaceId && ev.workspaceName
                                    ? ` · ${ev.workspaceName}`
                                    : ""}
                                  {ev.createdByUserId !== mine
                                    ? ` · von ${members.find((m) => m.userId === ev.createdByUserId)?.displayName ?? "Mitglied"}`
                                    : ""}
                                </div>
                              </div>
                              {ev.createdByUserId === mine ? (
                                <button
                                  type="button"
                                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-300 shrink-0"
                                  aria-label="Löschen"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void deleteEvent(ev.id);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              ) : null}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {events.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
                    Keine Termine in diesem Monat.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 text-sm">
                <div className="flex min-w-[720px] w-full">
                  <div className="sticky left-0 z-30 flex flex-col w-36 shrink-0 border-r border-white/10 bg-[#0a1020]/98">
                    <div className="h-10 flex items-center px-2 border-b border-white/10 text-white/60 text-xs font-medium">
                      Tag
                    </div>
                    {days.map((d) => (
                      <div
                        key={dateKeyLocal(d)}
                        className="h-[3.5rem] shrink-0 flex items-center px-2 border-b border-white/5 text-white/70 text-xs whitespace-nowrap"
                      >
                        {d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                    ))}
                  </div>
                  {columns.map((col) => {
                    const rangeBarsSource = events.filter(
                      (ev) =>
                        isCalendarRangeKind(ev.kind) &&
                        assignColumn(ev, mine, slots, myColumnLabel) === col.id
                    );
                    const vacationBars = rangeBarsSource
                      .map((ev) => {
                        const span = eventDayIndexSpan(ev, days);
                        return span ? { ev, span } : null;
                      })
                      .filter(Boolean) as Array<{
                        ev: ApiCalendarEvent;
                        span: { start: number; end: number };
                      }>;

                    return (
                      <div
                        key={col.id}
                        className="flex-1 min-w-[7rem] shrink-0 border-l border-white/10 flex flex-col"
                      >
                        <div className="h-10 flex items-center justify-center px-1 border-b border-white/10 text-white/80 text-xs font-medium text-center">
                          {col.label}
                        </div>
                        <div className="relative flex flex-col">
                          {vacationBars.map(({ ev, span }) => {
                            const canEdit = ev.createdByUserId === mine;
                            const rows = span.end - span.start + 1;
                            const ferien = ev.kind === "ferien";
                            return (
                              <button
                                type="button"
                                key={ev.id}
                                onClick={() => canEdit && openEdit(ev)}
                                className={`absolute left-0.5 right-0.5 rounded-md z-0 text-left px-1 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${
                                  ferien
                                    ? "border border-violet-400/50 bg-violet-600/50"
                                    : "border border-amber-400/50 bg-amber-600/50"
                                } ${
                                  canEdit
                                    ? ferien
                                      ? "cursor-pointer hover:bg-violet-600/65"
                                      : "cursor-pointer hover:bg-amber-600/65"
                                    : "cursor-default opacity-95"
                                }`}
                                style={{
                                  top: `calc(${span.start} * ${FAMILY_GRID_ROW_H})`,
                                  height: `calc(${rows} * ${FAMILY_GRID_ROW_H})`,
                                }}
                              >
                                <span
                                  className={`flex items-start gap-0.5 text-[10px] font-medium leading-tight line-clamp-3 ${
                                    ferien ? "text-violet-50" : "text-amber-50"
                                  }`}
                                >
                                  {ferien ? (
                                    <GraduationCap className="h-3 w-3 shrink-0 mt-0.5 opacity-95" />
                                  ) : (
                                    <Palmtree className="h-3 w-3 shrink-0 mt-0.5 opacity-95" />
                                  )}
                                  {ev.title}
                                </span>
                              </button>
                            );
                          })}
                          {days.map((d) => {
                            const key = dateKeyLocal(d);
                            const cell = events.filter(
                              (ev) =>
                                !isCalendarRangeKind(ev.kind) &&
                                eventTouchesDay(ev, d) &&
                                assignColumn(ev, mine, slots, myColumnLabel) === col.id
                            );
                            return (
                              <div
                                key={key}
                                className="h-[3.5rem] shrink-0 border-b border-white/5 relative pointer-events-none"
                              >
                                <div className="absolute inset-0 p-1 flex flex-col gap-1 z-20 pointer-events-auto">
                                  {cell.map((ev) => {
                                    const meta =
                                      CALENDAR_SECTION_META[ev.sectionId] ?? CALENDAR_SECTION_META.familie;
                                    const Icon = SECTION_ICONS[ev.sectionId] ?? Home;
                                    const canEdit = ev.createdByUserId === mine && ev.kind !== "meeting";
                                    return (
                                      <div key={ev.id} className="relative group flex gap-0.5 items-start min-w-0">
                                        <button
                                          type="button"
                                          onClick={() => canEdit && openEdit(ev)}
                                          className={`text-left flex-1 min-w-0 rounded-lg px-1.5 py-0.5 text-[11px] leading-tight border ${meta.border} ${meta.chip} line-clamp-2 ${canEdit ? "" : "opacity-90"}`}
                                        >
                                          {ev.kind === "meeting" ? (
                                            <Video className="inline h-3 w-3 mr-0.5 align-middle text-cyan-300 opacity-90" />
                                          ) : (
                                            <Icon className="inline h-3 w-3 mr-0.5 align-middle opacity-80" />
                                          )}
                                          {ev.title}
                                        </button>
                                        {ev.createdByUserId === mine ? (
                                          <button
                                            type="button"
                                            className="shrink-0 p-0.5 rounded hover:bg-red-500/25 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label="Löschen"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              void deleteEvent(ev.id);
                                            }}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {slotsEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-md border border-fuchsia-400/25 bg-[#0a1020] text-white max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Familien-Spalten (max. 6)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-white/55">
                „Gemeinsam“ und dein Profilname sind immer als Spalten dabei und hier nicht änderbar. Darunter bis zu 6
                weitere Namen — mit <strong>+ Person</strong> hinzufügen, mit × entfernen.
              </p>
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex gap-2 items-center">
                  <Input
                    value="Gemeinsam"
                    readOnly
                    disabled
                    className="flex-1 bg-white/5 border-white/10 opacity-80 cursor-not-allowed"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <Input
                    value={myColumnLabel}
                    readOnly
                    disabled
                    className="flex-1 bg-white/5 border-white/10 opacity-80 cursor-not-allowed"
                  />
                </div>
              </div>
              {slotDraft.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input
                    value={row.label}
                    onChange={(e) =>
                      setSlotDraft((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r))
                      )
                    }
                    placeholder={`Person ${i + 1}`}
                    className="flex-1 bg-white/5 border-white/15"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="shrink-0 text-red-300"
                    onClick={() => setSlotDraft((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </Button>
                </div>
              ))}
              {slotDraft.length < 6 ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSlotDraft((p) => [...p, { label: "" }])}
                >
                  + Person
                </Button>
              ) : null}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  disabled={savingSlots}
                  onClick={() => void submitSlots()}
                  className="flex-1 rounded-xl bg-fuchsia-500/25 border border-fuchsia-400/35"
                >
                  {savingSlots ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSlotsEditorOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <Card className="w-full max-w-lg max-h-[92vh] overflow-y-auto border border-sky-400/25 bg-[#0a1020] text-white">
            <CardHeader>
              <CardTitle>{editId ? "Eintrag bearbeiten" : "Termin, Urlaub oder Ferien"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {modalError ? (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-400/25 rounded-lg px-3 py-2">
                  {modalError}
                </p>
              ) : null}
              <div>
                <label className="text-xs text-white/55">Art</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormKind("appointment")}
                    className={`py-2 rounded-xl text-sm border ${
                      formKind === "appointment"
                        ? "bg-sky-500/25 border-sky-400/40"
                        : "border-white/15 bg-white/5"
                    }`}
                  >
                    Termin
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormKind("vacation")}
                    className={`py-2 rounded-xl text-sm border ${
                      formKind === "vacation"
                        ? "bg-amber-500/25 border-amber-400/40"
                        : "border-white/15 bg-white/5"
                    }`}
                  >
                    Urlaub
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormKind("ferien")}
                    className={`py-2 rounded-xl text-sm border ${
                      formKind === "ferien"
                        ? "bg-violet-500/25 border-violet-400/40"
                        : "border-white/15 bg-white/5"
                    }`}
                  >
                    Ferien
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/55">Rubrik</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CALENDAR_SECTION_IDS.map((sid) => {
                    const meta = CALENDAR_SECTION_META[sid];
                    const Icon = SECTION_ICONS[sid];
                    return (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => setFormSection(sid)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                          formSection === sid ? `${meta.chip} ring-1 ring-white/30` : "border-white/10 bg-white/5"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {formKind === "appointment" ? (
                <div>
                  <label className="text-xs text-white/55">Titel *</label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="mt-1 bg-white/5 border-white/15"
                    placeholder="z. B. Zahnarzt"
                  />
                </div>
              ) : (
                <p
                  className={`text-xs rounded-lg p-2 border ${
                    formKind === "ferien"
                      ? "text-violet-200/90 bg-violet-500/10 border-violet-400/25"
                      : "text-amber-200/80 bg-amber-500/10 border-amber-400/20"
                  }`}
                >
                  {formKind === "ferien" ? (
                    <>
                      Titel automatisch: <strong>Gemeinsam</strong> / deine Spalte → <strong>Ferien</strong>, sonst{" "}
                      <strong>Ferien von …</strong> (z. B. Kinderspalte).
                    </>
                  ) : (
                    <>
                      Titel automatisch: <strong>Gemeinsam</strong> / deine Spalte → <strong>Urlaub</strong>, sonst{" "}
                      <strong>Urlaub von …</strong>
                    </>
                  )}
                </p>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={formAllDay}
                  onChange={(e) => {
                    setFormAllDay(e.target.checked);
                    if (e.target.checked && formStart) {
                      const d = formStart.slice(0, 10);
                      setFormStart(d);
                      if (!formEnd) setFormEnd(d);
                    }
                  }}
                />
                Ganztägig (Datum von / bis)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/55">{formAllDay ? "Von (Datum)" : "Beginn"}</label>
                  <Input
                    type={formAllDay ? "date" : "datetime-local"}
                    value={formAllDay ? formStart.slice(0, 10) : formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="mt-1 bg-white/5 border-white/15"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/55">{formAllDay ? "Bis (Datum)" : "Ende (optional)"}</label>
                  <Input
                    type={formAllDay ? "date" : "datetime-local"}
                    value={formAllDay ? (formEnd || formStart).slice(0, 10) : formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="mt-1 bg-white/5 border-white/15"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-white/55">Ort (optional)</label>
                <Input
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="mt-1 bg-white/5 border-white/15"
                />
              </div>
              <div>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <label className="text-xs text-white/55">
                    {formKind === "vacation" || formKind === "ferien"
                      ? "Spalte (Person)"
                      : "Spalte im Familienkalender (optional)"}
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-fuchsia-300 hover:text-fuchsia-100 hover:bg-fuchsia-500/15 shrink-0"
                    onClick={() => {
                      setModalOpen(false);
                      openFamilySlotsEditor();
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Personen-Spalte
                  </Button>
                </div>
                <select
                  className={`mt-1 w-full ${SELECT_DARK}`}
                  value={formSlotId}
                  onChange={(e) => {
                    setFormSlotId(e.target.value);
                    if (formLegacySlot && e.target.value !== formLegacySlot.id) setFormLegacySlot(null);
                  }}
                >
                  <option value="" className={OPTION_DARK}>
                    {formKind === "appointment"
                      ? "Gemeinsam (keine Personen-Spalte)"
                      : "Gemeinsam"}
                  </option>
                  <option value={FAMILY_CALENDAR_SELF_SLOT_ID} className={OPTION_DARK}>
                    {myColumnLabel}
                  </option>
                  {formLegacySlot ? (
                    <option value={formLegacySlot.id} className={OPTION_DARK}>
                      {formLegacySlot.label} (bisherige Zuordnung)
                    </option>
                  ) : null}
                  {slots.map((s) => (
                    <option key={s.id} value={s.id} className={OPTION_DARK}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-white/40 mt-1">
                  Zusätzliche Spalten (Kind, Oma, …) legst du über „Personen-Spalte“ an — nicht über die Checkboxen
                  unten (das sind Workspace-Mitglieder).
                </p>
              </div>
              <div>
                <label className="text-xs text-white/55">Auch anzeigen bei … (Workspace-Mitglieder)</label>
                <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                  {members
                    .filter((m) => m.userId !== mine)
                    .map((m) => (
                      <label key={m.userId} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(formVis[m.userId])}
                          onChange={(e) =>
                            setFormVis((p) => ({ ...p, [m.userId]: e.target.checked }))
                          }
                        />
                        {m.displayName}
                      </label>
                    ))}
                  {members.filter((m) => m.userId !== mine).length === 0 ? (
                    <span className="text-xs text-white/45">Keine weiteren Mitglieder.</span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 items-center">
                {editId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={savingEvent}
                    onClick={() => void deleteEditingEvent()}
                    className="rounded-xl border border-red-400/30 text-red-300 hover:bg-red-500/15"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Löschen
                  </Button>
                ) : null}
                <Button
                  type="button"
                  disabled={savingEvent || (formKind === "appointment" && !formTitle.trim())}
                  onClick={() => void submitEvent()}
                  className="flex-1 min-w-[8rem] rounded-xl bg-sky-500/25 border border-sky-400/35"
                >
                  {savingEvent ? <Loader2 className="h-4 w-4 animate-spin" /> : "Speichern"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                  Abbrechen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
