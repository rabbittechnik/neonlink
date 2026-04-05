import React, { useCallback, useEffect, useRef, useState } from "react";
import { FriendsHeader } from "./FriendsHeader";
import { InviteCodeCard } from "./InviteCodeCard";
import { JoinByCodeCard } from "./JoinByCodeCard";
import { FriendSearchStrip } from "./FriendSearchStrip";
import { FriendRequestsCard } from "./FriendRequestsCard";
import { FriendsList } from "./FriendsList";
import type {
  FriendGroup,
  FriendGroupOption,
  FriendListEntry,
  FriendSearchHit,
  IncomingFriendRequest,
  SectionId,
} from "./types";

export type FriendsPanelProps = {
  displayName: string;
  friendCode: string;
  activeWorkspaceId: string | null;
  activeSection: SectionId;
  workspaceInviteCode: string;
  onWorkspaceInviteCodeChange: (v: string) => void;
  onJoinWorkspace: (code?: string) => void;
  generatedWorkspaceInviteCode: string;
  onCreateWorkspaceInvite: () => void;
  onRegenerateFriendCode: () => Promise<void>;
  inviteInfo: string;
  friendInfo: string;
  friendSearch: string;
  onFriendSearchChange: (v: string) => void;
  onSearchFriends: () => void;
  friendSearchResults: FriendSearchHit[];
  onSendFriendRequest: (userId: string) => void;
  incomingFriendRequests: IncomingFriendRequest[];
  resolveRequestUser: (userId: string) => { displayName?: string; avatarUrl?: string | null } | undefined;
  onAcceptFriendRequest: (requestId: string) => void;
  onRejectFriendRequest: (requestId: string) => void;
  friends: FriendListEntry[];
  friendGroupOptions: FriendGroupOption[];
  onSetFriendGroups: (friendId: string, groups: FriendGroup[]) => void;
  onAddFriendByCode: (code: string) => Promise<void>;
  onOpenFriendProfile: (friendId: string) => void;
  onOpenPrivateChat: (friendId: string) => Promise<void>;
};

export function FriendsPanel({
  displayName,
  friendCode,
  activeWorkspaceId,
  activeSection,
  workspaceInviteCode,
  onWorkspaceInviteCodeChange,
  onJoinWorkspace,
  generatedWorkspaceInviteCode,
  onCreateWorkspaceInvite,
  onRegenerateFriendCode,
  inviteInfo,
  friendInfo,
  friendSearch,
  onFriendSearchChange,
  onSearchFriends,
  friendSearchResults,
  onSendFriendRequest,
  incomingFriendRequests,
  resolveRequestUser,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  friends,
  friendGroupOptions,
  onSetFriendGroups,
  onAddFriendByCode,
  onOpenFriendProfile,
  onOpenPrivateChat,
}: FriendsPanelProps) {
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [joinPulse, setJoinPulse] = useState(false);
  const [chatBusyId, setChatBusyId] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

  const copyFriendCode = useCallback(() => {
    if (!friendCode) return;
    void navigator.clipboard.writeText(friendCode).then(() => {
      setCopyHint("In Zwischenablage kopiert.");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopyHint(null), 2200);
    });
  }, [friendCode]);

  const handleRegenerate = useCallback(async () => {
    await onRegenerateFriendCode();
  }, [onRegenerateFriendCode]);

  const scrollToJoin = useCallback(() => {
    document.getElementById("friends-join-by-code")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setJoinPulse(true);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setJoinPulse(false), 2400);
  }, []);

  const handleOpenChat = useCallback(
    async (friendId: string) => {
      setChatBusyId(friendId);
      try {
        await onOpenPrivateChat(friendId);
      } finally {
        setChatBusyId(null);
      }
    },
    [onOpenPrivateChat]
  );

  return (
    <div className="space-y-3 min-w-0">
      <FriendsHeader
        onAddFriend={scrollToJoin}
        onSearch={() => setSearchOpen((v) => !v)}
        searchActive={searchOpen}
      />

      {searchOpen ? (
        <FriendSearchStrip
          friendSearch={friendSearch}
          onFriendSearchChange={onFriendSearchChange}
          onSearchFriends={onSearchFriends}
          results={friendSearchResults}
          onSendFriendRequest={onSendFriendRequest}
        />
      ) : null}

      <p className="text-[10px] font-medium text-white/90 leading-relaxed px-0.5">
        Eingeloggt als <span className="text-cyan-100 font-semibold">{displayName}</span>. Gruppen (Familie, Feuerwehr, …) ordnest du
        nur für dich zu — andere sehen deine Zuordnung nicht.
      </p>

      {(inviteInfo || friendInfo) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 space-y-1 text-[11px]">
          {inviteInfo ? <p className="text-white leading-snug font-medium">{inviteInfo}</p> : null}
          {friendInfo ? <p className="text-cyan-100 font-semibold leading-snug">{friendInfo}</p> : null}
        </div>
      )}

      <InviteCodeCard
        friendCode={friendCode}
        onCopyFriendCode={copyFriendCode}
        onRegenerateFriendCode={handleRegenerate}
        activeWorkspaceId={activeWorkspaceId}
        workspaceInviteCode={workspaceInviteCode}
        onWorkspaceInviteCodeChange={onWorkspaceInviteCodeChange}
        onJoinWorkspace={() => onJoinWorkspace()}
        generatedWorkspaceInviteCode={generatedWorkspaceInviteCode}
        onCreateWorkspaceInvite={onCreateWorkspaceInvite}
        copyHint={copyHint}
      />

      <JoinByCodeCard highlight={joinPulse} onAddFriendByCode={onAddFriendByCode} />

      <FriendRequestsCard
        requests={incomingFriendRequests}
        resolveUser={resolveRequestUser}
        onAccept={onAcceptFriendRequest}
        onReject={onRejectFriendRequest}
      />

      <FriendsList
        friends={friends}
        activeSection={activeSection}
        groupOptions={friendGroupOptions}
        onSetFriendGroups={onSetFriendGroups}
        onOpenFriendProfile={onOpenFriendProfile}
        onOpenPrivateChat={handleOpenChat}
        chatBusyId={chatBusyId}
      />
    </div>
  );
}
