import { ok, route } from "@/server/lib/route";
import { offerService } from "@/server/services/offer.service";

export const GET = route({ auth: ["GIVER"] }, async ({ user }) => ok(await offerService.listMine(user!)));
