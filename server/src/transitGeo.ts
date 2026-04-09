/** Gleiche Logik wie Frontend: Berlin-Zentrum + Radius → BVG vs DB. */

export type TransitProvider = "bvg" | "db";

const BERLIN_LAT = 52.516272;
const BERLIN_LON = 13.377722;
const BVG_RADIUS_KM = 95;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function providerForCoordinates(latitude: number, longitude: number): TransitProvider {
  const d = haversineKm(latitude, longitude, BERLIN_LAT, BERLIN_LON);
  return d <= BVG_RADIUS_KM ? "bvg" : "db";
}

export function otherProvider(p: TransitProvider): TransitProvider {
  return p === "bvg" ? "db" : "bvg";
}
