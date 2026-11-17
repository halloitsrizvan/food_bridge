"use client";

import { useCallback, useSyncExternalStore } from "react";
import { APPEARANCE_KEY } from "./boot-scripts";

// Per-device display preferences. Stored in localStorage and applied as data-* attributes on <html>
// (styles live in app/globals.css). The theme itself (light/dark/system) is handled by next-themes.
export type Appearance = {
  font: "default" | "system" | "serif" | "mono" | "readable";
  size: "sm" | "md" | "lg" | "xl";
  motion: "full" | "reduce";
};

export const DEFAULT_APPEARANCE: Appearance = { font: "default", size: "md", motion: "full" };

const FONTS: Appearance["font"][] = ["default", "system", "serif", "mono", "readable"];
const SIZES: Appearance["size"][] = ["sm", "md", "lg", "xl"];
const MOTIONS: Appearance["motion"][] = ["full", "reduce"];

function parse(raw: string | null): Appearance {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<Appearance>) : {};
    return {
      font: FONTS.includes(v.font as Appearance["font"]) ? (v.font as Appearance["font"]) : DEFAULT_APPEARANCE.font,
      size: SIZES.includes(v.size as Appearance["size"]) ? (v.size as Appearance["size"]) : DEFAULT_APPEARANCE.size,
      motion: MOTIONS.includes(v.motion as Appearance["motion"]) ? (v.motion as Appearance["motion"]) : DEFAULT_APPEARANCE.motion,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function apply(a: Appearance) {
  const el = document.documentElement;
  el.dataset.font = a.font;
  el.dataset.size = a.size;
  el.dataset.motion = a.motion;
}

// useSyncExternalStore needs a stable snapshot: cache the parsed object per raw string.
let cachedRaw: string | null | undefined;
let cached: Appearance = DEFAULT_APPEARANCE;
const listeners = new Set<() => void>();

function read(): Appearance {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(APPEARANCE_KEY);
  } catch {}
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useAppearance() {
  const value = useSyncExternalStore(subscribe, read, () => DEFAULT_APPEARANCE);
  const update = useCallback((patch: Partial<Appearance>) => {
    const next = { ...read(), ...patch };
    try {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next));
    } catch {}
    apply(next);
    listeners.forEach((l) => l());
  }, []);
  const reset = useCallback(() => update(DEFAULT_APPEARANCE), [update]);
  return { appearance: value, update, reset };
}
