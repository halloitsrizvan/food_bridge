import type { Profile } from "@prisma/client";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { reviewBonus } from "../logic/points";
import { complaintWeight, shouldSuspend, trustScore } from "../logic/trust";
import { claimRepository } from "../repositories/claim.repository";
import { profileRepository } from "../repositories/profile.repository";
import { trustRepository } from "../repositories/trust.repository";
import { configService } from "./config.service";
import { notificationService } from "./notification.service";

/** Reviews became mandatory on this date; older handovers are never blocked. */
const REVIEW_REQUIRED_FROM = new Date("2026-11-16T00:00:00Z");

async function partyClaim(user: Profile, claimId: string) {
  const claim = await claimRepository.findFull(claimId);
  if (!claim || (claim.giverId !== user.id && claim.takerId !== user.id)) throw AppError.notFound("Claim not found");
  const otherId = claim.giverId === user.id ? claim.takerId : claim.giverId;
  return { claim, otherId };
}

export const trustService = {
  /** The oldest completed handover (since the rule started) this user has not rated yet. */
  async pendingReview(userId: string) {
    const c = await prisma.claim.findFirst({
      where: {
        status: "COMPLETED",
        completedAt: { gte: REVIEW_REQUIRED_FROM },
        takerId: userId, // only receivers review (givers are rated, receivers are not)
        reviews: { none: { fromId: userId } },
      },
      orderBy: { completedAt: "asc" },
      include: { offer: { select: { title: true } }, giver: { select: { id: true, name: true } }, taker: { select: { id: true, name: true } } },
    });
    if (!c) return null;
    return { claimId: c.id, title: c.offer.title, otherName: c.giver.name, role: "TAKER" as const };
  },

  /** Mandatory reviews: no new posts, requests or acceptances until the last handover is rated. */
  async assertNoPendingReview(userId: string) {
    const p = await trustService.pendingReview(userId);
    if (p) throw AppError.reviewRequired(p.claimId);
  },

  /** Recompute and store an account's trust score from completions, ratings and recent complaints. */
  async recompute(userId: string) {
    const cfg = await configService.get();
    const since = new Date(Date.now() - cfg.suspension.windowDays * 86_400_000);
    const [counts, ratings, complaints] = await Promise.all([
      claimRepository.trustCounts(userId),
      trustRepository.ratingStats(userId),
      trustRepository.recentComplaints(userId, since),
    ]);
    const score = trustScore({
      completed: counts.completed,
      failed: counts.failed,
      avgRating: ratings.avgRating,
      reviewCount: ratings.reviewCount,
      recentWeightedComplaints: complaints.reduce((s, c) => s + c.weight, 0),
    });
    await profileRepository.update(userId, { trustScore: score });
    return score;
  },

  async review(user: Profile, claimId: string, input: { rating: number; comment: string }) {
    if (user.role !== "TAKER") throw AppError.forbidden("Only receivers rate givers");
    const { claim, otherId } = await partyClaim(user, claimId);
    if (claim.status !== "COMPLETED") throw AppError.conflict("You can review after the handover");
    if (await trustRepository.findReview(claimId, user.id)) throw AppError.conflict("You already reviewed this handover");
    await trustRepository.createReview({ claimId, fromId: user.id, toId: otherId, rating: input.rating, comment: input.comment });

    // Review bonus = second ledger row on the reviewed account: base * (0.8 + 0.1*rating) - base
    const base = await prisma.pointLedger.findFirst({ where: { claimId, accountId: otherId, reason: "HANDOVER" } });
    if (base) {
      const bonus = reviewBonus(base.delta, input.rating);
      if (bonus !== 0) {
        await prisma.$transaction(async (tx) => {
          await trustRepository.addLedger(tx, { accountId: otherId, claimId, delta: bonus, reason: "REVIEW_BONUS" });
          const p = await tx.profile.update({ where: { id: otherId }, data: { points: { increment: bonus } } });
          const pts = Math.max(0, p.points);
          await tx.profile.update({ where: { id: otherId }, data: { points: pts } });
        });
      }
    }
    await trustService.recompute(otherId);
    await notificationService.notify({ userId: otherId, type: "REVIEWED", title: `You got ${input.rating}★`, body: input.comment || "Thanks for sharing food.", link: `/dashboard/claims/${claimId}` });
    return { ok: true };
  },

  async complain(user: Profile, claimId: string, reason: string) {
    if (user.role !== "TAKER") throw AppError.forbidden("Only receivers can file complaints");
    const { claim, otherId } = await partyClaim(user, claimId);
    if (await trustRepository.findComplaint(claimId, user.id)) throw AppError.conflict("You already filed a complaint for this claim");
    const cfg = await configService.get();
    const weight = complaintWeight(user.trustScore);
    await trustRepository.createComplaint({ claimId: claim.id, fromId: user.id, againstId: otherId, reason, weight });
    await trustService.recompute(otherId);

    const since = new Date(Date.now() - cfg.suspension.windowDays * 86_400_000);
    const recent = await trustRepository.recentComplaints(otherId, since);
    const against = await profileRepository.findById(otherId);
    let suspended = false;
    if (against && against.role !== "GOV" && against.status === "ACTIVE" && shouldSuspend(recent, cfg)) {
      await profileRepository.update(otherId, { status: "SUSPENDED" });
      suspended = true;
      await notificationService.notify({ userId: otherId, type: "SUSPENDED", title: "Account suspended", body: "Several complaints were filed against your account. Your posts are hidden. You can submit an appeal.", link: "/dashboard" }, { email: true });
      await notificationService.notifyGov("GOV_SUSPENSION", "Account auto-suspended", `${against.name} crossed the complaint threshold.`, "/gov/complaints");
    }
    return { ok: true, suspended };
  },

  async appeal(user: Profile, message: string) {
    if (user.status !== "SUSPENDED") throw AppError.conflict("Only suspended accounts can appeal");
    if (await trustRepository.openAppealFor(user.id)) throw AppError.conflict("You already have an appeal under review");
    await trustRepository.createAppeal({ accountId: user.id, message });
    await profileRepository.update(user.id, { status: "APPEALING" });
    await notificationService.notifyGov("GOV_APPEAL", "New appeal", `${user.name} submitted an appeal.`, "/gov/appeals");
    return { ok: true };
  },

  async decideAppeal(gov: Profile, appealId: string, decision: "APPROVED" | "REJECTED") {
    const appeal = await trustRepository.findAppeal(appealId);
    if (!appeal) throw AppError.notFound("Appeal not found");
    if (appeal.status !== "OPEN") throw AppError.conflict("Already decided");
    await trustRepository.updateAppeal(appealId, { status: decision, decidedBy: gov.id, decidedAt: new Date() });
    if (decision === "APPROVED") {
      const cfg = await configService.get();
      await trustRepository.zeroRecentComplaints(appeal.accountId, new Date(Date.now() - cfg.suspension.windowDays * 86_400_000));
      await profileRepository.update(appeal.accountId, { status: "ACTIVE" });
      await trustService.recompute(appeal.accountId);
    } else {
      await profileRepository.update(appeal.accountId, { status: "SUSPENDED" });
    }
    await notificationService.notify(
      {
        userId: appeal.accountId,
        type: "APPEAL_DECISION",
        title: decision === "APPROVED" ? "Appeal approved" : "Appeal rejected",
        body: decision === "APPROVED" ? "Your account is active again." : "Your account stays suspended.",
        link: "/dashboard",
      },
      { email: true },
    );
    return { id: appealId, status: decision };
  },

  /** Gov suspend / reactivate by hand. */
  async setStatus(gov: Profile, userId: string, status: "ACTIVE" | "SUSPENDED") {
    const target = await profileRepository.findById(userId);
    if (!target) throw AppError.notFound("User not found");
    if (target.role === "GOV") throw AppError.forbidden("Government accounts cannot be suspended here");
    await profileRepository.update(userId, { status });
    await notificationService.notify({
      userId,
      type: status === "ACTIVE" ? "REACTIVATED" : "SUSPENDED",
      title: status === "ACTIVE" ? "Account reactivated" : "Account suspended",
      body: status === "ACTIVE" ? "You can post and claim again." : "A government reviewer suspended your account.",
      link: "/dashboard",
    });
    return { id: userId, status, by: gov.id };
  },
};
