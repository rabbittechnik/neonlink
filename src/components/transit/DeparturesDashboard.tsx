import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Star,
  TrainFront,
  X,
} from "lucide-react";
import type { TransitDeparture, TransitLineType, TransitStopRef } from "@/types/transit";
import {
  bvgFetchDepartures,
  bvgFetchNearby,
  bvgSearchStops,
} from "@/utils/transitBvg";

const LS_COLLAPSED = "neonlink.departures.collapsed";
const LS_FAVORITES = "neonlink.departures.favorites";
const LS_STOP = "neonlink.departures.selectedStop";

const DEFAULT_STOP: TransitStopRef = {
  id: "900017101",
  name: "U Mehringdamm (Berlin)",
};

function stripCitySuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
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
  return "text-white/95";
}

export function DeparturesDashboard() {
  const [collapsed, setCollapsed] = useState(() => loadJson(LS_COLLAPSED, false));
  const [stop, setStop] = useState<TransitStopRef>(() => loadJson(LS_STOP, DEFAULT_STOP));
  const [favorites, setFavorites] = useState<TransitStopRef[]>(() => loadJson(LS_FAVORITES, []));
  const [rows, setRows] = useState<TransitDeparture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<TransitStopRef[]>([]);
  const [nearby, setNearby] = useState<TransitStopRef[]>([]);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [detail, setDetail] = useState<TransitDeparture | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef(0);

  useEffect(() => {
    localStorage.setItem(LS_COLLAPSED, JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem(LS_STOP, JSON.stringify(stop));
  }, [stop]);

  useEffect(() => {
    localStorage.setItem(LS_FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  const loadDepartures = useCallback(async () => {
    if (collapsed) return;
    setLoading(true);
    setError(null);
    tick.current += 1;
    const myTick = tick.current;
    try {
      const next = await bvgFetchDepartures(stop.id, 10);
      if (myTick !== tick.current) return;
      setRows(next);
    } catch {
      if (myTick !== tick.current) return;
      setError("Abfahrten konnten nicht geladen werden (Netzwerk oder API).");
      setRows([]);
    } finally {
      if (myTick === tick.current) setLoading(false);
    }
  }, [stop.id, collapsed]);

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
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void bvgSearchStops(q, 8)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 320);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [search]);

  const toggleFavorite = useCallback(() => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === stop.id);
      if (exists) return prev.filter((p) => p.id !== stop.id);
      if (prev.length >= 12) return prev;
      return [...prev, stop];
    });
  }, [stop]);

  const isFavorite = useMemo(() => favorites.some((p) => p.id === stop.id), [favorites, stop.id]);

  const requestNearby = useCallback(() => {
    setGeoStatus(null);
    if (!navigator.geolocation) {
      setGeoStatus("Geolocation wird von diesem Browser nicht unterstützt.");
      return;
    }
    setGeoStatus("Standort wird ermittelt …");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const list = await bvgFetchNearby(pos.coords.latitude, pos.coords.longitude, 8);
          setNearby(list);
          setGeoStatus(
            list.length
              ? `${list.length} Haltestellen in der Nähe (über GPS/WLAN-unterstützte Positionsbestimmung).`
              : "Keine Haltestellen gefunden."
          );
          if (list[0]) setStop(list[0]);
        } catch {
          setGeoStatus("Haltestellen-Suche fehlgeschlagen.");
          setNearby([]);
        }
      },
      () => {
        setGeoStatus("Standortzugriff verweigert oder nicht verfügbar.");
        setNearby([]);
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 60_000 }
    );
  }, []);

  return (
    <motion.section
      layout
      className="w-full min-w-0 rounded-2xl border border-cyan-500/20 bg-[#0a1628] overflow-hidden shrink-0"
      style={{
        boxShadow:
          "0 0 0 1px rgba(34,211,238,0.08), 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(8,47,73,0.35)",
      }}
    >
      {/* Kopfzeile — Bahnhof-Blau */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-[#0c2a4a] via-[#0a2240] to-[#0c2a4a]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TrainFront className="h-5 w-5 text-cyan-200 shrink-0 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-100/90 font-semibold">
              Verkehr · Abfahrten
            </div>
            <div className="text-sm sm:text-base font-bold text-white truncate leading-tight">
              {stop.name}
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
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <div className="flex-1 min-w-0 relative">
                  <input
                    className="w-full rounded-xl border border-white/15 bg-[#0a1628] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    placeholder="Haltestelle suchen (z. B. Alexanderplatz) …"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {suggestions.length > 0 ? (
                    <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-[#0f172a] shadow-xl">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0"
                          onClick={() => {
                            setStop(s);
                            setSearch("");
                            setSuggestions([]);
                          }}
                        >
                          {s.name}
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
              {favorites.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-white/50 uppercase tracking-wide w-full sm:w-auto sm:mr-1">
                    Favoriten
                  </span>
                  {favorites.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStop(f)}
                      className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                        f.id === stop.id
                          ? "border-cyan-400/60 bg-cyan-500/25 text-cyan-50"
                          : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {stripCitySuffix(f.name)}
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
                      key={n.id}
                      type="button"
                      onClick={() => setStop(n)}
                      className={`rounded-full px-2.5 py-1 text-[11px] border transition-colors ${
                        n.id === stop.id
                          ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-50"
                          : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {stripCitySuffix(n.name)}
                      {typeof n.distance === "number" ? (
                        <span className="text-white/40"> · {n.distance} m</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
              {geoStatus ? <p className="text-[11px] text-cyan-100/80 leading-snug">{geoStatus}</p> : null}
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
                          {error}
                        </td>
                      </tr>
                    ) : rows.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={6} className="py-8 px-4 text-center text-sm text-white/60">
                          Keine Abfahrten im gewählten Zeitraum.
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
                          <td className={`py-2.5 pl-3 sm:pl-4 pr-2 align-middle font-bold text-xl tabular-nums ${minutesClass(r.minutes)}`}>
                            {r.minutes}
                            <span className="text-[10px] font-normal text-white/50 block leading-none">min</span>
                          </td>
                          <td className="py-2.5 px-2 align-middle">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold border ${lineBadgeClass(r.type)}`}
                            >
                              {r.line}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 align-middle text-[11px] sm:text-xs text-white/65 leading-snug max-w-[14rem] line-clamp-2">
                            {r.route}
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
              <p className="text-[10px] text-white/35 px-3 sm:px-4 py-2 border-t border-white/10">
                Daten: BVG-Region (v6.bvg.transport.rest) · Live ca. alle 45–60 s · Kein WLAN-Hotspot-Zugriff im Browser —
                „In der Nähe“ nutzt GPS/Positionsdienst.
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
                <div className="text-xs text-white/50">Abfahrt</div>
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
              <dd className="font-semibold">{detail.minutes} min</dd>
              <dt className="text-white/50">Uhrzeit</dt>
              <dd className="font-mono">{detail.time}</dd>
              <dt className="text-white/50">Gleis</dt>
              <dd>{detail.platform ?? "—"}</dd>
              <dt className="text-white/50">Route</dt>
              <dd className="col-span-2 text-xs text-white/75">{detail.route}</dd>
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
