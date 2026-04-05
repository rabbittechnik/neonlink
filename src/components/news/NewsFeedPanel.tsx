import React from "react";
import { CalendarDays, MessageSquare, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SectionId } from "@/types/collab";
import type { NewsFeedItem } from "@/types/news";

type Props = {
  items: NewsFeedItem[];
  onOpenChat: (roomId: string, sectionId: SectionId) => void;
  onOpenFriendRequests: () => void;
  onOpenMeetingInvite: (item: NewsFeedItem) => void;
  onOpenCalendarNews: (eventId: string) => void;
};

function iconForKind(kind: NewsFeedItem["kind"]) {
  switch (kind) {
    case "friend_request":
      return Users;
    case "meeting_invite":
    case "calendar_event":
      return CalendarDays;
    default:
      return MessageSquare;
  }
}

export function NewsFeedPanel({
  items,
  onOpenChat,
  onOpenFriendRequests,
  onOpenMeetingInvite,
  onOpenCalendarNews,
}: Props) {
  return (
    <div className="flex flex-col min-h-0 min-w-0 h-full">
      <Card className="flex-1 min-h-0 rounded-3xl border border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col overflow-hidden">
        <CardHeader className="shrink-0 border-b border-white/10 py-4 px-5">
          <CardTitle className="text-lg font-semibold tracking-tight">Neuigkeiten</CardTitle>
          <p className="text-xs text-white/50 mt-1 font-normal">
            Nachrichten, neue Termine von anderen, Freundschaftsanfragen und Meeting-Einladungen — ohne deine eigenen
            Aktivitäten.
          </p>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-12 text-center text-sm text-white/50">
              Keine neuen Neuigkeiten.
            </div>
          ) : (
            items.map((item) => {
              const Icon = iconForKind(item.kind);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.kind === "chat_unread" && item.roomId && item.sectionId) {
                      onOpenChat(item.roomId, item.sectionId);
                      return;
                    }
                    if (item.kind === "friend_request") {
                      onOpenFriendRequests();
                      return;
                    }
                    if (item.kind === "meeting_invite") {
                      onOpenMeetingInvite(item);
                      return;
                    }
                    if (item.kind === "calendar_event" && item.calendarNewsEventId) {
                      onOpenCalendarNews(item.calendarNewsEventId);
                    }
                  }}
                  className="w-full text-left rounded-2xl border border-white/10 bg-black/25 hover:bg-white/[0.07] hover:border-cyan-400/25 transition-colors p-3 flex gap-3 min-w-0"
                >
                  <div className="shrink-0 h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-white leading-snug break-words">{item.title}</div>
                    {item.subtitle ? (
                      <div className="text-xs text-white/50 mt-1 leading-snug break-words">{item.subtitle}</div>
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
