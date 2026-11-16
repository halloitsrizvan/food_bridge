import { Award, Crown, Gem, Leaf, Medal, Salad, Drumstick, Wheat, Package, Carrot, Truck, Footprints, ArrowLeftRight } from "lucide-react";
import { CATEGORY_LABEL, DIET_LABEL, initials, KIND_LABEL, MODE_LABEL } from "@/lib/format";
import type { Category, Diet, Mode } from "@/lib/schemas/food";
import type { Tier } from "@/lib/schemas/profile";
import { cn } from "@/lib/utils";

const TIER = {
  BRONZE: { label: "Bronze", icon: Medal, cls: "bg-[#B9772E]/12 text-[#9a5f1d] ring-[#B9772E]/30 dark:text-[#e0a766]" },
  SILVER: { label: "Silver", icon: Award, cls: "bg-slate-400/15 text-slate-600 ring-slate-400/40 dark:text-slate-300" },
  GOLD: { label: "Gold", icon: Crown, cls: "bg-[#E0A21B]/15 text-[#8a6208] ring-[#E0A21B]/40 dark:text-[#f1c45c]" },
  PLATINUM: { label: "Platinum", icon: Gem, cls: "bg-[#3C8C94]/15 text-[#216068] ring-[#3C8C94]/40 dark:text-[#7cd0d8]" },
} as const;

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  const t = TIER[tier];
  const Icon = t.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1", t.cls, className)}>
      <Icon className="size-3" aria-hidden /> {t.label}
    </span>
  );
}

export function DietBadge({ diet, className }: { diet: Diet; className?: string }) {
  const veg = diet === "VEG";
  const both = diet === "BOTH";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1", veg ? "bg-primary/10 text-primary ring-primary/25" : both ? "bg-info/10 text-info ring-info/25" : "bg-clay/10 text-clay ring-clay/25", className)}>
      {veg ? <Leaf className="size-3" aria-hidden /> : <Drumstick className="size-3" aria-hidden />}
      {DIET_LABEL[diet]}
    </span>
  );
}

const CAT_ICON = { COOKED: Salad, PACKAGED: Package, RAW: Carrot } as const;
const CAT_CLS = { COOKED: "bg-saffron/20 text-[#8a5a0b] dark:text-saffron", PACKAGED: "bg-info/15 text-info", RAW: "bg-primary/15 text-primary" } as const;

export function CategoryChip({ category, className }: { category: Category; className?: string }) {
  const Icon = CAT_ICON[category] ?? Wheat;
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", CAT_CLS[category], className)} title={CATEGORY_LABEL[category]}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function ModeChip({ mode, className }: { mode: Mode; className?: string }) {
  const Icon = mode === "GIVER_DELIVERS" ? Truck : mode === "TAKER_PICKS_UP" ? Footprints : ArrowLeftRight;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground", className)}>
      <Icon className="size-3" aria-hidden /> {MODE_LABEL[mode]}
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
