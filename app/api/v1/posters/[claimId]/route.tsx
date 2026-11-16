import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import { z } from "zod";
import { AppError } from "@/server/lib/errors";
import { route } from "@/server/lib/route";
import { claimRepository } from "@/server/repositories/claim.repository";
import { prisma } from "@/server/lib/prisma";

const TIER_COLOR = { BRONZE: "#B9772E", SILVER: "#8E9AA3", GOLD: "#E0A21B", PLATINUM: "#3C8C94" } as const;

// PNG certificate. Only the completed claim's giver, or gov, can render it.
export const GET = route({ auth: ["GIVER", "GOV"] }, async ({ user, params, req }) => {
  const id = z.uuid().parse(params.claimId);
  const claim = await claimRepository.findFull(id);
  if (!claim || claim.status !== "COMPLETED" || (user!.role !== "GOV" && claim.giverId !== user!.id)) throw AppError.notFound("Poster not available");
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
  const qr = await QRCode.toDataURL(`${origin}/verify/${claim.id}`, { margin: 1, width: 220, color: { dark: "#0F3D2A", light: "#FFFFFF" } });
  const ledger = await prisma.pointLedger.findMany({ where: { claimId: id, accountId: claim.giverId } });
  const points = ledger.reduce((s, l) => s + l.delta, 0);
  const meals = claim.mealsDelivered ?? 0;
  const tier = claim.giver.tier;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#FBF7F0", padding: 56, fontFamily: "sans-serif", color: "#16251D", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 30, fontWeight: 700, color: "#0F3D2A" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "#1F7A4D", marginRight: 14 }} />
            FoodBridge
          </div>
          <div style={{ fontSize: 20, color: "#5E6B63" }}>Government verified</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 72, flex: 1 }}>
          <div style={{ fontSize: 26, color: "#C8553D", fontWeight: 700, letterSpacing: 3 }}>CERTIFICATE OF KINDNESS</div>
          <div style={{ fontSize: 76, fontWeight: 800, marginTop: 18, color: "#0F3D2A", lineHeight: 1.05 }}>{claim.giver.name}</div>
          <div style={{ fontSize: 40, marginTop: 24, display: "flex" }}>
            saved <span style={{ color: "#1F7A4D", fontWeight: 800, margin: "0 12px" }}>{meals} meals</span> from the bin.
          </div>
          <div style={{ display: "flex", marginTop: 40 }}>
            <div style={{ display: "flex", padding: "14px 26px", borderRadius: 999, background: "#F2A33A", fontSize: 28, fontWeight: 700, marginRight: 18 }}>+{points} points</div>
            <div style={{ display: "flex", padding: "14px 26px", borderRadius: 999, background: TIER_COLOR[tier], color: "white", fontSize: 28, fontWeight: 700 }}>{tier}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 22, color: "#5E6B63" }}>
            <div>{claim.completedAt?.toDateString()}</div>
            <div style={{ marginTop: 6 }}>Scan to verify this handover</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} width={150} height={150} alt="" />
        </div>
      </div>
    ),
    { width: 1200, height: 800, headers: { "Cache-Control": "private, max-age=60" } },
  );
});
