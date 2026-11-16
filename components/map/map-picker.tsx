"use client";

import { LocateFixed } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseLatLng } from "@/server/logic/geo";
import { MapView } from "./map-view";

type Pt = { lat: number; lng: number };

/** Pick a location: tap the map, use GPS, or paste a Google Maps link / "lat,lng". */
export function MapPicker({ value, onChange }: { value: Pt | null; onChange: (p: Pt) => void }) {
  function locate() {
    if (!navigator.geolocation) return toast.error("Location is not available in this browser");
    navigator.geolocation.getCurrentPosition(
      (p) => onChange({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => toast.error("Could not get your location. Allow access or tap the map."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }
  function onPaste(v: string) {
    const p = parseLatLng(v);
    if (p) {
      onChange(p);
      toast.success("Location read from the link");
    } else if (v.trim()) {
      toast.error("Could not find coordinates in that link. Short links (maps.app.goo.gl) hide them; tap the map instead.");
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={locate} className="h-11 gap-2 rounded-xl">
          <LocateFixed className="size-4" aria-hidden /> Use my current location
        </Button>
        <Input
          aria-label="Paste a Google Maps link or lat,lng"
          placeholder="Paste Google Maps link or 11.25, 75.78"
          className="h-11 rounded-xl"
          onBlur={(e) => onPaste(e.target.value)}
          onPaste={(e) => {
            e.preventDefault();
            const text = e.clipboardData.getData("text");
            (e.target as HTMLInputElement).value = text;
            onPaste(text);
          }}
        />
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
