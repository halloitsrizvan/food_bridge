"use client";

import QRCode from "qrcode";
import { ArrowRight, Check, Download, KeyRound, Loader2, ScanLine, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, CategoryChip, kindLabel } from "@/components/shared/badges";
import { CountdownRing } from "@/components/shared/countdown-ring";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAcceptClaim, useDeclineClaim, useHandover } from "@/lib/api/hooks";
import { handoverQrUrl } from "@/lib/handover-qr";
import { QrScanner } from "./qr-scanner";
import type { ClaimView } from "@/lib/schemas/claim";
import { cn } from "@/lib/utils";

export const STATUS_STYLE: Record<ClaimView["status"], string> = {
  PENDING: "bg-saffron/20 text-[#8a5a0b] dark:text-saffron",
  ACCEPTED: "bg-primary/15 text-primary",
  COMPLETED: "bg-primary text-primary-foreground",
  DECLINED: "bg-clay/15 text-clay",
  EXPIRED: "bg-muted text-muted-foreground",
};
export const STATUS_LABEL: Record<ClaimView["status"], string> = { PENDING: "Waiting", ACCEPTED: "Accepted", COMPLETED: "Delivered", DECLINED: "Declined", EXPIRED: "Expired" };

/** Giver-only: the QR and the 6-digit code for the receiver, with a themed PNG download. */
export function OtpDisplay({ otp, claimId }: { otp: string; claimId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(handoverQrUrl(window.location.origin, claimId, otp), { margin: 1, width: 320, errorCorrectionLevel: "M", color: { dark: "#032724", light: "#FFFFFF" } })
      .then((u) => live && setQr(u))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [claimId, otp]);

  return (
    <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-accent/50 p-4 text-center" role="status">
      <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
        <KeyRound className="size-4" aria-hidden /> Show this to the receiver
      </p>
      <div className="mx-auto mt-3 grid size-44 place-items-center rounded-2xl bg-white p-2 shadow-soft sm:size-52">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="Handover QR code" className="size-full" width={320} height={320} />
        ) : (
          <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Preparing QR" />
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">They scan the QR, or type this code</p>
      <p className="font-display text-4xl font-semibold tabular tracking-[0.3em] text-deep" aria-label={`Code ${otp.split("").join(" ")}`}>
        {otp}
      </p>
      <a
        href={`/api/v1/claims/${claimId}/qr`}
        download={`foodbridge-handover-${claimId.slice(0, 8)}.png`}
        className={cn(buttonVariants({ variant: "outline" }), "mt-3 h-10 gap-2")}
      >
        <Download className="size-4" aria-hidden /> Download as PNG
      </a>
    </div>
  );
}

/** Taker-only: finish the handover with the giver's 6-digit code OR by scanning their QR. */
export function OtpEntry({ claimId, initialCode, onDone }: { claimId: string; initialCode?: string; onDone?: (r: { claim: ClaimView; pointsAwarded: number }) => void }) {
  const [otp, setOtp] = useState(initialCode && /^\d{6}$/.test(initialCode) ? initialCode : "");
  const [scanning, setScanning] = useState(false);
  const handover = useHandover();
  const finish = (code: string) =>
    handover.mutate(
      { id: claimId, otp: code },
      {
        onSuccess: (r) => {
          toast.success("Handover confirmed");
          onDone?.(r);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  const onScan = useCallback(
    (r: { claimId: string; code: string }) => {
      if (r.claimId !== claimId.toLowerCase()) return void toast.error("That QR belongs to a different handover.");
      setOtp(r.code);
      finish(r.code);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [claimId],
  );
  return (
    <div className="space-y-3">
      <Button type="button" className="h-12 w-full gap-2 text-base" onClick={() => setScanning(true)} disabled={handover.isPending}>
        <ScanLine className="size-5" aria-hidden /> Scan the giver&apos;s QR
      </Button>
      <p className="text-center text-xs text-muted-foreground">or enter the 6-digit code</p>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (otp.length === 6) finish(otp);
        }}
      >
        <label htmlFor={`otp-${claimId}`} className="sr-only">
          6-digit code from the giver
        </label>
        <div className="flex gap-2">
          <Input
            id={`otp-${claimId}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            className="h-12 rounded-xl text-center font-display text-2xl tracking-[0.35em] tabular"
          />
          <Button type="submit" disabled={otp.length !== 6 || handover.isPending} className="h-12 px-5">
            {handover.isPending ? "Checking..." : "Confirm"}
          </Button>
        </div>
        {initialCode && otp === initialCode && <p className="text-xs text-primary">Code filled from the QR you opened. Tap Confirm.</p>}
      </form>
      <QrScanner open={scanning} onOpenChange={setScanning} onScan={onScan} />
    </div>
  );
}

export function ClaimCard({ claim, className }: { claim: ClaimView; className?: string }) {
  const accept = useAcceptClaim();
  const decline = useDeclineClaim();
  const other = claim.viewerRole === "GIVER" ? claim.taker : claim.giver;
  const waitingForMe = claim.can.accept;

  return (
    <article className={cn("rounded-[20px] border bg-surface p-4 shadow-soft", waitingForMe && "ring-2 ring-saffron/60", className)}>
      <div className="flex items-start gap-3">
        <CategoryChip category={claim.offer.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display font-semibold">{claim.offer.title}</h3>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_STYLE[claim.status])}>{STATUS_LABEL[claim.status]}</span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar name={other.name} kind={other.kind} size={22} />
            <span className="truncate">
              {other.name} · {kindLabel(other.kind)} · {claim.offer.quantityMeals} meals
            </span>
          </div>
        </div>
        {claim.status === "PENDING" && <CountdownRing expiresAt={claim.holdUntil} size={52} />}
      </div>

      {waitingForMe && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">
            <b>{other.name}</b> {claim.initiatedBy === "TAKER" ? "wants this food." : "can give you this food."} Respond before the hold runs out.
          </p>
          <div className="flex gap-2">
            <Button className="h-11 flex-1 gap-1.5 rounded-xl" disabled={accept.isPending} onClick={() => accept.mutate(claim.id, { onSuccess: () => toast.success("Accepted. Details are now shared."), onError: (e) => toast.error(e.message) })}>
              <Check className="size-4" aria-hidden /> Accept
            </Button>
            <Button variant="outline" className="h-11 flex-1 gap-1.5 rounded-xl" disabled={decline.isPending} onClick={() => decline.mutate(claim.id, { onSuccess: () => toast("Declined"), onError: (e) => toast.error(e.message) })}>
              <X className="size-4" aria-hidden /> Decline
            </Button>
          </div>
        </div>
      )}

      {claim.otp && <div className="mt-3"><OtpDisplay otp={claim.otp} claimId={claim.id} /></div>}
      {claim.can.handover && <div className="mt-3"><OtpEntry claimId={claim.id} /></div>}

      <Link href={`/dashboard/claims/${claim.id}`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        Open details <ArrowRight className="size-4" aria-hidden />
      </Link>
    </article>
  );
}
