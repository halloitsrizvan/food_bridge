import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { matchService } from "@/server/services/match.service";

export const GET = route({ auth: ["TAKER"] }, async ({ user, params }) =>
  ok(await matchService.offersForNeed(user!, z.uuid().parse(params.id))),
);
