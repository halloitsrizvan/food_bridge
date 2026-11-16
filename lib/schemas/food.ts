import { z } from "zod";
import { TierSchema } from "./profile";

export const CategorySchema = z.enum(["COOKED", "PACKAGED", "RAW"]);
export const DietSchema = z.enum(["VEG", "NON_VEG", "BOTH"]);
export const ModeSchema = z.enum(["GIVER_DELIVERS", "TAKER_PICKS_UP", "EITHER"]);
export const OfferStatusSchema = z.enum(["OPEN", "CONTACTED", "SETTLED", "DELIVERED", "EXPIRED", "CANCELLED"]);
export const NeedStatusSchema = z.enum(["OPEN", "CONTACTED", "SETTLED", "FULFILLED", "EXPIRED", "CANCELLED"]);
export const ClaimStatusSchema = z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "COMPLETED"]);
export type Category = z.infer<typeof CategorySchema>;
export type Diet = z.infer<typeof DietSchema>;
export type Mode = z.infer<typeof ModeSchema>;
export type OfferStatus = z.infer<typeof OfferStatusSchema>;
export type NeedStatus = z.infer<typeof NeedStatusSchema>;
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>;

const future = (d: Date) => d.getTime() > Date.now();

export const CreateOfferSchema = z
  .object({
    title: z.string().trim().min(3, "Give it a short title").max(80),
    description: z.string().trim().max(500).default(""),
    category: CategorySchema,
    diet: DietSchema,
    quantityMeals: z.number().int().min(1, "At least 1 meal").max(5000),
    cookedAt: z.coerce.date().optional(),
    expectedExpiryAt: z.coerce.date(),
    mode: ModeSchema,
    photoUrl: z.url().max(500).optional(),
    scheduledFor: z.coerce.date().optional(),
  })
  .refine((v) => v.category === "PACKAGED" || v.cookedAt, { path: ["cookedAt"], message: "When was it cooked / prepared?" })
  .refine((v) => !v.cookedAt || v.cookedAt.getTime() <= Date.now() + 5 * 60_000 || !!v.scheduledFor, {
    path: ["cookedAt"],
    message: "Cooked time cannot be in the future",
  })
  .refine((v) => !v.scheduledFor || future(v.scheduledFor), { path: ["scheduledFor"], message: "Pick a future time" })
  .meta({ id: "CreateOffer" });
export type CreateOffer = z.infer<typeof CreateOfferSchema>;

export const UpdateOfferSchema = z
  .object({
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().max(500),
    quantityMeals: z.number().int().min(1).max(5000),
    mode: ModeSchema,
    photoUrl: z.url().max(500).nullable(),
  })
  .partial();

export const CreateNeedSchema = z
  .object({
    title: z.string().trim().min(3, "Give it a short title").max(80),
    notes: z.string().trim().max(500).default(""),
    diet: DietSchema,
    mealsNeeded: z.number().int().min(1).max(5000),
    neededFrom: z.coerce.date(),
    neededBy: z.coerce.date(),
    mode: ModeSchema,
  })
  .refine((v) => v.neededBy.getTime() > Date.now(), { path: ["neededBy"], message: "Needed-by must be in the future" })
  .refine((v) => v.neededBy > v.neededFrom, { path: ["neededBy"], message: "Must be after the start time" })
  .meta({ id: "CreateNeed" });
export type CreateNeed = z.infer<typeof CreateNeedSchema>;

export const UpdateNeedSchema = z
  .object({ title: z.string().trim().min(3).max(80), notes: z.string().trim().max(500), mealsNeeded: z.number().int().min(1).max(5000), mode: ModeSchema })
  .partial();

export const OfferQuerySchema = z.object({
  area: z.string().trim().max(80).optional(),
  q: z.string().trim().max(80).optional(),
  diet: z.enum(["VEG", "NON_VEG"]).optional(),
  category: CategorySchema.optional(),
  maxMinutesLeft: z.coerce.number().int().min(1).max(10080).optional(),
  sort: z.enum(["soonest", "newest", "nearest"]).default("soonest"),
  /** Visitor location (optional): enables distance and the "nearest" sort. */
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const MatchFactorsSchema = z.object({
  proximity: z.number(),
  timeSlack: z.number(),
  quantityFit: z.number(),
  dietMatch: z.number(),
  trust: z.number(),
  fairness: z.number(),
});
export type MatchFactors = z.infer<typeof MatchFactorsSchema>;

export const MatchInfoSchema = z.object({
  score: z.number(),
  factors: MatchFactorsSchema,
  distanceKm: z.number(),
  travelMin: z.number(),
  slackMin: z.number(),
});
export type MatchInfo = z.infer<typeof MatchInfoSchema>;

/** Public view: area + approximate coordinates only. */
export const PublicOfferSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    description: z.string(),
    category: CategorySchema,
    diet: DietSchema,
    quantityMeals: z.number(),
    mode: ModeSchema,
    photoUrl: z.string().nullable(),
    status: OfferStatusSchema,
    expiresAt: z.string(),
    createdAt: z.string(),
    scheduledFor: z.string().nullable(),
    area: z.string(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    giverName: z.string(),
    giverKind: z.string().nullable(),
    giverTier: TierSchema,
    giverTrust: z.number(),
    /** km from the visitor, only when lat/lng were sent */
    distanceKm: z.number().optional(),
  })
  .meta({ id: "PublicOffer" });
export type PublicOffer = z.infer<typeof PublicOfferSchema>;

export type OfferWithMatch = PublicOffer & { match?: MatchInfo };

export type NeedDTO = {
  id: string;
  title: string;
  notes: string;
  diet: Diet;
  mealsNeeded: number;
  neededFrom: string;
  neededBy: string;
  mode: Mode;
  status: NeedStatus;
  createdAt: string;
  takerName: string;
  takerKind: string | null;
  area: string;
  lat: number | null;
  lng: number | null;
  members: number | null;
  match?: MatchInfo;
  /** giver view: the own offer this need was scored against */
  forOfferId?: string;
};

export const ContactNeedSchema = z.object({ offerId: z.uuid() });
export const ClaimOfferSchema = z.object({ needId: z.uuid().optional() });
export const HandoverSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
  photoUrl: z.url().max(500).optional(),
});
export const ReviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(500).default("") });
export const ComplaintSchema = z.object({ reason: z.string().trim().min(10, "Describe what went wrong").max(1000) });
export const PageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
