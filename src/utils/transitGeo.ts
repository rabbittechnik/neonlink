import type { TransitProvider } from "@/types/transit";

const BERLIN_LAT = 52.516272;
const BERLIN_LON = 13.377722;
/** Großraum Berlin–Brandenburg (VBB) — km vom Berliner Zentrum */
const VBB_RADIUS_KM = 95;

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

function inHamburgMetropolitan(lat: number, lon: number): boolean {
  return lat >= 53.32 && lat <= 53.85 && lon >= 9.55 && lon <= 10.45;
}

/**
 * Grobe „beste“ Instanz für den Standort (für Auto-„In der Nähe“ / Anzeige).
 * Reihenfolge muss mit server/src/transitGeo.ts übereinstimmen.
 */
export function providerForCoordinates(latitude: number, longitude: number): TransitProvider {
  if (inHamburgMetropolitan(latitude, longitude)) return "hvv";
  const d = haversineKm(latitude, longitude, BERLIN_LAT, BERLIN_LON);
  if (d <= VBB_RADIUS_KM) return "vbb";
  return "db";
}
