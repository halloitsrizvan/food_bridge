"use client";
// One hook per endpoint: query key + api<T>() + shared types.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClaimView } from "@/lib/schemas/claim";
import type { CreateNeed, CreateOffer, MatchInfo, NeedDTO, OfferWithMatch, PublicOffer } from "@/lib/schemas/food";
import type { ProfileDTO } from "@/lib/schemas/profile";
import type { SignUploadBody, SignUploadResponse } from "@/lib/schemas/upload";
import { api, ApiClientError } from "./client";

export type Page<T> = { items: T[]; total: number; page: number; limit: number; pages: number };
export type Impact = { meals: number; kg: number; co2Kg: number; handovers: number; activePosts: number; avgMatchMinutes: number | null };
export type LeaderRow = { rank: number; name: string; kind: string | null; area: string; tier: ProfileDTO["tier"]; points: number; meals: number };
export type Notif = { id: string; type: string; title: string; body: string; link: string; readAt: string | null; createdAt: string };
export type MyOffer = PublicOffer & { claimId: string | null; claimStatus: string | null };
export type TakerSuggestion = { takerId: string; name: string; kind: string | null; members: number | null; area: string; lat: number | null; lng: number | null; match: MatchInfo; radiusKm: number };

const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

// ---- public
export const useImpact = () => useQuery({ queryKey: ["impact"], queryFn: () => api<Impact>("/api/v1/impact"), refetchInterval: 20_000 });
export const useLeaderboard = () => useQuery({ queryKey: ["leaderboard"], queryFn: () => api<LeaderRow[]>("/api/v1/leaderboard") });
export type OfferFilters = { area?: string; q?: string; diet?: string; category?: string; maxMinutesLeft?: number; sort?: string; page?: number; limit?: number; lat?: number; lng?: number };
export const useOffers = (f: OfferFilters) =>
  useQuery({ queryKey: ["offers", f], queryFn: () => api<Page<PublicOffer>>(`/api/v1/offers${qs(f)}`), refetchInterval: 20_000, placeholderData: (p) => p });
export const useOffer = (id: string) => useQuery({ queryKey: ["offer", id], queryFn: () => api<PublicOffer>(`/api/v1/offers/${id}`), refetchInterval: 20_000 });

// ---- me
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api<ProfileDTO>("/api/v1/me");
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 30_000,
    retry: false,
  });
}
export const useMyOffers = () => useQuery({ queryKey: ["my-offers"], queryFn: () => api<MyOffer[]>("/api/v1/me/offers"), refetchInterval: 15_000 });
export const useMyNeeds = () => useQuery({ queryKey: ["my-needs"], queryFn: () => api<NeedDTO[]>("/api/v1/me/needs"), refetchInterval: 15_000 });
export const useMyClaims = () => useQuery({ queryKey: ["my-claims"], queryFn: () => api<ClaimView[]>("/api/v1/me/claims"), refetchInterval: 10_000 });
export const useFeed = () => useQuery({ queryKey: ["feed"], queryFn: () => api<OfferWithMatch[]>("/api/v1/me/feed"), refetchInterval: 20_000 });
export const useNeedsNear = () => useQuery({ queryKey: ["needs-near"], queryFn: () => api<NeedDTO[]>("/api/v1/needs"), refetchInterval: 20_000 });
export const useTakerSuggestions = (offerId: string | undefined) =>
  useQuery({ queryKey: ["suggest", offerId], enabled: !!offerId, queryFn: () => api<TakerSuggestion[]>(`/api/v1/offers/${offerId}/suggestions`) });
export const useClaim = (id: string) => useQuery({ queryKey: ["claim", id], queryFn: () => api<ClaimView>(`/api/v1/claims/${id}`), refetchInterval: 6_000 });
export const useNotifications = () =>
  useQuery({ queryKey: ["notifications"], queryFn: () => api<{ unread: number; items: Notif[] }>("/api/v1/notifications"), refetchInterval: 30_000 });

// ---- mutations
function useAct<TIn, TOut>(fn: (v: TIn) => Promise<TOut>, invalidate: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })),
  });
}
const all = [["my-offers"], ["my-needs"], ["my-claims"], ["feed"], ["needs-near"], ["offers"], ["claim"], ["me"], ["notifications"], ["impact"]];

