/** Zentrum Berlin (Brandenburger Tor) — grobe Reichweite für VBB/BVG-HAFAS. */
const BERLIN_LAT = 52.516272;
const BERLIN_LON = 13.377722;
/** km — innerhalb wird BVG-API genutzt (Nahverkehr Berlin/Brandenburg). */
const BVG_RADIUS_KM = 95;
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/** Entscheidet zwischen BVG (Berlin/Brandenburg) und DB (bundesweit). */
export function providerForCoordinates(latitude, longitude) {
    const d = haversineKm(latitude, longitude, BERLIN_LAT, BERLIN_LON);
    return d <= BVG_RADIUS_KM ? "bvg" : "db";
}
