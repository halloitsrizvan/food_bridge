import type { Profile } from "@prisma/client";
import type { ChatInbox, ChatThreadSummary, ChatThreadView } from "@/lib/schemas/message";
import { AppError } from "../lib/errors";
import { claimRepository, type ClaimFull } from "../repositories/claim.repository";
import { messageRepository } from "../repositories/message.repository";
import { notificationService } from "./notification.service";

const WRITABLE = ["PENDING", "ACCEPTED"];

/** Only the giver and the receiver of the claim may touch its chat (404 for everyone else, even government). */
async function party(user: Profile, claimId: string): Promise<ClaimFull> {
  const c = await claimRepository.findFull(claimId);
  if (!c || (c.giverId !== user.id && c.takerId !== user.id)) throw AppError.notFound("Chat not found");
  return c;
}

const other = (c: ClaimFull, me: Profile) => (c.giverId === me.id ? { name: c.taker.name, role: "TAKER" as const, id: c.takerId } : { name: c.giver.name, role: "GIVER" as const, id: c.giverId });

export const messageService = {
  async thread(user: Profile, claimId: string): Promise<ChatThreadView> {
    const c = await party(user, claimId);
    const rows = await messageRepository.listForClaim(claimId);
    // Opening the conversation counts as reading it.
    await messageRepository.markRead(claimId, user.id);
    const o = other(c, user);
    return {
      claimId,
      claimStatus: c.status,
      writable: WRITABLE.includes(c.status),
      offerTitle: c.offer.title,
      otherName: o.name,
      otherRole: o.role,
      messages: rows.map((m) => ({ id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), mine: m.senderId === user.id, read: m.readAt != null })),
    };
  },

  async send(user: Profile, claimId: string, body: string) {
    const c = await party(user, claimId);
    if (!WRITABLE.includes(c.status)) throw AppError.conflict("This handover is closed, so messages can no longer be sent");
    // One alert per burst: only notify if the other side has not yet read an earlier message from me.
    const alreadyAlerted = (await messageRepository.unreadFromSender(claimId, user.id)) > 0;
    const m = await messageRepository.create(claimId, user.id, body);
    if (!alreadyAlerted) {
      const o = other(c, user);
      await notificationService.notify({
        userId: o.id,
        type: "chat",
        title: `New message from ${user.name}`,
        body: body.length > 90 ? `${body.slice(0, 87)}...` : body,
        link: `/dashboard/chats/${claimId}`,
      });
    }
    return { id: m.id, body: m.body, createdAt: m.createdAt.toISOString(), mine: true, read: false };
  },

  async inbox(user: Profile): Promise<ChatInbox> {
    const claims = await claimRepository.listForUser(user.id);
    const ids = claims.map((c) => c.id);
    const [latest, unread] = await Promise.all([messageRepository.latestForClaims(ids), messageRepository.unreadByClaim(ids, user.id)]);
    const threads: ChatThreadSummary[] = claims
      // Show live handovers (so a chat can be started) and anything that already has messages.
      .filter((c) => WRITABLE.includes(c.status) || latest.has(c.id))
      .map((c) => {
        const last = latest.get(c.id);
        const o = other(c, user);
        return {
          claimId: c.id,
          claimStatus: c.status,
          offerTitle: c.offer.title,
          otherName: o.name,
          otherRole: o.role,
          lastMessage: last?.body ?? null,
          lastMine: last?.senderId === user.id,
          lastAt: (last?.createdAt ?? c.createdAt).toISOString(),
          unread: unread.get(c.id) ?? 0,
        };
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    return { threads, totalUnread: threads.reduce((n, t) => n + t.unread, 0) };
  },
};
