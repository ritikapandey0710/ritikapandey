import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// The correct production database. The system environment variable may point to
// the wrong test database, so we always use this explicitly.
const CORRECT_DATABASE_URL = "postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public";

const databaseUrl = CORRECT_DATABASE_URL;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;