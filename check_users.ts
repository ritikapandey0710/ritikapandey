import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  const users = await prisma.user.findMany();

  console.log('All users in database:');
  users.forEach((user, index) => {
    console.log(`${index + 1}. ID: ${user.id}`);
    console.log(`   Name: ${user.name ?? 'No name'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log('---');
  });

  // Get the specific users used in the replies
  const replyAuthorIds = [
    'LQuIuAoGHj9b1F5xHcQ846xrMAC383aI', // Odd replies (1,3,5,7,9) - Customer
    'JhERvmb6QQkvmwExkoa8CwHvqGLOw8R9'   // Even replies (2,4,6,8,10) - Agent
  ];

  console.log('\nUsers used in replies:');
  for (const authorId of replyAuthorIds) {
    const user = await prisma.user.findUnique({ where: { id: authorId } });
    if (user) {
      console.log(`Author ID: ${user.id}`);
      console.log(`   Name: ${user.name ?? 'No name'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log('---');
    } else {
      console.log(`Author ID: ${authorId} - NOT FOUND`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});