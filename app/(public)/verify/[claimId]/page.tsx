import { BadgeCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Logo } from "@/components/layout/logo";
import { TierBadge } from "@/components/shared/badges";
import { verifyClaim } from "@/server/services/verify.service";

export const metadata = { title: "Verify a handover", robots: { index: false } };

async function Result({ params }: { params: Promise<{ claimId: string }> }) {
  await connection();
  const { claimId } = await params;
  const v = await verifyClaim(claimId);
  if (!v)
    return (
      <div className="rounded-3xl border border-clay/40 bg-clay/5 p-8 text-center">
        <ShieldX className="mx-auto size-12 text-clay" aria-hidden />
        <h1 className="mt-3 font-display text-2xl font-semibold">Could not verify</h1>
        <p className="mt-1 text-sm text-muted-foreground">This code does not match a completed FoodBridge handover.</p>
      </div>
    );
  return (
    <div className="rounded-3xl border bg-surface p-8 text-center shadow-lift">
      <BadgeCheck className="mx-auto size-14 text-primary" aria-hidden />
      <h1 className="mt-3 font-display text-2xl font-semibold">Verified handover</h1>
      <p className="mt-4 font-display text-3xl font-semibold text-deep">{v.giverName}</p>
      <div className="mt-2 flex justify-center">
        <TierBadge tier={v.giverTier} />
      </div>
      <p className="mt-4 text-lg">
        delivered <b className="text-primary">{v.meals} meals</b> in {v.area || "Kozhikode"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{v.completedAt ? new Date(v.completedAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }) : ""}</p>
      <p className="mt-6 text-xs text-muted-foreground">Confirmed with a one-time code by both parties. Government verified platform.</p>
    </div>
  );
}

export default function VerifyPage({ params }: { params: Promise<{ claimId: string }> }) {
  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 p-4">
      <Link href="/" className="mx-auto">
        <Logo />
      </Link>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-muted" />}>
        <Result params={params} />
      </Suspense>
    </main>
  );
}

// These routes read the session (request-time data) and block on the server by design.
export const instant = false;
