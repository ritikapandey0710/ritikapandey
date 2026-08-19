import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  // Delete all replies for ticket 10 to start fresh
  const deleted = await prisma.reply.deleteMany({
    where: { ticketId: '10' }
  });
  console.log(`Deleted ${deleted.count} replies from ticket 10`);

  // Also delete ticket 10 to let our seed script recreate it
  const deletedTicket = await prisma.ticket.deleteMany({
    where: { id: '10' }
  });
  console.log(`Deleted ${deletedTicket.count} tickets with ID 10`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });