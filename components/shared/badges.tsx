"use client";

import { Leaf, Salad, Drumstick, Wheat, Package, Carrot, Truck, Footprints, ArrowLeftRight } from "lucide-react";
import { initials, KIND_LABEL } from "@/lib/format";
import { useT } from "@/lib/i18n";
import type { Category, Diet, Mode } from "@/lib/schemas/food";
import { cn } from "@/lib/utils";

export function DietBadge({ diet, className }: { diet: Diet; className?: string }) {
  const t = useT();
  const veg = diet === "VEG";
  const both = diet === "BOTH";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", veg ? "bg-primary/10 text-primary ring-primary/25" : both ? "bg-info/10 text-info ring-info/25" : "bg-clay/10 text-clay ring-clay/25", className)}>
      {veg ? <Leaf className="size-3" aria-hidden /> : <Drumstick className="size-3" aria-hidden />}
      {t.labels.diet[diet]}
    </span>
  );
}

const CAT_ICON = { COOKED: Salad, PACKAGED: Package, RAW: Carrot } as const;
const CAT_CLS = { COOKED: "bg-saffron/20 text-[#8a5a0b] dark:text-saffron", PACKAGED: "bg-info/15 text-info", RAW: "bg-primary/15 text-primary" } as const;

export function CategoryChip({ category, className }: { category: Category; className?: string }) {
  const t = useT();
  const Icon = CAT_ICON[category] ?? Wheat;
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", CAT_CLS[category], className)} title={t.labels.category[category]}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function ModeChip({ mode, className }: { mode: Mode; className?: string }) {
  const t = useT();
  const Icon = mode === "GIVER_DELIVERS" ? Truck : mode === "TAKER_PICKS_UP" ? Footprints : ArrowLeftRight;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>
      <Icon className="size-3" aria-hidden /> {t.labels.mode[mode]}
    </span>
  );
}

const RING = { RESTAURANT: "ring-saffron", CATERER: "ring-clay", HOUSEHOLD: "ring-primary", EVENT: "ring-info", INSTITUTION: "ring-info", CHARITY: "ring-primary", HOUSE: "ring-saffron" } as const;

export function Avatar({ name, kind, size = 36 }: { name: string; kind?: string | null; size?: number }) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-full bg-secondary font-semibold text-deep ring-2", kind ? RING[kind as keyof typeof RING] : "ring-line")}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export const kindLabel = (k: string | null | undefined) => (k ? (KIND_LABEL[k] ?? k) : "");
