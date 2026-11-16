import { z } from "zod";
import { DEFAULT_CONFIG, mergeConfig, type Config } from "../logic/config";
import { trustRepository } from "../repositories/trust.repository";

let cache: { at: number; value: Config } | null = null;

export const ConfigPatchSchema = z
  .object({
    safeHours: z.object({ COOKED: z.number().min(0.5).max(48), RAW: z.number().min(1).max(168) }).partial(),
    radiusSteps: z.tuple([z.number().min(0.5).max(50), z.number().min(0.5).max(50), z.number().min(0.5).max(50)]),
    escalateAt: z.tuple([z.number().min(0.1).max(0.95), z.number().min(0.1).max(0.99)]),
    govAlertAt: z.number().min(0.1).max(0.99),
    speedKmh: z.number().min(3).max(80),
    bufferMin: z.number().min(0).max(120),
    holdMinutes: z.number().min(1).max(240),
    points: z
      .object({ base: z.number().int().min(0), mealCap: z.number().int().min(0), fastBonus: z.number().int().min(0), fastWithinMin: z.number().int().min(1), takerConfirm: z.number().int().min(0) })
      .partial(),
    tiers: z.object({ SILVER: z.number().int().min(1), GOLD: z.number().int().min(1), PLATINUM: z.number().int().min(1) }).partial(),
    suspension: z.object({ weightThreshold: z.number().min(0.5).max(50), windowDays: z.number().int().min(1).max(365) }).partial(),
    impact: z.object({ kgPerMeal: z.number().min(0.05).max(5), co2PerKg: z.number().min(0.1).max(20) }).partial(),
  })
  .partial();

export const configService = {
  async get(): Promise<Config> {
    if (cache && Date.now() - cache.at < 10_000) return cache.value;
    let value = DEFAULT_CONFIG;
    try {
      const row = await trustRepository.getConfig();
      value = mergeConfig(row?.value as Record<string, unknown> | undefined);
    } catch (e) {
      console.error("[config] falling back to defaults", e);
    }
    cache = { at: Date.now(), value };
    return value;
  },

  async patch(patch: z.infer<typeof ConfigPatchSchema>): Promise<Config> {
    const current = await this.get();
    const next = mergeConfig({ ...current, ...patch } as Record<string, unknown>);
    // keep nested sections merged, not replaced
    for (const k of ["safeHours", "points", "tiers", "suspension", "impact"] as const) {
      if (patch[k]) (next as Record<string, unknown>)[k] = { ...current[k], ...patch[k] };
    }
    await trustRepository.setConfig(next as never);
    cache = { at: Date.now(), value: next };
    return next;
  },

  invalidate() {
    cache = null;
  },
};
