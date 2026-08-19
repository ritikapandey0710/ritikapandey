const { prisma } = require('C:/Users/ritik/OneDrive/Desktop/help desk/server/src/lib/prisma');

async function checkTicket() {
  try {
    // Get the most recent ticket
    const tickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('Recent tickets:');
    for (const ticket of tickets) {
      console.log(`ID: ${ticket.id}`);
      console.log(`  Title: ${ticket.title}`);
      console.log(`  Status: ${ticket.status}`);
      console.log(`  Created: ${ticket.createdAt}`);
      console.log(`  ---`);
    }
  } catch (error) {
    console.error('Error checking tickets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTicket();