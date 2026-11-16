import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { Db } from "./db";

const withTaker = { taker: true } satisfies Prisma.NeedInclude;
export type NeedWithTaker = Prisma.NeedGetPayload<{ include: typeof withTaker }>;

export const needRepository = {
  create: (data: Prisma.NeedUncheckedCreateInput) => prisma.need.create({ data, include: withTaker }),
  findById: (id: string, db: Db = prisma) => db.need.findUnique({ where: { id }, include: withTaker }),
  update: (id: string, data: Prisma.NeedUncheckedUpdateInput, db: Db = prisma) => db.need.update({ where: { id }, data }),
  listByTaker: (takerId: string, take = 100) =>
    prisma.need.findMany({ where: { takerId }, include: withTaker, orderBy: { createdAt: "desc" }, take }),

  /** Open needs near a giver (bounding box prefilter); suspended takers hidden. */
  openInBox: (box: { minLat: number; maxLat: number; minLng: number; maxLng: number }, now = new Date(), take = 200) =>
    prisma.need.findMany({
      where: {
        status: "OPEN",
        neededBy: { gt: now },
        taker: { status: "ACTIVE", lat: { gte: box.minLat, lte: box.maxLat }, lng: { gte: box.minLng, lte: box.maxLng } },
      },
      include: withTaker,
      orderBy: { neededBy: "asc" },
      take,
    }),

  forSweep: () =>
    prisma.need.findMany({ where: { status: { in: ["OPEN", "CONTACTED"] } }, select: { id: true, neededBy: true, status: true }, take: 500 }),

  openForGov: (take = 300) =>
    prisma.need.findMany({ where: { status: "OPEN", neededBy: { gt: new Date() } }, include: withTaker, orderBy: { neededBy: "asc" }, take }),
  count: (where: Prisma.NeedWhereInput) => prisma.need.count({ where }),
};
