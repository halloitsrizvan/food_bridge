"use client";

import { useEffect } from "react";
import { requestLocation } from "@/lib/use-location";

/** Asks for the visitor's location as soon as the landing page opens. Renders nothing. */
export function LocationBootstrap() {
  useEffect(() => {
    requestLocation();
  }, []);
  return null;
}
