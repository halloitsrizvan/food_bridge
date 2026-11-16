import { ok, route } from "@/server/lib/route";
import { approximateLocation } from "@/server/services/geo.service";

// Approximate (city-level) fallback when the browser refuses to share precise location.
export const GET = route({ rateLimit: { name: "geo-ip", limit: 30, windowMs: 60_000 } }, async ({ req }) => ok(await approximateLocation(req)));
