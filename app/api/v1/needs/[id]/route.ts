import { z } from "zod";
import { UpdateNeedSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { needService } from "@/server/services/need.service";

export const PATCH = route({ auth: ["TAKER"], active: true, body: UpdateNeedSchema }, async ({ user, body, params }) =>
  ok(await needService.update(user!, z.uuid().parse(params.id), body)),
);
