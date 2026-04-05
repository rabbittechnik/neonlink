import type {
  CalendarAnnouncementPayload,
  CalendarEvent,
  CalendarEventKind,
  ChatRoomType,
  ContactVisibility,
  ContractBundle,
  ContractCustomCategory,
  ContractScope,
  EmployeeAbsencePeriod,
  EmployeeScheduleWish,
  EmploymentKind,
  FamilyCalendarSlot,
  FinanceCategory,
  FinanceKind,
  FinanceHouseholdEntry,
  FinanceHouseholdPlan,
  FinanceRecord,
  FinanceScope,
  HouseholdMonthlyFixedCosts,
  MietePaidBy,
  Meeting,
  MeetingRoom,
  Message,
  MessageAttachment,
  MonthlyWorkPlan,
  PersonalContact,
  ShiftWishEntry,
  WorkScheduleAccessRow,
  WorkScheduleChatMessage,
  PresenceStatus,
  Room,
  User,
  WorkScheduleDayPatterns,
  WorkScheduleRulesDoc,
  WorkShiftSlotDef,
  WorkplaceEmployee,
  Workspace,
} from "./types.js";
import { hashPassword } from "./auth.js";

const now = () => new Date().toISOString();
const makeFriendCode = () => `NLF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

/** DE: führende 0 → 49…; nur Ziffern, 8–15 Zeichen. */
export function normalizePhoneDigits(raw: string): string | null {
  let d = raw.replace(/\D/g, "");
  if (d.length < 8) return null;
  if (d.startsWith("0") && d.length >= 10) {
    d = `49${d.slice(1)}`;
  }
  if (d.length > 15) return null;
  return d;
}

type SeedUserInput = Omit<
  User,
  | "passwordSalt"
  | "passwordHash"
  | "contactEmail"
  | "emailVerified"
  | "phoneVerified"
  | "emailVisibility"
  | "phoneVisibility"
  | "bio"
  | "statusMessage"
  | "statusBySection"
  | "chatTextColor"
> &
  Partial<
    Pick<
      User,
      | "contactEmail"
      | "emailVerified"
      | "phoneVerified"
      | "emailVisibility"
      | "phoneVisibility"
      | "bio"
      | "statusMessage"
      | "statusBySection"
      | "chatTextColor"
    >
  > & { demoPassword: string };

function seedUser(partial: SeedUserInput): User {
  const { demoPassword, ...partialRest } = partial;
  const { salt, hash } = hashPassword(demoPassword);
  const defaults: Pick<
    User,
    | "contactEmail"
    | "emailVerified"
    | "phoneVerified"
    | "emailVisibility"
    | "phoneVisibility"
    | "bio"
    | "statusMessage"
    | "statusBySection"
    | "chatTextColor"
  > = {
    contactEmail: partial.contactEmail ?? partial.email,
    emailVerified: partial.emailVerified ?? true,
    phoneVerified: partial.phoneVerified ?? true,
    emailVisibility: partial.emailVisibility ?? "workspace",
    phoneVisibility: partial.phoneVisibility ?? "workspace",
    bio: partial.bio ?? "",
    statusMessage: partial.statusMessage ?? "",
    statusBySection: partial.statusBySection ?? {},
    chatTextColor: partial.chatTextColor ?? null,
  };
  return { ...defaults, ...partialRest, passwordSalt: salt, passwordHash: hash };
}

export const users: User[] = [
  seedUser({
    id: "u1",
    displayName: "Bianca",
    email: "bianca@example.com",
    phoneDigits: "491701111111",
    status: "online",
    friendCode: "NLF-BIANCA",
    demoPassword: "demo123",
  }),
  seedUser({
    id: "u2",
    displayName: "Matze",
    email: "matze@example.com",
    phoneDigits: "491702222222",
    status: "away",
    friendCode: "NLF-MATZE1",
    demoPassword: "demo123",
  }),
];

export const workspaces: Workspace[] = [
  { id: "ws-neonlink", name: "NeonLink", ownerUserId: "u1" },
];

export const workspaceMembers: Array<{
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "member" | "guest";
}> = [
  { workspaceId: "ws-neonlink", userId: "u1", role: "owner" },
  { workspaceId: "ws-neonlink", userId: "u2", role: "admin" },
];

const MEMBER_ROLE_RANK: Record<"owner" | "admin" | "member" | "guest", number> = {
  owner: 0,
  admin: 1,
  member: 2,
  guest: 3,
};

function memberRoleRank(role: "owner" | "admin" | "member" | "guest"): number {
  return MEMBER_ROLE_RANK[role];
}

/**
 * Entfernt doppelte (workspaceId, userId)-Zeilen. Verhindert u. a. doppelte Kalender-Spalten,
 * wenn dieselbe Mitgliedschaft mehrfach in Snapshots landete.
 */
export function dedupeWorkspaceMembers(): void {
  const byKey = new Map<
    string,
    { workspaceId: string; userId: string; role: "owner" | "admin" | "member" | "guest" }
  >();
  for (const m of workspaceMembers) {
    const key = `${m.workspaceId}\0${m.userId}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, m);
    } else if (memberRoleRank(m.role) < memberRoleRank(prev.role)) {
      byKey.set(key, m);
    }
  }
  if (byKey.size === workspaceMembers.length) return;
  workspaceMembers.length = 0;
  workspaceMembers.push(...byKey.values());
}

export const invites: Array<{
  id: string;
  workspaceId: string;
  code: string;
  expiresAt: string;
  maxUses: number;
  usedCount: number;
  createdBy: string;
}> = [];

/** Beim Senden: in welchen eigenen Kategorien der Empfänger erscheinen soll (Mehrfachwahl). */
export const friendRequests: Array<{
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  fromCategoryKeys?: string[];
}> = [];

export const friendships: Array<{
  userAId: string;
  userBId: string;
  createdAt: string;
}> = [];

export type FriendGroupAssignmentGroup =
  | "familie"
  | "freunde"
  | "verwandte"
  | "feuerwehr"
  | "arbeit"
  | "ideen"
  | "schule"
  | "verein"
  | "nachbarn"
  | "sonstiges";

export const friendGroupAssignments: Array<{
  ownerUserId: string;
  friendUserId: string;
  group: FriendGroupAssignmentGroup;
}> = [];

/** Nur für ownerUserId sichtbar (API filtert). */
export const personalContacts: PersonalContact[] = [];

export const rooms: Room[] = [
  {
    id: "room-fam-allg",
    workspaceId: "ws-neonlink",
    sectionId: "familie",
    name: "Familie Chat",
    kind: "text",
    chatType: "global",
    participants: [],
    isMain: true,
    createdAt: now(),
  },
  {
    id: "room-fam-kal",
    workspaceId: "ws-neonlink",
    sectionId: "familie",
    name: "Familienkalender",
    kind: "text",
    chatType: "global",
    participants: [],
    createdAt: now(),
  },
  {
    id: "room-feu-dienst",
    workspaceId: "ws-neonlink",
    sectionId: "feuerwehr",
    name: "Hauptchat",
    kind: "text",
    chatType: "global",
    participants: [],
    isMain: true,
    createdAt: now(),
  },
  {
    id: "room-feu-voice",
    workspaceId: "ws-neonlink",
    sectionId: "feuerwehr",
    name: "Sprachkanal",
    kind: "voice",
    chatType: "global",
    participants: [],
    createdAt: now(),
  },
  {
    id: "room-arb-team",
    workspaceId: "ws-neonlink",
    sectionId: "arbeit",
    name: "Teamchat",
    kind: "text",
    chatType: "global",
    participants: [],
    isMain: true,
    createdAt: now(),
  },
  {
    id: "room-arb-meet",
    workspaceId: "ws-neonlink",
    sectionId: "arbeit",
    name: "Meetings",
    kind: "meeting",
    chatType: "global",
    participants: [],
    createdAt: now(),
  },
];

/** Anhänge: optional Base64-Inhalt für Inline-Vorschau (Bild/GIF/Audio). */
export const attachmentRegistry = new Map<
  string,
  { fileName: string; mimeType: string; dataBase64?: string }
>();

/** Kategorien für Freundschafts-Zuordnung (Mehrfachwahl laut Produktanforderung). */
export const FRIENDSHIP_CATEGORY_KEYS = ["familie", "freunde", "arbeit", "feuerwehr"] as const;
export type FriendshipCategoryKey = (typeof FRIENDSHIP_CATEGORY_KEYS)[number];

export function normalizeFriendshipCategories(raw: unknown): FriendshipCategoryKey[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const set = new Set<FriendshipCategoryKey>();
  for (const x of raw) {
    if (typeof x !== "string") continue;
    if ((FRIENDSHIP_CATEGORY_KEYS as readonly string[]).includes(x)) {
      set.add(x as FriendshipCategoryKey);
    }
  }
  return set.size > 0 ? [...set] : null;
}

export const messages: Message[] = [
  {
    id: "m1",
    roomId: "room-fam-allg",
    senderUserId: "u1",
    body: "Willkommen im neuen NeonLink Chat.",
    createdAt: now(),
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: "cal-seed-1",
    workspaceId: "ws-neonlink",
    roomId: "room-fam-kal",
    sectionId: "familie",
    title: "Familien-Essen",
    startsAt: "2026-04-05T15:00:00.000Z",
    endsAt: null,
    allDay: false,
    location: "Zuhause",
    kind: "appointment",
    createdByUserId: "u1",
    visibilityUserIds: ["u2"],
    familySlotId: null,
    familySlotLabel: null,
    vacationForSelf: false,
    meetingId: null,
    meetingInvitees: [],
    meetingRoomId: null,
    createdAt: "2026-01-01T12:00:00.000Z",
  },
];

export const meetingRooms: MeetingRoom[] = [
  {
    id: "mroom-neon-1",
    workspaceId: "ws-neonlink",
    name: "Meetingraum 1",
    lockedName: true,
    sortOrder: 0,
    isDefault: true,
  },
  {
    id: "mroom-neon-2",
    workspaceId: "ws-neonlink",
    name: "Meetingraum 2",
    lockedName: true,
    sortOrder: 1,
    isDefault: true,
  },
  {
    id: "mroom-neon-3",
    workspaceId: "ws-neonlink",
    name: "Teamraum",
    lockedName: false,
    sortOrder: 2,
    isDefault: true,
  },
];

export const meetings: Meeting[] = [];

export const familyCalendarSlots: FamilyCalendarSlot[] = [
  {
    id: "fcs-demo-kind",
    workspaceId: "ws-neonlink",
    ownerUserId: "u1",
    label: "Kind",
    sortOrder: 0,
  },
];

const FAMILY_CALENDAR_SELF_SLOT_ID = "__self__";

const CALENDAR_SECTION_IDS = new Set([
  "familie",
  "freunde",
  "verwandte",
  "feuerwehr",
  "arbeit",
  "ideen",
]);

