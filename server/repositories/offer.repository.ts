import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { Db } from "./db";

const withGiver = { giver: true } satisfies Prisma.OfferInclude;
export type OfferWithGiver = Prisma.OfferGetPayload<{ include: typeof withGiver }>;

const live = (now: Date): Prisma.OfferWhereInput => ({
  status: "OPEN",
  expectedExpiryAt: { gt: now },
  safeUntil: { gt: now },
  giver: { status: "ACTIVE" }, // suspended givers are hidden everywhere
  direct: false, // private offers made to one specific receiver request
});

export const offerRepository = {
  create: (data: Prisma.OfferUncheckedCreateInput) => prisma.offer.create({ data, include: withGiver }),
  findById: (id: string, db: Db = prisma) => db.offer.findUnique({ where: { id }, include: withGiver }),
  update: (id: string, data: Prisma.OfferUncheckedUpdateInput, db: Db = prisma) => db.offer.update({ where: { id }, data }),
  updateMany: (where: Prisma.OfferWhereInput, data: Prisma.OfferUncheckedUpdateManyInput) => prisma.offer.updateMany({ where, data }),

  /** Row lock: serialises concurrent claims on one offer. */
  lock: async (tx: Db, id: string) => {
    await tx.$queryRaw`SELECT id FROM offers WHERE id = ${id}::uuid FOR UPDATE`;
  },

  listPublic: async (
    f: { area?: string; q?: string; diet?: "VEG" | "NON_VEG"; category?: "COOKED" | "PACKAGED" | "RAW"; maxMinutesLeft?: number; sort: "soonest" | "newest" },
    page: number,
    limit: number,
    now = new Date(),
  ) => {
    const and: Prisma.OfferWhereInput[] = [live(now)];
    if (f.area) and.push({ giver: { area: { contains: f.area, mode: "insensitive" } } });
    if (f.q) and.push({ OR: [{ title: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] });
    if (f.diet) and.push({ diet: { in: [f.diet, "BOTH"] } });
    if (f.category) and.push({ category: f.category });
    if (f.maxMinutesLeft) {
      const t = new Date(now.getTime() + f.maxMinutesLeft * 60_000);
      and.push({ OR: [{ expectedExpiryAt: { lte: t } }, { safeUntil: { lte: t } }] });
    }
    const where = { AND: and };
    const [items, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        include: withGiver,
        orderBy: f.sort === "newest" ? { createdAt: "desc" } : { expectedExpiryAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.offer.count({ where }),
    ]);
    return { items, total };
  },

  /** Open offers inside a bounding box (taker feed). */
  openInBox: (box: { minLat: number; maxLat: number; minLng: number; maxLng: number }, now = new Date(), take = 200) =>
    prisma.offer.findMany({
      where: {
        ...live(now),
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }],
        giver: { status: "ACTIVE", lat: { gte: box.minLat, lte: box.maxLat }, lng: { gte: box.minLng, lte: box.maxLng } },
      },
      include: withGiver,
      orderBy: { expectedExpiryAt: "asc" },
      take,
    }),

  listByGiver: (giverId: string, take = 100) =>
    prisma.offer.findMany({
      where: { giverId },
      include: { giver: true, claims: { where: { status: { in: ["PENDING", "ACCEPTED", "COMPLETED"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      take,
    }),

  /** Offers the sweeper must look at. */
  forSweep: () =>
    prisma.offer.findMany({
      where: { status: { in: ["OPEN", "CONTACTED", "SETTLED"] } },
      include: withGiver,
      orderBy: { expectedExpiryAt: "asc" },
      take: 300,
    }),

  count: (where: Prisma.OfferWhereInput) => prisma.offer.count({ where }),
  findManyForGov: (where: Prisma.OfferWhereInput, take = 300) =>
    prisma.offer.findMany({ where, include: withGiver, orderBy: { expectedExpiryAt: "asc" }, take }),
};
