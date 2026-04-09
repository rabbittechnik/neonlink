import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  Loader2,
  MapPin,
  Star,
  TrainFront,
  X,
} from "lucide-react";
import { GERMAN_TRANSIT_VERBUENDE } from "@/constants/germanTransitVerbuende";
import type { TransitDeparture, TransitLineType, TransitProvider, TransitStopRef } from "@/types/transit";
import {
  googleMapsAt,
  googleMapsSearchUrl,
  googleMapsTransitDirectionsTo,
  openStreetMapView,
} from "@/utils/mapsTransitLinks";
import {
  transitFetchDepartures,
  transitFetchNearby,
  transitSearchStops,
} from "@/utils/transitBackendClient";
import { providerForCoordinates } from "@/utils/transitGeo";

const LS_COLLAPSED = "neonlink.departures.collapsed";
const LS_FAVORITES = "neonlink.departures.favorites";
const LS_STOP = "neonlink.departures.selectedStop";
const LS_SOURCE_MODE = "neonlink.departures.sourceMode";
const LS_LAST_AUTO = "neonlink.departures.lastAutoProvider";

/** Technischer Startpunkt (DB), bis eine eigene Haltestelle gewählt wird — großer Fernbahnhof, bundesweit typisch. */
const DEFAULT_STOP: TransitStopRef = {
  id: "8000001",
  name: "Frankfurt (Main) Hbf",
  provider: "db",
};

export type SourceMode = "auto" | TransitProvider;

const SOURCE_MODE_ORDER = ["auto", "db", "bvg", "vbb", "hvv"] as const satisfies readonly SourceMode[];

function stripCitySuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}

function formatRouteParts(parts: string[]): string {
  if (!parts.length) return "—";
  return parts.join(" → ");
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function tryNormalizeStop(raw: unknown): TransitStopRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<TransitStopRef>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  const provider: TransitProvider =
    o.provider === "bvg" || o.provider === "db" || o.provider === "vbb" || o.provider === "hvv"
      ? o.provider
      : /^9\d{5,}/.test(o.id)
        ? "bvg"
        : "db";
  return {
    id: o.id,
    name: o.name,
    provider,
    distance: typeof o.distance === "number" ? o.distance : undefined,
  };
}

function loadInitialStop(): TransitStopRef {
  const raw = loadJson<unknown>(LS_STOP, undefined);
  return tryNormalizeStop(raw) ?? DEFAULT_STOP;
}

function loadFavorites(): TransitStopRef[] {
  const raw = loadJson<unknown[]>(LS_FAVORITES, []);
  if (!Array.isArray(raw)) return [];
  const out: TransitStopRef[] = [];
  for (const item of raw) {
    const s = tryNormalizeStop(item);
    if (s) out.push(s);
  }
  return out.slice(0, 12);
}

function loadSourceMode(): SourceMode {
  const v = loadJson<string | null>(LS_SOURCE_MODE, null);
  if (v === "auto" || v === "bvg" || v === "db" || v === "vbb" || v === "hvv") return v;
  return "auto";
}

function loadLastAuto(): TransitProvider | null {
  const v = loadJson<string | null>(LS_LAST_AUTO, null);
  return v === "bvg" || v === "db" || v === "vbb" || v === "hvv" ? v : null;
}

function lineBadgeClass(t: TransitLineType): string {
  switch (t) {
    case "SBAHN":
      return "bg-emerald-600/90 text-white border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.35)]";
    case "ICE":
      return "bg-red-600/95 text-white border-red-400/50 shadow-[0_0_14px_rgba(239,68,68,0.4)]";
    case "RE":
      return "bg-amber-400/95 text-neutral-900 border-amber-200/60 shadow-[0_0_12px_rgba(251,191,36,0.35)]";
    case "BUS":
      return "bg-blue-600/95 text-white border-blue-400/50 shadow-[0_0_12px_rgba(59,130,246,0.35)]";
    case "SUBWAY":
      return "bg-cyan-600/90 text-white border-cyan-400/45 shadow-[0_0_12px_rgba(34,211,238,0.3)]";
    case "TRAM":
      return "bg-orange-500/90 text-white border-orange-300/50 shadow-[0_0_12px_rgba(249,115,22,0.35)]";
    default:
      return "bg-white/15 text-white border-white/25";
  }
}

