import { ok, route } from "@/server/lib/route";
import { configService } from "@/server/services/config.service";

// Public, non-sensitive limits the post form needs (the safe-window ceilings set by the government).
export const GET = route({ rateLimit: { name: "public-config", limit: 120, windowMs: 60_000 } }, async () => {
  const c = await configService.get();
  return ok({ safeHours: c.safeHours, safeHoursMax: c.safeHoursMax });
});
