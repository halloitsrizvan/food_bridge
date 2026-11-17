"use client";

import { Cloud, Scale, Soup, Radio } from "lucide-react";
import { CountUp } from "@/components/shared/count-up";
import { useImpact } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ImpactCounters({ className, tone = "card" }: { className?: string; tone?: "card" | "plain" }) {
  const t = useT();
  const { data, isPending } = useImpact();
  const items = [
    { icon: Soup, label: t.counters.meals, v: data?.meals ?? 0, d: 0 },
    { icon: Scale, label: t.counters.kg, v: data?.kg ?? 0, d: 0 },
    { icon: Cloud, label: t.counters.co2, v: data?.co2Kg ?? 0, d: 0 },
    { icon: Radio, label: t.counters.active, v: data?.activePosts ?? 0, d: 0 },
  ];
  return (
    <dl className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)} aria-live="polite">
      {items.map((i) => (
        <div key={i.label} className={cn("rounded-[20px] p-4", tone === "card" ? "border bg-secondary" : "bg-white/10 ring-1 ring-white/15")}>
          <i.icon className={cn("mb-2 size-5", tone === "card" ? "text-primary" : "text-saffron")} aria-hidden />
          <dd className="font-display text-3xl font-semibold tabular">{isPending ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-muted" /> : <CountUp value={i.v} decimals={i.d} />}</dd>
          <dt className={cn("text-xs", tone === "card" ? "text-muted-foreground" : "text-white/70")}>{i.label}</dt>
        </div>
      ))}
    </dl>
  );
}
