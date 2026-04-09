import type { TransitDeparture, TransitLineType } from "@/types/transit";

function stripCitySuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}

type HafasLine = {
  name?: string | null;
  product?: string | null;
  mode?: string | null;
};

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

function detectIceFromLineName(name: string): boolean {
  const u = name.toUpperCase();
  return u.startsWith("ICE ") || u.startsWith("IC ") || u === "ICE" || u === "IC";
}

export function mapProductToTransitType(line: HafasLine | null | undefined): TransitLineType {
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

function buildRoute(d: HafasDeparture): string {
  const dir = d.direction ? stripCitySuffix(d.direction) : "";
  const prov = d.provenance?.name ? stripCitySuffix(d.provenance.name) : "";
  if (prov && dir && prov !== dir) return `${prov} → ${dir}`;
  if (dir) return dir;
  if (d.destination?.name) return stripCitySuffix(d.destination.name);
  return "—";
}

function buildDestination(d: HafasDeparture): string {
  if (d.direction) return stripCitySuffix(d.direction);
  if (d.destination?.name) return stripCitySuffix(d.destination.name);
  return "—";
}

export function mapHafasDeparture(d: HafasDeparture): TransitDeparture {
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

  return {
    id: `${d.tripId}|${d.when}`,
    minutes,
    line: lineName,
    type,
    route: buildRoute(d),
    destination: buildDestination(d),
    platform: d.platform?.trim() ? d.platform : null,
    time,
    delayMinutes,
  };
}
