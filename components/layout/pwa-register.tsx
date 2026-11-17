"use client";

import { WifiOff } from "lucide-react";
import { useEffect } from "react";
import { registerServiceWorker, useOnline } from "@/lib/pwa";

/** Registers the service worker and shows a slim banner while the device is offline. */
export function PwaRegister() {
  const online = useOnline();
  useEffect(() => registerServiceWorker(), []);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-16 z-[95] mx-auto flex w-max max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lift md:bottom-4">
      <WifiOff className="size-4 shrink-0" aria-hidden /> You are offline. Showing saved data; changes need a connection.
    </div>
  );
}
