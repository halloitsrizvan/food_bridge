"use client";

import { MapPin, Navigation, Salad, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MapView, type MapMarker } from "@/components/map/map-view";
import { DietBadge, ModeChip } from "@/components/shared/badges";
import { CountdownRing } from "@/components/shared/countdown-ring";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useClaimOffer, useContactNeed, useFeed, useMe, useNeedsNear } from "@/lib/api/hooks";
import { formatLeft } from "@/lib/format";
import type { Diet, Mode } from "@/lib/schemas/food";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { haversineKm } from "@/server/logic/geo";

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
  forOfferId?: string;
};

const RADII = [0, 3, 6, 10] as const;

/** Best matches by location: a map plus a ranked list. Receivers see food available, givers see food wanted. */
export function NearbyPage() {
  const router = useRouter();
  const now = useNow();
  const { data: me } = useMe();
  const isGiver = me?.role === "GIVER";
  const feed = useFeed();
  const needs = useNeedsNear();
  const claim = useClaimOffer();
  const contact = useContactNeed();
  const [radius, setRadius] = useState<(typeof RADII)[number]>(0);
  const [sort, setSort] = useState<"match" | "nearest">("match");
  const [selected, setSelected] = useState<string | null>(null);

  const q = isGiver ? needs : feed;
  const hereLat = me?.lat ?? null;
  const hereLng = me?.lng ?? null;
  const here = useMemo(() => (hereLat != null && hereLng != null ? { lat: hereLat, lng: hereLng } : null), [hereLat, hereLng]);

  const items = useMemo<Item[]>(() => {
    if (!me || !here) return [];
    const dist = (lat: number | null, lng: number | null, m?: number) => (lat != null && lng != null ? haversineKm(here, { lat, lng }) : (m ?? 0));
    if (isGiver) {
      return (needs.data ?? [])
        .filter((n) => n.lat != null && n.lng != null)
        .map((n) => ({
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
          distanceKm: dist(n.lat, n.lng, n.match?.distanceKm),
          score: n.match ? n.match.score : null,
          until: n.neededBy,
          forOfferId: n.forOfferId,
        }));
    }
    return (feed.data ?? [])
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => ({
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
        distanceKm: dist(o.lat, o.lng, o.match?.distanceKm),
        score: o.match ? o.match.score : null,
        until: o.expiresAt,
        startedAt: o.createdAt,
      }));
  }, [me, here, isGiver, needs.data, feed.data]);

  const shown = useMemo(() => {
    const within = items.filter((i) => radius === 0 || i.distanceKm <= radius);
    return [...within].sort((a, b) => (sort === "match" && a.score != null && b.score != null ? b.score - a.score : a.distanceKm - b.distanceKm));
  }, [items, radius, sort]);

  if (!me || (q.isPending && !q.data)) return <PageSkeleton />;
  if (q.isError) return <ErrorState message={q.error.message} onRetry={() => q.refetch()} />;
  if (!here) return <EmptyState art="map" title="Add your location first" description="Your profile has no pinned location yet." />;

  const markers: MapMarker[] = [
    { id: "me", lat: here.lat, lng: here.lng, color: "#212529", size: 22, label: "You are here", popup: "You are here" },
    ...shown.map((i) => ({
      id: i.id,
      lat: i.lat,
      lng: i.lng,
      color: i.kind === "offer" ? "#088178" : "#2F80C9",
      size: selected === i.id ? 30 : 20,
      pulse: selected === i.id,
      label: i.title,
      popup: `${i.title} · ${i.meals} meals · ${i.distanceKm.toFixed(1)} km`,
    })),
  ];

  const noun = isGiver ? "food wanted" : "food available";
  const busyId = isGiver ? (contact.isPending ? contact.variables?.needId : null) : claim.isPending ? claim.variables?.offerId : null;

  function act(i: Item) {
    if (isGiver) {
      if (!i.forOfferId) return void toast.error("Post food first, then you can offer it to a need.");
      contact.mutate({ needId: i.id, offerId: i.forOfferId }, { onSuccess: () => toast.success("Offer sent. They have 15 minutes to accept."), onError: (e) => toast.error(e.message) });
    } else {
      claim.mutate({ offerId: i.id }, { onSuccess: (r) => { toast.success("Request sent. The giver has 15 minutes to accept."); router.push(`/dashboard/claims/${r.id}`); }, onError: (e) => toast.error(e.message) });
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Nearby</h1>
        <p className="text-muted-foreground">
          {isGiver ? "Food wanted near you, best match first." : "Food available near you that can still reach you in time, best match first."}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        {RADII.map((r) => (
          <button key={r} type="button" aria-pressed={radius === r} onClick={() => setRadius(r)} className={cn("min-h-9 rounded-full border px-4 text-sm font-medium transition-colors", radius === r ? "border-primary bg-background text-primary ring-1 ring-primary" : "border-line bg-background hover:border-primary/50")}>
            {r === 0 ? "Any distance" : `Within ${r} km`}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        {(["match", "nearest"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={sort === s} onClick={() => setSort(s)} className={cn("min-h-9 rounded-full border px-4 text-sm font-medium transition-colors", sort === s ? "border-primary bg-primary text-primary-foreground" : "border-line bg-background hover:border-primary/50")}>
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
            <span className="flex items-center gap-1.5"><span className={cn("size-3 rounded-full", isGiver ? "bg-[#2F80C9]" : "bg-[#088178]")} /> {isGiver ? "Food wanted" : "Food available"}</span>
            <span className="ml-auto">Locations are approximate until a handover is accepted.</span>
          </div>
        </div>

        <section aria-label={`Nearby ${noun}`} aria-live="polite" className="min-w-0 space-y-3">
          <p className="text-sm text-muted-foreground">{shown.length} {noun}{radius ? ` within ${radius} km` : ""}</p>
          {shown.length === 0 ? (
            <EmptyState art="map" title={`No ${noun} nearby`} description={radius ? "Try a wider distance." : isGiver ? "When receivers near you post needs, they show up here." : "We alert you the moment something safe and reachable is posted."} />
          ) : (
            shown.map((i, idx) => (
              <article
                key={i.id}
                onClick={() => setSelected(i.id)}
                className={cn("cursor-pointer space-y-3 rounded-[20px] border bg-background p-4 transition-shadow hover:shadow-soft", selected === i.id && "ring-2 ring-primary")}
              >
                <div className="flex items-start gap-3">
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display text-sm font-semibold", i.kind === "offer" ? "bg-primary/12 text-primary" : "bg-info/15 text-info")}>{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display font-semibold">{i.title}</h3>
                    <p className="truncate text-xs text-muted-foreground">{i.who} · {i.area}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
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
                <div className="flex gap-2">
                  <Button
                    className="h-10 flex-1"
                    disabled={me.status !== "ACTIVE" || busyId === i.id || (isGiver && !i.forOfferId)}
                    onClick={(e) => {
                      e.stopPropagation();
                      act(i);
                    }}
                  >
                    {busyId === i.id ? "Please wait..." : isGiver ? (i.forOfferId ? "Offer my food" : "Post food first") : "Request this food"}
                  </Button>
                  {!isGiver && (
                    <Link href={`/dashboard/offers/${i.id}`} onClick={(e) => e.stopPropagation()} className="inline-flex h-10 items-center gap-1 rounded-full border px-4 text-sm font-medium hover:bg-muted">
                      <MapPin className="size-4" aria-hidden /> Details
                    </Link>
                  )}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
