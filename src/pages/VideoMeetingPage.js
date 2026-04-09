import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { buildJitsiMeetIframeSrc, jitsiRoomForPlannedMeeting, jitsiRoomForWorkspaceRoom, } from "@/utils/jitsiRoomNames";
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
        if (!ws)
            return null;
        if (mid)
            return jitsiRoomForPlannedMeeting(ws, mid);
        if (rid)
            return jitsiRoomForWorkspaceRoom(ws, rid);
        return null;
    }, [ws, mid, rid]);
    if (!roomName) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    const src = buildJitsiMeetIframeSrc(roomName);
    return (_jsxs("div", { className: "min-h-screen flex flex-col bg-[#020617] text-white", children: [_jsxs("header", { className: "shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#0c1428]/95", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-semibold truncate", children: title }), _jsx("div", { className: "text-[10px] text-white/60 truncate", children: "Jitsi Meet \u00B7 Mikrofon, Kamera, Bildschirm \u00FCber die Jitsi-Leiste" })] }), _jsxs(Button, { type: "button", variant: "ghost", className: "text-white shrink-0 hover:bg-white/10 inline-flex items-center gap-2", onClick: () => navigate(-1), children: [_jsx(ArrowLeft, { className: "h-4 w-4" }), "Zur\u00FCck"] })] }), _jsx("iframe", { title: "Video-Meeting", src: src, className: "flex-1 min-h-[70vh] w-full border-0", allow: "camera; microphone; fullscreen; display-capture; autoplay" })] }));
}