function parseCalendarDateMs(s: string): number {
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function calendarEventVisibleToViewer(viewerId: string, e: CalendarEvent): boolean {
  if (e.kind === "meeting" && e.meetingId) {
    return (e.meetingInvitees ?? []).includes(viewerId);
  }
  if (e.createdByUserId === viewerId) return true;
  return e.visibilityUserIds.includes(viewerId);
}

function calendarEventOverlapsRange(e: CalendarEvent, fromMs: number, toMs: number): boolean {
  const start = parseCalendarDateMs(e.startsAt);
  const end = e.endsAt ? parseCalendarDateMs(e.endsAt) : start;
  return start <= toMs && end >= fromMs;
}

type ChatBroadcastFn = (roomId: string, message: Message) => void;
let chatMessageBroadcaster: ChatBroadcastFn | undefined;

export function setChatMessageBroadcaster(fn: ChatBroadcastFn | undefined) {
  chatMessageBroadcaster = fn;
}

const CALENDAR_SECTION_LABEL_DE: Record<string, string> = {
  familie: "Familie",
  freunde: "Freunde",
  verwandte: "Verwandte",
  feuerwehr: "Feuerwehr",
  arbeit: "Arbeit",
  ideen: "Ideen",
};

function calendarKindLabelDe(kind: CalendarEventKind): string {
  if (kind === "vacation") return "Urlaub";
  if (kind === "ferien") return "Ferien";
  if (kind === "meeting") return "Meeting";
  return "Termin";
}

function formatCalendarEventDateTimeParts(ev: CalendarEvent): { dateLabel: string; timeLabel: string } {
  const start = new Date(ev.startsAt);
  if (Number.isNaN(start.getTime())) return { dateLabel: "", timeLabel: "" };
  const dateLabel = start.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (ev.allDay) {
    return { dateLabel, timeLabel: "ganztägig" };
  }
  const timeStart = start.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (ev.endsAt) {
    const end = new Date(ev.endsAt);
    if (!Number.isNaN(end.getTime())) {
      const timeEnd = end.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      return { dateLabel, timeLabel: `${timeStart} – ${timeEnd} Uhr` };
    }
  }
  return { dateLabel, timeLabel: `${timeStart} Uhr` };
}

/** Systemnachricht im Chat „Familienkalender“ (Rubrik Familie), wenn ein Kalendereintrag entsteht. */
function postFamilyKalenderCalendarAnnouncement(ev: CalendarEvent): void {
  const room = rooms.find(
    (r) =>
      r.workspaceId === ev.workspaceId &&
      r.sectionId === "familie" &&
      r.name === "Familienkalender" &&
      r.kind === "text"
  );
  if (!room) return;

  const creator = users.find((u) => u.id === ev.createdByUserId);
  const name = creator?.displayName?.trim() || "Jemand";
  const { dateLabel, timeLabel } = formatCalendarEventDateTimeParts(ev);
  const rubrik = CALENDAR_SECTION_LABEL_DE[ev.sectionId] ?? ev.sectionId;
  const art = calendarKindLabelDe(ev.kind);
  const loc = ev.location?.trim();
  const whenPlain = [dateLabel, timeLabel].filter(Boolean).join(", ");
  let body = `Neuer Kalendereintrag von ${name} am ${whenPlain}: „${ev.title}“. Rubrik: ${rubrik}. Art: ${art}.`;
  if (loc) body += ` Ort: ${loc}.`;

  const calendarAnnouncement: CalendarAnnouncementPayload = {
    creatorName: name,
    dateLabel,
    timeLabel,
    title: ev.title,
    rubrik,
    art,
    ...(loc ? { location: loc } : {}),
  };

  const message = createMessage(room.id, ev.createdByUserId, body, { calendarAnnouncement });
  chatMessageBroadcaster?.(room.id, message);
}

export function listCalendarEventsForViewer(
  viewerId: string,
  workspaceId: string,
  fromIso: string,
  toIso: string
): CalendarEvent[] {
  if (!isWorkspaceMember(viewerId, workspaceId)) return [];
  const fromMs = parseCalendarDateMs(fromIso);
  const toMs = parseCalendarDateMs(toIso);
  return calendarEvents.filter(
    (ev) =>
      ev.workspaceId === workspaceId &&
      calendarEventVisibleToViewer(viewerId, ev) &&
      calendarEventOverlapsRange(ev, fromMs, toMs)
  );
}

export type CalendarEventWithWorkspaceName = CalendarEvent & { workspaceName: string };

/** Alle sichtbaren Termine des Nutzers in allen Workspaces (Zeitraum). */
export function listAggregatedCalendarEventsForUser(
  viewerId: string,
  fromIso: string,
  toIso: string
): CalendarEventWithWorkspaceName[] {
  const wsList = listWorkspacesForUser(viewerId);
  const out: CalendarEventWithWorkspaceName[] = [];
  for (const w of wsList) {
    const rows = listCalendarEventsForViewer(viewerId, w.id, fromIso, toIso);
    for (const e of rows) {
      out.push({ ...e, workspaceName: w.name });
    }
  }
  return out;
}

/** Nächste Termine (noch nicht beendet), sortiert nach Start, max. `limit`. */
export function listUpcomingCalendarEventsForUser(
  viewerId: string,
  fromIso: string,
  toIso: string,
  limit: number
): CalendarEventWithWorkspaceName[] {
  const all = listAggregatedCalendarEventsForUser(viewerId, fromIso, toIso);
  const nowMs = Date.now();
  const filtered = all.filter((e) => {
    const start = parseCalendarDateMs(e.startsAt);
    const end = e.endsAt ? parseCalendarDateMs(e.endsAt) : start;
    return end >= nowMs - 60_000;
  });
  filtered.sort((a, b) => parseCalendarDateMs(a.startsAt) - parseCalendarDateMs(b.startsAt));
  return filtered.slice(0, Math.max(0, limit));
}

/** Neu angelegte Termine (ohne Meetings — die laufen über Meeting-Einladungen) von anderen, seit `sinceIso`. */
export function listRecentCalendarNewsForViewer(
  viewerId: string,
  sinceIso: string
): CalendarEventWithWorkspaceName[] {
  const sinceMs = parseCalendarDateMs(sinceIso);
  const wsList = listWorkspacesForUser(viewerId);
  const out: CalendarEventWithWorkspaceName[] = [];
  for (const w of wsList) {
    for (const ev of calendarEvents) {
      if (ev.workspaceId !== w.id) continue;
      if (!calendarEventVisibleToViewer(viewerId, ev)) continue;
      if (ev.createdByUserId === viewerId) continue;
      if (ev.kind === "meeting") continue;
      const createdMs = parseCalendarDateMs(ev.createdAt);
      if (createdMs < sinceMs) continue;
      out.push({ ...ev, workspaceName: w.name });
    }
  }
  out.sort((a, b) => parseCalendarDateMs(b.createdAt) - parseCalendarDateMs(a.createdAt));
  return out;
}

export function getCalendarEvent(id: string): CalendarEvent | undefined {
  return calendarEvents.find((x) => x.id === id);
}

export function listFamilyCalendarSlots(viewerUserId: string, workspaceId: string): FamilyCalendarSlot[] {
  if (!isWorkspaceMember(viewerUserId, workspaceId)) return [];
  ensureFamilyCalendarSlotsForWorkspace(workspaceId, viewerUserId);
  return familyCalendarSlots
    .filter((s) => s.workspaceId === workspaceId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Checks whether a workspace has a "familie" section (all personal workspaces do). */
function workspaceHasFamilieSection(workspaceId: string): boolean {
  return rooms.some((r) => r.workspaceId === workspaceId && r.sectionId === "familie");
}

/**
 * Ensures every workspace member has a named calendar slot and that the shared
 * "Gemeinsam" slot exists.  Safe to call multiple times — idempotent.
 */
export function ensureFamilyCalendarSlotsForWorkspace(
  workspaceId: string,
  triggeringUserId: string
): FamilyCalendarSlot[] {
  if (!workspaceHasFamilieSection(workspaceId)) return [];

  const members = workspaceMembers.filter((m) => m.workspaceId === workspaceId);
  const existing = familyCalendarSlots.filter((s) => s.workspaceId === workspaceId);

  // Determine the highest sortOrder already in use so new slots are appended.
  let maxOrder = existing.reduce((acc, s) => Math.max(acc, s.sortOrder), -1);

  const GEMEINSAM_LABEL = "Gemeinsam";
  const gemeinsamKey = GEMEINSAM_LABEL.toLowerCase();

  // Ensure each member has a slot labelled with their displayName (create or rename).
  for (const member of members) {
    const user = users.find((u) => u.id === member.userId);
    if (!user) continue;
    const label = user.displayName.trim().slice(0, 40) || `Mitglied`;
    const slotForMember = existing.find(
      (s) => s.ownerUserId === member.userId && s.workspaceId === workspaceId
    );
    if (slotForMember) {
      if (slotForMember.label !== label) slotForMember.label = label;
      continue;
    }
    maxOrder += 1;
    const newSlot: FamilyCalendarSlot = {
      id: `fcs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      ownerUserId: member.userId,
      label,
      sortOrder: maxOrder,
    };
    familyCalendarSlots.push(newSlot);
    existing.push(newSlot);
  }

  // Ensure the shared "Gemeinsam" slot exists (owned by the workspace owner or triggering user).
  const hasGemeinsam = existing.some(
    (s) => s.label.toLowerCase().trim() === gemeinsamKey
  );
  if (!hasGemeinsam) {
    const ws = workspaces.find((w) => w.id === workspaceId);
    const ownerUserId = ws?.ownerUserId ?? triggeringUserId;
    maxOrder += 1;
    const gemeinsamSlot: FamilyCalendarSlot = {
      id: `fcs-gemeinsam-${workspaceId}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      ownerUserId,
      label: GEMEINSAM_LABEL,
      sortOrder: maxOrder,
    };
    familyCalendarSlots.push(gemeinsamSlot);
  }

  return familyCalendarSlots.filter((s) => s.workspaceId === workspaceId).sort((a, b) => a.sortOrder - b.sortOrder);
}

function resolveFamilySlotForSave(
  editorId: string,
  workspaceId: string,
  familySlotId: string | null | undefined,
  kind: CalendarEventKind
):
  | { ok: true; familySlotId: string | null; familySlotLabel: string | null; vacationForSelf: boolean }
  | { ok: false; reason: string } {
  const sid =
    familySlotId === undefined || familySlotId === null || familySlotId === "" ? null : familySlotId;
  if (sid === null) {
    return { ok: true, familySlotId: null, familySlotLabel: null, vacationForSelf: false };
  }
  if (sid === FAMILY_CALENDAR_SELF_SLOT_ID) {
    const u = users.find((x) => x.id === editorId);
    return {
      ok: true,
      familySlotId: FAMILY_CALENDAR_SELF_SLOT_ID,
      familySlotLabel: u?.displayName ?? null,
      vacationForSelf: kind === "vacation" || kind === "ferien",
    };
  }
  // Any workspace member may use any slot that belongs to the workspace (shared family calendar).
  const slot = familyCalendarSlots.find(
    (s) => s.id === sid && s.workspaceId === workspaceId
  );
  if (!slot) return { ok: false, reason: "invalid_family_slot" };
  return {
    ok: true,
    familySlotId: sid,
    familySlotLabel: slot.label,
    vacationForSelf: false,
  };
}

export function replaceFamilyCalendarSlots(
  ownerUserId: string,
  workspaceId: string,
  slotsIn: Array<{ label: string }>
): { ok: true; slots: FamilyCalendarSlot[] } | { ok: false; reason: string } {
  if (!isWorkspaceMember(ownerUserId, workspaceId)) return { ok: false, reason: "forbidden" };

  const GEMEINSAM_LABEL = "Gemeinsam";
  const gemeinsamKey = GEMEINSAM_LABEL.toLowerCase();

  // Enforce max-6 limit on non-Gemeinsam slots supplied by the caller.
  const nonGemeinsamIn = slotsIn.filter((s) => s.label.trim().toLowerCase() !== gemeinsamKey);
  if (nonGemeinsamIn.length > 6) return { ok: false, reason: "max_6_slots" };

  // Work on all workspace-level slots (shared family calendar).
  const previous = familyCalendarSlots
    .filter((s) => s.workspaceId === workspaceId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const labelToIds = new Map<string, string[]>();
  for (const s of previous) {
    const key = s.label.toLowerCase().trim();
    const q = labelToIds.get(key) ?? [];
    q.push(s.id);
    labelToIds.set(key, q);
  }

  // Remove all existing workspace slots so we can rebuild them.
  for (let i = familyCalendarSlots.length - 1; i >= 0; i--) {
    const s = familyCalendarSlots[i]!;
    if (s.workspaceId === workspaceId) {
      familyCalendarSlots.splice(i, 1);
    }
  }

  // Build the new slot list from the caller's input.
  const ts = Date.now();
  const out: FamilyCalendarSlot[] = slotsIn.map((row, order) => {
    const label = row.label.trim().slice(0, 40) || `Person ${order + 1}`;
    const key = label.toLowerCase().trim();
    let id: string;
    const pool = labelToIds.get(key);
    if (pool && pool.length > 0) {
      id = pool.shift()!;
      if (pool.length) labelToIds.set(key, pool);
      else labelToIds.delete(key);
    } else {
      id = `fcs-${ts}-${order}-${Math.random().toString(36).slice(2, 6)}`;
    }
    return { id, workspaceId, ownerUserId, label, sortOrder: order };
  });

  // Always ensure the "Gemeinsam" slot is present (append if not already in the list).
  const hasGemeinsam = out.some((s) => s.label.toLowerCase().trim() === gemeinsamKey);
  if (!hasGemeinsam) {
    const existingGemeinsamId = labelToIds.get(gemeinsamKey)?.[0];
    const ws = workspaces.find((w) => w.id === workspaceId);
    const gemeinsamOwner = ws?.ownerUserId ?? ownerUserId;
    out.push({
      id: existingGemeinsamId ?? `fcs-gemeinsam-${workspaceId}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId,
      ownerUserId: gemeinsamOwner,
      label: GEMEINSAM_LABEL,
      sortOrder: out.length,
    });
  }

  const newIds = new Set(out.map((s) => s.id));
  for (const ev of calendarEvents) {
    if (ev.workspaceId !== workspaceId) continue;
    if (!ev.familySlotId || ev.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) continue;
    if (newIds.has(ev.familySlotId)) continue;
    const lbl = (ev.familySlotLabel ?? "").trim();
    if (!lbl) continue;
    const match = out.find((s) => s.label.toLowerCase().trim() === lbl.toLowerCase());
    if (match) {
      ev.familySlotId = match.id;
      ev.familySlotLabel = match.label;
    }
  }

  familyCalendarSlots.push(...out);
  return { ok: true, slots: out };
}

export function createCalendarEvent(input: {
  creatorId: string;
  workspaceId: string;
  sectionId: string;
  kind: CalendarEventKind;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string;
  visibilityUserIds: string[];
  familySlotId: string | null;
  meetingId?: string | null;
  meetingInvitees?: string[];
  meetingRoomId?: string | null;
}): { ok: true; event: CalendarEvent } | { ok: false; reason: string } {
  if (!isWorkspaceMember(input.creatorId, input.workspaceId)) {
    return { ok: false, reason: "forbidden" };
  }
  if (!CALENDAR_SECTION_IDS.has(input.sectionId)) {
    return { ok: false, reason: "invalid_section" };
  }

  if (input.kind === "meeting") {
    const title = input.title.trim().slice(0, 200);
    if (!title) return { ok: false, reason: "title_required" };
    const mid = (input.meetingId ?? "").trim();
    if (!mid) return { ok: false, reason: "meeting_id_required" };
    const inv = [...new Set((input.meetingInvitees ?? []).filter(Boolean))];
    if (!inv.includes(input.creatorId)) inv.push(input.creatorId);
    if (inv.length < 1) return { ok: false, reason: "meeting_invitees_required" };
    for (const uid of inv) {
      if (!isWorkspaceMember(uid, input.workspaceId)) return { ok: false, reason: "meeting_invitee_invalid" };
    }
    const mrid = (input.meetingRoomId ?? "").trim();
    if (!mrid) return { ok: false, reason: "meeting_room_required" };
    const mr = meetingRooms.find((r) => r.id === mrid && r.workspaceId === input.workspaceId);
    if (!mr) return { ok: false, reason: "meeting_room_not_found" };
    if (!input.endsAt) return { ok: false, reason: "endsAt_required" };
    const ev: CalendarEvent = {
      id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      workspaceId: input.workspaceId,
      sectionId: input.sectionId,
      title,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      allDay: false,
      location: input.location.trim().slice(0, 300),
      kind: "meeting",
      createdByUserId: input.creatorId,
      visibilityUserIds: [],
      familySlotId: null,
      familySlotLabel: null,
      vacationForSelf: false,
      meetingId: mid,
      meetingInvitees: inv,
      meetingRoomId: mrid,
      createdAt: now(),
    };
    calendarEvents.push(ev);
    postFamilyKalenderCalendarAnnouncement(ev);
    return { ok: true, event: ev };
  }

  const resolved = resolveFamilySlotForSave(
    input.creatorId,
    input.workspaceId,
    input.familySlotId,
    input.kind
  );
  if (!resolved.ok) return resolved;

  // For "familie" section events, automatically share with all workspace members so
  // everyone sees each other's calendar entries without manual visibility setup.
  let vis: string[];
  if (input.sectionId === "familie") {
    vis = workspaceMembers
      .filter((m) => m.workspaceId === input.workspaceId && m.userId !== input.creatorId)
      .map((m) => m.userId);
  } else {
    vis = [...new Set(input.visibilityUserIds.filter((id) => id && id !== input.creatorId))];
    for (const uid of vis) {
      if (!isWorkspaceMember(uid, input.workspaceId)) {
        return { ok: false, reason: "visibility_invalid" };
      }
    }
  }
  let title = input.title.trim().slice(0, 200);
  if (input.kind === "vacation") {
    if (!resolved.familySlotId) title = "Urlaub";
    else if (resolved.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) title = "Urlaub";
    else title = `Urlaub von ${resolved.familySlotLabel ?? ""}`.trim();
  } else if (input.kind === "ferien") {
    if (!resolved.familySlotId) title = "Ferien";
    else if (resolved.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) title = "Ferien";
    else title = `Ferien von ${resolved.familySlotLabel ?? ""}`.trim();
  }
  if (input.kind === "appointment" && !title) {
    return { ok: false, reason: "title_required" };
  }
  const ev: CalendarEvent = {
    id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    workspaceId: input.workspaceId,
    sectionId: input.sectionId,
    title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: input.allDay,
    location: input.location.trim().slice(0, 300),
    kind: input.kind,
    createdByUserId: input.creatorId,
    visibilityUserIds: vis,
    familySlotId: resolved.familySlotId,
    familySlotLabel: resolved.familySlotLabel,
    vacationForSelf: resolved.vacationForSelf,
    meetingId: null,
    meetingInvitees: [],
    meetingRoomId: null,
    createdAt: now(),
  };
  calendarEvents.push(ev);
  postFamilyKalenderCalendarAnnouncement(ev);
  return { ok: true, event: ev };
}

export function updateCalendarEvent(
  id: string,
  editorId: string,
  patch: Partial<
    Pick<
      CalendarEvent,
      | "sectionId"
      | "title"
      | "startsAt"
      | "endsAt"
      | "allDay"
      | "location"
      | "visibilityUserIds"
      | "familySlotId"
    >
  > & { kind?: CalendarEventKind }
): { ok: true; event: CalendarEvent } | { ok: false; reason: string } {
  const e = calendarEvents.find((x) => x.id === id);
  if (!e) return { ok: false, reason: "not_found" };
  if (e.createdByUserId !== editorId) return { ok: false, reason: "forbidden" };
  if (patch.sectionId !== undefined && !CALENDAR_SECTION_IDS.has(patch.sectionId)) {
    return { ok: false, reason: "invalid_section" };
  }
  if (patch.visibilityUserIds !== undefined) {
    const vis = [...new Set(patch.visibilityUserIds.filter((id) => id && id !== e.createdByUserId))];
    for (const uid of vis) {
      if (!isWorkspaceMember(uid, e.workspaceId)) {
        return { ok: false, reason: "visibility_invalid" };
      }
    }
    e.visibilityUserIds = vis;
  }
  if (patch.familySlotId !== undefined || patch.kind !== undefined) {
    const newKind = patch.kind ?? e.kind;
    const newSlotId = patch.familySlotId !== undefined ? patch.familySlotId : e.familySlotId;
    const resolved = resolveFamilySlotForSave(editorId, e.workspaceId, newSlotId, newKind);
    if (!resolved.ok) return resolved;
    e.familySlotId = resolved.familySlotId;
    e.familySlotLabel = resolved.familySlotLabel;
    e.vacationForSelf = resolved.vacationForSelf;
    e.kind = newKind;
    if (newKind === "vacation") {
      if (!e.familySlotId) e.title = "Urlaub";
      else if (e.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) e.title = "Urlaub";
      else e.title = `Urlaub von ${e.familySlotLabel ?? ""}`.trim();
    } else if (newKind === "ferien") {
      if (!e.familySlotId) e.title = "Ferien";
      else if (e.familySlotId === FAMILY_CALENDAR_SELF_SLOT_ID) e.title = "Ferien";
      else e.title = `Ferien von ${e.familySlotLabel ?? ""}`.trim();
    }
  }
  if (patch.sectionId !== undefined) e.sectionId = patch.sectionId;
  if (patch.startsAt !== undefined) e.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) e.endsAt = patch.endsAt;
  if (patch.allDay !== undefined) e.allDay = patch.allDay;
  if (patch.location !== undefined) e.location = patch.location.trim().slice(0, 300);
  if (patch.title !== undefined && (e.kind === "appointment" || e.kind === "meeting")) {
    const t = patch.title.trim().slice(0, 200);
    if (!t) return { ok: false, reason: "title_required" };
    e.title = t;
  }
  return { ok: true, event: e };
}

export function deleteCalendarEvent(id: string, editorId: string): { ok: true } | { ok: false; reason: string } {
  const idx = calendarEvents.findIndex((x) => x.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const ev = calendarEvents[idx]!;
  if (ev.createdByUserId !== editorId) return { ok: false, reason: "forbidden" };
  if (ev.meetingId) {
    const mi = meetings.findIndex((m) => m.calendarEventId === id);
    if (mi !== -1) meetings.splice(mi, 1);
  }
  calendarEvents.splice(idx, 1);
  return { ok: true };
}

export type CreateMessageInput = {
  replyToId?: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    /** Rohe Datei Base64 — Server speichert für GET /attachments/:id/view */
    dataBase64?: string;
  }>;
  calendarAnnouncement?: CalendarAnnouncementPayload;
};

/** Max. dekodierte Größe pro Anhang (Chat-Bilder, GIF, Sprache). */
export const MAX_CHAT_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export function createMessage(
  roomId: string,
  senderUserId: string,
  body: string,
  extra?: CreateMessageInput
): Message {
  let replyPreview: string | undefined;
  let replySenderId: string | undefined;
  if (extra?.replyToId) {
    const parent = messages.find((m) => m.id === extra.replyToId && m.roomId === roomId);
    if (parent) {
      replyPreview =
        parent.body.length > 120 ? `${parent.body.slice(0, 117)}...` : parent.body;
      replySenderId = parent.senderUserId;
    }
  }

  const attachments: MessageAttachment[] | undefined = extra?.attachments?.length
    ? extra.attachments.map((a, index) => {
        const att: MessageAttachment = {
          id: `att-${Date.now()}-${index}-${Math.floor(Math.random() * 10000)}`,
          fileName: a.fileName,
          mimeType: a.mimeType,
          sizeBytes: a.sizeBytes,
        };
        const reg: { fileName: string; mimeType: string; dataBase64?: string } = {
          fileName: att.fileName,
          mimeType: att.mimeType,
        };
        if (a.dataBase64 && typeof a.dataBase64 === "string" && a.dataBase64.length > 0) {
          reg.dataBase64 = a.dataBase64;
        }
        attachmentRegistry.set(att.id, reg);
        return att;
      })
    : undefined;

  const message: Message = {
    id: `m-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    roomId,
    senderUserId,
    body,
    createdAt: now(),
    replyToId: extra?.replyToId,
    replyPreview,
    replySenderId,
    attachments,
    reactions: [],
    calendarAnnouncement: extra?.calendarAnnouncement,
  };
  messages.push(message);
  return message;
}

export function createInvite(workspaceId: string, createdBy: string, maxUses = 10) {
  const code = `NL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const invite = {
    id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    workspaceId,
    code,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    maxUses,
    usedCount: 0,
    createdBy,
  };
  invites.push(invite);
  return invite;
}

const PERSONAL_ROOM_BLUEPRINT: Array<{
  sectionId: string;
  name: string;
  kind: Room["kind"];
  chatType: ChatRoomType;
  isMain?: boolean;
}> = [
  { sectionId: "familie", name: "Allgemein", kind: "text", chatType: "global", isMain: true },
  { sectionId: "familie", name: "Familienkalender", kind: "text", chatType: "global" },
  { sectionId: "freunde", name: "Allgemeiner Chat", kind: "text", chatType: "global", isMain: true },
  { sectionId: "verwandte", name: "Familiennews", kind: "text", chatType: "global", isMain: true },
  { sectionId: "feuerwehr", name: "Dienstplan", kind: "text", chatType: "global", isMain: true },
  { sectionId: "feuerwehr", name: "Sprachkanal", kind: "voice", chatType: "global" },
  { sectionId: "arbeit", name: "Teamchat", kind: "text", chatType: "global", isMain: true },
  { sectionId: "arbeit", name: "Meetings", kind: "meeting", chatType: "global" },
  { sectionId: "ideen", name: "Gemeinsame Planung", kind: "text", chatType: "global", isMain: true },
];

/** Eigener Workspace inkl. Standard-Raeume — nur fuer diesen Nutzer sichtbar, bis jemand per Invite beitritt. */
export function provisionPersonalWorkspace(ownerUserId: string, ownerDisplayName: string): Workspace {
  const wsId = `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const short = ownerDisplayName.trim().split(/\s+/)[0] || "Mein";
  const ws: Workspace = {
    id: wsId,
    name: `${short}s Bereich`,
    ownerUserId,
  };
  workspaces.push(ws);
  workspaceMembers.push({ workspaceId: wsId, userId: ownerUserId, role: "owner" });

  let welcomeRoomId: string | undefined;
  for (let i = 0; i < PERSONAL_ROOM_BLUEPRINT.length; i++) {
    const spec = PERSONAL_ROOM_BLUEPRINT[i]!;
    const roomId = `room-${wsId}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    rooms.push({
      id: roomId,
      workspaceId: wsId,
      sectionId: spec.sectionId,
      name: spec.name,
      kind: spec.kind,
      chatType: spec.chatType,
      participants: [],
      isMain: spec.isMain,
      createdAt: now(),
    });
    if (spec.sectionId === "familie" && spec.name === "Allgemein") {
      welcomeRoomId = roomId;
    }
  }
  const targetRoom = welcomeRoomId ?? rooms.find((r) => r.workspaceId === wsId)?.id;
  if (targetRoom) {
    messages.push({
      id: `m-welcome-${wsId}`,
      roomId: targetRoom,
      senderUserId: ownerUserId,
      body:
        "Willkommen in deinem persoenlichen NeonLink-Bereich. Nur du und von dir Eingeladene gehoeren zu diesem Workspace. Unter Freunde verwaltest du Kontakte und ordnest sie nur fuer dich Gruppen zu (Familie, Feuerwehr, …) — andere Nutzer sehen deine Gruppen und Chats hier nicht.",
      createdAt: now(),
    });
  }
  ensureMeetingRoomsForWorkspace(wsId);
  ensureFamilyCalendarSlotsForWorkspace(wsId, ownerUserId);
  return ws;
}

export function ensureMeetingRoomsForWorkspace(workspaceId: string): MeetingRoom[] {
  const labels = ["Meetingraum 1", "Meetingraum 2", "Teamraum"] as const;
  for (let i = 0; i < 3; i++) {
    const has = meetingRooms.some((m) => m.workspaceId === workspaceId && m.sortOrder === i);
    if (!has) {
      meetingRooms.push({
        id: `mroom-${workspaceId}-${i}-${Math.random().toString(36).slice(2, 8)}`,
        workspaceId,
        name: labels[i]!,
        lockedName: i < 2,
        sortOrder: i,
        isDefault: true,
      });
    }
  }
  return meetingRooms.filter((m) => m.workspaceId === workspaceId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function listMeetingRoomsForViewer(viewerId: string, workspaceId: string): MeetingRoom[] {
  if (!isWorkspaceMember(viewerId, workspaceId)) return [];
  return ensureMeetingRoomsForWorkspace(workspaceId);
}

export function renameMeetingRoom(
  editorId: string,
  workspaceId: string,
  roomId: string,
  name: string
): { ok: true; room: MeetingRoom } | { ok: false; reason: string } {
  const r = meetingRooms.find((x) => x.id === roomId && x.workspaceId === workspaceId);
  if (!r) return { ok: false, reason: "not_found" };
  if (!isWorkspaceMember(editorId, workspaceId)) return { ok: false, reason: "forbidden" };
  if (r.lockedName) return { ok: false, reason: "name_locked" };
  r.name = name.trim().slice(0, 80) || r.name;
  return { ok: true, room: r };
}

/** Nur Zusatz-Raeume (`isDefault: false`); Standard-3er bleiben. */
export function deleteMeetingRoom(
  userId: string,
  workspaceId: string,
  roomId: string
): { ok: true } | { ok: false; reason: string } {
  if (!isWorkspaceMember(userId, workspaceId)) return { ok: false, reason: "forbidden" };
  const idx = meetingRooms.findIndex((r) => r.id === roomId && r.workspaceId === workspaceId);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const r = meetingRooms[idx]!;
  if (r.isDefault) return { ok: false, reason: "cannot_delete_default_room" };
  const hasMeetings = meetings.some((m) => m.meetingRoomId === roomId && m.workspaceId === workspaceId);
  if (hasMeetings) return { ok: false, reason: "room_has_meetings" };
  meetingRooms.splice(idx, 1);
  return { ok: true };
}

export function createExtraMeetingRoom(
  userId: string,
  workspaceId: string,
  name: string
): { ok: true; room: MeetingRoom } | { ok: false; reason: string } {
  if (!isWorkspaceMember(userId, workspaceId)) return { ok: false, reason: "forbidden" };
  ensureMeetingRoomsForWorkspace(workspaceId);
  const list = meetingRooms.filter((m) => m.workspaceId === workspaceId);
  const maxO = list.reduce((a, m) => Math.max(a, m.sortOrder), -1);
  const room: MeetingRoom = {
    id: `mroom-${workspaceId}-x-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    workspaceId,
    name: name.trim().slice(0, 80) || "Neuer Raum",
    lockedName: false,
    sortOrder: maxO + 1,
    isDefault: false,
  };
  meetingRooms.push(room);
  return { ok: true, room };
}

export function listMeetingsInRoom(
  viewerId: string,
  workspaceId: string,
  meetingRoomId: string
): Meeting[] {
  if (!isWorkspaceMember(viewerId, workspaceId)) return [];
  const mr = meetingRooms.find((m) => m.id === meetingRoomId && m.workspaceId === workspaceId);
  if (!mr) return [];
  return meetings
    .filter(
      (m) =>
        m.workspaceId === workspaceId &&
        m.meetingRoomId === meetingRoomId &&
        (m.createdByUserId === viewerId || m.participantUserIds.includes(viewerId))
    )
    .slice()
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}

export function createWorkspaceMeeting(
  organizerId: string,
  workspaceId: string,
  input: {
    meetingRoomId: string;
    title: string;
    description?: string;
    participantUserIds: string[];
    startsAt: string;
    endsAt: string;
    sectionId: string;
  }
): { ok: true; meeting: Meeting; event: CalendarEvent } | { ok: false; reason: string } {
  if (!isWorkspaceMember(organizerId, workspaceId)) return { ok: false, reason: "forbidden" };
  ensureMeetingRoomsForWorkspace(workspaceId);
  const mr = meetingRooms.find((m) => m.id === input.meetingRoomId && m.workspaceId === workspaceId);
  if (!mr) return { ok: false, reason: "meeting_room_not_found" };
  const parts = [...new Set((input.participantUserIds ?? []).filter((id) => id && id !== organizerId))];
  for (const uid of parts) {
    if (!isWorkspaceMember(uid, workspaceId)) return { ok: false, reason: "participant_invalid" };
  }
  const newStartMs = new Date(input.startsAt).getTime();
  const newEndMs = new Date(input.endsAt).getTime();
  if (Number.isNaN(newStartMs) || Number.isNaN(newEndMs) || newEndMs <= newStartMs) {
    return { ok: false, reason: "invalid_time_range" };
  }
  /** Gleicher physische Raum: keine zeitliche Ueberlappung (grenzenlos aneinander ist ok). */
  const roomTaken = meetings.some((m) => {
    if (m.workspaceId !== workspaceId || m.meetingRoomId !== input.meetingRoomId) return false;
    const ms = new Date(m.startsAt).getTime();
    const me = new Date(m.endsAt).getTime();
    if (Number.isNaN(ms) || Number.isNaN(me)) return false;
    return newStartMs < me && newEndMs > ms;
  });
  if (roomTaken) return { ok: false, reason: "room_already_booked" };

  const meetingId = `mt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const invitees = [...new Set([organizerId, ...parts])];
  const title = input.title.trim().slice(0, 200);
  if (!title) return { ok: false, reason: "title_required" };
  const cal = createCalendarEvent({
    creatorId: organizerId,
    workspaceId,
    sectionId: input.sectionId,
    kind: "meeting",
    title,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    allDay: false,
    location: "",
    visibilityUserIds: [],
    familySlotId: null,
    meetingId,
    meetingInvitees: invitees,
    meetingRoomId: input.meetingRoomId,
  });
  if (!cal.ok) return cal;
  const meeting: Meeting = {
    id: meetingId,
    workspaceId,
    meetingRoomId: input.meetingRoomId,
    title,
    description: (input.description ?? "").trim().slice(0, 2000),
    createdByUserId: organizerId,
    participantUserIds: parts,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    calendarEventId: cal.event.id,
    createdAt: now(),
  };
  meetings.push(meeting);
  return { ok: true, meeting, event: cal.event };
}

export function getWorkspaceMeeting(
  meetingId: string,
  userId: string
): { ok: true; meeting: Meeting } | { ok: false; reason: string } {
  const m = meetings.find((x) => x.id === meetingId);
  if (!m) return { ok: false, reason: "not_found" };
  if (!isWorkspaceMember(userId, m.workspaceId)) return { ok: false, reason: "forbidden" };
  if (m.createdByUserId !== userId && !m.participantUserIds.includes(userId)) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, meeting: m };
}

export function deleteWorkspaceMeeting(
  meetingId: string,
  userId: string
): { ok: true } | { ok: false; reason: string } {
  const m = meetings.find((x) => x.id === meetingId);
  if (!m) return { ok: false, reason: "not_found" };
  if (m.createdByUserId !== userId) return { ok: false, reason: "forbidden" };
  return deleteCalendarEvent(m.calendarEventId, userId);
}

export function registerUserWithPassword(
  displayName: string,
  email: string,
  password: string,
  phoneRaw: string
): { ok: true; user: User } | { ok: false; reason: "email_taken" | "phone_taken" | "phone_invalid" } {
  if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, reason: "email_taken" };
  }
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  if (!phoneDigits) return { ok: false, reason: "phone_invalid" };
  if (users.some((u) => u.phoneDigits === phoneDigits)) {
    return { ok: false, reason: "phone_taken" };
  }
  const { salt, hash } = hashPassword(password);
  const em = email.trim().toLowerCase();
  const newUser: User = {
    id: `u-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    displayName: displayName.trim(),
    email: em,
    phoneDigits,
    status: "online",
    friendCode: makeFriendCode(),
    passwordSalt: salt,
    passwordHash: hash,
    contactEmail: em,
    emailVerified: true,
    phoneVerified: false,
    emailVisibility: "workspace",
    phoneVisibility: "workspace",
    bio: "",
    statusMessage: "",
    statusBySection: {},
    chatTextColor: null,
  };
  users.push(newUser);
  provisionPersonalWorkspace(newUser.id, newUser.displayName);
  return { ok: true, user: newUser };
}

export function listWorkspacesForUser(userId: string): Workspace[] {
  const ids = new Set(
    workspaceMembers.filter((m) => m.userId === userId).map((m) => m.workspaceId)
  );
  return workspaces.filter((w) => ids.has(w.id));
}

export function isWorkspaceMember(userId: string, workspaceId: string): boolean {
  return workspaceMembers.some((m) => m.workspaceId === workspaceId && m.userId === userId);
}

export function findRoomById(roomId: string): Room | undefined {
  return rooms.find((r) => r.id === roomId);
}

const CHAT_SECTION_IDS = new Set([
  "familie",
  "freunde",
  "verwandte",
  "feuerwehr",
  "arbeit",
  "ideen",
]);

export function canUserAccessRoom(userId: string, room: Room): boolean {
  if (!isWorkspaceMember(userId, room.workspaceId)) return false;
  if (room.chatType === "global") return true;
  return room.participants.includes(userId);
}

export function listRoomsForViewer(userId: string, workspaceId: string): Room[] {
  if (!isWorkspaceMember(userId, workspaceId)) return [];
  return rooms.filter((r) => r.workspaceId === workspaceId && canUserAccessRoom(userId, r));
}

export function findExistingPrivateChat(
  workspaceId: string,
  sectionId: string,
  userA: string,
  userB: string
): Room | undefined {
  return rooms.find((r) => {
    if (r.workspaceId !== workspaceId || r.sectionId !== sectionId || r.chatType !== "private") return false;
    if (r.participants.length !== 2) return false;
    return r.participants.includes(userA) && r.participants.includes(userB);
  });
}

export function getOrCreatePrivateChat(input: {
  workspaceId: string;
  sectionId: string;
  callerUserId: string;
  otherUserId: string;
}): { ok: true; room: Room; created: boolean } | { ok: false; reason: string } {
  const { workspaceId, sectionId, callerUserId, otherUserId } = input;
  if (!CHAT_SECTION_IDS.has(sectionId)) return { ok: false, reason: "invalid_section" };
  if (callerUserId === otherUserId) return { ok: false, reason: "invalid_peer" };
  if (!isWorkspaceMember(callerUserId, workspaceId) || !isWorkspaceMember(otherUserId, workspaceId)) {
    return { ok: false, reason: "not_workspace_member" };
  }
  const existing = findExistingPrivateChat(workspaceId, sectionId, callerUserId, otherUserId);
  if (existing) return { ok: true, room: existing, created: false };
  const roomId = `room-dm-${workspaceId}-${sectionId}-${Math.random().toString(36).slice(2, 10)}`;
  const room: Room = {
    id: roomId,
    workspaceId,
    sectionId,
    name: "",
    kind: "text",
    chatType: "private",
    participants: [callerUserId, otherUserId],
    createdAt: now(),
  };
  rooms.push(room);
  return { ok: true, room, created: true };
}

export function createGroupChatRoom(input: {
  workspaceId: string;
  sectionId: string;
  creatorUserId: string;
  name: string;
  participantUserIds: string[];
}): { ok: true; room: Room } | { ok: false; reason: string } {
  const { workspaceId, sectionId, creatorUserId, name, participantUserIds } = input;
  if (!CHAT_SECTION_IDS.has(sectionId)) return { ok: false, reason: "invalid_section" };
  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { ok: false, reason: "name_required" };
  if (!isWorkspaceMember(creatorUserId, workspaceId)) return { ok: false, reason: "not_workspace_member" };
  const ids = new Set<string>([creatorUserId, ...participantUserIds]);
  if (ids.size < 2) return { ok: false, reason: "participants_required" };
  for (const uid of ids) {
    if (!isWorkspaceMember(uid, workspaceId)) return { ok: false, reason: "participant_not_in_workspace" };
  }
  const roomId = `room-grp-${workspaceId}-${Math.random().toString(36).slice(2, 10)}`;
  const room: Room = {
    id: roomId,
    workspaceId,
    sectionId,
    name: trimmed,
    kind: "text",
    chatType: "group",
    participants: [...ids],
    createdAt: now(),
  };
  rooms.push(room);
  return { ok: true, room };
}

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function setUserPhoneDigits(
  userId: string,
  phoneRaw: string
): { ok: true } | { ok: false; reason: "invalid_phone" | "phone_taken" | "not_found" } {
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, reason: "not_found" };
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  if (!phoneDigits) return { ok: false, reason: "invalid_phone" };
  if (users.some((u) => u.id !== userId && u.phoneDigits === phoneDigits)) {
    return { ok: false, reason: "phone_taken" };
  }
  user.phoneDigits = phoneDigits;
  user.phoneVerified = false;
  return { ok: true };
}

export function lookupUserPublicByPhone(phoneRaw: string | undefined): {
  id: string;
  displayName: string;
  avatarUrl: string | null;
} | null {
  const digits = normalizePhoneDigits(phoneRaw ?? "");
  if (!digits) return null;
  const u = users.find((x) => x.phoneDigits === digits);
  if (!u) return null;
  return { id: u.id, displayName: u.displayName, avatarUrl: u.avatarUrl ?? null };
}

export function listPersonalContactsEnriched(ownerUserId: string) {
  return personalContacts
    .filter((c) => c.ownerUserId === ownerUserId)
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "de"))
    .map((c) => {
      const u = users.find((x) => x.phoneDigits === c.phoneDigits && x.id !== ownerUserId);
      return {
        id: c.id,
        displayName: c.displayName,
        phoneDigits: c.phoneDigits,
        linkedUserId: u?.id ?? c.linkedUserId,
        createdAt: c.createdAt,
        isNeonLinkUser: Boolean(u),
        avatarUrl: u?.avatarUrl ?? null,
        neonLinkDisplayName: u?.displayName ?? null,
      };
    });
}

export function addPersonalContact(
  ownerUserId: string,
  displayName: string,
  phoneRaw: string
): { ok: true; contact: PersonalContact } | { ok: false; reason: string } {
  const name = displayName.trim().slice(0, 80);
  if (!name) return { ok: false, reason: "name_required" };
  const phoneDigits = normalizePhoneDigits(phoneRaw);
  if (!phoneDigits) return { ok: false, reason: "phone_invalid" };
  const me = users.find((u) => u.id === ownerUserId);
  if (me && me.phoneDigits === phoneDigits) return { ok: false, reason: "cannot_add_self" };
  if (personalContacts.some((c) => c.ownerUserId === ownerUserId && c.phoneDigits === phoneDigits)) {
    return { ok: false, reason: "contact_exists" };
  }
  const linked = users.find((u) => u.phoneDigits === phoneDigits && u.id !== ownerUserId);
  const row: PersonalContact = {
    id: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerUserId,
    displayName: name,
    phoneDigits,
    linkedUserId: linked?.id ?? null,
    createdAt: now(),
  };
  personalContacts.push(row);
  return { ok: true, contact: row };
}

export function deletePersonalContact(
  ownerUserId: string,
  contactId: string
): { ok: true } | { ok: false; reason: string } {
  const idx = personalContacts.findIndex((c) => c.id === contactId && c.ownerUserId === ownerUserId);
  if (idx === -1) return { ok: false, reason: "not_found" };
  personalContacts.splice(idx, 1);
  return { ok: true };
}

export function setUserPassword(userId: string, plainPassword: string): boolean {
  const user = users.find((u) => u.id === userId);
  if (!user) return false;
  const { salt, hash } = hashPassword(plainPassword);
  user.passwordSalt = salt;
  user.passwordHash = hash;
  return true;
}

const MAX_AVATAR_DATA_URL_LENGTH = 480_000;

export function setUserAvatarDataUrl(
  userId: string,
  dataUrl: string | null
): { ok: true } | { ok: false; reason: string } {
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, reason: "user_not_found" };
  if (dataUrl === null || dataUrl === "") {
    user.avatarUrl = null;
    return { ok: true };
  }
  if (dataUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
    return { ok: false, reason: "avatar_too_large" };
  }
  if (!/^data:image\/(jpeg|png|gif|webp);base64,/i.test(dataUrl)) {
    return { ok: false, reason: "invalid_avatar_format" };
  }
  user.avatarUrl = dataUrl;
  return { ok: true };
}

export function hasSharedWorkspace(userA: string, userB: string): boolean {
  const aWs = new Set(workspaceMembers.filter((m) => m.userId === userA).map((m) => m.workspaceId));
  return workspaceMembers.some((m) => m.userId === userB && aWs.has(m.workspaceId));
}

/** Beide Nutzer in alle persönlichen Workspaces des anderen aufnehmen — gemeinsame Chats & Kalender. */
export function ensureMutualWorkspaceMembership(userA: string, userB: string): void {
  if (userA === userB) return;
  const touched = new Set<string>();
  const add = (workspaceId: string, userId: string) => {
    if (workspaceMembers.some((m) => m.workspaceId === workspaceId && m.userId === userId)) return;
    workspaceMembers.push({ workspaceId, userId, role: "member" });
    touched.add(workspaceId);
  };
  for (const w of workspaces) {
    if (w.ownerUserId === userA) add(w.id, userB);
    if (w.ownerUserId === userB) add(w.id, userA);
  }
  for (const wsId of touched) {
    ensureFamilyCalendarSlotsForWorkspace(wsId, userA);
  }
}

export function canSeeContactEmail(viewerId: string, target: User): boolean {
  if (viewerId === target.id) return true;
  if (target.emailVisibility === "public") return true;
  if (target.emailVisibility === "workspace" && hasSharedWorkspace(viewerId, target.id)) return true;
  return false;
}

export function canSeeContactPhone(viewerId: string, target: User): boolean {
  if (viewerId === target.id) return true;
  if (target.phoneVisibility === "public") return true;
  if (target.phoneVisibility === "workspace" && hasSharedWorkspace(viewerId, target.id)) return true;
  return false;
}

export function maskPhoneDigits(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length < 5) return "••••••";
  const headLen = d.length >= 11 ? 5 : 3;
  const head = d.slice(0, headLen);
  const tail = d.slice(-2);
  return `${head} •••••• ${tail}`;
}