export const useCreateOffer = () => useAct((b: CreateOffer) => api<PublicOffer>("/api/v1/offers", { method: "POST", body: b }), all);
export const useCancelOffer = () => useAct((id: string) => api(`/api/v1/offers/${id}/cancel`, { method: "POST" }), all);
export const useCreateNeed = () => useAct((b: CreateNeed) => api<NeedDTO>("/api/v1/needs", { method: "POST", body: b }), all);
export const useCancelNeed = () => useAct((id: string) => api(`/api/v1/needs/${id}/cancel`, { method: "POST" }), all);
export const useClaimOffer = () => useAct((v: { offerId: string; needId?: string }) => api<{ id: string }>(`/api/v1/offers/${v.offerId}/claim`, { method: "POST", body: { needId: v.needId } }), all);
export const useContactNeed = () => useAct((v: { needId: string; offerId: string }) => api<{ id: string }>(`/api/v1/needs/${v.needId}/contact`, { method: "POST", body: { offerId: v.offerId } }), all);
export const useAcceptClaim = () => useAct((id: string) => api<ClaimView>(`/api/v1/claims/${id}/accept`, { method: "POST" }), all);
export const useDeclineClaim = () => useAct((id: string) => api<ClaimView>(`/api/v1/claims/${id}/decline`, { method: "POST" }), all);
export const useHandover = () => useAct((v: { id: string; otp: string }) => api<{ claim: ClaimView; pointsAwarded: number }>(`/api/v1/claims/${v.id}/handover`, { method: "POST", body: { otp: v.otp } }), all);
export const useReview = () => useAct((v: { id: string; rating: number; comment: string }) => api(`/api/v1/claims/${v.id}/review`, { method: "POST", body: { rating: v.rating, comment: v.comment } }), all);
export const useComplain = () => useAct((v: { id: string; reason: string }) => api(`/api/v1/claims/${v.id}/complaint`, { method: "POST", body: { reason: v.reason } }), all);
export const useAppeal = () => useAct((message: string) => api("/api/v1/me/appeal", { method: "POST", body: { message } }), all);
export const useSignUpload = () => useMutation({ mutationFn: (body: SignUploadBody) => api<SignUploadResponse>("/api/v1/uploads/sign", { method: "POST", body }) });

/** Optimistic toggle: flips immediately, rolls back on error. */
export function useOpenToReceive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (openToReceive: boolean) => api<ProfileDTO>("/api/v1/me/open-to-receive", { method: "PATCH", body: { openToReceive } }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: ["me"] });
      const prev = qc.getQueryData<ProfileDTO | null>(["me"]);
      if (prev) qc.setQueryData(["me"], { ...prev, openToReceive: v });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["me"], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => api("/api/v1/notifications/read", { method: "POST", body: { ids } }),
    onMutate: async () => {
      const prev = qc.getQueryData<{ unread: number; items: Notif[] }>(["notifications"]);
      if (prev) qc.setQueryData(["notifications"], { unread: 0, items: prev.items.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ---- gov
export type GovOverview = {
  kpis: Impact & { openComplaints: number; openAppeals: number; givers: number; takers: number; suspended: number };
  mealsPerDay: { date: string; meals: number }[];
  leaderboard: LeaderRow[];
};
export type GovMap = {
  offers: { id: string; title: string; meals: number; status: string; area: string; giver: string; lat: number; lng: number; expiresAt: string; unmatched: boolean }[];
  needs: { id: string; title: string; meals: number; area: string; taker: string; lat: number; lng: number; neededBy: string }[];
};
export type GovUser = { id: string; name: string; email: string; phone: string; role: string; kind: string | null; area: string; status: string; points: number; tier: string; trustScore: number; onboarded: boolean; createdAt: string };
export type GovComplaint = { id: string; reason: string; weight: number; createdAt: string; from: { id: string; name: string }; against: { id: string; name: string; status: string; trustScore: number }; claimId: string; offerTitle: string };
export type GovAppeal = { id: string; message: string; status: string; createdAt: string; decidedAt: string | null; account: { id: string; name: string; email: string; status: string; trustScore: number } };

export const useGovOverview = () => useQuery({ queryKey: ["gov-overview"], queryFn: () => api<GovOverview>("/api/v1/gov/overview"), refetchInterval: 15_000 });
export const useGovMap = () => useQuery({ queryKey: ["gov-map"], queryFn: () => api<GovMap>("/api/v1/gov/map"), refetchInterval: 15_000 });
export const useGovUsers = (f: { q?: string; role?: string; status?: string; page?: number }) =>
  useQuery({ queryKey: ["gov-users", f], queryFn: () => api<Page<GovUser>>(`/api/v1/gov/users${qs({ ...f, limit: 20 })}`), placeholderData: (p) => p });
export const useGovComplaints = () => useQuery({ queryKey: ["gov-complaints"], queryFn: () => api<GovComplaint[]>("/api/v1/gov/complaints") });
export const useGovAppeals = () => useQuery({ queryKey: ["gov-appeals"], queryFn: () => api<GovAppeal[]>("/api/v1/gov/appeals") });
export const useGovConfig = () => useQuery({ queryKey: ["gov-config"], queryFn: () => api<Record<string, unknown>>("/api/v1/gov/config") });
const govKeys = [["gov-users"], ["gov-complaints"], ["gov-appeals"], ["gov-overview"], ["gov-config"], ["gov-map"]];
export const useSetUserStatus = () => useAct((v: { id: string; status: "ACTIVE" | "SUSPENDED" }) => api(`/api/v1/gov/users/${v.id}`, { method: "PATCH", body: { status: v.status } }), govKeys);
export const useDecideAppeal = () => useAct((v: { id: string; decision: "APPROVED" | "REJECTED" }) => api(`/api/v1/gov/appeals/${v.id}/decide`, { method: "POST", body: { decision: v.decision } }), govKeys);
export const useSaveConfig = () => useAct((patch: Record<string, unknown>) => api("/api/v1/gov/config", { method: "PATCH", body: patch }), govKeys);
