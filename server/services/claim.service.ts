import { Prisma, type Profile } from "@prisma/client";
import type { ClaimView, Party } from "@/lib/schemas/claim";
import { AppError } from "../lib/errors";
import { prisma } from "../lib/prisma";
import { approx } from "../logic/geo";
import { dietCompatible, feasibility, modeCompatible } from "../logic/match";
import { deriveOtp, hashOtp, newSalt, verifyOtp } from "../logic/otp";
import { giverPoints } from "../logic/points";
import { effectiveExpiry } from "../logic/time";
import { claimRepository, type ClaimFull } from "../repositories/claim.repository";
import { offerRepository } from "../repositories/offer.repository";
import { needRepository } from "../repositories/need.repository";
import { trustRepository } from "../repositories/trust.repository";
import { configService } from "./config.service";
import { matchService } from "./match.service";
import { maintenanceService } from "./maintenance.service";
import { notificationService } from "./notification.service";
import { trustService } from "./trust.service";

const otpSecret = () => process.env.OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev-only-secret";

function party(p: Profile, revealed: boolean): Party {
  return {
    id: p.id,
    name: p.name,
    kind: p.giverKind ?? p.takerKind,
    area: p.area,
    trustScore: p.trustScore,
    members: p.members,
    lat: revealed ? p.lat : approx(p.lat),
    lng: revealed ? p.lng : approx(p.lng),
    ...(revealed && { address: p.address, phone: p.phone, mapsUrl: p.mapsUrl }),
  };
}

/** Build the view for one viewer. Exact address / phone only for the two parties after ACCEPTED. */
export async function buildClaimView(c: ClaimFull, viewer: Profile): Promise<ClaimView> {
  const isGov = viewer.role === "GOV";
  const isGiver = c.giverId === viewer.id;
  const isTaker = c.takerId === viewer.id;
  const revealed = ["ACCEPTED", "COMPLETED"].includes(c.status) && (isGiver || isTaker || isGov);
  const responder = c.initiatedBy === "TAKER" ? "GIVER" : "TAKER";
  const viewerRole = isGov ? "GOV" : isGiver ? "GIVER" : "TAKER";
  const mine = viewerRole === responder;
  const now = new Date();

  let distanceKm: number | null = null;
  let etaMin: number | null = null;
  if (c.giver.lat != null && c.giver.lng != null && c.taker.lat != null && c.taker.lng != null) {
    const cfg = await configService.get();
    const f = feasibility({ lat: c.giver.lat, lng: c.giver.lng }, { lat: c.taker.lat, lng: c.taker.lng }, effectiveExpiry(c.offer), cfg);
    distanceKm = Math.round(f.distanceKm * 10) / 10;
    etaMin = Math.round(f.travelMin);
  }

  const [review, complaint, ledger] = await Promise.all([
    trustRepository.findReview(c.id, viewer.id),
    trustRepository.findComplaint(c.id, viewer.id),
    c.status === "COMPLETED" ? prisma.pointLedger.findMany({ where: { claimId: c.id, accountId: viewer.id } }) : Promise.resolve([]),
  ]);

  const otp =
    isGiver && c.status === "ACCEPTED" && c.otpSalt && c.otpExpiresAt && c.otpExpiresAt > now ? deriveOtp(otpSecret(), c.id, c.otpSalt) : null;

  return {
    id: c.id,
    status: c.status,
    initiatedBy: c.initiatedBy,
    viewerRole,
    createdAt: c.createdAt.toISOString(),
    holdUntil: c.holdUntil.toISOString(),
    acceptedAt: c.acceptedAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
    mealsDelivered: c.mealsDelivered,
    revealed,
    offer: {
      id: c.offer.id,
      title: c.offer.title,
      description: c.offer.description,
      category: c.offer.category,
      diet: c.offer.diet,
      quantityMeals: c.offer.quantityMeals,
      mode: c.offer.mode,
      status: c.offer.status,
      expiresAt: effectiveExpiry(c.offer).toISOString(),
      photoUrl: c.offer.photoUrl,
    },
    need: c.need ? { id: c.need.id, title: c.need.title, mealsNeeded: c.need.mealsNeeded } : null,
    giver: party(c.giver, revealed),
    taker: party(c.taker, revealed),
    otp,
    otpExpiresAt: otp ? c.otpExpiresAt!.toISOString() : null,
    match: (c.scoreSnapshot as ClaimView["match"]) ?? null,
    distanceKm,
    etaMin,
    can: {
      accept: c.status === "PENDING" && mine && c.holdUntil > now,
      decline: c.status === "PENDING" && mine && c.holdUntil > now,
      handover: c.status === "ACCEPTED" && isTaker && (c.otpExpiresAt ?? now) > now,
      review: c.status === "COMPLETED" && (isGiver || isTaker) && !review,
      complain: ["ACCEPTED", "COMPLETED", "EXPIRED"].includes(c.status) && (isGiver || isTaker) && !complaint,
    },
    reviewed: !!review,
    complained: !!complaint,
    pointsEarned: c.status === "COMPLETED" ? ledger.reduce((s, l) => s + l.delta, 0) : null,
  };
}

