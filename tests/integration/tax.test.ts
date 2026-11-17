/** DB-backed test for the government tax reduction: it is recorded and the giver is alerted. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GrantTaxReductionSchema } from "@/lib/schemas/tax";

vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), connection: async () => {} }));

const hasDb = Boolean(process.env.DATABASE_URL);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

describe("tax reduction input", () => {
  const ok = { giverId: randomUUID(), taxType: "GST" as const, percent: 25, validUntil: inDays(30), reason: "Donated many meals" };
  it("accepts a valid reduction", () => expect(GrantTaxReductionSchema.safeParse(ok).success).toBe(true));
  it("rejects out-of-range percent, past dates and short reasons", () => {
    expect(GrantTaxReductionSchema.safeParse({ ...ok, percent: 0 }).success).toBe(false);
    expect(GrantTaxReductionSchema.safeParse({ ...ok, percent: 101 }).success).toBe(false);
    expect(GrantTaxReductionSchema.safeParse({ ...ok, percent: 12.5 }).success).toBe(false);
    expect(GrantTaxReductionSchema.safeParse({ ...ok, validUntil: inDays(-2) }).success).toBe(false);
    expect(GrantTaxReductionSchema.safeParse({ ...ok, reason: "short" }).success).toBe(false);
  });
});

describe.skipIf(!hasDb)("tax reduction (integration)", () => {
  const ids = { gov: randomUUID(), giver: randomUUID(), taker: randomUUID() };
  let prisma: typeof import("@/server/lib/prisma").prisma;
  let taxService: typeof import("@/server/services/tax.service").taxService;
  let profiles: Awaited<ReturnType<typeof prisma.profile.findMany>>;
  const who = (id: string) => profiles.find((p) => p.id === id)!;

  beforeAll(async () => {
    ({ prisma } = await import("@/server/lib/prisma"));
    ({ taxService } = await import("@/server/services/tax.service"));
    const base = { onboarded: true, address: "Street 1", area: "Taxville", phone: "+919999900002" };
    await prisma.profile.createMany({
      data: [
        { id: ids.gov, role: "GOV", name: "Tax Admin", email: `gov-${ids.gov}@itest.local`, ...base },
        { id: ids.giver, role: "GIVER", giverKind: "RESTAURANT", name: "Tax Giver", email: `giver-${ids.giver}@itest.local`, ...base },
        { id: ids.taker, role: "TAKER", takerKind: "CHARITY", name: "Tax Taker", email: `taker-${ids.taker}@itest.local`, ...base },
      ],
    });
    profiles = await prisma.profile.findMany({ where: { id: { in: Object.values(ids) } } });
  });

  afterAll(async () => {
    if (!prisma) return;
    const all = Object.values(ids);
    await prisma.taxReduction.deleteMany({ where: { giverId: ids.giver } });
    await prisma.notification.deleteMany({ where: { userId: { in: all } } });
    await prisma.profile.deleteMany({ where: { id: { in: all } } });
    await prisma.$disconnect();
  });

  const input = (giverId: string) => ({ giverId, taxType: "Income tax" as const, percent: 40, validUntil: inDays(90), reason: "Donated 1,200 meals this quarter" });

  it("records the reduction and alerts the giver", async () => {
    const row = await taxService.grant(who(ids.gov), input(ids.giver));
    expect(row).toMatchObject({ giverName: "Tax Giver", percent: 40, taxType: "Income tax", grantedBy: "Tax Admin" });
    const alert = await prisma.notification.findFirst({ where: { userId: ids.giver, type: "tax" } });
    expect(alert?.title).toBe("40% Income tax reduction granted");
    expect(alert?.body).toContain("Donated 1,200 meals this quarter");
    expect((await taxService.list(ids.giver)).map((r) => r.id)).toContain(row.id);
  });

  it("only government can grant, and only to givers", async () => {
    await expect(taxService.grant(who(ids.giver), input(ids.giver))).rejects.toMatchObject({ status: 403 });
    await expect(taxService.grant(who(ids.gov), input(ids.taker))).rejects.toMatchObject({ status: 404 });
    await expect(taxService.grant(who(ids.gov), input(randomUUID()))).rejects.toMatchObject({ status: 404 });
  });
});
