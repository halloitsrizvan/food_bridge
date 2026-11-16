import { z } from "zod";

export const HealthSchema = z
  .object({ status: z.literal("ok"), db: z.literal("up"), time: z.string() })
  .meta({ id: "Health" });
export type Health = z.infer<typeof HealthSchema>;
