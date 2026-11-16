/** Secret used to derive handover codes (HMAC). Falls back to the service-role key so no extra env var is required. */
export const otpSecret = () => process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-secret";
