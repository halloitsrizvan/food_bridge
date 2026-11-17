import { GrantTaxReductionSchema } from "@/lib/schemas/tax";
import { ok, route } from "@/server/lib/route";
import { taxService } from "@/server/services/tax.service";

export const GET = route({ auth: ["GOV"] }, async () => ok(await taxService.list()));

export const POST = route({ auth: ["GOV"], active: true, body: GrantTaxReductionSchema, rateLimit: { name: "gov-tax", limit: 30, windowMs: 60_000 } }, async ({ user, body }) =>
  ok(await taxService.grant(user!, body), 201),
);
