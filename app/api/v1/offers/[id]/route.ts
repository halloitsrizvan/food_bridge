import { z } from "zod";
import { UpdateOfferSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

const Id = z.uuid();

export const GET = route({}, async ({ params }) => ok(await offerService.getPublic(Id.parse(params.id))));

export const PATCH = route({ auth: ["GIVER"], active: true, body: UpdateOfferSchema }, async ({ user, body, params }) =>
  ok(await offerService.update(user!, Id.parse(params.id), body)),
);
