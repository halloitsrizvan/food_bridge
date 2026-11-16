import { ok, route } from "@/server/lib/route";
import { notificationService } from "@/server/services/notification.service";

export const GET = route({ auth: true }, async ({ user }) => ok(await notificationService.list(user!.id)));
