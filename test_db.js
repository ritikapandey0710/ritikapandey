// Manually set the DATABASE_URL to avoid .env conflicts
process.env.DATABASE_URL = "postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public";

console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL);

// Import the Prisma client from the existing setup
const { prisma } = require('./server/src/prisma');

async function main() {
  try {
    // Test the connection
    await prisma.$connect();
    console.log('Database connection successful!');

    // Count users
    const userCount = await prisma.user.count();
    console.log(`Number of users: ${userCount}`);

    // Count tickets
    const ticketCount = await prisma.ticket.count();
    console.log(`Number of tickets: ${ticketCount}`);

    // List first few tickets if any exist
    if (ticketCount > 0) {
      const tickets = await prisma.ticket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      console.log('Recent tickets:');
      tickets.forEach((ticket, index) => {
        console.log(`${index + 1}. ${ticket.title} (${ticket.status})`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Database error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();