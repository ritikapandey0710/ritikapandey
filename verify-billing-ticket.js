const { prisma } = require('C:/Users/ritik/OneDrive/Desktop/help desk/server/src/lib/prisma');
const { knowledgeBaseService } = require('C:/Users/ritik/OneDrive/Desktop/help desk/server/src/services/knowledgeBaseService');

async function verifyTicket() {
  try {
    const ticketId = '811454ae-a1a5-424b-abe4-7f2b760f54d0';

    // 1. Fetch the created ticket with any replies
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      console.log('Ticket not found!');
      return;
    }

    console.log('========================================');
    console.log('  CREATED TICKET DETAILS');
    console.log('========================================');
    console.log(JSON.stringify(ticket, null, 2));

    console.log('\n========================================');
    console.log('  RESOLUTION REPLY (if any)');
    console.log('========================================');
    if (ticket.replies && ticket.replies.length > 0) {
      ticket.replies.forEach((reply, i) => {
        console.log(`Reply #${i + 1}:`);
        console.log(`  Author: ${reply.authorId}`);
        console.log(`  Sender Type: ${reply.senderType}`);
        console.log(`  Body: ${reply.body}`);
        console.log(`  Created: ${reply.createdAt}`);
      });
    } else {
      console.log('No resolution replies found (webhook does not create replies for unauthenticated requests)');
    }

    // 2. Confirm which KB entry matched
    const kbEntry = knowledgeBaseService.findMatchingEntry(ticket.title, ticket.description);
    console.log('\n========================================');
    console.log('  KNOWLEDGE BASE MATCH');
    console.log('========================================');
    if (kbEntry) {
      console.log(`✅ MATCHED KB entry: "${kbEntry.title}"`);
      console.log(`   Category: ${kbEntry.category}`);
      console.log(`   Keywords: ${kbEntry.keywords.join(', ')}`);
      console.log(`   ID: ${kbEntry.id}`);
      console.log(`\n   Resolution steps from KB:`);
      const resolution = knowledgeBaseService.getResolutionSteps(kbEntry);
      console.log(`   ${resolution}`);
    } else {
      console.log('❌ No KB entry matched.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyTicket();
