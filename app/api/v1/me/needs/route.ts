import { ok, route } from "@/server/lib/route";
import { needService } from "@/server/services/need.service";

export const GET = route({ auth: ["TAKER"] }, async ({ user }) => ok(await needService.listMine(user!)));
