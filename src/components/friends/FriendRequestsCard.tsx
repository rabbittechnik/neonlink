import React from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncomingFriendRequest } from "./types";

type UserLite = { displayName?: string; avatarUrl?: string | null };

type Props = {
  requests: IncomingFriendRequest[];
  resolveUser: (userId: string) => UserLite | undefined;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
};

export function FriendRequestsCard({ requests, resolveUser, onAccept, onReject }: Props) {
  return (
    <Card
      id="neonlink-friend-requests"
      className="rounded-3xl border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white backdrop-blur-xl shadow-lg shadow-black/25 scroll-mt-4"
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="text-base" aria-hidden>
            📨
          </span>
          Freundschaftsanfragen
          {requests.length > 0 ? (
            <span className="ml-auto text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-100 border border-amber-400/30">
              {requests.length}
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 max-h-48 overflow-y-auto pr-1">
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-white/90">
            <Inbox className="h-8 w-8 mb-2 opacity-60" />
            <p className="text-xs font-medium">Keine offenen Anfragen</p>
          </div>
        ) : (
          requests.map((req) => {
            const u = resolveUser(req.fromUserId);
            const name = req.fromDisplayName ?? u?.displayName ?? "Unbekannt";
            return (
              <div
                key={req.id}
                className="flex gap-2 items-center rounded-2xl border border-white/10 bg-black/25 p-2.5 hover:border-white/15 transition-colors"
              >
                <Avatar className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/15">
                  {u?.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <AvatarFallback className="flex h-full w-full items-center justify-center bg-white/10 text-xs">
                      {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white truncate">{name}</div>
                  {req.fromCategoryKeys?.length ? (
                    <div className="text-[10px] text-cyan-200/90 mt-1">
                      Zuordnung bei Absender: {req.fromCategoryKeys.join(", ")}
                    </div>
                  ) : null}
                  <div className="flex gap-1.5 mt-2">
                    <Button
                      type="button"
                      onClick={() => onAccept(req.id)}
                      className="h-7 flex-1 rounded-lg border border-emerald-400/40 bg-emerald-500/25 text-emerald-50 hover:bg-emerald-500/35 text-[11px]"
                    >
                      Annehmen
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onReject(req.id)}
                      className="h-7 flex-1 rounded-lg border border-red-400/35 bg-red-500/20 text-red-100 hover:bg-red-500/30 text-[11px]"
                    >
                      Ablehnen
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
