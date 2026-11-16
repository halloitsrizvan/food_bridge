import { trustRepository } from "../repositories/trust.repository";
import { profileRepository } from "../repositories/profile.repository";

export type NotifyInput = { userId: string; type: string; title: string; body: string; link?: string };

/** Optional email through Resend's REST API. Silent no-op without RESEND_API_KEY. */
async function sendEmail(to: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "FoodBridge <onboarding@resend.dev>",
        // MAIL_REDIRECT_TO routes every mail to one inbox (Resend sandbox / demo safety).
        to: [process.env.MAIL_REDIRECT_TO || to],
        subject,
        text,
      }),
    });
  } catch (e) {
    console.error("[email] failed", e instanceof Error ? e.message : "unknown");
  }
}

export const notificationService = {
  /** In-app notification (always) + email (only if configured). Never throws. */
  async notifyMany(items: NotifyInput[], opts: { email?: boolean } = {}) {
    if (!items.length) return;
    try {
      await trustRepository.createNotifications(items.map((i) => ({ ...i, link: i.link ?? "" })));
    } catch (e) {
      console.error("[notify] db failed", e);
      return;
    }
    if (opts.email && process.env.RESEND_API_KEY) {
      const profiles = await profileRepository.findManyByIds(items.map((i) => i.userId));
      const byId = new Map(profiles.map((p) => [p.id, p.email]));
      await Promise.all(
        items.slice(0, 25).map((i) => {
          const to = byId.get(i.userId);
          return to ? sendEmail(to, i.title, `${i.body}\n\n${process.env.NEXT_PUBLIC_APP_URL ?? ""}${i.link ?? ""}`) : null;
        }),
      );
    }
  },

  notify: (item: NotifyInput, opts: { email?: boolean } = {}) => notificationService.notifyMany([item], opts),

  async notifyGov(type: string, title: string, body: string, link = "/gov") {
    const gov = await profileRepository.listGov();
    return notificationService.notifyMany(gov.map((g) => ({ userId: g.id, type, title, body, link })));
  },

  list: async (userId: string) => {
    const [items, unread] = await Promise.all([trustRepository.listNotifications(userId), trustRepository.unreadCount(userId)]);
    return {
      unread,
      items: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() })),
    };
  },

  markRead: (userId: string, ids?: string[]) => trustRepository.markRead(userId, ids),
};
