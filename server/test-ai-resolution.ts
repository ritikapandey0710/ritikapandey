 import "dotenv/config";
import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeWebhookSignature } from "./src/utils/webhookSigner";

const DATABASE_URL = "postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

async function main() {
  const webhookUrl = "http://localhost:3001/api/webhooks/tickets";

  // Test with a ticket that closely matches the refund KB entry
  const testTicket = {
    title: "Refund request - order refund due to dissatisfaction with product",
    description: "I want my money back for this order. I am requesting a refund due to dissatisfaction with the product. Please return funds to my original payment method.",
    senderName: "Refund Customer",
    senderEmail: "refund-customer@example.com",
  };

  console.log("--- Testing webhook with strongly matching refund ticket ---");
  const webhookBody = JSON.stringify(testTicket);
  const sig = computeWebhookSignature(webhookBody, WEBHOOK_SECRET);
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-webhook-signature": sig },
    body: webhookBody,
  });

  const result = await response.json();
  console.log(`Webhook response status: ${response.status}`);
  console.log(`Ticket created: ${result.id}`);
  console.log(`Ticket status: ${result.status}`);
  console.log(`Ticket assigneeId: ${result.assigneeId}`);
  console.log(`Ticket resolvedByAI: ${result.resolvedByAI}`);

  // Check the final state in DB
  const finalTicket = await prisma.ticket.findUnique({ where: { id: result.id } });
  console.log(`\nFinal state in DB:`);
  console.log(`Status: ${finalTicket?.status}`);
  console.log(`AssigneeId: ${finalTicket?.assigneeId}`);
  console.log(`ResolvedByAI: ${finalTicket?.resolvedByAI}`);
  console.log(`ResolvedAt: ${finalTicket?.resolvedAt}`);

  if (finalTicket?.status === "RESOLVED" && finalTicket?.resolvedByAI === true) {
    console.log("\nPASS: Ticket successfully resolved by AI");
  } else {
    console.log("\nNOTE: Ticket was not resolved by AI");
  }

  // Check dashboard stats after this
  const total = await prisma.ticket.count();
  const aiResolved = await prisma.ticket.count({ where: { resolvedByAI: true } });
  console.log(`\nDashboard: Total=${total}, AI Resolved=${aiResolved}, AI%=${total > 0 ? ((aiResolved / total) * 100).toFixed(1) : 0}%`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());