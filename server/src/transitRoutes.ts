import type { Express } from "express";
import { otherProvider, providerForCoordinates, type TransitProvider } from "./transitGeo.js";
import { fetchUpstreamJson } from "./transitUpstream.js";
import { normalizeDeparturesResponse, type HafasDeparture } from "./transitNormalize.js";

const BVG = "https://v6.bvg.transport.rest";
const DB = "https://v6.db.transport.rest";

type StopRow = {
  type?: string;
  id?: string;
  name?: string;
  distance?: number;
};

function mapStopRows(data: unknown, provider: TransitProvider) {
  if (!Array.isArray(data)) return [];
  return (data as StopRow[])
    .filter((x) => x.type === "stop" && x.id && x.name)
    .map((x) => ({
      id: x.id as string,
      name: x.name as string,
      provider,
      distance: typeof x.distance === "number" ? x.distance : undefined,
    }));
}

function nearbyUrl(base: string, lat: number, lon: number, results: number): string {
  const u = new URL(`${base}/locations/nearby`);
  u.searchParams.set("latitude", String(lat));
  u.searchParams.set("longitude", String(lon));
  u.searchParams.set("results", String(results));
  u.searchParams.set("stops", "true");
  u.searchParams.set("poi", "false");
  return u.toString();
}

function searchUrl(base: string, query: string, results: number): string {
  const u = new URL(`${base}/locations`);
  u.searchParams.set("query", query);
  u.searchParams.set("results", String(results));
  u.searchParams.set("poi", "false");
  u.searchParams.set("addresses", "false");
  return u.toString();
}

function departuresUrl(base: string, stopId: string, limit: number): string {
  const u = new URL(`${base}/stops/${encodeURIComponent(stopId)}/departures`);
  u.searchParams.set("duration", base.includes("bvg") ? "90" : "120");
  u.searchParams.set("results", String(Math.max(limit, 15)));
  u.searchParams.set("remarks", "false");
  if (base.includes("db")) u.searchParams.set("language", "de");
  return u.toString();
}

function baseFor(p: TransitProvider): string {
  return p === "bvg" ? BVG : DB;
}

/**
 * Öffentliche Transit-API (Proxy + Fallback).
 * GTFS-Realtime: Merge-Hook in transitNormalize (noch ohne bundesweiten Feed).
 */
export function registerTransitRoutes(app: Express): void {
  app.get("/transit/info", (_req, res) => {
    res.json({
      ok: true,
      strategy: "hafas_transport_rest_with_fallback",
      sources: ["hafas_bvg", "hafas_db"],
      notes:
        "Abfahrten: HAFAS (transport.rest). GTFS-RT-Overlay und regionale APIs können serverseitig ergänzt werden.",
    });
  });

  app.get("/transit/locations/nearby", async (req, res) => {
    const lat = Number(req.query.latitude);
    const lon = Number(req.query.longitude);
    const results = Math.min(20, Math.max(1, Number(req.query.results) || 8));
    const mode = typeof req.query.mode === "string" ? req.query.mode : "auto";
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "latitude_and_longitude_required" });
    }

    let primary: TransitProvider;
    let secondary: TransitProvider;
    if (mode === "bvg") {
      primary = "bvg";
      secondary = "db";
    } else if (mode === "db") {
      primary = "db";
      secondary = "bvg";
    } else {
      primary = providerForCoordinates(lat, lon);
      secondary = otherProvider(primary);
    }

    const order = [primary, secondary];
    let lastErr: unknown;
    for (const p of order) {
      try {
        const url = nearbyUrl(baseFor(p), lat, lon, results);
        const data = await fetchUpstreamJson(url);
        const stops = mapStopRows(data, p);
        if (stops.length > 0) {
          return res.json({ provider: p, tried: order, stops });
        }
      } catch (e) {
        lastErr = e;
      }
    }
    return res.status(502).json({
      error: "nearby_all_sources_failed",
      detail: lastErr instanceof Error ? lastErr.message : String(lastErr),
    });
  });

  app.get("/transit/locations", async (req, res) => {
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const results = Math.min(20, Math.max(1, Number(req.query.results) || 8));
    const providerRaw = typeof req.query.provider === "string" ? req.query.provider : "db";
    if (query.length < 2) {
      return res.status(400).json({ error: "query_min_length_2" });
    }

    const primary: TransitProvider = providerRaw === "bvg" ? "bvg" : "db";
    const secondary = otherProvider(primary);
    const order = [primary, secondary];
    let lastErr: unknown;
    for (const p of order) {
      try {
        const url = searchUrl(baseFor(p), query, results);
        const data = await fetchUpstreamJson(url);
        const stops = mapStopRows(data, p);
        if (stops.length > 0) {
          return res.json({ provider: p, tried: order, stops });
        }
      } catch (e) {
        lastErr = e;
      }
    }
    return res.status(502).json({
      error: "search_all_sources_failed",
      detail: lastErr instanceof Error ? lastErr.message : String(lastErr),
    });
  });

  app.get("/transit/stops/:stopId/departures", async (req, res) => {
    const stopId = req.params.stopId;
    const providerRaw = typeof req.query.provider === "string" ? req.query.provider : "";
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    if (!stopId) return res.status(400).json({ error: "stop_id_required" });
    const provider: TransitProvider = providerRaw === "bvg" ? "bvg" : providerRaw === "db" ? "db" : "db";

    try {
      const url = departuresUrl(baseFor(provider), stopId, limit);
      const raw = (await fetchUpstreamJson(url)) as { departures?: HafasDeparture[] };
      let deps = normalizeDeparturesResponse(raw, `hafas_${provider}`);
      deps = deps.slice(0, limit);
      return res.json({
        provider,
        sources: [`hafas_${provider}`],
        departures: deps,
      });
    } catch (e) {
      return res.status(502).json({
        error: "departures_upstream_failed",
        provider,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });
}
