import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { needService } from "@/server/services/need.service";

export const POST = route({ auth: ["TAKER"], active: true }, async ({ user, params }) =>
  ok(await needService.cancel(user!, z.uuid().parse(params.id))),
);
