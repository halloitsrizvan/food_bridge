import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { notificationService } from "@/server/services/notification.service";

export const POST = route({ auth: true, body: z.object({ ids: z.array(z.uuid()).max(100).optional() }) }, async ({ user, body }) => {
  await notificationService.markRead(user!.id, body.ids);
  return ok({ ok: true });
});
