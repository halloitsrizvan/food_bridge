// Auth guards for route handlers and server components. Role comes from the Profile row.
import type { Profile } from "@prisma/client";
import type { Role } from "@/lib/schemas/profile";
import { profileService } from "../services/profile.service";
import { AppError } from "./errors";
import { createSupabaseServerClient } from "./supabase";

/** Verified user (getUser validates the JWT with Supabase Auth) + Profile; auto-creates on first login. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const u = data.user;
  return profileService.ensureProfile({
    id: u.id,
    email: u.email,
    name: (u.user_metadata?.name as string | undefined) ?? null,
  });
}

export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) throw AppError.unauthorized();
  return profile;
}

export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireUser();
  if (!roles.includes(profile.role)) throw AppError.forbidden();
  return profile;
}
