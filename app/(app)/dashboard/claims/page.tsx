"use client";

import { ClaimCard } from "@/components/claims/claim-card";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { useMyClaims } from "@/lib/api/hooks";

export default function ClaimsPage() {
  const { data, isPending, isError, error, refetch } = useMyClaims();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">Handovers</h1>
      {isPending ? <PageSkeleton /> : isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : data.length === 0 ? (
        <EmptyState art="inbox" title="No handovers yet" description="When you contact a giver or someone contacts you, it shows up here." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{data.map((c) => <ClaimCard key={c.id} claim={c} />)}</div>
      )}
    </div>
  );
}
