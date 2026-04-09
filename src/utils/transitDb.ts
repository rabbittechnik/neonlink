import type { TransitDeparture, TransitStopRef } from "@/types/transit";
import { mapHafasDeparture, type HafasDeparture } from "@/utils/transitHafasMap";

/** Deutsche Bahn HAFAS (bundesweit) — CORS laut Projekt-Doku; bei 503 ggf. später erneut versuchen. */
export const DB_BASE = "https://v6.db.transport.rest";

export async function dbFetchNearby(latitude: number, longitude: number, results = 8): Promise<TransitStopRef[]> {
  const u = new URL(`${DB_BASE}/locations/nearby`);
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
    .map((x) => ({ id: x.id!, name: x.name!, provider: "db" as const, distance: x.distance }));
}

export async function dbSearchStops(query: string, results = 8): Promise<TransitStopRef[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const u = new URL(`${DB_BASE}/locations`);
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
    .map((x) => ({ id: x.id!, name: x.name!, provider: "db" as const }));
}

export async function dbFetchDepartures(stopId: string, max = 10): Promise<TransitDeparture[]> {
  const u = new URL(`${DB_BASE}/stops/${encodeURIComponent(stopId)}/departures`);
  u.searchParams.set("duration", "120");
  u.searchParams.set("results", String(Math.max(max, 15)));
  u.searchParams.set("remarks", "false");
  u.searchParams.set("language", "de");
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`departures_http_${res.status}`);
  const json = (await res.json()) as { departures?: HafasDeparture[] };
  const raw = json.departures ?? [];
  const mapped = raw.map(mapHafasDeparture);
  mapped.sort((a, b) => a.minutes - b.minutes || a.time.localeCompare(b.time));
  return mapped.slice(0, max);
}
