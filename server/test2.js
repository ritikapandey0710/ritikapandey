require('dotenv').config();
const { PrismaClient } = require('./src/generated/prisma/client');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.user.count();
    console.log(`User count: ${count}`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
