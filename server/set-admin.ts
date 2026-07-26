import { prisma } from "./src/prisma";

await prisma.user.update({
  where: { email: process.env.ADMIN_EMAIL ?? "admin@example.com" },
  data: { role: "ADMIN" },
});
console.log("Role updated to ADMIN");
await prisma.$disconnect();
