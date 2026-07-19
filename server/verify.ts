import { prisma } from "./src/prisma";

async function main() {
  console.log("Checking admin user in database...");

  const adminEmail = "admin@example.com";

  // Find the admin user
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: {
      accounts: true,
    },
  });

  if (!user) {
    console.log("Admin user not found!");
    return;
  }

  console.log("Admin user found:");
  console.log(`  ID: ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name: ${user.name}`);
  console.log(`  Role: ${user.role}`);
  console.log(`  Email Verified: ${user.emailVerified}`);
  console.log(`  Created At: ${user.createdAt}`);
  console.log(`  Updated At: ${user.updatedAt}`);

  if (user.accounts && user.accounts.length > 0) {
    console.log(`\nAccounts (${user.accounts.length}):`);
    user.accounts.forEach((account, index) => {
      console.log(`  Account ${index + 1}:`);
      console.log(`    ID: ${account.id}`);
      console.log(`    Provider ID: ${account.providerId}`);
      console.log(`    Provider Account ID: ${account.accountId}`);
      console.log(`    Has Password: ${!!account.password}`);
      console.log(`    Created At: ${account.createdAt}`);
      console.log(`    Updated At: ${account.updatedAt}`);
    });
  } else {
    console.log("\nNo accounts found for this user.");
  }
}

main()
  .catch((e) => {
    console.error("Error checking database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });