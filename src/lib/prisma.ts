import { PrismaClient } from "@prisma/client";

/**
 * Prisma 单例：开发模式热重载时复用全局实例，避免连接数暴涨
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
