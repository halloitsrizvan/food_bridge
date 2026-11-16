import { prisma } from "../lib/prisma";

export const healthRepository = {
  pingDb: async (): Promise<void> => {
    await prisma.$queryRaw`SELECT 1`;
  },
};
