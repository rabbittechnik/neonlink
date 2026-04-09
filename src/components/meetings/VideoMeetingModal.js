import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/button";
import { buildJitsiMeetIframeSrc } from "@/utils/jitsiRoomNames";
/** Echte Videokonferenz über Jitsi Meet (Browser: Kamera/Mikro). */
export function VideoMeetingModal({ open, onClose, roomName, title }) {
    if (!open)
        return null;
    const src = buildJitsiMeetIframeSrc(roomName);
    return (_jsxs("div", { className: "fixed inset-0 z-[200] flex flex-col bg-[#020617]", children: [_jsxs("div", { className: "shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-[#0c1428]/95", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-semibold text-white truncate", children: title ?? "Video-Meeting" }), _jsx("div", { className: "text-[10px] text-white/60 truncate", children: "Jitsi Meet \u00B7 Mikrofon & Kamera erlauben" })] }), _jsx(Button, { type: "button", variant: "ghost", className: "text-white shrink-0 hover:bg-white/10", onClick: onClose, children: "Schliessen" })] }), _jsx("iframe", { title: "Video-Meeting", src: src, className: "flex-1 min-h-0 w-full border-0", allow: "camera; microphone; fullscreen; display-capture; autoplay" })] }));
}
