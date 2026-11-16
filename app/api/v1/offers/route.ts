import { CreateOfferSchema, OfferQuerySchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

// Public: live posts, area only (never exact address).
export const GET = route({ query: OfferQuerySchema, rateLimit: { name: "offers-list", limit: 120, windowMs: 60_000 } }, async ({ query }) => {
  const { page, limit, lat, lng, ...filters } = query;
  return ok(await offerService.listPublic(filters, page, limit, lat != null && lng != null ? { lat, lng } : undefined));
});

export const POST = route(
  { auth: ["GIVER"], active: true, onboarded: true, body: CreateOfferSchema, rateLimit: { name: "offers-create", limit: 20, windowMs: 60_000 } },
  async ({ user, body }) => ok(await offerService.create(user!, body), 201),
);
