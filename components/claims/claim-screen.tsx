"use client";

import { ArrowLeft, Download, ExternalLink, Flag, MapPin, MessageCircle, Phone, Share2, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MapView } from "@/components/map/map-view";
import { Avatar, CategoryChip, DietBadge, kindLabel, ModeChip } from "@/components/shared/badges";
import { BigCountdown } from "@/components/shared/countdown-ring";
import { MatchBreakdown } from "@/components/shared/match-breakdown";
import { ErrorState, PageSkeleton } from "@/components/shared/states";
import { StatusStepper } from "@/components/shared/status-stepper";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAcceptClaim, useClaim, useComplain, useDeclineClaim, usePendingReview, useReview } from "@/lib/api/hooks";
import type { ClaimView, Party } from "@/lib/schemas/claim";
import { cn } from "@/lib/utils";
import { Confetti } from "./confetti";
import { OtpDisplay, OtpEntry, STATUS_LABEL, STATUS_STYLE } from "./claim-card";

const STEPS = ["Requested", "Accepted", "Delivered"];

function stepOf(c: ClaimView) {
  if (c.status === "PENDING") return 0;
  if (c.status === "ACCEPTED") return 1;
  if (c.status === "COMPLETED") return 2;
  return c.acceptedAt ? 1 : 0;
}

