import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// We need the auth instance to use the SAME database, so construct prisma here and build auth manually
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DATABASE_URL })
});

const auth = betterAuth({
  baseURL: "http://localhost:3001",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET || "",
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "AGENT",
        input: false,
      },
    },
  },
});

async function main() {
  // Create admin user
  const adminEmail = "admin@example.com";
  const adminPassword = "password123";

  console.log(`Seeding admin user: ${adminEmail}`);

  let adminExisting = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (adminExisting) {
    console.log("Admin user already exists, deleting accounts to re-seed...");
    await prisma.account.deleteMany({ where: { userId: adminExisting.id } });
    await prisma.session.deleteMany({ where: { userId: adminExisting.id } });
    await prisma.user.delete({ where: { id: adminExisting.id } });
  }

  const adminRes = await auth.api.signUpEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: "Admin User",
    },
  });

  if (!adminRes || !adminRes.user) {
    throw new Error("Failed to create admin user via better-auth");
  }

  // Update the admin user to be verified and set role to ADMIN
  await prisma.user.update({
    where: { id: adminRes.user.id },
    data: {
      emailVerified: true,
      role: "ADMIN"
    },
  });

  console.log("Admin user created successfully:", adminRes.user.email);

  // Create agent user
  const agentEmail = "agent@example.com";
  const agentPassword = "password123";

  console.log(`Seeding agent user: ${agentEmail}`);

  let agentExisting = await prisma.user.findUnique({ where: { email: agentEmail } });

  if (agentExisting) {
    console.log("Agent user already exists, deleting accounts to re-seed...");
    await prisma.account.deleteMany({ where: { userId: agentExisting.id } });
    await prisma.session.deleteMany({ where: { userId: agentExisting.id } });
    await prisma.user.delete({ where: { id: agentExisting.id } });
  }

  const agentRes = await auth.api.signUpEmail({
    body: {
      email: agentEmail,
      password: agentPassword,
      name: "Agent User",
    },
  });

  if (!agentRes || !agentRes.user) {
    throw new Error("Failed to create agent user via better-auth");
  }

  // Update the agent user to be verified and set role to AGENT (default)
  await prisma.user.update({
    where: { id: agentRes.user.id },
    data: {
      emailVerified: true,
      role: "AGENT"  // Explicitly set to AGENT (though it's the default)
    },
  });

  console.log("Agent user created successfully:", agentRes.user.email);
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });