"use client";

import { useMemo, useState } from "react";
import { MapView, type MapCircle, type MapMarker } from "@/components/map/map-view";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { useGovMap } from "@/lib/api/hooks";
import { formatLeft } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

type Layer = "offers" | "needs" | "unmatched" | "heat";

export function GovLiveMap() {
  const { data, isPending, isError, error, refetch } = useGovMap();
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ offers: true, needs: true, unmatched: true, heat: true });
  const now = useNow();
  const toggle = (l: Layer) => setLayers((s) => ({ ...s, [l]: !s[l] }));

  const { markers, circles } = useMemo(() => {
    const markers: MapMarker[] = [];
    const circles: MapCircle[] = [];
    if (!data) return { markers, circles };
    for (const o of data.offers) {
      const un = o.unmatched;
      if ((un && !layers.unmatched) || (!un && !layers.offers)) continue;
      markers.push({ id: `o-${o.id}`, lat: o.lat, lng: o.lng, color: un ? "#D64545" : "#088178", pulse: un, size: un ? 24 : 18, label: o.title, popup: `${o.title} · ${o.meals} meals · ${o.giver} (${o.area}) · ${formatLeft(new Date(o.expiresAt).getTime() - now)} left${un ? " · UNMATCHED" : ""}` });
    }
    if (layers.needs) for (const n of data.needs) markers.push({ id: `n-${n.id}`, lat: n.lat, lng: n.lng, color: "#2F6F8F", label: n.title, popup: `${n.title} · ${n.meals} meals · ${n.taker} (${n.area})` });
    if (layers.heat) {
      // demand vs surplus per area: green where supply dominates, blue where demand does
      const byArea = new Map<string, { lat: number; lng: number; supply: number; demand: number; n: number }>();
      const add = (area: string, lat: number, lng: number, s: number, d: number) => {
        const a = byArea.get(area) ?? { lat: 0, lng: 0, supply: 0, demand: 0, n: 0 };
        byArea.set(area, { lat: a.lat + lat, lng: a.lng + lng, supply: a.supply + s, demand: a.demand + d, n: a.n + 1 });
      };
      data.offers.forEach((o) => add(o.area, o.lat, o.lng, o.meals, 0));
      data.needs.forEach((n) => add(n.area, n.lat, n.lng, 0, n.meals));
      for (const a of byArea.values()) circles.push({ lat: a.lat / a.n, lng: a.lng / a.n, radiusM: 350 + Math.sqrt(a.supply + a.demand) * 90, color: a.supply >= a.demand ? "#088178" : "#2F6F8F" });
    }
    return { markers, circles };
  }, [data, layers, now]);

  if (isPending) return <PageSkeleton />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const unmatched = data.offers.filter((o) => o.unmatched);

  const chips: { l: Layer; label: string; dot: string }[] = [
    { l: "offers", label: "Offers", dot: "#088178" },
    { l: "needs", label: "Needs", dot: "#2F6F8F" },
    { l: "unmatched", label: "Unmatched / expiring", dot: "#D64545" },
    { l: "heat", label: "Demand vs surplus", dot: "#F2A33A" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Live map</h1>
        <p className="text-muted-foreground">{data.offers.length} offers · {data.needs.length} needs · {unmatched.length} unmatched</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Map layers">
        {chips.map((c) => (
          <button key={c.l} type="button" aria-pressed={layers[c.l]} onClick={() => toggle(c.l)} className={cn("flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium", layers[c.l] ? "border-primary bg-primary/10" : "border-line bg-surface text-muted-foreground")}>
            <span className="size-3 rounded-full" style={{ background: c.dot }} aria-hidden /> {c.label}
          </button>
        ))}
      </div>
      {markers.length === 0 && circles.length === 0 ? <EmptyState art="map" title="Nothing on the map" description="No open posts or needs with these filters." /> : (
        <div className="overflow-hidden rounded-[20px] border shadow-soft">
          <MapView height="calc(100vh - 20rem)" zoom={12} fit markers={markers} circles={circles} className="min-h-[420px]" />
        </div>
      )}
      {unmatched.length > 0 && (
        <section aria-label="Unmatched alerts" className="rounded-[20px] border border-clay/40 bg-clay/5 p-4">
          <h2 className="mb-2 font-display font-semibold text-clay">Unmatched and expiring</h2>
          <ul className="space-y-1 text-sm">
            {unmatched.map((o) => <li key={o.id}><b>{o.title}</b> · {o.meals} meals · {o.giver}, {o.area} · {formatLeft(new Date(o.expiresAt).getTime() - now)} left</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
