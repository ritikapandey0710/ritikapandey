import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../lib/auth-client';
import {
  fetchTicketById,
  updateTicket,
  fetchUsers,
  fetchRepliesByTicketId,
  createReply,
} from '../api';
import { TicketStatus, TicketCategory, TicketPriority } from '../types/ticket';
import { UserRole } from '@/types/role';
import type { AuthUser } from '@/types/user';
import { useState, useEffect } from 'react';
import {
  STATUS_LABELS,
  PRIORITY_LABELS,
  getStatusLabel,
  getCategoryLabel,
} from '@/utils/ticketUtils';
import UpdateTicket from '../components/UpdateTicket';
import { ReplyThread } from '../components/ReplyThread';
import { ReplyForm } from '../components/ReplyForm';
import { ChevronLeft } from 'lucide-react';

// Local category badge color classes (preserved for test compatibility)
const CATEGORY_BADGE: Record<string, string> = {
  GENERAL_QUESTION: 'bg-violet-100 text-violet-700',
  TECHNICAL_QUESTION: 'bg-blue-100 text-blue-700',
  REFUND_REQUEST: 'bg-pink-100 text-pink-700',
};

export default function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending } = authClient.useSession();

  // Handle loading state
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div
          className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"
          data-testid="loading-indicator"
        />
      </div>
    );
  }

  // Handle unauthenticated state
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="text-center">
          <p className="mb-4 text-slate-600">Please log in to view ticket details</p>
          <a
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  const user = session?.user as AuthUser | undefined;
  const isAdmin = user?.role === UserRole.ADMIN;

  // Fetch ticket
  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketById(id!),
    enabled: !!id && !!session,
  });

  // Fetch replies
  const {
    data: replies,
    isLoading: isRepliesLoading,
    isError: isRepliesError,
    error: repliesError,
  } = useQuery({
    queryKey: ['replies', id],
    queryFn: () => fetchRepliesByTicketId(id!),
    enabled: !!id && !!session,
  });

  // Fetch agents
  const [agents, setAgents] = useState<Array<any>>([]);
  // Reply submission state
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchAgents = async () => {
      if (!session) {
        setAgents([]);
        return;
      }
      try {
        const users = await fetchUsers();
        const agentUsers = users.filter((u: any) => u.role === UserRole.AGENT);
        setAgents(agentUsers);
      } catch (err) {
        setAgents([]);
      }
    };
    fetchAgents();
  }, [session]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSaveChanges = async (payload: {
    assigneeId?: string | null;
    status?: TicketStatus;
    category?: TicketCategory | null;
  }) => {
    await updateTicket(id!, payload);
    await queryClient.invalidateQueries({ queryKey: ['ticket', id!] });
  };

  const handleReplySubmit = async (replyBody: string) => {
    setReplyError(null);
    setReplySuccess(false);
    setIsSubmittingReply(true);
    try {
      await createReply(id!, { body: replyBody });
      queryClient.invalidateQueries({ queryKey: ['replies', id] });
      setReplySuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to create reply';
      setReplyError(msg);
      throw err;
    } finally {
      setIsSubmittingReply(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div
          className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"
          data-testid="loading-indicator"
        />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          Failed to load ticket: {(error as any)?.message || 'Unknown error'}
        </div>
        <button
          onClick={handleBack}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          Ticket not found
        </div>
        <button
          onClick={handleBack}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Tickets
          </button>
          <h1 className="text-xl font-bold text-slate-900">Ticket Details</h1>
        </div>

        {/* Ticket details card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            {/* Title + meta */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {ticket.title}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                <span>
                  <strong>Ticket #:</strong>{' '}
                  TKT-{(ticket.ticketNumber ?? 0).toString().padStart(5, '0')}
                </span>
                <span>
                  <strong>Status:</strong>{' '}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[ticket.status as TicketStatus].color}`}
                  >
                    {getStatusLabel(ticket.status as TicketStatus)}
                  </span>
                </span>
                <span>
                  <strong>Priority:</strong>{' '}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_LABELS[ticket.priority as TicketPriority].color}`}
                  >
                    {PRIORITY_LABELS[ticket.priority as TicketPriority].label}
                  </span>
                </span>
                <span>
                  <strong>Category:</strong>{' '}
                  {ticket.category ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_BADGE[ticket.category]}`}
                    >
                      {getCategoryLabel(ticket.category as TicketCategory)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">&mdash;</span>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Display Information */}
              <div className="col-span-12 lg:col-span-8">
                {/* Sender Information */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    Sender Information
                  </h3>
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
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    Assignee
                  </h3>
                  {!ticket.assigneeId ? (
                    <p className="text-xs text-slate-500 italic">Unassigned</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold"
                        data-testid="assignee-avatar"
                      >
                        {ticket.assigneeId
                          ? ticket.assigneeId.charAt(0).toUpperCase()
                          : '?'}
                      </div>
                      <span
                        className="text-slate-900"
                        data-testid="assignee-name"
                      >
                        {agents.find(
                          (agent: any) => agent.id === ticket.assigneeId
                        )?.name || (ticket.assigneeId + ' (not an agent)')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status display */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    Status
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[ticket.status as TicketStatus].color}`}
                  >
                    {getStatusLabel(ticket.status as TicketStatus)}
                  </span>
                </div>

                {/* Category display */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    Category
                  </h3>
                  {ticket.category ? (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${CATEGORY_BADGE[ticket.category]}`}
                    >
                      {getCategoryLabel(ticket.category as TicketCategory)}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500 italic">&mdash;</span>
                  )}
                </div>

                {/* Description */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    Description
                  </h3>
                  <p className="text-slate-700 whitespace-pre-line">
                    {ticket.body || 'No description provided'}
                  </p>
                </div>

                {/* Timestamps */}
                <div className="mb-6">
                  <h3 className="text-base font-semibold text-slate-900 mb-2">
                    Timestamps
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        Created At
                      </p>
                      <p className="text-slate-900">
                        {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {ticket.updatedAt && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          Updated At
                        </p>
                        <p className="text-slate-900">
                          {new Date(ticket.updatedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Edit Controls */}
              <div className="col-span-12 lg:col-span-4">
                {isAdmin && (
                  <UpdateTicket
                    originalTicket={ticket}
                    agents={agents}
                    onSave={handleSaveChanges}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reply section */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="text-base font-semibold text-slate-900 mb-4">Replies</h3>
          <ReplyThread
            replies={replies}
            isLoading={isRepliesLoading}
            error={
              isRepliesError
                ? (repliesError as Error)?.message ?? 'Failed to load replies'
                : null
            }
          />
          <div data-testid="reply-composer" className="mt-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              Write a Reply
            </h3>
            <ReplyForm
              onSubmit={handleReplySubmit}
              isSubmitting={isSubmittingReply}
              submitError={replyError}
              submitSuccess={replySuccess}
              ticketId={ticket.id}
              customerName={ticket.senderName}
              subject={ticket.title}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
