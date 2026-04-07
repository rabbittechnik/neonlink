export type PresenceKind = "online" | "away" | "busy" | "offline" | "on_call";

export function resolvePresenceForSection(
  globalStatus: string,
  statusBySection: Record<string, string> | undefined,
  sectionId: string
): PresenceKind {
  // Global offline always wins (e.g. after logout/disconnect).
  if (globalStatus === "offline") return "offline";
  const s = statusBySection?.[sectionId];
  if (s === "online" || s === "away" || s === "busy" || s === "offline" || s === "on_call") return s;
  if (globalStatus === "online" || globalStatus === "away" || globalStatus === "busy" || globalStatus === "offline" || globalStatus === "on_call") {
    return globalStatus;
  }
  return "offline";
}
