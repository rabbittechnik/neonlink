export type SectionId =
  | "familie"
  | "freunde"
  | "verwandte"
  | "feuerwehr"
  | "arbeit"
  | "ideen";

export type PresenceStatus = "online" | "away" | "busy" | "offline";

export type MemberRole = "owner" | "admin" | "member" | "guest";

export type ChatRole = "online" | "admin" | "away" | "alert";

export type SectionItem = {
  id: SectionId;
  label: string;
  color: string;
};

export type Room = {
  id: string;
  sectionId: SectionId;
  name: string;
  kind: "text" | "voice" | "meeting";
};

export type ChatAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type ChatReplyRef = {
  messageId: string;
  from: string;
  preview: string;
};

/** Kalender-Systemnachricht im Chat (Server liefert strukturierte Felder). */
export type ChatCalendarAnnouncement = {
  creatorName: string;
  dateLabel: string;
  timeLabel: string;
  title: string;
  rubrik: string;
  art: string;
  location?: string;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  from: string;
  role: ChatRole;
  text: string;
  time: string;
  /** gesetzt bei Server-Nachrichten — fuer Live-Avatar aus usersById */
  senderUserId?: string;
  avatarUrl?: string | null;
  replyTo?: ChatReplyRef;
  attachments?: ChatAttachment[];
  /** Server-Zeitstempel fuer Sortierung nach Aktivitaet */
  createdAtMs?: number;
  calendarAnnouncement?: ChatCalendarAnnouncement;
};

export type CalendarEvent = {
  id: string;
  title: string;
  timeLabel: string;
  place: string;
};

export type WorkspaceSeed = {
  id: string;
  name: string;
  sections: SectionItem[];
  rooms: Room[];
  messages: ChatMessage[];
  upcoming: CalendarEvent[];
};
