/**
 * DB-backed integration tests. They run only when DATABASE_URL is set (see .env.local)
 * and talk to the real database through the services. Rows are created with random ids
 * and removed afterwards. No Supabase Auth users are needed: profiles reference no auth table.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("claim flow (integration)", () => {
  const ids = { giver: randomUUID(), taker: randomUUID(), taker2: randomUUID() };
  const created = { offers: [] as string[], claims: [] as string[] };
  let prisma: typeof import("@/server/lib/prisma").prisma;
  let claimService: typeof import("@/server/services/claim.service").claimService;
  let offerService: typeof import("@/server/services/offer.service").offerService;
  let trustService: typeof import("@/server/services/trust.service").trustService;
  let needService: typeof import("@/server/services/need.service").needService;
  let profiles: Awaited<ReturnType<typeof prisma.profile.findMany>>;
  const H = 3_600_000;

  const offerInput = () => ({
    title: `itest ${randomUUID().slice(0, 6)}`,
    description: "",
    category: "COOKED" as const,
    diet: "VEG" as const,
    quantityMeals: 12,
    cookedAt: new Date(Date.now() - 30 * 60_000),
    expectedExpiryAt: new Date(Date.now() + 5 * H),
    mode: "EITHER" as const,
  });

  beforeAll(async () => {
    ({ prisma } = await import("@/server/lib/prisma"));
    ({ claimService } = await import("@/server/services/claim.service"));
    ({ offerService } = await import("@/server/services/offer.service"));
    ({ trustService } = await import("@/server/services/trust.service"));
    ({ needService } = await import("@/server/services/need.service"));
    const base = { onboarded: true, address: "Secret Street 1", area: "Testville", phone: "+919999900000" };
    await prisma.profile.createMany({
      data: [
        { id: ids.giver, role: "GIVER", giverKind: "RESTAURANT", name: "IT Giver", email: `giver-${ids.giver}@itest.local`, lat: 11.2588, lng: 75.7804, ...base },
        { id: ids.taker, role: "TAKER", takerKind: "CHARITY", name: "IT Taker", email: `taker-${ids.taker}@itest.local`, lat: 11.262, lng: 75.784, members: 20, ...base },
        { id: ids.taker2, role: "TAKER", takerKind: "CHARITY", name: "IT Taker 2", email: `taker2-${ids.taker2}@itest.local`, lat: 11.263, lng: 75.785, members: 20, ...base },
      ],
    });
    profiles = await prisma.profile.findMany({ where: { id: { in: Object.values(ids) } } });
  });

  afterAll(async () => {
    if (!prisma) return;
    const all = Object.values(ids);
    await prisma.notification.deleteMany({ where: { userId: { in: all } } });
    await prisma.pointLedger.deleteMany({ where: { accountId: { in: all } } });
    await prisma.review.deleteMany({ where: { claim: { giverId: ids.giver } } });
    await prisma.claim.deleteMany({ where: { giverId: ids.giver } });
    await prisma.offer.deleteMany({ where: { giverId: ids.giver } });
    await prisma.need.deleteMany({ where: { takerId: { in: [ids.taker, ids.taker2] } } });
    await prisma.profile.deleteMany({ where: { id: { in: all } } });
    await prisma.$disconnect();
  });

  const who = (id: string) => profiles.find((p) => p.id === id)!;

  it("race: two concurrent claims on one offer -> exactly one wins, the other gets 409", async () => {
    const offer = await offerService.create(who(ids.giver), offerInput());
    created.offers.push(offer.id);
    const results = await Promise.allSettled([
      claimService.createFromTaker(who(ids.taker), offer.id),
      claimService.createFromTaker(who(ids.taker2), offer.id),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const bad = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(bad).toHaveLength(1);
    expect(bad[0].reason).toMatchObject({ status: 409 });
    expect(await prisma.claim.count({ where: { offerId: offer.id, status: { in: ["PENDING", "ACCEPTED"] } } })).toBe(1);
  });

  it("happy path + privacy: offer -> claim -> accept -> OTP handover -> points; address hidden until ACCEPTED", async () => {
    const giver = who(ids.giver);
    const taker = who(ids.taker);
    const offer = await offerService.create(giver, offerInput());
    const { id: claimId } = await claimService.createFromTaker(taker, offer.id);

    // before accept: only area + rounded coordinates, no address / phone, no OTP
    const before = await claimService.get(taker, claimId);
    expect(before.status).toBe("PENDING");
    expect(before.revealed).toBe(false);
    expect(before.giver.address).toBeUndefined();
    expect(before.giver.phone).toBeUndefined();
    expect(JSON.stringify(before)).not.toContain("Secret Street");
    expect(before.otp).toBeNull();
    expect(before.giver.lat).toBe(Math.round(11.2588 * 100) / 100);

    // the taker cannot accept their own request
    await expect(claimService.accept(taker, claimId)).rejects.toMatchObject({ status: 403 });

    const accepted = await claimService.accept(giver, claimId);
    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.otp).toMatch(/^\d{6}$/); // giver sees the code
    const takerView = await claimService.get(taker, claimId);
    expect(takerView.otp).toBeNull(); // taker never sees it
    expect(takerView.revealed).toBe(true);
    expect(takerView.giver.address).toBe("Secret Street 1");

    await expect(claimService.handover(taker, claimId, { otp: accepted.otp === "000000" ? "111111" : "000000" })).rejects.toMatchObject({ status: 400 });
    const done = await claimService.handover(taker, claimId, { otp: accepted.otp! });
    expect(done.claim.status).toBe("COMPLETED");

    // the review comes AFTER the code is accepted and is mandatory for the receiver (not for the giver)
    expect(await prisma.review.count({ where: { claimId } })).toBe(0);
    expect(await trustService.pendingReview(giver.id)).toBeNull();
    expect(await trustService.pendingReview(taker.id)).toMatchObject({ claimId });
    const next = await offerService.create(giver, offerInput()); // the giver is free to post again
    created.offers.push(next.id);
    await expect(claimService.createFromTaker(taker, next.id)).rejects.toMatchObject({ status: 403, code: "REVIEW_REQUIRED" });
    await expect(trustService.review(giver, claimId, { rating: 5, comment: "" })).rejects.toMatchObject({ status: 403 }); // givers do not rate receivers
    await expect(trustService.complain(giver, claimId, "Complaint from the giver should be refused")).rejects.toMatchObject({ status: 403 }); // complaints are receiver-only
    await trustService.review(taker, claimId, { rating: 4, comment: "Warm and on time" });
    expect(await trustService.pendingReview(taker.id)).toBeNull();

    const [g, t] = await Promise.all([prisma.profile.findUnique({ where: { id: ids.giver } }), prisma.profile.findUnique({ where: { id: ids.taker } })]);
    expect(g!.points).toBeGreaterThanOrEqual(10 + 12 + 5); // base + meals + fast bonus
    expect(t!.points).toBe(0); // receivers have no points
    expect((await prisma.offer.findUnique({ where: { id: offer.id } }))!.status).toBe("DELIVERED");
  });

  it("an unrelated user cannot read a claim", async () => {
    const offer = await offerService.create(who(ids.giver), offerInput());
    const { id } = await claimService.createFromTaker(who(ids.taker), offer.id);
    await expect(claimService.get(who(ids.taker2), id)).rejects.toMatchObject({ status: 404 });
  });

  it("direct offer: giver answers a receiver request without posting food; accept -> normal handover; decline -> cancelled", async () => {
    const giver = who(ids.giver);
    const taker = who(ids.taker2);
    const mkNeed = () =>
      needService.create(taker, {
        title: `itest need ${randomUUID().slice(0, 6)}`,
        notes: "",
        diet: "VEG",
        mealsNeeded: 10,
        neededFrom: new Date(Date.now() - 10 * 60_000),
        neededBy: new Date(Date.now() + 5 * H),
        mode: "EITHER",
      });

    // 1. offer to a request with NO posted food
    const need = await mkNeed();
    const { id: claimId } = await claimService.createDirectOffer(giver, need.id, { meals: 10, safeHours: 3 });
    const pending = await claimService.get(giver, claimId);
    expect(pending.status).toBe("PENDING");
    expect(pending.initiatedBy).toBe("GIVER");
    expect(pending.offer.quantityMeals).toBe(10);
    // the private offer never shows up publicly, and the request is no longer open
    const pub = await offerService.listPublic({ sort: "soonest" }, 1, 50);
    expect(pub.items.some((o) => o.id === pending.offer.id)).toBe(false);
    await expect(offerService.getPublic(pending.offer.id)).rejects.toMatchObject({ status: 404 });
    expect((await prisma.need.findUnique({ where: { id: need.id } }))!.status).toBe("CONTACTED");
    // a second giver response to the same request is refused
    await expect(claimService.createDirectOffer(giver, need.id, { meals: 5, safeHours: 3 })).rejects.toMatchObject({ status: 409 });
    // the giver cannot accept their own offer; the receiver can
    await expect(claimService.accept(giver, claimId)).rejects.toMatchObject({ status: 403 });
    const accepted = await claimService.accept(taker, claimId);
    expect(accepted.status).toBe("ACCEPTED");
    const giverView = await claimService.get(giver, claimId);
    expect(giverView.otp).toMatch(/^\d{6}$/);
    expect((await claimService.get(taker, claimId)).otp).toBeNull();
    const done = await claimService.handover(taker, claimId, { otp: giverView.otp! });
    expect(done.claim.status).toBe("COMPLETED");
    expect((await prisma.need.findUnique({ where: { id: need.id } }))!.status).toBe("FULFILLED");
    expect((await prisma.offer.findUnique({ where: { id: pending.offer.id } }))!.status).toBe("DELIVERED");
    await trustService.review(taker, claimId, { rating: 5, comment: "" }); // mandatory review for the receiver

    // 2. decline: the private offer is cancelled (not re-listed) and the request reopens
    const need2 = await mkNeed();
    const { id: claim2 } = await claimService.createDirectOffer(giver, need2.id, { meals: 4, safeHours: 3 });
    const c2 = await claimService.get(giver, claim2);
    await claimService.decline(taker, claim2);
    expect((await prisma.offer.findUnique({ where: { id: c2.offer.id } }))!.status).toBe("CANCELLED");
    expect((await prisma.need.findUnique({ where: { id: need2.id } }))!.status).toBe("OPEN");
    const pub2 = await offerService.listPublic({ sort: "soonest" }, 1, 50);
    expect(pub2.items.some((o) => o.id === c2.offer.id)).toBe(false);
  });
});
