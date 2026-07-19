import { prisma } from "./src/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { Role } from "./src/types";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "password123";

  console.log(`Seeding admin user: ${adminEmail}`);

  // Check if admin user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    console.log("Admin user already exists, updating...");

    // Update user role to ADMIN and verify email
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: Role.ADMIN,
        emailVerified: true,
        name: "Admin User",
      },
    });

    // Update or create account for credentials provider
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    // Check if account already exists for this user and provider
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: existingUser.id,
        providerId: "credentials",
        accountId: adminEmail,
      },
    });

    if (existingAccount) {
      // Update existing account
      await prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          password: hashedPassword,
        },
      });
      console.log("Existing account updated");
    } else {
      // Create new account
      await prisma.account.create({
        data: {
          id: randomUUID(),
          userId: existingUser.id,
          providerId: "credentials",
          accountId: adminEmail,
          password: hashedPassword,
        },
      });
      console.log("New account created");
    }

    console.log("Admin user updated successfully");
  } else {
    // Create new admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "Admin User",
        role: Role.ADMIN,
        emailVerified: true,
      },
    });

    // Create account for credentials provider
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        providerId: "credentials",
        accountId: adminEmail,
        password: hashedPassword,
      },
    });

    console.log("Admin user created successfully");
  }
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });