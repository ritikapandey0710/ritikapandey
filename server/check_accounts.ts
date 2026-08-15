import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: "postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public"
  })
});

async function main() {
  const accounts = await prisma.account.findMany();
  console.log("Accounts:", JSON.stringify(accounts, null, 2));
}

main()
  .catch((e) => {
    console.error("Error:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });