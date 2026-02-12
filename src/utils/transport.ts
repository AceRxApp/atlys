/** Walking speed: 5 km/h with 1.3× path multiplier for city streets */
export function calcWalkMinutes(km: number): number {
  return Math.round((km * 1.3) / 5 * 60);
}

/** City driving speed: 30 km/h average with 1.2× path multiplier */
export function calcDriveMinutes(km: number): number {
  return Math.max(1, Math.round((km * 1.2) / 30 * 60));
}

/** Build a Google Maps directions deep link */
export function buildMapsUrl(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  mode: 'walking' | 'driving',
): string {
  const travelmode = mode === 'walking' ? 'walking' : 'driving';
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${travelmode}`;
}

/** Haversine distance in km between two lat/lng points */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
