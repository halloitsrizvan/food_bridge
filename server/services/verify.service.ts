import { claimRepository } from "../repositories/claim.repository";

/** Public verification card for the poster QR. Only non-sensitive facts. */
export async function verifyClaim(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const c = await claimRepository.findFull(id);
  if (!c || c.status !== "COMPLETED") return null;
  return {
    id: c.id,
    giverName: c.giver.name,
    area: c.giver.area,
    meals: c.mealsDelivered ?? 0,
    completedAt: c.completedAt?.toISOString() ?? null,
  };
}
