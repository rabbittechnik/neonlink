import type { SectionId } from "@/types/collab";

/** Server: eigene Spalte = Profilname (nicht in family-slots gespeichert). */
export const FAMILY_CALENDAR_SELF_SLOT_ID = "__self__";

export type CalendarEventKind = "appointment" | "vacation" | "ferien" | "meeting";

export type ApiCalendarEvent = {
  id: string;
  workspaceId: string;
  /** Gesetzt bei aggregierten Listen (alle Workspaces). */
  workspaceName?: string;
  roomId?: string;
  sectionId: SectionId;
  title: string;
  startsAt: string;
  endsAt: string | null;
  allDay: boolean;
  location: string;
  kind: CalendarEventKind;
  createdByUserId: string;
  /** ISO, für Neuigkeiten-Feed */
  createdAt?: string;
  visibilityUserIds: string[];
  familySlotId: string | null;
  familySlotLabel: string | null;
  vacationForSelf: boolean;
  meetingId?: string | null;
  meetingInvitees?: string[];
  meetingRoomId?: string | null;
  participantUserIds?: string[];
  compactInFamilyCalendar?: boolean;
  excludeFromUpcoming?: boolean;
};

export type FamilyCalendarSlot = {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  label: string;
  sortOrder: number;
};
