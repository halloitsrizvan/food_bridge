import { ok, route } from "@/server/lib/route";
import { configService } from "@/server/services/config.service";

// Public, non-sensitive limits the post form needs (the safe-window ceilings set by the government).
export const GET = route({ rateLimit: { name: "public-config", limit: 120, windowMs: 60_000 } }, async () => {
  const c = await configService.get();
  // photos: whether Cloudinary is configured (the photo field is hidden otherwise)
  const photos = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  return ok({ safeHours: c.safeHours, safeHoursMax: c.safeHoursMax, photos });
});
