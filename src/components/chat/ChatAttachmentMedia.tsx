import React, { useCallback, useEffect, useState } from "react";
import { API_BASE_URL } from "@/config";
import { Download } from "lucide-react";

type Props = {
  attachmentId: string;
  mimeType: string;
  fileName: string;
  token: string | null;
};

export function ChatAttachmentMedia({ attachmentId, mimeType, fileName, token }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const authDownload = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(u);
  }, [attachmentId, fileName, token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/attachments/${attachmentId}/view`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (!cancelled) setFailed(true);
          return;
        }
        const blob = await res.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId, token]);

  if (!token) {
    return <span className="text-[11px] text-white/60 mt-1 block">{fileName}</span>;
  }

  if (failed) {
    return (
      <button
        type="button"
        onClick={() => void authDownload()}
        className="inline-flex items-center gap-1 text-xs text-cyan-200 hover:underline mt-1"
      >
        <Download className="h-3.5 w-3.5" />
        {fileName}
      </button>
    );
  }

  if (!url) {
    return <div className="text-[11px] text-white/70 mt-1">Medien werden geladen…</div>;
  }

  if (mimeType.startsWith("image/")) {
    return (
      <div className="mt-1 space-y-1 max-w-full">
        <img
          src={url}
          alt={fileName}
          className="max-h-72 max-w-full rounded-xl border border-white/15 object-contain shadow-lg shadow-black/20"
        />
        <button
          type="button"
          onClick={() => void authDownload()}
          className="inline-flex items-center gap-1 text-[10px] text-cyan-200/90 hover:underline"
        >
          <Download className="h-3 w-3" />
          Datei speichern
        </button>
      </div>
    );
  }

  if (mimeType.startsWith("audio/")) {
    return (
      <div className="mt-2 space-y-1 max-w-sm">
        <audio controls src={url} className="w-full h-9" preload="metadata" />
        <button
          type="button"
          onClick={() => void authDownload()}
          className="inline-flex items-center gap-1 text-[10px] text-cyan-200/90 hover:underline"
        >
          <Download className="h-3 w-3" />
          {fileName}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void authDownload()}
      className="inline-flex items-center gap-1 text-xs text-cyan-200 hover:underline mt-1"
    >
      <Download className="h-3.5 w-3.5" />
      {fileName}
    </button>
  );
}
