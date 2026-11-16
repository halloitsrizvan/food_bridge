import { z } from "zod";
import { ok, route } from "@/server/lib/route";
import { profileRepository } from "@/server/repositories/profile.repository";
import { profileService } from "@/server/services/profile.service";

const PatchMe = z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().regex(/^\+?[0-9][0-9\s-]{7,14}$/) }).partial();

export const GET = route({ auth: true, rateLimit: { name: "me", limit: 120, windowMs: 60_000 } }, async ({ user }) =>
  ok(await profileService.toDTO(user!)),
);

export const PATCH = route({ auth: true, active: true, body: PatchMe }, async ({ user, body }) =>
  ok(await profileService.toDTO(await profileRepository.update(user!.id, body))),
);
