// Lazy time-based logic: runs on reads (throttled) and from the cron tick. Idempotent.
import { levelFor, needsGovAlert } from "../logic/escalation";
import { effectiveExpiry, elapsedFraction } from "../logic/time";
import { claimRepository } from "../repositories/claim.repository";
import { needRepository } from "../repositories/need.repository";
import { offerRepository } from "../repositories/offer.repository";
import { prisma } from "../lib/prisma";
import { configService } from "./config.service";
import { notificationService } from "./notification.service";
import { radiusFor } from "../logic/escalation";

let lastRun = 0;
let running: Promise<SweepResult> | null = null;

export type SweepResult = { offersExpired: number; needsExpired: number; holdsReleased: number; escalated: number; announced: number; govAlerts: number };

async function run(): Promise<SweepResult> {
  const now = new Date();
  const cfg = await configService.get();
  const r: SweepResult = { offersExpired: 0, needsExpired: 0, holdsReleased: 0, escalated: 0, announced: 0, govAlerts: 0 };
  // lazy import: offer.service depends on this module
  const { offerService } = await import("./offer.service");

  // 1. reservation holds that were never accepted -> release the offer
  for (const c of await claimRepository.expiredHolds(now)) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.claim.findUnique({ where: { id: c.id } });
      if (!fresh || fresh.status !== "PENDING") return;
      await tx.claim.update({ where: { id: c.id }, data: { status: "EXPIRED" } });
      await tx.offer.updateMany({ where: { id: c.offerId, status: "CONTACTED" }, data: { status: "OPEN" } });
      if (c.needId) await tx.need.updateMany({ where: { id: c.needId, status: "CONTACTED" }, data: { status: "OPEN" } });
    });
    r.holdsReleased++;
    const responder = c.initiatedBy === "TAKER" ? c.giverId : c.takerId;
    const initiator = c.initiatedBy === "TAKER" ? c.takerId : c.giverId;
    await notificationService.notifyMany([
      { userId: initiator, type: "CLAIM_EXPIRED", title: "Request timed out", body: `${c.offer.title}: the other side did not respond in time. The food is open again.`, link: `/dashboard/claims/${c.id}` },
      { userId: responder, type: "CLAIM_EXPIRED", title: "You missed a request", body: `The hold on ${c.offer.title} expired.`, link: `/dashboard/claims/${c.id}` },
    ]);
  }

  // 2. offers past their effective expiry, announce scheduled ones, escalate the rest
  for (const o of await offerRepository.forSweep()) {
    const eff = effectiveExpiry(o);
    if (eff <= now) {
      const active = await claimRepository.activeForOfferIds([o.id]);
      await prisma.$transaction([
        prisma.offer.update({ where: { id: o.id }, data: { status: "EXPIRED" } }),
        prisma.claim.updateMany({ where: { offerId: o.id, status: { in: ["PENDING", "ACCEPTED"] } }, data: { status: "EXPIRED" } }),
        ...active.filter((c) => c.needId).map((c) => prisma.need.updateMany({ where: { id: c.needId!, status: { in: ["CONTACTED", "SETTLED"] } }, data: { status: "OPEN" } })),
      ]);
      r.offersExpired++;
      continue;
    }
    if (o.status !== "OPEN" || o.giver.status !== "ACTIVE") continue;
    if (o.scheduledFor && o.scheduledFor > now) continue; // upcoming: not announced yet

    if (o.escalationLevel === -1) {
      await offerRepository.update(o.id, { escalationLevel: 0 });
      await offerService.announce(o, 0);
      r.announced++;
      continue;
    }
    const start = o.scheduledFor && o.scheduledFor > o.createdAt ? o.scheduledFor : o.createdAt;
    const frac = elapsedFraction(start, eff, now);
    const level = levelFor(frac, cfg);
    if (level > o.escalationLevel) {
      const prevRadius = cfg.radiusSteps[o.escalationLevel];
      await offerRepository.update(o.id, { escalationLevel: level });
      await offerService.announce({ ...o, escalationLevel: level }, prevRadius);
      await notificationService.notify({
        userId: o.giverId,
        type: "ESCALATION",
        title: "Widening the search",
        body: `${o.title} is still unmatched. Now looking within ${radiusFor(frac, cfg)} km.`,
        link: `/dashboard/offers/${o.id}`,
      });
      r.escalated++;
    }
    if (needsGovAlert(frac, o.govAlerted, cfg)) {
      await offerRepository.update(o.id, { govAlerted: true });
      await notificationService.notifyGov(
        "GOV_ALERT",
        "Unmatched food expiring soon",
        `${o.title} (${o.quantityMeals} meals, ${o.giver.area}) has ${Math.max(0, Math.round((eff.getTime() - now.getTime()) / 60000))} min left with no taker.`,
        "/gov/map",
      );
      r.govAlerts++;
    }
  }

  // 3. needs past their deadline
  for (const n of await needRepository.forSweep()) {
    if (n.neededBy <= now) {
      await needRepository.update(n.id, { status: "EXPIRED" });
      r.needsExpired++;
    }
  }
  return r;
}

export const maintenanceService = {
  /** Always run (cron). */
  async sweep(): Promise<SweepResult> {
    if (running) return running;
    running = run().finally(() => {
      lastRun = Date.now();
      running = null;
    });
    return running;
  },

  /** Cheap lazy trigger for read paths: at most once per 15s per instance; never throws. */
  async sweepIfStale() {
    if (Date.now() - lastRun < 15_000) return;
    lastRun = Date.now();
    try {
      await maintenanceService.sweep();
    } catch (e) {
      console.error("[maintenance] sweep failed", e);
    }
  },
};
