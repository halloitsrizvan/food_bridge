import { AppError } from "./errors";

// In-memory fixed-window limiter. PER INSTANCE ONLY: on Vercel each lambda has its
// own memory, so limits are approximate. Swap for @upstash/ratelimit in production.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) throw AppError.rateLimited(Math.ceil((b.resetAt - now) / 1000));
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear();
}
