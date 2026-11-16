// Repositories own ALL Prisma access. Services never import prisma directly.
import type { AccountStatus, Prisma, Profile, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { Db } from "./db";

export const profileRepository = {
  findById: (id: string, db: Db = prisma): Promise<Profile | null> => db.profile.findUnique({ where: { id } }),
  findByEmail: (email: string): Promise<Profile | null> => prisma.profile.findUnique({ where: { email } }),
  findManyByIds: (ids: string[]) => prisma.profile.findMany({ where: { id: { in: ids } } }),
  create: (data: Prisma.ProfileUncheckedCreateInput) => prisma.profile.create({ data }),
  update: (id: string, data: Prisma.ProfileUncheckedUpdateInput, db: Db = prisma) =>
    db.profile.update({ where: { id }, data }),
  listGov: () => prisma.profile.findMany({ where: { role: "GOV" }, select: { id: true } }),

  /** Bounding-box prefilter: active, open takers near a point, with their soonest open need. */
  takersInBox: (box: { minLat: number; maxLat: number; minLng: number; maxLng: number }, limit = 300) =>
    prisma.profile.findMany({
      where: {
        role: "TAKER",
        onboarded: true,
        status: "ACTIVE",
        openToReceive: true,
        lat: { gte: box.minLat, lte: box.maxLat },
        lng: { gte: box.minLng, lte: box.maxLng },
      },
      include: {
        needs: { where: { status: "OPEN", neededBy: { gt: new Date() } }, orderBy: { neededBy: "asc" }, take: 1 },
      },
      take: limit,
    }),

  /** Meals each account received in the last 7 days (fairness factor). */
  mealsReceivedLast7Days: async (ids: string[]): Promise<Map<string, number>> => {
    if (!ids.length) return new Map();
    const rows = await prisma.claim.groupBy({
      by: ["takerId"],
      where: { takerId: { in: ids }, status: "COMPLETED", completedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
      _sum: { mealsDelivered: true },
    });
    return new Map(rows.map((r) => [r.takerId, r._sum.mealsDelivered ?? 0]));
  },

  listForGov: (f: { q?: string; role?: Role; status?: AccountStatus }, page: number, limit: number) => {
    const where: Prisma.ProfileWhereInput = {
      ...(f.role && { role: f.role }),
      ...(f.status && { status: f.status }),
      ...(f.q && { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { email: { contains: f.q, mode: "insensitive" } }] }),
    };
    return Promise.all([
      prisma.profile.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.profile.count({ where }),
    ]);
  },

  topGivers: (take: number) =>
    prisma.profile.findMany({ where: { role: "GIVER", onboarded: true, status: "ACTIVE" }, orderBy: { points: "desc" }, take }),

  count: (where: Prisma.ProfileWhereInput) => prisma.profile.count({ where }),
};
