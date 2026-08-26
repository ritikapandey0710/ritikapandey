// Prisma configuration - datasource URL is provided via DATABASE_URL environment variable
// This avoids loading .env during TypeScript compilation while still allowing
// Prisma CLI to work correctly at runtime
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  }
  // Note: datasource.url is intentionally omitted - Prisma CLI will use
  // DATABASE_URL environment variable directly, which is set correctly at runtime
});