function minutesClass(m: number): string {
  if (m < 3) return "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]";
  if (m < 10) return "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]";
  if (m >= 120) return "text-sky-200/95 drop-shadow-[0_0_6px_rgba(125,211,252,0.2)]";
  return "text-white/95";
}

/** Anzeige „in 5 h“ statt „300 min“ — auch nächtliche Abfahrten lesbar. */
function formatDepartureWait(totalMin: number): { main: string; sub: string } {
  if (totalMin < 60) return { main: String(totalMin), sub: "min" };
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return {
    main: m === 0 ? `${h} h` : `${h} h ${m}`,
    sub: "ab jetzt",
  };
}

function sourceBadgeLabel(mode: SourceMode, lastAuto: TransitProvider | null, stop: TransitStopRef): string {
  if (mode === "bvg") return "BVG";
  if (mode === "db") return "DB";
  if (mode === "vbb") return "VBB";
  if (mode === "hvv") return "HVV";
  return lastAuto ? `Auto → ${lastAuto.toUpperCase()}` : `Auto → ${stop.provider.toUpperCase()}`;
}

function modeButtonLabel(m: SourceMode): string {
  if (m === "auto") return "Auto (Standort)";
  return m.toUpperCase();
}

/** Textsuche: Auto = DB (bundesweit); sonst gewählte HAFAS-Instanz. */
function searchProviderForMode(mode: SourceMode): TransitProvider {
  if (mode === "auto") return "db";
  return mode;
}

function searchPlaceholderForProvider(p: TransitProvider): string {
  switch (p) {
    case "bvg":
      return "Haltestelle suchen (Berlin / Brandenburg, BVG) …";
    case "vbb":
      return "Haltestelle suchen (Berlin / Brandenburg, VBB) …";
    case "hvv":
      return "Haltestelle suchen (Hamburg / HVV) …";
    default:
      return "Haltestelle oder Ort suchen (bundesweit, DB-HAFAS) …";
  }
}

