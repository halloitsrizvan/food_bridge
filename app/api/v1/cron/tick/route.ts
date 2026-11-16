import { timingSafeEqual } from "node:crypto";
import { AppError } from "@/server/lib/errors";
import { requireEnv } from "@/server/lib/env";
import { ok, route } from "@/server/lib/route";
import { maintenanceService } from "@/server/services/maintenance.service";

function authorised(req: Request) {
  const expected = Buffer.from(`Bearer ${requireEnv("CRON_SECRET")}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// Vercel cron sends GET with the bearer token; POST is allowed for manual triggers.
const tick = route({}, async ({ req }) => {
  if (!authorised(req)) throw AppError.unauthorized();
  return ok(await maintenanceService.sweep());
});
export const GET = tick;
export const POST = tick;