async function loadParty(user: Profile, id: string) {
  const c = await claimRepository.findFull(id);
  if (!c || (c.giverId !== user.id && c.takerId !== user.id && user.role !== "GOV")) throw AppError.notFound("Claim not found");
  return c;
}

const isUniqueViolation = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Shared creation path: row-locks the offer so exactly one concurrent claim can win. */
async function createClaim(args: { offerId: string; needId?: string; initiator: Profile; side: "TAKER" | "GIVER" }) {
  const cfg = await configService.get();
  const offer0 = await offerRepository.findById(args.offerId);
  if (!offer0) throw AppError.notFound("Post not found");
  const need = args.needId ? await needRepository.findById(args.needId) : null;
  if (args.needId && !need) throw AppError.notFound("Need not found");

  const taker = args.side === "TAKER" ? args.initiator : need?.taker;
  if (!taker) throw AppError.badRequest("A need is required to offer food");
  const giver = offer0.giver;
  if (args.side === "TAKER" && need && need.takerId !== taker.id) throw AppError.forbidden();
  if (args.side === "GIVER" && offer0.giverId !== args.initiator.id) throw AppError.forbidden();
  if (taker.role !== "TAKER" || giver.role !== "GIVER") throw AppError.badRequest("Invalid parties");
  if (taker.status !== "ACTIVE" || giver.status !== "ACTIVE") throw AppError.conflict("This account is not currently active");
  if (taker.lat == null || taker.lng == null || giver.lat == null || giver.lng == null) throw AppError.onboardingRequired();
  if (need && !dietCompatible(offer0.diet, need.diet)) throw AppError.badRequest("Diet does not match the need");
  if (need && !modeCompatible(offer0.mode, need.mode)) throw AppError.badRequest("Handover preference does not match");

  const eff = effectiveExpiry(offer0);
  const f = feasibility({ lat: giver.lat, lng: giver.lng }, { lat: taker.lat, lng: taker.lng }, eff, cfg);
  if (!f.feasible) throw AppError.badRequest("The food would spoil before it can be handed over");
  const snapshot = await matchService.scoreFor(offer0, taker, need?.mealsNeeded, need?.diet);

  try {
    const claim = await prisma.$transaction(async (tx) => {
      await offerRepository.lock(tx, args.offerId);
      const offer = await offerRepository.findById(args.offerId, tx);
      if (!offer || offer.status !== "OPEN") throw AppError.conflict("Already contacted by someone else");
      if (effectiveExpiry(offer) <= new Date()) throw AppError.conflict("This food has expired");
      if (offer.scheduledFor && offer.scheduledFor > new Date()) throw AppError.conflict("This post is not open yet");
      if (await claimRepository.activeForOffer(tx, args.offerId)) throw AppError.conflict("Already contacted by someone else");
      if (need) {
        await tx.$queryRaw`SELECT id FROM needs WHERE id = ${need.id}::uuid FOR UPDATE`;
        const n = await needRepository.findById(need.id, tx);
        if (!n || n.status !== "OPEN") throw AppError.conflict("This need is no longer open");
      }
      const created = await claimRepository.create(tx, {
        offerId: offer.id,
        needId: need?.id,
        takerId: taker.id,
        giverId: giver.id,
        initiatedBy: args.side,
        holdUntil: new Date(Date.now() + cfg.holdMinutes * 60_000),
        scoreSnapshot: snapshot ? (snapshot as unknown as Prisma.InputJsonValue) : undefined,
      });
      await offerRepository.update(offer.id, { status: "CONTACTED" }, tx);
      if (need) await needRepository.update(need.id, { status: "CONTACTED" }, tx);
      return created;
    });

    const responderId = args.side === "TAKER" ? giver.id : taker.id;
    await notificationService.notify(
      {
        userId: responderId,
        type: "CLAIM_CREATED",
        title: args.side === "TAKER" ? `${taker.name} wants your food` : `${giver.name} can give you food`,
        body: `${offer0.title} (${offer0.quantityMeals} meals). Respond within ${cfg.holdMinutes} minutes.`,
        link: `/dashboard/claims/${claim.id}`,
      },
      { email: true },
    );
    return { id: claim.id };
  } catch (e) {
    if (isUniqueViolation(e)) throw AppError.conflict("Already contacted by someone else");
    throw e;
  }
}

