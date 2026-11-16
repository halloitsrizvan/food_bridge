// Reviews, complaints, appeals, point ledger, app config, notifications.
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { Db } from "./db";

export const trustRepository = {
  // reviews
  createReview: (data: Prisma.ReviewUncheckedCreateInput) => prisma.review.create({ data }),
  findReview: (claimId: string, fromId: string) => prisma.review.findUnique({ where: { claimId_fromId: { claimId, fromId } } }),
  ratingStats: async (toId: string) => {
    const a = await prisma.review.aggregate({ where: { toId }, _avg: { rating: true }, _count: true });
    return { avgRating: a._avg.rating, reviewCount: a._count };
  },

  // complaints
  createComplaint: (data: Prisma.ComplaintUncheckedCreateInput) => prisma.complaint.create({ data }),
  findComplaint: (claimId: string, fromId: string) => prisma.complaint.findUnique({ where: { claimId_fromId: { claimId, fromId } } }),
  recentComplaints: (againstId: string, since: Date) =>
    prisma.complaint.findMany({ where: { againstId, createdAt: { gte: since }, weight: { gt: 0 } }, select: { weight: true, createdAt: true } }),
  zeroRecentComplaints: (againstId: string, since: Date) =>
    prisma.complaint.updateMany({ where: { againstId, createdAt: { gte: since } }, data: { weight: 0 } }),
  listComplaintsForGov: (take = 100) =>
    prisma.complaint.findMany({
      include: { from: true, against: true, claim: { include: { offer: { select: { title: true } } } } },
      orderBy: { createdAt: "desc" },
      take,
    }),
  count: (since: Date) => prisma.complaint.count({ where: { createdAt: { gte: since }, weight: { gt: 0 } } }),

  // appeals
  createAppeal: (data: Prisma.AppealUncheckedCreateInput) => prisma.appeal.create({ data }),
  openAppealFor: (accountId: string) => prisma.appeal.findFirst({ where: { accountId, status: "OPEN" } }),
  findAppeal: (id: string) => prisma.appeal.findUnique({ where: { id }, include: { account: true } }),
  updateAppeal: (id: string, data: Prisma.AppealUncheckedUpdateInput) => prisma.appeal.update({ where: { id }, data }),
  listAppeals: (take = 100) => prisma.appeal.findMany({ include: { account: true }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take }),

  // ledger
  addLedger: (db: Db, data: Prisma.PointLedgerUncheckedCreateInput) => db.pointLedger.create({ data }),

  // config
  getConfig: () => prisma.appConfig.findUnique({ where: { key: "main" } }),
  setConfig: (value: Prisma.InputJsonValue) =>
    prisma.appConfig.upsert({ where: { key: "main" }, update: { value }, create: { key: "main", value } }),

  // notifications
  createNotifications: (rows: Prisma.NotificationCreateManyInput[]) => prisma.notification.createMany({ data: rows }),
  listNotifications: (userId: string, take = 50) =>
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take }),
  unreadCount: (userId: string) => prisma.notification.count({ where: { userId, readAt: null } }),
  markRead: (userId: string, ids?: string[]) =>
    prisma.notification.updateMany({ where: { userId, readAt: null, ...(ids && { id: { in: ids } }) }, data: { readAt: new Date() } }),
  existsNotification: (userId: string, type: string, link: string) =>
    prisma.notification.findFirst({ where: { userId, type, link }, select: { id: true } }),
};
