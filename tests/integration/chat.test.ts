/**
 * DB-backed integration test for the handover chat. Runs only when DATABASE_URL is set.
 * Rows use random ids and are removed afterwards (messages cascade with their claim).
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("handover chat (integration)", () => {
  const ids = { giver: randomUUID(), taker: randomUUID(), outsider: randomUUID() };
  let prisma: typeof import("@/server/lib/prisma").prisma;
  let claimService: typeof import("@/server/services/claim.service").claimService;
  let offerService: typeof import("@/server/services/offer.service").offerService;
  let messageService: typeof import("@/server/services/message.service").messageService;
  let profiles: Awaited<ReturnType<typeof prisma.profile.findMany>>;
  const who = (id: string) => profiles.find((p) => p.id === id)!;

  beforeAll(async () => {
    ({ prisma } = await import("@/server/lib/prisma"));
    ({ claimService } = await import("@/server/services/claim.service"));
    ({ offerService } = await import("@/server/services/offer.service"));
    ({ messageService } = await import("@/server/services/message.service"));
    const base = { onboarded: true, address: "Secret Street 1", area: "Chatville", phone: "+919999900001" };
    await prisma.profile.createMany({
      data: [
        { id: ids.giver, role: "GIVER", giverKind: "RESTAURANT", name: "Chat Giver", email: `giver-${ids.giver}@itest.local`, lat: 11.2588, lng: 75.7804, ...base },
        { id: ids.taker, role: "TAKER", takerKind: "CHARITY", name: "Chat Taker", email: `taker-${ids.taker}@itest.local`, lat: 11.262, lng: 75.784, members: 20, ...base },
        { id: ids.outsider, role: "TAKER", takerKind: "CHARITY", name: "Chat Outsider", email: `out-${ids.outsider}@itest.local`, lat: 11.263, lng: 75.785, members: 5, ...base },
      ],
    });
    profiles = await prisma.profile.findMany({ where: { id: { in: Object.values(ids) } } });
  });

  afterAll(async () => {
    if (!prisma) return;
    const all = Object.values(ids);
    await prisma.notification.deleteMany({ where: { userId: { in: all } } });
    await prisma.claim.deleteMany({ where: { giverId: ids.giver } }); // cascades claim_messages
    await prisma.offer.deleteMany({ where: { giverId: ids.giver } });
    await prisma.profile.deleteMany({ where: { id: { in: all } } });
    await prisma.$disconnect();
  });

  const newClaim = async () => {
    const offer = await offerService.create(who(ids.giver), {
      title: `chat itest ${randomUUID().slice(0, 6)}`,
      description: "",
      category: "COOKED",
      diet: "VEG",
      quantityMeals: 10,
      cookedAt: new Date(Date.now() - 30 * 60_000),
      expectedExpiryAt: new Date(Date.now() + 5 * 3_600_000),
      mode: "EITHER",
    });
    return (await claimService.createFromTaker(who(ids.taker), offer.id)).id;
  };

  it("only the two parties can read or write; messages, read receipts and one alert per burst", async () => {
    const claimId = await newClaim();
    const giver = who(ids.giver);
    const taker = who(ids.taker);

    // outsiders get 404 on both read and write
    await expect(messageService.thread(who(ids.outsider), claimId)).rejects.toMatchObject({ status: 404 });
    await expect(messageService.send(who(ids.outsider), claimId, "hi")).rejects.toMatchObject({ status: 404 });

    await messageService.send(taker, claimId, "Hello, I can collect at 6 pm");
    await messageService.send(taker, claimId, "Is that fine?");

    // two messages in a burst -> a single chat notification for the giver
    const alerts = await prisma.notification.count({ where: { userId: ids.giver, type: "chat" } });
    expect(alerts).toBe(1);

    // giver's inbox shows 2 unread and the thread marks them read
    const inbox = await messageService.inbox(giver);
    const row = inbox.threads.find((t) => t.claimId === claimId)!;
    expect(row.unread).toBe(2);
    expect(row.lastMine).toBe(false);
    const view = await messageService.thread(giver, claimId);
    expect(view.messages.map((m) => m.body)).toEqual(["Hello, I can collect at 6 pm", "Is that fine?"]);
    expect(view.messages.every((m) => !m.mine)).toBe(true);
    expect(view.writable).toBe(true);
    expect((await messageService.inbox(giver)).totalUnread).toBe(0);

    // the sender now sees "read" on their own messages
    const back = await messageService.thread(taker, claimId);
    expect(back.messages.every((m) => m.mine && m.read)).toBe(true);

    // replying works both ways
    await messageService.send(giver, claimId, "Yes, 6 pm works");
    expect((await messageService.thread(taker, claimId)).messages).toHaveLength(3);
  });

  it("a declined handover is read-only", async () => {
    const claimId = await newClaim();
    await messageService.send(who(ids.taker), claimId, "before decline");
    await claimService.decline(who(ids.giver), claimId);
    const view = await messageService.thread(who(ids.giver), claimId);
    expect(view.writable).toBe(false);
    expect(view.messages).toHaveLength(1);
    await expect(messageService.send(who(ids.giver), claimId, "after decline")).rejects.toMatchObject({ status: 409 });
  });
});
