import { OnboardSchema } from "@/lib/schemas/profile";
import { ok, route } from "@/server/lib/route";
import { profileService } from "@/server/services/profile.service";

export const POST = route({ auth: true, body: OnboardSchema, rateLimit: { name: "onboard", limit: 10, windowMs: 60_000 } }, async ({ user, body }) =>
  ok(await profileService.toDTO(await profileService.onboard(user!, body))),
);
