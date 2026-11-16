import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { matchService } from "@/server/services/match.service";

// Ranked takers for one of the giver's posts, with the per-factor breakdown.
export const GET = route({ auth: ["GIVER", "GOV"] }, async ({ user, params }) =>
  ok(await matchService.takersForOffer(user!, z.uuid().parse(params.id))),
);
