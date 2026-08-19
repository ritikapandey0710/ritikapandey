import { PrismaClient } from './server/src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: 'postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public' })
});

async function main() {
  // Find the user that's being used as customer in our seed
  // From our verification, this is agent1@example.com
  const customerUser = await prisma.user.findFirst({
    where: { email: 'agent1@example.com' }
  });

  if (!customerUser) {
    console.log('Customer user not found (agent1@example.com)');
    return;
  }

  console.log(`Found customer user: ${customerUser.id}`);
  console.log(`Current name: ${customerUser.name}`);
  console.log(`Current email: ${customerUser.email}`);

  // Update the name to "riya"
  const updatedUser = await prisma.user.update({
    where: { id: customerUser.id },
    data: { name: 'riya' }
  });

  console.log(`Updated user name to: ${updatedUser.name}`);
}

main()
  .catch(e => {
    console.error('Error updating customer name:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });