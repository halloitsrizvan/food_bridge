// Small in-process BM25 ranker. The corpus is tiny (a few hundred short documents), so there is no
// vector store: keyword retrieval with light stemming and synonyms is fast and needs no extra service.

const STOP = new Set(
  "a an and are as at be but by can do does for from has have how i if in into is it its me my of on or our so that the their them there these they this to up us was we what when where which who why will with you your please tell about get need want available now currently today right any some there".split(" "),
);

// Query words that should also match their usual document wording.
const SYNONYMS: Record<string, string[]> = {
  donate: ["give", "post", "share", "giver", "offer"],
  donation: ["give", "post", "share", "offer"],
  give: ["donate", "post", "share", "giver"],
  share: ["post", "give", "donate"],
  surplus: ["leftover", "extra", "food"],
  leftover: ["surplus", "food"],
  request: ["claim", "need", "receive", "taker"],
  receive: ["claim", "request", "taker"],
  claim: ["request", "reserve", "reservation"],
  reserve: ["reservation", "claim", "hold"],
  collect: ["pickup", "handover"],
  pickup: ["collect", "handover"],
  deliver: ["delivery", "mode"],
  otp: ["code", "handover", "verify"],
  code: ["otp", "handover"],
  handover: ["otp", "pickup", "complete", "complete"],
  safe: ["safety", "spoil", "hours", "expire"],
  safety: ["safe", "spoil", "hours"],
  spoil: ["safe", "expire", "hours"],
  expire: ["expiry", "safe", "left", "time"],
  expiring: ["expire", "soon", "left", "time"],
  free: ["fee", "cost", "price"],
  cost: ["free", "fee", "price"],
  price: ["free", "fee", "cost"],
  complaint: ["report", "suspend", "suspension", "appeal"],
  report: ["complaint", "problem"],
  suspend: ["suspension", "complaint", "appeal"],
  appeal: ["suspend", "suspension", "complaint"],
  points: ["point", "reward", "score", "leaderboard"],
  reward: ["points", "certificate"],
  certificate: ["qr", "verify", "verification"],
  address: ["location", "privacy", "area"],
  privacy: ["address", "contact", "location"],
  veg: ["vegetarian"],
  vegetarian: ["veg"],
  nonveg: ["non", "meat", "chicken", "fish"],
  chicken: ["nonveg", "meat"],
  meals: ["meal", "plates", "quantity"],
  offline: ["pwa", "install", "app"],
  install: ["pwa", "app", "offline"],
  language: ["malayalam", "hindi", "english", "translate"],
  theme: ["dark", "light", "font", "appearance", "settings"],
  profile: ["settings", "account", "appearance"],
  admin: ["government", "gov", "console"],
  government: ["admin", "gov"],
};

/** Lowercase, split to words, drop stopwords, strip simple plural/-ing endings. */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem);
}

function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("es")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function expandQuery(query: string): string[] {
  const base = tokenize(query);
  const out = [...base];
  for (const w of base) for (const s of SYNONYMS[w] ?? []) out.push(stem(s));
  return out;
}

export type Scored<T> = { doc: T; score: number };

export function buildIndex<T>(docs: T[], textOf: (d: T) => string, boostOf?: (d: T) => string) {
  const k1 = 1.4;
  const b = 0.75;
  const rows = docs.map((d) => {
    const terms = tokenize(textOf(d));
    // A title/keyword field counts double: matches there are stronger signals.
    if (boostOf) terms.push(...tokenize(boostOf(d)), ...tokenize(boostOf(d)));
    const tf = new Map<string, number>();
    for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { d, tf, len: terms.length };
  });
  const avg = rows.reduce((s, r) => s + r.len, 0) / Math.max(1, rows.length);
  const df = new Map<string, number>();
  for (const r of rows) for (const t of r.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const N = rows.length;

  return {
    search(query: string, limit: number, minScore = 0.01): Scored<T>[] {
      const q = expandQuery(query);
      if (!q.length) return [];
      const uniq = [...new Set(q)];
      const scored = rows.map((r) => {
        let score = 0;
        for (const t of uniq) {
          const f = r.tf.get(t);
          if (!f) continue;
          const n = df.get(t) ?? 0;
          const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
          score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * r.len) / avg)));
        }
        return { doc: r.d, score };
      });
      return scored
        .filter((s) => s.score >= minScore)
        .sort((a, c) => c.score - a.score)
        .slice(0, limit);
    },
  };
}
