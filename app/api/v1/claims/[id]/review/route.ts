import { z } from "zod";
import { ReviewSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { trustService } from "@/server/services/trust.service";

export const POST = route({ auth: ["GIVER", "TAKER"], active: true, body: ReviewSchema }, async ({ user, body, params }) =>
  ok(await trustService.review(user!, z.uuid().parse(params.id), body), 201),
);
