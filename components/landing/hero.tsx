"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Landmark } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { CategoryChip, DietBadge } from "@/components/shared/badges";
import { CountdownRing } from "@/components/shared/countdown-ring";
import { useMe, useOffers } from "@/lib/api/hooks";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ImpactCounters } from "./counters";

function FloatingCard() {
  const t = useT();
  const reduce = useReducedMotion();
  const { data } = useOffers({ sort: "soonest", limit: 1 });
  const o = data?.items[0];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="absolute bottom-4 right-4 hidden w-[15.5rem] rounded-3xl bg-background p-3 text-foreground shadow-lift sm:bottom-6 sm:right-6 sm:block"
    >
      <div className="grid h-28 place-items-center rounded-2xl bg-secondary">
        {o ? <CategoryChip category={o.category} className="size-14 rounded-2xl [&_svg]:size-7" /> : <span className="text-xs text-muted-foreground">{t.hero.livePlaceholder}</span>}
      </div>
      {o ? (
        <div className="mt-2.5 flex items-center gap-2 px-1">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{o.title}</p>
            <p className="text-xs text-muted-foreground">{o.quantityMeals} {t.common.meals} · {o.area}</p>
            <DietBadge diet={o.diet} className="mt-1" />
          </div>
          <CountdownRing expiresAt={o.expiresAt} startAt={o.createdAt} size={48} />
        </div>
      ) : null}
    </motion.div>
  );
}

export function Hero() {
  const t = useT();
  const { data: me } = useMe();
  return (
    <section className="mx-auto max-w-[1680px] px-4 sm:px-8 pt-6">
      <div className="relative isolate overflow-hidden rounded-[28px] text-white" style={{ background: "linear-gradient(135deg,#032724 0%,#066a62 45%,#27b3a3 100%)" }}>
        <div className="bg-dots absolute inset-0 -z-10 opacity-40" aria-hidden />
        <span className="pointer-events-none absolute -top-6 left-1/2 -z-10 -translate-x-1/2 select-none font-display text-[clamp(5rem,22vw,17rem)] font-extrabold leading-none tracking-tighter text-white/12" aria-hidden>
          FOODBRIDGE
        </span>
        <div className="flex min-h-[26rem] flex-col justify-end gap-6 p-6 pb-8 sm:min-h-[32rem] sm:p-10 lg:min-h-[36rem]">
          <div className="max-w-xl">
            {/* <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-semibold ring-1 ring-white/25 backdrop-blur sm:text-sm">
              <Landmark className="size-4 text-saffron" aria-hidden /> Government of the people, for the people · Public food-security programme
            </p> */}
            <h1 className="text-balance font-display text-4xl font-semibold leading-[1.05] sm:text-6xl">{t.hero.headline}</h1>
            <p className="mt-4 max-w-md text-pretty text-sm text-white/85 sm:text-base">{t.hero.sub}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={me?.role === "GIVER" ? "/dashboard/post" : "/signup"} className={cn(buttonVariants(), "h-12 gap-2 bg-background pl-6 pr-2 text-base text-primary hover:bg-background/90")}>
                {t.hero.ctaGive}
                <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
                  <ArrowUpRight className="size-4" aria-hidden />
                </span>
              </Link>
              <a href="#live" className={cn(buttonVariants({ variant: "outline" }), "h-12 border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white")}>
                {t.hero.ctaNeed}
              </a>
            </div>
          </div>
        </div>
        <FloatingCard />
      </div>
      <ImpactCounters className="mt-5" />
    </section>
  );
}
