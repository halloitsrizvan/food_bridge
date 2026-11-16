import { SignupSchema } from "@/lib/schemas/profile";
import { ok, route } from "@/server/lib/route";
import { profileService } from "@/server/services/profile.service";

export const POST = route(
  { body: SignupSchema, rateLimit: { name: "signup", limit: 5, windowMs: 60_000 } },
  async ({ body }) => ok(await profileService.signup(body), 201),
);
