import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: 'agent1@example.com' },
        { email: 'agent@example.com' },
        { email: 'admin@example.com' }
      ]
    }
  });

  console.log('User roles:');
  users.forEach(user => {
    console.log(`- ${user.email}: ${user.role} (name: ${user.name})`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });