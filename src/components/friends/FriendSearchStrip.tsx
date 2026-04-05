import React from "react";
import { Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { FriendSearchHit } from "./types";

type Props = {
  friendSearch: string;
  onFriendSearchChange: (v: string) => void;
  onSearchFriends: () => void;
  results: FriendSearchHit[];
  onSendFriendRequest: (userId: string) => void;
};

export function FriendSearchStrip({
  friendSearch,
  onFriendSearchChange,
  onSearchFriends,
  results,
  onSendFriendRequest,
}: Props) {
  return (
    <div className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-3 space-y-3">
      <div className="flex items-center gap-2 text-fuchsia-50 text-xs font-semibold">
        <Search className="h-3.5 w-3.5" />
        Person suchen
      </div>
      <div className="flex gap-2">
        <Input
          value={friendSearch}
          onChange={(e) => onFriendSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearchFriends();
          }}
          placeholder="Name oder Freundescode"
          className="flex-1 min-w-0 bg-white/5 border-white/10 rounded-xl h-9 text-sm placeholder:text-white/55"
        />
        <Button
          type="button"
          onClick={() => onSearchFriends()}
          className="h-9 shrink-0 rounded-xl border border-fuchsia-400/40 bg-fuchsia-500/25 text-fuchsia-50 hover:bg-fuchsia-500/35 px-3 text-xs"
        >
          Los
        </Button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {results.map((user) => (
          <div
            key={user.id}
            className="flex gap-2 items-center rounded-xl border border-white/10 bg-black/20 p-2 hover:bg-white/5 transition-colors"
          >
            <Avatar className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/15">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <AvatarFallback className="flex h-full w-full items-center justify-center bg-white/10 text-[10px]">
                  {user.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{user.displayName}</div>
              <div className="text-[10px] font-medium text-white/90 font-mono truncate">{user.friendCode}</div>
            </div>
            <Button
              type="button"
              onClick={() => onSendFriendRequest(user.id)}
              className="h-8 shrink-0 rounded-lg border border-cyan-400/35 bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 text-[10px] px-2 gap-1"
            >
              <UserPlus className="h-3 w-3" />
              Anfrage
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
