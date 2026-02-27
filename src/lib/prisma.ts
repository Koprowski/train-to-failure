import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  prismaBase: PrismaClient | undefined;
};

function createPrismaClient() {
  return new PrismaClient().$extends(withAccelerate());
}

// Base client for NextAuth adapter (doesn't support $extends)
export const prismaBase =
  globalForPrisma.prismaBase ?? new PrismaClient();

// Extended client for app usage
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaBase = prismaBase;
}
