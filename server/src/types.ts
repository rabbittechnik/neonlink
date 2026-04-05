export type PresenceStatus = "online" | "away" | "busy" | "offline" | "on_call";

export type ContactVisibility = "private" | "workspace" | "public";
export type MemberRole = "owner" | "admin" | "member" | "guest";
export type RoomKind = "text" | "voice" | "meeting";

/** global = fuer alle Workspace-Mitglieder; group/private nach participants */
export type ChatRoomType = "global" | "group" | "private";

export type User = {
  id: string;
  displayName: string;
  email: string;
  /** Nur Ziffern, z. B. 4917012345670 — eindeutig, für Kontaktsuche */
  phoneDigits: string;
  status: PresenceStatus;
  friendCode: string;
  /** data-URL (image/jpeg/png/webp) – Demo/In-Memory */
  avatarUrl?: string | null;
  passwordSalt: string;
  passwordHash: string;
  /** Sichtbare Kontakt-E-Mail (kann von Login-E-Mail abweichen) */
  contactEmail: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  emailVisibility: ContactVisibility;
  phoneVisibility: ContactVisibility;
  bio: string;
  statusMessage: string;
  /** Status je Bereich (familie, feuerwehr, …); leer = nur globaler `status` */
  statusBySection: Record<string, PresenceStatus>;
  /** Hex #RRGGBB für Chat-Text dieses Nutzers; null = Standard (App-Farbe) */
  chatTextColor: string | null;
};

/** Private Kontaktliste nur für ownerUserId; andere Nutzer sehen sie nicht. */
export type PersonalContact = {
  id: string;
  ownerUserId: string;
  displayName: string;
  phoneDigits: string;
  /** gesetzter NeonLink-Nutzer zur gleichen Nummer, sonst null */
  linkedUserId: string | null;
  createdAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  ownerUserId: string;
};

export type Room = {
  id: string;
  workspaceId: string;
  sectionId: string;
  name: string;
  kind: RoomKind;
  chatType: ChatRoomType;
  /** Bei group/private: exakte User-IDs; bei global leer (alle Mitglieder) */
  participants: string[];
  /** Genau ein Hauptchat pro (workspaceId + sectionId) */
  isMain?: boolean;
  createdAt: string;
};

export type MessageAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type MessageReaction = {
  userId: string;
  emoji: string;
};

/** Rich-Text-Kalender-Hinweis im Chat „Familienkalender“ (Client hebt Felder farblich hervor). */
export type CalendarAnnouncementPayload = {
  creatorName: string;
  dateLabel: string;
  timeLabel: string;
  title: string;
  rubrik: string;
  art: string;
  location?: string;
};

export type Message = {
  id: string;
  roomId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  /** Nachricht, auf die geantwortet wird */
  replyToId?: string;
  /** Vorschau der referenzierten Nachricht (denormalisiert fuer Clients) */
  replyPreview?: string;
  replySenderId?: string;
  attachments?: MessageAttachment[];
  /** Mehrere Nutzer, mehrere Emojis pro Nachricht */
  reactions?: MessageReaction[];
  calendarAnnouncement?: CalendarAnnouncementPayload;
};

export type CalendarEventKind = "appointment" | "vacation" | "ferien" | "meeting";

/** Kalender übergreifend pro Workspace; Rubrik = sectionId (Farbe/Icon im Client). */
export type CalendarEvent = {
  id: string;
  workspaceId: string;
  roomId?: string;
  sectionId: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string;
  kind: CalendarEventKind;
  createdByUserId: string;
  /** ISO-Zeitpunkt der Erstellung (Neuigkeiten-Glocke / Feed). */
  createdAt: string;
  /** Workspace-Mitglieder, die den Termin zusätzlich in ihrem Kalender sehen */
  visibilityUserIds: string[];
  /** Familien-Spalte; null = „Gemeinsam“ */
  familySlotId: string | null;
  /** Snapshot des Spalten-Labels bei Erstellung (für fremde Kalenderansichten) */
  familySlotLabel: string | null;
  /** Bei Urlaub/Ferien auf der Spalte „Mein Name“ (__self__) → Kurztitel ohne „von …“ */
  vacationForSelf: boolean;
  /** Nur bei kind === "meeting": exakt diese User-IDs sehen den Termin (kein Gruppen-Feed). */
  meetingId: string | null;
  meetingInvitees: string[];
  meetingRoomId: string | null;
};

/** Workspace-gebundene Meetingräume (nicht Chat-Räume). */
export type MeetingRoom = {
  id: string;
  workspaceId: string;
  name: string;
  /** Meetingraum 1 & 2: Name nicht änderbar */
  lockedName: boolean;
  sortOrder: number;
  isDefault: boolean;
};

