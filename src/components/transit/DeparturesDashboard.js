import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Check, Loader2, MapPin, Star, TrainFront, X, } from "lucide-react";
import { GERMAN_TRANSIT_VERBUENDE } from "@/constants/germanTransitVerbuende";
import { transitFetchDepartures, transitFetchNearby, transitSearchStops, } from "@/utils/transitBackendClient";
import { providerForCoordinates } from "@/utils/transitGeo";
const LS_COLLAPSED = "neonlink.departures.collapsed";
const LS_FAVORITES = "neonlink.departures.favorites";
const LS_STOP = "neonlink.departures.selectedStop";
const LS_SOURCE_MODE = "neonlink.departures.sourceMode";
const LS_LAST_AUTO = "neonlink.departures.lastAutoProvider";
/** Technischer Startpunkt (DB), bis eine eigene Haltestelle gewählt wird — großer Fernbahnhof, bundesweit typisch. */
const DEFAULT_STOP = {
    id: "8000001",
    name: "Frankfurt (Main) Hbf",
    provider: "db",
};
const SOURCE_MODE_ORDER = ["auto", "db", "bvg", "vbb", "hvv"];
function stripCitySuffix(name) {
    return name.replace(/\s*\([^)]*\)\s*$/u, "").trim();
}
function formatRouteParts(parts) {
    if (!parts.length)
        return "—";
    return parts.join(" → ");
}
function loadJson(key, fallback) {
    try {
        const s = localStorage.getItem(key);
        if (!s)
            return fallback;
        return JSON.parse(s);
    }
    catch {
        return fallback;
    }
}
function tryNormalizeStop(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const o = raw;
    if (typeof o.id !== "string" || typeof o.name !== "string")
        return null;
    const provider = o.provider === "bvg" || o.provider === "db" || o.provider === "vbb" || o.provider === "hvv"
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
function loadInitialStop() {
    const raw = loadJson(LS_STOP, undefined);
    return tryNormalizeStop(raw) ?? DEFAULT_STOP;
}
function loadFavorites() {
    const raw = loadJson(LS_FAVORITES, []);
    if (!Array.isArray(raw))
        return [];
    const out = [];
    for (const item of raw) {
        const s = tryNormalizeStop(item);
        if (s)
            out.push(s);
    }
    return out.slice(0, 12);
}
function loadSourceMode() {
    const v = loadJson(LS_SOURCE_MODE, null);
    if (v === "auto" || v === "bvg" || v === "db" || v === "vbb" || v === "hvv")
        return v;
    return "auto";
}
function loadLastAuto() {
    const v = loadJson(LS_LAST_AUTO, null);
    return v === "bvg" || v === "db" || v === "vbb" || v === "hvv" ? v : null;
}
function lineBadgeClass(t) {
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
function minutesClass(m) {
    if (m < 3)
        return "text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]";
    if (m < 10)
        return "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.35)]";
    return "text-white/95";
}
function sourceBadgeLabel(mode, lastAuto, stop) {
    if (mode === "bvg")
        return "BVG";
    if (mode === "db")
        return "DB";
    if (mode === "vbb")
        return "VBB";
    if (mode === "hvv")
        return "HVV";
    return lastAuto ? `Auto → ${lastAuto.toUpperCase()}` : `Auto → ${stop.provider.toUpperCase()}`;
}
function modeButtonLabel(m) {
    if (m === "auto")
        return "Auto (Standort)";
    return m.toUpperCase();
}
/** Textsuche: Auto = DB (bundesweit); sonst gewählte HAFAS-Instanz. */
function searchProviderForMode(mode) {
    if (mode === "auto")
        return "db";
    return mode;
}
function searchPlaceholderForProvider(p) {
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
    const [stop, setStop] = useState(loadInitialStop);
    const [favorites, setFavorites] = useState(loadFavorites);
    const [sourceMode, setSourceMode] = useState(loadSourceMode);
    const [lastAutoProvider, setLastAutoProvider] = useState(loadLastAuto);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [suggestions, setSuggestions] = useState([]);
    const [nearby, setNearby] = useState([]);
    const [geoStatus, setGeoStatus] = useState(null);
    const [detail, setDetail] = useState(null);
    const searchTimer = useRef(null);
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
        if (lastAutoProvider)
            localStorage.setItem(LS_LAST_AUTO, JSON.stringify(lastAutoProvider));
        else
            localStorage.removeItem(LS_LAST_AUTO);
    }, [lastAutoProvider]);
    const loadDepartures = useCallback(async () => {
        if (collapsed)
            return;
        setLoading(true);
        setError(null);
        tick.current += 1;
        const myTick = tick.current;
        try {
            const next = await transitFetchDepartures(stop.id, stop.provider, 10);
            if (myTick !== tick.current)
                return;
            setRows(next);
        }
        catch {
            if (myTick !== tick.current)
                return;
            setError("Abfahrten konnten nicht geladen werden — NeonLink-Server oder HAFAS-Quelle (transport.rest) ggf. kurz nicht erreichbar.");
            setRows([]);
        }
        finally {
            if (myTick === tick.current)
                setLoading(false);
        }
    }, [stop.id, stop.provider, collapsed]);
    useEffect(() => {
        void loadDepartures();
    }, [loadDepartures]);
    useEffect(() => {
        if (collapsed)
            return;
        const id = window.setInterval(() => {
            void loadDepartures();
        }, 45000 + Math.floor(Math.random() * 15000));
        return () => window.clearInterval(id);
    }, [collapsed, loadDepartures]);
    useEffect(() => {
        const q = search.trim();
        if (q.length < 2) {
            setSuggestions([]);
            return;
        }
        if (searchTimer.current)
            clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            void transitSearchStops(q, 8, searchProvider)
                .then(setSuggestions)
                .catch(() => setSuggestions([]));
        }, 320);
        return () => {
            if (searchTimer.current)
                clearTimeout(searchTimer.current);
        };
    }, [search, searchProvider]);
    const toggleFavorite = useCallback(() => {
        setFavorites((prev) => {
            const exists = prev.some((p) => p.id === stop.id && p.provider === stop.provider);
            if (exists)
                return prev.filter((p) => !(p.id === stop.id && p.provider === stop.provider));
            if (prev.length >= 12)
                return prev;
            return [...prev, stop];
        });
    }, [stop]);
    const isFavorite = useMemo(() => favorites.some((p) => p.id === stop.id && p.provider === stop.provider), [favorites, stop]);
    const requestNearby = useCallback(() => {
        setGeoStatus(null);
        if (!navigator.geolocation) {
            setGeoStatus("Geolocation wird von diesem Browser nicht unterstützt.");
            return;
        }
        setGeoStatus("Standort wird ermittelt …");
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            const inferred = providerForCoordinates(lat, lon);
            setLastAutoProvider(inferred);
            try {
                const list = await transitFetchNearby(lat, lon, 8, sourceMode);
                setNearby(list);
                const src = list[0]?.provider?.toUpperCase() ?? "—";
                setGeoStatus(list.length
                    ? `${list.length} Haltestellen (zuerst ${src}${list.length > 1 ? ", ggf. Fallback" : ""}) · ${sourceMode === "auto" ? `Auto: ${inferred.toUpperCase()} (${Math.round(lat * 100) / 100}°, ${Math.round(lon * 100) / 100}°)` : `Manuelle Quelle: ${sourceMode.toUpperCase()}`}`
                    : "Keine Haltestellen gefunden.");
                if (list[0])
                    setStop(list[0]);
            }
            catch {
                setGeoStatus("Haltestellen-Suche fehlgeschlagen — NeonLink-Server oder HAFAS-Quelle ggf. nicht erreichbar.");
                setNearby([]);
            }
        }, () => {
            setGeoStatus("Standortzugriff verweigert oder nicht verfügbar.");
            setNearby([]);
        }, { enableHighAccuracy: true, timeout: 14000, maximumAge: 60000 });
    }, [sourceMode]);
    return (_jsxs(motion.section, { layout: true, className: "w-full min-w-0 rounded-2xl border border-cyan-500/20 bg-[#0a1628] overflow-hidden shrink-0", style: {
            boxShadow: "0 0 0 1px rgba(34,211,238,0.08), 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 40px rgba(8,47,73,0.35)",
        }, children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-[#0c2a4a] via-[#0a2240] to-[#0c2a4a] ring-1 ring-inset ring-cyan-400/25 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]", children: [_jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [_jsx("div", { className: "flex h-9 w-1 shrink-0 rounded-full bg-gradient-to-b from-cyan-300 via-cyan-400 to-emerald-400 shadow-[0_0_14px_rgba(34,211,238,0.55)]", "aria-hidden": true }), _jsx(TrainFront, { className: "h-5 w-5 text-cyan-200 shrink-0 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]" }), _jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsx("div", { className: "text-[10px] uppercase tracking-[0.2em] text-cyan-100/90 font-semibold", children: "Verkehr \u00B7 Abfahrten" }), _jsx("span", { className: "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-emerald-400/55 bg-emerald-500/20 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.25)]", children: "Aktive Haltestelle" })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 min-w-0 mt-0.5", children: [_jsx("div", { className: "text-sm sm:text-base font-bold text-white truncate leading-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]", children: stop.name }), _jsxs("span", { className: "text-[10px] px-2 py-0.5 rounded-full border border-cyan-400/35 bg-cyan-500/15 text-cyan-50 shrink-0", children: [stop.provider.toUpperCase(), " \u00B7 ", sourceBadgeLabel(sourceMode, lastAutoProvider, stop)] })] })] })] }), _jsxs("div", { className: "flex items-center gap-1.5 shrink-0 ml-auto", children: [_jsx("button", { type: "button", title: isFavorite ? "Aus Favoriten entfernen" : "Als Favorit speichern", onClick: toggleFavorite, className: `rounded-lg p-2 border transition-colors ${isFavorite
                                    ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"}`, children: _jsx(Star, { className: `h-4 w-4 ${isFavorite ? "fill-amber-300" : ""}` }) }), _jsxs("button", { type: "button", onClick: () => setCollapsed((c) => !c), className: "rounded-lg p-2 border border-white/15 bg-white/5 text-white hover:bg-white/10 inline-flex items-center gap-1 text-xs", children: [collapsed ? _jsx(ChevronDown, { className: "h-4 w-4" }) : _jsx(ChevronUp, { className: "h-4 w-4" }), _jsx("span", { className: "hidden sm:inline", children: collapsed ? "Einblenden" : "Ausblenden" })] })] })] }), _jsx(AnimatePresence, { initial: false, children: !collapsed ? (_jsxs(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: "auto", opacity: 1 }, exit: { height: 0, opacity: 0 }, transition: { duration: 0.22 }, className: "overflow-hidden", children: [_jsxs("div", { className: "px-3 sm:px-4 py-3 space-y-3 border-b border-white/10 bg-[#071018]/80", children: [_jsxs("div", { className: "flex flex-wrap gap-2 items-center", children: [_jsx("span", { className: "text-[10px] text-white/50 uppercase tracking-wide", children: "Datenquelle" }), SOURCE_MODE_ORDER.map((m) => (_jsx("button", { type: "button", onClick: () => setSourceMode(m), className: `rounded-full px-2.5 py-1 text-[11px] border transition-colors ${sourceMode === m
                                                ? "border-cyan-400/60 bg-cyan-500/25 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                                                : "border-white/15 bg-white/5 text-white/75 hover:bg-white/10"}`, children: modeButtonLabel(m) }, m)))] }), _jsxs("p", { className: "text-[10px] text-white/45 leading-snug", children: [_jsx("strong", { className: "text-white/70", children: "Auto (Standort):" }), " \u201EIn der N\u00E4he\u201C per GPS \u2014 Hamburg \u2192 HVV, Gro\u00DFraum Berlin \u2192 VBB (Fallback BVG/DB), sonst DB. ", _jsx("strong", { className: "text-white/70", children: "Suche:" }), " im Auto-Modus immer ", _jsx("strong", { className: "text-white/65", children: "DB (bundesweit)" }), ". Manuell", " ", _jsx("strong", { className: "text-white/65", children: "BVG" }), ", ", _jsx("strong", { className: "text-white/65", children: "VBB" }), " oder", " ", _jsx("strong", { className: "text-white/65", children: "HVV" }), " f\u00FCr passende IDs. Abfahrten nutzen die Quelle der gew\u00E4hlten Haltestelle (", stop.provider.toUpperCase(), ")."] }), _jsxs("details", { className: "rounded-xl border border-white/10 bg-[#0a1628]/90 text-[10px] text-white/55", children: [_jsx("summary", { className: "cursor-pointer select-none px-3 py-2 text-white/75 font-medium hover:bg-white/[0.04] rounded-xl", children: "Regionale Tarifverb\u00FCnde (\u00DCbersicht) \u2014 Koppelung zu Live-Daten" }), _jsx("div", { className: "px-3 pb-3 pt-0 space-y-2 max-h-48 overflow-y-auto [scrollbar-gutter:stable]", children: GERMAN_TRANSIT_VERBUENDE.map((r) => (_jsxs("div", { className: "border-t border-white/10 first:border-0 first:pt-0 pt-2", children: [_jsx("div", { className: "text-white/80 font-semibold", children: r.land }), _jsx("p", { className: "text-white/45 leading-snug mt-0.5", children: r.coverageHint }), _jsx("ul", { className: "mt-1 flex flex-wrap gap-x-2 gap-y-0.5", children: r.verbuende.map((v) => (_jsxs("li", { className: "text-white/60", children: [_jsx("span", { className: "text-cyan-200/90 font-medium", children: v.kurz }), _jsx("span", { className: "text-white/35", children: " \u00B7 " }), v.name] }, `${r.land}-${v.kurz}`))) })] }, r.land))) })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-2 sm:items-center", children: [_jsxs("div", { className: "flex-1 min-w-0 relative", children: [_jsx("input", { className: "w-full rounded-xl border border-white/15 bg-[#0a1628] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/40", placeholder: searchPlaceholderForProvider(searchProvider), value: search, onChange: (e) => setSearch(e.target.value) }), suggestions.length > 0 ? (_jsx("div", { className: "absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-white/15 bg-[#0f172a] shadow-xl", children: suggestions.map((s) => (_jsxs("button", { type: "button", className: "w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0", onClick: () => {
                                                            setStop(s);
                                                            setSearch("");
                                                            setSuggestions([]);
                                                        }, children: [_jsx("span", { children: s.name }), _jsx("span", { className: "ml-2 text-[10px] text-white/40", children: s.provider.toUpperCase() })] }, `${s.provider}-${s.id}`))) })) : null] }), _jsxs("button", { type: "button", onClick: requestNearby, className: "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-500/25 shrink-0", children: [_jsx(MapPin, { className: "h-4 w-4" }), "In der N\u00E4he"] })] }), favorites.length > 0 ? (_jsxs("div", { className: "flex flex-wrap gap-1.5", children: [_jsx("span", { className: "text-[10px] text-white/50 uppercase tracking-wide w-full sm:w-auto sm:mr-1", children: "Favoriten" }), favorites.map((f) => (_jsxs("button", { type: "button", onClick: () => setStop(f), className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border transition-colors ${f.id === stop.id && f.provider === stop.provider
                                                ? "border-cyan-400/70 bg-cyan-500/25 text-cyan-50 ring-1 ring-cyan-400/30"
                                                : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"}`, children: [f.id === stop.id && f.provider === stop.provider ? (_jsx(Check, { className: "h-3 w-3 text-emerald-300 shrink-0", "aria-hidden": true })) : null, stripCitySuffix(f.name), _jsx("span", { className: "text-white/35 ml-0.5", children: f.provider.toUpperCase() })] }, `${f.provider}-${f.id}`)))] })) : null, nearby.length > 0 ? (_jsxs("div", { className: "flex flex-wrap gap-1.5", children: [_jsx("span", { className: "text-[10px] text-white/50 uppercase tracking-wide w-full sm:w-auto sm:mr-1", children: "Vorschl\u00E4ge" }), nearby.map((n) => (_jsxs("button", { type: "button", onClick: () => setStop(n), className: `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] border transition-colors ${n.id === stop.id && n.provider === stop.provider
                                                ? "border-emerald-400/60 bg-emerald-500/25 text-emerald-50 ring-1 ring-emerald-400/35"
                                                : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"}`, children: [n.id === stop.id && n.provider === stop.provider ? (_jsx(Check, { className: "h-3 w-3 text-emerald-200 shrink-0", "aria-hidden": true })) : null, stripCitySuffix(n.name), typeof n.distance === "number" ? (_jsxs("span", { className: "text-white/40", children: [" \u00B7 ", n.distance, " m"] })) : null] }, `${n.provider}-${n.id}`)))] })) : null, geoStatus ? _jsx("p", { className: "text-[11px] text-cyan-100/80 leading-snug", children: geoStatus }) : null] }), _jsxs("div", { className: "relative", children: [loading ? (_jsxs("div", { className: "absolute right-3 top-2 z-10 flex items-center gap-1 text-[11px] text-cyan-200/80", children: [_jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }), "Aktualisiere \u2026"] })) : null, _jsx("div", { className: "overflow-x-auto max-h-[min(50vh,26rem)] overflow-y-auto [scrollbar-gutter:stable]", children: _jsxs("table", { className: "w-full min-w-[640px] text-left border-collapse", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-[10px] uppercase tracking-[0.15em] text-white/50 border-b border-white/15", children: [_jsx("th", { className: "py-2 pl-3 sm:pl-4 pr-2 font-semibold w-[4.5rem]", children: "Min" }), _jsx("th", { className: "py-2 px-2 font-semibold w-[5.5rem]", children: "Linie" }), _jsx("th", { className: "py-2 px-2 font-semibold min-w-[8rem]", children: "Route" }), _jsx("th", { className: "py-2 px-2 font-semibold", children: "Ziel" }), _jsx("th", { className: "py-2 px-2 font-semibold w-[3.5rem] text-right", children: "Gl." }), _jsx("th", { className: "py-2 pl-2 pr-3 sm:pr-4 font-semibold w-[4.5rem] text-right", children: "Zeit" })] }) }), _jsx("tbody", { children: error ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "py-8 px-4 text-center text-sm text-red-300/95", children: error }) })) : rows.length === 0 && !loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "py-8 px-4 text-center text-sm text-white/60", children: "Keine Abfahrten im gew\u00E4hlten Zeitraum." }) })) : (rows.map((r, i) => (_jsxs(motion.tr, { layout: true, initial: { opacity: 0.35 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay: Math.min(i * 0.03, 0.25) }, onClick: () => setDetail(r), className: "border-b border-white/[0.07] hover:bg-white/[0.04] cursor-pointer group", children: [_jsxs("td", { className: `py-2.5 pl-3 sm:pl-4 pr-2 align-middle font-bold text-xl tabular-nums ${minutesClass(r.minutes)}`, children: [r.minutes, _jsx("span", { className: "text-[10px] font-normal text-white/50 block leading-none", children: "min" })] }), _jsx("td", { className: "py-2.5 px-2 align-middle", children: _jsx("span", { className: `inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold border ${lineBadgeClass(r.type)}`, children: r.line }) }), _jsx("td", { className: "py-2.5 px-2 align-middle text-[11px] sm:text-xs text-white/65 leading-snug max-w-[14rem] line-clamp-2", children: formatRouteParts(r.route) }), _jsx("td", { className: "py-2.5 px-2 align-middle text-sm sm:text-base font-bold text-white leading-tight group-hover:text-cyan-100 transition-colors", children: r.destination }), _jsx("td", { className: "py-2.5 px-2 align-middle text-right text-sm text-white/90 tabular-nums", children: r.platform ?? "—" }), _jsxs("td", { className: "py-2.5 pl-2 pr-3 sm:pr-4 align-middle text-right", children: [_jsx("div", { className: "text-sm font-semibold text-white tabular-nums", children: r.time }), r.delayMinutes != null && r.delayMinutes > 0 ? (_jsxs("div", { className: "text-[11px] font-semibold text-red-400", children: ["+", r.delayMinutes, " min"] })) : null] })] }, r.id)))) })] }) }), _jsxs("p", { className: "text-[10px] text-white/35 px-3 sm:px-4 py-2 border-t border-white/10 leading-relaxed", children: ["Abfrage \u00FCber den ", _jsx("strong", { className: "text-white/50", children: "NeonLink-Server" }), " (HAFAS DB/BVG/VBB/HVV, Retry & Fallback) \u00B7 GTFS-Realtime-Aufschaltung serverseitig vorbereitet \u00B7 Aktualisierung ca. alle 45\u201360\u00A0s \u00B7 \u201EIn der N\u00E4he\u201C: GPS."] })] })] })) : null }), detail ? (_jsx("div", { className: "fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm", role: "dialog", "aria-modal": "true", onClick: () => setDetail(null), children: _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "w-full max-w-md rounded-2xl border border-white/15 bg-[#0f172a] p-5 text-white shadow-2xl", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex justify-between items-start gap-2 mb-3", children: [_jsxs("div", { children: [_jsxs("div", { className: "text-xs text-white/50", children: ["Abfahrt (", stop.provider.toUpperCase(), ")"] }), _jsx("div", { className: "text-lg font-bold", children: detail.line }), _jsx("div", { className: "text-sm text-white/80 mt-1", children: detail.destination })] }), _jsx("button", { type: "button", className: "rounded-lg p-2 hover:bg-white/10", onClick: () => setDetail(null), "aria-label": "Schlie\u00DFen", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("dl", { className: "grid grid-cols-2 gap-2 text-sm", children: [_jsx("dt", { className: "text-white/50", children: "Abfahrt in" }), _jsxs("dd", { className: "font-semibold", children: [detail.minutes, " min"] }), _jsx("dt", { className: "text-white/50", children: "Uhrzeit" }), _jsx("dd", { className: "font-mono", children: detail.time }), _jsx("dt", { className: "text-white/50", children: "Gleis" }), _jsx("dd", { children: detail.platform ?? "—" }), _jsx("dt", { className: "text-white/50", children: "Route" }), _jsx("dd", { className: "col-span-2 text-xs text-white/75", children: formatRouteParts(detail.route) })] }), _jsx("button", { type: "button", className: "mt-4 w-full rounded-xl border border-white/15 py-2 text-sm hover:bg-white/10", onClick: () => setDetail(null), children: "Schlie\u00DFen" })] }) })) : null] }));
}
