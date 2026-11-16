import { ok, route } from "@/server/lib/route";
import { profileService } from "@/server/services/profile.service";

export const GET = route(
  { auth: true, rateLimit: { name: "me", limit: 60, windowMs: 60_000 } },
  async ({ user }) => ok(profileService.toDTO(user!)),
);
