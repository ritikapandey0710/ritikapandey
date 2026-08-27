// Prisma configuration - datasource URL is provided via DATABASE_URL environment variable
// This avoids loading .env during TypeScript compilation while still allowing
// Prisma CLI to work correctly at runtime
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    db: {
      provider: "postgresql",
      url: process.env.DATABASE_URL
    }
  },
  migrations: {
    path: "prisma/migrations",
  }
});
