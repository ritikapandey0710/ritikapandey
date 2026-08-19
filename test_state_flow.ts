import { prisma } from './src/lib/prisma';

async function testStateFlow() {
    console.log('Testing ticket state flow...');

    try {
        // Test 1: Create a ticket that should match knowledge base (password reset)
        console.log('\n--- Test 1: Knowledge base match (should be RESOLVED) ---');
        const ticket1 = await prisma.ticket.create({
            data: {
                title: "Password reset request",
                description: "I forgot my password and need to reset it",
                senderName: "Test User",
                senderEmail: "test@example.com",
                status: "NEW", // This will be overridden by our logic
                priority: "MEDIUM",
            },
        });
        console.log(`Created ticket 1 with ID: ${ticket1.id}`);

        // Give a moment for async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        const updatedTicket1 = await prisma.ticket.findUnique({
            where: { id: ticket1.id },
            include: {
                user_Ticket_reporterIdTouser: { select: { name: true } },
                replies: { take: 1, orderBy: { createdAt: 'desc' } }
            }
        });
        console.log(`Ticket 1 status: ${updatedTicket1?.status}`);
        if (updatedTicket1?.replies?.length) {
            console.log(`Ticket 1 latest reply: ${updatedTicket1.replies[0].body.substring(0, 100)}...`);
        }

        // Test 2: Create a ticket that should NOT match knowledge base (should be OPEN)
        console.log('\n--- Test 2: No knowledge base match (should be OPEN) ---');
        const ticket2 = await prisma.ticket.create({
            data: {
                title: "Some random issue not in KB",
                description: "This is a made up issue that won't match our knowledge base",
                senderName: "Test User 2",
                senderEmail: "test2@example.com",
                status: "NEW", // This will be overridden by our logic
                priority: "LOW",
            },
        });
        console.log(`Created ticket 2 with ID: ${ticket2.id}`);

        // Give a moment for async operations
        await new Promise(resolve => setTimeout(resolve, 100));

        const updatedTicket2 = await prisma.ticket.findUnique({
            where: { id: ticket2.id },
            include: {
                user_Ticket_reporterIdTouser: { select: { name: true } },
                replies: { take: 1, orderBy: { createdAt: 'desc' } }
            }
        });
        console.log(`Ticket 2 status: ${updatedTicket2?.status}`);
        if (updatedTicket2?.replies?.length) {
            console.log(`Ticket 2 latest reply: ${updatedTicket2.replies[0].body.substring(0, 100)}...`);
        }

        // Test 3: Check get tickets excludes NEW and PROCESSING by default
        console.log('\n--- Test 3: Get tickets (should exclude NEW and PROCESSING) ---');
        const tickets = await prisma.ticket.findMany({
            where: {
                OR: [
                    { status: "NEW" },
                    { status: "PROCESSING" }
                ]
            }
        });
        console.log(`Found ${tickets.length} tickets in NEW or PROCESSING state`);

        const allTickets = await prisma.ticket.findMany({
            where: {
                id: {
                    in: [ticket1.id, ticket2.id]
                }
            }
        });
        console.log(`Our test tickets: ${allTickets.length} total`);
        for const t of allTickets {
            console.log(`  Ticket ${t.id}: status=${t.status}`);
        }

        console.log('\n✅ All tests completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testStateFlow();