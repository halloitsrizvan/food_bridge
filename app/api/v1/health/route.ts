import { ok, route } from "@/server/lib/route";
import { healthService } from "@/server/services/health.service";

export const GET = route({}, async () => {
  return ok(await healthService.check());
});
