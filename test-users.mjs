import { prisma } from './server/src/lib/prisma';

async function main() {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      email: { not: "ap164920@gmail.com" }
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${users.length} users (excluding ap164920@gmail.com):`);
  users.forEach(u => {
    console.log(`  ${u.id} | ${u.name} | ${u.email} | ${u.role}`);
  });

  // Check if the excluded user is present
  const excludedUser = users.find(u => u.email === "ap164920@gmail.com");
  if (excludedUser) {
    console.error(`ERROR: Found excluded user: ${excludedUser.email}`);
    process.exit(1);
  } else {
    console.log(`SUCCESS: Excluded user not found in list.`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
