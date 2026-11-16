import { AppError } from "../lib/errors";
import { parseLatLng, type LatLng } from "../logic/geo";

// Only Google Maps hosts may be fetched (no open redirect / SSRF): every hop is re-checked.
const HOST_OK = /^(maps\.app\.goo\.gl|goo\.gl|([a-z0-9-]+\.)?google\.[a-z.]{2,6})$/i;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function assertGoogle(u: URL) {
  if (u.protocol !== "https:" || !HOST_OK.test(u.hostname)) throw AppError.badRequest("Only Google Maps links can be read");
}

/** Follow a (short) Google Maps link and return the place coordinates. */
export async function resolveMapsUrl(input: string): Promise<LatLng> {
  let cur = new URL(input);
  assertGoogle(cur);
  for (let hop = 0; hop < 6; hop++) {
    const direct = parseLatLng(cur.toString());
    if (direct) return direct;
    let res: Response;
    try {
      res = await fetch(cur, { redirect: "manual", headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(7000) });
    } catch {
      throw AppError.badRequest("Could not open that link. Tap the map instead.");
    }
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      cur = new URL(loc, cur);
      assertGoogle(cur);
      continue;
    }
    // final page: coordinates may only be in the static-map meta tag
    const html = (await res.text()).slice(0, 600_000);
    const m = html.match(/center=(-?\d{1,3}\.\d+)(?:%2C|,)(-?\d{1,3}\.\d+)/) ?? html.match(/\[null,null,(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)\]/);
    if (m) return { lat: Number(m[1]), lng: Number(m[2]) };
    break;
  }
  throw AppError.badRequest("No coordinates found in that link. Tap the map instead.");
}

const isPrivate = (ip: string) => !ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.");

/** Approximate location from the caller's IP: Vercel's edge headers first, a public lookup otherwise. */
export async function approximateLocation(req: Request): Promise<{ lat: number; lng: number; place: string | null }> {
  const h = req.headers;
  const vl = h.get("x-vercel-ip-latitude");
  const vg = h.get("x-vercel-ip-longitude");
  if (vl && vg) {
    const city = h.get("x-vercel-ip-city");
    return { lat: Number(vl), lng: Number(vg), place: city ? decodeURIComponent(city) : null };
  }
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  try {
    const r = await fetch(`https://ipwho.is/${isPrivate(ip) ? "" : encodeURIComponent(ip)}?fields=success,latitude,longitude,city`, { signal: AbortSignal.timeout(5000) });
    const j = (await r.json()) as { success?: boolean; latitude?: number; longitude?: number; city?: string };
    if (j.success && typeof j.latitude === "number" && typeof j.longitude === "number") return { lat: j.latitude, lng: j.longitude, place: j.city ?? null };
  } catch {
    /* fall through */
  }
  throw new AppError(404, "NOT_FOUND", "Could not estimate your location");
}
