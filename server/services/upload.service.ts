import type { SignUploadBody, SignUploadResponse } from "@/lib/schemas/upload";
import { signUpload } from "../lib/cloudinary";

const ALLOWED_FORMATS = "jpg,jpeg,png,webp,gif";

export const uploadService = {
  /** Folder is namespaced per user so one user cannot write into another's folder. */
  sign(userId: string, body: SignUploadBody): SignUploadResponse {
    const folder = `app/${body.folder}/${userId}`;
    const s = signUpload({ folder, allowedFormats: ALLOWED_FORMATS });
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${s.cloudName}/image/upload`,
      apiKey: s.apiKey,
      timestamp: s.timestamp,
      signature: s.signature,
      folder,
      allowedFormats: ALLOWED_FORMATS,
    };
  },
};
