import { z } from "zod";

export const RoleSchema = z.enum(["USER", "ADMIN"]);
export type Role = z.infer<typeof RoleSchema>;

export const ProfileSchema = z
  .object({
    id: z.uuid(),
    email: z.string(),
    name: z.string().nullable(),
    role: RoleSchema,
    createdAt: z.string(),
  })
  .meta({ id: "Profile" });
export type ProfileDTO = z.infer<typeof ProfileSchema>;
