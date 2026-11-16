"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MapView } from "@/components/map/map-view";
import { Avatar, CategoryChip, DietBadge, kindLabel, ModeChip, TierBadge } from "@/components/shared/badges";
import { BigCountdown } from "@/components/shared/countdown-ring";
import { PostCard } from "@/components/shared/post-card";
import { CardSkeletons, EmptyState, ErrorState } from "@/components/shared/states";
import { LoginForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMe, useOffers, type OfferFilters } from "@/lib/api/hooks";
import { CATEGORY_LABEL } from "@/lib/format";
import { t } from "@/lib/i18n/en";
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
  const [loginFor, setLoginFor] = useState<PublicOffer | null>(null);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ q?: string; category?: string; diet?: string }>).detail ?? {};
      setQ(d.q ?? "");
      setCategory(d.category);
      setDiet(d.diet);
    };
    window.addEventListener("fb:filter", on);
    return () => window.removeEventListener("fb:filter", on);
  }, []);
  const dq = useDebounced(q);
  const darea = useDebounced(area);
  // page resets whenever any filter changes (derived, no effect)
  const filterKey = JSON.stringify([dq, darea, diet, category, maxMin, sort, loc.lat, loc.lng]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const setPage = (fn: (p: number) => number) => setPageState({ key: filterKey, page: fn(page) });
  const filters: OfferFilters = { q: dq || undefined, area: darea || undefined, diet, category, maxMinutesLeft: maxMin, sort: sort === "nearest" && !located ? "soonest" : sort, page, limit: 9, lat: loc.lat ?? undefined, lng: loc.lng ?? undefined };
  const { data, isPending, isError, refetch, isPlaceholderData } = useOffers(filters);

  function contact(o: PublicOffer) {
    if (!me) return setLoginFor(o); // claim needs a login: open the modal, then continue
    if (me.role === "GIVER") return setSelected(o);
    router.push(`/dashboard/offers/${o.id}`);
  }

  return (
    <section id="live" className="scroll-mt-32 bg-secondary py-14">
      <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold sm:text-4xl">Best Food Near {loc.place ?? "You"}</h2>
          <p className="text-muted-foreground">{t.landing.liveSub}</p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Sort">
          {located ? (
            <Chip active={sort === "nearest"} onClick={() => setSort("nearest")}>
              Nearest
            </Chip>
          ) : (
            <Chip active={false} onClick={() => requestLocation(true)}>
              {loc.status === "asking" ? "Locating..." : "Use my location"}
            </Chip>
          )}
          <Chip active={sort === "soonest"} onClick={() => setSort("soonest")}>
            Soonest expiring
          </Chip>
          <Chip active={sort === "newest"} onClick={() => setSort("newest")}>
            Newest
          </Chip>
        </div>
      </div>

      <div className="mb-6 space-y-3 rounded-[20px] border bg-background p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input aria-label="Search food" placeholder="Search biryani, sadhya, bread..." value={q} onChange={(e) => setQ(e.target.value)} className="h-11 rounded-xl pl-9" />
          </div>
          <Input aria-label="Filter by area" placeholder="Area (e.g. Palayam)" value={area} onChange={(e) => setArea(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
          <Chip active={diet === "VEG"} onClick={() => setDiet(diet === "VEG" ? undefined : "VEG")}>Veg</Chip>
          <Chip active={diet === "NON_VEG"} onClick={() => setDiet(diet === "NON_VEG" ? undefined : "NON_VEG")}>Non-veg</Chip>
          <span className="mx-1 hidden w-px bg-line sm:block" aria-hidden />
          {[60, 120, 240].map((m) => (
            <Chip key={m} active={maxMin === m} onClick={() => setMaxMin(maxMin === m ? undefined : m)}>
              Under {m / 60}h left
            </Chip>
          ))}
          <span className="mx-1 hidden w-px bg-line sm:block" aria-hidden />
          {(["COOKED", "PACKAGED", "RAW"] as const).map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? undefined : c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
      </div>

      {isError ? (
        <ErrorState message={t.states.error} onRetry={() => refetch()} />
      ) : isPending ? (
        <CardSkeletons n={6} />
      ) : data.items.length === 0 ? (
        <EmptyState art="search" title="No food matches right now" description="Try clearing a filter. New surplus is posted all day, and the list updates on its own." action={<Button variant="outline" onClick={() => { setQ(""); setArea(""); setDiet(undefined); setCategory(undefined); setMaxMin(undefined); }}>Clear filters</Button>} />
      ) : (
        <>
          <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity", isPlaceholderData && "opacity-60")} aria-live="polite">
            {data.items.map((o, i) => (
              <PostCard key={o.id} offer={o} index={i} onOpen={() => setSelected(o)} onContact={() => contact(o)} actionLabel={me?.role === "GIVER" ? "View" : "Contact"} />
            ))}
          </div>
          {data.pages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page" className="size-11 rounded-xl">
                <ChevronLeft />
              </Button>
              <span className="tabular text-sm text-muted-foreground">
                Page {data.page} of {data.pages}
              </span>
              <Button variant="outline" size="icon" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page" className="size-11 rounded-xl">
                <ChevronRight />
              </Button>
            </nav>
          )}
        </>
      )}

      <OfferDetail offer={selected} onClose={() => setSelected(null)} onContact={contact} role={me?.role} />

      <Dialog open={!!loginFor} onOpenChange={(o) => !o && setLoginFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.gate.loginToClaim}</DialogTitle>
            <DialogDescription>
              Log in as a receiver to contact <b>{loginFor?.giverName}</b> about “{loginFor?.title}”. New here?{" "}
              <a className="font-medium text-primary underline" href="/signup">
                Create an account
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <LoginForm compact onDone={() => { const id = loginFor?.id; setLoginFor(null); router.push(`/dashboard/offers/${id}`); router.refresh(); }} />
        </DialogContent>
      </Dialog>
      </div>
    </section>
  );
}

function OfferDetail({ offer, onClose, onContact, role }: { offer: PublicOffer | null; onClose: () => void; onContact: (o: PublicOffer) => void; role?: string }) {
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
                    {offer.quantityMeals} meals · {offer.area}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-1.5">
              <DietBadge diet={offer.diet} />
              <ModeChip mode={offer.mode} />
            </div>
            {offer.description && <p className="text-sm text-muted-foreground">{offer.description}</p>}
            <BigCountdown expiresAt={offer.expiresAt} startAt={offer.createdAt} caption="Safe to hand over until" />
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
              <Avatar name={offer.giverName} kind={offer.giverKind} />
              <div className="flex-1">
                <p className="text-sm font-semibold">{offer.giverName}</p>
                <p className="text-xs text-muted-foreground">{kindLabel(offer.giverKind)} · trust {offer.giverTrust}</p>
              </div>
              <TierBadge tier={offer.giverTier} />
            </div>
            {offer.lat != null && offer.lng != null && (
              <div>
                <MapView height={180} zoom={13} center={[offer.lat, offer.lng]} markers={[{ id: "a", lat: offer.lat, lng: offer.lng, color: "#088178", label: `Around ${offer.area}` }]} />
                <p className="mt-1.5 text-xs text-muted-foreground">Approximate area only. The exact address is shared after the giver accepts.</p>
              </div>
            )}
            {role !== "GIVER" && (
              <Button className="h-12 rounded-xl text-base" onClick={() => onContact(offer)}>
                {role ? "Contact this giver" : t.gate.loginToClaim}
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
