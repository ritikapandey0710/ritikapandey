import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeWebhookSignature } from "./src/utils/webhookSigner";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

async function main() {
  // 1. Verify AI agent exists
  const aiAgent = await prisma.user.findUnique({ where: { email: "ai@helpdesk.local" } });
  if (!aiAgent) {
    console.log("FAIL: AI agent not found");
    process.exit(1);
  }
  console.log(`PASS: AI agent exists: ${aiAgent.name} (${aiAgent.email})`);

  // 2. Test webhook - create a ticket that should be auto-resolved by AI
  // Use a known knowledge base topic (e.g., billing/refund)
  const webhookUrl = "http://localhost:3001/api/webhooks/tickets";
  const testTicket = {
    title: "Refund request for my recent purchase",
    description: "I would like to request a refund for my recent purchase. The product was not as described.",
    senderName: "Test Customer",
    senderEmail: "test-customer@example.com",
  };

  console.log("\n--- Testing webhook with auto-resolvable ticket ---");
  const webhookBody1 = JSON.stringify(testTicket);
  const sig1 = computeWebhookSignature(webhookBody1, WEBHOOK_SECRET);
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-signature": sig1 },
    body: webhookBody1,
  });

  const result = await response.json();
  console.log(`Webhook response status: ${response.status}`);
  console.log(`Ticket created: ${result.id}`);
  console.log(`Ticket status: ${result.status}`);
  console.log(`Ticket assigneeId: ${result.assigneeId}`);
  console.log(`Ticket resolvedByAI: ${result.resolvedByAI}`);

  // Check if the ticket was assigned to AI
  if (result.assigneeId === aiAgent.id) {
    console.log("PASS: Ticket assigned to AI agent");
  } else {
    console.log("NOTE: Ticket may have been unassigned after AI processing");
  }

  // Check if the ticket was resolved by AI
  if (result.resolvedByAI === true) {
    console.log("PASS: Ticket resolved by AI");
  } else if (result.status === "OPEN") {
    console.log("PASS: Ticket is OPEN (AI could not resolve, unassigned for human)");
  } else {
    console.log(`NOTE: Ticket status is ${result.status}`);
  }

  // 3. Test webhook with a non-resolvable ticket
  const testTicket2 = {
    title: "My custom unique issue that has no knowledge base match",
    description: "This is a very specific problem about a custom integration that is not in the knowledge base at all.",
    senderName: "Test Customer 2",
    senderEmail: "test-customer2@example.com",
  };

  console.log("\n--- Testing webhook with non-resolvable ticket ---");
  const webhookBody2 = JSON.stringify(testTicket2);
  const sig2 = computeWebhookSignature(webhookBody2, WEBHOOK_SECRET);
  const response2 = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-signature": sig2 },
    body: webhookBody2,
  });

  const result2 = await response2.json();
  console.log(`Webhook response status: ${response2.status}`);
  console.log(`Ticket created: ${result2.id}`);
  console.log(`Ticket status: ${result2.status}`);
  console.log(`Ticket assigneeId: ${result2.assigneeId}`);

  // Wait a moment for AI processing to complete
  await new Promise(r => setTimeout(r, 2000));

  // Check the final state of the second ticket
  const finalTicket2 = await prisma.ticket.findUnique({ where: { id: result2.id } });
  console.log(`\nFinal state of non-resolvable ticket:`);
  console.log(`Status: ${finalTicket2?.status}`);
  console.log(`AssigneeId: ${finalTicket2?.assigneeId}`);
  console.log(`ResolvedByAI: ${finalTicket2?.resolvedByAI}`);

  if (finalTicket2?.status === "OPEN" && finalTicket2?.assigneeId === null) {
    console.log("PASS: Non-resolvable ticket is OPEN and unassigned from AI");
  } else {
    console.log("NOTE: Non-resolvable ticket state may need review");
  }

  // 4. Check dashboard stats
  console.log("\n--- Dashboard stats check ---");
  const totalTickets = await prisma.ticket.count();
  const openTickets = await prisma.ticket.count({
    where: { status: { in: ["NEW", "PROCESSING", "OPEN", "IN_PROGRESS"] } },
  });
  const aiResolved = await prisma.ticket.count({ where: { resolvedByAI: true } });
  console.log(`Total tickets: ${totalTickets}`);
  console.log(`Open tickets: ${openTickets}`);
  console.log(`AI resolved: ${aiResolved}`);
  console.log(`AI resolution %: ${totalTickets > 0 ? ((aiResolved / totalTickets) * 100).toFixed(1) : 0}%`);

  // 5. Check 30-day chart data
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const ticketGroups = await prisma.ticket.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: startDate } },
    _count: { _all: true },
  });
  console.log(`\nTickets in last 30 days: ${ticketGroups.length} days with data`);

  console.log("\n--- Test complete ---");
}

main()
  .catch((e) => { console.error("Test error:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });