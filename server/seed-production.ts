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

// Helper function to ensure URL has a protocol (matches auth.ts logic)
function getBaseURL(): string {
  const envUrl = process.env.BETTER_AUTH_URL;
  if (envUrl) {
    // Ensure URL has a protocol
    if (!envUrl.startsWith('http://') && !envUrl.startsWith('https://')) {
      return `https://${envUrl}`;
    }
    return envUrl;
  }
  return `http://localhost:${process.env.PORT || 3001}`;
}

const auth = betterAuth({
  baseURL: getBaseURL(),
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
  console.log("Starting production seed process...");
  
  // Create or update admin user
  const adminEmail = "admin@example.com";
  const adminPassword = "password123";
  
  console.log(`Processing admin user: ${adminEmail}`);
  
  let adminExisting = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (adminExisting) {
    console.log("Admin user already exists, updating role and verification status...");
    // Update the existing user - ensure role is ADMIN and email is verified
    await prisma.user.update({
      where: { id: adminExisting.id },
      data: {
        role: "ADMIN",
        emailVerified: true,
        name: "Admin User" // Ensure name is set correctly
      },
    });
    console.log("Admin user updated successfully");
  } else {
    console.log("Creating new admin user...");
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
  }
  
  // Create or update agent user
  const agentEmail = "agent@example.com";
  const agentPassword = "password123";
  
  console.log(`Processing agent user: ${agentEmail}`);
  
  let agentExisting = await prisma.user.findUnique({ where: { email: agentEmail } });
  
  if (agentExisting) {
    console.log("Agent user already exists, updating role and verification status...");
    // Update the existing user - ensure role is AGENT and email is verified
    await prisma.user.update({
      where: { id: agentExisting.id },
      data: {
        role: "AGENT",
        emailVerified: true,
        name: "Agent User" // Ensure name is set correctly
      },
    });
    console.log("Agent user updated successfully");
  } else {
    console.log("Creating new agent user...");
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
  
  console.log("Production seed process completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during production seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
