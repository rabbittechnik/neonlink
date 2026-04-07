import React from "react";
import { MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolvePresenceForSection, type PresenceKind } from "@/utils/resolveUserPresence";
import { FRIENDSHIP_FLOW_KEYS } from "./FriendCategoryModal";
import type { FriendGroup, FriendGroupOption, FriendListEntry, SectionId } from "./types";

const FLOW_SET = new Set<string>(FRIENDSHIP_FLOW_KEYS);

const STATUS_PILL: Record<
  PresenceKind,
  { label: string; className: string }
> = {
  online: {
    label: "Online",
    className: "bg-emerald-500/20 text-emerald-200 border-emerald-400/35",
  },
  away: {
    label: "Abwesend",
    className: "bg-amber-500/20 text-amber-100 border-amber-400/35",
  },
  busy: {
    label: "Beschäftigt",
    className: "bg-violet-500/20 text-violet-100 border-violet-400/35",
  },
  offline: {
    label: "Offline",
    className: "bg-white/10 text-white font-semibold border-white/15",
  },
  on_call: {
    label: "Im Einsatz",
    className: "bg-red-600/35 text-red-100 border-red-400/55",
  },
};

function StatusDot({ presence }: { presence: PresenceKind }) {
  const s = STATUS_PILL[presence];
  return (
    <span
      className={`inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${s.className}`}
    >
      {s.label}
    </span>
  );
}

type Props = {
  friends: FriendListEntry[];
  activeSection: SectionId;
  groupOptions: FriendGroupOption[];
  onSetFriendGroups: (friendId: string, groups: FriendGroup[]) => void;
  onOpenFriendProfile: (friendId: string) => void;
  onOpenPrivateChat: (friendId: string) => void;
  chatBusyId: string | null;
};

export function FriendsList({
  friends,
  activeSection,
  groupOptions,
  onSetFriendGroups,
  onOpenFriendProfile,
  onOpenPrivateChat,
  chatBusyId,
}: Props) {
  return (
    <Card className="rounded-3xl border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-white backdrop-blur-xl shadow-lg shadow-black/25">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="text-base" aria-hidden>
            👥
          </span>
          Deine Freunde
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0 max-h-56 overflow-y-auto pr-1">
        {friends.length === 0 ? (
          <p className="text-xs font-medium text-white py-6 text-center leading-relaxed px-2">
            Noch keine Freunde. Nutze Code oder Suche, um Kontakte hinzuzufügen.
          </p>
        ) : (
          friends.map((friend) => {
            const presence = resolvePresenceForSection(
              friend.status,
              friend.statusBySection as Record<string, string> | undefined,
              activeSection
            );
            const effective: FriendGroup[] =
              friend.groups && friend.groups.length > 0 ? friend.groups : [friend.group];
            const legacy = effective.filter((g) => !FLOW_SET.has(g));
            const flowSelected = FRIENDSHIP_FLOW_KEYS.filter((k) => effective.includes(k));
            const primaryGroup = effective[0] ?? friend.group;
            const opt = groupOptions.find((g) => g.value === primaryGroup);
            const toggleFlow = (key: (typeof FRIENDSHIP_FLOW_KEYS)[number]) => {
              const nextFlow = new Set(flowSelected);
              if (nextFlow.has(key)) nextFlow.delete(key);
              else nextFlow.add(key);
              if (activeSection === "familie") nextFlow.add("familie");
              if (nextFlow.size === 0) nextFlow.add("freunde");
              const orderedFlow = FRIENDSHIP_FLOW_KEYS.filter((k) => nextFlow.has(k)) as FriendGroup[];
              const merged: FriendGroup[] = [...legacy, ...orderedFlow];
              onSetFriendGroups(friend.id, merged);
            };
            return (
              <div
                key={friend.id}
                className="w-full rounded-2xl border border-white/10 bg-black/20 p-2.5 hover:bg-white/[0.07] hover:border-cyan-400/25 transition-all group flex flex-col gap-2 min-w-0"
              >
                <div className="flex gap-2 items-start min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenFriendProfile(friend.id)}
                    className="min-w-0 flex-1 text-left flex gap-2.5 items-center rounded-xl -m-0.5 p-0.5 hover:bg-white/[0.06] transition-colors"
                  >
                    <div className="relative shrink-0">
                      <Avatar className="h-11 w-11 overflow-hidden rounded-full border border-white/15 ring-2 ring-transparent group-hover:ring-cyan-400/30 transition-all">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <AvatarFallback className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/30 to-violet-500/20 text-sm">
                            {friend.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0a1020] ${
                          presence === "online"
                            ? "bg-emerald-400"
                            : presence === "away"
                              ? "bg-amber-400"
                              : presence === "busy"
                                ? "bg-violet-400"
                                : presence === "on_call"
                                  ? "bg-red-400 animate-pulse"
                                  : "bg-white/25"
                        }`}
                        title={STATUS_PILL[presence].label}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold truncate text-white">{friend.displayName}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <StatusDot presence={presence} />
                        <span className="text-[10px] font-medium text-white/90" title={opt?.label}>
                          {opt?.emoji} {opt?.label ?? primaryGroup}
                          {effective.length > 1 ? ` +${effective.length - 1}` : ""}
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void onOpenPrivateChat(friend.id)}
                    disabled={chatBusyId === friend.id}
                    title="Direktchat öffnen"
                    className="shrink-0 rounded-xl p-2 text-cyan-100 hover:bg-cyan-500/15 hover:text-cyan-50 disabled:opacity-50 transition-colors"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </button>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2 space-y-1.5">
                  <div className="text-[9px] uppercase tracking-wider text-white/80 font-semibold">
                    Kategorien (Mehrfach)
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {FRIENDSHIP_FLOW_KEYS.map((key) => {
                      const o = groupOptions.find((g) => g.value === key);
                      return (
                        <label
                          key={key}
                          className="inline-flex items-center gap-1.5 text-[10px] text-white cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={flowSelected.includes(key)}
                            onChange={() => toggleFlow(key)}
                            className="rounded border-white/30 w-3.5 h-3.5 accent-cyan-500"
                          />
                          <span>
                            {o?.emoji} {o?.label ?? key}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  {legacy.length > 0 ? (
                    <p className="text-[9px] text-white/55 leading-snug">
                      Weitere Gruppen: {legacy.map((g) => groupOptions.find((o) => o.value === g)?.label ?? g).join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
