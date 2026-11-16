import { v2 as cloudinary } from "cloudinary";
import { requireEnv } from "./env";

/** Create a signed direct-upload payload. The API secret never leaves the server. */
export function signUpload(params: { folder: string; allowedFormats: string }) {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: params.folder, allowed_formats: params.allowedFormats },
    apiSecret,
  );
  return { cloudName, apiKey, timestamp, signature };
}
