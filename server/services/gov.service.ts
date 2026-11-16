import type { AccountStatus, Role } from "@prisma/client";
import { effectiveExpiry } from "../logic/time";
import { claimRepository } from "../repositories/claim.repository";
import { needRepository } from "../repositories/need.repository";
import { offerRepository } from "../repositories/offer.repository";
import { profileRepository } from "../repositories/profile.repository";
import { trustRepository } from "../repositories/trust.repository";
import { configService } from "./config.service";
import { impactService } from "./impact.service";
import { maintenanceService } from "./maintenance.service";

const DAY = 86_400_000;

export const govService = {
  async overview() {
    await maintenanceService.sweepIfStale();
    const cfg = await configService.get();
    const since = new Date(Date.now() - 14 * DAY);
    const [impact, completed, complaints, leaderboard, users, openAppeals] = await Promise.all([
      impactService.get(),
      claimRepository.completedSince(since),
      trustRepository.count(new Date(Date.now() - cfg.suspension.windowDays * DAY)),
      impactService.leaderboard(),
      Promise.all([
        profileRepository.count({ role: "GIVER", onboarded: true }),
        profileRepository.count({ role: "TAKER", onboarded: true }),
        profileRepository.count({ status: { in: ["SUSPENDED", "APPEALING"] } }),
      ]),
      trustRepository.listAppeals(50).then((a) => a.filter((x) => x.status === "OPEN").length),
    ]);
    const perDay = new Map<string, number>();
    for (let i = 13; i >= 0; i--) perDay.set(new Date(Date.now() - i * DAY).toISOString().slice(0, 10), 0);
    for (const c of completed) {
      const k = c.completedAt!.toISOString().slice(0, 10);
      if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + (c.mealsDelivered ?? 0));
    }
    return {
      kpis: { ...impact, openComplaints: complaints, openAppeals, givers: users[0], takers: users[1], suspended: users[2] },
      mealsPerDay: [...perDay].map(([date, meals]) => ({ date, meals })),
      leaderboard,
    };
  },

  /** Exact coordinates are fine here: the government console is a trusted view. */
  async map() {
    await maintenanceService.sweepIfStale();
    const now = new Date();
    const [offers, needs] = await Promise.all([
      offerRepository.findManyForGov({ status: { in: ["OPEN", "CONTACTED", "SETTLED"] }, expectedExpiryAt: { gt: now }, safeUntil: { gt: now } }),
      needRepository.openForGov(),
    ]);
    return {
      offers: offers
        .filter((o) => o.giver.lat != null)
        .map((o) => ({
          id: o.id, title: o.title, meals: o.quantityMeals, status: o.status, area: o.giver.area, giver: o.giver.name,
          lat: o.giver.lat!, lng: o.giver.lng!, expiresAt: effectiveExpiry(o).toISOString(),
          unmatched: o.status === "OPEN" && o.govAlerted,
        })),
      needs: needs
        .filter((n) => n.taker.lat != null)
        .map((n) => ({ id: n.id, title: n.title, meals: n.mealsNeeded, area: n.taker.area, taker: n.taker.name, lat: n.taker.lat!, lng: n.taker.lng!, neededBy: n.neededBy.toISOString() })),
    };
  },

  async users(f: { q?: string; role?: Role; status?: AccountStatus }, page: number, limit: number) {
    const [rows, total] = await profileRepository.listForGov(f, page, limit);
    return {
      total, page, limit,
      items: rows.map((p) => ({
        id: p.id, name: p.name, email: p.email, phone: p.phone, role: p.role, kind: p.giverKind ?? p.takerKind, area: p.area,
        status: p.status, points: p.points, tier: p.tier, trustScore: p.trustScore, onboarded: p.onboarded, createdAt: p.createdAt.toISOString(),
      })),
    };
  },

  async complaints() {
    const rows = await trustRepository.listComplaintsForGov();
    return rows.map((c) => ({
      id: c.id, reason: c.reason, weight: c.weight, createdAt: c.createdAt.toISOString(),
      from: { id: c.from.id, name: c.from.name }, against: { id: c.against.id, name: c.against.name, status: c.against.status, trustScore: c.against.trustScore },
      claimId: c.claimId, offerTitle: c.claim.offer.title,
    }));
  },

  async appeals() {
    const rows = await trustRepository.listAppeals();
    return rows.map((a) => ({
      id: a.id, message: a.message, status: a.status, createdAt: a.createdAt.toISOString(), decidedAt: a.decidedAt?.toISOString() ?? null,
      account: { id: a.account.id, name: a.account.name, email: a.account.email, status: a.account.status, trustScore: a.account.trustScore },
    }));
  },
};
