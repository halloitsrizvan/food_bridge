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

    await expect(claimService.handover(taker, claimId, { otp: accepted.otp === "000000" ? "111111" : "000000", rating: 5 })).rejects.toMatchObject({ status: 400 });
    const done = await claimService.handover(taker, claimId, { otp: accepted.otp!, rating: 4, comment: "Warm and on time" });
    expect(done.claim.status).toBe("COMPLETED");

    // reviews are mandatory: the receiver's rating was recorded with the handover...
    expect(await prisma.review.count({ where: { claimId, fromId: taker.id } })).toBe(1);
    // ...and the giver cannot post or accept anything new until they rate the receiver
    await expect(offerService.create(giver, offerInput())).rejects.toMatchObject({ status: 403, code: "REVIEW_REQUIRED" });
    expect(await trustService.pendingReview(giver.id)).toMatchObject({ claimId });
    await trustService.review(giver, claimId, { rating: 5, comment: "" });
    expect(await trustService.pendingReview(giver.id)).toBeNull();

    const [g, t] = await Promise.all([prisma.profile.findUnique({ where: { id: ids.giver } }), prisma.profile.findUnique({ where: { id: ids.taker } })]);
    expect(g!.points).toBeGreaterThanOrEqual(10 + 12 + 5); // base + meals + fast bonus
    expect(t!.points).toBeGreaterThan(0);
    expect((await prisma.offer.findUnique({ where: { id: offer.id } }))!.status).toBe("DELIVERED");
  });

  it("an unrelated user cannot read a claim", async () => {
    const offer = await offerService.create(who(ids.giver), offerInput());
    const { id } = await claimService.createFromTaker(who(ids.taker), offer.id);
    await expect(claimService.get(who(ids.taker2), id)).rejects.toMatchObject({ status: 404 });
  });
});
