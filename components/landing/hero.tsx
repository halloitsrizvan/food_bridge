"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CategoryChip, DietBadge } from "@/components/shared/badges";
import { CountdownRing } from "@/components/shared/countdown-ring";
import { useMe, useOffers } from "@/lib/api/hooks";
import { t } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";
import { ImpactCounters } from "./counters";

function StackedCards() {
  const reduce = useReducedMotion();
  const { data, isPending } = useOffers({ sort: "soonest", limit: 3 });
  const rot = [-3, 2, -1];
  if (isPending) return <div className="mx-auto h-72 max-w-sm animate-pulse rounded-3xl bg-muted" aria-hidden />;
  if (!data?.items.length)
    return (
      <div className="mx-auto max-w-sm rounded-3xl border border-dashed bg-surface/70 p-8 text-center text-sm text-muted-foreground">Live posts show up here the moment a giver shares surplus food.</div>
    );
  return (
    <div className="relative mx-auto h-[19rem] w-full max-w-sm" aria-label="Live food posts">
      {data.items.slice(0, 3).map((o, i) => (
        <motion.div
          key={o.id}
          initial={reduce ? false : { opacity: 0, y: 40, rotate: 0 }}
          animate={{ opacity: 1, y: i * 62, rotate: rot[i] }}
          transition={{ delay: 0.15 + i * 0.12, type: "spring", stiffness: 120, damping: 16 }}
          className="absolute inset-x-0 top-0 flex items-center gap-3 rounded-2xl border bg-surface p-4 shadow-lift"
          style={{ zIndex: 3 - i }}
        >
          <CategoryChip category={o.category} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-semibold">{o.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {o.quantityMeals} meals · {o.area}
            </p>
            <DietBadge diet={o.diet} className="mt-1" />
          </div>
          <CountdownRing expiresAt={o.expiresAt} startAt={o.createdAt} size={52} />
        </motion.div>
      ))}
    </div>
  );
}

export function Hero() {
  const { data: me } = useMe();
  return (
    <section className="relative overflow-hidden">
      <div className="bg-dots absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" aria-hidden />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-4" aria-hidden /> {t.tagline} · Kozhikode pilot
          </span>
          <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.05] text-deep sm:text-6xl">{t.landing.headline}</h1>
          <p className="mt-5 max-w-xl text-pretty text-lg text-muted-foreground">{t.landing.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={me?.role === "GIVER" ? "/dashboard/post" : "/signup"} className={cn(buttonVariants({ size: "lg" }), "h-12 gap-2 rounded-xl px-6 text-base")}>
              {t.landing.ctaGive} <ArrowRight className="size-4" aria-hidden />
            </Link>
            <a href="#live" className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 rounded-xl px-6 text-base")}>
              {t.landing.ctaNeed}
            </a>
          </div>
          <ImpactCounters className="mt-10" />
        </div>
        <StackedCards />
      </div>
    </section>
  );
}
