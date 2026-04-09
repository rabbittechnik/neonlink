import React, { useState } from "react";
import { CalendarDays, Pencil, Plus, Trash2, Users, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiMeeting, ApiMeetingRoom } from "@/types/meetings";
import type { SectionId } from "@/types/collab";
import { jitsiRoomForWorkspaceRoom, videoMeetingPath } from "@/utils/jitsiRoomNames";
import { CreateMeetingModal } from "./CreateMeetingModal";

type Member = { id: string; displayName: string };

type Props = {
  workspaceId: string;
  rooms: ApiMeetingRoom[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  meetings: ApiMeeting[];
  members: Member[];
  currentUserId: string;
  activeSection: SectionId;
  namesById: Record<string, string>;
  onRefreshMeetings: () => void;
  onRefreshRooms: () => void;
  onCreateMeeting: (payload: {
    meetingRoomId: string;
    title: string;
    description: string;
    participantUserIds: string[];
    startsAt: string;
    endsAt: string;
    sectionId: SectionId;
  }) => Promise<void>;
  onDeleteMeeting: (meetingId: string) => Promise<void>;
  onCreateRoom: (name: string) => Promise<void>;
  onRenameRoom: (roomId: string, name: string) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  /** Anzeigename für Jitsi / UI */
  currentUserDisplayName: string;
};

function formatRange(startsAt: string, endsAt: string) {
  const a = new Date(startsAt);
  const b = new Date(endsAt);
  if (Number.isNaN(a.getTime())) return startsAt;
  const d = a.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });
  const ta = a.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const tb = b.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return `${d} · ${ta} – ${tb}`;
}

