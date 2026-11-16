import { AppealSchema } from "@/lib/schemas/profile";
import { ok, route } from "@/server/lib/route";
import { trustService } from "@/server/services/trust.service";

export const POST = route({ auth: ["GIVER", "TAKER"], body: AppealSchema, rateLimit: { name: "appeal", limit: 3, windowMs: 60_000 } }, async ({ user, body }) =>
  ok(await trustService.appeal(user!, body.message), 201),
);
