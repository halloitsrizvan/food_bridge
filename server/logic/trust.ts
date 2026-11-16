import type { Config } from "./config";

export type TrustInput = {
  completed: number;
  failed: number; // claims that expired while this account was the one who had to respond
  avgRating: number | null; // 1..5
  reviewCount: number;
  recentWeightedComplaints: number;
};

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

/** 50 + 30*completedRate + 20*((avgRating-1)/4) - 10*recentWeightedComplaints. No history => neutral 70. */
export function trustScore(i: TrustInput): number {
  const hasHistory = i.completed + i.failed + i.reviewCount > 0;
  const rate = i.completed + i.failed === 0 ? 1 : i.completed / (i.completed + i.failed);
  const rating = i.avgRating == null ? 0.5 : (i.avgRating - 1) / 4;
  const base = hasHistory ? 50 + 30 * rate + 20 * rating : 70;
  return clamp(base - 10 * i.recentWeightedComplaints);
}

/** A complaint is worth as much as the complainant is trusted. */
export const complaintWeight = (complainantTrust: number) => Math.min(1, Math.max(0, complainantTrust / 100));

export function shouldSuspend(
  complaints: { weight: number; createdAt: Date }[],
  cfg: Pick<Config, "suspension">,
  now = new Date(),
): boolean {
  const since = now.getTime() - cfg.suspension.windowDays * 86_400_000;
  const sum = complaints.filter((c) => c.createdAt.getTime() >= since).reduce((s, c) => s + c.weight, 0);
  return sum >= cfg.suspension.weightThreshold;
}
