import type { Profile } from "@prisma/client";
import type { CreateOffer, OfferWithMatch, PublicOffer } from "@/lib/schemas/food";
import { AppError } from "../lib/errors";
import { approx, boundingBox, haversineKm } from "../logic/geo";
import { radiusFor } from "../logic/escalation";
import { rankCandidates, type Candidate } from "../logic/match";
import { effectiveExpiry, elapsedFraction, isExpired, safeUntil } from "../logic/time";
import { offerRepository, type OfferWithGiver } from "../repositories/offer.repository";
import { profileRepository } from "../repositories/profile.repository";
import { configService } from "./config.service";
import { notificationService } from "./notification.service";
import { maintenanceService } from "./maintenance.service";

export function toPublicOffer(o: OfferWithGiver): PublicOffer {
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    category: o.category,
    diet: o.diet,
    quantityMeals: o.quantityMeals,
    mode: o.mode,
    photoUrl: o.photoUrl,
    status: o.status,
    expiresAt: effectiveExpiry(o).toISOString(),
    createdAt: o.createdAt.toISOString(),
    scheduledFor: o.scheduledFor?.toISOString() ?? null,
    area: o.giver.area,
    lat: approx(o.giver.lat),
    lng: approx(o.giver.lng),
    giverName: o.giver.name,
    giverKind: o.giver.giverKind,
    giverTrust: o.giver.trustScore,
  };
}

/** Candidate takers (with their soonest open need) as match-engine inputs. */
export async function takerCandidates(centre: { lat: number; lng: number }, radiusKm: number): Promise<Candidate[]> {
  const takers = await profileRepository.takersInBox(boundingBox(centre, radiusKm));
  const received = await profileRepository.mealsReceivedLast7Days(takers.map((t) => t.id));
  return takers
    .filter((t) => t.lat != null && t.lng != null)
    .map((t) => ({
      id: t.id,
      point: { lat: t.lat!, lng: t.lng! },
      diet: t.needs[0]?.diet ?? "BOTH",
      mode: t.needs[0]?.mode ?? "EITHER",
      wantMeals: t.needs[0]?.mealsNeeded ?? t.members ?? 10,
      trustScore: t.trustScore,
      mealsReceivedLast7Days: received.get(t.id) ?? 0,
      openToReceive: t.openToReceive,
      active: t.status === "ACTIVE",
    }));
}