function Contact({ p }: { p: Party }) {
  if (!p.phone) return null;
  const digits = p.phone.replace(/\D/g, "");
  const dest = p.lat != null && p.lng != null ? `${p.lat},${p.lng}` : "";
  const mapsHref = p.mapsUrl || (dest ? `https://www.google.com/maps/dir/?api=1&destination=${dest}` : null);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-primary/8 p-3 text-sm">
        <p className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> <span>{p.address}</span>
        </p>
        <p className="mt-1 pl-6 text-muted-foreground">{p.phone}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <a href={`tel:${p.phone}`} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border bg-surface text-sm font-medium hover:bg-muted">
          <Phone className="size-4" aria-hidden /> Call
        </a>
        <a href={`https://wa.me/${digits}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border bg-surface text-sm font-medium hover:bg-muted">
          <MessageCircle className="size-4" aria-hidden /> WhatsApp
        </a>
        {mapsHref && (
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <ExternalLink className="size-4" aria-hidden /> Maps
          </a>
        )}
      </div>
    </div>
  );
}

function ReviewDialog({ claim, open, onOpenChange, required }: { claim: ClaimView; open: boolean; onOpenChange: (o: boolean) => void; required?: boolean }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const review = useReview();
  const other = claim.viewerRole === "GIVER" ? claim.taker : claim.giver;
  return (
    <Dialog open={open} onOpenChange={(o) => (required ? undefined : onOpenChange(o))}>
      <DialogContent showCloseButton={!required}>
        <DialogHeader>
          <DialogTitle>Rate {other.name}</DialogTitle>
          <DialogDescription>{required ? "A review is required before you can continue. Honest ratings keep the network trustworthy." : "Honest ratings keep the network trustworthy."}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} className="grid size-11 place-items-center rounded-xl hover:bg-muted">
              <Star className={cn("size-8", n <= rating ? "fill-saffron text-saffron" : "text-line")} />
            </button>
          ))}
        </div>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={500} placeholder="Optional comment" aria-label="Comment" />
        <DialogFooter>
          <Button disabled={review.isPending} onClick={() => review.mutate({ id: claim.id, rating, comment }, { onSuccess: () => { toast.success("Thanks for the feedback"); onOpenChange(false); }, onError: (e) => toast.error(e.message) })}>
            {review.isPending ? "Sending..." : "Submit rating"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComplaintDialog({ claim, open, onOpenChange }: { claim: ClaimView; open: boolean; onOpenChange: (o: boolean) => void }) {
  const [reason, setReason] = useState("");
  const complain = useComplain();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>Complaints are weighted by your own trust score and reviewed by the government team. Repeated complaints suspend an account.</DialogDescription>
        </DialogHeader>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} maxLength={1000} placeholder="What went wrong?" aria-label="Reason" />
        <DialogFooter>
          <Button variant="destructive" disabled={reason.trim().length < 10 || complain.isPending} onClick={() => complain.mutate({ id: claim.id, reason }, { onSuccess: () => { toast.success("Complaint filed"); onOpenChange(false); }, onError: (e) => toast.error(e.message) })}>
            {complain.isPending ? "Sending..." : "File complaint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Celebration({ claim, open, onClose }: { claim: ClaimView; open: boolean; onClose: () => void }) {
  const isGiver = claim.viewerRole === "GIVER";
  async function share() {
    const url = `${window.location.origin}/verify/${claim.id}`;
    try {
      if (navigator.share) await navigator.share({ title: "FoodBridge certificate", text: `We saved ${claim.mealsDelivered} meals!`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Verification link copied");
      }
    } catch {
      /* cancelled */
    }
  }
  return (
    <>
      {open && <Confetti />}
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">{isGiver ? "You saved " + claim.mealsDelivered + " meals!" : "Handover complete"}</DialogTitle>
            <DialogDescription>{isGiver ? `+${claim.pointsEarned ?? 0} points added to your account.` : "Thank you for confirming. Next, please rate the giver. A review is required."}</DialogDescription>
          </DialogHeader>
          {isGiver ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/v1/posters/${claim.id}`} alt="Your congratulations poster" className="mx-auto max-h-[58vh] w-auto rounded-2xl border shadow-soft" width={1080} height={1350} />
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            {isGiver && (
              <div className="flex gap-2">
                <a href={`/api/v1/posters/${claim.id}`} download={`foodbridge-${claim.id.slice(0, 8)}.png`} className="inline-flex h-10 items-center gap-1.5 rounded-xl border px-4 text-sm font-medium hover:bg-muted">
                  <Download className="size-4" aria-hidden /> Download PNG
                </a>
                <Button variant="outline" className="h-10 gap-1.5 rounded-xl" onClick={share}>
                  <Share2 className="size-4" aria-hidden /> Share
                </Button>
              </div>
            )}
            <Button className="h-10 rounded-xl" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ClaimScreen({ id, initialCode }: { id: string; initialCode?: string }) {
  const { data: c, isPending, isError, error, refetch } = useClaim(id);
  const accept = useAcceptClaim();
  const decline = useDeclineClaim();
  const [reviewOpen, setReviewOpen] = useState(false);
  const pending = usePendingReview().data;
  const [complainOpen, setComplainOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    if (!c) return;
    if (prev.current && prev.current !== "COMPLETED" && c.status === "COMPLETED") setCelebrate(true); // live flip: handover just finished
    prev.current = c.status;
  }, [c]);

  const mustReview = !!c && c.status === "COMPLETED" && c.can.review && pending?.claimId === c.id;
  const celebrateShown = celebrate && c?.status === "COMPLETED";

  if (isPending) return <PageSkeleton />;
  if (isError || !c) return <ErrorState message={error?.message ?? "Could not load this handover"} onRetry={() => refetch()} />;

  const other = c.viewerRole === "GIVER" ? c.taker : c.giver;
  const failed = c.status === "DECLINED" ? "Declined" : c.status === "EXPIRED" ? "Expired" : null;
  const countdownTarget = c.status === "PENDING" ? c.holdUntil : c.offer.expiresAt;
  const mapMarkers = [
    c.giver.lat != null && c.giver.lng != null ? { id: "giver", lat: c.giver.lat, lng: c.giver.lng, color: "#088178", label: `Giver: ${c.giver.name}`, size: 22 } : null,
    c.taker.lat != null && c.taker.lng != null ? { id: "taker", lat: c.taker.lat, lng: c.taker.lng, color: "#2F6F8F", label: `Receiver: ${c.taker.name}`, size: 22 } : null,
  ].filter((m) => m !== null);
  const line = mapMarkers.length === 2 ? ([[mapMarkers[0].lat, mapMarkers[0].lng], [mapMarkers[1].lat, mapMarkers[1].lng]] as [[number, number], [number, number]]) : null;

  return (
    <div className="space-y-6">
      <Link href="/dashboard/claims" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All handovers
      </Link>

      <header className="flex flex-wrap items-start gap-3">
        <CategoryChip category={c.offer.category} className="size-12" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words font-display text-xl font-semibold sm:text-3xl">{c.offer.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[c.status])}>{STATUS_LABEL[c.status]}</span>
            <DietBadge diet={c.offer.diet} />
            <ModeChip mode={c.offer.mode} />
            <span className="text-sm text-muted-foreground">{c.offer.quantityMeals} meals</span>
          </div>
        </div>
      </header>

      <div className="rounded-[20px] border bg-surface p-4 shadow-soft sm:p-5">
        <StatusStepper steps={STEPS} current={stepOf(c)} failed={failed} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[17rem_1fr_1.15fr]">
        {/* LEFT: countdown */}
        <section aria-label="Time left" className="flex flex-col items-center justify-center rounded-[20px] border bg-surface p-4 shadow-soft sm:p-6">
          {c.status === "COMPLETED" || failed ? (
            <div className="py-8 text-center">
              <p className="font-display text-xl font-semibold">{c.status === "COMPLETED" ? "Delivered" : failed}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.completedAt ? new Date(c.completedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "This request is closed."}</p>
            </div>
          ) : (
            <BigCountdown expiresAt={countdownTarget} startAt={c.status === "PENDING" ? c.createdAt : undefined} caption={c.status === "PENDING" ? "Hold expires. The other side must respond." : "Food stays safe until"} />
          )}
        </section>

        {/* CENTER: why this match */}
        <section aria-label="Why this match" className="rounded-[20px] border bg-surface p-4 shadow-soft sm:p-6">
          <h2 className="mb-4 font-display text-lg font-semibold">Why this match</h2>
          {c.match ? <MatchBreakdown match={c.match} /> : <p className="text-sm text-muted-foreground">No score is available for this request.</p>}
        </section>

        {/* RIGHT: map + details */}
        <section aria-label="Route" className="space-y-4 rounded-[20px] border bg-surface p-4 shadow-soft sm:p-5">
          <MapView height={220} markers={mapMarkers} line={line} fit />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{c.distanceKm != null ? <><b className="tabular text-foreground">{c.distanceKm} km</b> apart</> : "Distance unavailable"}</span>
            <span className="text-muted-foreground">{c.etaMin != null && <>ETA <b className="tabular text-foreground">{c.etaMin} min</b> at 20 km/h</>}</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
            <Avatar name={other.name} kind={other.kind} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{other.name}</p>
              <p className="text-xs text-muted-foreground">
                {kindLabel(other.kind)} · {other.area}{c.viewerRole === "TAKER" ? ` · trust ${other.trustScore}` : ""}
                {other.members ? ` · ${other.members} members` : ""}
              </p>
            </div>
          </div>
          {c.revealed ? <Contact p={other} /> : <p className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">Exact address and phone are shared once the {c.viewerRole === "GIVER" ? "receiver" : "giver"} and you have both agreed. Until then only the area is visible.</p>}
        </section>
      </div>

      {/* Actions */}
      <section className="space-y-4 rounded-[20px] border bg-surface p-4 shadow-soft sm:p-5" aria-label="Actions" aria-live="polite">
        {c.can.accept && (
          <div className="space-y-3">
            <p className="text-sm">
              <b>{other.name}</b> {c.initiatedBy === "TAKER" ? "wants this food." : "can give you this food."} Accepting reveals contact details.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button className="h-12 rounded-xl px-8" disabled={accept.isPending} onClick={() => accept.mutate(c.id, { onSuccess: () => toast.success("Accepted"), onError: (e) => toast.error(e.message) })}>
                {accept.isPending ? "Accepting..." : "Accept"}
              </Button>
              <Button variant="outline" className="h-12 rounded-xl px-8" disabled={decline.isPending} onClick={() => decline.mutate(c.id, { onSuccess: () => toast("Declined"), onError: (e) => toast.error(e.message) })}>
                Decline
              </Button>
            </div>
          </div>
        )}
        {c.status === "PENDING" && !c.can.accept && <p className="text-sm text-muted-foreground">Waiting for <b>{other.name}</b> to respond. This request releases automatically when the hold ends.</p>}
        {c.otp && <OtpDisplay otp={c.otp} claimId={c.id} />}
        {c.status === "ACCEPTED" && c.viewerRole === "GIVER" && !c.otp && <p className="text-sm text-muted-foreground">The code has expired with the food.</p>}
        {c.can.handover && <OtpEntry claimId={c.id} initialCode={initialCode} onDone={() => setCelebrate(true)} />}
        {c.status === "ACCEPTED" && c.viewerRole === "TAKER" && !c.can.handover && <p className="text-sm text-muted-foreground">This code window has closed.</p>}
        {c.status === "COMPLETED" && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-sm">
              <b>{c.mealsDelivered} meals</b> delivered{c.pointsEarned ? <> · you earned <b className="text-primary">+{c.pointsEarned} points</b></> : null}.
            </p>
            {c.viewerRole === "GIVER" && (
              <Button variant="outline" className="h-10 rounded-xl" onClick={() => setCelebrate(true)}>
                View certificate
              </Button>
            )}
            {c.can.review && (
              <Button className="h-10 gap-1.5 rounded-xl" onClick={() => setReviewOpen(true)}>
                <Star className="size-4" aria-hidden /> Rate {other.name}
              </Button>
            )}
          </div>
        )}
        {c.can.complain && (
          <Button variant="ghost" className="h-9 gap-1.5 rounded-xl text-clay hover:bg-clay/10 hover:text-clay" onClick={() => setComplainOpen(true)}>
            <Flag className="size-4" aria-hidden /> Report a problem
          </Button>
        )}
        {c.complained && <p className="text-xs text-muted-foreground">You filed a complaint for this handover.</p>}
      </section>

      {/* mandatory: opens by itself once the celebration is closed, and cannot be dismissed without a rating */}
      <ReviewDialog claim={c} open={(reviewOpen || mustReview) && !celebrateShown} onOpenChange={setReviewOpen} required={mustReview} />
      <ComplaintDialog claim={c} open={complainOpen} onOpenChange={setComplainOpen} />
      <Celebration
        claim={c}
        open={celebrate && c.status === "COMPLETED"}
        onClose={() => {
          setCelebrate(false);
          if (c.can.review) setReviewOpen(true); // mandatory rating follows the celebration
        }}
      />
    </div>
  );
}
