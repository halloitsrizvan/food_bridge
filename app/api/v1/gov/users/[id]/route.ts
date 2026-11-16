import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { trustService } from "@/server/services/trust.service";

export const PATCH = route({ auth: ["GOV"], body: z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }) }, async ({ user, body, params }) =>
  ok(await trustService.setStatus(user!, z.uuid().parse(params.id), body.status)),
);
