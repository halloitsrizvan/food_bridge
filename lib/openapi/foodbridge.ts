// Every endpoint registers itself here (or in a sibling file imported by ./index.ts).
import { z } from "zod";
import { ContactNeedSchema, ClaimOfferSchema, ComplaintSchema, CreateNeedSchema, CreateOfferSchema, HandoverSchema, OfferQuerySchema, PublicOfferSchema, ReviewSchema } from "@/lib/schemas/food";
import { HealthSchema } from "@/lib/schemas/health";
import { AppealSchema, OnboardSchema, OpenToReceiveSchema, ProfileSchema, SignupSchema } from "@/lib/schemas/profile";
import { SignUploadBodySchema, SignUploadResponseSchema } from "@/lib/schemas/upload";
import { errorResponses, okResponse, registry } from "./registry";

type Method = "get" | "post" | "patch";
type Def = {
  method: Method;
  path: string;
  tag: string;
  summary: string;
  auth?: "user" | "GIVER" | "TAKER" | "GOV";
  body?: z.ZodType;
  query?: z.ZodObject;
  res?: z.ZodType;
  status?: number;
  params?: string[];
};

const anyJson = z.record(z.string(), z.unknown());

function reg(d: Def) {
  const status = d.status ?? 200;
  registry.registerPath({
    method: d.method,
    path: d.path,
    tags: [d.tag],
    summary: d.summary + (d.auth && d.auth !== "user" ? ` (${d.auth} only)` : ""),
    security: d.auth ? [{ supabaseSession: [] }] : undefined,
    request: {
      params: d.params ? z.object(Object.fromEntries(d.params.map((p) => [p, z.uuid()]))) : undefined,
      query: d.query,
      body: d.body ? { content: { "application/json": { schema: d.body } } } : undefined,
    },
    responses: {
      [status]: okResponse("Success", d.res ?? anyJson),
      400: errorResponses[400],
      ...(d.auth ? { 401: errorResponses[401], 403: errorResponses[403] } : {}),
      429: errorResponses[429],
    },
  });
}

const id = ["id"];

// System
reg({ method: "get", path: "/api/v1/health", tag: "System", summary: "Health check (verifies DB connectivity)", res: HealthSchema });
reg({ method: "get", path: "/api/v1/impact", tag: "Public", summary: "Live impact counters (meals, kg, CO2, active posts)" });
reg({ method: "get", path: "/api/v1/leaderboard", tag: "Public", summary: "Top givers" });

// Auth / profile
reg({ method: "post", path: "/api/v1/auth/signup", tag: "Auth", summary: "Create a GIVER or TAKER account", body: SignupSchema, status: 201 });
reg({ method: "get", path: "/api/v1/me", tag: "Profile", summary: "Current profile", auth: "user", res: ProfileSchema });
reg({ method: "post", path: "/api/v1/me/onboard", tag: "Profile", summary: "One-time onboarding", auth: "user", body: OnboardSchema, res: ProfileSchema });
reg({ method: "patch", path: "/api/v1/me/open-to-receive", tag: "Profile", summary: "Toggle open to receive food", auth: "TAKER", body: OpenToReceiveSchema, res: ProfileSchema });
reg({ method: "get", path: "/api/v1/me/offers", tag: "Profile", summary: "My posts", auth: "GIVER" });
reg({ method: "get", path: "/api/v1/me/needs", tag: "Profile", summary: "My needs", auth: "TAKER" });
reg({ method: "get", path: "/api/v1/me/claims", tag: "Profile", summary: "My claims", auth: "user" });
reg({ method: "get", path: "/api/v1/me/feed", tag: "Profile", summary: "Offers ranked for me by the match engine", auth: "TAKER" });
reg({ method: "post", path: "/api/v1/me/appeal", tag: "Trust", summary: "Appeal a suspension", auth: "user", body: AppealSchema, status: 201 });

// Offers
reg({ method: "get", path: "/api/v1/offers", tag: "Offers", summary: "Live public posts (area only)", query: OfferQuerySchema, res: z.object({ items: z.array(PublicOfferSchema), total: z.number(), page: z.number(), limit: z.number(), pages: z.number() }) });
reg({ method: "post", path: "/api/v1/offers", tag: "Offers", summary: "Post surplus food", auth: "GIVER", body: CreateOfferSchema, res: PublicOfferSchema, status: 201 });
reg({ method: "get", path: "/api/v1/offers/{id}", tag: "Offers", summary: "Public view of one post", params: id, res: PublicOfferSchema });
reg({ method: "patch", path: "/api/v1/offers/{id}", tag: "Offers", summary: "Edit an open post", auth: "GIVER", params: id });
reg({ method: "post", path: "/api/v1/offers/{id}/cancel", tag: "Offers", summary: "Cancel an open post", auth: "GIVER", params: id });
reg({ method: "post", path: "/api/v1/offers/{id}/claim", tag: "Claims", summary: "Taker contacts a post (starts a 15 min hold)", auth: "TAKER", params: id, body: ClaimOfferSchema, status: 201 });
reg({ method: "get", path: "/api/v1/offers/{id}/suggestions", tag: "Match", summary: "Ranked takers with score breakdown", auth: "GIVER", params: id });

