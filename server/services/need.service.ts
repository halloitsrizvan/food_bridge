import type { Profile } from "@prisma/client";
import type { CreateNeed, NeedDTO } from "@/lib/schemas/food";
import { AppError } from "../lib/errors";
import { approx } from "../logic/geo";
import { needRepository, type NeedWithTaker } from "../repositories/need.repository";
import { maintenanceService } from "./maintenance.service";

export function toNeedDTO(n: NeedWithTaker): NeedDTO {
  return {
    id: n.id,
    title: n.title,
    notes: n.notes,
    diet: n.diet,
    mealsNeeded: n.mealsNeeded,
    neededFrom: n.neededFrom.toISOString(),
    neededBy: n.neededBy.toISOString(),
    mode: n.mode,
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    takerName: n.taker.name,
    takerKind: n.taker.takerKind,
    area: n.taker.area,
    lat: approx(n.taker.lat),
    lng: approx(n.taker.lng),
    members: n.taker.members,
  };
}

export const needService = {
  async create(taker: Profile, input: CreateNeed) {
    if (taker.role !== "TAKER") throw AppError.forbidden("Only receivers can post needs");
    const n = await needRepository.create({ takerId: taker.id, ...input });
    return toNeedDTO(n);
  },

  async listMine(taker: Profile) {
    await maintenanceService.sweepIfStale();
    return (await needRepository.listByTaker(taker.id)).map(toNeedDTO);
  },

  async update(taker: Profile, id: string, patch: { title?: string; notes?: string; mealsNeeded?: number; mode?: "GIVER_DELIVERS" | "TAKER_PICKS_UP" | "EITHER" }) {
    const n = await own(taker, id);
    if (n.status !== "OPEN") throw AppError.conflict("Only open needs can be edited");
    return toNeedDTO({ ...n, ...(await needRepository.update(id, patch)) });
  },

  async cancel(taker: Profile, id: string) {
    const n = await own(taker, id);
    if (n.status !== "OPEN") throw AppError.conflict("Finish or decline the active claim first");
    await needRepository.update(id, { status: "CANCELLED" });
    return { id, status: "CANCELLED" as const };
  },
};

async function own(taker: Profile, id: string) {
  const n = await needRepository.findById(id);
  if (!n || n.takerId !== taker.id) throw AppError.notFound("Need not found");
  return n;
}
