// Prisma configuration - datasource URL is provided via DATABASE_URL environment variable
// This avoids loading .env during TypeScript compilation while still allowing
// Prisma CLI to work correctly at runtime
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL;
console.log(`Prisma config: DATABASE_URL is ${url ? 'set' : 'NOT SET'}`);

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasources: {
    db: {
      provider: "postgresql",
      url: url
    }
  },
  migrations: {
    path: "prisma/migrations",
  }
});
