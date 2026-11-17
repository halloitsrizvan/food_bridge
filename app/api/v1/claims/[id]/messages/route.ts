import { z } from "zod";
import { SendMessageSchema } from "@/lib/schemas/message";
import { ok, route } from "@/server/lib/route";
import { messageService } from "@/server/services/message.service";

// Handover chat. Only the giver and receiver of the claim can read or write.
export const GET = route({ auth: true, rateLimit: { name: "chat-read", limit: 240, windowMs: 60_000 } }, async ({ user, params }) =>
  ok(await messageService.thread(user!, z.uuid().parse(params.id))),
);

export const POST = route({ auth: true, active: true, body: SendMessageSchema, rateLimit: { name: "chat-send", limit: 40, windowMs: 60_000 } }, async ({ user, params, body }) =>
  ok(await messageService.send(user!, z.uuid().parse(params.id), body.body), 201),
);
