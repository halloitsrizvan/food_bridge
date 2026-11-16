"use client";
import { useSyncExternalStore } from "react";

export type LocState = {
  status: "idle" | "asking" | "granted" | "denied" | "unavailable";
  lat: number | null;
  lng: number | null;
  /** City / locality name from reverse geocoding (OpenStreetMap Nominatim). */
  place: string | null;
};

const KEY = "fb:location:v1";
const TTL = 6 * 3_600_000;
const IDLE: LocState = { status: "idle", lat: null, lng: null, place: null };
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
    const c = JSON.parse(raw) as { at: number; lat: number; lng: number; place: string | null };
    return Date.now() - c.at < TTL ? { status: "granted", lat: c.lat, lng: c.lng, place: c.place } : null;
  } catch {
    return null;
  }
}

function writeCache(lat: number, lng: number, place: string | null) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), lat, lng, place }));
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

/** Ask for the browser location once. Safe to call repeatedly (e.g. from a "Use my location" button). */
export function requestLocation(force = false) {
  if (typeof window === "undefined") return;
  if (started && !force) return;
  started = true;
  if (!force) {
    const cached = readCache();
    if (cached) return set(cached);
  }
  if (!("geolocation" in navigator)) return set({ status: "unavailable" });
  set({ status: "asking" });
  navigator.geolocation.getCurrentPosition(
    async (p) => {
      const lat = Math.round(p.coords.latitude * 1e4) / 1e4;
      const lng = Math.round(p.coords.longitude * 1e4) / 1e4;
      set({ status: "granted", lat, lng, place: null });
      const place = await reverseGeocode(lat, lng);
      set({ place });
      writeCache(lat, lng, place);
    },
    (e) => set({ status: e.code === e.PERMISSION_DENIED ? "denied" : "unavailable" }),
    { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60_000 },
  );
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export function useLocation(): LocState {
  return useSyncExternalStore(subscribe, () => state, () => IDLE);
}
