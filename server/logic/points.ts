import type { Config } from "./config";

export type TierName = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export function tierFor(points: number, cfg: Pick<Config, "tiers">): TierName {
  if (points >= cfg.tiers.PLATINUM) return "PLATINUM";
  if (points >= cfg.tiers.GOLD) return "GOLD";
  if (points >= cfg.tiers.SILVER) return "SILVER";
  return "BRONZE";
}

export function nextTier(points: number, cfg: Pick<Config, "tiers">) {
  const steps: [TierName, number][] = [
    ["SILVER", cfg.tiers.SILVER],
    ["GOLD", cfg.tiers.GOLD],
    ["PLATINUM", cfg.tiers.PLATINUM],
  ];
  const next = steps.find(([, at]) => points < at);
  if (!next) return null;
  const prev = steps[steps.indexOf(next) - 1]?.[1] ?? 0;
  return { tier: next[0], at: next[1], progress: (points - prev) / (next[1] - prev) };
}

/** Giver award: 10 + min(meals,50) + 5 when handed over within 30 min of acceptance. */
export function giverPoints(
  meals: number,
  minutesSinceAccept: number,
  cfg: Pick<Config, "points">,
): number {
  const p = cfg.points;
  return p.base + Math.min(meals, p.mealCap) + (minutesSinceAccept <= p.fastWithinMin ? p.fastBonus : 0);
}

/** Review bonus is the second ledger row: base * (0.8 + 0.1 * rating) - base. */
export function reviewBonus(basePoints: number, rating: number): number {
  return Math.round(basePoints * (0.8 + 0.1 * rating)) - basePoints;
}
