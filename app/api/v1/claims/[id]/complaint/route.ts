import { z } from "zod";
import { ComplaintSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { trustService } from "@/server/services/trust.service";

export const POST = route(
  { auth: ["GIVER", "TAKER"], active: true, body: ComplaintSchema, rateLimit: { name: "complaint", limit: 5, windowMs: 60_000 } },
  async ({ user, body, params }) => ok(await trustService.complain(user!, z.uuid().parse(params.id), body.reason), 201),
);
