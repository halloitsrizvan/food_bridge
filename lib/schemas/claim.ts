// Shape returned by GET /claims/{id} and GET /me/claims (plain TS types, shared with the UI).
import type { Category, ClaimStatus, Diet, MatchInfo, Mode, OfferStatus } from "./food";

export type Party = {
  id: string;
  name: string;
  kind: string | null;
  area: string;
  trustScore: number;
  members: number | null;
  /** Approximate (2 decimals) until the claim is ACCEPTED, exact afterwards. */
  lat: number | null;
  lng: number | null;
  /** Only present when revealed. */
  address?: string;
  phone?: string;
  mapsUrl?: string | null;
};

export type ClaimView = {
  id: string;
  status: ClaimStatus;
  initiatedBy: "GIVER" | "TAKER" | "GOV";
  viewerRole: "GIVER" | "TAKER" | "GOV";
  createdAt: string;
  holdUntil: string;
  acceptedAt: string | null;
  completedAt: string | null;
  mealsDelivered: number | null;
  revealed: boolean;
  offer: {
    id: string;
    title: string;
    description: string;
    category: Category;
    diet: Diet;
    quantityMeals: number;
    mode: Mode;
    status: OfferStatus;
    expiresAt: string;
    photoUrl: string | null;
  };
  need: { id: string; title: string; mealsNeeded: number } | null;
  giver: Party;
  taker: Party;
  /** Giver only, while ACCEPTED. */
  otp: string | null;
  otpExpiresAt: string | null;
  match: (MatchInfo & { feasible?: boolean }) | null;
  distanceKm: number | null;
  etaMin: number | null;
  can: { accept: boolean; decline: boolean; handover: boolean; review: boolean; complain: boolean };
  reviewed: boolean;
  complained: boolean;
  /** Points the viewer earned from this handover (COMPLETED only). */
  pointsEarned: number | null;
};
