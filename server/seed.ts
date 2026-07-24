import { auth } from "./src/auth";
import { prisma } from "./src/prisma";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "password123";

  console.log(`Seeding admin user: ${adminEmail}`);

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    console.log("Admin user already exists, deleting accounts to re-seed...");
    await prisma.account.deleteMany({ where: { userId: existing.id } });
    await prisma.session.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const res = await auth.api.signUpEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: "Admin User",
    },
  });

  if (!res || !res.user) {
    throw new Error("Failed to create admin user via better-auth");
  }

  await prisma.user.update({
    where: { id: res.user.id },
    data: { emailVerified: true },
  });

  console.log("Admin user created successfully:", res.user.email);
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
