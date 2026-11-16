"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Utensils, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatLeft } from "@/lib/format";
import type { OfferWithMatch } from "@/lib/schemas/food";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { Avatar, CategoryChip, DietBadge, kindLabel, ModeChip, TierBadge } from "./badges";
import { CountdownRing } from "./countdown-ring";

type Props = {
  offer: OfferWithMatch;
  index?: number;
  onOpen?: () => void;
  onContact?: () => void;
  actionLabel?: string;
  busy?: boolean;
  className?: string;
};

export function PostCard({ offer, index = 0, onOpen, onContact, actionLabel = "Contact", busy, className }: Props) {
  const reduce = useReducedMotion();
  const now = useNow();
  const upcoming = !!offer.scheduledFor && !!now && new Date(offer.scheduledFor).getTime() > now;
  const m = offer.match;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className={cn("group flex flex-col gap-4 rounded-[20px] border bg-surface p-5 shadow-soft transition-shadow hover:shadow-lift", className)}
    >
      <div className="flex items-start gap-3">
        <CategoryChip category={offer.category} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug">
            <button type="button" onClick={onOpen} className="text-left outline-offset-4 hover:underline">
              {offer.title}
            </button>
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <Utensils className="size-3.5" aria-hidden />
            <b className="tabular text-foreground">{offer.quantityMeals}</b> meals
          </p>
        </div>
        {upcoming ? (
          <span className="rounded-full bg-info/15 px-2.5 py-1 text-xs font-semibold text-info">Upcoming</span>
        ) : (
          <CountdownRing expiresAt={offer.expiresAt} startAt={offer.createdAt} size={56} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <DietBadge diet={offer.diet} />
        <ModeChip mode={offer.mode} />
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <MapPin className="size-3" aria-hidden /> {offer.area || "Nearby"}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <Avatar name={offer.giverName} kind={offer.giverKind} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{offer.giverName}</p>
          <p className="text-xs text-muted-foreground">{kindLabel(offer.giverKind)}</p>
        </div>
        <TierBadge tier={offer.giverTier} />
      </div>

      {m && (
        <p className="flex items-center gap-1.5 rounded-xl bg-primary/8 px-3 py-2 text-xs font-medium text-deep dark:text-primary-deep">
          <Zap className="size-3.5 text-primary" aria-hidden />
          Reachable in {m.travelMin} min, {now ? formatLeft(new Date(offer.expiresAt).getTime() - now) : "…"} left · {Math.round(m.score * 100)} match
        </p>
      )}

      <div className="mt-auto flex items-center gap-2">
        <Button onClick={onContact} disabled={busy || upcoming} className="h-10 flex-1 rounded-xl" aria-label={`${actionLabel}: ${offer.title}`}>
          {upcoming ? "Opens soon" : busy ? "Please wait..." : actionLabel}
        </Button>
        <Button variant="outline" onClick={onOpen} className="h-10 rounded-xl">
          Details
        </Button>
      </div>
    </motion.article>
  );
}
