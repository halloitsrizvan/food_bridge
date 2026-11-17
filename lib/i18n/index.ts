"use client";

import { useCallback, useSyncExternalStore } from "react";
import { LANG_KEY } from "../boot-scripts";
import { en, type Dict } from "./en";
import { hi } from "./hi";
import { ml } from "./ml";

export type Lang = "en" | "ml" | "hi";
export const LANGS: { code: Lang; native: string; english: string }[] = [
  { code: "en", native: "English", english: "English" },
  { code: "ml", native: "മലയാളം", english: "Malayalam" },
  { code: "hi", native: "हिन्दी", english: "Hindi" },
];
const DICTS: Record<Lang, Dict> = { en, ml, hi };

const isLang = (v: unknown): v is Lang => v === "en" || v === "ml" || v === "hi";
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return isLang(v) ? v : "en";
  } catch {
    return "en";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

/** Current language. The server and the first client render use English, then the saved choice applies. */
export function useLang() {
  const lang = useSyncExternalStore(subscribe, read, () => "en" as Lang);
  const setLang = useCallback((next: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {}
    document.documentElement.lang = next;
    listeners.forEach((l) => l());
  }, []);
  return { lang, setLang };
}

export function useT(): Dict {
  return DICTS[useLang().lang];
}

/** Fills {name} placeholders: fmt("Page {page}", { page: 2 }). */
export function fmt(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
