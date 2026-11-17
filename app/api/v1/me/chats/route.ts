import { ok, route } from "@/server/lib/route";
import { messageService } from "@/server/services/message.service";

export const GET = route({ auth: true, rateLimit: { name: "chat-inbox", limit: 120, windowMs: 60_000 } }, async ({ user }) => ok(await messageService.inbox(user!)));
