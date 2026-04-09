import type { Express } from "express";
import { nearbyChainForMode, type TransitProvider } from "./transitGeo.js";
import { fetchUpstreamJson } from "./transitUpstream.js";
import { normalizeDeparturesResponse, type HafasDeparture } from "./transitNormalize.js";

const BVG = "https://v6.bvg.transport.rest";
const DB = "https://v6.db.transport.rest";
const VBB = "https://v6.vbb.transport.rest";
const HVV = "https://v5.hvv.transport.rest";

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

function departuresDurationMinutes(base: string): string {
  if (base.includes("bvg") || base.includes("vbb") || base.includes("hvv")) return "90";
  return "120";
}

function departuresUrl(base: string, stopId: string, limit: number): string {
  const u = new URL(`${base}/stops/${encodeURIComponent(stopId)}/departures`);
  u.searchParams.set("duration", departuresDurationMinutes(base));
  u.searchParams.set("results", String(Math.max(limit, 15)));
  u.searchParams.set("remarks", "false");
  if (base.includes("db")) u.searchParams.set("language", "de");
  return u.toString();
}

function baseFor(p: TransitProvider): string {
  switch (p) {
    case "bvg":
      return BVG;
    case "vbb":
      return VBB;
    case "hvv":
      return HVV;
    default:
      return DB;
  }
}

function parseTransitProvider(raw: string | undefined, fallback: TransitProvider): TransitProvider {
  const s = (raw ?? "").toLowerCase().trim();
  if (s === "bvg" || s === "db" || s === "vbb" || s === "hvv") return s;
  return fallback;
}

/**
 * Öffentliche Transit-API (Proxy).
 * GTFS-Realtime: Merge-Hook in transitNormalize (noch ohne bundesweiten Feed).
 */
export function registerTransitRoutes(app: Express): void {
  app.get("/transit/info", (_req, res) => {
    res.json({
      ok: true,
      strategy: "hafas_transport_rest_proxy",
      sources: ["hafas_db", "hafas_bvg", "hafas_vbb", "hafas_hvv"],
      search:
        "Haltestellensuche pro gewaehlter Quelle ohne automatischen Wechsel — vermeidet falsche Treffer bei bundesweiter Suche.",
      notes:
        "Abfahrten: HAFAS transport.rest. Nah 'In der Naehe': Kette nach Geo (Hamburg→HVV, Berlin→VBB, sonst DB; Auto mit Fallback). Regionale Tarifverbünde oft in DB-HAFAS abgedeckt.",
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

    const chain = nearbyChainForMode(mode, lat, lon);
    let lastErr: unknown;
    for (const p of chain) {
      try {
        const url = nearbyUrl(baseFor(p), lat, lon, results);
        const data = await fetchUpstreamJson(url);
        const stops = mapStopRows(data, p);
        if (stops.length > 0) {
          return res.json({ provider: p, tried: chain, stops });
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

    const provider = parseTransitProvider(providerRaw, "db");
    try {
      const url = searchUrl(baseFor(provider), query, results);
      const data = await fetchUpstreamJson(url);
      const stops = mapStopRows(data, provider);
      return res.json({ provider, stops });
    } catch (e) {
      return res.status(502).json({
        error: "search_upstream_failed",
        provider,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  });

  app.get("/transit/stops/:stopId/departures", async (req, res) => {
    const stopId = req.params.stopId;
    const providerRaw = typeof req.query.provider === "string" ? req.query.provider : "";
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    if (!stopId) return res.status(400).json({ error: "stop_id_required" });
    const provider = parseTransitProvider(providerRaw, "db");

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
