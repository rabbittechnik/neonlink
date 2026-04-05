function isStandaloneGifUrl(text: string): string | null {
  const t = text.trim();
  if (!t || t.includes("\n")) return null;
  if (!/^https:\/\//i.test(t)) return null;
  try {
    const u = new URL(t);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".gif") || path.endsWith(".webp")) return t;
    if (host.includes("giphy.com") || host.includes("tenor.com")) return t;
    return null;
  } catch {
    return null;
  }
}

type Props = {
  text: string;
  className?: string;
};

/** Rendert reine GIF-/Bild-URLs als Inline-Medium (sonst normaler Text). */
export function ChatMessageText({ text, className }: Props) {
  const gifUrl = isStandaloneGifUrl(text);
  if (gifUrl) {
    return (
      <span className={className}>
        <img
          src={gifUrl}
          alt=""
          className="max-w-[min(100%,280px)] max-h-52 rounded-lg border border-white/15 mt-0.5 object-contain bg-black/20"
          loading="lazy"
        />
      </span>
    );
  }
  return <span className={className}>{text}</span>;
}
