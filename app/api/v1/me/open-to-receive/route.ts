import { OpenToReceiveSchema } from "@/lib/schemas/profile";
import { ok, route } from "@/server/lib/route";
import { profileService } from "@/server/services/profile.service";

export const PATCH = route({ auth: ["TAKER"], active: true, body: OpenToReceiveSchema }, async ({ user, body }) =>
  ok(await profileService.toDTO(await profileService.setOpenToReceive(user!, body.openToReceive))),
);
