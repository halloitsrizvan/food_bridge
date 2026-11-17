"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { HandHeart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { Avatar, CategoryChip, DietBadge, kindLabel, ModeChip } from "@/components/shared/badges";
import { BigCountdown } from "@/components/shared/countdown-ring";
import { NeedCard } from "@/components/shared/need-card";
import { PostCard } from "@/components/shared/post-card";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/shared/states";
import { LoginForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMe, useOffers, usePublicNeeds, type OfferFilters } from "@/lib/api/hooks";
import { fmt, useT } from "@/lib/i18n";
import { requestLocation, useLocation } from "@/lib/use-location";
import type { PublicOffer } from "@/lib/schemas/food";
import { cn } from "@/lib/utils";

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("min-h-9 rounded-full border px-4 text-sm font-medium transition-colors", active ? "border-primary bg-background text-primary ring-1 ring-primary" : "border-line bg-background hover:border-primary/50")}>
      {children}
    </button>
  );
}

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setD(v), ms);
    return () => clearTimeout(id);
  }, [v, ms]);
  return d;
}

export function LiveFeed() {
  const t = useT();
  const router = useRouter();
  const { data: me } = useMe();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("");
  const [diet, setDiet] = useState<string>();
  const [category, setCategory] = useState<string>();
  const [maxMin, setMaxMin] = useState<number>();
  const loc = useLocation();
  const [sortChoice, setSortChoice] = useState<"nearest" | "soonest" | "newest" | null>(null);
  const located = loc.lat != null && loc.lng != null;
  const sort = sortChoice ?? (located ? "nearest" : "soonest");
  const setSort = setSortChoice;
  const [selected, setSelected] = useState<PublicOffer | null>(null);
  // login gate for both kinds of card
  const [loginFor, setLoginFor] = useState<{ kind: "offer" | "need"; id: string; title: string; who: string } | null>(null);
  // "Food + requests": also list what receivers are asking for
  const [showNeeds, setShowNeeds] = useState(false);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ q?: string; category?: string; diet?: string }>).detail ?? {};
      setQ(d.q ?? "");
      setCategory(d.category);
      setDiet(d.diet);
    };
    const onSearch = (e: Event) => setQ((e as CustomEvent<{ q?: string }>).detail?.q ?? "");
    window.addEventListener("fb:filter", on);
    window.addEventListener("fb:search", onSearch);
    return () => {
      window.removeEventListener("fb:filter", on);
      window.removeEventListener("fb:search", onSearch);
    };
  }, []);
  const dq = useDebounced(q);
  const darea = useDebounced(area);
  // page resets whenever any filter changes (derived, no effect)
  const filterKey = JSON.stringify([dq, darea, diet, category, maxMin, sort, loc.lat, loc.lng]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (fn: (p: number) => number) => setPageState({ key: filterKey, page: fn(page) });
  const filters: OfferFilters = { q: dq || undefined, area: darea || undefined, diet, category, maxMinutesLeft: maxMin, sort: sort === "nearest" && !located ? "soonest" : sort, page, limit: 6, lat: loc.lat ?? undefined, lng: loc.lng ?? undefined };
  const { data, isPending, isError, refetch, isPlaceholderData } = useOffers(filters);

  const needsQ = usePublicNeeds(
    { q: dq || undefined, area: darea || undefined, diet, sort: located ? "nearest" : "soonest", lat: loc.lat ?? undefined, lng: loc.lng ?? undefined, limit: 6 },
    showNeeds,
  );
  function offerToNeed(n: { id: string; title: string; takerName: string }) {
    if (!me) return setLoginFor({ kind: "need", id: n.id, title: n.title, who: n.takerName });
    router.push("/dashboard/nearby"); // givers see the map and can offer food from there
  }

  function contact(o: PublicOffer) {
    if (!me) return setLoginFor({ kind: "offer", id: o.id, title: o.title, who: o.giverName }); // claim needs a login: open the modal, then continue
    if (me.role === "GIVER") return setSelected(o);
    router.push(`/dashboard/offers/${o.id}`);
  }

  return (
    <section id="live" className="scroll-mt-32 bg-secondary py-14">
      <div className="mx-auto max-w-[1680px] px-4 sm:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold sm:text-4xl">{fmt(t.feed.bestNear, { place: loc.place ?? t.feed.you })}</h2>
          <p className="text-muted-foreground">{t.feed.sub}</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Sort">
          {located ? (
            <Chip active={sort === "nearest"} onClick={() => setSort("nearest")}>
              {t.feed.nearest}
            </Chip>
          ) : (
            <Chip active={false} onClick={() => requestLocation(true)}>
              {loc.status === "asking" ? t.feed.locating : t.feed.useLocation}
            </Chip>
          )}
          <Chip active={sort === "soonest"} onClick={() => setSort("soonest")}>
            {t.feed.soonest}
          </Chip>
          <Chip active={sort === "newest"} onClick={() => setSort("newest")}>
            {t.feed.newest}
          </Chip>
        </div>
      </div>

      <div className="mb-6 space-y-3 rounded-[20px] border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label={t.nav.searchLabel} placeholder={t.nav.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl pl-9" />
          </div>
          <Input aria-label={t.feed.areaLabel} placeholder={t.feed.areaPlaceholder} value={area} onChange={(e) => setArea(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
          <button
            type="button"
            aria-pressed={showNeeds}
            onClick={() => setShowNeeds((v) => !v)}
            className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors", showNeeds ? "border-info bg-info text-white" : "border-info/40 bg-background text-info hover:bg-info/10")}
          >
            <HandHeart className="size-4" aria-hidden /> {t.feed.foodRequests}
          </button>
          <span className="mx-1 hidden w-px bg-line sm:block" aria-hidden />
          <Chip active={diet === "VEG"} onClick={() => setDiet(diet === "VEG" ? undefined : "VEG")}>{t.feed.veg}</Chip>
          <Chip active={diet === "NON_VEG"} onClick={() => setDiet(diet === "NON_VEG" ? undefined : "NON_VEG")}>{t.feed.nonveg}</Chip>
          <span className="mx-1 hidden w-px bg-line sm:block" aria-hidden />
          {[60, 120, 240].map((m) => (
            <Chip key={m} active={maxMin === m} onClick={() => setMaxMin(maxMin === m ? undefined : m)}>
              {fmt(t.feed.underH, { h: m / 60 })}
            </Chip>
          ))}
          <span className="mx-1 hidden w-px bg-line sm:block" aria-hidden />
          {(["COOKED", "PACKAGED", "RAW"] as const).map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? undefined : c)}>
              {t.labels.category[c]}
            </Chip>
          ))}
        </div>
      </div>

      {isError ? (
        <ErrorState message={t.states.error} onRetry={() => refetch()} />
      ) : isPending ? (
        <CardSkeletons n={6} />
      ) : data.items.length === 0 && !(showNeeds && needsQ.data?.items.length) ? (
        <EmptyState art="search" title={t.feed.emptyTitle} description={t.feed.emptyBody} action={<Button variant="outline" onClick={() => { setQ(""); setArea(""); setDiet(undefined); setCategory(undefined); setMaxMin(undefined); }}>{t.feed.clear}</Button>} />
      ) : (
        <>
          {showNeeds && <h3 className="mb-3 font-display text-lg font-semibold">{t.feed.available} <span className="text-sm font-normal text-muted-foreground">({data.total})</span></h3>}
          {data.items.length === 0 && <p className="mb-4 text-sm text-muted-foreground">{t.feed.noneWithFilters}</p>}
          <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity", isPlaceholderData && "opacity-60")} aria-live="polite">
            {data.items.map((o, i) => (
              <PostCard key={o.id} offer={o} index={i} onOpen={() => setSelected(o)} onContact={() => contact(o)} actionLabel={me?.role === "GIVER" ? t.feed.view : t.feed.contact} className={i >= 4 ? "hidden lg:flex" : i >= 2 ? "hidden sm:flex" : undefined} />
            ))}
          </div>
          {data.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="‹" className="size-11 rounded-xl">
                <ChevronLeft />
              </Button>
              <span className="tabular text-sm text-muted-foreground">
                {fmt(t.feed.page, { page: data.page, pages: data.pages })}
              </span>
              <Button variant="outline" size="icon" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="›" className="size-11 rounded-xl">
                <ChevronRight />
              </Button>
            </nav>
          )}

          {showNeeds && (
            <div className="mt-10" aria-live="polite">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                <HandHeart className="size-5 text-info" aria-hidden /> {t.feed.receiversAsking}{" "}
                <span className="text-sm font-normal text-muted-foreground">({needsQ.data?.total ?? 0})</span>
              </h3>
              {needsQ.isPending ? (
                <CardSkeletons n={3} />
              ) : needsQ.isError ? (
                <ErrorState message={t.states.error} onRetry={() => needsQ.refetch()} />
              ) : needsQ.data.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed bg-background p-6 text-center text-sm text-muted-foreground">{t.feed.noRequests}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {needsQ.data.items.map((n, i) => (
                    <NeedCard key={n.id} need={n} index={i} disabled={me?.role === "TAKER"} actionLabel={me?.role === "TAKER" ? t.feed.cannotOffer : t.feed.canGive} onAction={() => offerToNeed(n)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <OfferDetail offer={selected} onClose={() => setSelected(null)} onContact={contact} role={me?.role} />

      <Dialog open={!!loginFor} onOpenChange={(o) => !o && setLoginFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{loginFor?.kind === "need" ? t.feed.loginAsGiver : t.gate.loginToClaim}</DialogTitle>
            <DialogDescription>
              {loginFor?.kind === "need" ? fmt(t.feed.dlgNeed, { who: loginFor.who, title: loginFor.title }) : fmt(t.feed.dlgOffer, { who: loginFor?.who ?? "", title: loginFor?.title ?? "" })} {t.feed.newHere}{" "}
              <a className="font-medium text-primary underline" href="/signup">
                {t.feed.createAccount}
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <LoginForm compact onDone={() => { const g = loginFor; setLoginFor(null); router.push(g?.kind === "need" ? "/dashboard/nearby" : `/dashboard/offers/${g?.id}`); router.refresh(); }} />
        </DialogContent>
      </Dialog>
      </div>
    </section>
  );
}

function OfferDetail({ offer, onClose, onContact, role }: { offer: PublicOffer | null; onClose: () => void; onContact: (o: PublicOffer) => void; role?: string }) {
  const t = useT();
  return (
    <Dialog open={!!offer} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        {offer && (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <CategoryChip category={offer.category} />
                <div>
                  <DialogTitle className="text-xl">{offer.title}</DialogTitle>
                  <DialogDescription>
                    {offer.quantityMeals} {t.common.meals} · {offer.area}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-1.5">
              <DietBadge diet={offer.diet} />
              <ModeChip mode={offer.mode} />
            </div>
            {offer.description && <p className="text-sm text-muted-foreground">{offer.description}</p>}
            <BigCountdown expiresAt={offer.expiresAt} startAt={offer.createdAt} caption={t.feed.safeUntil} />
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
              <Avatar name={offer.giverName} kind={offer.giverKind} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{offer.giverName}</p>
                <p className="text-xs text-muted-foreground">{kindLabel(offer.giverKind)} · {t.feed.trustWord} {offer.giverTrust}</p>
              </div>
            </div>
            {offer.lat != null && offer.lng != null && (
              <div>
                <MapView height={180} zoom={13} center={[offer.lat, offer.lng]} markers={[{ id: "a", lat: offer.lat, lng: offer.lng, color: "#088178", label: fmt(t.feed.around, { area: offer.area }) }]} />
                <p className="mt-1.5 text-xs text-muted-foreground">{t.feed.approx}</p>
              </div>
            )}
            {role !== "GIVER" && (
              <Button className="h-12 rounded-xl text-base" onClick={() => onContact(offer)}>
                {role ? t.feed.contactGiver : t.gate.loginToClaim}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
