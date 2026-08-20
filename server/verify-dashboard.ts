import { PrismaClient } from "./src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DATABASE_URL = "postgresql://postgres:230023107062@localhost:5432/helpdesk?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });

async function main() {
  // Total tickets
  const totalTickets = await prisma.ticket.count();
  console.log("Total tickets:", totalTickets);

  // Open tickets
  const openTickets = await prisma.ticket.count({
    where: { status: { in: ["NEW", "PROCESSING", "OPEN", "IN_PROGRESS"] } },
  });
  console.log("Open tickets:", openTickets);

  // AI resolved
  const aiResolvedTickets = await prisma.ticket.count({ where: { resolvedByAI: true } });
  console.log("AI resolved tickets:", aiResolvedTickets);

  // AI %
  const aiResolvedPercentage = totalTickets > 0 ? (aiResolvedTickets / totalTickets) * 100 : 0;
  console.log("AI resolution %:", Math.round(aiResolvedPercentage * 100) / 100);

  // Average resolution time
  const resolvedTickets = await prisma.ticket.findMany({
    where: { resolvedAt: { not: null } },
    select: { createdAt: true, resolvedAt: true },
  });
  let avgTime = 0;
  if (resolvedTickets.length > 0) {
    const totalMs = resolvedTickets.reduce((sum, t) => {
      const created = new Date(t.createdAt).getTime();
      const resolved = new Date(t.resolvedAt!).getTime();
      return sum + Math.max(0, resolved - created);
    }, 0);
    avgTime = totalMs / resolvedTickets.length / (1000 * 60 * 60);
  }
  console.log("Average resolution time (hours):", Math.round(avgTime * 100) / 100);

  // 30-day chart
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 29);

  const ticketGroups = await prisma.ticket.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: startDate } },
    _count: { _all: true },
  });

  const countByDay = new Map<string, number>();
  for (const group of ticketGroups) {
    const d = new Date(group.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split("T")[0];
    countByDay.set(key, (countByDay.get(key) || 0) + group._count._all);
  }

  const ticketsPerDay: { date: string; count: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);
    const key = day.toISOString().split("T")[0];
    ticketsPerDay.push({ date: key, count: countByDay.get(key) || 0 });
  }

  console.log("\n30-day chart data:");
  console.log("Total days:", ticketsPerDay.length);
  console.log("First day:", ticketsPerDay[0].date, "count:", ticketsPerDay[0].count);
  console.log("Last day:", ticketsPerDay[29].date, "count:", ticketsPerDay[29].count);
  const zeroDays = ticketsPerDay.filter(d => d.count === 0).length;
  console.log("Zero-ticket days:", zeroDays);
  const nonZeroDays = ticketsPerDay.filter(d => d.count > 0).length;
  console.log("Non-zero days:", nonZeroDays);

  // Verify chronological order
  let isChronological = true;
  for (let i = 1; i < ticketsPerDay.length; i++) {
    if (ticketsPerDay[i].date <= ticketsPerDay[i-1].date) {
      isChronological = false;
      break;
    }
  }
  console.log("Chronological order:", isChronological);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());