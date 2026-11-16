import { z } from "zod";
import { ContactNeedSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { claimService } from "@/server/services/claim.service";

// Giver offers one of their posts to an existing need.
export const POST = route(
  { auth: ["GIVER"], active: true, onboarded: true, body: ContactNeedSchema, rateLimit: { name: "need-contact", limit: 20, windowMs: 60_000 } },
  async ({ user, body, params }) => ok(await claimService.createFromGiver(user!, z.uuid().parse(params.id), body.offerId), 201),
);
