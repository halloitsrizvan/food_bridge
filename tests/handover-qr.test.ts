import { describe, expect, it } from "vitest";
import { handoverQrUrl, parseHandoverQr } from "@/lib/handover-qr";

const id = "3f2c1d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

describe("handover QR", () => {
  it("round-trips the claim id and code", () => {
    expect(parseHandoverQr(handoverQrUrl("https://foodbridge.example", id, "042913"))).toEqual({ claimId: id, code: "042913" });
  });
  it("rejects non-handover QR content", () => {
    expect(parseHandoverQr("hello")).toBeNull();
    expect(parseHandoverQr("https://example.com/")).toBeNull();
    expect(parseHandoverQr(`https://x.test/dashboard/claims/${id}`)).toBeNull();
    expect(parseHandoverQr(`https://x.test/dashboard/claims/${id}?code=12345`)).toBeNull();
    expect(parseHandoverQr("https://x.test/dashboard/claims/not-a-uuid?code=123456")).toBeNull();
  });
});
