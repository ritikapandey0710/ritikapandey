import { authClient } from '@/lib/auth-client';
import { fetchTickets } from '@/api';
import { useQuery } from '@tanstack/react-query';
import type { Ticket } from '@/types/ticket';
import { TicketTable } from '@/components/TicketTable';
import { Link } from 'react-router-dom';

export default function TicketListPage() {
  const { data: session, isPending } = authClient.useSession();
  const enabled = !isPending && !!session;

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetchTickets(),
    enabled,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <div>Please log in to view tickets.</div>;
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-600">
        <p>Error loading tickets: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <Link to="/tickets/new" className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 transition">
            New Ticket
          </Link>
        </div>

        {TicketTable({ tickets: tickets as Ticket[] | null })}
      </div>
    </div>
  );
}