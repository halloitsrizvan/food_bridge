"use client";

import { HandHeart, MapPin, Navigation, Salad, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapView, type MapMarker } from "@/components/map/map-view";
import { DietBadge, ModeChip } from "@/components/shared/badges";
import { CountdownRing } from "@/components/shared/countdown-ring";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useClaimOffer, useContactNeed, useFeed, useMe, useMyNeeds, useMyOffers, useNeedsNear, useOffers, usePublicNeeds } from "@/lib/api/hooks";
import { formatLeft } from "@/lib/format";
import type { Diet, Mode } from "@/lib/schemas/food";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  kind: "offer" | "need";
  title: string;
  who: string;
  area: string;
  meals: number;
  diet: Diet;
  mode: Mode;
  lat: number;
  lng: number;
  distanceKm: number;
  score: number | null;
  /** offers: when the food expires. needs: when it is needed by. */
  until: string;
  startedAt?: string;
  /** offers only: can it still be handed over in time (20 km/h + 10 min buffer) */
  reachable?: boolean;
  forOfferId?: string;
};

type View = "available" | "wanted" | "both";
const RADII = [0, 3, 6, 10] as const;
const SPEED_KMH = 20;
const BUFFER_MIN = 10;

/** Best matches by location: a map plus a ranked list of food available and food wanted near you. */
export function NearbyPage() {
  const router = useRouter();
  const now = useNow();
  const { data: me } = useMe();
  const isGiver = me?.role === "GIVER";
  const hereLat = me?.lat ?? null;
  const hereLng = me?.lng ?? null;
  const loc = hereLat != null && hereLng != null ? { lat: hereLat, lng: hereLng } : null;

  const [view, setView] = useState<View | null>(null);
  const activeView: View = view ?? (isGiver ? "wanted" : "available");
  const [radius, setRadius] = useState<(typeof RADII)[number]>(0);
  const [sort, setSort] = useState<"match" | "nearest">("match");
  const [selected, setSelected] = useState<string | null>(null);

  // everything live nearby (public lists carry distance when lat/lng are sent)
  const geo = { lat: hereLat ?? undefined, lng: hereLng ?? undefined };
  const offersQ = useOffers({ ...geo, sort: "nearest", limit: 50 });
  const needsQ = usePublicNeeds({ ...geo, sort: "nearest", limit: 50 });
  // personal ranking data: match scores (receiver feed / giver's best offer vs needs)
  const feed = useFeed(!!me && !isGiver);
  const giverNeeds = useNeedsNear(!!me && isGiver);
  const myNeeds = useMyNeeds(!!me && !isGiver);
  const myOffers = useMyOffers(!!me && isGiver);
  const claim = useClaimOffer();
  const contact = useContactNeed();

  const items = useMemo<Item[]>(() => {
    if (!loc) return [];
    const feedScore = new Map((feed.data ?? []).map((o) => [o.id, o.match?.score ?? null]));
    const needMatch = new Map((giverNeeds.data ?? []).map((n) => [n.id, n]));
    const myNeedIds = new Set((myNeeds.data ?? []).map((n) => n.id));
    const myOfferIds = new Set((myOffers.data ?? []).map((o) => o.id));

    const offers: Item[] = (offersQ.data?.items ?? [])
      .filter((o) => o.lat != null && o.lng != null && !myOfferIds.has(o.id) && !o.scheduledFor)
      .map((o) => {
        const d = o.distanceKm ?? 0;
        const minLeft = (new Date(o.expiresAt).getTime() - (now || Date.now())) / 60_000;
        return {
          id: o.id,
          kind: "offer" as const,
          title: o.title,
          who: o.giverName,
          area: o.area,
          meals: o.quantityMeals,
          diet: o.diet,
          mode: o.mode,
          lat: o.lat!,
          lng: o.lng!,
          distanceKm: d,
          score: feedScore.get(o.id) ?? null,
          until: o.expiresAt,
          startedAt: o.createdAt,
          reachable: minLeft - (d / SPEED_KMH) * 60 - BUFFER_MIN >= 0,
        };
      });

    const needs: Item[] = (needsQ.data?.items ?? [])
      .filter((n) => n.lat != null && n.lng != null && !myNeedIds.has(n.id))
      .map((n) => {
        const m = needMatch.get(n.id);
        return {
          id: n.id,
          kind: "need" as const,
          title: n.title,
          who: `${n.takerName}${n.members ? ` · ${n.members} members` : ""}`,
          area: n.area,
          meals: n.mealsNeeded,
          diet: n.diet,
          mode: n.mode,
          lat: n.lat!,
          lng: n.lng!,
          distanceKm: n.distanceKm ?? 0,
          score: m?.match ? m.match.score : null,
          until: n.neededBy,
          forOfferId: m?.forOfferId,
        };
      });

    return activeView === "available" ? offers : activeView === "wanted" ? needs : [...offers, ...needs];
    // `now` ticks every second; reachability only needs to be fresh when data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, offersQ.data, needsQ.data, feed.data, giverNeeds.data, myNeeds.data, myOffers.data, activeView]);

  const shown = useMemo(() => {
    const within = items.filter((i) => radius === 0 || i.distanceKm <= radius);
    return [...within].sort((a, b) => (sort === "match" ? (b.score ?? -1) - (a.score ?? -1) || a.distanceKm - b.distanceKm : a.distanceKm - b.distanceKm));
  }, [items, radius, sort]);

  const loading = !me || ((activeView !== "wanted" && offersQ.isPending) || (activeView !== "available" && needsQ.isPending));
  if (loading) return <PageSkeleton />;
  const err = (activeView !== "wanted" && offersQ.isError ? offersQ : null) ?? (activeView !== "available" && needsQ.isError ? needsQ : null);
  if (err) return <ErrorState message={err.error?.message ?? "Could not load nearby posts"} onRetry={() => err.refetch()} />;
  if (!loc) return <EmptyState art="map" title="Add your location first" description="Your profile has no pinned location yet." />;

  const markers: MapMarker[] = [
    { id: "me", lat: loc.lat, lng: loc.lng, color: "#212529", size: 22, label: "You are here", popup: "You are here" },
    ...shown.map((i) => ({
      id: i.id,
      lat: i.lat,
      lng: i.lng,
      color: i.kind === "offer" ? "#088178" : "#2F80C9",
      size: selected === i.id ? 30 : 20,
      pulse: selected === i.id,
      label: i.title,
      popup: `${i.kind === "offer" ? "Food: " : "Needs: "}${i.title} · ${i.meals} meals · ${i.distanceKm.toFixed(1)} km`,
    })),
  ];

  const busyOffer = claim.isPending ? claim.variables?.offerId : null;
  const busyNeed = contact.isPending ? contact.variables?.needId : null;

  function requestFood(i: Item) {
    claim.mutate({ offerId: i.id }, { onSuccess: (r) => { toast.success("Request sent. The giver has 15 minutes to accept."); router.push(`/dashboard/claims/${r.id}`); }, onError: (e) => toast.error(e.message) });
  }
  function offerFood(i: Item) {
    if (!i.forOfferId) return void toast.error("Post food first, then you can offer it to a need.");
    contact.mutate({ needId: i.id, offerId: i.forOfferId }, { onSuccess: () => toast.success("Offer sent. They have 15 minutes to accept."), onError: (e) => toast.error(e.message) });
  }

  const tabs: { v: View; label: string }[] = [
    { v: "available", label: "Food available" },
    { v: "wanted", label: "Food wanted" },
    { v: "both", label: "Both" },
  ];
  const active = me.status === "ACTIVE";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Nearby</h1>
        <p className="text-muted-foreground">Everything live around you, on the map and ranked. Best match first.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="What to show">
        {tabs.map((t) => (
          <button key={t.v} type="button" aria-pressed={activeView === t.v} onClick={() => setView(t.v)} className={cn("min-h-10 rounded-full border px-5 text-sm font-semibold transition-colors", activeView === t.v ? "border-primary bg-primary text-primary-foreground" : "border-line bg-background hover:border-primary/50")}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        {RADII.map((r) => (
          <button key={r} type="button" aria-pressed={radius === r} onClick={() => setRadius(r)} className={cn("min-h-9 rounded-full border px-4 text-sm font-medium transition-colors", radius === r ? "border-primary bg-background text-primary ring-1 ring-primary" : "border-line bg-background hover:border-primary/50")}>
            {r === 0 ? "Any distance" : `Within ${r} km`}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        {(["match", "nearest"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={cn("min-h-9 rounded-full border px-4 text-sm font-medium transition-colors", sort === s ? "border-primary bg-background text-primary ring-1 ring-primary" : "border-line bg-background hover:border-primary/50")}>
            {s === "match" ? "Best match" : "Nearest"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="overflow-hidden rounded-[20px] border shadow-soft">
            <MapView height="min(70vh, 34rem)" zoom={13} fit markers={markers} className="min-h-[18rem]" />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#212529]" /> You</span>
            {activeView !== "wanted" && <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#088178]" /> Food available</span>}
            {activeView !== "available" && <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-[#2F80C9]" /> Food wanted</span>}
            <span className="ml-auto">Locations are approximate until a handover is accepted.</span>
          </div>
        </div>

        <section aria-label="Nearby posts" aria-live="polite" className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            {shown.length} {activeView === "available" ? "food available" : activeView === "wanted" ? "requests" : "posts"}
            {radius ? ` within ${radius} km` : ""}
          </p>
          {shown.length === 0 ? (
            <EmptyState art="map" title="Nothing nearby right now" description={radius ? "Try a wider distance or another view." : "New posts show up here as soon as they are made."} />
          ) : (
            shown.map((i, idx) => (
              <article key={`${i.kind}-${i.id}`} onClick={() => setSelected(i.id)} className={cn("cursor-pointer space-y-3 rounded-[20px] border bg-background p-4 transition-shadow hover:shadow-soft", selected === i.id && "ring-2 ring-primary")}>
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold", i.kind === "offer" ? "bg-primary/12 text-primary" : "bg-info/15 text-info")}>
                    {i.kind === "offer" ? idx + 1 : <HandHeart className="size-5" aria-label="Request" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display font-semibold">{i.title}</h3>
                    <p className="truncate text-xs text-muted-foreground">{i.who} · {i.area}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", i.kind === "offer" ? "bg-primary/12 text-primary" : "bg-info/15 text-info")}>{i.kind === "offer" ? "Food available" : "Needs food"}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"><Navigation className="size-3" aria-hidden />{i.distanceKm.toFixed(1)} km</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"><Utensils className="size-3" aria-hidden />{i.meals} meals</span>
                      <DietBadge diet={i.diet} />
                      <ModeChip mode={i.mode} />
                    </div>
                  </div>
                  {i.kind === "offer" ? (
                    <CountdownRing expiresAt={i.until} startAt={i.startedAt} size={48} />
                  ) : (
                    <span className="text-right text-xs text-muted-foreground">needed in<br /><b className="tabular text-foreground">{now ? formatLeft(new Date(i.until).getTime() - now) : "…"}</b></span>
                  )}
                </div>
                {i.score != null && (
                  <p className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">
                    <Salad className="size-3.5 text-primary" aria-hidden /> {Math.round(i.score * 100)} match
                  </p>
                )}
                {i.kind === "offer" && i.reachable === false && <p className="text-xs text-clay">Too far to reach before it spoils.</p>}
                <div className="flex gap-2">
                  {i.kind === "offer" && !isGiver && (
                    <Button className="h-10 flex-1" disabled={!active || busyOffer === i.id || i.reachable === false} onClick={(e) => { e.stopPropagation(); requestFood(i); }}>
                      {busyOffer === i.id ? "Please wait..." : i.reachable === false ? "Out of reach" : "Request this food"}
                    </Button>
                  )}
                  {i.kind === "need" && isGiver && (
                    <Button className="h-10 flex-1" disabled={!active || busyNeed === i.id || !i.forOfferId} onClick={(e) => { e.stopPropagation(); offerFood(i); }}>
                      {busyNeed === i.id ? "Please wait..." : i.forOfferId ? "Offer my food" : "Post food first"}
                    </Button>
                  )}
                  {i.kind === "offer" && (
                    <Link href={`/dashboard/offers/${i.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex h-10 items-center gap-1 rounded-full border px-4 text-sm font-medium hover:bg-muted">
                      <MapPin className="size-4" aria-hidden /> Details
                    </Link>
                  )}
                  {i.kind === "need" && !isGiver && <p className="py-2 text-xs text-muted-foreground">Another receiver&apos;s request</p>}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
