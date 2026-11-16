import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { route } from "@/server/lib/route";
import { claimRepository } from "@/server/repositories/claim.repository";
import { prisma } from "@/server/lib/prisma";
import { configService } from "@/server/services/config.service";
import { impactFromMeals } from "@/server/logic/impact";

// Congratulations poster (PNG, 1080x1350) in the site theme. Only the completed claim's giver, or gov, can render it.
export const GET = route({ auth: ["GIVER", "GOV"] }, async ({ user, params, req }) => {
  const id = z.uuid().parse(params.claimId);
  const claim = await claimRepository.findFull(id);
  if (!claim || claim.status !== "COMPLETED" || (user!.role !== "GOV" && claim.giverId !== user!.id)) throw AppError.notFound("Poster not available");
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const [qr, ledger, cfg] = await Promise.all([
    QRCode.toDataURL(`${origin}/verify/${claim.id}`, { margin: 1, width: 300, color: { dark: "#032724", light: "#FFFFFF" } }),
    prisma.pointLedger.findMany({ where: { claimId: id, accountId: claim.giverId } }),
    configService.get(),
  ]);
  const points = ledger.reduce((s, l) => s + l.delta, 0);
  const meals = claim.mealsDelivered ?? 0;
  const { kg, co2Kg } = impactFromMeals(meals, cfg);
  const date = (claim.completedAt ?? new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
  const name = claim.giver.name;
  const nameSize = name.length > 26 ? 60 : name.length > 16 ? 76 : 92;

  const stat = (value: string, label: string) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, padding: "26px 10px", borderRadius: 32, background: "white", border: "2px solid #e6e8e8" }}>
      <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#088178", letterSpacing: -1 }}>{value}</div>
      <div style={{ display: "flex", marginTop: 4, fontSize: 24, color: "#667085" }}>{label}</div>
    </div>
  );

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F5F5F5", fontFamily: "sans-serif", color: "#212529" }}>
        {/* hero band */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "52px 64px 150px", background: "linear-gradient(135deg,#032724 0%,#066a62 50%,#27b3a3 100%)", color: "white", position: "relative" }}>
          <div style={{ display: "flex", width: "100%", alignItems: "center" }}>
            <div style={{ display: "flex", width: 64, height: 64, borderRadius: 999, background: "#088178", border: "3px solid rgba(255,255,255,0.35)", alignItems: "center", justifyContent: "center", marginRight: 18 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13h18a9 9 0 0 1-18 0z" />
                <path d="M8 9c0-2 1.5-2.5 1.5-4.5M13 9c0-2 1.5-2.5 1.5-4.5" stroke="#F2A33A" />
              </svg>
            </div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 800, letterSpacing: -1 }}>FoodBridge</div>
            <div style={{ marginLeft: "auto", display: "flex", padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 24, fontWeight: 600 }}>Government verified</div>
          </div>
          <div style={{ display: "flex", marginTop: 64, fontSize: 30, fontWeight: 700, letterSpacing: 8, color: "#f6c445" }}>CONGRATULATIONS</div>
          <div style={{ display: "flex", marginTop: 18, fontSize: nameSize, fontWeight: 800, letterSpacing: -2, textAlign: "center", lineHeight: 1.05, maxWidth: 940, justifyContent: "center" }}>{name}</div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 34, color: "rgba(255,255,255,0.88)" }}>You turned surplus food into meals.</div>
        </div>

        {/* big number card overlapping the band */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -92, padding: "0 64px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "34px 0 30px", borderRadius: 44, background: "white", boxShadow: "0 24px 60px rgba(3,39,36,0.2)" }}>
            <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 4, color: "#667085" }}>YOU SAVED</div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 }}>
              <div style={{ display: "flex", fontSize: 190, fontWeight: 800, lineHeight: 1, color: "#088178", letterSpacing: -6 }}>{meals}</div>
              <div style={{ display: "flex", marginLeft: 20, fontSize: 60, fontWeight: 700, color: "#032724" }}>meals</div>
            </div>
            <div style={{ display: "flex", marginTop: 14, padding: "12px 30px", borderRadius: 999, background: "#f6c445", fontSize: 34, fontWeight: 800, color: "#032724" }}>+{points} points earned</div>
          </div>

          <div style={{ display: "flex", width: "100%", gap: 18, marginTop: 24 }}>
            {stat(`${kg}`, "kg of food saved")}
            {stat(`${co2Kg}`, "kg CO₂ avoided")}
          </div>

          <div style={{ display: "flex", marginTop: 26, fontSize: 28, color: "#667085", textAlign: "center", justifyContent: "center" }}>
            Delivered to {claim.taker.name} on {date}
          </div>
        </div>

        {/* verify strip */}
        <div style={{ display: "flex", alignItems: "center", marginTop: "auto", padding: "26px 64px", background: "#032724", color: "white" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>Thank you for feeding your community</div>
            <div style={{ display: "flex", marginTop: 8, fontSize: 24, color: "rgba(255,255,255,0.75)" }}>Scan to verify this handover. One-time code confirmed by both sides.</div>
          </div>
          <div style={{ display: "flex", padding: 12, borderRadius: 24, background: "white", marginLeft: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} width={150} height={150} alt="" />
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350, headers: { "Cache-Control": "private, max-age=60" } },
  );
});
