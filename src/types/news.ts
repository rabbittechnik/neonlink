import type { SectionId } from "@/types/collab";

export type NewsFeedItemKind = "friend_request" | "meeting_invite" | "chat_unread" | "calendar_event";

export type NewsFeedItem = {
  id: string;
  kind: NewsFeedItemKind;
  title: string;
  subtitle?: string;
  at: number;
  /** friend_request */
  requestId?: string;
  /** chat_unread */
  roomId?: string;
  sectionId?: SectionId;
  unreadCount?: number;
  /** meeting_invite */
  calendarEventId?: string;
  meetingRoomId?: string | null;
  /** calendar_event (Kalender-Neuigkeit) */
  calendarNewsEventId?: string;
};
