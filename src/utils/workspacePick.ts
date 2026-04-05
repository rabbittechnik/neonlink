/** Workspace mit den meisten Mitgliedern, bei Gleichstand stabile ID — gleiche Wahl für alle im selben Kreis. */
export type WorkspacePickItem = { id: string; memberCount?: number };

export function pickSharedWorkspaceId(list: WorkspacePickItem[]): string | null {
  if (list.length === 0) return null;
  const enriched = list.map((w) => ({
    id: w.id,
    mc: typeof w.memberCount === "number" && w.memberCount > 0 ? w.memberCount : 1,
  }));
  const maxM = Math.max(...enriched.map((w) => w.mc));
  const top = enriched.filter((w) => w.mc === maxM);
  top.sort((a, b) => a.id.localeCompare(b.id));
  return top[0]!.id;
}
