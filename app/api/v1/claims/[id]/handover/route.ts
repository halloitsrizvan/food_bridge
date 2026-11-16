import { z } from "zod";
import { HandoverSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { claimService } from "@/server/services/claim.service";

// 5 attempts / minute / user: a 6-digit code must not be brute-forceable.
export const POST = route(
  { auth: ["TAKER"], active: true, body: HandoverSchema, rateLimit: { name: "handover", limit: 5, windowMs: 60_000 } },
  async ({ user, body, params }) => ok(await claimService.handover(user!, z.uuid().parse(params.id), body)),
);
