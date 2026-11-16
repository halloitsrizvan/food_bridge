// Repositories own ALL Prisma access. Services never import prisma directly.
import type { Profile, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";

export const profileRepository = {
  findById: (id: string): Promise<Profile | null> => prisma.profile.findUnique({ where: { id } }),

  create: (data: { id: string; email: string; name?: string | null; role?: Role }): Promise<Profile> =>
    prisma.profile.create({ data }),
};
