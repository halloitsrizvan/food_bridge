import { trustRepository } from "../repositories/trust.repository";
import { profileRepository } from "../repositories/profile.repository";

export type NotifyInput = { userId: string; type: string; title: string; body: string; link?: string };

type ResendError = { message?: string; name?: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);
}

function notificationUrl(link?: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return base && link ? `${base}${link.startsWith("/") ? link : `/${link}`}` : base ?? "";
}

function emailHtml(title: string, body: string, url: string) {
  const action = url
    ? `<a href="${escapeHtml(url)}" style="display:inline-block;margin-top:24px;padding:12px 20px;border-radius:10px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700">Open FoodBridge</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f7f6;font-family:Arial,sans-serif;color:#17312d"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(body)}</div><div style="padding:32px 16px"><div style="max-width:560px;margin:0 auto;overflow:hidden;border:1px solid #dbe5e2;border-radius:18px;background:#ffffff"><div style="padding:22px 28px;background:#0f766e;color:#ffffff;font-size:20px;font-weight:800">FoodBridge</div><div style="padding:30px 28px"><h1 style="margin:0 0 14px;font-size:24px;line-height:1.25">${escapeHtml(title)}</h1><p style="margin:0;color:#49645f;font-size:16px;line-height:1.65">${escapeHtml(body)}</p>${action}</div><div style="padding:18px 28px;border-top:1px solid #e7eeec;color:#718681;font-size:12px;line-height:1.5">This is an automated FoodBridge notification. You can also view alerts in your dashboard.</div></div></div></body></html>`;
}

/** Optional transactional email through Resend. Notification persistence never depends on delivery. */
async function sendEmail(to: string, subject: string, body: string, link?: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;
  try {
    const url = notificationUrl(link);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM ?? "FoodBridge <onboarding@resend.dev>",
        // MAIL_REDIRECT_TO routes every mail to one inbox (Resend sandbox / demo safety).
        to: [process.env.MAIL_REDIRECT_TO || to],
        subject,
        text: `${body}${url ? `\n\nOpen FoodBridge: ${url}` : ""}`,
        html: emailHtml(subject, body, url),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as ResendError;
      console.error("[email] Resend rejected message", response.status, error.name ?? "unknown", error.message ?? "No details");
    }
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
          return to ? sendEmail(to, i.title, i.body, i.link) : null;
        }),
      );
    }
  },

  notify: (item: NotifyInput, opts: { email?: boolean } = {}) => notificationService.notifyMany([item], opts),

  async notifyGov(type: string, title: string, body: string, link = "/gov") {
    const gov = await profileRepository.listGov();
    return notificationService.notifyMany(gov.map((g) => ({ userId: g.id, type, title, body, link })), { email: true });
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
