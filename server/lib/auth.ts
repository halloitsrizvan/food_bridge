// Auth guards. The role ALWAYS comes from the Profile row, never from the client or JWT claims.
import type { Profile } from "@prisma/client";
import type { Role } from "@/lib/schemas/profile";
import { profileRepository } from "../repositories/profile.repository";
import { AppError } from "./errors";
import { createSupabaseServerClient } from "./supabase";

/** Verified Supabase user (getUser validates the JWT with the Auth server) + its Profile. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return profileRepository.findById(data.user.id);
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

/** SUSPENDED / APPEALING accounts can read but not post, claim or review. GOV is exempt. */
export function requireActiveAccount(profile: Profile): Profile {
  if (profile.role !== "GOV" && profile.status !== "ACTIVE") throw AppError.suspended();
  return profile;
}

export function requireOnboarded(profile: Profile): Profile {
  if (profile.role !== "GOV" && !profile.onboarded) throw AppError.onboardingRequired();
  return profile;
}
