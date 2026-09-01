import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { prisma } from './src/lib/prisma';
import { EmailService } from './src/services/email.service';

async function main() {
  console.log('=== Testing Email-to-Ticket Flow ===');

  const svc = new EmailService({ from: 'Test Sender <test@example.com>' });

  // Create a test email with a unique identifier
  const timestamp = Date.now();
  const rawEmail = `From: Test Customer <customer@test.com>
To: k30939126@gmail.com
Subject: Test Email Flow ${timestamp}
Date: ${new Date().toUTCString()}
Message-ID: <test-flow-${timestamp}@test.com>

This is a test email to verify the email-to-ticket workflow.
Please process this email and create a ticket.
`;

  console.log('\n--- Processing Test Email ---');
  // Call processEmail directly (it's private but accessible via casting)
  await (svc as any).processEmail(null, null, rawEmail);

  // Wait a bit for processing
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check for newly created test tickets
  const newTickets = await prisma.ticket.findMany({
    where: {
      senderEmail: 'customer@test.com',
      createdAt: {
        gt: new Date(Date.now() - 10000) // Created in last 10 seconds
      }
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      senderName: true,
      senderEmail: true,
      assigneeId: true,
      resolvedByAI: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`\n--- Results ---`);
  console.log(`Found ${newTickets.length} new test ticket(s)`);

  if (newTickets.length > 0) {
    const ticket = newTickets[0];
    console.log(`✅ Ticket created successfully:`);
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Ticket Number: ${ticket.ticketNumber}`);
    console.log(`  Title: ${ticket.title}`);
    console.log(`  Status: ${ticket.status}`);
    console.log(`  Sender Name: ${ticket.senderName}`);
    console.log(`  Sender Email: ${ticket.senderEmail}`);
    console.log(`  Assignee ID: ${ticket.assigneeId || 'NULL'}`);
    console.log(`  Resolved By AI: ${ticket.resolvedByAI}`);
    console.log(`  Created At: ${ticket.createdAt}`);

    // Verify the ticket contains correct information from the email
    let allChecksPassed = true;
    if (ticket.title === `Test Email Flow ${timestamp}`) {
      console.log(`✅ Ticket title matches email subject`);
    } else {
      console.log(`❌ Ticket title mismatch. Expected: "Test Email Flow ${timestamp}", Got: "${ticket.title}"`);
      allChecksPassed = false;
    }

    if (ticket.senderName === 'Test Customer') {
      console.log(`✅ Sender name matches email`);
    } else {
      console.log(`❌ Sender name mismatch. Expected: "Test Customer", Got: "${ticket.senderName}"`);
      allChecksPassed = false;
    }

    if (ticket.senderEmail === 'customer@test.com') {
      console.log(`✅ Sender email matches email`);
    } else {
      console.log(`❌ Sender email mismatch. Expected: "customer@test.com", Got: "${ticket.senderEmail}"`);
      allChecksPassed = false;
    }

    // When AI fails due to quota, ticket should be OPEN and not resolved by AI
    if (ticket.status === 'OPEN' && ticket.resolvedByAI === false) {
      console.log(`✅ Ticket status is OPEN and not resolved by AI (expected when AI classification fails)`);
    } else {
      console.log(`❌ Unexpected ticket status/resolution. Status: ${ticket.status}, ResolvedByAI: ${ticket.resolvedByAI}`);
      allChecksPassed = false;
    }

    // Check for INBOUND EmailMessage
    const emailMessages = await prisma.emailMessage.findMany({
      where: {
        messageId: `test-flow-${timestamp}@test.com`.toLowerCase(), // normalized
        direction: 'INBOUND'
      }
    });

    if (emailMessages.length === 1) {
      const em = emailMessages[0];
      console.log(`✅ Found exactly one INBOUND EmailMessage:`);
      console.log(`  ID: ${em.id}`);
      console.log(`  Message-ID: ${em.messageId}`);
      console.log(`  Direction: ${em.direction}`);
      console.log(`  Ticket ID: ${em.ticketId}`);
      console.log(`  Reply ID: ${em.replyId}`);
      if (em.ticketId === ticket.id) {
        console.log(`✅ EmailMessage correctly linked to ticket`);
      } else {
        console.log(`❌ EmailMessage not linked to correct ticket. Expected: ${ticket.id}, Got: ${em.ticketId}`);
        allChecksPassed = false;
      }
    } else {
      console.log(`❌ Expected exactly one INBOUND EmailMessage, found: ${emailMessages.length}`);
      allChecksPassed = false;
    }

    // Check that there are no duplicate EmailMessages with the same messageId
    const allMessages = await prisma.emailMessage.findMany({
      where: {
        messageId: `test-flow-${timestamp}@test.com`.toLowerCase()
      }
    });
    if (allMessages.length === 1) {
      console.log(`✅ No duplicate EmailMessages found for this messageId`);
    } else {
      console.log(`❌ Found ${allMessages.length} EmailMessages for this messageId (expected 1)`);
      allChecksPassed = false;
    }

    if (allChecksPassed) {
      console.log(`\n🎉 ALL CHECKS PASSED - Email-to-ticket workflow is working correctly for this test!`);
    } else {
      console.log(`\n❌ SOME CHECKS FAILED`);
    }
  } else {
    console.log(`❌ No new test tickets found - workflow may not be functioning`);
  }

  // Wait a bit more to simulate another polling interval and ensure no duplicate processing
  console.log('\n--- Waiting for duplicate processing check ---');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check again for any new tickets with the same sender email (should be none)
  const ticketsAfterWait = await prisma.ticket.findMany({
    where: {
      senderEmail: 'customer@test.com',
      createdAt: {
        gt: new Date(Date.now() - 15000) // Created in last 15 seconds
      }
    },
    select: {
      id: true,
      createdAt: true
    }
  });

  if (ticketsAfterWait.length === 1) {
    console.log(`✅ No duplicate tickets created after waiting (still only the original ticket)`);
  } else {
    console.log(`❌ Found ${ticketsAfterWait.length} tickets for sender after wait (expected 1)`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);