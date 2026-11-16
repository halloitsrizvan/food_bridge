import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG as cfg, mergeConfig } from "@/server/logic/config";
import { levelFor, needsGovAlert, radiusFor, urgency } from "@/server/logic/escalation";
import { approx, boundingBox, haversineKm, parseLatLng, travelMinutes } from "@/server/logic/geo";
import { feasibility, matchScore, rankCandidates, dietCompatible, modeCompatible } from "@/server/logic/match";
import { deriveOtp, hashOtp, verifyOtp } from "@/server/logic/otp";
import { giverPoints, reviewBonus } from "@/server/logic/points";
import { effectiveExpiry, elapsedFraction, isExpired, safeUntil } from "@/server/logic/time";
import { complaintWeight, shouldSuspend, trustScore } from "@/server/logic/trust";

const H = 3_600_000;
const now = new Date("2026-01-01T12:00:00Z");
const at = (h: number) => new Date(now.getTime() + h * H);

describe("safeUntil / expiry", () => {
  it("COOKED = cookedAt + 4h, RAW = +24h, PACKAGED = printed expiry", () => {
    expect(safeUntil("COOKED", at(-1), at(10), cfg, now)).toEqual(at(3));
    expect(safeUntil("RAW", at(-1), at(100), cfg, now)).toEqual(at(23));
    expect(safeUntil("PACKAGED", null, at(48), cfg, now)).toEqual(at(48));
  });
  it("effective expiry is the earlier of the two", () => {
    expect(effectiveExpiry({ expectedExpiryAt: at(10), safeUntil: at(3) })).toEqual(at(3));
    expect(effectiveExpiry({ expectedExpiryAt: at(2), safeUntil: at(3) })).toEqual(at(2));
  });
  it("detects expiry", () => {
    expect(isExpired({ expectedExpiryAt: at(-1), safeUntil: at(5) }, now)).toBe(true);
    expect(isExpired({ expectedExpiryAt: at(1), safeUntil: at(5) }, now)).toBe(false);
  });
  it("elapsedFraction clamps", () => {
    expect(elapsedFraction(at(0), at(4), at(2))).toBe(0.5);
    expect(elapsedFraction(at(0), at(4), at(9))).toBe(1);
    expect(elapsedFraction(at(0), at(4), at(-1))).toBe(0);
  });
});

describe("geo", () => {
  const a = { lat: 11.2588, lng: 75.7804 };
  const b = { lat: 11.3, lng: 75.8 };
  it("haversine is symmetric and ~5.4km here", () => {
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6);
    expect(haversineKm(a, b)).toBeGreaterThan(4.5);
    expect(haversineKm(a, b)).toBeLessThan(6);
    expect(haversineKm(a, a)).toBe(0);
  });
  it("20 km/h means 3 min per km", () => expect(travelMinutes(10)).toBe(30));
  it("bounding box contains points within radius", () => {
    const box = boundingBox(a, 6);
    expect(b.lat).toBeGreaterThan(box.minLat);
    expect(b.lat).toBeLessThan(box.maxLat);
    expect(b.lng).toBeLessThan(box.maxLng);
  });
  it("rounds to 2 decimals for privacy", () => expect(approx(11.258812)).toBe(11.26));
  it("parses Google Maps URLs", () => {
    expect(parseLatLng("https://www.google.com/maps/@11.2588,75.7804,15z")).toEqual({ lat: 11.2588, lng: 75.7804 });
    expect(parseLatLng("https://maps.google.com/?q=11.25,75.78")).toEqual({ lat: 11.25, lng: 75.78 });
    expect(parseLatLng("11.25, 75.78")).toEqual({ lat: 11.25, lng: 75.78 });
    // short link target (/dir/ URL): the place is !1d<lng>!2d<lat>, not the viewport or the origin
    expect(parseLatLng("https://www.google.com/maps/dir/11.1006806,76.1899656/KAUSAR+RESTAURANT,+Manjeri/@11.1125244,76.1528347,14160m/data=!3m2!1e3!4b1!4m10!4m9!1m1!4e1!1m5!1m1!1s0x3ba637a6548d7b89:0x54cb19b80f54a4cc!2m2!1d76.1156181!2d11.1126735!3e9")).toEqual({ lat: 11.1126735, lng: 76.1156181 });
    expect(parseLatLng("https://www.google.com/maps/place/X/@11.1,76.1,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d11.2588!4d75.7804")).toEqual({ lat: 11.2588, lng: 75.7804 });
    expect(parseLatLng("https://example.com")).toBeNull();
    expect(parseLatLng("95.0,10.0")).toBeNull();
  });
});

