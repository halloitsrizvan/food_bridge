// Services hold business rules; they only talk to repositories and pure logic.
import type { Profile } from "@prisma/client";
import { parseLatLng } from "../logic/geo";
import type { Onboard, ProfileDTO, Signup } from "@/lib/schemas/profile";
import { AppError } from "../lib/errors";
import { createSupabaseAdminClient } from "../lib/supabase-admin";
import { profileRepository } from "../repositories/profile.repository";

const GIVER_KINDS = ["RESTAURANT", "CATERER", "HOUSEHOLD", "EVENT"] as const;
const TAKER_KINDS = ["INSTITUTION", "CHARITY", "HOUSE"] as const;

export const profileService = {
  async toDTO(p: Profile): Promise<ProfileDTO> {
    return {
      id: p.id,
      role: p.role,
      giverKind: p.giverKind,
      takerKind: p.takerKind,
      name: p.name,
      email: p.email,
      phone: p.phone,
      mapsUrl: p.mapsUrl,
      address: p.address,
      area: p.area,
      lat: p.lat,
      lng: p.lng,
      members: p.members,
      openToReceive: p.openToReceive,
      onboarded: p.onboarded,
      status: p.status,
      points: p.points,
      trustScore: p.trustScore,
      createdAt: p.createdAt.toISOString(),
    };
  },

  /** Public signup. Role is chosen here and stored server-side; GOV is impossible by schema. */
  async signup(input: Signup) {
    const existing = await profileRepository.findByEmail(input.email.toLowerCase());
    if (existing) throw AppError.conflict("An account with this email already exists");
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email.toLowerCase(),
      password: input.password,
      email_confirm: true,
      app_metadata: { role: input.role },
    });
    if (error || !data.user) {
      if (error && /already|registered|exists/i.test(error.message)) throw AppError.conflict("An account with this email already exists");
      console.error("[signup] supabase admin createUser failed", error?.message);
      throw new AppError(500, "INTERNAL", "Could not create the account");
    }
    try {
      await profileRepository.create({
        id: data.user.id,
        role: input.role,
        email: input.email.toLowerCase(),
        phone: input.phone,
        name: input.email.split("@")[0],
      });
    } catch (e) {
      await admin.auth.admin.deleteUser(data.user.id); // roll back the auth user
      throw e;
    }
    return { id: data.user.id };
  },

  async onboard(user: Profile, input: Onboard): Promise<Profile> {
    if (user.role === "GOV") throw AppError.forbidden();
    if (user.onboarded) throw AppError.conflict("Onboarding already completed");
    const kinds: readonly string[] = user.role === "GIVER" ? GIVER_KINDS : TAKER_KINDS;
    if (!kinds.includes(input.kind)) throw AppError.badRequest("Invalid type for this account");
    if (user.role === "TAKER" && !input.members) throw AppError.badRequest("Number of members is required");
    // a pasted maps link can refine the location; explicit coords win otherwise
    const fromLink = input.mapsUrl ? parseLatLng(input.mapsUrl) : null;
    return profileRepository.update(user.id, {
      name: input.name,
      mapsUrl: input.mapsUrl ?? null,
      address: input.address,
      area: input.area,
      lat: input.lat ?? fromLink?.lat,
      lng: input.lng ?? fromLink?.lng,
      ...(user.role === "GIVER" ? { giverKind: input.kind as (typeof GIVER_KINDS)[number] } : { takerKind: input.kind as (typeof TAKER_KINDS)[number], members: input.members }),
      onboarded: true,
    });
  },

  setOpenToReceive(user: Profile, value: boolean) {
    if (user.role !== "TAKER") throw AppError.forbidden();
    return profileRepository.update(user.id, { openToReceive: value });
  },
};
