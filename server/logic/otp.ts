import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * OTP is derived (HMAC of claim id + random salt) so the giver can re-read it,
 * while only its SHA-256 is stored. Verification compares hashes in constant time.
 */
export function newSalt() {
  return randomBytes(8).toString("hex");
}

export function deriveOtp(secret: string, claimId: string, salt: string): string {
  const h = createHmac("sha256", secret).update(`${claimId}:${salt}`).digest();
  return String(h.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

export const hashOtp = (otp: string) => createHash("sha256").update(otp).digest("hex");

export function verifyOtp(input: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(input));
  const b = Buffer.from(storedHash);
  return a.length === b.length && timingSafeEqual(a, b);
}
