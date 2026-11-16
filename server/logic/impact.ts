import type { Config } from "./config";

export function impactFromMeals(meals: number, cfg: Pick<Config, "impact">) {
  const kg = meals * cfg.impact.kgPerMeal;
  return { meals, kg: Math.round(kg * 10) / 10, co2Kg: Math.round(kg * cfg.impact.co2PerKg * 10) / 10 };
}
