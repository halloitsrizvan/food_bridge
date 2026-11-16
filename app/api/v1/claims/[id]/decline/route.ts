import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { claimService } from "@/server/services/claim.service";

export const POST = route({ auth: ["GIVER", "TAKER"], active: true }, async ({ user, params }) =>
  ok(await claimService.decline(user!, z.uuid().parse(params.id))),
);
