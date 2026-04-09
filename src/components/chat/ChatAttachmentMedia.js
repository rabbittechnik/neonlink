import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import { Download } from "lucide-react";
export function ChatAttachmentMedia({ attachmentId, mimeType, fileName, token }) {
    const [url, setUrl] = useState(null);
    const [failed, setFailed] = useState(false);
    const authDownload = useCallback(async () => {
        if (!token)
            return;
        const res = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/download`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            return;
        const blob = await res.blob();
        const u = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = u;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(u);
    }, [attachmentId, fileName, token]);
    useEffect(() => {
        if (!token)
            return;
        let cancelled = false;
        let objectUrl = null;
        void (async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/view`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) {
                    if (!cancelled)
                        setFailed(true);
                    return;
                }
                const blob = await res.blob();
                objectUrl = URL.createObjectURL(blob);
                if (!cancelled)
                    setUrl(objectUrl);
            }
            catch {
                if (!cancelled)
                    setFailed(true);
            }
        })();
        return () => {
            cancelled = true;
            if (objectUrl)
                URL.revokeObjectURL(objectUrl);
        };
    }, [attachmentId, token]);
    if (!token) {
        return _jsx("span", { className: "text-[11px] text-white/60 mt-1 block", children: fileName });
    }
    if (failed) {
        return (_jsxs("button", { type: "button", onClick: () => void authDownload(), className: "inline-flex items-center gap-1 text-xs text-cyan-200 hover:underline mt-1", children: [_jsx(Download, { className: "h-3.5 w-3.5" }), fileName] }));
    }
    if (!url) {
        return _jsx("div", { className: "text-[11px] text-white/70 mt-1", children: "Medien werden geladen\u2026" });
    }
    if (mimeType.startsWith("image/")) {
        return (_jsxs("div", { className: "mt-1 space-y-1 max-w-full", children: [_jsx("img", { src: url, alt: fileName, className: "max-h-72 max-w-full rounded-xl border border-white/15 object-contain shadow-lg shadow-black/20" }), _jsxs("button", { type: "button", onClick: () => void authDownload(), className: "inline-flex items-center gap-1 text-[10px] text-cyan-200/90 hover:underline", children: [_jsx(Download, { className: "h-3 w-3" }), "Datei speichern"] })] }));
    }
    if (mimeType.startsWith("audio/")) {
        return (_jsxs("div", { className: "mt-2 space-y-1 max-w-sm", children: [_jsx("audio", { controls: true, src: url, className: "w-full h-9", preload: "metadata" }), _jsxs("button", { type: "button", onClick: () => void authDownload(), className: "inline-flex items-center gap-1 text-[10px] text-cyan-200/90 hover:underline", children: [_jsx(Download, { className: "h-3 w-3" }), fileName] })] }));
    }
    return (_jsxs("button", { type: "button", onClick: () => void authDownload(), className: "inline-flex items-center gap-1 text-xs text-cyan-200 hover:underline mt-1", children: [_jsx(Download, { className: "h-3.5 w-3.5" }), fileName] }));
}
