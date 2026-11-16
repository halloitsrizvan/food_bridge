/**
 * Idempotent demo seed:  npm run db:seed
 * Needs: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (real service-role key).
 * Creates Supabase auth users (shared demo password) + profiles + posts around Kozhikode, Kerala.
 */
import { PrismaClient, type Diet, type FoodCategory, type HandoverMode } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_CONFIG } from "../server/logic/config";
import { deriveOtp, hashOtp } from "../server/logic/otp";
import { tierFor } from "../server/logic/points";
import { safeUntil } from "../server/logic/time";

const prisma = new PrismaClient();
const PASSWORD = "FoodBridge#2026";
const need = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k}. See .env.example.`);
    process.exit(1);
  }
  return v;
};
const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const MIN = 60_000;
const at = (min: number) => new Date(Date.now() + min * MIN);

async function ensureAuthUser(email: string, role: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, app_metadata: { role } });
  if (data?.user) return data.user.id;
  if (error && /already|registered|exists/i.test(error.message)) {
    for (let page = 1; page < 20; page++) {
      const { data: list } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const found = list?.users.find((u) => u.email?.toLowerCase() === email);
      if (found) return found.id;
      if (!list?.users.length) break;
    }
  }
  throw new Error(`Could not create/find auth user ${email}: ${error?.message}`);
}

type G = { email: string; name: string; kind: "RESTAURANT" | "CATERER" | "HOUSEHOLD" | "EVENT"; area: string; lat: number; lng: number; address: string; points: number; trust: number };
type T = { email: string; name: string; kind: "INSTITUTION" | "CHARITY" | "HOUSE"; area: string; lat: number; lng: number; address: string; members: number; trust: number };

const GIVERS: G[] = [
  { email: "spice.route@foodbridge.demo", name: "Spice Route Kitchen", kind: "RESTAURANT", area: "Mavoor Road", lat: 11.2561, lng: 75.7872, address: "12 Mavoor Road, Kozhikode", points: 820, trust: 92 },
  { email: "paragon.cater@foodbridge.demo", name: "Malabar Feast Caterers", kind: "CATERER", area: "Palayam", lat: 11.2512, lng: 75.7845, address: "Palayam Junction, Kozhikode", points: 1620, trust: 95 },
  { email: "beachside@foodbridge.demo", name: "Beachside Biryani House", kind: "RESTAURANT", area: "Beach Road", lat: 11.2644, lng: 75.7681, address: "Beach Road, Kozhikode", points: 240, trust: 84 },
  { email: "anitha.home@foodbridge.demo", name: "Anitha's Home Kitchen", kind: "HOUSEHOLD", area: "Nadakkavu", lat: 11.2699, lng: 75.7892, address: "Nadakkavu, Kozhikode", points: 60, trust: 78 },
  { email: "ravi.events@foodbridge.demo", name: "Royal Wedding Hall", kind: "EVENT", area: "Kallai", lat: 11.2358, lng: 75.7764, address: "Kallai Road, Kozhikode", points: 380, trust: 88 },
  { email: "cafe.mocha@foodbridge.demo", name: "Cafe Mocha Bakery", kind: "RESTAURANT", area: "Medical College", lat: 11.2793, lng: 75.8081, address: "Medical College Rd, Kozhikode", points: 130, trust: 81 },
  { email: "sunil.home@foodbridge.demo", name: "Sunil & Family", kind: "HOUSEHOLD", area: "Elathur", lat: 11.3120, lng: 75.7560, address: "Elathur, Kozhikode", points: 25, trust: 70 },
  { email: "grand.cater@foodbridge.demo", name: "Grand Sadhya Caterers", kind: "CATERER", area: "Feroke", lat: 11.1830, lng: 75.8300, address: "Feroke, Kozhikode", points: 640, trust: 56 },
];
const TAKERS: T[] = [
  { email: "snehadeepam@foodbridge.demo", name: "Snehadeepam Orphanage", kind: "INSTITUTION", area: "Mavoor Road", lat: 11.2604, lng: 75.7921, address: "Snehadeepam, Mavoor Road", members: 64, trust: 90 },
  { email: "oldage.home@foodbridge.demo", name: "Santhi Old Age Home", kind: "INSTITUTION", area: "Palayam", lat: 11.2469, lng: 75.7893, address: "Santhi Bhavan, Palayam", members: 38, trust: 86 },
  { email: "annadanam@foodbridge.demo", name: "Annadanam Charity Kitchen", kind: "CHARITY", area: "Beach Road", lat: 11.2587, lng: 75.7712, address: "Beach Road Charity Kitchen", members: 150, trust: 93 },
  { email: "hostel.girls@foodbridge.demo", name: "Govt Girls Hostel", kind: "INSTITUTION", area: "Medical College", lat: 11.2759, lng: 75.8044, address: "Medical College Campus", members: 90, trust: 79 },
  { email: "family.nair@foodbridge.demo", name: "Nair Family", kind: "HOUSE", area: "Nadakkavu", lat: 11.2724, lng: 75.7841, address: "Nadakkavu Lane 3", members: 5, trust: 72 },
  { email: "family.salim@foodbridge.demo", name: "Salim's Family", kind: "HOUSE", area: "Kallai", lat: 11.2391, lng: 75.7812, address: "Kallai Colony", members: 7, trust: 74 },
  { email: "hope.centre@foodbridge.demo", name: "Hope Rehabilitation Centre", kind: "CHARITY", area: "Elathur", lat: 11.3078, lng: 75.7611, address: "Hope Centre, Elathur", members: 45, trust: 82 },
  { email: "ashraya@foodbridge.demo", name: "Ashraya Shelter", kind: "INSTITUTION", area: "Feroke", lat: 11.1904, lng: 75.8244, address: "Ashraya, Feroke", members: 52, trust: 76 },
];

async function main() {
  const t0 = Date.now();
  await prisma.appConfig.upsert({ where: { key: "main" }, update: {}, create: { key: "main", value: DEFAULT_CONFIG as never } });

  const govId = await ensureAuthUser("gov@foodbridge.demo", "GOV");
  await prisma.profile.upsert({
    where: { id: govId },
    update: { role: "GOV", onboarded: true },
    create: { id: govId, role: "GOV", name: "Kozhikode District Food Authority", email: "gov@foodbridge.demo", phone: "+914952300000", address: "Civil Station, Kozhikode", area: "Civil Station", lat: 11.2588, lng: 75.7804, onboarded: true },
  });

  const giverIds: Record<string, string> = {};
  for (const g of GIVERS) {
    const id = await ensureAuthUser(g.email, "GIVER");
    giverIds[g.email] = id;
    const data = { role: "GIVER" as const, giverKind: g.kind, name: g.name, email: g.email, phone: "+9198470" + String(10000 + GIVERS.indexOf(g)), address: g.address, area: g.area, lat: g.lat, lng: g.lng, onboarded: true, points: g.points, trustScore: g.trust, tier: tierFor(g.points, DEFAULT_CONFIG) };
    await prisma.profile.upsert({ where: { id }, update: data, create: { id, ...data } });
  }
  const takerIds: Record<string, string> = {};
  for (const t of TAKERS) {
    const id = await ensureAuthUser(t.email, "TAKER");
    takerIds[t.email] = id;
    const data = { role: "TAKER" as const, takerKind: t.kind, name: t.name, email: t.email, phone: "+9195440" + String(20000 + TAKERS.indexOf(t)), address: t.address, area: t.area, lat: t.lat, lng: t.lng, members: t.members, onboarded: true, trustScore: t.trust, points: 20 };
    await prisma.profile.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  // ---- live offers (title is the idempotency key per giver)
  type O = { g: string; title: string; cat: FoodCategory; diet: Diet; meals: number; cookedAgoMin?: number; expiresInMin: number; mode: HandoverMode; scheduledInMin?: number; escalate?: boolean };
  const OFFERS: O[] = [
    { g: GIVERS[0].email, title: "Veg meals after lunch rush", cat: "COOKED", diet: "VEG", meals: 40, cookedAgoMin: 100, expiresInMin: 140, mode: "EITHER" },
    { g: GIVERS[1].email, title: "Sadhya leftovers (wedding)", cat: "COOKED", diet: "VEG", meals: 120, cookedAgoMin: 60, expiresInMin: 180, mode: "TAKER_PICKS_UP" },
    { g: GIVERS[2].email, title: "Chicken biryani trays", cat: "COOKED", diet: "NON_VEG", meals: 35, cookedAgoMin: 190, expiresInMin: 50, mode: "GIVER_DELIVERS" },
    { g: GIVERS[3].email, title: "Home-cooked rice and sambar", cat: "COOKED", diet: "VEG", meals: 8, cookedAgoMin: 120, expiresInMin: 110, mode: "EITHER" },
    { g: GIVERS[4].email, title: "Reception dinner surplus", cat: "COOKED", diet: "BOTH", meals: 200, cookedAgoMin: 30, expiresInMin: 210, mode: "TAKER_PICKS_UP" },
    { g: GIVERS[5].email, title: "Fresh bread and buns", cat: "PACKAGED", diet: "VEG", meals: 60, expiresInMin: 300, mode: "EITHER" },
    { g: GIVERS[0].email, title: "Parotta and curry packs", cat: "COOKED", diet: "NON_VEG", meals: 25, cookedAgoMin: 215, expiresInMin: 25, mode: "GIVER_DELIVERS" },
    { g: GIVERS[6].email, title: "Birthday party food", cat: "COOKED", diet: "VEG", meals: 15, cookedAgoMin: 40, expiresInMin: 200, mode: "EITHER" },
    { g: GIVERS[1].email, title: "Raw vegetables crate", cat: "RAW", diet: "VEG", meals: 50, expiresInMin: 290, mode: "TAKER_PICKS_UP" },
    { g: GIVERS[5].email, title: "Packaged biscuits and juice", cat: "PACKAGED", diet: "VEG", meals: 90, expiresInMin: 280, mode: "EITHER" },
    // far from every taker + nearly through its window: the escalation / gov alert demo
    { g: GIVERS[7].email, title: "Catering surplus (unmatched demo)", cat: "COOKED", diet: "NON_VEG", meals: 70, cookedAgoMin: 200, expiresInMin: 35, mode: "TAKER_PICKS_UP", escalate: true },
    { g: GIVERS[4].email, title: "Tomorrow's engagement lunch (upcoming)", cat: "COOKED", diet: "VEG", meals: 150, cookedAgoMin: 0, expiresInMin: 480, mode: "EITHER", scheduledInMin: 180 },
  ];
  let createdOffers = 0;
  for (const o of OFFERS) {
    const giverId = giverIds[o.g];
    if (await prisma.offer.findFirst({ where: { giverId, title: o.title } })) continue;
    const cooked = o.cookedAgoMin != null ? at(-o.cookedAgoMin) : null;
    const expectedExpiryAt = o.cat === "PACKAGED" || o.cat === "RAW" ? at(o.expiresInMin) : at(o.expiresInMin + 120);
    const safe = o.cat === "COOKED" && cooked ? safeUntil("COOKED", cooked, expectedExpiryAt, DEFAULT_CONFIG) : o.cat === "RAW" ? at(o.expiresInMin) : expectedExpiryAt;
    const start = o.escalate ? at(-200) : at(-Math.min(30, o.expiresInMin / 3));
    await prisma.offer.create({
      data: {
        giverId, title: o.title, description: "", category: o.cat, diet: o.diet, quantityMeals: o.meals, cookedAt: cooked, expectedExpiryAt, safeUntil: safe, mode: o.mode,
        scheduledFor: o.scheduledInMin ? at(o.scheduledInMin) : null, escalationLevel: o.scheduledInMin ? -1 : o.escalate ? 1 : 0, createdAt: start,
      },
    });
    createdOffers++;
  }

  // ---- needs
  const NEEDS = [
    { t: TAKERS[0], title: "Dinner for 60 children", diet: "VEG" as Diet, meals: 60, byMin: 300, mode: "EITHER" as HandoverMode },
    { t: TAKERS[1], title: "Lunch for 35 residents", diet: "VEG" as Diet, meals: 35, byMin: 200, mode: "TAKER_PICKS_UP" as HandoverMode },
    { t: TAKERS[2], title: "Community kitchen: any cooked food", diet: "BOTH" as Diet, meals: 120, byMin: 360, mode: "EITHER" as HandoverMode },
    { t: TAKERS[3], title: "Hostel dinner", diet: "BOTH" as Diet, meals: 80, byMin: 280, mode: "EITHER" as HandoverMode },
    { t: TAKERS[4], title: "Family meal tonight", diet: "VEG" as Diet, meals: 5, byMin: 240, mode: "TAKER_PICKS_UP" as HandoverMode },
    { t: TAKERS[6], title: "Rehab centre evening meal", diet: "VEG" as Diet, meals: 40, byMin: 330, mode: "EITHER" as HandoverMode },
  ];
  let createdNeeds = 0;
  for (const n of NEEDS) {
    const takerId = takerIds[n.t.email];
    if (await prisma.need.findFirst({ where: { takerId, title: n.title } })) continue;
    await prisma.need.create({ data: { takerId, title: n.title, notes: "", diet: n.diet, mealsNeeded: n.meals, neededFrom: at(-10), neededBy: at(n.byMin), mode: n.mode } });
    createdNeeds++;
  }

  // ---- 5 completed claims with reviews + ledger (history for tiers, trust, leaderboard, certificates)
  const DONE = [
    { g: 0, t: 0, meals: 45, rating: 5 },
    { g: 1, t: 2, meals: 110, rating: 5 },
    { g: 2, t: 3, meals: 30, rating: 4 },
    { g: 4, t: 1, meals: 80, rating: 5 },
    { g: 5, t: 4, meals: 6, rating: 4 },
  ];
  let createdClaims = 0;
  for (const [i, d] of DONE.entries()) {
    const giverId = giverIds[GIVERS[d.g].email];
    const takerId = takerIds[TAKERS[d.t].email];
    const title = `Past handover #${i + 1}`;
    if (await prisma.offer.findFirst({ where: { giverId, title } })) continue;
    const day = (i + 1) * 20 * 60;
    const offer = await prisma.offer.create({
      data: { giverId, title, category: "COOKED", diet: "BOTH", quantityMeals: d.meals, cookedAt: at(-day - 120), expectedExpiryAt: at(-day + 120), safeUntil: at(-day + 120), mode: "EITHER", status: "DELIVERED", createdAt: at(-day - 60) },
    });
    const claim = await prisma.claim.create({
      data: { offerId: offer.id, takerId, giverId, initiatedBy: "TAKER", status: "COMPLETED", holdUntil: at(-day), acceptedAt: at(-day - 20), completedAt: at(-day), mealsDelivered: d.meals, otpSalt: "seed", otpHash: hashOtp(deriveOtp("seed", "seed", "seed")), createdAt: at(-day - 30) },
    });
    await prisma.review.create({ data: { claimId: claim.id, fromId: takerId, toId: giverId, rating: d.rating, comment: "Warm food, on time. Thank you!" } });
    await prisma.pointLedger.createMany({
      data: [
        { accountId: giverId, claimId: claim.id, delta: 10 + Math.min(d.meals, 50) + 5, reason: "HANDOVER" },
        { accountId: takerId, claimId: claim.id, delta: 5, reason: "HANDOVER" },
      ],
    });
    createdClaims++;
  }

  // ---- 2 complaints: Grand Sadhya Caterers is one complaint away from auto-suspension
  const grand = giverIds[GIVERS[7].email];
  const complainants = [takerIds[TAKERS[7].email], takerIds[TAKERS[6].email]];
  let createdComplaints = 0;
  for (const [i, fromId] of complainants.entries()) {
    const title = `Complaint evidence #${i + 1}`;
    if (await prisma.offer.findFirst({ where: { giverId: grand, title } })) continue;
    const offer = await prisma.offer.create({
      data: { giverId: grand, title, category: "COOKED", diet: "BOTH", quantityMeals: 20, cookedAt: at(-3000), expectedExpiryAt: at(-2800), safeUntil: at(-2800), mode: "EITHER", status: "DELIVERED", createdAt: at(-3100) },
    });
    const claim = await prisma.claim.create({
      data: { offerId: offer.id, takerId: fromId, giverId: grand, initiatedBy: "TAKER", status: "COMPLETED", holdUntil: at(-2900), acceptedAt: at(-2950), completedAt: at(-2900), mealsDelivered: 20, otpSalt: "seed", otpHash: "seed" },
    });
    await prisma.complaint.create({ data: { claimId: claim.id, fromId, againstId: grand, reason: "Food arrived cold and late, quantity less than promised.", weight: 1, createdAt: at(-60 * 24 * (i + 2)) } });
    createdComplaints++;
  }

  console.log(`\nSeed done in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${createdOffers} offers, ${createdNeeds} needs, ${createdClaims} completed claims, ${createdComplaints} complaints created.\n`);
  console.log("Demo accounts (password for ALL: " + PASSWORD + ")");
  console.log("  GOV    gov@foodbridge.demo");
  console.log("  GIVER  " + GIVERS.map((g) => g.email).join("\n         "));
  console.log("  TAKER  " + TAKERS.map((t) => t.email).join("\n         "));
  console.log("\nTip: file one more complaint against Grand Sadhya Caterers to see the auto-suspension, then appeal + gov approve.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
