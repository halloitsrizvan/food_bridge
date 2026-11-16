"use client";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

export type LocState = {
  status: "idle" | "asking" | "granted" | "denied" | "unavailable";
  lat: number | null;
  lng: number | null;
  /** City / locality name (reverse geocoding or IP lookup). */
  place: string | null;
  /** true when the position came from the network (IP), not the device */
  approximate: boolean;
};

const KEY = "fb:location:v2";
const TTL_PRECISE = 6 * 3_600_000;
const IDLE: LocState = { status: "idle", lat: null, lng: null, place: null, approximate: false };
let state: LocState = IDLE;
let started = false;
const subs = new Set<() => void>();

function set(next: Partial<LocState>) {
  state = { ...state, ...next };
  subs.forEach((s) => s());
}

function readCache(): LocState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as { at: number; lat: number; lng: number; place: string | null; approximate: boolean };
    if (c.approximate) return null; // approximate (IP) entries from older builds are never reused
    const ttl = TTL_PRECISE;
    return Date.now() - c.at < ttl ? { status: "granted", lat: c.lat, lng: c.lng, place: c.place, approximate: c.approximate } : null;
  } catch {
    return null;
  }
}

function writeCache(s: LocState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), lat: s.lat, lng: s.lng, place: s.place, approximate: s.approximate }));
  } catch {
    /* private mode */
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&lat=${lat}&lon=${lng}`, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = (await r.json()) as { address?: Record<string, string> };
    const a = j.address ?? {};
    return a.city || a.town || a.village || a.suburb || a.county || a.state_district || null;
  } catch {
    return null;
  }
}

const BLOCKED_HELP = "Location is blocked for this site. Click the lock icon in the address bar, set Location to Allow, then reload.";

function getPosition(opts: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));
}

/** Ask for the device location; falls back to an approximate one. `force` = user clicked "use my location". */
export async function requestLocation(force = false) {
  if (typeof window === "undefined") return;
  if (started && !force) return;
  started = true;
  if (!force) {
    const cached = readCache();
    if (cached) return set(cached);
  }
  if (!("geolocation" in navigator)) return set({ status: "unavailable" });
  set({ status: "asking" });
  try {
    let pos: GeolocationPosition;
    try {
      pos = await getPosition({ enableHighAccuracy: false, timeout: 15_000, maximumAge: 10 * 60_000 });
    } catch (e) {
      if ((e as GeolocationPositionError).code === 1) throw e; // denied: do not retry
      pos = await getPosition({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
    }
    const lat = Math.round(pos.coords.latitude * 1e4) / 1e4;
    const lng = Math.round(pos.coords.longitude * 1e4) / 1e4;
    set({ status: "granted", lat, lng, place: null, approximate: false });
    const place = await reverseGeocode(lat, lng);
    set({ place });
    writeCache(state);
  } catch (e) {
    const denied = (e as GeolocationPositionError).code === 1;
    set({ status: denied ? "denied" : "unavailable" });
    if (force) toast.error(denied ? BLOCKED_HELP : "Your device could not find its position. Check that Windows/phone location services are on.", { duration: 9000 });
  }
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export function useLocation(): LocState {
  return useSyncExternalStore(subscribe, () => state, () => IDLE);
}
