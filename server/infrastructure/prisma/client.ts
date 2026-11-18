import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

export { Prisma } from "./generated/client";
export type { PrismaClient };

const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

/** Lazy singleton (survives dev hot reloads). Never connects at import time. */
export const getPrisma = (): PrismaClient => {
  globalForPrisma.__prisma ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  return globalForPrisma.__prisma;
};
