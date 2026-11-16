export type LatLng = { lat: number; lng: number };

const R = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function travelMinutes(km: number, speedKmh = 20): number {
  return (km / speedKmh) * 60;
}

/** Bounding box used as a cheap DB prefilter before exact Haversine. */
export function boundingBox(c: LatLng, radiusKm: number) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.01, Math.cos(rad(c.lat))));
  return { minLat: c.lat - dLat, maxLat: c.lat + dLat, minLng: c.lng - dLng, maxLng: c.lng + dLng };
}

/** Privacy: public/unmatched responses only get coordinates rounded to ~1 km. */
export const approx = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100) / 100);

/** Pull lat,lng out of a pasted Google Maps URL (or a bare "lat,lng"). */
export function parseLatLng(input: string): LatLng | null {
  const s = decodeURIComponent(input.trim());
  const patterns = [
    /@(-?\d{1,3}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    /!3d(-?\d{1,3}(?:\.\d+)?)!4d(-?\d{1,3}(?:\.\d+)?)/,
    /[?&](?:q|ll|query|center)=(-?\d{1,3}(?:\.\d+)?)[, ]+(-?\d{1,3}(?:\.\d+)?)/,
    /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/,
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
    }
  }
  return null;
}
