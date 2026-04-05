import type { SectionId } from "@/types/collab";

export type FriendGroup =
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

export type FriendListEntry = {
  id: string;
  displayName: string;
  status: string;
  friendCode?: string;
  avatarUrl?: string | null;
  /** @deprecated nutze groups — ein Eintrag für Abwärtskompatibilität */
  group: FriendGroup;
  /** Mehrfach-Kategorien (Server) */
  groups?: FriendGroup[];
  statusBySection?: Record<string, string>;
};

export type FriendSearchHit = Pick<FriendListEntry, "id" | "displayName" | "friendCode" | "avatarUrl">;

export type IncomingFriendRequest = {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: "pending";
  fromDisplayName?: string;
  fromCategoryKeys?: string[];
};

export type FriendGroupOption = { value: FriendGroup; label: string; emoji: string };

export type { SectionId };
