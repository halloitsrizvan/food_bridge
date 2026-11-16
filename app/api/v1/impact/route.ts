import { ok, route } from "@/server/lib/route";
import { impactService } from "@/server/services/impact.service";

export const GET = route({ rateLimit: { name: "impact", limit: 120, windowMs: 60_000 } }, async () => ok(await impactService.get()));
