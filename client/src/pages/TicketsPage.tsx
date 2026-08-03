import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../lib/auth-client';
import { fetchTickets, createTicket } from '../api';
import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TicketStatus, TicketCategory, TICKET_STATUSES, TICKET_CATEGORIES } from '../types/ticket';

const STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  [TicketStatus.OPEN]:        { label: 'Open',        color: 'bg-blue-100 text-blue-700' },
  [TicketStatus.IN_PROGRESS]: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  [TicketStatus.RESOLVED]:    { label: 'Resolved',    color: 'bg-emerald-100 text-emerald-700' },
  [TicketStatus.CLOSED]:      { label: 'Closed',      color: 'bg-slate-100 text-slate-600' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]:   'General Question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical Question',
  [TicketCategory.REFUND_REQUEST]:     'Refund Request',
};

const createTicketSchema = z.object({
  subject:     z.string().trim().min(3, 'Subject must be at least 3 characters'),
  body:        z.string().trim().optional(),
  senderName:  z.string().trim().min(1, 'Sender name is required'),
  senderEmail: z.string().email('Invalid email address'),
  category:    z.union([z.literal('GENERAL_QUESTION'), z.literal('TECHNICAL_QUESTION'), z.literal('REFUND_REQUEST')]).optional(),
  status:      z.union([z.literal('OPEN'), z.literal('IN_PROGRESS'), z.literal('RESOLVED'), z.literal('CLOSED')]).default('OPEN'),
});

function CreateTicketModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { subject: '', body: '', senderName: '', senderEmail: '', category: undefined, status: 'OPEN' as TicketStatus },
  });
  const [apiError, setApiError] = useState('');

  const onSubmit = async (data: z.infer<typeof createTicketSchema>) => {
    setApiError('');
    try {
      await createTicket(data);
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      setApiError(err.response?.data?.error || 'Failed to create ticket');
    }
  };

  const handleClose = () => { reset(); setApiError(''); onClose(); };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-slate-900">New Ticket</h2>
          <button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {apiError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">{apiError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject</label>
            <input
              {...register('subject')}
              placeholder="Describe the issue briefly"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${errors.subject ? 'border-red-300' : 'border-slate-200'}`}
            />
            {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Body <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('body')}
              rows={4}
              placeholder="Add more details..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sender Name</label>
              <input
                {...register('senderName')}
                placeholder="John Doe"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${errors.senderName ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errors.senderName && <p className="mt-1 text-xs text-red-600">{errors.senderName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sender Email</label>
              <input
                {...register('senderEmail')}
                type="email"
                placeholder="john@example.com"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${errors.senderEmail ? 'border-red-300' : 'border-slate-200'}`}
              />
              {errors.senderEmail && <p className="mt-1 text-xs text-red-600">{errors.senderEmail.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category <span className="text-slate-400 font-normal">(optional)</span></label>
              <select
                {...register('category')}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              >
                <option value="">— None —</option>
                {TICKET_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                {...register('status')}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              >
                {TICKET_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl transition shadow-sm shadow-violet-200">
              {isSubmitting ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TicketsPage() {
  const { data: session, isPending: authPending } = authClient.useSession();
  const enabled = !authPending && !!session;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleClose = useCallback(() => setIsModalOpen(false), []);

  const { data: tickets, isLoading, isError, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetchTickets(),
    enabled,
  });

  const sortedTickets: any[] = tickets
    ? [...tickets].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  if (authPending) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          Failed to load tickets: {(error as any)?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tickets</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {tickets ? `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Ticket
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sortedTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No tickets yet</p>
              <p className="text-xs text-slate-500 mt-1">Create your first ticket to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Subject</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sender</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned To</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedTickets.map((ticket: any) => {
                    const status = STATUS_LABELS[ticket.status] ?? { label: ticket.status, color: 'bg-slate-100 text-slate-600' };
                    const category = ticket.category ? (CATEGORY_LABELS[ticket.category] ?? ticket.category) : null;
                    const created = new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    const updated = new Date(ticket.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50 transition">
                        <td className="px-5 py-4 text-xs text-slate-400 font-mono">#{ticket.id}</td>
                        <td className="px-5 py-4 max-w-xs">
                          <p className="font-medium text-slate-900 truncate">{ticket.subject}</p>
                          {ticket.body && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{ticket.body}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-slate-900 text-xs font-medium">{ticket.senderName}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{ticket.senderEmail}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {category ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-500">
                          {ticket.assignedTo ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{created}</td>
                        <td className="px-5 py-4 text-xs text-slate-400 whitespace-nowrap">{updated}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      <CreateTicketModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })}
      />
    </div>
  );
}
