import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { claimService } from "@/server/services/claim.service";

// Exact address / phone are only included for the two parties after ACCEPTED.
export const GET = route({ auth: true }, async ({ user, params }) => ok(await claimService.get(user!, z.uuid().parse(params.id))));
