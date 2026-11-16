import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { z } from "zod";
import { handoverQrUrl } from "@/lib/handover-qr";
import { AppError } from "@/server/lib/errors";
import { otpSecret } from "@/server/lib/otp-secret";
import { route } from "@/server/lib/route";
import { deriveOtp } from "@/server/logic/otp";
import { effectiveExpiry } from "@/server/logic/time";
import { claimRepository } from "@/server/repositories/claim.repository";

// PNG handover card in the site's theme. Only the GIVER of an ACCEPTED claim can render it
// (it contains the one-time code), and never after the food has expired.
export const GET = route({ auth: ["GIVER"] }, async ({ user, params, req }) => {
  const id = z.uuid().parse(params.id);
  const c = await claimRepository.findFull(id);
  if (!c || c.giverId !== user!.id) throw AppError.notFound("Claim not found");
  if (c.status !== "ACCEPTED" || !c.otpSalt || !c.otpExpiresAt) throw AppError.conflict("The handover code is only available while the claim is accepted");
  if (c.otpExpiresAt <= new Date()) throw AppError.conflict("This code expired with the food");

  const otp = deriveOtp(otpSecret(), c.id, c.otpSalt);
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const qr = await QRCode.toDataURL(handoverQrUrl(origin, c.id, otp), { margin: 1, width: 560, errorCorrectionLevel: "M", color: { dark: "#032724", light: "#FFFFFF" } });
  const until = effectiveExpiry(c.offer).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F5F5F5", fontFamily: "sans-serif", color: "#212529" }}>
        {/* header band */}
        <div style={{ display: "flex", flexDirection: "column", padding: "56px 64px 120px", background: "linear-gradient(135deg,#032724 0%,#066a62 50%,#27b3a3 100%)", color: "white" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", width: 64, height: 64, borderRadius: 999, background: "#088178", border: "3px solid rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginRight: 18 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13h18a9 9 0 0 1-18 0z" />
                <path d="M8 9c0-2 1.5-2.5 1.5-4.5M13 9c0-2 1.5-2.5 1.5-4.5" stroke="#F2A33A" />
              </svg>
            </div>
            <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>FoodBridge</div>
            <div style={{ marginLeft: "auto", display: "flex", padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 24, fontWeight: 600 }}>Government verified</div>
          </div>
          <div style={{ display: "flex", marginTop: 52, fontSize: 30, fontWeight: 700, letterSpacing: 4, color: "#f6c445" }}>HANDOVER CODE</div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 60, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5, maxWidth: 900 }}>{c.offer.title}</div>
        </div>

        {/* QR card overlaps the band */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -84 }}>
          <div style={{ display: "flex", padding: 32, borderRadius: 40, background: "white", boxShadow: "0 24px 60px rgba(3,39,36,0.22)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={560} height={560} alt="" />
          </div>

          <div style={{ display: "flex", marginTop: 36, fontSize: 28, color: "#667085" }}>or enter this 6-digit code</div>
          <div style={{ display: "flex", marginTop: 8, padding: "10px 44px", borderRadius: 999, background: "#e4f3f1", fontSize: 108, fontWeight: 800, letterSpacing: 18, color: "#032724", paddingLeft: 62 }}>{otp}</div>

          <div style={{ display: "flex", marginTop: 40, gap: 16 }}>
            <div style={{ display: "flex", padding: "12px 26px", borderRadius: 999, background: "#088178", color: "white", fontSize: 28, fontWeight: 700 }}>{c.offer.quantityMeals} meals</div>
            <div style={{ display: "flex", padding: "12px 26px", borderRadius: 999, background: "white", border: "2px solid #e6e8e8", fontSize: 28, fontWeight: 600 }}>For {c.taker.name}</div>
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 26, color: "#667085" }}>Valid until {until}</div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", marginTop: "auto", padding: "26px 64px", background: "#032724", color: "rgba(255,255,255,0.85)", fontSize: 26, justifyContent: "space-between" }}>
          <div style={{ display: "flex" }}>Show to the receiver. Do not share elsewhere.</div>
          <div style={{ display: "flex", color: "#f6c445", fontWeight: 700 }}>One-time use</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1500, headers: { "Cache-Control": "private, no-store" } },
  );
});
