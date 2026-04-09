import type { TransitDeparture, TransitLineType, TransitStopRef } from "@/types/transit";

/** Öffentliche HAFAS-REST-Instanz Berlin/Brandenburg — CORS im Browser. */
export const BVG_BASE = "https://v6.bvg.transport.rest";

function stripCitySuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}

type BvgLine = {
  name?: string | null;
  product?: string | null;
  mode?: string | null;
};

type BvgDeparture = {
  tripId: string;
  when: string;
  plannedWhen?: string | null;
  delay?: number | null;
  platform?: string | null;
  direction?: string | null;
  provenance?: { name?: string | null } | null;
  destination?: { name?: string | null } | null;
  line?: BvgLine | null;
};

function detectIceFromLineName(name: string): boolean {
  const u = name.toUpperCase();
  return u.startsWith("ICE ") || u.startsWith("IC ") || u === "ICE" || u === "IC";
}

export function mapProductToTransitType(line: BvgLine | null | undefined): TransitLineType {
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

function buildRoute(d: BvgDeparture): string {
  const dir = d.direction ? stripCitySuffix(d.direction) : "";
  const prov = d.provenance?.name ? stripCitySuffix(d.provenance.name) : "";
  if (prov && dir && prov !== dir) return `${prov} → ${dir}`;
  if (dir) return dir;
  if (d.destination?.name) return stripCitySuffix(d.destination.name);
  return "—";
}

function buildDestination(d: BvgDeparture): string {
  if (d.direction) return stripCitySuffix(d.direction);
  if (d.destination?.name) return stripCitySuffix(d.destination.name);
  return "—";
}

export function mapBvgDeparture(d: BvgDeparture): TransitDeparture {
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

export async function bvgFetchNearby(latitude: number, longitude: number, results = 8): Promise<TransitStopRef[]> {
  const u = new URL(`${BVG_BASE}/locations/nearby`);
  u.searchParams.set("latitude", String(latitude));
  u.searchParams.set("longitude", String(longitude));
  u.searchParams.set("results", String(results));
  u.searchParams.set("stops", "true");
  u.searchParams.set("poi", "false");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`nearby_http_${res.status}`);
  const data = (await res.json()) as Array<{
    type?: string;
    id?: string;
    name?: string;
    distance?: number;
  }>;
  return data
    .filter((x) => x.type === "stop" && x.id && x.name)
    .map((x) => ({ id: x.id!, name: x.name!, distance: x.distance }));
}

export async function bvgSearchStops(query: string, results = 8): Promise<TransitStopRef[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const u = new URL(`${BVG_BASE}/locations`);
  u.searchParams.set("query", q);
  u.searchParams.set("results", String(results));
  u.searchParams.set("poi", "false");
  u.searchParams.set("addresses", "false");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`search_http_${res.status}`);
  const data = (await res.json()) as Array<{
    type?: string;
    id?: string;
    name?: string;
  }>;
  return data
    .filter((x) => x.type === "stop" && x.id && x.name)
    .map((x) => ({ id: x.id!, name: x.name! }));
}

export async function bvgFetchDepartures(stopId: string, max = 10): Promise<TransitDeparture[]> {
  const u = new URL(`${BVG_BASE}/stops/${encodeURIComponent(stopId)}/departures`);
  u.searchParams.set("duration", "90");
  u.searchParams.set("results", String(Math.max(max, 15)));
  u.searchParams.set("remarks", "false");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`departures_http_${res.status}`);
  const json = (await res.json()) as { departures?: BvgDeparture[] };
  const raw = json.departures ?? [];
  const mapped = raw.map(mapBvgDeparture);
  mapped.sort((a, b) => a.minutes - b.minutes || a.time.localeCompare(b.time));
  return mapped.slice(0, max);
}
