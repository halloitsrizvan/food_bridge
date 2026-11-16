"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MapView } from "@/components/map/map-view";
import { Avatar, CategoryChip, DietBadge, kindLabel, ModeChip, TierBadge } from "@/components/shared/badges";
import { BigCountdown } from "@/components/shared/countdown-ring";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { WhyMatch } from "@/components/shared/match-breakdown";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { OFFER_STEPS, offerStep, StatusStepper } from "@/components/shared/status-stepper";
import { Button } from "@/components/ui/button";
import { useCancelOffer, useClaimOffer, useMe, useMyOffers, useOffer, useTakerSuggestions } from "@/lib/api/hooks";

export function OfferPage({ id }: { id: string }) {
  const router = useRouter();
  const { data: me } = useMe();
  const { data: o, isPending, isError, error, refetch } = useOffer(id);
  const claim = useClaimOffer();
  const cancel = useCancelOffer();
  const mine = useMyOffers();
  const isOwner = me?.role === "GIVER" && !!mine.data?.some((x) => x.id === id);
  const suggestions = useTakerSuggestions(isOwner ? id : undefined);
  const [confirm, setConfirm] = useState(false);

  if (isPending) return <PageSkeleton />;
  if (isError || !o) return <ErrorState message={error?.message ?? "This post is no longer available"} onRetry={() => refetch()} />;
  const mineRow = mine.data?.find((x) => x.id === id);

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <header className="flex items-start gap-3">
        <CategoryChip category={o.category} className="size-12" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{o.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <DietBadge diet={o.diet} />
            <ModeChip mode={o.mode} />
            <span className="text-sm text-muted-foreground">{o.quantityMeals} meals · {o.area}</span>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        <section className="flex flex-col items-center gap-4 rounded-[20px] border bg-surface p-6 shadow-soft">
          <BigCountdown expiresAt={o.expiresAt} startAt={o.createdAt} caption="Safe until" />
          {isOwner && <StatusStepper className="mt-2" steps={OFFER_STEPS} current={offerStep(o.status)} />}
        </section>

        <section className="space-y-4 rounded-[20px] border bg-surface p-5 shadow-soft">
          {o.description && <p className="text-sm text-muted-foreground">{o.description}</p>}
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
            <Avatar name={o.giverName} kind={o.giverKind} size={40} />
            <div className="flex-1">
              <p className="text-sm font-semibold">{o.giverName}</p>
              <p className="text-xs text-muted-foreground">{kindLabel(o.giverKind)} · trust {o.giverTrust}</p>
            </div>
            <TierBadge tier={o.giverTier} />
          </div>
          {o.lat != null && o.lng != null && <MapView height={200} center={[o.lat, o.lng]} zoom={13} markers={[{ id: "a", lat: o.lat, lng: o.lng, color: "#088178", label: `Around ${o.area}` }]} />}

          {me?.role === "TAKER" && (
            <>
              <Button
                className="h-12 w-full rounded-xl text-base"
                disabled={o.status !== "OPEN" || claim.isPending || me.status !== "ACTIVE"}
                onClick={() => claim.mutate({ offerId: id }, { onSuccess: (r) => { toast.success("Request sent. The giver has 15 minutes to accept."); router.push(`/dashboard/claims/${r.id}`); }, onError: (e) => toast.error(e.message) })}
              >
                {claim.isPending ? "Sending..." : o.status === "OPEN" ? "Request this food" : "Already contacted"}
              </Button>
              <p className="text-xs text-muted-foreground">Exact address and phone are shared only after the giver accepts.</p>
            </>
          )}
        </section>
      </div>

      {isOwner && (
        <>
          <section className="space-y-3" aria-label="Best receivers">
            <h2 className="font-display text-xl font-semibold">Best receivers for this food</h2>
            {suggestions.isPending ? <PageSkeleton /> : !suggestions.data?.length ? (
              <EmptyState art="search" title="No reachable receivers yet" description="We widen the search automatically (3 → 6 → 10 km) as time passes, and alert the government team if it is still unmatched." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {suggestions.data.map((s) => (
                  <article key={s.takerId} className="space-y-3 rounded-[20px] border bg-surface p-5 shadow-soft">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} kind={s.kind} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{kindLabel(s.kind)} · {s.area}{s.members ? ` · ${s.members} members` : ""} · {s.match.distanceKm} km</p>
                      </div>
                    </div>
                    <WhyMatch match={s.match} />
                  </article>
                ))}
              </div>
            )}
          </section>
          {mineRow && (
            <div className="flex flex-wrap gap-2">
              {mineRow.claimId && <Link href={`/dashboard/claims/${mineRow.claimId}`} className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground">Open handover</Link>}
              {o.status === "OPEN" && <Button variant="outline" className="h-11 rounded-xl text-clay" onClick={() => setConfirm(true)}>Cancel post</Button>}
            </div>
          )}
          <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Cancel this post?" description="Receivers will no longer see it." confirmLabel="Cancel post" destructive busy={cancel.isPending} onConfirm={() => cancel.mutate(id, { onSuccess: () => { toast("Post cancelled"); router.push("/dashboard"); }, onError: (e) => toast.error(e.message) })} />
        </>
      )}
    </div>
  );
}
