// Match engine glue: loads data, runs pure ranking, shapes results. No rules live here.
import type { Profile } from "@prisma/client";
import type { MatchInfo, NeedDTO, OfferWithMatch } from "@/lib/schemas/food";
import { AppError } from "../lib/errors";
import { radiusFor } from "../logic/escalation";
import { approx, boundingBox } from "../logic/geo";
import { dietCompatible, feasibility, matchScore, modeCompatible, rankCandidates } from "../logic/match";
import { effectiveExpiry, elapsedFraction } from "../logic/time";
import { needRepository } from "../repositories/need.repository";
import { offerRepository, type OfferWithGiver } from "../repositories/offer.repository";
import { profileRepository } from "../repositories/profile.repository";
import { configService } from "./config.service";
import { maintenanceService } from "./maintenance.service";
import { toNeedDTO } from "./need.service";
import { takerCandidates, toPublicOffer } from "./offer.service";

const toInfo = (m: { score: number; factors: MatchInfo["factors"]; distanceKm: number; travelMin: number; slackMin: number }): MatchInfo => ({
  score: Math.round(m.score * 1000) / 1000,
  factors: m.factors,
  distanceKm: Math.round(m.distanceKm * 10) / 10,
  travelMin: Math.round(m.travelMin),
  slackMin: Math.round(m.slackMin),
});

function offerRadius(o: OfferWithGiver, cfg: Awaited<ReturnType<typeof configService.get>>) {
  const start = o.scheduledFor && o.scheduledFor > o.createdAt ? o.scheduledFor : o.createdAt;
  return radiusFor(elapsedFraction(start, effectiveExpiry(o)), cfg);
}

