import { ok, route } from "@/server/lib/route";
import { govService } from "@/server/services/gov.service";

export const GET = route({ auth: ["GOV"] }, async () => ok(await govService.complaints()));
