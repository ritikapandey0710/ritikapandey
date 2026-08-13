import { PrismaClient } from './src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Override the database URL to ensure we use the correct database
process.env.DATABASE_URL = 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl })
});

async function main() {
  console.log('Checking users in database...');

  const users = await prisma.user.findMany();
  console.log(`Users in DB: ${users.length}`);
  users.forEach(u => {
    console.log(`- ${u.email} (${u.name}) role: ${u.role}`);
  });

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error('Error checking users:', e);
    process.exit(1);
  });