import React from "react";
import { Button } from "@/components/ui/button";
import { buildJitsiMeetIframeSrc } from "@/utils/jitsiRoomNames";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Jitsi-Raumname (nur sichere Zeichen) */
  roomName: string;
  title?: string;
};

/** Echte Videokonferenz über Jitsi Meet (Browser: Kamera/Mikro). */
export function VideoMeetingModal({ open, onClose, roomName, title }: Props) {
  if (!open) return null;
  const src = buildJitsiMeetIframeSrc(roomName);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#020617]">
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#0c1428]/95">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white truncate">{title ?? "Video-Meeting"}</div>
          <div className="text-[10px] text-white/60 truncate">Jitsi Meet · Mikrofon &amp; Kamera erlauben</div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="text-white shrink-0 hover:bg-white/10"
          onClick={onClose}
        >
          Schliessen
        </Button>
      </div>
      <iframe
        title="Video-Meeting"
        src={src}
        className="flex-1 min-h-0 w-full border-0"
        allow="camera; microphone; fullscreen; display-capture; autoplay"
      />
    </div>
  );
}
