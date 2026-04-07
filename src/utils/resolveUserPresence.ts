export type PresenceKind = "online" | "away" | "busy" | "offline" | "on_call";

export function resolvePresenceForSection(
  globalStatus: string,
  _statusBySection: Record<string, string> | undefined,
  _sectionId: string
): PresenceKind {
  // Presence must reflect real connection only, no manual section overrides.
  return globalStatus === "online" ? "online" : "offline";
}
