/**
 * Seeds one ADMIN and one USER profile.
 *
 * IMPORTANT: Profile.id must equal a real Supabase auth user id. Create the two
 * users first (Supabase dashboard -> Authentication -> Users), then pass their ids:
 *
 *   SEED_ADMIN_ID=<uuid> SEED_USER_ID=<uuid> npm run db:seed
 *
 * Emails default to admin@example.com / user@example.com (override with
 * SEED_ADMIN_EMAIL / SEED_USER_EMAIL). Without the ids the script stops.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function need(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(
      `Missing ${name}. Create the matching user in Supabase (Authentication -> Users) and copy its UUID.`,
    );
    process.exit(1);
  }
  return v;
}

async function main() {
  const seeds = [
    {
      id: need("SEED_ADMIN_ID"),
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@example.com",
      name: "Admin",
      role: "ADMIN" as const,
    },
    {
      id: need("SEED_USER_ID"),
      email: process.env.SEED_USER_EMAIL ?? "user@example.com",
      name: "User",
      role: "USER" as const,
    },
  ];
  for (const s of seeds) {
    await prisma.profile.upsert({ where: { id: s.id }, update: s, create: s });
  }
  console.log(`Seeded ${seeds.length} profiles.`);
}

main().finally(() => prisma.$disconnect());