export function formatUserForPeerView(viewerId: string, target: User) {
  const showEmail = canSeeContactEmail(viewerId, target);
  const showPhone = canSeeContactPhone(viewerId, target);
  const c = target.chatTextColor;
  const chatTextColor =
    typeof c === "string" && /^#[0-9A-Fa-f]{6}$/.test(c) ? c : null;
  return {
    id: target.id,
    displayName: target.displayName,
    status: target.status,
    friendCode: target.friendCode,
    avatarUrl: target.avatarUrl ?? null,
    chatTextColor,
    bio: target.bio.trim().slice(0, 2000),
    statusMessage: target.statusMessage.trim().slice(0, 280),
    statusBySection: target.statusBySection,
    contactEmail: showEmail ? target.contactEmail : null,
    phoneMasked: showPhone ? maskPhoneDigits(target.phoneDigits) : null,
    emailVerified: showEmail ? target.emailVerified : null,
    phoneVerified: showPhone ? target.phoneVerified : null,
  };
}

const VIS: ContactVisibility[] = ["private", "workspace", "public"];
const STATUS_SET = new Set<PresenceStatus>(["online", "away", "busy", "offline", "on_call"]);

/** Neuen Freundescode vergeben (eindeutig unter allen Nutzern). */
export function regenerateFriendCodeForUser(userId: string): { ok: true; friendCode: string } | { ok: false } {
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false };
  let code = makeFriendCode();
  for (let i = 0; i < 64; i++) {
    const taken = users.some((u) => u.id !== userId && u.friendCode === code);
    if (!taken) break;
    code = makeFriendCode();
  }
  user.friendCode = code;
  return { ok: true, friendCode: code };
}

