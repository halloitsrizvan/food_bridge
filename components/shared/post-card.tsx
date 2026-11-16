"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Carrot, MapPin, Package, Salad, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatLeft } from "@/lib/format";
import type { OfferWithMatch } from "@/lib/schemas/food";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { DietBadge, kindLabel, ModeChip } from "./badges";
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

const TILE = {
  COOKED: { bg: "bg-[#fdeee6] dark:bg-[#3a2418]", fg: "text-[#c2562b]", icon: Salad },
  PACKAGED: { bg: "bg-[#eaf2fc] dark:bg-[#152b40]", fg: "text-[#2f6fb5]", icon: Package },
  RAW: { bg: "bg-[#e8f5ec] dark:bg-[#143323]", fg: "text-[#1d7a45]", icon: Carrot },
} as const;

/** Trust score 0-100 shown as a 5-star rating, like a product card. */
function Stars({ trust }: { trust: number }) {
  const filled = Math.round(trust / 20);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Trust ${trust} out of 100`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className={cn("size-3", i < filled ? "fill-saffron text-saffron" : "fill-line text-line")} aria-hidden />
      ))}
      <span className="ml-1 text-[11px] text-muted-foreground tabular">({trust})</span>
    </span>
  );
}

export function PostCard({ offer, index = 0, onOpen, onContact, actionLabel = "Contact", busy, className }: Props) {
  const reduce = useReducedMotion();
  const now = useNow();
  const upcoming = !!offer.scheduledFor && !!now && new Date(offer.scheduledFor).getTime() > now;
  const m = offer.match;
  const tile = TILE[offer.category];
  const Icon = tile.icon;

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
      whileHover={reduce ? undefined : { y: -3 }}
      className={cn("group flex flex-col gap-3 rounded-[20px] border bg-background p-2.5 transition-shadow hover:shadow-lift", className)}
    >
      <button type="button" onClick={onOpen} aria-label={`Details: ${offer.title}`} className={cn("relative grid h-40 w-full place-items-center overflow-hidden rounded-2xl", tile.bg)}>
        {offer.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={offer.photoUrl} alt="" className="size-full object-cover" />
        ) : (
          <Icon className={cn("size-20 transition-transform group-hover:scale-110", tile.fg)} strokeWidth={1.3} aria-hidden />
        )}
        <span className="absolute left-2.5 top-2.5"><DietBadge diet={offer.diet} className="bg-background/90 backdrop-blur" /></span>
        <span className="absolute right-2 top-2">
          {upcoming ? (
            <span className="rounded-full bg-info px-2.5 py-1 text-xs font-semibold text-white">Upcoming</span>
          ) : (
            <span className="block rounded-full bg-background/95 p-0.5 shadow-soft"><CountdownRing expiresAt={offer.expiresAt} startAt={offer.createdAt} size={46} stroke={4} /></span>
          )}
        </span>
      </button>

      <div className="space-y-2 px-1.5">
        <h3 className="line-clamp-1 font-display text-base font-semibold">{offer.title}</h3>
        <Stars trust={offer.giverTrust} />
        <p className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold tabular text-primary">{offer.quantityMeals}</span>
          <span className="text-sm text-muted-foreground">meals</span>
          <ModeChip mode={offer.mode} className="ml-auto" />
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{offer.distanceKm != null && <b className="text-foreground">{offer.distanceKm} km · </b>}{offer.area || "Nearby"} · {offer.giverName} · {kindLabel(offer.giverKind)}</span>
        </p>
        {m && (
          <p className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">
            <Zap className="size-3.5 text-primary" aria-hidden />
            {m.travelMin} min away, {now ? formatLeft(new Date(offer.expiresAt).getTime() - now) : "…"} left · {Math.round(m.score * 100)} match
          </p>
        )}
      </div>

      <Button onClick={onContact} disabled={busy || upcoming} className="mx-1.5 mb-1 mt-auto h-11" aria-label={`${actionLabel}: ${offer.title}`}>
        {upcoming ? "Opens soon" : busy ? "Please wait..." : actionLabel}
      </Button>
    </motion.article>
  );
}
