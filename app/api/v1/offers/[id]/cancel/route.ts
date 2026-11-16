import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

export const POST = route({ auth: ["GIVER"], active: true }, async ({ user, params }) =>
  ok(await offerService.cancel(user!, z.uuid().parse(params.id))),
);
