import type { Config } from "./config";

export type Category = "COOKED" | "PACKAGED" | "RAW";
const HOUR = 3_600_000;

/** COOKED: cookedAt + 4h, RAW: + 24h, PACKAGED: the printed expiry. */
export function safeUntil(
  category: Category,
  cookedAt: Date | null,
  expectedExpiryAt: Date,
  cfg: Pick<Config, "safeHours">,
  now = new Date(),
): Date {
  if (category === "PACKAGED") return expectedExpiryAt;
  const base = cookedAt ?? now;
  return new Date(base.getTime() + cfg.safeHours[category] * HOUR);
}

export const effectiveExpiry = (o: { expectedExpiryAt: Date; safeUntil: Date }): Date =>
  new Date(Math.min(o.expectedExpiryAt.getTime(), o.safeUntil.getTime()));

export const isExpired = (o: { expectedExpiryAt: Date; safeUntil: Date }, now = new Date()) =>
  effectiveExpiry(o).getTime() <= now.getTime();

/** Fraction of the offer window already used (0..1). Window starts at the later of createdAt / scheduledFor. */
export function elapsedFraction(start: Date, end: Date, now = new Date()): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / total));
}

export function minutesLeft(end: Date, now = new Date()): number {
  return Math.floor((end.getTime() - now.getTime()) / 60_000);
}
