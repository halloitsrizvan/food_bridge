import { z } from "zod";
import { ClaimOfferSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { claimService } from "@/server/services/claim.service";

// Taker contacts a giver's post.
export const POST = route(
  { auth: ["TAKER"], active: true, onboarded: true, body: ClaimOfferSchema, rateLimit: { name: "claim-create", limit: 20, windowMs: 60_000 } },
  async ({ user, body, params }) => ok(await claimService.createFromTaker(user!, z.uuid().parse(params.id), body.needId), 201),
);
