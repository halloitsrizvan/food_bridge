import { z } from "zod";
import { RoleSchema, AccountStatusSchema } from "@/lib/schemas/profile";
import { PageSchema } from "@/lib/schemas/food";
import { ok, route } from "@/server/lib/route";
import { govService } from "@/server/services/gov.service";

const Q = PageSchema.extend({ q: z.string().trim().max(80).optional(), role: RoleSchema.optional(), status: AccountStatusSchema.optional() });

export const GET = route({ auth: ["GOV"], query: Q }, async ({ query }) => {
  const { page, limit, ...f } = query;
  return ok(await govService.users(f, page, limit));
});
