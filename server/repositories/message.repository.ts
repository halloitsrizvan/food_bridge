import { prisma } from "../lib/prisma";

export const messageRepository = {
  create: (claimId: string, senderId: string, body: string) => prisma.claimMessage.create({ data: { claimId, senderId, body } }),

  /** Oldest first, newest 200 only. */
  listForClaim: async (claimId: string, take = 200) => (await prisma.claimMessage.findMany({ where: { claimId }, orderBy: { createdAt: "desc" }, take })).reverse(),

  unreadFromSender: (claimId: string, senderId: string) => prisma.claimMessage.count({ where: { claimId, senderId, readAt: null } }),

  /** Marks everything the other side sent as read by the viewer. */
  markRead: (claimId: string, viewerId: string) =>
    prisma.claimMessage.updateMany({ where: { claimId, senderId: { not: viewerId }, readAt: null }, data: { readAt: new Date() } }),

  /** Latest message per claim, for the inbox. */
  latestForClaims: async (claimIds: string[]) => {
    if (!claimIds.length) return new Map<string, { body: string; senderId: string; createdAt: Date }>();
    const rows = await prisma.claimMessage.findMany({ where: { claimId: { in: claimIds } }, orderBy: { createdAt: "desc" }, distinct: ["claimId"], select: { claimId: true, body: true, senderId: true, createdAt: true } });
    return new Map(rows.map((r) => [r.claimId, r]));
  },

  unreadByClaim: async (claimIds: string[], viewerId: string) => {
    if (!claimIds.length) return new Map<string, number>();
    const rows = await prisma.claimMessage.groupBy({ by: ["claimId"], where: { claimId: { in: claimIds }, senderId: { not: viewerId }, readAt: null }, _count: { _all: true } });
    return new Map(rows.map((r) => [r.claimId, r._count._all]));
  },
};
