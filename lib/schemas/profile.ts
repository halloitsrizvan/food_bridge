import { z } from "zod";

export const RoleSchema = z.enum(["GOV", "GIVER", "TAKER"]);
export type Role = z.infer<typeof RoleSchema>;
export const GiverKindSchema = z.enum(["RESTAURANT", "CATERER", "HOUSEHOLD", "EVENT"]);
export const TakerKindSchema = z.enum(["INSTITUTION", "CHARITY", "HOUSE"]);
export const AccountStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "APPEALING"]);
export type AccountStatus = z.infer<typeof AccountStatusSchema>;

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{7,14}$/, "Enter a valid phone number");

/** Public signup: GOV is never allowed. */
export const SignupSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72),
  phone,
  role: z.enum(["GIVER", "TAKER"]),
});
export type Signup = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export const OnboardSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  kind: z.enum(["RESTAURANT", "CATERER", "HOUSEHOLD", "EVENT", "INSTITUTION", "CHARITY", "HOUSE"]),
  mapsUrl: z.url("Enter a valid link").max(500).optional().or(z.literal("").transform(() => undefined)),
  address: z.string().trim().min(5, "Enter the address").max(240),
  area: z.string().trim().min(2, "Enter the area / locality").max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  members: z.number().int().min(1).max(5000).optional(),
});
export type Onboard = z.infer<typeof OnboardSchema>;

export const ProfileSchema = z
  .object({
    id: z.uuid(),
    role: RoleSchema,
    giverKind: GiverKindSchema.nullable(),
    takerKind: TakerKindSchema.nullable(),
    name: z.string(),
    email: z.string(),
    phone: z.string(),
    mapsUrl: z.string().nullable(),
    address: z.string(),
    area: z.string(),
    lat: z.number().nullable(),
    lng: z.number().nullable(),
    members: z.number().nullable(),
    openToReceive: z.boolean(),
    onboarded: z.boolean(),
    status: AccountStatusSchema,
    points: z.number(),
    trustScore: z.number(),
    createdAt: z.string(),
  })
  .meta({ id: "Profile" });
export type ProfileDTO = z.infer<typeof ProfileSchema>;

export const OpenToReceiveSchema = z.object({ openToReceive: z.boolean() });
export const AppealSchema = z.object({ message: z.string().trim().min(10, "Tell us a bit more").max(1000) });
