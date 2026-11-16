"use client";

import { LocateFixed, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import { parseLatLng } from "@/server/logic/geo";
import { MapView } from "./map-view";

type Pt = { lat: number; lng: number };

const isGoogleLink = (v: string) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl|([a-z0-9-]+\.)?google\.[a-z.]+)\//i.test(v.trim());

function getPosition(opts: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));
}

/** Pick a location: tap the map, use GPS, or paste a Google Maps link (short links are resolved on the server). */
export function MapPicker({ value, onChange }: { value: Pt | null; onChange: (p: Pt) => void }) {
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);

  async function locate() {
    if (!navigator.geolocation) return toast.error("This browser cannot share location. Tap the map instead.");
    setLocating(true);
    try {
      let pos: GeolocationPosition;
      try {
        pos = await getPosition({ enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 });
      } catch (e) {
        if ((e as GeolocationPositionError).code === 1) throw e;
        pos = await getPosition({ enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 });
      }
      onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch (e) {
      const code = (e as GeolocationPositionError).code;
      if (code === 1) {
        toast.error("Location is blocked for this site. Click the lock icon in the address bar, set Location to Allow, reload, and try again. Or paste a Maps link / tap the map.", { duration: 9000 });
      } else {
        // device could not get a fix: use a city-level estimate from the network so the user can fine-tune
        try {
          const r = await api<{ lat: number; lng: number }>("/api/v1/geo/ip");
          onChange({ lat: r.lat, lng: r.lng });
          toast("Used an approximate location from your network. Tap the map to place the pin exactly.", { duration: 7000 });
        } catch {
          toast.error("Could not find your position. Turn on location services, or tap the map.");
        }
      }
    } finally {
      setLocating(false);
    }
  }

  async function onLink(v: string) {
    const text = v.trim();
    if (!text) return;
    const direct = parseLatLng(text);
    if (direct) {
      onChange(direct);
      return void toast.success("Location read from the link");
    }
    if (!isGoogleLink(text)) return void toast.error("Paste a Google Maps link or coordinates like 11.25, 75.78");
    setResolving(true);
    try {
      onChange(await api<Pt>("/api/v1/geo/resolve", { method: "POST", body: { url: text } }));
      toast.success("Location read from the link");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not read that link. Tap the map instead.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={locate} disabled={locating} className="h-11 gap-2">
          {locating ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LocateFixed className="size-4" aria-hidden />}
          {locating ? "Finding you..." : "Use my current location"}
        </Button>
        <div className="relative flex-1">
          <Input
            aria-label="Paste a Google Maps link or lat,lng"
            placeholder="Paste Google Maps link or 11.25, 75.78"
            className="h-11 rounded-full"
            disabled={resolving}
            onBlur={(e) => onLink(e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text");
              (e.target as HTMLInputElement).value = text;
              void onLink(text);
            }}
          />
          {resolving && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />}
        </div>
      </div>
      <MapView
        height={280}
        zoom={value ? 15 : 12}
        center={value ? [value.lat, value.lng] : undefined}
        markers={value ? [{ id: "me", lat: value.lat, lng: value.lng, color: "#088178", label: "Your location" }] : []}
        fit={!!value}
        onPick={onChange}
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {value ? `Pinned at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. Tap the map to adjust.` : "Tap the map to drop a pin."}
      </p>
    </div>
  );
}
