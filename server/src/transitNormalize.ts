/**
 * HAFAS → einheitliches Abfahrts-Objekt (Frontend).
 * GTFS-Realtime: Platzhalter — später trip_id matchen und delay überschreiben.
 */

export type TransitLineType = "SBAHN" | "ICE" | "RE" | "BUS" | "SUBWAY" | "TRAM" | "OTHER";

export type UnifiedDeparture = {
  id: string;
  minutes: number;
  line: string;
  type: TransitLineType;
  route: string[];
  destination: string;
  platform: string | null;
  time: string;
  delayMinutes: number | null;
  /** Minuten — Alias für API-Spec */
  delay?: number;
  sources: string[];
};

type HafasLine = { name?: string | null; product?: string | null };

export type HafasDeparture = {
  tripId: string;
  when: string;
  plannedWhen?: string | null;
  delay?: number | null;
  platform?: string | null;
  direction?: string | null;
  provenance?: { name?: string | null } | null;
  destination?: { name?: string | null } | null;
  line?: HafasLine | null;
};

function stripCitySuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}

function detectIceFromLineName(name: string): boolean {
  const u = name.toUpperCase();
  return u.startsWith("ICE ") || u.startsWith("IC ") || u === "ICE" || u === "IC";
}

function mapProductToTransitType(line: HafasLine | null | undefined): TransitLineType {
  const name = (line?.name ?? "").trim();
  if (detectIceFromLineName(name)) return "ICE";
  const p = line?.product ?? "";
  switch (p) {
    case "suburban":
      return "SBAHN";
    case "express":
      return "ICE";
    case "regional":
      return "RE";
    case "bus":
      return "BUS";
    case "subway":
      return "SUBWAY";
    case "tram":
      return "TRAM";
    default:
      return "OTHER";
  }
}

function buildRouteString(d: HafasDeparture): string {
  const dir = d.direction ? stripCitySuffix(d.direction) : "";
  const prov = d.provenance?.name ? stripCitySuffix(d.provenance.name) : "";
  if (prov && dir && prov !== dir) return `${prov} → ${dir}`;
  if (dir) return dir;
  if (d.destination?.name) return stripCitySuffix(d.destination.name);
  return "—";
}

function routeToArray(routeStr: string): string[] {
  if (!routeStr || routeStr === "—") return [];
  return routeStr
    .split(/\s*→\s*/u)
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildDestination(d: HafasDeparture): string {
  if (d.direction) return stripCitySuffix(d.direction);
  if (d.destination?.name) return stripCitySuffix(d.destination.name);
  return "—";
}

/** Erweiterungspunkt: GTFS-RT Delay/Trip-Merge (Protobuf-Feed + trip_id). */
export function applyGtfsRealtimePlaceholder(deps: UnifiedDeparture[]): UnifiedDeparture[] {
  return deps;
}

export function hafasDepartureToUnified(d: HafasDeparture, sourceTag: string): UnifiedDeparture {
  const when = new Date(d.when);
  const ms = when.getTime() - Date.now();
  const minutes = Math.max(0, Math.round(ms / 60000));
  const delaySec = d.delay ?? 0;
  const delayMinutes = delaySec > 30 ? Math.round(delaySec / 60) : null;
  const lineName = (d.line?.name ?? d.line?.product ?? "?").trim();
  const type = mapProductToTransitType(d.line ?? null);
  const time = Number.isNaN(when.getTime())
    ? "—"
    : when.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

  const u: UnifiedDeparture = {
    id: `${d.tripId}|${d.when}`,
    minutes,
    line: lineName,
    type,
    route: routeToArray(buildRouteString(d)),
    destination: buildDestination(d),
    platform: d.platform?.trim() ? d.platform : null,
    time,
    delayMinutes,
    sources: [sourceTag],
  };
  if (delayMinutes != null && delayMinutes > 0) u.delay = delayMinutes;
  return u;
}

export function normalizeDeparturesResponse(
  raw: { departures?: HafasDeparture[] },
  sourceTag: string
): UnifiedDeparture[] {
  const list = raw.departures ?? [];
  let mapped = list.map((x) => hafasDepartureToUnified(x, sourceTag));
  mapped = applyGtfsRealtimePlaceholder(mapped);
  mapped.sort((a, b) => a.minutes - b.minutes || a.time.localeCompare(b.time));
  return mapped;
}
