import { ok, route } from "@/server/lib/route";
import { matchService } from "@/server/services/match.service";

export const GET = route({ auth: ["TAKER"] }, async ({ user }) => ok(await matchService.feedForTaker(user!)));
