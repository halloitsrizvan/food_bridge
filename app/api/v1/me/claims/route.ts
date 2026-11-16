import { ok, route } from "@/server/lib/route";
import { claimService } from "@/server/services/claim.service";

export const GET = route({ auth: ["GIVER", "TAKER"] }, async ({ user }) => ok(await claimService.listMine(user!)));