export const offerService = {
  async create(giver: Profile, input: CreateOffer) {
    if (giver.role !== "GIVER") throw AppError.forbidden("Only givers can post food");
    if (giver.lat == null || giver.lng == null) throw AppError.onboardingRequired();
    const cfg = await configService.get();
    const now = new Date();
    const safe = safeUntil(input.category, input.cookedAt ?? null, input.expectedExpiryAt, cfg, now, input.safeHours);
    const eff = new Date(Math.min(safe.getTime(), input.expectedExpiryAt.getTime()));
    if (eff.getTime() <= now.getTime()) throw AppError.badRequest("This food is already past its safe time", { safeUntil: safe.toISOString() });
    const scheduled = input.scheduledFor && input.scheduledFor.getTime() > now.getTime() ? input.scheduledFor : null;
    const offer = await offerRepository.create({
      giverId: giver.id,
      title: input.title,
      description: input.description,
      category: input.category,
      diet: input.diet,
      quantityMeals: input.quantityMeals,
      cookedAt: input.cookedAt,
      expectedExpiryAt: input.expectedExpiryAt,
      safeUntil: safe,
      mode: input.mode,
      photoUrl: input.photoUrl,
      scheduledFor: scheduled,
      escalationLevel: scheduled ? -1 : 0, // -1 = scheduled, not yet announced
    });
    if (!scheduled) await offerService.announce(offer, 0);
    return toPublicOffer(offer);
  },

  /** Tell every feasible taker inside the current radius (NEAR_OFFER). Skips takers already notified. */
  async announce(offer: OfferWithGiver, alreadyRadiusKm: number) {
    if (offer.giver.lat == null || offer.giver.lng == null) return;
    const cfg = await configService.get();
    const eff = effectiveExpiry(offer);
    const start = offer.scheduledFor && offer.scheduledFor > offer.createdAt ? offer.scheduledFor : offer.createdAt;
    const radius = radiusFor(elapsedFraction(start, eff), cfg);
    const cands = await takerCandidates({ lat: offer.giver.lat, lng: offer.giver.lng }, radius);
    const ranked = rankCandidates(
      { point: { lat: offer.giver.lat, lng: offer.giver.lng }, diet: offer.diet, mode: offer.mode, meals: offer.quantityMeals, effectiveExpiry: eff },
      cands,
      radius,
      cfg,
      40,
    ).filter((r) => r.distanceKm > alreadyRadiusKm);
    await notificationService.notifyMany(
      ranked.map((r) => ({
        userId: r.candidateId,
        type: "NEAR_OFFER",
        title: `${offer.quantityMeals} meals near you`,
        body: `${offer.title} from ${offer.giver.name}, ${r.distanceKm.toFixed(1)} km away. Reachable in ${Math.ceil(r.travelMin)} min.`,
        link: `/dashboard/offers/${offer.id}`,
      })),
      { email: true },
    );
  },

  async listPublic(
    f: Omit<Parameters<typeof offerRepository.listPublic>[0], "sort"> & { sort: "soonest" | "newest" | "nearest" },
    page: number,
    limit: number,
    here?: { lat: number; lng: number },
  ) {
    await maintenanceService.sweepIfStale();
    if (!here) {
      const { items, total } = await offerRepository.listPublic({ ...f, sort: f.sort === "newest" ? "newest" : "soonest" }, page, limit);
      return { items: items.map((o) => toPublicOffer(o)), total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
    }
    // With a location: distance is computed from the giver's exact point but only rounded km are returned.
    const { items } = await offerRepository.listPublic({ ...f, sort: f.sort === "newest" ? "newest" : "soonest" }, 1, 200);
    const withDist = items.map((o) => ({
      o,
      d: o.giver.lat != null && o.giver.lng != null ? haversineKm(here, { lat: o.giver.lat, lng: o.giver.lng }) : Number.POSITIVE_INFINITY,
    }));
    if (f.sort === "nearest") withDist.sort((a, b) => a.d - b.d);
    const total = withDist.length;
    const slice = withDist.slice((page - 1) * limit, page * limit);
    return {
      items: slice.map(({ o, d }) => ({ ...toPublicOffer(o), ...(Number.isFinite(d) && { distanceKm: Math.round(d * 10) / 10 }) })),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async getPublic(id: string): Promise<PublicOffer> {
    await maintenanceService.sweepIfStale();
    const o = await offerRepository.findById(id);
    if (!o || o.giver.status !== "ACTIVE") throw AppError.notFound("Post not found");
    return toPublicOffer(o);
  },

  async listMine(giver: Profile) {
    await maintenanceService.sweepIfStale();
    const rows = await offerRepository.listByGiver(giver.id);
    return rows.map((o) => ({ ...toPublicOffer(o), claimId: o.claims[0]?.id ?? null, claimStatus: o.claims[0]?.status ?? null }));
  },

  async update(giver: Profile, id: string, patch: { title?: string; description?: string; quantityMeals?: number; mode?: "GIVER_DELIVERS" | "TAKER_PICKS_UP" | "EITHER"; photoUrl?: string | null }) {
    const o = await ownOffer(giver, id);
    if (o.status !== "OPEN") throw AppError.conflict("Only open posts can be edited");
    const updated = await offerRepository.update(id, patch);
    return toPublicOffer({ ...o, ...updated });
  },

  async cancel(giver: Profile, id: string) {
    const o = await ownOffer(giver, id);
    if (o.status !== "OPEN") throw AppError.conflict("Decline or finish the active claim before cancelling");
    await offerRepository.update(id, { status: "CANCELLED" });
    return { id, status: "CANCELLED" as const };
  },

  isExpired,
};

async function ownOffer(giver: Profile, id: string) {
  const o = await offerRepository.findById(id);
  if (!o || o.giverId !== giver.id) throw AppError.notFound("Post not found");
  return o;
}

export type { OfferWithMatch };