export function MeetingsWorkspacePanel({
  workspaceId,
  rooms,
  activeRoomId,
  onSelectRoom,
  meetings,
  members,
  currentUserId,
  activeSection,
  namesById,
  onRefreshMeetings,
  onRefreshRooms,
  onCreateMeeting,
  onDeleteMeeting,
  onCreateRoom,
  onRenameRoom,
  onDeleteRoom,
  currentUserDisplayName,
}: Props) {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("Neuer Raum");
  const [roomBusy, setRoomBusy] = useState(false);
  const [renamingRoomId, setRenamingRoomId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [roomListError, setRoomListError] = useState<string | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [quickInvite, setQuickInvite] = useState<Record<string, boolean>>({});
  const [quickInviteError, setQuickInviteError] = useState<string | null>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;
  const detail = meetings.find((m) => m.id === detailId) ?? null;
  const nowMs = Date.now();
  const quickRoomName = activeRoomId ? jitsiRoomForWorkspaceRoom(workspaceId, activeRoomId) : "";
  const quickJoinLink = quickRoomName ? `https://meet.jit.si/${encodeURIComponent(quickRoomName)}` : "";

  const copyQuickLink = async () => {
    if (!quickJoinLink) return;
    try {
      await navigator.clipboard.writeText(quickJoinLink);
      setQuickInviteError("Link kopiert.");
    } catch {
      setQuickInviteError("Link konnte nicht kopiert werden.");
    }
  };

  const startRoomNow = () => {
    if (!activeRoom || !activeRoomId) return;
    navigate(
      videoMeetingPath({
        workspaceId,
        roomId: activeRoomId,
        title: `Live: ${activeRoom.name}`,
      })
    );
  };

  const sendQuickInvites = async () => {
    if (!activeRoomId || !activeRoom) return;
    const participantUserIds = Object.entries(quickInvite)
      .filter(([, on]) => on)
      .map(([id]) => id);
    if (participantUserIds.length === 0) {
      setQuickInviteError("Bitte mindestens einen Benutzer auswählen.");
      return;
    }
    const start = new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setQuickBusy(true);
    setQuickInviteError(null);
    try {
      await onCreateMeeting({
        meetingRoomId: activeRoomId,
        title: `Sofort-Meeting: ${activeRoom.name}`,
        description: `Direkt beitreten: ${quickJoinLink}`,
        participantUserIds,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        sectionId: activeSection,
      });
      setQuickInvite({});
      onRefreshMeetings();
      setQuickInviteError("Einladungen gesendet.");
    } catch (e) {
      setQuickInviteError(e instanceof Error ? e.message : "Einladungen fehlgeschlagen.");
    } finally {
      setQuickBusy(false);
    }
  };

  const createRoom = async () => {
    setRoomBusy(true);
    setRoomListError(null);
    try {
      await onCreateRoom(newRoomName.trim() || "Neuer Raum");
      onRefreshRooms();
      setNewRoomOpen(false);
      setNewRoomName("Neuer Raum");
    } finally {
      setRoomBusy(false);
    }
  };

  const saveRename = async () => {
    if (!renamingRoomId) return;
    const n = renameDraft.trim();
    if (!n) return;
    setRenameBusy(true);
    setRoomListError(null);
    try {
      await onRenameRoom(renamingRoomId, n);
      setRenamingRoomId(null);
      onRefreshRooms();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      const friendly: Record<string, string> = {
        name_locked: "Dieser Name ist fest vergeben.",
        not_found: "Raum nicht gefunden.",
        forbidden: "Keine Berechtigung.",
        rename_failed: "Umbenennen fehlgeschlagen.",
      };
      setRoomListError(friendly[code] ?? (e instanceof Error ? e.message : "Fehler"));
    } finally {
      setRenameBusy(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!confirm("Diesen Meetingraum wirklich löschen? (Nur möglich ohne geplante Meetings im Raum.)")) return;
    setRoomListError(null);
    try {
      await onDeleteRoom(roomId);
      if (renamingRoomId === roomId) setRenamingRoomId(null);
      onRefreshRooms();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      const friendly: Record<string, string> = {
        cannot_delete_default_room: "Standard-Räume können nicht gelöscht werden.",
        room_has_meetings: "Zuerst alle Meetings in diesem Raum löschen oder verschieben.",
        not_found: "Raum nicht gefunden.",
        forbidden: "Keine Berechtigung.",
        delete_room_failed: "Löschen fehlgeschlagen.",
      };
      setRoomListError(friendly[code] ?? (e instanceof Error ? e.message : "Fehler"));
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-0 min-w-0 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        <Card className="lg:col-span-4 rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 min-w-0">
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <span aria-hidden>📅</span> Meetings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
            {roomListError ? (
              <p className="text-xs text-red-300/90 mb-2 px-1">{roomListError}</p>
            ) : null}
            {rooms.map((r) =>
              renamingRoomId === r.id ? (
                <div key={r.id} className="rounded-2xl border border-cyan-400/30 bg-black/30 p-2 space-y-2 mb-1">
                  <input
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      disabled={renameBusy || !renameDraft.trim()}
                      onClick={() => void saveRename()}
                      className="flex-1 h-8 rounded-lg bg-cyan-500/25 border border-cyan-400/35 text-cyan-100 text-xs"
                    >
                      Speichern
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={renameBusy}
                      onClick={() => setRenamingRoomId(null)}
                      className="h-8 rounded-lg text-white text-xs"
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={r.id}
                  className={`flex items-stretch gap-0.5 rounded-2xl border mb-1 transition-colors ${
                    r.id === activeRoomId
                      ? "border-cyan-400/40 bg-cyan-500/15"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectRoom(r.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2.5 text-sm text-white hover:bg-white/[0.06] rounded-l-2xl"
                  >
                    <Video className="inline h-3.5 w-3.5 mr-2 -mt-0.5 text-cyan-300/80" />
                    <span className="truncate align-middle">{r.name}</span>
                  </button>
                  {!r.lockedName ? (
                    <button
                      type="button"
                      title="Umbenennen"
                      aria-label={`${r.name} umbenennen`}
                      onClick={() => {
                        setRoomListError(null);
                        setRenamingRoomId(r.id);
                        setRenameDraft(r.name);
                      }}
                      className="shrink-0 w-9 flex items-center justify-center text-white/90 hover:text-cyan-200 hover:bg-white/10 rounded-none border-l border-white/10"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  {!r.isDefault ? (
                    <button
                      type="button"
                      title="Raum löschen"
                      aria-label={`${r.name} löschen`}
                      onClick={() => void deleteRoom(r.id)}
                      className="shrink-0 w-9 flex items-center justify-center text-red-300/70 hover:text-red-200 hover:bg-red-500/15 rounded-r-2xl border-l border-white/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              )
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setNewRoomOpen((v) => !v)}
              className="w-full mt-2 rounded-2xl border border-dashed border-white/20 text-white hover:text-cyan-200 hover:border-cyan-400/30 text-xs h-9"
            >
              <Plus className="h-3.5 w-3.5 mr-1 inline" />
              Raum erstellen
            </Button>
            {newRoomOpen ? (
              <div className="mt-2 space-y-2 rounded-2xl border border-white/10 p-3 bg-black/20">
                <input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm"
                />
                <Button
                  type="button"
                  disabled={roomBusy}
                  onClick={() => void createRoom()}
                  className="w-full h-8 rounded-xl bg-violet-500/20 border border-violet-300/30 text-violet-100 text-xs"
                >
                  Anlegen
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 rounded-3xl border-white/10 bg-white/5 text-white backdrop-blur-xl flex flex-col min-h-0 min-w-0">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2 border-b border-white/10 shrink-0">
            <CardTitle className="text-lg flex items-center gap-2 min-w-0">
              <Video className="h-5 w-5 text-cyan-300 shrink-0" />
              <span className="truncate">{activeRoom ? activeRoom.name : "Raum wählen"}</span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
              <Button
                type="button"
                disabled={!activeRoomId}
                onClick={startRoomNow}
                className="rounded-xl bg-gradient-to-r from-emerald-500/35 to-cyan-500/30 border border-emerald-400/45 text-white hover:from-emerald-500/45 hover:to-cyan-500/40 text-sm font-medium shadow-[0_0_20px_rgba(52,211,153,0.15)]"
              >
                <Video className="h-4 w-4 mr-1.5 inline" />
                Video-Raum jetzt
              </Button>
              <Button
                type="button"
                disabled={!activeRoomId}
                onClick={() => setModalOpen(true)}
                className="rounded-xl bg-cyan-500/20 border border-cyan-400/35 text-cyan-100 hover:bg-cyan-500/30 text-sm"
              >
                <Plus className="h-4 w-4 mr-1.5 inline" />
                Meeting planen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 overflow-y-auto pt-4 space-y-3">
            {activeRoomId ? (
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 space-y-3">
                <div className="font-medium text-cyan-100">Video-Raum aktivieren</div>
                <p className="text-xs text-white/80">
                  Öffne <strong>{activeRoom?.name}</strong> sofort als Videokonferenzraum mit Kamera und
                  Bildschirmfreigabe.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={startRoomNow}
                    className="rounded-xl bg-cyan-500/25 border border-cyan-400/35 text-cyan-100"
                  >
                    <Video className="h-4 w-4 mr-1.5" />
                    Raum jetzt eröffnen
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => void copyQuickLink()}
                    className="rounded-xl border border-white/20 text-white hover:bg-white/10"
                  >
                    Link kopieren
                  </Button>
                </div>
                <div>
                  <div className="text-[11px] text-white/70 mb-1">Benutzer direkt einladen</div>
                  <div className="max-h-28 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-2 space-y-1">
                    {members
                      .filter((m) => m.id !== currentUserId)
                      .map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-xs text-white/90">
                          <input
                            type="checkbox"
                            checked={Boolean(quickInvite[m.id])}
                            onChange={(e) =>
                              setQuickInvite((prev) => ({ ...prev, [m.id]: e.target.checked }))
                            }
                          />
                          {m.displayName}
                        </label>
                      ))}
                  </div>
                  <Button
                    type="button"
                    disabled={quickBusy}
                    onClick={() => void sendQuickInvites()}
                    className="mt-2 rounded-xl bg-violet-500/20 border border-violet-300/30 text-violet-100 text-xs"
                  >
                    {quickBusy ? "Sende Einladungen..." : "Einladungen an Benutzer senden"}
                  </Button>
                  {quickInviteError ? <p className="mt-1 text-xs text-white/80">{quickInviteError}</p> : null}
                </div>
              </div>
            ) : null}
            {!activeRoomId ? (
              <p className="text-sm text-white/90 text-center py-12">Links einen Meetingraum auswählen.</p>
            ) : meetings.length === 0 ? (
              <p className="text-sm text-white/80 text-center py-6">
                Noch keine Meetings, an denen du teilnimmst. Du kannst den Raum sofort eröffnen oder ein Meeting planen.
              </p>
            ) : (
              meetings.map((m) => {
                const startMs = new Date(m.startsAt).getTime();
                const endMs = new Date(m.endsAt).getTime();
                const live = startMs <= nowMs && nowMs <= endMs;
                return (
                  <div
                    key={m.id}
                    className="w-full rounded-2xl border border-white/10 bg-black/25 hover:border-cyan-400/25 hover:bg-white/[0.04] p-4 transition-colors flex flex-col sm:flex-row sm:items-stretch gap-3"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="min-w-0 flex-1 text-left cursor-pointer rounded-xl -m-1 p-1"
                      onClick={() => setDetailId(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDetailId(m.id);
                        }
                      }}
                    >
                      <div className="font-medium text-white flex items-center gap-2 flex-wrap">
                        {m.title}
                        {live ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 animate-pulse">
                            läuft
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-cyan-200/70 mt-1 flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatRange(m.startsAt, m.endsAt)}
                      </div>
                      <div className="text-[11px] text-white/90 mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {m.participantUserIds.length + 1} Teilnehmer (inkl. Organisator)
                      </div>
                      <p className="text-[10px] text-white/50 mt-1.5">Tippen für Details · unten direkt Video</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0 sm:flex-col sm:items-stretch sm:justify-center">
                      <Link
                        to={videoMeetingPath({
                          workspaceId,
                          meetingId: m.id,
                          title: m.title,
                        })}
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium no-underline ${
                          live
                            ? "bg-gradient-to-r from-emerald-500/40 to-cyan-500/35 border border-emerald-400/50 text-white animate-pulse"
                            : "bg-violet-500/25 border border-violet-400/40 text-violet-100 hover:opacity-95"
                        }`}
                      >
                        <Video className="h-4 w-4 mr-1.5 shrink-0" />
                        {live ? "Jetzt beitreten" : "Video starten"}
                      </Link>
                      {m.createdByUserId === currentUserId ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            if (confirm("Meeting löschen? Kalendereintrag wird entfernt.")) {
                              void onDeleteMeeting(m.id).then(() => {
                                onRefreshMeetings();
                                setDetailId(null);
                              });
                            }
                          }}
                          className="rounded-xl text-red-300/80 hover:bg-red-500/15 hover:text-red-200"
                          aria-label="Meeting löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {detail ? (
        <div
          className="fixed inset-0 z-[84] flex items-end sm:items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Schliessen"
            onClick={() => setDetailId(null)}
          />
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-[#0c1428] p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-white pr-8">{detail.title}</h3>
            <p className="text-xs text-cyan-200/80 mt-1">{formatRange(detail.startsAt, detail.endsAt)}</p>
            <Link
              to={videoMeetingPath({
                workspaceId,
                meetingId: detail.id,
                title: detail.title,
              })}
              onClick={() => setDetailId(null)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500/35 to-cyan-600/35 border border-emerald-400/50 text-white font-semibold py-6 text-base hover:from-emerald-500/45 hover:to-cyan-600/45 shadow-[0_0_24px_rgba(34,211,238,0.18)] no-underline"
            >
              <Video className="h-5 w-5 shrink-0" />
              Jetzt beitreten (eigene Seite · Jitsi)
            </Link>
            <p className="text-[10px] text-white/55 mt-2 leading-snug">
              Öffnet den Video-Raum auf einer eigenen Seite (voller Platz). Mikrofon/Kamera freigeben;
              Bildschirm in Jitsi über die Werkzeugleiste.
            </p>
            {detail.description ? (
              <p className="text-sm text-white/90 mt-4 leading-relaxed border-t border-white/10 pt-3">{detail.description}</p>
            ) : null}
            <div className="mt-4 text-xs text-white/90 border-t border-white/10 pt-3">
              <div className="font-medium text-white mb-1">Teilnehmer</div>
              <ul className="space-y-1">
                <li>• {namesById[detail.createdByUserId] ?? "Organisator"} (Organisator)</li>
                {detail.participantUserIds.map((id) => (
                  <li key={id}>• {namesById[id] ?? id}</li>
                ))}
              </ul>
            </div>
            <p className="text-[10px] text-white/45 mt-2">
              Als <span className="text-cyan-200/90">{currentUserDisplayName}</span> in Jitsi.
            </p>
            <Button
              type="button"
              variant="ghost"
              className="mt-3 w-full rounded-xl text-white/80"
              onClick={() => setDetailId(null)}
            >
              Schliessen
            </Button>
          </div>
        </div>
      ) : null}

      <CreateMeetingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        rooms={rooms}
        members={members}
        currentUserId={currentUserId}
        activeSection={activeSection}
        onSubmit={async (payload) => {
          await onCreateMeeting(payload);
          onRefreshMeetings();
        }}
      />
    </div>
  );
}
