"use client";

import { Pencil, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ClaimCard } from "@/components/claims/claim-card";
import { Avatar, DietBadge, kindLabel } from "@/components/shared/badges";
import { CountdownRing } from "@/components/shared/countdown-ring";
import { WhyMatch } from "@/components/shared/match-breakdown";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { OFFER_STEPS, offerStep, StatusStepper } from "@/components/shared/status-stepper";
import { TrustGauge } from "@/components/shared/trust-gauge";
import { buttonVariants, Button } from "@/components/ui/button";
import { useContactNeed, useMyClaims, useMyOffers, useNeedsNear } from "@/lib/api/hooks";
import { formatLeft } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import type { ProfileDTO } from "@/lib/schemas/profile";
import { cn } from "@/lib/utils";

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-[20px] border bg-surface p-3 shadow-soft sm:p-4">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular sm:text-3xl">{value}</p>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function GiverHome({ me }: { me: ProfileDTO }) {
  const offers = useMyOffers();
  const claims = useMyClaims();
  const needs = useNeedsNear();
  const contact = useContactNeed();
  const [pendingNeed, setPendingNeed] = useState<string | null>(null);
  const now = useNow();

  if (offers.isPending || claims.isPending) return <PageSkeleton />;
  if (offers.isError) return <ErrorState message={offers.error.message} onRetry={() => offers.refetch()} />;

  const done = (claims.data ?? []).filter((c) => c.status === "COMPLETED");
  const meals = done.reduce((s, c) => s + (c.mealsDelivered ?? 0), 0);
  const inbox = (claims.data ?? []).filter((c) => c.status === "PENDING" || c.status === "ACCEPTED");
  const live = (offers.data ?? []).filter((o) => ["OPEN", "CONTACTED", "SETTLED"].includes(o.status) && new Date(o.expiresAt) > new Date());
  const past = (offers.data ?? []).filter((o) => !live.includes(o));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Hello, {me.name}</h1>
          <p className="flex items-center gap-2 text-muted-foreground">
            {kindLabel(me.giverKind)} · {me.area}
          </p>
        </div>
        <Link href="/dashboard/post" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full gap-2 px-7 text-base shadow-lift sm:h-14 sm:w-auto")}>
          <Plus className="size-5" aria-hidden /> Post surplus food
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Meals shared" value={meals} sub={`${done.length} handovers`} />
        <Stat label="Points" value={me.points} sub="earned from handovers" />
        <div className="flex items-center justify-center rounded-[20px] border bg-surface p-4 shadow-soft">
          <TrustGauge score={me.trustScore} />
        </div>
        <Stat label="Live posts" value={live.length} sub={`${inbox.filter((c) => c.can.accept).length} waiting for you`} />
      </div>

      {inbox.length > 0 && (
        <section aria-label="Claims inbox" className="space-y-3">
          <h2 className="font-display text-lg font-semibold sm:text-xl">Claims inbox</h2>
          <div className="grid gap-4 md:grid-cols-2">{inbox.map((c) => <ClaimCard key={c.id} claim={c} />)}</div>
        </section>
      )}

      <section aria-label="My posts" className="space-y-3">
        <h2 className="font-display text-lg font-semibold sm:text-xl">My posts</h2>
        {live.length === 0 ? (
          <EmptyState title="Nothing posted right now" description="Post surplus food and we alert the nearest receivers who can reach you in time." action={<Link href="/dashboard/post" className={cn(buttonVariants(), "rounded-xl")}>Post food</Link>} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {live.map((o) => (
              <article key={o.id} className="space-y-4 rounded-[20px] border bg-surface p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/offers/${o.id}`} className="font-display text-base font-semibold hover:underline">{o.title}</Link>
                    <p className="text-sm text-muted-foreground">{o.quantityMeals} meals</p>
                    <DietBadge diet={o.diet} className="mt-1" />
                  </div>
                  <CountdownRing expiresAt={o.expiresAt} startAt={o.createdAt} size={52} />
                </div>
                <StatusStepper steps={OFFER_STEPS} current={offerStep(o.status)} />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Link href={o.claimId ? `/dashboard/claims/${o.claimId}` : `/dashboard/offers/${o.id}`} className="text-sm font-medium text-primary hover:underline">
                    {o.claimId ? "Open handover" : "See matches"}
                  </Link>
                  {o.status === "OPEN" && (
                    <Link href={`/dashboard/offers/${o.id}/edit`} className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-primary">
                      <Pencil className="size-3.5" aria-hidden /> Edit
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-label="Needs near you" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold sm:text-xl">Needs near you</h2>
          <Link href="/dashboard/nearby" className="text-sm font-medium text-primary hover:underline">See on map</Link>
        </div>
        {needs.isPending ? (
          <PageSkeleton />
        ) : !needs.data?.length ? (
          <EmptyState art="inbox" title="No open needs nearby" description="When institutions and families post needs within reach, they show here, best match first." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {needs.data.slice(0, 6).map((n) => (
              <article key={n.id} className="space-y-3 rounded-[20px] border bg-surface p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <Avatar name={n.takerName} kind={n.takerKind} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display font-semibold">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.takerName} · {n.area} · {n.mealsNeeded} meals{n.members ? ` · ${n.members} members` : ""}</p>
                  </div>
                  <span className="text-right text-xs text-muted-foreground">by<br /><b className="tabular text-foreground">{now ? formatLeft(new Date(n.neededBy).getTime() - now) : "…"}</b></span>
                </div>
                {n.match ? <WhyMatch match={n.match} /> : <p className="text-xs text-muted-foreground">Post food to see how well it matches.</p>}
                <Button
                  className="h-10 w-full rounded-xl"
                  disabled={!n.forOfferId || (n.match?.score ?? 0) === 0 || (contact.isPending && pendingNeed === n.id) || me.status !== "ACTIVE"}
                  onClick={() => {
                    setPendingNeed(n.id);
                    contact.mutate({ needId: n.id, offerId: n.forOfferId! }, { onSuccess: () => toast.success("Offer sent. They have 15 minutes to accept."), onError: (e) => toast.error(e.message) });
                  }}
                >
                  {n.forOfferId ? "Offer my food" : "Post food first"}
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      {(done.length > 0 || past.length > 0) && (
        <section aria-label="History" className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold"><Trophy className="size-5 text-saffron" aria-hidden /> History and certificates</h2>
          <ul className="divide-y rounded-[20px] border bg-surface shadow-soft">
            {done.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.offer.title}</p>
                  <p className="text-xs text-muted-foreground">{c.mealsDelivered} meals to {c.taker.name}</p>
                </div>
                <span className="text-sm font-semibold text-primary">+{c.pointsEarned ?? 0} pts</span>
                <Link href={`/dashboard/claims/${c.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-lg")}>Certificate</Link>
              </li>
            ))}
            {past.filter((o) => o.status !== "DELIVERED").slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                <span className="flex-1">{o.title}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{o.status.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
