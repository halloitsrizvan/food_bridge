"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import type { MatchInfo } from "@/lib/schemas/food";
import { cn } from "@/lib/utils";

const ROWS: { key: keyof MatchInfo["factors"]; label: string; weight: number; hint: (m: MatchInfo) => string }[] = [
  { key: "proximity", label: "Proximity", weight: 35, hint: (m) => `${m.distanceKm} km apart` },
  { key: "timeSlack", label: "Time to spare", weight: 25, hint: (m) => `${Math.max(0, m.slackMin)} min of slack after travel` },
  { key: "quantityFit", label: "Quantity fit", weight: 15, hint: () => "How closely meals match what is needed" },
  { key: "dietMatch", label: "Diet match", weight: 10, hint: () => "Veg / non-veg compatibility" },
  { key: "trust", label: "Trust", weight: 10, hint: () => "Reliability of the other side" },
  { key: "fairness", label: "Fairness", weight: 5, hint: () => "Favours those who received less this week" },
];

export function MatchBreakdown({ match, className, compact }: { match: MatchInfo; className?: string; compact?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Match score</p>
          <p className="font-display text-4xl font-semibold tabular text-deep">
            {Math.round(match.score * 100)}
            <span className="text-lg text-muted-foreground">/100</span>
          </p>
        </div>
        <p className="max-w-[11rem] text-right text-xs text-muted-foreground">
          Reachable in <b className="text-foreground">{match.travelMin} min</b>
          {match.slackMin >= 0 && <> with {match.slackMin} min to spare</>}
        </p>
      </div>
      <ul className="space-y-2.5">
        {ROWS.map((r) => {
          const v = match.factors[r.key];
          return (
            <li key={r.key} title={r.hint(match)}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-medium">
                  {r.label} <span className="text-muted-foreground">· {r.weight}%</span>
                </span>
                <span className="tabular text-muted-foreground">{Math.round(v * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-valuenow={Math.round(v * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={r.label}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: v > 0.66 ? "var(--primary)" : v > 0.33 ? "var(--saffron)" : "var(--clay)" }}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${Math.max(2, v * 100)}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              </div>
              {!compact && <p className="mt-0.5 text-[11px] text-muted-foreground">{r.hint(match)}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Small "Why this match" trigger that reveals the breakdown inline. */
export function WhyMatch({ match }: { match: MatchInfo }) {
  return (
    <details className="group rounded-xl border bg-surface/60 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 font-medium text-primary [&::-webkit-details-marker]:hidden">
        <Info className="size-4" aria-hidden /> Why this match · {Math.round(match.score * 100)}
      </summary>
      <div className="border-t px-3 py-3">
        <MatchBreakdown match={match} compact />
      </div>
    </details>
  );
}
