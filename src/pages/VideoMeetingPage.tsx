import React, { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  buildJitsiMeetIframeSrc,
  jitsiRoomForPlannedMeeting,
  jitsiRoomForWorkspaceRoom,
} from "@/utils/jitsiRoomNames";

/**
 * Vollbild-Video (Jitsi): eigene URL, damit „Beitreten“ zuverlässig funktioniert
 * (kein Overlay-Z-Index / alter Bundle-Iframe).
 */
export default function VideoMeetingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const ws = params.get("ws")?.trim() ?? "";
  const mid = params.get("mid")?.trim() ?? "";
  const rid = params.get("rid")?.trim() ?? "";
  const title = params.get("title")?.trim() || "Video-Meeting";

  const roomName = useMemo(() => {
    if (!ws) return null;
    if (mid) return jitsiRoomForPlannedMeeting(ws, mid);
    if (rid) return jitsiRoomForWorkspaceRoom(ws, rid);
    return null;
  }, [ws, mid, rid]);

  if (!roomName) {
    return <Navigate to="/" replace />;
  }

  const src = buildJitsiMeetIframeSrc(roomName);

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-white">
      <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#0c1428]/95">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{title}</div>
          <div className="text-[10px] text-white/60 truncate">Jitsi Meet · Mikrofon, Kamera, Bildschirm über die Jitsi-Leiste</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-white shrink-0 hover:bg-white/10 inline-flex items-center gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Button>
      </header>
      <iframe
        title="Video-Meeting"
        src={src}
        className="flex-1 min-h-[70vh] w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
      />
    </div>
  );
}
