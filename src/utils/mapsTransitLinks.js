export function googleMapsSearchUrl(query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
export function googleMapsTransitDirectionsTo(destinationName) {
    return `https://www.google.com/maps/dir/?api=1&travelmode=transit&destination=${encodeURIComponent(destinationName)}`;
}
export function googleMapsAt(latitude, longitude, zoom = 16) {
    return `https://www.google.com/maps/@${latitude},${longitude},${zoom}z`;
}
export function openStreetMapView(latitude, longitude, zoom = 16) {
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}