export function patchUserProfile(
  userId: string,
  patch: Partial<{
    displayName: string;
    bio: string;
    statusMessage: string;
    status: PresenceStatus;
    statusBySection: Record<string, PresenceStatus>;
    contactEmail: string;
    emailVisibility: ContactVisibility;
    phoneVisibility: ContactVisibility;
    chatTextColor: string | null;
  }>
): { ok: true } | { ok: false; reason: string } {
  const user = users.find((u) => u.id === userId);
  if (!user) return { ok: false, reason: "not_found" };
  let displayNameUpdated = false;
  if (patch.displayName !== undefined) {
    const n = patch.displayName.trim().slice(0, 80);
    if (!n) return { ok: false, reason: "displayName_required" };
    user.displayName = n;
    displayNameUpdated = true;
  }
  if (patch.bio !== undefined) user.bio = patch.bio.trim().slice(0, 2000);
  if (patch.statusMessage !== undefined) user.statusMessage = patch.statusMessage.trim().slice(0, 280);
  if (patch.status !== undefined) {
    if (!STATUS_SET.has(patch.status)) return { ok: false, reason: "invalid_status" };
    user.status = patch.status;
  }
  if (patch.statusBySection !== undefined) {
    const next: Record<string, PresenceStatus> = { ...user.statusBySection };
    for (const [k, v] of Object.entries(patch.statusBySection)) {
      if (!STATUS_SET.has(v)) continue;
      next[k.slice(0, 32)] = v;
    }
    user.statusBySection = next;
  }
  if (patch.contactEmail !== undefined) {
    const e = patch.contactEmail.trim().toLowerCase().slice(0, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, reason: "invalid_email" };
    if (e !== user.contactEmail) user.emailVerified = false;
    user.contactEmail = e;
  }
  if (patch.emailVisibility !== undefined) {
    if (!VIS.includes(patch.emailVisibility)) return { ok: false, reason: "invalid_visibility" };
    user.emailVisibility = patch.emailVisibility;
  }
  if (patch.phoneVisibility !== undefined) {
    if (!VIS.includes(patch.phoneVisibility)) return { ok: false, reason: "invalid_visibility" };
    user.phoneVisibility = patch.phoneVisibility;
  }
  if (patch.chatTextColor !== undefined) {
    if (patch.chatTextColor === null || patch.chatTextColor === "") {
      user.chatTextColor = null;
    } else {
      const h = String(patch.chatTextColor).trim();
      if (!/^#[0-9A-Fa-f]{6}$/.test(h)) return { ok: false, reason: "invalid_chat_text_color" };
      user.chatTextColor = h;
    }
  }
  if (displayNameUpdated) {
    const wsSet = new Set(
      workspaceMembers.filter((m) => m.userId === userId).map((m) => m.workspaceId)
    );
    for (const wsId of wsSet) {
      ensureFamilyCalendarSlotsForWorkspace(wsId, userId);
    }
  }
  return { ok: true };
}

export function joinWorkspaceWithInvite(code: string, userId: string) {
  const invite = invites.find((entry) => entry.code === code);
  if (!invite) return { ok: false as const, reason: "invite_not_found" };
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    return { ok: false as const, reason: "invite_expired" };
  }
  if (invite.usedCount >= invite.maxUses) {
    return { ok: false as const, reason: "invite_max_used" };
  }
  const memberExists = workspaceMembers.some(
    (member) => member.workspaceId === invite.workspaceId && member.userId === userId
  );
  if (!memberExists) {
    workspaceMembers.push({ workspaceId: invite.workspaceId, userId, role: "member" });
  }
  invite.usedCount += 1;

  // Auto-create family calendar slots for all members (including the new joiner)
  // whenever someone joins a workspace that has a "familie" section.
  ensureFamilyCalendarSlotsForWorkspace(invite.workspaceId, userId);

  return { ok: true as const, workspaceId: invite.workspaceId };
}

