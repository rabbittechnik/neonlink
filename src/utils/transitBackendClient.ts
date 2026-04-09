import { API_BASE_URL } from "@/config";
import type { TransitDeparture, TransitProvider, TransitStopRef } from "@/types/transit";

function apiRoot(): string {
  return API_BASE_URL.replace(/\/$/, "");
}

function fullUrl(path: string, params: Record<string, string | number | undefined>): string {
  const root = apiRoot();
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, String(v));
  }
  const q = sp.toString();
  const suffix = q ? `?${q}` : "";
  const p = path.startsWith("/") ? path : `/${path}`;
  if (root === "") return `${p}${suffix}`;
  if (root.startsWith("http")) return `${root}${p}${suffix}`;
  return `${root}${p}${suffix}`;
}

/** Nearby mit Backend-Fallback (BVG ↔ DB je nach Modus). */
export async function transitFetchNearby(
  latitude: number,
  longitude: number,
  results: number,
  mode: "auto" | TransitProvider
): Promise<TransitStopRef[]> {
  const url = fullUrl("/transit/locations/nearby", {
    latitude,
    longitude,
    results,
    mode: mode === "auto" ? "auto" : mode,
  });
  const res = await fetch(url);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(j.detail ?? j.error ?? `nearby_${res.status}`);
  }
  const data = (await res.json()) as { stops?: TransitStopRef[] };
  return data.stops ?? [];
}

export async function transitSearchStops(query: string, results: number, provider: TransitProvider): Promise<TransitStopRef[]> {
  const url = fullUrl("/transit/locations", {
    query,
    results,
    provider,
  });
  const res = await fetch(url);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(j.detail ?? j.error ?? `search_${res.status}`);
  }
  const data = (await res.json()) as { stops?: TransitStopRef[] };
  return data.stops ?? [];
}

export async function transitFetchDepartures(stopId: string, provider: TransitProvider, max = 10): Promise<TransitDeparture[]> {
  const url = fullUrl(`/transit/stops/${encodeURIComponent(stopId)}/departures`, {
    provider,
    limit: max,
  });
  const res = await fetch(url);
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string; detail?: string };
    throw new Error(j.detail ?? j.error ?? `departures_${res.status}`);
  }
  const data = (await res.json()) as { departures?: TransitDeparture[] };
  return data.departures ?? [];
}
