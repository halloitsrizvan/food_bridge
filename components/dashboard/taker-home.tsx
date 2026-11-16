"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClaimCard } from "@/components/claims/claim-card";
import { PostCard } from "@/components/shared/post-card";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { NEED_STEPS, needStep, StatusStepper } from "@/components/shared/status-stepper";
import { TrustGauge } from "@/components/shared/trust-gauge";
import { buttonVariants, Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCancelNeed, useClaimOffer, useFeed, useMyClaims, useMyNeeds, useOpenToReceive } from "@/lib/api/hooks";
import { formatLeft, KIND_LABEL } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import type { ProfileDTO } from "@/lib/schemas/profile";
import { cn } from "@/lib/utils";
import { Stat } from "./giver-home";

export function TakerHome({ me }: { me: ProfileDTO }) {
  const router = useRouter();
  const toggle = useOpenToReceive();
  const feed = useFeed();
  const needs = useMyNeeds();
  const claims = useMyClaims();
  const claim = useClaimOffer();
  const cancelNeed = useCancelNeed();
  const now = useNow();

  const done = (claims.data ?? []).filter((c) => c.status === "COMPLETED");
  const meals = done.reduce((s, c) => s + (c.mealsDelivered ?? 0), 0);
  const active = (claims.data ?? []).filter((c) => c.status === "PENDING" || c.status === "ACCEPTED");
  const toRate = done.filter((c) => c.can.review);
  const openNeeds = (needs.data ?? []).filter((n) => ["OPEN", "CONTACTED", "SETTLED"].includes(n.status) && new Date(n.neededBy) > new Date());

  return (
    <div className="space-y-8">
      <section className={cn("flex flex-col items-start justify-between gap-4 rounded-[24px] p-5 shadow-soft transition-colors sm:flex-row sm:items-center sm:p-6", me.openToReceive ? "bg-primary text-primary-foreground" : "border bg-surface")} aria-label="Open to receive">
        <div>
          <p className="font-display text-xl font-semibold sm:text-2xl">{me.openToReceive ? "Open to receive food" : "Not receiving right now"}</p>
          <p className={cn("text-sm", me.openToReceive ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {me.openToReceive ? "Givers nearby will see you and we alert you when food is reachable." : "You will not be matched or notified until you switch back on."}
          </p>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
          {me.openToReceive ? "On" : "Off"}
          <Switch checked={me.openToReceive} disabled={me.status !== "ACTIVE"} onCheckedChange={(v) => toggle.mutate(v, { onError: (e) => toast.error(e.message) })} aria-label="Open to receive food" className="scale-125" />
        </label>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Meals received" value={meals} sub={`${done.length} handovers`} />
        <Stat label="Members" value={me.members ?? "-"} sub={KIND_LABEL[me.takerKind ?? ""] ?? ""} />
        <Stat label="Open requests" value={openNeeds.length + active.length} sub="needs and claims" />
        <div className="flex items-center justify-center rounded-[20px] border bg-surface p-4 shadow-soft"><TrustGauge score={me.trustScore} /></div>
      </div>

      {toRate.length > 0 && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl bg-saffron/15 p-4">
          <p className="flex-1 text-sm font-medium">How was the food from {toRate[0].giver.name}? Your rating helps the next receiver.</p>
          <Link href={`/dashboard/claims/${toRate[0].id}`} className={cn(buttonVariants({ size: "sm" }), "rounded-lg")}>Rate now</Link>
        </div>
      )}

      {active.length > 0 && (
        <section aria-label="Active claims" className="space-y-3">
          <h2 className="font-display text-lg font-semibold sm:text-xl">Active handovers</h2>
          <div className="grid gap-4 md:grid-cols-2">{active.map((c) => <ClaimCard key={c.id} claim={c} />)}</div>
        </section>
      )}

      <section aria-label="Food near you" className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold sm:text-xl">Food near you</h2>
            <p className="text-sm text-muted-foreground">Only food that can reach you before it spoils, best match first.</p>
          </div>
        </div>
        {feed.isPending ? (
          <PageSkeleton />
        ) : feed.isError ? (
          <ErrorState message={feed.error.message} onRetry={() => feed.refetch()} />
        ) : feed.data.length === 0 ? (
          <EmptyState title="No reachable food right now" description="We will alert you the moment something safe and nearby is posted." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feed.data.map((o, i) => (
              <PostCard key={o.id} offer={o} index={i} busy={claim.isPending && claim.variables?.offerId === o.id} onOpen={() => router.push(`/dashboard/offers/${o.id}`)} onContact={() => claim.mutate({ offerId: o.id }, { onSuccess: (r) => { toast.success("Request sent. The giver has 15 minutes to accept."); router.push(`/dashboard/claims/${r.id}`); }, onError: (e) => toast.error(e.message) })} actionLabel="Request this food" />
            ))}
          </div>
        )}
      </section>

      <section aria-label="My needs" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold sm:text-xl">My needs</h2>
          <Link href="/dashboard/needs/new" className={cn(buttonVariants({ variant: "outline" }), "h-10 gap-1.5 rounded-xl")}><Plus className="size-4" aria-hidden /> Post a need</Link>
        </div>
        {!needs.data?.length ? (
          <EmptyState art="inbox" title="No needs posted" description="Tell givers what you need and when. They can offer food directly." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {needs.data.map((n) => (
              <article key={n.id} className="space-y-4 rounded-[20px] border bg-surface p-5 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display font-semibold">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.mealsNeeded} meals · by <span className="tabular">{now ? formatLeft(new Date(n.neededBy).getTime() - now) : "…"}</span></p>
                  </div>
                  {n.status === "OPEN" && (
                    <Button variant="ghost" size="sm" className="text-clay" disabled={cancelNeed.isPending} onClick={() => cancelNeed.mutate(n.id, { onSuccess: () => toast("Need cancelled"), onError: (e) => toast.error(e.message) })}>
                      Cancel
                    </Button>
                  )}
                </div>
                {["EXPIRED", "CANCELLED"].includes(n.status) ? <p className="text-sm text-muted-foreground">{n.status.toLowerCase()}</p> : <StatusStepper steps={NEED_STEPS} current={needStep(n.status)} />}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
