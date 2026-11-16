import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { Db } from "./db";

const full = { offer: { include: { giver: true } }, giver: true, taker: true, need: true } satisfies Prisma.ClaimInclude;
export type ClaimFull = Prisma.ClaimGetPayload<{ include: typeof full }>;

export const claimRepository = {
  create: (db: Db, data: Prisma.ClaimUncheckedCreateInput) => db.claim.create({ data }),
  findFull: (id: string, db: Db = prisma) => db.claim.findUnique({ where: { id }, include: full }),
  update: (db: Db, id: string, data: Prisma.ClaimUncheckedUpdateInput) => db.claim.update({ where: { id }, data }),
  activeForOffer: (db: Db, offerId: string) =>
    db.claim.findFirst({ where: { offerId, status: { in: ["PENDING", "ACCEPTED"] } } }),

  lock: async (tx: Db, id: string) => {
    await tx.$queryRaw`SELECT id FROM claims WHERE id = ${id}::uuid FOR UPDATE`;
  },

  listForUser: (userId: string, take = 100) =>
    prisma.claim.findMany({
      where: { OR: [{ giverId: userId }, { takerId: userId }] },
      include: full,
      orderBy: { createdAt: "desc" },
      take,
    }),

  expiredHolds: (now: Date) =>
    prisma.claim.findMany({ where: { status: "PENDING", holdUntil: { lte: now } }, include: full, take: 200 }),

  /** Accepted/pending claims whose offer is gone: used when an offer expires. */
  activeForOfferIds: (ids: string[]) =>
    prisma.claim.findMany({ where: { offerId: { in: ids }, status: { in: ["PENDING", "ACCEPTED"] } }, include: full }),

  /** For trust: completed vs claims that lapsed while this account had to respond. */
  trustCounts: async (userId: string) => {
    const [completed, lapsed] = await Promise.all([
      prisma.claim.count({ where: { status: "COMPLETED", OR: [{ giverId: userId }, { takerId: userId }] } }),
      prisma.claim.count({
        where: {
          status: "EXPIRED",
          OR: [
            { giverId: userId, initiatedBy: "TAKER" },
            { takerId: userId, initiatedBy: "GIVER" },
          ],
        },
      }),
    ]);
    return { completed, failed: lapsed };
  },

  completedSince: (since: Date) =>
    prisma.claim.findMany({ where: { status: "COMPLETED", completedAt: { gte: since } }, select: { completedAt: true, mealsDelivered: true } }),

  impact: async () => {
    const agg = await prisma.claim.aggregate({ where: { status: "COMPLETED" }, _sum: { mealsDelivered: true }, _count: true });
    return { meals: agg._sum.mealsDelivered ?? 0, handovers: agg._count };
  },

  /** avg minutes between offer posting and acceptance */
  avgMatchMinutes: async (): Promise<number | null> => {
    const rows = await prisma.claim.findMany({
      where: { acceptedAt: { not: null } },
      select: { acceptedAt: true, offer: { select: { createdAt: true } } },
      orderBy: { acceptedAt: "desc" },
      take: 500,
    });
    if (!rows.length) return null;
    const total = rows.reduce((s, r) => s + (r.acceptedAt!.getTime() - r.offer.createdAt.getTime()), 0);
    return Math.round(total / rows.length / 60_000);
  },

  mealsByGiver: async (ids: string[]) => {
    if (!ids.length) return new Map<string, number>();
    const rows = await prisma.claim.groupBy({ by: ["giverId"], where: { giverId: { in: ids }, status: "COMPLETED" }, _sum: { mealsDelivered: true } });
    return new Map(rows.map((r) => [r.giverId, r._sum.mealsDelivered ?? 0]));
  },

  count: (where: Prisma.ClaimWhereInput) => prisma.claim.count({ where }),
};
