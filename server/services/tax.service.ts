import type { Profile } from "@prisma/client";
import type { GrantTaxReduction, TaxReductionRow } from "@/lib/schemas/tax";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { notificationService } from "./notification.service";

const row = (r: { id: string; giverId: string; taxType: string; percent: number; validUntil: Date; reason: string; createdAt: Date; giver: { name: string; email: string }; grantedBy: { name: string } }): TaxReductionRow => ({
  id: r.id,
  giverId: r.giverId,
  giverName: r.giver.name,
  giverEmail: r.giver.email,
  taxType: r.taxType,
  percent: r.percent,
  validUntil: r.validUntil.toISOString().slice(0, 10),
  reason: r.reason,
  grantedBy: r.grantedBy.name,
  createdAt: r.createdAt.toISOString(),
});

const include = { giver: { select: { name: true, email: true } }, grantedBy: { select: { name: true } } } as const;

export const taxService = {
  async list(giverId?: string): Promise<TaxReductionRow[]> {
    const rows = await prisma.taxReduction.findMany({ where: giverId ? { giverId } : {}, include, orderBy: { createdAt: "desc" }, take: 100 });
    return rows.map(row);
  },

  /** Records the reduction, then alerts the giver (bell, live toast and email when configured). */
  async grant(admin: Profile, input: GrantTaxReduction): Promise<TaxReductionRow> {
    if (admin.role !== "GOV") throw AppError.forbidden("Only government administrators can grant tax reductions");
    const giver = await prisma.profile.findUnique({ where: { id: input.giverId } });
    if (!giver || giver.role !== "GIVER") throw AppError.notFound("Giver not found");
    const created = await prisma.taxReduction.create({
      data: { giverId: giver.id, taxType: input.taxType, percent: input.percent, reason: input.reason, validUntil: new Date(`${input.validUntil}T00:00:00.000Z`), grantedById: admin.id },
      include,
    });
    const until = new Date(`${input.validUntil}T00:00:00.000Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    await notificationService.notify(
      {
        userId: giver.id,
        type: "tax",
        title: `${input.percent}% ${input.taxType} reduction granted`,
        body: `The government has granted you a ${input.percent}% reduction in ${input.taxType}, valid until ${until}. Reason: ${input.reason}`,
        link: "/dashboard/notifications",
      },
      { email: true },
    );
    return row(created);
  },
};
