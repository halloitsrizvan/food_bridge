import { impactService } from "../services/impact.service";
import { needService } from "../services/need.service";
import { offerService } from "../services/offer.service";
import type { RagDoc } from "./types";

// Only data the public feed already shows: area (never the exact address), no phone numbers or emails.
const DIET = { VEG: "vegetarian", NON_VEG: "non-vegetarian", BOTH: "vegetarian and non-vegetarian" } as const;
const CATEGORY = { COOKED: "cooked food", PACKAGED: "packaged food", RAW: "raw ingredients" } as const;
const MODE = { GIVER_DELIVERS: "giver will deliver", TAKER_PICKS_UP: "receiver picks up", EITHER: "pickup or delivery" } as const;
const KIND = { RESTAURANT: "restaurant", CATERER: "caterer", HOUSEHOLD: "household", EVENT: "event host", INSTITUTION: "institution", CHARITY: "charity", HOUSE: "family" } as const;

const IST = "Asia/Kolkata";
const clock = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: IST, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

function left(iso: string, now: number) {
  const min = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (min <= 0) return "expired";
  if (min < 90) return `${min} minutes left`;
  return `${Math.floor(min / 60)} h ${min % 60} min left`;
}

let cache: { at: number; docs: RagDoc[] } | null = null;
const TTL_MS = 20_000; // the feed itself refreshes every 15-20 s; this also protects the database

/** Live database facts as retrievable documents: open posts, open needs, impact totals, leaderboard. */
export async function liveDocs(): Promise<RagDoc[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.docs;
  const now = Date.now();
  const [offers, needs, impact, board] = await Promise.all([
    offerService.listPublic({ sort: "soonest" }, 1, 80),
    needService.listPublic({ sort: "soonest" }, 1, 40),
    impactService.get(),
    impactService.leaderboard(),
  ]);

  const docs: RagDoc[] = [];

  for (const o of offers.items) {
    const upcoming = o.scheduledFor && new Date(o.scheduledFor).getTime() > now;
    docs.push({
      id: `offer:${o.id}`,
      kind: "offer",
      label: `Live post: ${o.title} · ${o.area}`,
      href: `/dashboard/offers/${o.id}`,
      keywords: `${o.title} ${o.area} ${o.giverName} live food available now`,
      text:
        `Live food post "${o.title}" by ${o.giverName}${o.giverKind ? ` (${KIND[o.giverKind as keyof typeof KIND] ?? o.giverKind})` : ""} in ${o.area}. ` +
        `${o.quantityMeals} meals, ${CATEGORY[o.category]}, ${DIET[o.diet]}, ${MODE[o.mode]}. ` +
        `${upcoming ? `Available from ${clock(o.scheduledFor!)}. ` : ""}Safe to hand over until ${clock(o.expiresAt)} (${left(o.expiresAt, now)}). ` +
        `Giver trust score ${o.giverTrust}/100.${o.description ? ` Description: ${o.description}` : ""}`,
    });
  }

  for (const n of needs.items) {
    docs.push({
      id: `need:${n.id}`,
      kind: "need",
      label: `Request: ${n.title} · ${n.area}`,
      keywords: `${n.title} ${n.area} ${n.takerName} request need receiver asking`,
      text:
        `Open request "${n.title}" from ${n.takerName}${n.takerKind ? ` (${KIND[n.takerKind as keyof typeof KIND] ?? n.takerKind})` : ""} in ${n.area}. ` +
        `Needs ${n.mealsNeeded} meals, ${DIET[n.diet]}, ${MODE[n.mode]}, needed by ${clock(n.neededBy)} (${left(n.neededBy, now)}).${n.members ? ` Serves ${n.members} people.` : ""}`,
    });
  }

  docs.push({
    id: "stats:impact",
    kind: "stats",
    label: "Live platform impact",
    href: "/",
    keywords: "impact statistics total how many meals saved kg co2 handovers active posts average match time numbers",
    text:
      `Platform totals right now: ${impact.meals} meals delivered, ${impact.kg} kg of food saved, ${impact.co2Kg} kg CO2 avoided, ${impact.handovers} completed handovers, ` +
      `${impact.activePosts} live posts available now` +
      `${impact.avgMatchMinutes != null ? `, average ${impact.avgMatchMinutes} minutes from post to match` : ""}.`,
  });

  if (board.length) {
    docs.push({
      id: "stats:leaderboard",
      kind: "stats",
      label: "Top givers leaderboard",
      keywords: "leaderboard top givers best ranking rank points most meals donated",
      text: "Top givers: " + board.slice(0, 10).map((g) => `#${g.rank} ${g.name} (${g.area}) ${g.points} points, ${g.meals} meals`).join("; ") + ".",
    });
  }

  // Overview of what is listed now, so "what food is available?" has a direct answer.
  docs.push({
    id: "stats:feed",
    kind: "stats",
    label: "Food available now",
    href: "/#live",
    keywords: "available now what food list live today currently listed browse areas",
    text:
      offers.total === 0
        ? "There are no live food posts right now."
        : `There are ${offers.total} live food posts. Soonest to expire: ` +
          offers.items
            .slice(0, 6)
            .map((o) => `${o.title} in ${o.area} (${o.quantityMeals} meals, ${left(o.expiresAt, now)})`)
            .join("; ") +
          ". Areas with food: " +
          [...new Set(offers.items.map((o) => o.area))].join(", ") +
          ".",
  });

  cache = { at: Date.now(), docs };
  return docs;
}