export function DeparturesDashboard() {
  const [collapsed, setCollapsed] = useState(() => loadJson(LS_COLLAPSED, true));
  const [stop, setStop] = useState<TransitStopRef>(loadInitialStop);
  const [favorites, setFavorites] = useState<TransitStopRef[]>(loadFavorites);
  const [sourceMode, setSourceMode] = useState<SourceMode>(loadSourceMode);
  const [lastAutoProvider, setLastAutoProvider] = useState<TransitProvider | null>(loadLastAuto);
  const [rows, setRows] = useState<TransitDeparture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<TransitStopRef[]>([]);
  const [nearby, setNearby] = useState<TransitStopRef[]>([]);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  /** Bei fehlgeschlagenem „In der Nähe“: Karten um Standort (extern, kein API-Key). */
  const [geoMapsFallback, setGeoMapsFallback] = useState<{ lat: number; lon: number } | null>(null);
  const [searchFetchFailed, setSearchFetchFailed] = useState(false);
  const [detail, setDetail] = useState<TransitDeparture | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef(0);

  const searchProvider = useMemo(() => searchProviderForMode(sourceMode), [sourceMode]);

  useEffect(() => {
    localStorage.setItem(LS_COLLAPSED, JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem(LS_STOP, JSON.stringify(stop));
  }, [stop]);

  useEffect(() => {
    localStorage.setItem(LS_FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(LS_SOURCE_MODE, JSON.stringify(sourceMode));
  }, [sourceMode]);

  useEffect(() => {
    if (lastAutoProvider) localStorage.setItem(LS_LAST_AUTO, JSON.stringify(lastAutoProvider));
    else localStorage.removeItem(LS_LAST_AUTO);
  }, [lastAutoProvider]);

  const loadDepartures = useCallback(async () => {
    if (collapsed) return;
    setLoading(true);
    setError(null);
    tick.current += 1;
    const myTick = tick.current;
    try {
      const next = await transitFetchDepartures(stop.id, stop.provider, 30);
      if (myTick !== tick.current) return;
      setRows(next);
    } catch {
      if (myTick !== tick.current) return;
      setError(
        "Abfahrten konnten nicht geladen werden — NeonLink-Server oder HAFAS-Quelle (transport.rest) ggf. kurz nicht erreichbar."
      );
      setRows([]);
    } finally {
      if (myTick === tick.current) setLoading(false);
    }
  }, [stop.id, stop.provider, collapsed]);

  useEffect(() => {
    void loadDepartures();
  }, [loadDepartures]);

  useEffect(() => {
    if (collapsed) return;
    const id = window.setInterval(
      () => {
        void loadDepartures();
      },
      45_000 + Math.floor(Math.random() * 15_000)
    );
    return () => window.clearInterval(id);
  }, [collapsed, loadDepartures]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearchFetchFailed(false);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void transitSearchStops(q, 8, searchProvider)
        .then((list) => {
          setSuggestions(list);
          setSearchFetchFailed(false);
        })
        .catch(() => {
          setSuggestions([]);
          setSearchFetchFailed(true);
        });
    }, 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search, searchProvider]);

  const toggleFavorite = useCallback(() => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === stop.id && p.provider === stop.provider);
      if (exists) return prev.filter((p) => !(p.id === stop.id && p.provider === stop.provider));
      if (prev.length >= 12) return prev;
      return [...prev, stop];
    });
  }, [stop]);

  const isFavorite = useMemo(
    () => favorites.some((p) => p.id === stop.id && p.provider === stop.provider),
    [favorites, stop]
  );

  const requestNearby = useCallback(() => {
    setGeoStatus(null);
    setGeoMapsFallback(null);
    if (!navigator.geolocation) {
      setGeoStatus("Geolocation wird von diesem Browser nicht unterstützt.");
      return;
    }
    setGeoStatus("Standort wird ermittelt …");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const inferred = providerForCoordinates(lat, lon);
        setLastAutoProvider(inferred);
        try {
          const list = await transitFetchNearby(lat, lon, 8, sourceMode);
          setNearby(list);
          setGeoMapsFallback(null);
          const src = list[0]?.provider?.toUpperCase() ?? "—";
          setGeoStatus(
            list.length
              ? `${list.length} Haltestellen (zuerst ${src}${list.length > 1 ? ", ggf. Fallback" : ""}) · ${sourceMode === "auto" ? `Auto: ${inferred.toUpperCase()} (${Math.round(lat * 100) / 100}°, ${Math.round(lon * 100) / 100}°)` : `Manuelle Quelle: ${sourceMode.toUpperCase()}`}`
              : "Keine Haltestellen gefunden."
          );
          if (list[0]) setStop(list[0]);
        } catch {
          setGeoMapsFallback({ lat, lon });
          setGeoStatus(
            "Haltestellen-Suche fehlgeschlagen — NeonLink-Server oder HAFAS-Quelle ggf. nicht erreichbar. Unten kannst du den Bereich in Google Maps oder OpenStreetMap öffnen (ÖPNV-Layer bzw. Verbindungen dort prüfen)."
          );
          setNearby([]);
        }
      },
      () => {
        setGeoStatus("Standortzugriff verweigert oder nicht verfügbar.");
        setNearby([]);
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 60_000 }
    );
  }, [sourceMode]);

  return (
    <motion.section
      layout
      className="w-full min-w-0 rounded-2xl border border-cyan-500/20 bg-[#0a1628] overflow-hidden shrink-0"
      style={{
        boxShadow:
          "0 0 0 1px rgba(34,211,238,0.08), 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(8,47,73,0.35)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-[#0c2a4a] via-[#0a2240] to-[#0c2a4a] ring-1 ring-inset ring-cyan-400/25 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-cyan-300 via-cyan-400 to-emerald-400 shadow-[0_0_14px_rgba(34,211,238,0.55)]" aria-hidden />
          <TrainFront className="h-5 w-5 text-cyan-200 shrink-0 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/90 font-semibold">
                Verkehr · Abfahrten
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-400/55 bg-emerald-500/20 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
                Aktive Haltestelle
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 min-w-0 mt-0.5">
              <div className="text-sm sm:text-base font-bold text-white truncate leading-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]">
                {stop.name}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/35 bg-cyan-500/15 text-cyan-50 shrink-0">
                {stop.provider.toUpperCase()} · {sourceBadgeLabel(sourceMode, lastAutoProvider, stop)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            title={isFavorite ? "Aus Favoriten entfernen" : "Als Favorit speichern"}
            onClick={toggleFavorite}
            className={`rounded-lg p-2 border transition-colors ${
              isFavorite
                ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-300" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-2 border border-white/15 bg-white/5 text-white hover:bg-white/10 inline-flex items-center gap-1 text-xs"
          >
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            <span className="hidden sm:inline">{collapsed ? "Einblenden" : "Ausblenden"}</span>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-3 sm:px-4 py-3 space-y-3 border-b border-white/10 bg-[#071018]/80">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] text-white/50 uppercase tracking-wide">Datenquelle</span>
                {SOURCE_MODE_ORDER.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSourceMode(m)}
                    className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                      sourceMode === m
                        ? "border-cyan-400/60 bg-cyan-500/25 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                        : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    {modeButtonLabel(m)}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-white/45 leading-snug">
                <strong className="text-white/70">Auto (Standort):</strong> „In der Nähe“ per GPS — Hamburg → HVV,
                Großraum Berlin → VBB (Fallback BVG/DB), sonst DB. <strong className="text-white/70">Suche:</strong> im
                Auto-Modus immer <strong className="text-white/65">DB (bundesweit)</strong>. Manuell{" "}
                <strong className="text-white/65">BVG</strong>, <strong className="text-white/65">VBB</strong> oder{" "}
                <strong className="text-white/65">HVV</strong> für passende IDs. Abfahrten nutzen die Quelle der
                gewählten Haltestelle ({stop.provider.toUpperCase()}).{" "}
                <strong className="text-white/55">Hinweis:</strong> Die DB-Website nutzt andere, interne Dienste;
                NeonLink spricht die öffentliche <strong className="text-white/50">transport.rest</strong>-API an — die
                kann stärker ausgelastet sein (kurze Wiederholungen auf dem Server).
              </p>
              <details className="rounded-xl border border-white/10 bg-[#0a1628]/90 text-[10px] text-white/55">
                <summary className="cursor-pointer select-none px-3 py-2 text-white/75 font-medium hover:bg-white/[0.04] rounded-xl">
                  Regionale Tarifverbünde (Übersicht) — Koppelung zu Live-Daten
                </summary>
                <div className="px-3 pb-3 pt-0 space-y-2 max-h-72 overflow-y-auto [scrollbar-gutter:stable]">
                  {GERMAN_TRANSIT_VERBUENDE.map((r) => (
                    <div key={r.land} className="border-t border-white/10 first:border-0 first:pt-0 pt-2">
                      <div className="text-white/80 font-semibold">{r.land}</div>
                      <p className="text-white/45 leading-snug mt-0.5">{r.coverageHint}</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {r.verbuende.map((v) => (
                          <li key={`${r.land}-${v.kurz}`} className="text-white/60">
                            <div>
                              <span className="text-cyan-200/90 font-medium">{v.kurz}</span>
                              <span className="text-white/35"> · </span>
                              {v.name}
                            </div>
                            {v.liveAuskunft ? (
                              <p className="text-[9px] text-white/38 leading-snug mt-0.5 pl-0">{v.liveAuskunft}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex-1 min-w-0 relative">
                  <input
                    className="w-full rounded-xl border border-white/15 bg-[#0a1628] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder={searchPlaceholderForProvider(searchProvider)}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {suggestions.length > 0 ? (
                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-[#0f172a] shadow-xl">
                      {suggestions.map((s) => (
                        <button
                          key={`${s.provider}-${s.id}`}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0"
                          onClick={() => {
                            setStop(s);
                            setSearch("");
                            setSuggestions([]);
                          }}
                        >
                          <span>{s.name}</span>
                          <span className="ml-2 text-[10px] text-white/40">{s.provider.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={requestNearby}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/25 shrink-0"
                >
                  <MapPin className="h-4 w-4" />
                  In der Nähe
                </button>
              </div>
              {searchFetchFailed && search.trim().length >= 2 ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100/95 leading-snug space-y-2">
                  <p>
                    Haltestellen-Suche über den Server ist fehlgeschlagen (oft temporär: die Proxy-API{" "}
                    <span className="text-white/55">v6.db.transport.rest</span> ist nicht die gleiche Infrastruktur wie
                    bahn.de). Als Alternative kannst du dieselbe Suche in Google Maps öffnen — ohne API-Key, externer
                    Dienst.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={googleMapsSearchUrl(`${search.trim()} Haltestelle Deutschland`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-black/20 px-2.5 py-1.5 text-[11px] font-medium text-amber-50 hover:bg-black/35"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Google Maps
                    </a>
                    <a
                      href={googleMapsTransitDirectionsTo(search.trim())}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/85 hover:bg-white/10"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      ÖPNV-Richtung (Google)
                    </a>
                  </div>
                </div>
              ) : null}
              {favorites.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-white/50 uppercase tracking-wide w-full sm:w-auto sm:mr-1">
                    Favoriten
                  </span>
                  {favorites.map((f) => (
                    <button
                      key={`${f.provider}-${f.id}`}
                      type="button"
                      onClick={() => setStop(f)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                        f.id === stop.id && f.provider === stop.provider
                          ? "border-cyan-400/70 bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-400/30"
                          : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {f.id === stop.id && f.provider === stop.provider ? (
                        <Check className="h-3 w-3 text-emerald-300 shrink-0" aria-hidden />
                      ) : null}
                      {stripCitySuffix(f.name)}
                      <span className="text-white/35 ml-0.5">{f.provider.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {nearby.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-white/50 uppercase tracking-wide w-full sm:w-auto sm:mr-1">
                    Vorschläge
                  </span>
                  {nearby.map((n) => (
                    <button
                      key={`${n.provider}-${n.id}`}
                      type="button"
                      onClick={() => setStop(n)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                        n.id === stop.id && n.provider === stop.provider
                          ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-50 ring-1 ring-emerald-400/35"
                          : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {n.id === stop.id && n.provider === stop.provider ? (
                        <Check className="h-3 w-3 text-emerald-200 shrink-0" aria-hidden />
                      ) : null}
                      {stripCitySuffix(n.name)}
                      {typeof n.distance === "number" ? (
                        <span className="text-white/40"> · {n.distance} m</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {geoStatus ? <p className="text-[11px] text-cyan-100/80 leading-snug">{geoStatus}</p> : null}
              {geoMapsFallback ? (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <a
                    href={googleMapsAt(geoMapsFallback.lat, geoMapsFallback.lon, 16)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-1.5 text-[11px] font-medium text-cyan-100 hover:bg-cyan-500/25"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Google Maps (Standort)
                  </a>
                  <a
                    href={openStreetMapView(geoMapsFallback.lat, geoMapsFallback.lon, 16)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/80 hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    OpenStreetMap
                  </a>
                </div>
              ) : null}
            </div>

            <div className="relative">
              {loading ? (
                <div className="absolute right-3 top-2 z-10 flex items-center gap-1 text-[11px] text-cyan-200/80">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Aktualisiere …
                </div>
              ) : null}
              <div className="overflow-x-auto max-h-[min(50vh,26rem)] overflow-y-auto [scrollbar-gutter:stable]">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.15em] text-white/50 border-b border-white/15">
                      <th className="py-2 pl-3 sm:pl-4 pr-2 font-semibold w-[4.5rem]">Min</th>
                      <th className="py-2 px-2 font-semibold w-[5.5rem]">Linie</th>
                      <th className="py-2 px-2 font-semibold min-w-[8rem]">Route</th>
                      <th className="py-2 px-2 font-semibold">Ziel</th>
                      <th className="py-2 px-2 font-semibold w-[3.5rem] text-right">Gl.</th>
                      <th className="py-2 pl-2 pr-3 sm:pr-4 font-semibold w-[4.5rem] text-right">Zeit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {error ? (
                      <tr>
                        <td colSpan={6} className="py-8 px-4 text-center text-sm text-red-300/95">
                          <p>{error}</p>
                          <p className="mt-3 text-[11px] text-white/50 max-w-md mx-auto">
                            Alternativ: Verbindungen und Abfahrten in Google Maps prüfen (extern, kein NeonLink-Server).
                          </p>
                          <a
                            href={googleMapsTransitDirectionsTo(stop.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-[11px] text-cyan-200/90 hover:bg-white/10"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            ÖPNV zu „{stripCitySuffix(stop.name)}“
                          </a>
                        </td>
                      </tr>
                    ) : rows.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 px-4 text-center text-sm text-white/60">
                          <p>Keine Abfahrten in den nächsten 24&nbsp;Stunden laut dieser Abfrage — oder der Dienst liefert gerade keine weiteren Einträge.</p>
                          <p className="mt-2 text-[11px] text-white/40 max-w-md mx-auto">
                            Nachts kann die nächste Verbindung erst in vielen Stunden liegen; mit dem vergrößerten Zeitfenster sollten solche Abfahrten erscheinen, sofern HAFAS sie meldet.
                          </p>
                          <a
                            href={googleMapsTransitDirectionsTo(stop.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] text-cyan-200/85 hover:bg-white/10"
                          >
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            In Google Maps (ÖPNV) öffnen
                          </a>
                        </td>
                      </tr>
                    ) : (
                      rows.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          layout
                          initial={{ opacity: 0.35 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.25) }}
                          onClick={() => setDetail(r)}
                          className="border-b border-white/[0.07] hover:bg-white/[0.04] cursor-pointer group"
                        >
                          <td
                            className={`py-2.5 pl-3 sm:pl-4 pr-2 align-middle font-bold tabular-nums ${
                              r.minutes >= 60 ? "text-lg sm:text-xl" : "text-xl"
                            } ${minutesClass(r.minutes)}`}
                          >
                            {(() => {
                              const w = formatDepartureWait(r.minutes);
                              return (
                                <>
                                  {w.main}
                                  <span className="text-[10px] font-normal text-white/50 block leading-none mt-0.5">
                                    {w.sub}
                                  </span>
                                </>
                              );
                            })()}
                          </td>
                          <td className="py-2.5 px-2 align-middle">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold border ${lineBadgeClass(r.type)}`}
                            >
                              {r.line}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 align-middle text-[11px] sm:text-xs text-white/65 leading-snug max-w-[14rem] line-clamp-2">
                            {formatRouteParts(r.route)}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-sm sm:text-base font-bold text-white leading-tight group-hover:text-cyan-100 transition-colors">
                            {r.destination}
                          </td>
                          <td className="py-2.5 px-2 align-middle text-right text-sm text-white/90 tabular-nums">
                            {r.platform ?? "—"}
                          </td>
                          <td className="py-2.5 pl-2 pr-3 sm:pr-4 align-middle text-right">
                            <div className="text-sm font-semibold text-white tabular-nums">{r.time}</div>
                            {r.delayMinutes != null && r.delayMinutes > 0 ? (
                              <div className="text-[11px] font-semibold text-red-400">+{r.delayMinutes} min</div>
                            ) : null}
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-white/35 px-3 sm:px-4 py-2 border-t border-white/10 leading-relaxed">
                Abfrage über den <strong className="text-white/50">NeonLink-Server</strong> (HAFAS DB/BVG/VBB/HVV,
                Retry &amp; Fallback) · Abfahrtsfenster ca. <strong className="text-white/45">24&nbsp;Stunden</strong> ·
                GTFS-Realtime serverseitig vorbereitet · Aktualisierung ca. alle 45–60&nbsp;s · „In der Nähe“: GPS ·
                Karten-Links: Google/OpenStreetMap (extern).
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {detail ? (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setDetail(null)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl border border-white/15 bg-[#0f172a] p-5 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-2 mb-3">
              <div>
                <div className="text-xs text-white/50">Abfahrt ({stop.provider.toUpperCase()})</div>
                <div className="text-lg font-bold">{detail.line}</div>
                <div className="text-sm text-white/80 mt-1">{detail.destination}</div>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 hover:bg-white/10"
                onClick={() => setDetail(null)}
                aria-label="Schließen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-white/50">Abfahrt in</dt>
              <dd className="font-semibold">
                {(() => {
                  const w = formatDepartureWait(detail.minutes);
                  return (
                    <>
                      {w.main}{" "}
                      <span className="text-white/45 font-normal text-xs">({w.sub})</span>
                    </>
                  );
                })()}
              </dd>
              <dt className="text-white/50">Uhrzeit</dt>
              <dd className="font-mono">{detail.time}</dd>
              <dt className="text-white/50">Gleis</dt>
              <dd>{detail.platform ?? "—"}</dd>
              <dt className="text-white/50">Route</dt>
              <dd className="col-span-2 text-xs text-white/75">{formatRouteParts(detail.route)}</dd>
            </dl>
            <button
              type="button"
              className="mt-4 w-full rounded-xl border border-white/15 py-2 text-sm hover:bg-white/10"
              onClick={() => setDetail(null)}
            >
              Schließen
            </button>
          </motion.div>
        </div>
      ) : null}
    </motion.section>
  );
}