export function searchUsers(requesterUserId: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return users
    .filter((user) => user.id !== requesterUserId)
    .filter(
      (user) =>
        user.displayName.toLowerCase().includes(q) ||
        user.friendCode.toLowerCase().includes(q)
    )
    .map((user) => ({
      id: user.id,
      displayName: user.displayName,
      friendCode: user.friendCode,
      avatarUrl: user.avatarUrl ?? null,
      contactEmail: user.emailVisibility === "public" ? user.contactEmail : null,
      phoneMasked: user.phoneVisibility === "public" ? maskPhoneDigits(user.phoneDigits) : null,
      emailVerified: user.emailVisibility === "public" ? user.emailVerified : null,
      phoneVerified: user.phoneVisibility === "public" ? user.phoneVerified : null,
    }));
}

export function createFriendRequest(
  fromUserId: string,
  toUserId: string,
  fromCategoryKeys?: FriendshipCategoryKey[] | null
) {
  if (fromUserId === toUserId) return { ok: false as const, reason: "cannot_add_self" };
  const existingFriendship = friendships.some(
    (entry) =>
      (entry.userAId === fromUserId && entry.userBId === toUserId) ||
      (entry.userAId === toUserId && entry.userBId === fromUserId)
  );
  if (existingFriendship) return { ok: false as const, reason: "already_friends" };

  const existingPending = friendRequests.find(
    (entry) =>
      entry.status === "pending" &&
      ((entry.fromUserId === fromUserId && entry.toUserId === toUserId) ||
        (entry.fromUserId === toUserId && entry.toUserId === fromUserId))
  );
  if (existingPending) return { ok: false as const, reason: "request_pending" };

  const cats = normalizeFriendshipCategories(fromCategoryKeys) ?? ["freunde"];
  const request = {
    id: `fr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fromUserId,
    toUserId,
    status: "pending" as const,
    createdAt: now(),
    fromCategoryKeys: cats,
  };
  friendRequests.push(request);
  return { ok: true as const, request };
}

export function listFriendRequests(userId: string, type: "incoming" | "outgoing" | "all" = "all") {
  return friendRequests
    .filter((entry) => {
      if (type === "incoming") return entry.toUserId === userId && entry.status === "pending";
      if (type === "outgoing") return entry.fromUserId === userId && entry.status === "pending";
      return (entry.fromUserId === userId || entry.toUserId === userId) && entry.status === "pending";
    })
    .map((entry) => ({
      ...entry,
      fromDisplayName: users.find((user) => user.id === entry.fromUserId)?.displayName,
    }));
}

export function respondToFriendRequest(
  requestId: string,
  userId: string,
  action: "accept" | "reject",
  opts?: { toCategoryKeys?: FriendshipCategoryKey[] | null }
) {
  const request = friendRequests.find((entry) => entry.id === requestId);
  if (!request) return { ok: false as const, reason: "request_not_found" };
  if (request.toUserId !== userId) return { ok: false as const, reason: "not_allowed" };
  if (request.status !== "pending") return { ok: false as const, reason: "already_processed" };

  request.status = action === "accept" ? "accepted" : "rejected";
  if (action === "accept") {
    friendships.push({ userAId: request.fromUserId, userBId: request.toUserId, createdAt: now() });
    const fromCats =
      normalizeFriendshipCategories(request.fromCategoryKeys) ?? (["freunde"] as FriendshipCategoryKey[]);
    const toCats = normalizeFriendshipCategories(opts?.toCategoryKeys) ?? (["freunde"] as FriendshipCategoryKey[]);
    applyFriendGroupRows(request.fromUserId, request.toUserId, fromCats);
    applyFriendGroupRows(request.toUserId, request.fromUserId, toCats);
    ensureMutualWorkspaceMembership(request.fromUserId, request.toUserId);
  }
  return { ok: true as const, request };
}

function applyFriendGroupRows(
  ownerUserId: string,
  friendUserId: string,
  groups: FriendGroupAssignmentGroup[]
): void {
  const g = [...new Set(groups)];
  const kept = friendGroupAssignments.filter(
    (e) => !(e.ownerUserId === ownerUserId && e.friendUserId === friendUserId)
  );
  friendGroupAssignments.length = 0;
  friendGroupAssignments.push(...kept);
  for (const group of g) {
    friendGroupAssignments.push({ ownerUserId, friendUserId, group });
  }
  if (g.includes("familie")) {
    ensureMutualWorkspaceMembership(ownerUserId, friendUserId);
  }
}

export function listFriends(userId: string) {
  const friendIds = friendships
    .map((entry) => {
      if (entry.userAId === userId) return entry.userBId;
      if (entry.userBId === userId) return entry.userAId;
      return null;
    })
    .filter((id): id is string => Boolean(id));

  const groupsByFriend = new Map<string, FriendGroupAssignmentGroup[]>();
  for (const entry of friendGroupAssignments) {
    if (entry.ownerUserId !== userId) continue;
    const arr = groupsByFriend.get(entry.friendUserId) ?? [];
    if (!arr.includes(entry.group)) arr.push(entry.group);
    groupsByFriend.set(entry.friendUserId, arr);
  }

  return users
    .filter((user) => friendIds.includes(user.id))
    .map((user) => {
      const groups = groupsByFriend.get(user.id) ?? ["freunde"];
      return {
        ...formatUserForPeerView(userId, user),
        groups,
        group: groups[0] ?? "freunde",
      };
    });
}

export function isFriend(userAId: string, userBId: string) {
  return friendships.some(
    (entry) =>
      (entry.userAId === userAId && entry.userBId === userBId) ||
      (entry.userAId === userBId && entry.userBId === userAId)
  );
}

export function setFriendGroups(
  ownerUserId: string,
  friendUserId: string,
  groups: FriendGroupAssignmentGroup[]
): { ok: true } | { ok: false; reason: string } {
  if (!isFriend(ownerUserId, friendUserId)) return { ok: false as const, reason: "not_friends" };
  const unique = [...new Set(groups)];
  if (unique.length === 0) return { ok: false as const, reason: "groups_required" };
  applyFriendGroupRows(ownerUserId, friendUserId, unique);
  return { ok: true as const };
}

export function setFriendGroup(
  ownerUserId: string,
  friendUserId: string,
  group:
    | "familie"
    | "freunde"
    | "verwandte"
    | "feuerwehr"
    | "arbeit"
    | "ideen"
    | "schule"
    | "verein"
    | "nachbarn"
    | "sonstiges"
) {
  return setFriendGroups(ownerUserId, friendUserId, [group]);
}

// --- Finanzen (Rechnungen / Einnahmen, pro Workspace, mit Sichtbarkeit) ---

export const financeRecords: FinanceRecord[] = [];

const MAX_FINANCE_DATA_URL = 2_200_000;

function deriveFinanceStatus(paidAt: string | null, dueDate: string | null): FinanceRecord["status"] {
  if (paidAt) return "paid";
  if (dueDate) {
    const end = new Date(dueDate);
    end.setHours(23, 59, 59, 999);
    if (end.getTime() < Date.now()) return "overdue";
  }
  return "open";
}

function isValidDataUrlImage(s: string): boolean {
  return /^data:image\/(jpeg|png|gif|webp);base64,/i.test(s) && s.length <= MAX_FINANCE_DATA_URL;
}

export function areUsersInSameFinanceHouseholdPlan(
  workspaceId: string,
  userA: string,
  userB: string
): boolean {
  if (userA === userB) return true;
  const pa = financeHouseholdPlans.find(
    (p) => p.workspaceId === workspaceId && p.memberUserIds.includes(userA)
  );
  const pb = financeHouseholdPlans.find(
    (p) => p.workspaceId === workspaceId && p.memberUserIds.includes(userB)
  );
  return Boolean(pa && pb && pa.id === pb.id);
}

function resolveFinanceRecordLinkedHousehold(
  userId: string,
  workspaceId: string,
  raw: unknown
): { ok: true; id: string | null } | { ok: false; reason: string } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, id: null };
  const id = String(raw).trim();
  if (!id) return { ok: true, id: null };
  const plan = financeHouseholdPlans.find(
    (p) => p.workspaceId === workspaceId && p.memberUserIds.includes(userId)
  );
  if (!plan) return { ok: false, reason: "no_household_plan" };
  if (!plan.households.some((h) => h.id === id)) return { ok: false, reason: "invalid_household" };
  return { ok: true, id };
}

export function canViewFinanceRecord(viewerId: string, r: FinanceRecord): boolean {
  if (r.ownerUserId === viewerId) return true;
  if (r.visibilityUserIds.includes(viewerId)) return true;
  return areUsersInSameFinanceHouseholdPlan(r.workspaceId, viewerId, r.ownerUserId);
}

export function listFinanceRecords(
  viewerId: string,
  workspaceId: string,
  filters?: {
    scope?: FinanceScope;
    kind?: FinanceKind;
    ownerUserId?: string;
    /** weglassen = alle; "none" = ohne Haushalt; sonst Haushalts-ID */
    linkedHouseholdId?: string;
  }
): FinanceRecord[] {
  if (!isWorkspaceMember(viewerId, workspaceId)) return [];
  return financeRecords.filter((r) => {
    if (r.workspaceId !== workspaceId) return false;
    if (!canViewFinanceRecord(viewerId, r)) return false;
    if (filters?.scope && r.scope !== filters.scope) return false;
    if (filters?.kind && r.kind !== filters.kind) return false;
    if (filters?.ownerUserId && r.ownerUserId !== filters.ownerUserId) return false;
    if (filters?.linkedHouseholdId !== undefined) {
      const f = filters.linkedHouseholdId;
      if (f === "none") {
        if (r.linkedHouseholdId) return false;
      } else if (r.linkedHouseholdId !== f) return false;
    }
    return true;
  });
}

export function getFinanceRecord(id: string): FinanceRecord | undefined {
  return financeRecords.find((r) => r.id === id);
}

/** Liste ohne Bild-Daten (kleine JSON-Antwort) */
export function toFinanceSummary(r: FinanceRecord) {
  const { imageDataUrl: _img, extraAttachmentDataUrl: _ex, ...rest } = r;
  return {
    ...rest,
    hasImage: Boolean(_img?.length),
    hasExtraAttachment: Boolean(_ex?.length),
  };
}

export function createFinanceRecord(input: {
  ownerUserId: string;
  workspaceId: string;
  scope: FinanceScope;
  kind: FinanceKind;
  category: FinanceCategory;
  title: string;
  amountCents: number;
  currency: string;
  dueDate: string | null;
  paidAt: string | null;
  payee: string | null;
  notes: string | null;
  imageDataUrl: string;
  extraAttachmentDataUrl: string | null;
  visibilityUserIds: string[];
  linkedHouseholdId?: unknown;
}): { ok: true; record: FinanceRecord } | { ok: false; reason: string } {
  if (!isWorkspaceMember(input.ownerUserId, input.workspaceId)) {
    return { ok: false, reason: "not_workspace_member" };
  }
  const linked = resolveFinanceRecordLinkedHousehold(
    input.ownerUserId,
    input.workspaceId,
    input.linkedHouseholdId
  );
  if (!linked.ok) return { ok: false, reason: linked.reason };
  if (!isValidDataUrlImage(input.imageDataUrl)) {
    return { ok: false, reason: "invalid_or_too_large_image" };
  }
  if (input.extraAttachmentDataUrl && !isValidDataUrlImage(input.extraAttachmentDataUrl)) {
    return { ok: false, reason: "invalid_or_too_large_attachment" };
  }
  const vis = [...new Set(input.visibilityUserIds.filter((id) => id && id !== input.ownerUserId))];
  for (const uid of vis) {
    if (!isWorkspaceMember(uid, input.workspaceId)) {
      return { ok: false, reason: "visibility_user_not_in_workspace" };
    }
  }
  const status = deriveFinanceStatus(input.paidAt, input.dueDate);
  const ts = now();
  const rec: FinanceRecord = {
    id: `fin-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ownerUserId: input.ownerUserId,
    workspaceId: input.workspaceId,
    scope: input.scope,
    kind: input.kind,
    category: input.category,
    title: input.title.trim().slice(0, 200),
    amountCents: Math.max(0, Math.round(input.amountCents)),
    currency: (input.currency || "EUR").slice(0, 8).toUpperCase(),
    dueDate: input.dueDate,
    paidAt: input.paidAt,
    status,
    payee: input.payee ? input.payee.slice(0, 200) : null,
    notes: input.notes ? input.notes.slice(0, 4000) : null,
    imageDataUrl: input.imageDataUrl,
    extraAttachmentDataUrl: input.extraAttachmentDataUrl,
    visibilityUserIds: vis,
    linkedHouseholdId: linked.id,
    createdAt: ts,
    updatedAt: ts,
  };
  financeRecords.push(rec);
  return { ok: true, record: rec };
}

export function updateFinanceRecord(
  id: string,
  editorId: string,
  patch: Partial<
    Pick<
      FinanceRecord,
      | "title"
      | "amountCents"
      | "currency"
      | "dueDate"
      | "paidAt"
      | "payee"
      | "notes"
      | "category"
      | "scope"
      | "kind"
      | "visibilityUserIds"
      | "imageDataUrl"
      | "extraAttachmentDataUrl"
      | "linkedHouseholdId"
    >
  >
): { ok: true; record: FinanceRecord } | { ok: false; reason: string } {
  const r = financeRecords.find((x) => x.id === id);
  if (!r) return { ok: false, reason: "not_found" };
  const canEdit =
    r.ownerUserId === editorId ||
    areUsersInSameFinanceHouseholdPlan(r.workspaceId, editorId, r.ownerUserId);
  if (!canEdit) return { ok: false, reason: "forbidden" };
  if (patch.linkedHouseholdId !== undefined) {
    const next = resolveFinanceRecordLinkedHousehold(editorId, r.workspaceId, patch.linkedHouseholdId);
    if (!next.ok) return { ok: false, reason: next.reason };
    r.linkedHouseholdId = next.id;
  }
  if (patch.imageDataUrl !== undefined && !isValidDataUrlImage(patch.imageDataUrl)) {
    return { ok: false, reason: "invalid_or_too_large_image" };
  }
  if (patch.extraAttachmentDataUrl !== undefined && patch.extraAttachmentDataUrl !== null) {
    if (!isValidDataUrlImage(patch.extraAttachmentDataUrl)) {
      return { ok: false, reason: "invalid_or_too_large_attachment" };
    }
  }
  if (patch.visibilityUserIds) {
    const vis = [...new Set(patch.visibilityUserIds.filter((id) => id && id !== r.ownerUserId))];
    for (const uid of vis) {
      if (!isWorkspaceMember(uid, r.workspaceId)) {
        return { ok: false, reason: "visibility_user_not_in_workspace" };
      }
    }
    r.visibilityUserIds = vis;
  }
  if (patch.title !== undefined) r.title = patch.title.trim().slice(0, 200);
  if (patch.amountCents !== undefined) r.amountCents = Math.max(0, Math.round(patch.amountCents));
  if (patch.currency !== undefined) r.currency = patch.currency.slice(0, 8).toUpperCase();
  if (patch.dueDate !== undefined) r.dueDate = patch.dueDate;
  if (patch.paidAt !== undefined) r.paidAt = patch.paidAt;
  if (patch.payee !== undefined) r.payee = patch.payee ? patch.payee.slice(0, 200) : null;
  if (patch.notes !== undefined) r.notes = patch.notes ? patch.notes.slice(0, 4000) : null;
  if (patch.category !== undefined) r.category = patch.category;
  if (patch.scope !== undefined) r.scope = patch.scope;
  if (patch.kind !== undefined) r.kind = patch.kind;
  if (patch.imageDataUrl !== undefined) r.imageDataUrl = patch.imageDataUrl;
  if (patch.extraAttachmentDataUrl !== undefined) r.extraAttachmentDataUrl = patch.extraAttachmentDataUrl;
  r.status = deriveFinanceStatus(r.paidAt, r.dueDate);
  r.updatedAt = now();
  return { ok: true, record: r };
}

