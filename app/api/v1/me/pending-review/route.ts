import { ok, route } from "@/server/lib/route";
import { trustService } from "@/server/services/trust.service";

// The handover this user still has to rate (reviews are mandatory), or null.
export const GET = route({ auth: ["GIVER", "TAKER"] }, async ({ user }) => ok(await trustService.pendingReview(user!.id)));
