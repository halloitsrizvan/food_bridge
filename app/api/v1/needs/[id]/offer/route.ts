import { z } from "zod";
import { DirectOfferSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { claimService } from "@/server/services/claim.service";

// A giver answers a receiver's request without posting food first: notifies the receiver, who can accept.
export const POST = route(
  { auth: ["GIVER"], active: true, onboarded: true, body: DirectOfferSchema, rateLimit: { name: "need-offer", limit: 20, windowMs: 60_000 } },
  async ({ user, body, params }) => ok(await claimService.createDirectOffer(user!, z.uuid().parse(params.id), body), 201),
);