export const claimService = {
  /** Taker contacts a giver's post. */
  createFromTaker: (taker: Profile, offerId: string, needId?: string) => {
    if (taker.role !== "TAKER") throw AppError.forbidden("Only receivers can claim food");
    return createClaim({ offerId, needId, initiator: taker, side: "TAKER" });
  },

  /** Giver offers one of their posts to an existing need. */
  createFromGiver: (giver: Profile, needId: string, offerId: string) => {
    if (giver.role !== "GIVER") throw AppError.forbidden("Only givers can contact needs");
    return createClaim({ offerId, needId, initiator: giver, side: "GIVER" });
  },

  async get(user: Profile, id: string) {
    await maintenanceService.sweepIfStale();
    return buildClaimView(await loadParty(user, id), user);
  },

  async listMine(user: Profile) {
    await maintenanceService.sweepIfStale();
    const rows = await claimRepository.listForUser(user.id);
    return Promise.all(rows.map((c) => buildClaimView(c, user)));
  },

  /** The OTHER side of whoever created the claim accepts; generates the handover OTP. */
  async accept(user: Profile, id: string) {
    const cfg = await configService.get();
    const result = await prisma.$transaction(async (tx) => {
      await claimRepository.lock(tx, id);
      const c = await claimRepository.findFull(id, tx);
      if (!c || (c.giverId !== user.id && c.takerId !== user.id)) throw AppError.notFound("Claim not found");
      const responderId = c.initiatedBy === "TAKER" ? c.giverId : c.takerId;
      if (responderId !== user.id) throw AppError.forbidden("The other side has to accept");
      if (c.status !== "PENDING") throw AppError.conflict("This request is no longer pending");
      if (c.holdUntil <= new Date()) throw AppError.conflict("The hold on this request expired");
      const eff = effectiveExpiry(c.offer);
      if (eff <= new Date()) throw AppError.conflict("This food has expired");
      const salt = newSalt();
      const otp = deriveOtp(otpSecret(), c.id, salt);
      await claimRepository.update(tx, id, { status: "ACCEPTED", acceptedAt: new Date(), otpSalt: salt, otpHash: hashOtp(otp), otpExpiresAt: eff });
      await offerRepository.update(c.offerId, { status: "SETTLED" }, tx);
      if (c.needId) await needRepository.update(c.needId, { status: "SETTLED" }, tx);
      return c;
    });
    const initiatorId = result.initiatedBy === "TAKER" ? result.takerId : result.giverId;
    await notificationService.notify(
      { userId: initiatorId, type: "CLAIM_ACCEPTED", title: "Accepted!", body: `${result.offer.title}: exact address and contact are now visible.`, link: `/dashboard/claims/${id}` },
      { email: true },
    );
    void cfg;
    return buildClaimView((await claimRepository.findFull(id))!, user);
  },

  async decline(user: Profile, id: string) {
    const c = await prisma.$transaction(async (tx) => {
      await claimRepository.lock(tx, id);
      const row = await claimRepository.findFull(id, tx);
      if (!row || (row.giverId !== user.id && row.takerId !== user.id)) throw AppError.notFound("Claim not found");
      const responderId = row.initiatedBy === "TAKER" ? row.giverId : row.takerId;
      if (responderId !== user.id) throw AppError.forbidden("Only the other side can decline");
      if (row.status !== "PENDING") throw AppError.conflict("This request is no longer pending");
      await claimRepository.update(tx, id, { status: "DECLINED" });
      await offerRepository.update(row.offerId, { status: "OPEN" }, tx);
      if (row.needId) await needRepository.update(row.needId, { status: "OPEN" }, tx);
      return row;
    });
    const initiatorId = c.initiatedBy === "TAKER" ? c.takerId : c.giverId;
    await notificationService.notify({ userId: initiatorId, type: "CLAIM_DECLINED", title: "Request declined", body: `${c.offer.title} is open again. Try another match.`, link: `/dashboard/claims/${id}` });
    return buildClaimView((await claimRepository.findFull(id))!, user);
  },

  /** Taker enters the giver's OTP at pickup / delivery. Completes the claim and awards points. */
  async handover(user: Profile, id: string, input: { otp: string; photoUrl?: string }) {
    const cfg = await configService.get();
    const done = await prisma.$transaction(async (tx) => {
      await claimRepository.lock(tx, id);
      const c = await claimRepository.findFull(id, tx);
      if (!c || c.takerId !== user.id) throw AppError.notFound("Claim not found");
      if (c.status !== "ACCEPTED" || !c.otpHash || !c.otpExpiresAt) throw AppError.conflict("This claim is not ready for handover");
      if (c.otpExpiresAt <= new Date()) throw AppError.conflict("The code expired with the food");
      if (!verifyOtp(input.otp, c.otpHash)) throw AppError.badRequest("That code is not correct");

      const now = new Date();
      const meals = c.offer.quantityMeals;
      const minutes = c.acceptedAt ? (now.getTime() - c.acceptedAt.getTime()) / 60_000 : 999;
      const giverPts = giverPoints(meals, minutes, cfg);
      const takerPts = cfg.points.takerConfirm;

      await claimRepository.update(tx, id, { status: "COMPLETED", completedAt: now, mealsDelivered: meals, handoverPhoto: input.photoUrl });
      await offerRepository.update(c.offerId, { status: "DELIVERED" }, tx);
      if (c.needId) await needRepository.update(c.needId, { status: "FULFILLED" }, tx);

      for (const [accountId, delta] of [[c.giverId, giverPts], [c.takerId, takerPts]] as const) {
        await trustRepository.addLedger(tx, { accountId, claimId: id, delta, reason: "HANDOVER" });
        await tx.profile.update({ where: { id: accountId }, data: { points: { increment: delta } } });
      }
      return { c, giverPts, takerPts, meals };
    });

    await Promise.all([trustService.recompute(done.c.giverId), trustService.recompute(done.c.takerId)]);
    await notificationService.notifyMany(
      [
        { userId: done.c.giverId, type: "HANDOVER_DONE", title: `+${done.giverPts} points`, body: `${done.meals} meals delivered from ${done.c.offer.title}. Your certificate is ready.`, link: `/dashboard/claims/${id}` },
        { userId: done.c.takerId, type: "HANDOVER_DONE", title: "Handover confirmed", body: `Thanks for confirming. Please rate ${done.c.giver.name}.`, link: `/dashboard/claims/${id}` },
      ],
      { email: true },
    );
    return { claim: await buildClaimView((await claimRepository.findFull(id))!, user), pointsAwarded: done.takerPts };
  },
};
