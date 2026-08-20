import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = "postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

const AI_AGENT_EMAIL = "ai@helpdesk.local";
const AI_AGENT_NAME = "AI";

async function main() {
  console.log(`Seeding AI agent: ${AI_AGENT_NAME} (${AI_AGENT_EMAIL})`);
  const existing = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } });
  if (existing) {
    console.log(`AI agent already exists with id: ${existing.id}`);
    console.log("No duplicate created. Seed is idempotent.");
    return;
  }
  const aiAgent = await prisma.user.create({
    data: { name: AI_AGENT_NAME, email: AI_AGENT_EMAIL, emailVerified: true, role: "AGENT" },
  });
  console.log(`AI agent created successfully with id: ${aiAgent.id}`);
}

main()
  .catch((e) => { console.error("Error seeding AI agent:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });