import { API_BASE_URL } from "@/config";
function apiRoot() {
    return API_BASE_URL.replace(/\/$/, "");
}
function fullUrl(path, params) {
    const root = apiRoot();
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "")
            sp.set(k, String(v));
    }
    const q = sp.toString();
    const suffix = q ? `?${q}` : "";
    const p = path.startsWith("/") ? path : `/${path}`;
    if (root === "")
        return `${p}${suffix}`;
    if (root.startsWith("http"))
        return `${root}${p}${suffix}`;
    return `${root}${p}${suffix}`;
}
/** Nearby mit Backend-Fallback (BVG ↔ DB je nach Modus). */
export async function transitFetchNearby(latitude, longitude, results, mode) {
    const url = fullUrl("/transit/locations/nearby", {
        latitude,
        longitude,
        results,
        mode: mode === "auto" ? "auto" : mode,
    });
    const res = await fetch(url);
    if (!res.ok) {
        const j = (await res.json().catch(() => ({})));
        throw new Error(j.detail ?? j.error ?? `nearby_${res.status}`);
    }
    const data = (await res.json());
    return data.stops ?? [];
}
export async function transitSearchStops(query, results, provider) {
    const url = fullUrl("/transit/locations", {
        query,
        results,
        provider,
    });
    const res = await fetch(url);
    if (!res.ok) {
        const j = (await res.json().catch(() => ({})));
        throw new Error(j.detail ?? j.error ?? `search_${res.status}`);
    }
    const data = (await res.json());
    return data.stops ?? [];
}
export async function transitFetchDepartures(stopId, provider, max = 30) {
    const url = fullUrl(`/transit/stops/${encodeURIComponent(stopId)}/departures`, {
        provider,
        limit: max,
    });
    const res = await fetch(url);
    if (!res.ok) {
        const j = (await res.json().catch(() => ({})));
        throw new Error(j.detail ?? j.error ?? `departures_${res.status}`);
    }
    const data = (await res.json());
    return data.departures ?? [];
}
