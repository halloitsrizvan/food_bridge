"use client";

import { CheckCheck } from "lucide-react";
import Link from "next/link";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { useMarkRead, useNotifications } from "@/lib/api/hooks";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

export function NotificationsList() {
  const { data, isPending, isError, error, refetch } = useNotifications();
  const mark = useMarkRead();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold">Notifications</h1>
        <Button variant="outline" className="h-10 gap-1.5 rounded-xl" disabled={!data?.unread} onClick={() => mark.mutate(undefined)}>
          <CheckCheck className="size-4" aria-hidden /> Mark all read
        </Button>
      </div>
      {isPending ? <PageSkeleton /> : isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : data.items.length === 0 ? (
        <EmptyState art="inbox" title="All quiet" description="We will tell you when food is posted near you or a handover needs you." />
      ) : (
        <ul className="divide-y rounded-[20px] border bg-surface shadow-soft" aria-live="polite">
          {data.items.map((n) => (
            <li key={n.id}>
              <Link href={n.link || "#"} onClick={() => !n.readAt && mark.mutate([n.id])} className={cn("block px-5 py-4 hover:bg-muted", !n.readAt && "bg-primary/5")}>
                <p className="flex items-center gap-2 font-medium">{!n.readAt && <span className="size-2 rounded-full bg-primary" aria-label="unread" />}{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
