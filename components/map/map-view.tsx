"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { MapProps } from "./map-inner";

export type { MapMarker, MapCircle } from "./map-inner";

// Leaflet touches `window`, so it is client-only.
export const MapView = dynamic<MapProps>(() => import("./map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-80 w-full rounded-2xl" />,
});
