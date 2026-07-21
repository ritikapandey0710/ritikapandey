import { prisma } from "./src/prisma";

async function main() {
  try {
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();