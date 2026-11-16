// Services hold business logic. Pure and testable: they only talk to repositories.
import type { Profile } from "@prisma/client";
import type { ProfileDTO } from "@/lib/schemas/profile";
import { profileRepository } from "../repositories/profile.repository";

export type AuthUser = { id: string; email?: string | null; name?: string | null };

export const profileService = {
  /** Return the Profile for an authenticated user, creating it (role USER) on first login. */
  async ensureProfile(user: AuthUser): Promise<Profile> {
    const existing = await profileRepository.findById(user.id);
    if (existing) return existing;
    try {
      return await profileRepository.create({
        id: user.id,
        email: user.email ?? `${user.id}@unknown.local`,
        name: user.name ?? null,
        role: "USER",
      });
    } catch (e) {
      // Concurrent first requests: another one created it between find and create.
      const raced = await profileRepository.findById(user.id);
      if (raced) return raced;
      throw e;
    }
  },

  toDTO(p: Profile): ProfileDTO {
    return { id: p.id, email: p.email, name: p.name, role: p.role, createdAt: p.createdAt.toISOString() };
  },
};
