import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is not set");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

async function main() {
  // Check first test ticket
  const t1 = await prisma.ticket.findUnique({ where: { id: "57231b5a-4943-4fbd-a555-b2e634346302" } });
  console.log("First ticket (refund):");
  console.log("  Status:", t1?.status);
  console.log("  AssigneeId:", t1?.assigneeId);
  console.log("  ResolvedByAI:", t1?.resolvedByAI);
  console.log("  ResolvedAt:", t1?.resolvedAt);

  // Check second test ticket
  const t2 = await prisma.ticket.findUnique({ where: { id: "db06f98f-da46-4e32-8e39-0931b679d5b9" } });
  console.log("\nSecond ticket (non-resolvable):");
  console.log("  Status:", t2?.status);
  console.log("  AssigneeId:", t2?.assigneeId);
  console.log("  ResolvedByAI:", t2?.resolvedByAI);

  // Check AI agent
  const ai = await prisma.user.findUnique({ where: { email: "ai@helpdesk.local" } });
  console.log("\nAI agent:", ai?.name, ai?.email, ai?.role);

  // Check dashboard stats
  const total = await prisma.ticket.count();
  const open = await prisma.ticket.count({ where: { status: { in: ["NEW", "PROCESSING", "OPEN", "IN_PROGRESS"] } } });
  const aiResolved = await prisma.ticket.count({ where: { resolvedByAI: true } });
  console.log("\nDashboard stats:");
  console.log("  Total tickets:", total);
  console.log("  Open tickets:", open);
  console.log("  AI resolved:", aiResolved);
  console.log("  AI %:", total > 0 ? ((aiResolved / total) * 100).toFixed(1) : 0);

  // Check 30-day chart
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);
  const groups = await prisma.ticket.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: startDate } },
    _count: { _all: true },
  });
  console.log("  Days with tickets in last 30 days:", groups.length);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());