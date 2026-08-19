 import { prisma } from './src/lib/prisma';

async function main() {
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { role: 'asc' },
  });
  console.log('All users:');
  allUsers.forEach(u => console.log(`  ${u.id} | ${u.name} | ${u.email} | ${u.role}`));

  const userRoleUsers = allUsers.filter(u => u.role === 'USER');
  console.log(`\nUSER-role users: ${userRoleUsers.length}`);
  if (userRoleUsers.length > 0) {
    userRoleUsers.forEach(u => console.log(`  ${u.id} | ${u.email}`));
  }

  // Check for bot/system user
  const botUser = await prisma.user.findUnique({
    where: { email: 'system@helpdesk.local' },
    select: { id: true, name: true, email: true, role: true },
  });
  console.log(`\nBot user exists: ${!!botUser}`);
  if (botUser) console.log(`  ${botUser.id} | ${botUser.name} | ${botUser.email} | ${botUser.role}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
