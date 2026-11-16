import type { Config } from "./config";
import { haversineKm, travelMinutes, type LatLng } from "./geo";

export type Diet = "VEG" | "NON_VEG" | "BOTH";
export type Mode = "GIVER_DELIVERS" | "TAKER_PICKS_UP" | "EITHER";

export const dietCompatible = (offer: Diet, want: Diet): boolean =>
  offer === "BOTH" || want === "BOTH" || offer === want;

/** Both parties must be able to agree on who moves the food. */
export const modeCompatible = (a: Mode, b: Mode): boolean =>
  a === "EITHER" || b === "EITHER" || a === b;

export function feasibility(
  from: LatLng,
  to: LatLng,
  effectiveExpiry: Date,
  cfg: Pick<Config, "speedKmh" | "bufferMin">,
  now = new Date(),
) {
  const distanceKm = haversineKm(from, to);
  const travelMin = travelMinutes(distanceKm, cfg.speedKmh);
  const slackMin = (effectiveExpiry.getTime() - now.getTime()) / 60_000 - travelMin - cfg.bufferMin;
  return { distanceKm, travelMin, slackMin, feasible: slackMin >= 0 };
}

export type Factors = {
  proximity: number;
  timeSlack: number;
  quantityFit: number;
  dietMatch: number;
  trust: number;
  fairness: number;
};

export const WEIGHTS: Factors = {
  proximity: 0.35,
  timeSlack: 0.25,
  quantityFit: 0.15,
  dietMatch: 0.1,
  trust: 0.1,
  fairness: 0.05,
};

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

export type ScoreInput = {
  distanceKm: number;
  radiusKm: number;
  slackMin: number;
  offerMeals: number;
  wantMeals: number;
  dietOk: boolean;
  trustScore: number;
  mealsReceivedLast7Days: number;
};

export function matchScore(i: ScoreInput): { score: number; factors: Factors } {
  const factors: Factors = {
    proximity: 1 - Math.min(i.distanceKm / i.radiusKm, 1),
    timeSlack: clamp(i.slackMin / 120),
    quantityFit: 1 - Math.min(Math.abs(i.offerMeals - i.wantMeals) / Math.max(i.offerMeals, i.wantMeals, 1), 1),
    dietMatch: i.dietOk ? 1 : 0,
    trust: clamp(i.trustScore / 100),
    fairness: 1 - Math.min(i.mealsReceivedLast7Days / 200, 1),
  };
  const score = (Object.keys(WEIGHTS) as (keyof Factors)[]).reduce((s, k) => s + WEIGHTS[k] * factors[k], 0);
  return { score, factors };
}

export type Candidate = {
  id: string;
  point: LatLng;
  diet: Diet;
  mode: Mode;
  wantMeals: number;
  trustScore: number;
  mealsReceivedLast7Days: number;
  openToReceive: boolean;
  active: boolean;
};

export type Ranked = {
  candidateId: string;
  score: number;
  factors: Factors;
  distanceKm: number;
  travelMin: number;
  slackMin: number;
};

/** Rank takers for one offer: only feasible, diet+mode compatible, open and active ones, inside the radius. */
export function rankCandidates(
  offer: { point: LatLng; diet: Diet; mode: Mode; meals: number; effectiveExpiry: Date },
  candidates: Candidate[],
  radiusKm: number,
  cfg: Pick<Config, "speedKmh" | "bufferMin">,
  limit = 10,
  now = new Date(),
): Ranked[] {
  const out: Ranked[] = [];
  for (const c of candidates) {
    if (!c.openToReceive || !c.active) continue;
    if (!dietCompatible(offer.diet, c.diet) || !modeCompatible(offer.mode, c.mode)) continue;
    const f = feasibility(offer.point, c.point, offer.effectiveExpiry, cfg, now);
    if (!f.feasible || f.distanceKm > radiusKm) continue;
    const { score, factors } = matchScore({
      distanceKm: f.distanceKm,
      radiusKm,
      slackMin: f.slackMin,
      offerMeals: offer.meals,
      wantMeals: c.wantMeals,
      dietOk: true,
      trustScore: c.trustScore,
      mealsReceivedLast7Days: c.mealsReceivedLast7Days,
    });
    out.push({ candidateId: c.id, score, factors, distanceKm: f.distanceKm, travelMin: f.travelMin, slackMin: f.slackMin });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
