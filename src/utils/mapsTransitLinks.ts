/** Öffnet externe Karten (kein API-Key). Für Fallback, wenn HAFAS/Server nicht erreichbar ist. */

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** ÖPNV-Richtung zur gewählten Station (Google zeigt Abfahrtsoptionen im Verbindungsdialog). */
export function googleMapsTransitDirectionsTo(destinationName: string): string {
  return `https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=${encodeURIComponent(destinationName)}`;
}

export function googleMapsAt(latitude: number, longitude: number, zoom = 16): string {
  return `https://www.google.com/maps/@${latitude},${longitude},${zoom}z`;
}

export function openStreetMapView(latitude: number, longitude: number, zoom = 16): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}
