import { CreateNeedSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { matchService } from "@/server/services/match.service";
import { needService } from "@/server/services/need.service";

// Givers browse open needs near them (best match first).
export const GET = route({ auth: ["GIVER"] }, async ({ user }) => ok(await matchService.needsForGiver(user!)));

export const POST = route(
  { auth: ["TAKER"], active: true, onboarded: true, body: CreateNeedSchema, rateLimit: { name: "needs-create", limit: 20, windowMs: 60_000 } },
  async ({ user, body }) => ok(await needService.create(user!, body), 201),
);
