// The handover QR is a plain link: opening it with ANY phone camera lands on the claim screen with the
// code pre-filled, and the in-app scanner reads the same payload. Only the claim's receiver can complete it.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export const handoverQrUrl = (origin: string, claimId: string, otp: string) => `${origin}/dashboard/claims/${claimId}?code=${otp}`;

/** Read { claimId, code } from a scanned QR text. Returns null for anything that is not a FoodBridge handover QR. */
export function parseHandoverQr(text: string): { claimId: string; code: string } | null {
  try {
    const u = new URL(text.trim());
    const m = u.pathname.match(new RegExp(`/dashboard/claims/(${UUID})$`, "i"));
    const code = u.searchParams.get("code") ?? "";
    return m && /^\d{6}$/.test(code) ? { claimId: m[1].toLowerCase(), code } : null;
  } catch {
    return null;
  }
}