export const matchService = {
  /** Score ONE offer for ONE taker (used by claim snapshots and the claim screen). */
  async scoreFor(offer: OfferWithGiver, taker: Profile, wantMeals?: number, needDiet?: "VEG" | "NON_VEG" | "BOTH", needMode?: "GIVER_DELIVERS" | "TAKER_PICKS_UP" | "EITHER") {
    if (offer.giver.lat == null || offer.giver.lng == null || taker.lat == null || taker.lng == null) return null;
    const cfg = await configService.get();
    const f = feasibility({ lat: offer.giver.lat, lng: offer.giver.lng }, { lat: taker.lat, lng: taker.lng }, effectiveExpiry(offer), cfg);
    const recv = await profileRepository.mealsReceivedLast7Days([taker.id]);
    const { score, factors } = matchScore({
      distanceKm: f.distanceKm,
      radiusKm: Math.max(offerRadius(offer, cfg), f.distanceKm, 0.1),
      slackMin: f.slackMin,
      offerMeals: offer.quantityMeals,
      wantMeals: wantMeals ?? taker.members ?? 10,
      dietOk: dietCompatible(offer.diet, needDiet ?? "BOTH"),
      trustScore: taker.trustScore,
      mealsReceivedLast7Days: recv.get(taker.id) ?? 0,
    });
    return { ...toInfo({ score, factors, ...f }), feasible: f.feasible };
  },

  /** Giver view: ranked takers for one of their offers. */
  async takersForOffer(user: Profile, offerId: string) {
    const o = await offerRepository.findById(offerId);
    if (!o || (o.giverId !== user.id && user.role !== "GOV")) throw AppError.notFound("Post not found");
    if (o.giver.lat == null || o.giver.lng == null) return [];
    const cfg = await configService.get();
    const radius = offerRadius(o, cfg);
    const cands = await takerCandidates({ lat: o.giver.lat, lng: o.giver.lng }, radius);
    const ranked = rankCandidates(
      { point: { lat: o.giver.lat, lng: o.giver.lng }, diet: o.diet, mode: o.mode, meals: o.quantityMeals, effectiveExpiry: effectiveExpiry(o) },
      cands,
      radius,
      cfg,
      10,
    );
    const takers = new Map((await profileRepository.findManyByIds(ranked.map((r) => r.candidateId))).map((t) => [t.id, t]));
    return ranked.map((r) => {
      const t = takers.get(r.candidateId)!;
      return { takerId: t.id, name: t.name, kind: t.takerKind, members: t.members, area: t.area, lat: approx(t.lat), lng: approx(t.lng), match: toInfo(r), radiusKm: radius };
    });
  },

  /** Taker view: open offers that can still reach this taker in time, best match first. */
  async feedForTaker(taker: Profile, limit = 20): Promise<OfferWithMatch[]> {
    await maintenanceService.sweepIfStale();
    if (taker.lat == null || taker.lng == null) return [];
    const cfg = await configService.get();
    const here = { lat: taker.lat, lng: taker.lng };
    const offers = await offerRepository.openInBox(boundingBox(here, cfg.radiusSteps[2]));
    const recv = (await profileRepository.mealsReceivedLast7Days([taker.id])).get(taker.id) ?? 0;
    const need = (await needRepository.listByTaker(taker.id, 10)).find((n) => n.status === "OPEN" && n.neededBy > new Date());
    const out: OfferWithMatch[] = [];
    for (const o of offers) {
      if (o.giver.lat == null || o.giver.lng == null) continue;
      const diet = need?.diet ?? "BOTH";
      const mode = need?.mode ?? "EITHER";
      if (!dietCompatible(o.diet, diet) || !modeCompatible(o.mode, mode)) continue;
      const f = feasibility({ lat: o.giver.lat, lng: o.giver.lng }, here, effectiveExpiry(o), cfg);
      if (!f.feasible || f.distanceKm > cfg.radiusSteps[2]) continue;
      const { score, factors } = matchScore({
        distanceKm: f.distanceKm,
        radiusKm: cfg.radiusSteps[2],
        slackMin: f.slackMin,
        offerMeals: o.quantityMeals,
        wantMeals: need?.mealsNeeded ?? taker.members ?? 10,
        dietOk: true,
        trustScore: o.giver.trustScore,
        mealsReceivedLast7Days: recv,
      });
      out.push({ ...toPublicOffer(o), match: toInfo({ score, factors, ...f }) });
    }
    return out.sort((a, b) => b.match!.score - a.match!.score).slice(0, limit);
  },

  /** Taker view: offers ranked for one specific need. */
  async offersForNeed(taker: Profile, needId: string) {
    const n = await needRepository.findById(needId);
    if (!n || n.takerId !== taker.id) throw AppError.notFound("Need not found");
    return (await matchService.feedForTaker(taker, 50)).filter((o) => dietCompatible(o.diet, n.diet));
  },

  /** Giver view: open needs, nearest first, scored against the giver's soonest-expiring open offer. */
  async needsForGiver(giver: Profile, limit = 30): Promise<(NeedDTO & { forOfferId?: string })[]> {
    await maintenanceService.sweepIfStale();
    if (giver.lat == null || giver.lng == null) return [];
    const cfg = await configService.get();
    const here = { lat: giver.lat, lng: giver.lng };
    const mine = (await offerRepository.listByGiver(giver.id, 50)).filter((o) => o.status === "OPEN" && effectiveExpiry(o) > new Date());
    const best = mine.sort((a, b) => effectiveExpiry(a).getTime() - effectiveExpiry(b).getTime())[0];
    const needs = await needRepository.openInBox(boundingBox(here, cfg.radiusSteps[2]));
    const recv = await profileRepository.mealsReceivedLast7Days(needs.map((n) => n.takerId));
    const rows = needs
      .filter((n) => n.taker.lat != null && n.taker.lng != null)
      .map((n) => {
        const dto: NeedDTO & { forOfferId?: string } = toNeedDTO(n);
        const d = feasibility(here, { lat: n.taker.lat!, lng: n.taker.lng! }, best ? effectiveExpiry(best) : new Date(Date.now() + 3_600_000), cfg);
        if (best) {
          const ok = dietCompatible(best.diet, n.diet) && modeCompatible(best.mode, n.mode);
          const { score, factors } = matchScore({
            distanceKm: d.distanceKm,
            radiusKm: cfg.radiusSteps[2],
            slackMin: d.slackMin,
            offerMeals: best.quantityMeals,
            wantMeals: n.mealsNeeded,
            dietOk: ok,
            trustScore: n.taker.trustScore,
            mealsReceivedLast7Days: recv.get(n.takerId) ?? 0,
          });
          dto.match = toInfo({ score: ok && d.feasible ? score : 0, factors, ...d });
          dto.forOfferId = best.id;
        } else dto.match = undefined;
        return { dto, dist: d.distanceKm };
      });
    return rows
      .sort((a, b) => (b.dto.match?.score ?? -1) - (a.dto.match?.score ?? -1) || a.dist - b.dist)
      .slice(0, limit)
      .map((r) => r.dto);
  },
};
