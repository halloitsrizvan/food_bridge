import type { Config } from "./config";

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
