import type { Ticket } from '@/types/ticket';

interface TicketTableProps {
  tickets: Ticket[] | null;
}

export const TicketTable = ({ tickets }: TicketTableProps) => {
  if (!tickets || tickets.length === 0) {
    // expecting parent to handle empty/loading
    return null;
  }

  return (
    <table className="min-w-full">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            ID
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Subject
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Category
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Sender
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Created At
          </th>
          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50">
        {tickets.map((ticket) => (
          <tr key={ticket.id} className="hover:bg-slate-50/60 transition">
            <td className="px-6 py-4 text-sm font-medium text-slate-900">{ticket.id}</td>
            <td className="px-6 py-4 text-sm text-slate-600 line-clamp-1 max-w-48">{ticket.title}</td>
            <td className="px-6 py-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                ticket.status === 'OPEN'
                  ? 'bg-blue-100 text-blue-700'
                  : ticket.status === 'IN_PROGRESS'
                  ? 'bg-amber-100 text-amber-700'
                  : ticket.status === 'RESOLVED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {ticket.status}
              </span>
            </td>
            <td className="px-6 py-4">
              {ticket.category ? (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  ticket.category === 'GENERAL_QUESTION'
                    ? 'bg-violet-100 text-violet-700'
                    : ticket.category === 'TECHNICAL_QUESTION'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-pink-100 text-pink-700'
                }`}>
                  {ticket.category.replace('_', ' ')}
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">—</span>
              )}
            </td>
            <td className="px-6 py-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                  {ticket.senderName?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{ticket.senderName}</span>
              </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-500">
              {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </td>
            <td className="px-6 py-4 text-sm font-medium space-x-2">
              <button
                onClick={() => {
                  // TODO: navigate to ticket detail page
                  alert(`View ticket ${ticket.id}`);
                }}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-900 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4-1 1-4 9.5-9.5z"/>
                </svg>
                View
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};