describe("feasibility", () => {
  it("feasible when now + travel + 10min buffer <= expiry", () => {
    const f = feasibility({ lat: 0, lng: 0 }, { lat: 0, lng: 0.09 }, at(1), cfg, now); // ~10km => 30min
    expect(f.travelMin).toBeCloseTo(30, 0);
    expect(f.feasible).toBe(true);
    expect(f.slackMin).toBeCloseTo(20, 0);
  });
  it("infeasible when the food spoils first", () => {
    const f = feasibility({ lat: 0, lng: 0 }, { lat: 0, lng: 0.09 }, new Date(now.getTime() + 35 * 60_000), cfg, now);
    expect(f.feasible).toBe(false);
  });
});

describe("matchScore", () => {
  const base = { distanceKm: 0, radiusKm: 3, slackMin: 120, offerMeals: 10, wantMeals: 10, dietOk: true, trustScore: 100, mealsReceivedLast7Days: 0 };
  it("perfect candidate scores 1", () => expect(matchScore(base).score).toBeCloseTo(1, 6));
  it("weights sum to 1 and breakdown is exposed", () => {
    const { factors } = matchScore(base);
    expect(Object.keys(factors)).toHaveLength(6);
  });
  it("closer is better", () => {
    expect(matchScore({ ...base, distanceKm: 1 }).score).toBeGreaterThan(matchScore({ ...base, distanceKm: 2.5 }).score);
  });
  it("fairness penalises recent recipients", () => {
    expect(matchScore({ ...base, mealsReceivedLast7Days: 200 }).factors.fairness).toBe(0);
  });
  it("quantity fit uses relative gap", () => {
    expect(matchScore({ ...base, offerMeals: 10, wantMeals: 5 }).factors.quantityFit).toBeCloseTo(0.5, 6);
  });
  it("diet and mode compatibility", () => {
    expect(dietCompatible("VEG", "BOTH")).toBe(true);
    expect(dietCompatible("VEG", "NON_VEG")).toBe(false);
    expect(modeCompatible("GIVER_DELIVERS", "TAKER_PICKS_UP")).toBe(false);
    expect(modeCompatible("EITHER", "TAKER_PICKS_UP")).toBe(true);
  });
});

describe("rankCandidates", () => {
  const offer = { point: { lat: 11.25, lng: 75.78 }, diet: "VEG" as const, mode: "EITHER" as const, meals: 20, effectiveExpiry: at(3) };
  const cand = (id: string, dLng: number, extra = {}) => ({
    id, point: { lat: 11.25, lng: 75.78 + dLng }, diet: "BOTH" as const, mode: "EITHER" as const,
    wantMeals: 20, trustScore: 80, mealsReceivedLast7Days: 0, openToReceive: true, active: true, ...extra,
  });
  it("orders by score, filters closed / suspended / out of radius / wrong diet", () => {
    const r = rankCandidates(offer, [
      cand("far", 0.02), cand("near", 0.005), cand("closed", 0.001, { openToReceive: false }),
      cand("susp", 0.001, { active: false }), cand("nonveg", 0.001, { diet: "NON_VEG" }), cand("outside", 0.2),
    ], 3, cfg, 10, now);
    expect(r.map((x) => x.candidateId)).toEqual(["near", "far"]);
  });
  it("drops candidates that cannot arrive before spoilage", () => {
    const tight = { ...offer, effectiveExpiry: new Date(now.getTime() + 12 * 60_000) };
    expect(rankCandidates(tight, [cand("a", 0.02)], 10, cfg, 10, now)).toEqual([]);
  });
});

