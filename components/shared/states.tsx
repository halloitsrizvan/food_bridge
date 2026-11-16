"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Art = "plate" | "search" | "inbox" | "map";

function Illustration({ art }: { art: Art }) {
  const common = { width: 120, height: 96, viewBox: "0 0 120 96", fill: "none", "aria-hidden": true } as const;
  if (art === "search")
    return (
      <svg {...common}>
        <circle cx="52" cy="44" r="26" fill="var(--secondary)" stroke="var(--primary)" strokeWidth="4" />
        <path d="M72 64 L96 86" stroke="var(--primary)" strokeWidth="6" strokeLinecap="round" />
        <path d="M42 44h20M52 34v20" stroke="var(--saffron)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  if (art === "inbox")
    return (
      <svg {...common}>
        <rect x="18" y="26" width="84" height="52" rx="14" fill="var(--secondary)" stroke="var(--primary)" strokeWidth="4" />
        <path d="M18 54h26l6 10h20l6-10h26" stroke="var(--primary)" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="92" cy="26" r="9" fill="var(--saffron)" />
      </svg>
    );
  if (art === "map")
    return (
      <svg {...common}>
        <path d="M14 30l30-10 32 10 30-10v50l-30 10-32-10-30 10z" fill="var(--secondary)" stroke="var(--primary)" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="62" cy="42" r="9" fill="var(--clay)" />
        <circle cx="62" cy="42" r="3.5" fill="var(--surface)" />
      </svg>
    );
  return (
    <svg {...common}>
      <ellipse cx="60" cy="62" rx="44" ry="16" fill="var(--secondary)" stroke="var(--primary)" strokeWidth="4" />
      <ellipse cx="60" cy="58" rx="28" ry="9" fill="var(--surface)" stroke="var(--line)" strokeWidth="3" />
      <path d="M44 38c0-8 6-10 6-18M60 34c0-8 6-10 6-18M76 38c0-8 6-10 6-18" stroke="var(--saffron)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  art = "plate",
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  art?: Art;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-surface/60 p-10 text-center", className)}>
      <Illustration art={art} />
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong", onRetry, className }: { message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center gap-3 rounded-2xl border border-clay/40 bg-clay/5 p-8 text-center", className)}>
      <AlertTriangle className="size-8 text-clay" aria-hidden />
      <p className="max-w-sm text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-1/3 rounded-xl" />
      <Skeleton className="h-4 w-2/3 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export function CardSkeletons({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading posts">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="shimmer h-52 rounded-[20px] border bg-surface p-5">
          <div className="flex gap-3">
            <div className="size-10 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
            <div className="size-14 rounded-full bg-muted" />
          </div>
          <div className="mt-6 space-y-2">
            <div className="h-3 w-full rounded bg-muted" />
            <div className="h-9 w-28 rounded-xl bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
