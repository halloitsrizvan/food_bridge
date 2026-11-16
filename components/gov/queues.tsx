"use client";

import Link from "next/link";
import { toast } from "sonner";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useDecideAppeal, useGovAppeals, useGovComplaints, useSetUserStatus } from "@/lib/api/hooks";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { STATUS_PILL } from "./users-table";

export function GovComplaints() {
  const { data, isPending, isError, error, refetch } = useGovComplaints();
  const setUser = useSetUserStatus();
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Complaints</h1>
      <p className="text-muted-foreground">Each complaint is weighted by the complainant&apos;s trust score. At a weighted total of 3 within 30 days an account is suspended automatically.</p>
      {isPending ? <PageSkeleton /> : isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : data.length === 0 ? <EmptyState art="inbox" title="No complaints" description="Nothing to review." /> : (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id} className="rounded-[20px] border bg-surface p-5 shadow-soft">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium"><b>{c.from.name}</b> against <b>{c.against.name}</b> <span className={cn("ml-1 rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_PILL[c.against.status])}>{c.against.status.toLowerCase()}</span></p>
                  <p className="mt-1 text-sm">{c.reason}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Weight {c.weight.toFixed(2)} · against trust {c.against.trustScore} · {timeAgo(c.createdAt)} · evidence: {c.offerTitle} (<Link className="underline" href={`/dashboard/claims/${c.claimId}`}>claim</Link>)</p>
                </div>
                {c.against.status === "ACTIVE" ? (
                  <Button size="sm" variant="outline" className="rounded-lg text-clay" disabled={setUser.isPending} onClick={() => setUser.mutate({ id: c.against.id, status: "SUSPENDED" }, { onSuccess: () => toast("Suspended"), onError: (e) => toast.error(e.message) })}>Suspend account</Button>
                ) : (
                  <Button size="sm" variant="outline" className="rounded-lg" disabled={setUser.isPending} onClick={() => setUser.mutate({ id: c.against.id, status: "ACTIVE" }, { onSuccess: () => toast.success("Reactivated"), onError: (e) => toast.error(e.message) })}>Reactivate</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GovAppeals() {
  const { data, isPending, isError, error, refetch } = useGovAppeals();
  const decide = useDecideAppeal();
  const act = (id: string, decision: "APPROVED" | "REJECTED") =>
    decide.mutate({ id, decision }, { onSuccess: () => toast.success(decision === "APPROVED" ? "Approved: account reactivated" : "Rejected"), onError: (e) => toast.error(e.message) });
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold">Appeals</h1>
      {isPending ? <PageSkeleton /> : isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : data.length === 0 ? <EmptyState art="inbox" title="No appeals" /> : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li key={a.id} className="rounded-[20px] border bg-surface p-5 shadow-soft">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{a.account.name} <span className="text-xs text-muted-foreground">{a.account.email}</span></p>
                  <p className="mt-1 whitespace-pre-line text-sm">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(a.createdAt)} · trust {a.account.trustScore} · <span className={cn("rounded-full px-2 py-0.5 font-semibold", a.status === "OPEN" ? "bg-saffron/25" : a.status === "APPROVED" ? "bg-primary/15 text-primary" : "bg-clay/15 text-clay")}>{a.status.toLowerCase()}</span></p>
                </div>
                {a.status === "OPEN" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="rounded-lg" disabled={decide.isPending} onClick={() => act(a.id, "APPROVED")}>Approve</Button>
                    <Button size="sm" variant="outline" className="rounded-lg" disabled={decide.isPending} onClick={() => act(a.id, "REJECTED")}>Reject</Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
