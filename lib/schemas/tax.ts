import { z } from "zod";

export const TAX_TYPES = ["Income tax", "GST", "Property tax", "Other"] as const;

/** Date input value (YYYY-MM-DD) that is strictly in the future. */
const futureDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
  .refine((v) => new Date(`${v}T23:59:59+05:30`).getTime() > Date.now(), "Pick a date in the future");

export const GrantTaxReductionSchema = z.object({
  giverId: z.uuid("Select a giver"),
  taxType: z.enum(TAX_TYPES),
  percent: z.number().int("Whole numbers only").min(1, "At least 1%").max(100, "At most 100%"),
  validUntil: futureDate,
  reason: z.string().trim().min(10, "Give a reason (at least 10 characters)").max(500),
});
export type GrantTaxReduction = z.infer<typeof GrantTaxReductionSchema>;

export type TaxReductionRow = {
  id: string;
  giverId: string;
  giverName: string;
  giverEmail: string;
  taxType: string;
  percent: number;
  validUntil: string;
  reason: string;
  grantedBy: string;
  createdAt: string;
};
