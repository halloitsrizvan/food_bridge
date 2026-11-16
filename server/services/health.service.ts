import type { Health } from "@/lib/schemas/health";
import { healthRepository } from "../repositories/health.repository";
import { AppError } from "../lib/errors";

export const healthService = {
  async check(): Promise<Health> {
    try {
      await healthRepository.pingDb();
    } catch (e) {
      console.error("[health] db check failed", e);
      throw new AppError(503, "INTERNAL", "Database unavailable");
    }
    return { status: "ok", db: "up", time: new Date().toISOString() };
  },
};
