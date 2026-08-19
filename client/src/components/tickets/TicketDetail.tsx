import type { Ticket } from '@/types/ticket';
import { TicketStatus, TicketCategory, TicketPriority } from '@/types/ticket';
import { STATUS_LABELS, CATEGORY_LABELS, PRIORITY_LABELS, getStatusLabel, getCategoryLabel } from '@/utils/ticketUtils';

interface TicketDetailProps {
  ticket: Ticket;
  agents: Array<any>;
  className?: string;
}

export const TicketDetail: React.FC<TicketDetailProps> = ({
  ticket,
  agents,
  className = '',
}) => {
  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">{ticket.title}</h2>
        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
          <span>
            <strong>Ticket #:</strong> TKT-{String(ticket.ticketNumber ?? ticket.id.substring(0, 8)).padStart(5, '0')}
          </span>
          <span>
            <strong>Status:</strong>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[ticket.status as TicketStatus].color}`}>
              {getStatusLabel(ticket.status as TicketStatus)}
            </span>
          </span>
          <span>
            <strong>Priority:</strong>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_LABELS[ticket.priority as TicketPriority].color}`}>
              {PRIORITY_LABELS[ticket.priority as TicketPriority].label}
            </span>
          </span>
          <span>
            <strong>Category:</strong>
            {ticket.category ? (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                ticket.category === 'GENERAL_QUESTION' ? 'bg-violet-100 text-violet-700' :
                ticket.category === 'TECHNICAL_QUESTION' ? 'bg-blue-100 text-blue-700' :
                'bg-pink-100 text-pink-700'
              }`}>
                {getCategoryLabel(ticket.category as TicketCategory)}
              </span>
            ) : (
              <span className="text-xs text-slate-500 italic">—</span>
            )}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Sender Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Name</p>
            <p className="text-slate-900">{ticket.senderName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Email</p>
            <p className="text-slate-900 break-all">{ticket.senderEmail}</p>
          </div>
        </div>
      </div>

      {/* Assignee display */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Assignee</h3>

        {/* Current assignee display */}
        <div className="mb-2">
          {!ticket.assigneeId ? (
            <p className="text-xs text-slate-500 italic">Unassigned</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold" data-testid="assignee-avatar">
                {ticket.assigneeId
                  ? ticket.assigneeId.charAt(0).toUpperCase()
                  : '?'}
              </div>
              <span className="text-slate-900" data-testid="assignee-name">
                {agents.find((agent: any) => agent.id === ticket.assigneeId)?.name ||
                  (ticket.assigneeId + ' (not an agent)')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status display */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Status</h3>

        {/* Current status display */}
        <div className="mb-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[ticket.status as TicketStatus].color}`}>
            {STATUS_LABELS[ticket.status as TicketStatus].label}
          </span>
        </div>
      </div>

      {/* Category display */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Category</h3>

        {/* Current category display */}
        <div className="mb-2">
          {ticket.category ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              ticket.category === 'GENERAL_QUESTION' ? 'bg-violet-100 text-violet-700' :
              ticket.category === 'TECHNICAL_QUESTION' ? 'bg-blue-100 text-blue-700' :
              'bg-pink-100 text-pink-700'
            }`}>
              {CATEGORY_LABELS[ticket.category as TicketCategory]}
            </span>
          ) : (
            <span className="text-xs text-slate-500 italic">—</span>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Description</h3>
        <p className="text-slate-700 whitespace-pre-line">{ticket.description || 'No description provided'}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Timestamps</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Created At</p>
            <p className="text-slate-900">{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          {ticket.updatedAt && (
            <div>
              <p className="text-sm font-medium text-slate-700">Updated At</p>
              <p className="text-slate-900">{new Date(ticket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};