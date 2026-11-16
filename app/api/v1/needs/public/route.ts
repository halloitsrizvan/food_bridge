import { NeedQuerySchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { needService } from "@/server/services/need.service";

// Public: what receivers are asking for (area only, never exact address or private notes).
export const GET = route({ query: NeedQuerySchema, rateLimit: { name: "needs-public", limit: 120, windowMs: 60_000 } }, async ({ query }) => {
  const { page, limit, lat, lng, ...filters } = query;
  return ok(await needService.listPublic(filters, page, limit, lat != null && lng != null ? { lat, lng } : undefined));
});
