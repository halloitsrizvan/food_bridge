// Tunables. Defaults here; overridable at runtime through AppConfig (gov config page).
export type Config = {
  safeHours: { COOKED: number; RAW: number };
  radiusSteps: [number, number, number]; // km: start, 50% elapsed, 75% elapsed
  escalateAt: [number, number]; // fractions of the window
  govAlertAt: number;
  speedKmh: number;
  bufferMin: number;
  holdMinutes: number;
  points: { base: number; mealCap: number; fastBonus: number; fastWithinMin: number; takerConfirm: number };
  tiers: { SILVER: number; GOLD: number; PLATINUM: number };
  suspension: { weightThreshold: number; windowDays: number };
  impact: { kgPerMeal: number; co2PerKg: number };
};

export const DEFAULT_CONFIG: Config = {
  safeHours: { COOKED: 4, RAW: 24 },
  radiusSteps: [3, 6, 10],
  escalateAt: [0.5, 0.75],
  govAlertAt: 0.8,
  speedKmh: 20,
  bufferMin: 10,
  holdMinutes: 15,
  points: { base: 10, mealCap: 50, fastBonus: 5, fastWithinMin: 30, takerConfirm: 5 },
  tiers: { SILVER: 200, GOLD: 600, PLATINUM: 1500 },
  suspension: { weightThreshold: 3, windowDays: 30 },
  impact: { kgPerMeal: 0.4, co2PerKg: 2.5 },
};

/** Shallow-per-section merge so partial overrides from the DB never drop defaults. */
export function mergeConfig(override: Partial<Record<keyof Config, unknown>> | null | undefined): Config {
  const out: Record<string, unknown> = { ...DEFAULT_CONFIG };
  if (!override) return out as Config;
  for (const k of Object.keys(DEFAULT_CONFIG) as (keyof Config)[]) {
    const v = override[k];
    if (v === undefined || v === null) continue;
    const d = DEFAULT_CONFIG[k];
    out[k] = typeof d === "object" && !Array.isArray(d) && typeof v === "object" ? { ...d, ...(v as object) } : v;
  }
  return out as Config;
}
