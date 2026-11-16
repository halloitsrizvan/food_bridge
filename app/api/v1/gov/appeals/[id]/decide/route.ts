import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { trustService } from "@/server/services/trust.service";

export const POST = route({ auth: ["GOV"], body: z.object({ decision: z.enum(["APPROVED", "REJECTED"]) }) }, async ({ user, body, params }) =>
  ok(await trustService.decideAppeal(user!, z.uuid().parse(params.id), body.decision)),
);
