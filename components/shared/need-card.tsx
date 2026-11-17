"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HandHeart, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatLeft } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { NeedDTO } from "@/lib/schemas/food";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { DietBadge, kindLabel, ModeChip } from "./badges";

/** A receiver's request for food, styled to sit next to PostCard (blue tile instead of green). */
export function NeedCard({
  need,
  index = 0,
  actionLabel,
  disabled,
  onAction,
  className,
}: {
  need: NeedDTO;
  index?: number;
  actionLabel?: string;
  disabled?: boolean;
  onAction?: () => void;
  className?: string;
}) {
  const t = useT();
  const reduce = useReducedMotion();
  const now = useNow();
  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
      className={cn("flex flex-col gap-3 rounded-[20px] border border-info/30 bg-background p-2.5", className)}
    >
      <div className="relative grid h-32 place-items-center rounded-2xl bg-info/10 dark:bg-info/15">
        <HandHeart className="size-16 text-info" strokeWidth={1.3} aria-hidden />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-info px-2.5 py-1 text-xs font-semibold text-white">{t.feed.needsFood}</span>
        <span className="absolute right-2.5 top-2.5"><DietBadge diet={need.diet} className="bg-background/90 backdrop-blur" /></span>
      </div>
      <div className="space-y-2 px-1.5">
        <h3 className="line-clamp-1 font-display text-base font-semibold">{need.title}</h3>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tabular text-info">{need.mealsNeeded}</span>
          <span className="text-sm text-muted-foreground">{t.feed.mealsNeeded}</span>
          <ModeChip mode={need.mode} className="ml-auto" />
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {need.distanceKm != null && <b className="text-foreground">{need.distanceKm} km · </b>}
            {need.area || t.feed.nearbyWord} · {need.takerName}
            {need.takerKind ? ` · ${kindLabel(need.takerKind)}` : ""}
          </span>
        </p>
        <p className="flex items-center gap-3 text-xs text-muted-foreground">
          {need.members ? <span className="inline-flex items-center gap-1"><Users className="size-3.5" aria-hidden /> {need.members} {t.feed.membersWord}</span> : null}
          <span>{t.feed.neededIn} <b className="tabular text-foreground">{now ? formatLeft(new Date(need.neededBy).getTime() - now) : "…"}</b></span>
        </p>
      </div>
      <Button onClick={onAction} disabled={disabled} className="mx-1.5 mb-1 mt-auto h-11 bg-info text-white hover:bg-info/90">
        {actionLabel ?? t.feed.canGive}
      </Button>
    </motion.article>
  );
}
