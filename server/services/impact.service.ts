import { impactFromMeals } from "../logic/impact";
import { claimRepository } from "../repositories/claim.repository";
import { offerRepository } from "../repositories/offer.repository";
import { profileRepository } from "../repositories/profile.repository";
import { configService } from "./config.service";
import { maintenanceService } from "./maintenance.service";

export const impactService = {
  async get() {
    await maintenanceService.sweepIfStale();
    const cfg = await configService.get();
    const now = new Date();
    const [{ meals, handovers }, active, minutes] = await Promise.all([
      claimRepository.impact(),
      offerRepository.count({ status: "OPEN", expectedExpiryAt: { gt: now }, safeUntil: { gt: now }, giver: { status: "ACTIVE" } }),
      claimRepository.avgMatchMinutes(),
    ]);
    return { ...impactFromMeals(meals, cfg), handovers, activePosts: active, avgMatchMinutes: minutes };
  },

  async leaderboard() {
    const givers = await profileRepository.topGivers(10);
    const meals = await claimRepository.mealsByGiver(givers.map((g) => g.id));
    return givers.map((g, i) => ({
      rank: i + 1,
      name: g.name,
      kind: g.giverKind,
      area: g.area,
      points: g.points,
      meals: meals.get(g.id) ?? 0,
    }));
  },
};