export type Meeting = {
  id: string;
  workspaceId: string;
  meetingRoomId: string;
  title: string;
  description: string;
  createdByUserId: string;
  participantUserIds: string[];
  startsAt: string;
  endsAt: string;
  calendarEventId: string;
  createdAt: string;
};

/** Zusätzliche Familien-Personen (max. 6); „Gemeinsam“ + Anzeigename sind fix im Client. */
export type FamilyCalendarSlot = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  label: string;
  sortOrder: number;
};

/** Privat = nur du (Sichtbarkeit steuerbar); Familie = gleicher Workspace, z. B. gemeinsame Ausgaben */
export type FinanceScope = "personal" | "family";
export type FinanceKind = "expense" | "income";
export type FinanceCategory =
  | "strom"
  | "miete"
  | "telefon"
  | "handy"
  | "internet"
  | "mode"
  | "essen"
  | "bankgebuehren"
  | "versicherung"
  | "kredit"
  | "abos"
  | "unterhalt"
  | "lohn"
  | "verkauf"
  | "gesundheit"
  | "auto"
  | "oeffentlich"
  | "streaming"
  | "sparen"
  | "steuern"
  | "tanken"
  | "schule"
  | "tier"
  | "reisen"
  | "geschenke"
  | "haushalt"
  | "sport"
  | "hobby"
  | "sonstiges";

export type FinanceRecord = {
  id: string;
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
  status: "open" | "paid" | "overdue";
  payee: string | null;
  notes: string | null;
  imageDataUrl: string;
  /** z. B. Vertragskopie */
  extraAttachmentDataUrl: string | null;
  /** leer = nur Besitzer; sonst Workspace-Mitglieder-IDs mit Leserecht */
  visibilityUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ContractScope = "personal" | "family";

export type ContractCustomCategory = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  key: string;
  label: string;
  createdAt: string;
};

export type ContractBundle = {
  id: string;
  ownerUserId: string;
  workspaceId: string;
  scope: ContractScope;
  categoryKey: string;
  title: string;
  pageDataUrls: string[];
  visibilityUserIds: string[];
  createdAt: string;
  updatedAt: string;
};

/** Arbeitsplan: Beschäftigungsart (UI deutsch). */
export type EmploymentKind = "vollzeit" | "teilzeit" | "aushilfe";

export type WorkShiftSlotDef = {
  id: string;
  label: string;
  /** HH:mm */
  startTime: string;
  endTime: string;
};

/** 0 = So … 6 = Sa (wie Date.getDay). */
export type WorkScheduleDayPatterns = {
  vollzeitWeekdays: number[];
  teilzeitWeekdays: number[];
  aushilfeWeekdays: number[];
};

export type WorkScheduleRulesDoc = {
  workspaceId: string;
  slots: WorkShiftSlotDef[];
  dayPatterns: WorkScheduleDayPatterns;
  updatedAt: string;
};

export type WorkplaceEmployee = {
  id: string;
  workspaceId: string;
  name: string;
  employmentType: EmploymentKind;
  createdAt: string;
};

/** Wunsch/Sperre für einen bestimmten Wochentag und eine konkrete Schicht (z. B. So nur Früh, nicht Spät). */
export type ShiftWishEntry = {
  /** 0 = So … 6 = Sa */
  weekday: number;
  slotId: string;
};

export type EmployeeScheduleWish = {
  id: string;
  workspaceId: string;
  employeeId: string;
  preferredWeekdays: number[];
  avoidWeekdays: number[];
  preferredShifts: ShiftWishEntry[];
  avoidShifts: ShiftWishEntry[];
  notes: string;
  updatedAt: string;
};

/** Urlaub o. ä.: Mitarbeiter wird an allen Tagen im Bereich (inkl. Grenzen) nicht eingeteilt. */
export type EmployeeAbsencePeriod = {
  id: string;
  workspaceId: string;
  employeeId: string;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  label: string;
  createdAt: string;
};

export type WorkPlanAssignment = {
  date: string;
  slotId: string;
  employeeId: string | null;
};

export type MonthlyWorkPlan = {
  id: string;
  workspaceId: string;
  yearMonth: string;
  assignments: WorkPlanAssignment[];
  generatedAt: string;
};

/** Arbeitsplan: ein Bearbeiter (Workspace-Besitzer), optionale Nur-Lese-Nutzer (Kontakt/Freund des Bearbeiters). */
export type WorkScheduleAccessRow = {
  workspaceId: string;
  editorUserId: string;
  viewerUserIds: string[];
};

export type WorkScheduleChatMessage = {
  id: string;
  workspaceId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
};
