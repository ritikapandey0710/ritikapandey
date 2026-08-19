const { prisma } = require('./server/src/lib/prisma');
const { knowledgeBaseService } = require('./server/src/services/knowledgeBaseService');

async function testStateFlow() {
    console.log('Testing ticket state flow...');

    try {
        // Test the knowledge base service directly first
        console.log('\n--- Testing Knowledge Base Service ---');
        console.log(`Loaded ${knowledgeBaseService.entries.length} KB entries`);

        const testCases = [
            {
                title: "Password reset request",
                description: "I forgot my password and need to reset it",
                expected: "Password Reset Issues"
            },
            {
                title: "Some random issue not in KB",
                description: "This is a made up issue that won't match our knowledge base",
                expected: null
            }
        ];

        for (const {title, description, expected} of testCases) {
            const match = knowledgeBaseService.findMatchingEntry(title, description);
            if (match && expected) {
                console.log(`✓ "${title}" -> "${match.title}"`);
            } else if (!match && !expected) {
                console.log(`✓ "${title}" -> No match (correct)`);
            } else {
                console.log(`✗ "${title}" -> Expected: "${expected}", Got: "${match ? match.title : 'null'}"`);
            }
        }

        // Test 1: Create a ticket that should match knowledge base (password reset)
        console.log('\n--- Test 1: Knowledge base match (should be RESOLVED) ---');
        const ticket1 = await prisma.ticket.create({
            data: {
                title: "Password reset request",
                description: "I forgot my password and need to reset it",
                senderName: "Test User",
                senderEmail: "test@example.com",
                // Note: status will be overridden to NEW then PROCESSING then RESOLVED by our logic
            },
        });
        console.log(`Created ticket 1 with ID: ${ticket1.id}`);

        // Give a moment for async operations
        await new Promise(resolve => setTimeout(resolve, 2000));

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
                // Note: status will be overridden to NEW then PROCESSING then OPEN by our logic
            },
        });
        console.log(`Created ticket 2 with ID: ${ticket2.id}`);

        // Give a moment for async operations
        await new Promise(resolve => setTimeout(resolve, 2000));

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
        console.log('\n--- Test 3: Get tickets counting NEW and PROCESSING ---');
        const newTickets = await prisma.ticket.count({ where: { status: "NEW" } });
        const processingTickets = await prisma.ticket.count({ where: { status: "PROCESSING" } });
        const openTickets = await prisma.ticket.count({ where: { status: "OPEN" } });
        const resolvedTickets = await prisma.ticket.count({ where: { status: "RESOLVED" } });

        console.log(`Current ticket counts:`);
        console.log(`  NEW: ${newTickets}`);
        console.log(`  PROCESSING: ${processingTickets}`);
        console.log(`  OPEN: ${openTickets}`);
        console.log(`  RESOLVED: ${resolvedTickets}`);

        // Check our specific test tickets
        const testTickets = await prisma.ticket.findMany({
            where: {
                id: {
                    in: [ticket1.id, ticket2.id]
                }
            }
        });
        console.log(`Our test tickets:`);
        for (const t of testTickets) {
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