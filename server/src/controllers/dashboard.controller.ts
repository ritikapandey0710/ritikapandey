import { prisma } from "../lib/prisma";

interface DashboardStatsRow {
  total_tickets: bigint;
  open_tickets: bigint;
  resolved_by_ai: bigint;
  resolved_by_ai_percentage: number;
  avg_resolution_time: number;
  tickets_per_day: { date: string; count: number }[];
}

export async function getDashboardStats(req: any, res: any) {
  // Call the database stored function which is the single authoritative
  // source for all dashboard statistics.
  const result = await prisma.$queryRaw<DashboardStatsRow[]>`
    SELECT * FROM get_dashboard_stats()
  `;

  const row = result[0];

  res.json({
    totalTickets: Number(row.total_tickets),
    openTickets: Number(row.open_tickets),
    aiResolvedTickets: Number(row.resolved_by_ai),
    aiResolvedPercentage: Number(row.resolved_by_ai_percentage),
    averageResolutionTime: Number(row.avg_resolution_time),
    ticketsPerDay: row.tickets_per_day,
  });
}