describe("points", () => {
  it("giver points: 10 + min(meals,50) + fast bonus", () => {
    expect(giverPoints(20, 10, cfg)).toBe(35);
    expect(giverPoints(200, 45, cfg)).toBe(60);
  });
  it("review bonus applies (0.8 + 0.1*rating)", () => {
    expect(reviewBonus(100, 5)).toBe(30);
    expect(reviewBonus(100, 3)).toBe(10);
    expect(reviewBonus(100, 1)).toBe(-10);
  });
});

describe("trust / complaints", () => {
  it("new account is neutral 70", () =>
    expect(trustScore({ completed: 0, failed: 0, avgRating: null, reviewCount: 0, recentWeightedComplaints: 0 })).toBe(70));
  it("perfect history approaches 100", () =>
    expect(trustScore({ completed: 10, failed: 0, avgRating: 5, reviewCount: 10, recentWeightedComplaints: 0 })).toBe(100));
  it("complaints reduce trust and clamp at 0", () => {
    expect(trustScore({ completed: 1, failed: 1, avgRating: 3, reviewCount: 1, recentWeightedComplaints: 2 })).toBe(55);
    expect(trustScore({ completed: 0, failed: 5, avgRating: 1, reviewCount: 1, recentWeightedComplaints: 9 })).toBe(0);
  });
  it("complaint weight follows complainant trust", () => {
    expect(complaintWeight(80)).toBe(0.8);
    expect(complaintWeight(150)).toBe(1);
  });
  it("suspends at weighted sum >= 3 within 30 days only", () => {
    const d = (days: number) => new Date(now.getTime() - days * 86_400_000);
    expect(shouldSuspend([{ weight: 1, createdAt: d(1) }, { weight: 1, createdAt: d(2) }], cfg, now)).toBe(false);
    expect(shouldSuspend([{ weight: 1, createdAt: d(1) }, { weight: 1, createdAt: d(2) }, { weight: 1, createdAt: d(3) }], cfg, now)).toBe(true);
    expect(shouldSuspend([{ weight: 1, createdAt: d(1) }, { weight: 1, createdAt: d(2) }, { weight: 1, createdAt: d(40) }], cfg, now)).toBe(false);
  });
});

describe("escalation", () => {
  it("radius 3 -> 6 -> 10km", () => {
    expect(radiusFor(0.1, cfg)).toBe(3);
    expect(radiusFor(0.5, cfg)).toBe(6);
    expect(radiusFor(0.75, cfg)).toBe(10);
  });
  it("levels and gov alert at 80%", () => {
    expect(levelFor(0.6, cfg)).toBe(1);
    expect(needsGovAlert(0.79, false, cfg)).toBe(false);
    expect(needsGovAlert(0.8, false, cfg)).toBe(true);
    expect(needsGovAlert(0.9, true, cfg)).toBe(false);
  });
  it("urgency ramp", () => {
    expect([180, 90, 45, 10].map(urgency)).toEqual(["safe", "amber", "orange", "red"]);
  });
});

describe("otp", () => {
  it("is stable per salt, 6 digits, verifies by hash only", () => {
    const otp = deriveOtp("secret", "claim-1", "salt");
    expect(otp).toMatch(/^\d{6}$/);
    expect(deriveOtp("secret", "claim-1", "salt")).toBe(otp);
    expect(verifyOtp(otp, hashOtp(otp))).toBe(true);
    expect(verifyOtp("000000" === otp ? "111111" : "000000", hashOtp(otp))).toBe(false);
  });
});

describe("config merge", () => {
  it("keeps defaults for missing keys", () => {
    const c = mergeConfig({ points: { base: 99 } });
    expect(c.points.base).toBe(99);
    expect(c.points.mealCap).toBe(50);
    expect(c.radiusSteps).toEqual([3, 6, 10]);
  });
});