// Needs
reg({ method: "get", path: "/api/v1/needs", tag: "Needs", summary: "Open needs near the giver, best match first", auth: "GIVER" });
reg({ method: "post", path: "/api/v1/needs", tag: "Needs", summary: "Post a need", auth: "TAKER", body: CreateNeedSchema, status: 201 });
reg({ method: "patch", path: "/api/v1/needs/{id}", tag: "Needs", summary: "Edit an open need", auth: "TAKER", params: id });
reg({ method: "post", path: "/api/v1/needs/{id}/cancel", tag: "Needs", summary: "Cancel an open need", auth: "TAKER", params: id });
reg({ method: "post", path: "/api/v1/needs/{id}/contact", tag: "Claims", summary: "Giver offers a post to a need", auth: "GIVER", params: id, body: ContactNeedSchema, status: 201 });
reg({ method: "get", path: "/api/v1/needs/{id}/suggestions", tag: "Match", summary: "Ranked offers for a need", auth: "TAKER", params: id });

// Claims
reg({ method: "get", path: "/api/v1/claims/{id}", tag: "Claims", summary: "Claim detail; exact address only for the two parties after ACCEPTED", auth: "user", params: id });
reg({ method: "post", path: "/api/v1/claims/{id}/accept", tag: "Claims", summary: "Other side accepts (giver sees the OTP)", auth: "user", params: id });
reg({ method: "post", path: "/api/v1/claims/{id}/decline", tag: "Claims", summary: "Other side declines", auth: "user", params: id });
reg({ method: "post", path: "/api/v1/claims/{id}/handover", tag: "Claims", summary: "Taker enters the 6-digit OTP", auth: "TAKER", params: id, body: HandoverSchema });
reg({ method: "post", path: "/api/v1/claims/{id}/review", tag: "Trust", summary: "Rate the other party", auth: "user", params: id, body: ReviewSchema, status: 201 });
reg({ method: "post", path: "/api/v1/claims/{id}/complaint", tag: "Trust", summary: "File a complaint", auth: "user", params: id, body: ComplaintSchema, status: 201 });

// Notifications, uploads, posters
reg({ method: "get", path: "/api/v1/notifications", tag: "Notifications", summary: "My notifications", auth: "user" });
reg({ method: "post", path: "/api/v1/notifications/read", tag: "Notifications", summary: "Mark notifications read", auth: "user" });
reg({ method: "post", path: "/api/v1/uploads/sign", tag: "Uploads", summary: "Signed Cloudinary upload", auth: "user", body: SignUploadBodySchema, res: SignUploadResponseSchema });
reg({ method: "get", path: "/api/v1/posters/{claimId}", tag: "Posters", summary: "PNG certificate for a completed claim", auth: "user", params: ["claimId"] });

// Government
reg({ method: "get", path: "/api/v1/gov/overview", tag: "Gov", summary: "KPIs, meals per day, leaderboard", auth: "GOV" });
reg({ method: "get", path: "/api/v1/gov/map", tag: "Gov", summary: "Open offers, needs, unmatched alerts", auth: "GOV" });
reg({ method: "get", path: "/api/v1/gov/users", tag: "Gov", summary: "Search users", auth: "GOV" });
reg({ method: "patch", path: "/api/v1/gov/users/{id}", tag: "Gov", summary: "Suspend / reactivate", auth: "GOV", params: id });
reg({ method: "get", path: "/api/v1/gov/complaints", tag: "Gov", summary: "Complaint queue", auth: "GOV" });
reg({ method: "get", path: "/api/v1/gov/appeals", tag: "Gov", summary: "Appeal queue", auth: "GOV" });
reg({ method: "post", path: "/api/v1/gov/appeals/{id}/decide", tag: "Gov", summary: "Approve or reject an appeal", auth: "GOV", params: id });
reg({ method: "get", path: "/api/v1/gov/config", tag: "Gov", summary: "Tunables", auth: "GOV" });
reg({ method: "patch", path: "/api/v1/gov/config", tag: "Gov", summary: "Update tunables", auth: "GOV" });

// Cron
reg({ method: "post", path: "/api/v1/cron/tick", tag: "Cron", summary: "Expiry, hold release, escalation (Bearer CRON_SECRET)" });
