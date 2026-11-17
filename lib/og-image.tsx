import { ImageResponse } from "next/og";
import { LOGO_DATA_URL } from "@/lib/brand";
import { SITE_NAME } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };

/** 1200x630 share card shown when the site is linked on WhatsApp, X, Facebook, LinkedIn... */
export function renderShareImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "linear-gradient(135deg,#032724 0%,#066a62 50%,#27b3a3 100%)", color: "white", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_DATA_URL} width={84} height={84} alt="" style={{ borderRadius: 999, marginRight: 22, border: "4px solid rgba(255,255,255,0.45)" }} />
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>{SITE_NAME}</div>
          <div style={{ marginLeft: "auto", display: "flex", padding: "12px 26px", borderRadius: 999, background: "rgba(255,255,255,0.16)", fontSize: 28, fontWeight: 600 }}>Government verified</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, maxWidth: 980 }}>Good food should find a plate, not a bin.</div>
          <div style={{ marginTop: 28, fontSize: 34, color: "rgba(255,255,255,0.85)", maxWidth: 940 }}>Surplus food matched with people who need it, free, within minutes.</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
