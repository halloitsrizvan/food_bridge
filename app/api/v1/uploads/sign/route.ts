import { SignUploadBodySchema } from "@/lib/schemas/upload";
import { ok, route } from "@/server/lib/route";
import { uploadService } from "@/server/services/upload.service";

export const POST = route(
  { auth: true, body: SignUploadBodySchema, rateLimit: { name: "upload-sign", limit: 20, windowMs: 60_000 } },
  async ({ user, body }) => ok(uploadService.sign(user!.id, body)),
);
