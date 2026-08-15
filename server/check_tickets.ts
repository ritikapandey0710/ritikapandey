import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public"
  })
});

async function main() {
  const ticketCount = await prisma.ticket.count();
  console.log("Ticket count:", ticketCount);

  const userCount = await prisma.user.count();
  console.log("User count:", userCount);

  if (ticketCount > 0) {
    const sample = await prisma.ticket.findFirst();
    console.log("Sample ticket:", JSON.stringify(sample, null, 2));
  }
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });