import { z } from "zod";

export const ALLOWED_UPLOAD_FOLDERS = ["avatars", "uploads"] as const;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const SignUploadBodySchema = z
  .object({
    folder: z.enum(ALLOWED_UPLOAD_FOLDERS),
    fileType: z.enum(ALLOWED_IMAGE_TYPES),
  })
  .meta({ id: "SignUploadBody" });
export type SignUploadBody = z.infer<typeof SignUploadBodySchema>;

export const SignUploadResponseSchema = z
  .object({
    uploadUrl: z.string(),
    apiKey: z.string(),
    timestamp: z.number(),
    signature: z.string(),
    folder: z.string(),
    allowedFormats: z.string(),
  })
  .meta({ id: "SignUploadResponse" });
export type SignUploadResponse = z.infer<typeof SignUploadResponseSchema>;
