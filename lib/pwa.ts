"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const RUNTIME_CACHE_PREFIX = "fb-runtime-";

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Dev builds change constantly and a worker would serve stale chunks: production only.
  if (process.env.NODE_ENV !== "production") return;
  const go = () => navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  if (document.readyState === "complete") go();
  else window.addEventListener("load", go, { once: true });
}

/** Wipes saved pages/data (not the app shell). Called on log out so nothing leaks between accounts. */
export async function clearOfflineData() {
  try {
    navigator.serviceWorker?.controller?.postMessage("CLEAR_USER_CACHE");
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith(RUNTIME_CACHE_PREFIX)).map((k) => caches.delete(k)));
    }
  } catch {}
}

export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb);
      window.addEventListener("offline", cb);
      return () => {
        window.removeEventListener("online", cb);
        window.removeEventListener("offline", cb);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function useInstall() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only detection after mount
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return {
    installed,
    ios,
    canPrompt: !!evt,
    install: async () => {
      if (!evt) return;
      await evt.prompt();
      await evt.userChoice;
      setEvt(null);
    },
  };
}
