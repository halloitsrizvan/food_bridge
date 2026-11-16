import { ok, route } from "@/server/lib/route";
import { ConfigPatchSchema, configService } from "@/server/services/config.service";

export const GET = route({ auth: ["GOV"] }, async () => ok(await configService.get()));

export const PATCH = route({ auth: ["GOV"], body: ConfigPatchSchema }, async ({ body }) => ok(await configService.patch(body)));
