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

/**
 * Pull the PLACE coordinates out of a Google Maps URL (or a bare "lat,lng").
 * Priority matters: `!3d<lat>!4d<lng>` and `!1d<lng>!2d<lat>` are the place itself, while
 * `@lat,lng` is only the map viewport (and /dir/ links start with the *origin*).
 */
export function parseLatLng(input: string): LatLng | null {
  let s = input.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* malformed escape: parse as is */
  }
  const num = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
  const valid = (lat: number, lng: number) => (Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null);
  const tries: [RegExp, (m: RegExpMatchArray) => LatLng | null][] = [
    [new RegExp("!3d" + num + "!4d" + num), (m) => valid(+m[1], +m[2])],
    [new RegExp("!1d" + num + "!2d" + num), (m) => valid(+m[2], +m[1])], // lng first, then lat
    [new RegExp("[?&](?:q|ll|query|center|destination)=" + num + "[, ]+" + num), (m) => valid(+m[1], +m[2])],
    [new RegExp("/maps/place/[^@]*@" + num + "," + num), (m) => valid(+m[1], +m[2])],
    [new RegExp("@" + num + "," + num), (m) => valid(+m[1], +m[2])],
    [new RegExp("^" + num + String.raw`\s*,\s*` + num + "$"), (m) => valid(+m[1], +m[2])],
  ];
  for (const [re, pick] of tries) {
    const m = s.match(re);
    const r = m && pick(m);
    if (r) return r;
  }
  return null;
}
