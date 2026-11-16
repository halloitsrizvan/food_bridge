// Prisma singleton: reused across hot reloads (dev) and warm serverless invocations.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Interactive transactions queue for the single pooled connection (connection_limit=1): give them room.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ transactionOptions: { maxWait: 15_000, timeout: 30_000 } });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