export function deleteFinanceRecord(id: string, editorId: string): { ok: true } | { ok: false; reason: string } {
  const idx = financeRecords.findIndex((x) => x.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const r = financeRecords[idx]!;
  const canDel =
    r.ownerUserId === editorId ||
    areUsersInSameFinanceHouseholdPlan(r.workspaceId, editorId, r.ownerUserId);
  if (!canDel) return { ok: false, reason: "forbidden" };
  financeRecords.splice(idx, 1);
  return { ok: true };
}

// --- Haushaltsplan / Fixkosten (gemeinsam nutzbar) ---

export const financeHouseholdPlans: FinanceHouseholdPlan[] = [];

function findFinanceHouseholdPlanForUser(workspaceId: string, userId: string): FinanceHouseholdPlan | undefined {
  return financeHouseholdPlans.find(
    (p) => p.workspaceId === workspaceId && p.memberUserIds.includes(userId)
  );
}

export function getFinanceHouseholdPlanForViewer(
  viewerId: string,
  workspaceId: string
): FinanceHouseholdPlan | undefined {
  if (!isWorkspaceMember(viewerId, workspaceId)) return undefined;
  return findFinanceHouseholdPlanForUser(workspaceId, viewerId);
}

function parseMietePaidBy(raw: unknown): MietePaidBy {
  if (raw === "person1" || raw === "person2" || raw === "household") return raw;
  return "household";
}

function normalizeCostCents(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x) || x < 0) return 0;
  return Math.min(Math.round(x), 999_999_999);
}

export function defaultHouseholdCosts(): HouseholdMonthlyFixedCosts {
  return {
    mieteCents: 0,
    mietePaidBy: "household",
    internetCents: 0,
    versicherungenCents: 0,
    autoCents: 0,
    stromCents: 0,
    wasserCents: 0,
    heizungCents: 0,
    handyCents: 0,
    streamingCents: 0,
    krediteCents: 0,
    lebensmittelCents: 0,
  };
}

function parseHouseholdCosts(raw: unknown): HouseholdMonthlyFixedCosts {
  const base = defaultHouseholdCosts();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    mieteCents: normalizeCostCents(o.mieteCents ?? o.miete),
    mietePaidBy: parseMietePaidBy(o.mietePaidBy),
    internetCents: normalizeCostCents(o.internetCents ?? o.internet),
    versicherungenCents: normalizeCostCents(o.versicherungenCents ?? o.versicherungen),
    autoCents: normalizeCostCents(o.autoCents ?? o.auto),
    stromCents: normalizeCostCents(o.stromCents ?? o.strom),
    wasserCents: normalizeCostCents(o.wasserCents ?? o.wasser),
    heizungCents: normalizeCostCents(o.heizungCents ?? o.heizung),
    handyCents: normalizeCostCents(o.handyCents ?? o.handy),
    streamingCents: normalizeCostCents(o.streamingCents ?? o.streaming),
    krediteCents: normalizeCostCents(o.krediteCents ?? o.kredite),
    lebensmittelCents: normalizeCostCents(o.lebensmittelCents ?? o.lebensmittel),
  };
}

function deleteSoloFinanceHouseholdPlans(workspaceId: string, userIds: string[]) {
  const set = new Set(userIds);
  for (let i = financeHouseholdPlans.length - 1; i >= 0; i--) {
    const p = financeHouseholdPlans[i]!;
    if (p.workspaceId !== workspaceId) continue;
    if (p.memberUserIds.length === 1 && set.has(p.memberUserIds[0]!)) {
      financeHouseholdPlans.splice(i, 1);
    }
  }
}

function assertUsersFreeForNewSharedPlan(
  workspaceId: string,
  userIds: string[]
): { ok: true } | { ok: false; reason: string } {
  const uniq = [...new Set(userIds)];
  for (const uid of uniq) {
    if (!isWorkspaceMember(uid, workspaceId)) return { ok: false, reason: "user_not_in_workspace" };
    const p = findFinanceHouseholdPlanForUser(workspaceId, uid);
    if (p && p.memberUserIds.length > 1) {
      return { ok: false, reason: "user_in_existing_shared_plan" };
    }
  }
  return { ok: true };
}

