// Prisma configuration - datasource URL is provided via DATABASE_URL environment variable
// This avoids loading .env during TypeScript compilation while still allowing
// Prisma CLI to work correctly at runtime

export default {
  schema: "prisma/schema.prisma",
  datasources: {
    db: {
      provider: "postgresql",
      url: process.env.DATABASE_URL
    }
  }
};