export function createFinanceHouseholdPlan(input: {
  ownerUserId: string;
  workspaceId: string;
  shareWithUserIds: string[];
  households: Array<{ name: string; costs?: unknown }>;
}): { ok: true; plan: FinanceHouseholdPlan } | { ok: false; reason: string } {
  const { ownerUserId, workspaceId } = input;
  if (!isWorkspaceMember(ownerUserId, workspaceId)) {
    return { ok: false, reason: "not_workspace_member" };
  }
  if (findFinanceHouseholdPlanForUser(workspaceId, ownerUserId)) {
    return { ok: false, reason: "plan_already_exists" };
  }
  const share = [...new Set(input.shareWithUserIds.filter((id) => id && id !== ownerUserId))];
  const memberUserIds = [ownerUserId, ...share];
  const free = assertUsersFreeForNewSharedPlan(workspaceId, memberUserIds);
  if (!free.ok) return free;
  deleteSoloFinanceHouseholdPlans(workspaceId, memberUserIds);
  if (memberUserIds.some((uid) => findFinanceHouseholdPlanForUser(workspaceId, uid))) {
    return { ok: false, reason: "user_in_existing_shared_plan" };
  }
  const hhInput = input.households;
  if (!Array.isArray(hhInput) || hhInput.length < 1 || hhInput.length > 12) {
    return { ok: false, reason: "invalid_household_count" };
  }
  const ts = now();
  const households: FinanceHouseholdEntry[] = hhInput.map((h, idx) => ({
    id: `hh-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    name: (h.name || `Haushalt ${idx + 1}`).trim().slice(0, 80) || `Haushalt ${idx + 1}`,
    costs: h.costs && typeof h.costs === "object" ? parseHouseholdCosts(h.costs) : defaultHouseholdCosts(),
  }));
  const plan: FinanceHouseholdPlan = {
    id: `fhp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    workspaceId,
    ownerUserId,
    memberUserIds,
    households,
    createdAt: ts,
    updatedAt: ts,
  };
  financeHouseholdPlans.push(plan);
  return { ok: true, plan };
}

export function patchFinanceHouseholdPlan(input: {
  editorId: string;
  workspaceId: string;
  households?: FinanceHouseholdEntry[];
  memberUserIds?: string[];
}): { ok: true; plan: FinanceHouseholdPlan } | { ok: false; reason: string } {
  const { editorId, workspaceId } = input;
  const plan = findFinanceHouseholdPlanForUser(workspaceId, editorId);
  if (!plan) return { ok: false, reason: "not_found" };
  if (!plan.memberUserIds.includes(editorId)) return { ok: false, reason: "forbidden" };

  if (input.households !== undefined) {
    const list = input.households;
    if (!Array.isArray(list) || list.length < 1 || list.length > 12) {
      return { ok: false, reason: "invalid_household_count" };
    }
    plan.households = list.map((h, idx) => ({
      id:
        typeof h.id === "string" && h.id.startsWith("hh-")
          ? h.id.slice(0, 48)
          : `hh-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      name: (h.name || `Haushalt ${idx + 1}`).trim().slice(0, 80) || `Haushalt ${idx + 1}`,
      costs: parseHouseholdCosts(h.costs),
    }));
  }

  if (input.memberUserIds !== undefined) {
    if (plan.ownerUserId !== editorId) return { ok: false, reason: "only_owner_can_change_members" };
    const next = [...new Set(input.memberUserIds.filter(Boolean))];
    if (!next.includes(plan.ownerUserId)) return { ok: false, reason: "owner_must_remain_member" };
    for (const uid of next) {
      if (!isWorkspaceMember(uid, workspaceId)) return { ok: false, reason: "user_not_in_workspace" };
    }
    const added = next.filter((id) => !plan.memberUserIds.includes(id));
    const free = assertUsersFreeForNewSharedPlan(workspaceId, added);
    if (!free.ok) return free;
    deleteSoloFinanceHouseholdPlans(workspaceId, added);
    if (added.some((uid) => {
      const ex = findFinanceHouseholdPlanForUser(workspaceId, uid);
      return ex && ex.id !== plan.id;
    })) {
      return { ok: false, reason: "user_in_existing_shared_plan" };
    }
    plan.memberUserIds = next;
  }

  plan.updatedAt = now();
  return { ok: true, plan };
}

// --- Verträge (Kategorien + mehrseitige Dokumente) ---

export const CONTRACT_PRESET_CATEGORY_KEYS = new Set([
  "mietvertrag",
  "lohnabrechnung",
  "stromanbieter",
  "handyvertrag",
  "home_internet",
  "kfz_versicherung",
  "krankenkasse",
  "streaming",
  "bank",
  "nebenkosten",
  "wohngebaeude",
  "rechtsschutz",
  "hausrat",
  "lebensversicherung",
  "sonstiges_vertrag",
]);

export const contractBundles: ContractBundle[] = [];
export const contractCustomCategories: ContractCustomCategory[] = [];

const MAX_CONTRACT_PAGES = 40;
/** Ein PDF als data-URL (Base64) – großzügiger als Bilder, Gesamtgröße weiter durch Express-Limit begrenzt. */
const MAX_CONTRACT_PAGE_PDF = 7_500_000;

function isValidContractPageDataUrl(u: string): boolean {
  if (isValidDataUrlImage(u)) return true;
  return /^data:application\/pdf;base64,/i.test(u) && u.length <= MAX_CONTRACT_PAGE_PDF;
}

function contractCategoryAllowed(
  key: string,
  ownerUserId: string,
  workspaceId: string
): boolean {
  if (CONTRACT_PRESET_CATEGORY_KEYS.has(key)) return true;
  return contractCustomCategories.some(
    (c) =>
      c.key === key && c.ownerUserId === ownerUserId && c.workspaceId === workspaceId
  );
}

export function canViewContractBundle(viewerId: string, b: ContractBundle): boolean {
  if (b.ownerUserId === viewerId) return true;
  if (b.visibilityUserIds.includes(viewerId)) return true;
  return areUsersInSameFinanceHouseholdPlan(b.workspaceId, viewerId, b.ownerUserId);
}

export function listContractBundles(
  viewerId: string,
  workspaceId: string,
  filters?: { scope?: ContractScope; categoryKey?: string; ownerUserId?: string }
): ContractBundle[] {
  if (!isWorkspaceMember(viewerId, workspaceId)) return [];
  return contractBundles.filter((b) => {
    if (b.workspaceId !== workspaceId) return false;
    if (!canViewContractBundle(viewerId, b)) return false;
    if (filters?.scope && b.scope !== filters.scope) return false;
    if (filters?.categoryKey && b.categoryKey !== filters.categoryKey) return false;
    if (filters?.ownerUserId && b.ownerUserId !== filters.ownerUserId) return false;
    return true;
  });
}

export function getContractBundle(id: string): ContractBundle | undefined {
  return contractBundles.find((b) => b.id === id);
}

export function toContractSummary(b: ContractBundle) {
  const { pageDataUrls, ...rest } = b;
  return {
    ...rest,
    pageCount: pageDataUrls.length,
  };
}

function isValidContractPageBatch(urls: string[]): boolean {
  if (!urls.length || urls.length > MAX_CONTRACT_PAGES) return false;
  return urls.every((u) => isValidContractPageDataUrl(u));
}

export function createContractBundle(input: {
  ownerUserId: string;
  workspaceId: string;
  scope: ContractScope;
  categoryKey: string;
  title: string;
  pageDataUrls: string[];
  visibilityUserIds: string[];
}): { ok: true; bundle: ContractBundle } | { ok: false; reason: string } {
  if (!isWorkspaceMember(input.ownerUserId, input.workspaceId)) {
    return { ok: false, reason: "not_workspace_member" };
  }
  if (!contractCategoryAllowed(input.categoryKey, input.ownerUserId, input.workspaceId)) {
    return { ok: false, reason: "invalid_category_key" };
  }
  if (!isValidContractPageBatch(input.pageDataUrls)) {
    return { ok: false, reason: "invalid_pages" };
  }
  const vis = [...new Set(input.visibilityUserIds.filter((id) => id && id !== input.ownerUserId))];
  for (const uid of vis) {
    if (!isWorkspaceMember(uid, input.workspaceId)) {
      return { ok: false, reason: "visibility_user_not_in_workspace" };
    }
  }
  const ts = now();
  const bundle: ContractBundle = {
    id: `ctr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ownerUserId: input.ownerUserId,
    workspaceId: input.workspaceId,
    scope: input.scope,
    categoryKey: input.categoryKey,
    title: input.title.trim().slice(0, 200) || "Ohne Titel",
    pageDataUrls: [...input.pageDataUrls],
    visibilityUserIds: vis,
    createdAt: ts,
    updatedAt: ts,
  };
  contractBundles.push(bundle);
  return { ok: true, bundle };
}

export function updateContractBundle(
  id: string,
  editorId: string,
  patch: {
    title?: string;
    visibilityUserIds?: string[];
    appendPageDataUrls?: string[];
  }
): { ok: true; bundle: ContractBundle } | { ok: false; reason: string } {
  const b = contractBundles.find((x) => x.id === id);
  if (!b) return { ok: false, reason: "not_found" };
  const canEdit =
    b.ownerUserId === editorId ||
    areUsersInSameFinanceHouseholdPlan(b.workspaceId, editorId, b.ownerUserId);
  if (!canEdit) return { ok: false, reason: "forbidden" };
  if (patch.appendPageDataUrls !== undefined) {
    const add = patch.appendPageDataUrls;
    if (!add.length) return { ok: false, reason: "invalid_pages" };
    if (b.pageDataUrls.length + add.length > MAX_CONTRACT_PAGES) {
      return { ok: false, reason: "too_many_pages" };
    }
    if (!add.every((u) => isValidContractPageDataUrl(u))) {
      return { ok: false, reason: "invalid_pages" };
    }
    b.pageDataUrls = [...b.pageDataUrls, ...add];
  }
  if (patch.title !== undefined) b.title = patch.title.trim().slice(0, 200) || b.title;
  if (patch.visibilityUserIds) {
    const vis = [...new Set(patch.visibilityUserIds.filter((id) => id && id !== b.ownerUserId))];
    for (const uid of vis) {
      if (!isWorkspaceMember(uid, b.workspaceId)) {
        return { ok: false, reason: "visibility_user_not_in_workspace" };
      }
    }
    b.visibilityUserIds = vis;
  }
  b.updatedAt = now();
  return { ok: true, bundle: b };
}

export function deleteContractBundle(id: string, editorId: string): { ok: true } | { ok: false; reason: string } {
  const idx = contractBundles.findIndex((x) => x.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const b = contractBundles[idx]!;
  const canDel =
    b.ownerUserId === editorId ||
    areUsersInSameFinanceHouseholdPlan(b.workspaceId, editorId, b.ownerUserId);
  if (!canDel) return { ok: false, reason: "forbidden" };
  contractBundles.splice(idx, 1);
  return { ok: true };
}

export function createContractCustomCategory(input: {
  ownerUserId: string;
  workspaceId: string;
  label: string;
}): { ok: true; cat: ContractCustomCategory } | { ok: false; reason: string } {
  if (!isWorkspaceMember(input.ownerUserId, input.workspaceId)) {
    return { ok: false, reason: "not_workspace_member" };
  }
  const label = input.label.trim().slice(0, 80);
  if (!label) return { ok: false, reason: "empty_label" };
  const key = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const ts = now();
  const cat: ContractCustomCategory = {
    id: `ctc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workspaceId: input.workspaceId,
    ownerUserId: input.ownerUserId,
    key,
    label,
    createdAt: ts,
  };
  contractCustomCategories.push(cat);
  return { ok: true, cat };
}

export function deleteContractCustomCategory(
  id: string,
  editorId: string
): { ok: true } | { ok: false; reason: string } {
  const idx = contractCustomCategories.findIndex((c) => c.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const c = contractCustomCategories[idx]!;
  if (c.ownerUserId !== editorId) return { ok: false, reason: "forbidden" };
  const hasBundles = contractBundles.some(
    (b) => b.categoryKey === c.key && b.workspaceId === c.workspaceId
  );
  if (hasBundles) return { ok: false, reason: "category_in_use" };
  contractCustomCategories.splice(idx, 1);
  return { ok: true };
}

export function listContractCustomCategories(
  viewerId: string,
  workspaceId: string
): ContractCustomCategory[] {
  if (!isWorkspaceMember(viewerId, workspaceId)) return [];
  return contractCustomCategories.filter(
    (c) => c.workspaceId === workspaceId && c.ownerUserId === viewerId
  );
}

// --- Arbeitsplan (Workspace) ---

export const workplaceEmployees: WorkplaceEmployee[] = [];
export const workScheduleRules: WorkScheduleRulesDoc[] = [];
export const employeeScheduleWishes: EmployeeScheduleWish[] = [];
export const employeeAbsencePeriods: EmployeeAbsencePeriod[] = [];
export const monthlyWorkPlans: MonthlyWorkPlan[] = [];
export const workScheduleAccessRows: WorkScheduleAccessRow[] = [];
export const workScheduleChatMessages: WorkScheduleChatMessage[] = [];

export function getEffectiveWorkScheduleAccess(workspaceId: string): WorkScheduleAccessRow | null {
  const ws = workspaces.find((w) => w.id === workspaceId);
  if (!ws) return null;
  const row = workScheduleAccessRows.find((r) => r.workspaceId === workspaceId);
  if (row) return { ...row, viewerUserIds: [...row.viewerUserIds] };
  return {
    workspaceId,
    editorUserId: ws.ownerUserId,
    viewerUserIds: [],
  };
}

/** Registrierter Kontakt (Telefonbuch) oder Freund:in des Bearbeiters. */
export function isLinkedToWorkScheduleEditor(editorUserId: string, otherUserId: string): boolean {
  if (editorUserId === otherUserId) return true;
  if (isFriend(editorUserId, otherUserId)) return true;
  const other = users.find((u) => u.id === otherUserId);
  if (!other) return false;
  return personalContacts.some(
    (c) =>
      c.ownerUserId === editorUserId &&
      (c.linkedUserId === otherUserId || c.phoneDigits === other.phoneDigits)
  );
}

export function canViewWorkSchedule(userId: string, workspaceId: string): boolean {
  const acc = getEffectiveWorkScheduleAccess(workspaceId);
  if (!acc) return false;
  if (acc.editorUserId === userId && isWorkspaceMember(userId, workspaceId)) return true;
  if (acc.viewerUserIds.includes(userId) && isLinkedToWorkScheduleEditor(acc.editorUserId, userId)) {
    return true;
  }
  return false;
}

export function canEditWorkSchedule(userId: string, workspaceId: string): boolean {
  const acc = getEffectiveWorkScheduleAccess(workspaceId);
  if (!acc) return false;
  return acc.editorUserId === userId && isWorkspaceMember(userId, workspaceId);
}

export function listWorkScheduleContextsForUser(userId: string): Array<{
  workspaceId: string;
  workspaceName: string;
  role: "editor" | "viewer";
  editorUserId: string;
  editorDisplayName: string;
}> {
  const out: Array<{
    workspaceId: string;
    workspaceName: string;
    role: "editor" | "viewer";
    editorUserId: string;
    editorDisplayName: string;
  }> = [];
  for (const ws of workspaces) {
    const acc = getEffectiveWorkScheduleAccess(ws.id);
    if (!acc) continue;
    const editor = users.find((u) => u.id === acc.editorUserId);
    const editorDisplayName = editor?.displayName ?? acc.editorUserId;
    if (acc.editorUserId === userId && isWorkspaceMember(userId, ws.id)) {
      out.push({
        workspaceId: ws.id,
        workspaceName: ws.name,
        role: "editor",
        editorUserId: acc.editorUserId,
        editorDisplayName,
      });
    } else if (acc.viewerUserIds.includes(userId) && isLinkedToWorkScheduleEditor(acc.editorUserId, userId)) {
      out.push({
        workspaceId: ws.id,
        workspaceName: ws.name,
        role: "viewer",
        editorUserId: acc.editorUserId,
        editorDisplayName,
      });
    }
  }
  return out;
}

export function setWorkScheduleViewers(input: {
  editorId: string;
  workspaceId: string;
  viewerUserIds: string[];
}): { ok: true; viewerUserIds: string[] } | { ok: false; reason: string } {
  if (!canEditWorkSchedule(input.editorId, input.workspaceId)) return { ok: false, reason: "forbidden" };
  const accBase = getEffectiveWorkScheduleAccess(input.workspaceId);
  if (!accBase) return { ok: false, reason: "no_workspace" };
  const uniq = [...new Set(input.viewerUserIds.filter((id) => id && id !== accBase.editorUserId))];
  for (const uid of uniq) {
    if (!users.some((u) => u.id === uid)) return { ok: false, reason: "unknown_user" };
    if (!isLinkedToWorkScheduleEditor(accBase.editorUserId, uid)) {
      return { ok: false, reason: "not_linked_contact" };
    }
  }
  let row = workScheduleAccessRows.find((r) => r.workspaceId === input.workspaceId);
  if (!row) {
    row = {
      workspaceId: input.workspaceId,
      editorUserId: accBase.editorUserId,
      viewerUserIds: [...uniq],
    };
    workScheduleAccessRows.push(row);
  } else {
    row.viewerUserIds = [...uniq];
  }
  return { ok: true, viewerUserIds: uniq };
}

export function getWorkScheduleViewersForEditor(
  editorId: string,
  workspaceId: string
): { ok: true; viewerUserIds: string[] } | { ok: false; reason: string } {
  if (!canEditWorkSchedule(editorId, workspaceId)) return { ok: false, reason: "forbidden" };
  const acc = getEffectiveWorkScheduleAccess(workspaceId);
  return { ok: true, viewerUserIds: [...(acc?.viewerUserIds ?? [])] };
}

export function listWorkScheduleChatMessages(
  userId: string,
  workspaceId: string
): WorkScheduleChatMessage[] {
  if (!canViewWorkSchedule(userId, workspaceId)) return [];
  return workScheduleChatMessages
    .filter((m) => m.workspaceId === workspaceId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function postWorkScheduleChatMessage(input: {
  authorId: string;
  workspaceId: string;
  body: string;
}): { ok: true; message: WorkScheduleChatMessage } | { ok: false; reason: string } {
  if (!canViewWorkSchedule(input.authorId, input.workspaceId)) return { ok: false, reason: "forbidden" };
  const body = input.body.trim().slice(0, 2000);
  if (!body) return { ok: false, reason: "empty_body" };
  const message: WorkScheduleChatMessage = {
    id: `wscm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    authorUserId: input.authorId,
    body,
    createdAt: now(),
  };
  workScheduleChatMessages.push(message);
  return { ok: true, message };
}

function defaultWorkScheduleRules(workspaceId: string): WorkScheduleRulesDoc {
  const ts = now();
  const slotId = `slot-${workspaceId.slice(0, 6)}-1`;
  return {
    workspaceId,
    slots: [{ id: slotId, label: "Tagschicht", startTime: "09:00", endTime: "17:00" }],
    dayPatterns: {
      vollzeitWeekdays: [1, 2, 3, 4, 5],
      teilzeitWeekdays: [1, 2, 3, 4, 5],
      aushilfeWeekdays: [0, 6],
    },
    updatedAt: ts,
  };
}

export function getWorkScheduleRules(viewerId: string, workspaceId: string): WorkScheduleRulesDoc | null {
  if (!canViewWorkSchedule(viewerId, workspaceId)) return null;
  const found = workScheduleRules.find((r) => r.workspaceId === workspaceId);
  return found ?? defaultWorkScheduleRules(workspaceId);
}

function parseWeekdays(arr: unknown): number[] | null {
  if (!Array.isArray(arr)) return null;
  const out: number[] = [];
  for (const x of arr) {
    const n = Number(x);
    if (!Number.isInteger(n) || n < 0 || n > 6) return null;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

function parseShiftWishEntries(
  arr: unknown,
  allowedSlotIds: Set<string>
): ShiftWishEntry[] | null {
  if (!Array.isArray(arr)) return null;
  const seen = new Set<string>();
  const out: ShiftWishEntry[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const wd = Number(o.weekday);
    const slotId = String(o.slotId ?? "").trim();
    if (!Number.isInteger(wd) || wd < 0 || wd > 6 || !slotId) return null;
    if (!allowedSlotIds.has(slotId)) return null;
    const key = `${wd}:${slotId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ weekday: wd, slotId });
  }
  return out;
}

function normalizeEmployeeScheduleWish(w: EmployeeScheduleWish): EmployeeScheduleWish {
  return {
    ...w,
    preferredShifts: w.preferredShifts ?? [],
    avoidShifts: w.avoidShifts ?? [],
  };
}

function wishAvoidsEntireDay(w: EmployeeScheduleWish, dow: number): boolean {
  return w.avoidWeekdays.includes(dow);
}

function wishAvoidsThisShift(w: EmployeeScheduleWish, dow: number, slotId: string): boolean {
  if (wishAvoidsEntireDay(w, dow)) return true;
  const shifts = w.avoidShifts ?? [];
  return shifts.some((s) => s.weekday === dow && s.slotId === slotId);
}

function wishPreferenceScoreForShift(w: EmployeeScheduleWish, dow: number, slotId: string): number {
  const prefShifts = w.preferredShifts ?? [];
  if (prefShifts.some((s) => s.weekday === dow && s.slotId === slotId)) return 2;
  if (w.preferredWeekdays.includes(dow)) return 1;
  return 0;
}

function parseSlots(arr: unknown): WorkShiftSlotDef[] | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const out: WorkShiftSlotDef[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? "").trim();
    const label = String(o.label ?? "").trim().slice(0, 80);
    const startTime = String(o.startTime ?? "").trim();
    const endTime = String(o.endTime ?? "").trim();
    if (!label || !/^\d{1,2}:\d{2}$/.test(startTime) || !/^\d{1,2}:\d{2}$/.test(endTime)) return null;
    out.push({
      id: id || `slot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      startTime,
      endTime,
    });
  }
  return out;
}

export function putWorkScheduleRules(
  editorId: string,
  workspaceId: string,
  body: { slots?: unknown; dayPatterns?: Partial<WorkScheduleDayPatterns> }
): { ok: true; rules: WorkScheduleRulesDoc } | { ok: false; reason: string } {
  if (!canEditWorkSchedule(editorId, workspaceId)) return { ok: false, reason: "forbidden" };
  const existing = workScheduleRules.find((r) => r.workspaceId === workspaceId);
  const base = existing ?? defaultWorkScheduleRules(workspaceId);
  let slots = base.slots;
  if (body.slots !== undefined) {
    const parsed = parseSlots(body.slots);
    if (!parsed) return { ok: false, reason: "invalid_slots" };
    slots = parsed;
  }
  const dp = { ...base.dayPatterns };
  if (body.dayPatterns) {
    if (body.dayPatterns.vollzeitWeekdays !== undefined) {
      const w = parseWeekdays(body.dayPatterns.vollzeitWeekdays);
      if (!w) return { ok: false, reason: "invalid_weekdays" };
      dp.vollzeitWeekdays = w;
    }
    if (body.dayPatterns.teilzeitWeekdays !== undefined) {
      const w = parseWeekdays(body.dayPatterns.teilzeitWeekdays);
      if (!w) return { ok: false, reason: "invalid_weekdays" };
      dp.teilzeitWeekdays = w;
    }
    if (body.dayPatterns.aushilfeWeekdays !== undefined) {
      const w = parseWeekdays(body.dayPatterns.aushilfeWeekdays);
      if (!w) return { ok: false, reason: "invalid_weekdays" };
      dp.aushilfeWeekdays = w;
    }
  }
  const rules: WorkScheduleRulesDoc = {
    workspaceId,
    slots,
    dayPatterns: dp,
    updatedAt: now(),
  };
  if (existing) {
    const idx = workScheduleRules.indexOf(existing);
    workScheduleRules[idx] = rules;
  } else {
    workScheduleRules.push(rules);
  }
  return { ok: true, rules };
}

export function listWorkplaceEmployees(viewerId: string, workspaceId: string): WorkplaceEmployee[] {
  if (!canViewWorkSchedule(viewerId, workspaceId)) return [];
  return workplaceEmployees.filter((e) => e.workspaceId === workspaceId);
}

function parseEmploymentKind(x: unknown): EmploymentKind | null {
  if (x === "vollzeit" || x === "teilzeit" || x === "aushilfe") return x;
  return null;
}

export function createWorkplaceEmployee(input: {
  editorId: string;
  workspaceId: string;
  name: string;
  employmentType: EmploymentKind;
}): { ok: true; employee: WorkplaceEmployee } | { ok: false; reason: string } {
  if (!canEditWorkSchedule(input.editorId, input.workspaceId)) return { ok: false, reason: "forbidden" };
  const name = input.name.trim().slice(0, 120);
  if (!name) return { ok: false, reason: "empty_name" };
  const employee: WorkplaceEmployee = {
    id: `wpe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    name,
    employmentType: input.employmentType,
    createdAt: now(),
  };
  workplaceEmployees.push(employee);
  return { ok: true, employee };
}

export function updateWorkplaceEmployee(
  id: string,
  editorId: string,
  patch: { name?: string; employmentType?: EmploymentKind }
): { ok: true; employee: WorkplaceEmployee } | { ok: false; reason: string } {
  const idx = workplaceEmployees.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const e = workplaceEmployees[idx]!;
  if (!canEditWorkSchedule(editorId, e.workspaceId)) return { ok: false, reason: "forbidden" };
  if (patch.name !== undefined) {
    const name = patch.name.trim().slice(0, 120);
    if (!name) return { ok: false, reason: "empty_name" };
    e.name = name;
  }
  if (patch.employmentType !== undefined) e.employmentType = patch.employmentType;
  return { ok: true, employee: e };
}

export function deleteWorkplaceEmployee(
  id: string,
  editorId: string
): { ok: true } | { ok: false; reason: string } {
  const idx = workplaceEmployees.findIndex((e) => e.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const e = workplaceEmployees[idx]!;
  if (!canEditWorkSchedule(editorId, e.workspaceId)) return { ok: false, reason: "forbidden" };
  workplaceEmployees.splice(idx, 1);
  const wishIdx = employeeScheduleWishes.findIndex((w) => w.employeeId === id);
  if (wishIdx !== -1) employeeScheduleWishes.splice(wishIdx, 1);
  for (let i = employeeAbsencePeriods.length - 1; i >= 0; i--) {
    if (employeeAbsencePeriods[i]!.employeeId === id) employeeAbsencePeriods.splice(i, 1);
  }
  return { ok: true };
}

export function listEmployeeScheduleWishes(
  viewerId: string,
  workspaceId: string
): EmployeeScheduleWish[] {
  if (!canViewWorkSchedule(viewerId, workspaceId)) return [];
  return employeeScheduleWishes
    .filter((w) => w.workspaceId === workspaceId)
    .map(normalizeEmployeeScheduleWish);
}

export function upsertEmployeeScheduleWish(input: {
  editorId: string;
  workspaceId: string;
  employeeId: string;
  preferredWeekdays: number[];
  avoidWeekdays: number[];
  preferredShifts: unknown;
  avoidShifts: unknown;
  notes: string;
}): { ok: true; wish: EmployeeScheduleWish } | { ok: false; reason: string } {
  if (!canEditWorkSchedule(input.editorId, input.workspaceId)) return { ok: false, reason: "forbidden" };
  const emp = workplaceEmployees.find(
    (e) => e.id === input.employeeId && e.workspaceId === input.workspaceId
  );
  if (!emp) return { ok: false, reason: "employee_not_found" };
  const pref = parseWeekdays(input.preferredWeekdays);
  const avoid = parseWeekdays(input.avoidWeekdays);
  if (!pref || !avoid) return { ok: false, reason: "invalid_weekdays" };
  const rulesRow = workScheduleRules.find((r) => r.workspaceId === input.workspaceId);
  const rulesForSlots = rulesRow ?? defaultWorkScheduleRules(input.workspaceId);
  const allowedSlotIds = new Set(rulesForSlots.slots.map((s) => s.id));
  const prefShifts = parseShiftWishEntries(input.preferredShifts ?? [], allowedSlotIds);
  const avoidShifts = parseShiftWishEntries(input.avoidShifts ?? [], allowedSlotIds);
  if (prefShifts === null || avoidShifts === null) return { ok: false, reason: "invalid_shift_wishes" };
  const ts = now();
  const existing = employeeScheduleWishes.find(
    (w) => w.workspaceId === input.workspaceId && w.employeeId === input.employeeId
  );
  const wish: EmployeeScheduleWish = {
    id: existing?.id ?? `wsw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    employeeId: input.employeeId,
    preferredWeekdays: pref,
    avoidWeekdays: avoid,
    preferredShifts: prefShifts,
    avoidShifts,
    notes: input.notes.trim().slice(0, 500),
    updatedAt: ts,
  };
  if (existing) {
    const i = employeeScheduleWishes.indexOf(existing);
    employeeScheduleWishes[i] = wish;
  } else {
    employeeScheduleWishes.push(wish);
  }
  return { ok: true, wish };
}

export function deleteEmployeeScheduleWish(
  id: string,
  editorId: string
): { ok: true } | { ok: false; reason: string } {
  const idx = employeeScheduleWishes.findIndex((w) => w.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const w = employeeScheduleWishes[idx]!;
  if (!canEditWorkSchedule(editorId, w.workspaceId)) return { ok: false, reason: "forbidden" };
  employeeScheduleWishes.splice(idx, 1);
  return { ok: true };
}

function parseIsoYmd(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return s;
}

export function listEmployeeAbsencePeriods(
  viewerId: string,
  workspaceId: string
): EmployeeAbsencePeriod[] {
  if (!canViewWorkSchedule(viewerId, workspaceId)) return [];
  return employeeAbsencePeriods
    .filter((a) => a.workspaceId === workspaceId)
    .slice()
    .sort((a, b) => (a.startDate !== b.startDate ? a.startDate.localeCompare(b.startDate) : a.id.localeCompare(b.id)));
}

export function createEmployeeAbsencePeriod(input: {
  editorId: string;
  workspaceId: string;
  employeeId: string;
  startDate: unknown;
  endDate: unknown;
  label?: unknown;
}): { ok: true; period: EmployeeAbsencePeriod } | { ok: false; reason: string } {
  if (!canEditWorkSchedule(input.editorId, input.workspaceId)) return { ok: false, reason: "forbidden" };
  const emp = workplaceEmployees.find(
    (e) => e.id === input.employeeId && e.workspaceId === input.workspaceId
  );
  if (!emp) return { ok: false, reason: "employee_not_found" };
  const start = parseIsoYmd(input.startDate);
  const end = parseIsoYmd(input.endDate);
  if (!start || !end) return { ok: false, reason: "invalid_dates" };
  if (end < start) return { ok: false, reason: "invalid_range" };
  const label =
    typeof input.label === "string" ? input.label.trim().slice(0, 120) : "";
  const period: EmployeeAbsencePeriod = {
    id: `abs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: input.workspaceId,
    employeeId: input.employeeId,
    startDate: start,
    endDate: end,
    label,
    createdAt: now(),
  };
  employeeAbsencePeriods.push(period);
  return { ok: true, period };
}

export function deleteEmployeeAbsencePeriod(
  id: string,
  editorId: string
): { ok: true } | { ok: false; reason: string } {
  const idx = employeeAbsencePeriods.findIndex((a) => a.id === id);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const a = employeeAbsencePeriods[idx]!;
  if (!canEditWorkSchedule(editorId, a.workspaceId)) return { ok: false, reason: "forbidden" };
  employeeAbsencePeriods.splice(idx, 1);
  return { ok: true };
}

function employeeAbsentOnDate(
  employeeId: string,
  dateStr: string,
  absences: EmployeeAbsencePeriod[]
): boolean {
  return absences.some(
    (a) => a.employeeId === employeeId && dateStr >= a.startDate && dateStr <= a.endDate
  );
}

function weekdaysForEmployment(kind: EmploymentKind, p: WorkScheduleDayPatterns): number[] {
  switch (kind) {
    case "vollzeit":
      return p.vollzeitWeekdays;
    case "teilzeit":
      return p.teilzeitWeekdays;
    case "aushilfe":
      return p.aushilfeWeekdays;
    default:
      return [];
  }
}

function ymDatesLocal(yearMonth: string): { ok: true; dates: string[] } | { ok: false; reason: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim());
  if (!m) return { ok: false, reason: "invalid_year_month" };
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return { ok: false, reason: "invalid_year_month" };
  const last = new Date(y, mo, 0).getDate();
  const dates: string[] = [];
  for (let d = 1; d <= last; d++) {
    dates.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return { ok: true, dates };
}

export function generateMonthlyWorkPlan(
  editorId: string,
  workspaceId: string,
  yearMonth: string
): { ok: true; plan: MonthlyWorkPlan } | { ok: false; reason: string } {
  if (!canEditWorkSchedule(editorId, workspaceId)) return { ok: false, reason: "forbidden" };
  const ym = ymDatesLocal(yearMonth);
  if (!ym.ok) return ym;
  const rules = getWorkScheduleRules(editorId, workspaceId);
  if (!rules) return { ok: false, reason: "forbidden" };
  const employees = listWorkplaceEmployees(editorId, workspaceId);
  const wishes = listEmployeeScheduleWishes(editorId, workspaceId);
  const absences = listEmployeeAbsencePeriods(editorId, workspaceId);
  const wishByEmp = Object.fromEntries(wishes.map((w) => [w.employeeId, w]));

  const assignments: MonthlyWorkPlan["assignments"] = [];
  const counters: Record<string, number> = {};

  for (const dateStr of ym.dates) {
    const [yy, mm, dd] = dateStr.split("-").map(Number);
    const dow = new Date(yy, mm - 1, dd).getDay();
    for (const slot of rules.slots) {
      let candidates = employees.filter((e) => {
        if (employeeAbsentOnDate(e.id, dateStr, absences)) return false;
        if (!weekdaysForEmployment(e.employmentType, rules.dayPatterns).includes(dow)) return false;
        const w = wishByEmp[e.id];
        if (w && wishAvoidsThisShift(normalizeEmployeeScheduleWish(w), dow, slot.id)) return false;
        return true;
      });
      if (candidates.length === 0) {
        assignments.push({ date: dateStr, slotId: slot.id, employeeId: null });
        continue;
      }
      candidates = [...candidates].sort((a, b) => {
        const wa = wishByEmp[a.id] ? normalizeEmployeeScheduleWish(wishByEmp[a.id]!) : undefined;
        const wb = wishByEmp[b.id] ? normalizeEmployeeScheduleWish(wishByEmp[b.id]!) : undefined;
        const pa = wa ? wishPreferenceScoreForShift(wa, dow, slot.id) : 0;
        const pb = wb ? wishPreferenceScoreForShift(wb, dow, slot.id) : 0;
        if (pb !== pa) return pb - pa;
        return a.name.localeCompare(b.name, "de");
      });
      const k = slot.id;
      const c = counters[k] ?? 0;
      const idx = c % candidates.length;
      counters[k] = c + 1;
      assignments.push({ date: dateStr, slotId: slot.id, employeeId: candidates[idx]!.id });
    }
  }

  const prevIdx = monthlyWorkPlans.findIndex(
    (p) => p.workspaceId === workspaceId && p.yearMonth === yearMonth.trim()
  );
  if (prevIdx !== -1) monthlyWorkPlans.splice(prevIdx, 1);

  const plan: MonthlyWorkPlan = {
    id: `mwp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId,
    yearMonth: yearMonth.trim(),
    assignments,
    generatedAt: now(),
  };
  monthlyWorkPlans.push(plan);
  return { ok: true, plan };
}

export function listMonthlyWorkPlans(viewerId: string, workspaceId: string): MonthlyWorkPlan[] {
  if (!canViewWorkSchedule(viewerId, workspaceId)) return [];
  return monthlyWorkPlans.filter((p) => p.workspaceId === workspaceId);
}

export function getMonthlyWorkPlan(
  viewerId: string,
  planId: string
): MonthlyWorkPlan | null {
  const p = monthlyWorkPlans.find((x) => x.id === planId);
  if (!p) return null;
  if (!canViewWorkSchedule(viewerId, p.workspaceId)) return null;
  return p;
}

function replaceArray<T>(target: T[], next: unknown): void {
  if (!Array.isArray(next)) throw new Error("expected array");
  target.length = 0;
  target.push(...(next as T[]));
}

export function getRoomIdForAttachment(attachmentId: string): string | null {
  for (const m of messages) {
    if (m.attachments?.some((a) => a.id === attachmentId)) return m.roomId;
  }
  return null;
}

export function toggleMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): { ok: true; message: Message } | { ok: false; reason: string } {
  const msg = messages.find((m) => m.id === messageId);
  if (!msg) return { ok: false, reason: "not_found" };
  if (!msg.reactions) msg.reactions = [];
  const idx = msg.reactions.findIndex((r) => r.userId === userId && r.emoji === emoji);
  if (idx >= 0) msg.reactions.splice(idx, 1);
  else msg.reactions.push({ userId, emoji });
  return { ok: true, message: msg };
}

/** Vollständiger App-Zustand für SQLite-Snapshot (ohne Auth-Maps). */
export function captureStoreSnapshot() {
  return {
    users: structuredClone(users),
    workspaces: structuredClone(workspaces),
    workspaceMembers: structuredClone(workspaceMembers),
    invites: structuredClone(invites),
    friendRequests: structuredClone(friendRequests),
    friendships: structuredClone(friendships),
    friendGroupAssignments: structuredClone(friendGroupAssignments),
    personalContacts: structuredClone(personalContacts),
    rooms: structuredClone(rooms),
    attachmentRegistry: [...attachmentRegistry.entries()] as [
      string,
      { fileName: string; mimeType: string; dataBase64?: string },
    ][],
    messages: structuredClone(messages),
    calendarEvents: structuredClone(calendarEvents),
    meetingRooms: structuredClone(meetingRooms),
    meetings: structuredClone(meetings),
    familyCalendarSlots: structuredClone(familyCalendarSlots),
    financeRecords: structuredClone(financeRecords),
    financeHouseholdPlans: structuredClone(financeHouseholdPlans),
    contractBundles: structuredClone(contractBundles),
    contractCustomCategories: structuredClone(contractCustomCategories),
    workplaceEmployees: structuredClone(workplaceEmployees),
    workScheduleRules: structuredClone(workScheduleRules),
    employeeScheduleWishes: structuredClone(employeeScheduleWishes),
    employeeAbsencePeriods: structuredClone(employeeAbsencePeriods),
    monthlyWorkPlans: structuredClone(monthlyWorkPlans),
    workScheduleAccessRows: structuredClone(workScheduleAccessRows),
    workScheduleChatMessages: structuredClone(workScheduleChatMessages),
  };
}

export function restoreStoreSnapshot(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const s = raw as Record<string, unknown>;
  try {
    replaceArray(users, s.users);
    for (const u of users) {
      const raw = (u as { chatTextColor?: unknown }).chatTextColor;
      if (raw == null || raw === "") (u as User).chatTextColor = null;
      else if (typeof raw === "string" && /^#[0-9A-Fa-f]{6}$/.test(raw)) (u as User).chatTextColor = raw;
      else (u as User).chatTextColor = null;
    }
    replaceArray(workspaces, s.workspaces);
    replaceArray(workspaceMembers, s.workspaceMembers);
    dedupeWorkspaceMembers();
    replaceArray(invites, s.invites);
    replaceArray(friendRequests, s.friendRequests);
    replaceArray(friendships, s.friendships);
    replaceArray(friendGroupAssignments, s.friendGroupAssignments);
    replaceArray(personalContacts, s.personalContacts);
    replaceArray(rooms, s.rooms);
    if (!Array.isArray(s.attachmentRegistry)) return false;
    attachmentRegistry.clear();
    for (const row of s.attachmentRegistry) {
      if (!Array.isArray(row) || row.length !== 2) continue;
      const [k, v] = row as [unknown, unknown];
      if (typeof k !== "string" || !v || typeof v !== "object") continue;
      const meta = v as { fileName?: unknown; mimeType?: unknown; dataBase64?: unknown };
      if (typeof meta.fileName !== "string" || typeof meta.mimeType !== "string") continue;
      attachmentRegistry.set(k, {
        fileName: meta.fileName,
        mimeType: meta.mimeType,
        ...(typeof meta.dataBase64 === "string" ? { dataBase64: meta.dataBase64 } : {}),
      });
    }
    replaceArray(messages, s.messages);
    replaceArray(calendarEvents, s.calendarEvents);
    replaceArray(meetingRooms, s.meetingRooms);
    replaceArray(meetings, s.meetings);
    replaceArray(familyCalendarSlots, s.familyCalendarSlots);
    replaceArray(financeRecords, s.financeRecords);
    for (const r of financeRecords) {
      if ((r as FinanceRecord).linkedHouseholdId === undefined) (r as FinanceRecord).linkedHouseholdId = null;
    }
    if (Array.isArray(s.financeHouseholdPlans)) replaceArray(financeHouseholdPlans, s.financeHouseholdPlans);
    replaceArray(contractBundles, s.contractBundles);
    replaceArray(contractCustomCategories, s.contractCustomCategories);
    replaceArray(workplaceEmployees, s.workplaceEmployees);
    replaceArray(workScheduleRules, s.workScheduleRules);
    replaceArray(employeeScheduleWishes, s.employeeScheduleWishes);
    replaceArray(employeeAbsencePeriods, s.employeeAbsencePeriods);
    replaceArray(monthlyWorkPlans, s.monthlyWorkPlans);
    replaceArray(workScheduleAccessRows, s.workScheduleAccessRows);
    replaceArray(workScheduleChatMessages, s.workScheduleChatMessages);
    return true;
  } catch {
    return false;
  }
}
