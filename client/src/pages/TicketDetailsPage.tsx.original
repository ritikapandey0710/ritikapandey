import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../lib/auth-client';
import { fetchTicketById, updateTicket, fetchUsers } from '../api';
import { TicketStatus, TicketCategory, TicketPriority } from '../types/ticket';
import { UserRole } from '@/types/role';
import type { AuthUser } from '@/types/user';
import { useState, useEffect } from 'react';

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

const PRIORITY_LABELS: Record<TicketPriority, { label: string; color: string }> = {
  [TicketPriority.LOW]:      { label: 'Low',      color: 'bg-green-100 text-green-700' },
  [TicketPriority.MEDIUM]:   { label: 'Medium',   color: 'bg-yellow-100 text-yellow-700' },
  [TicketPriority.HIGH]:     { label: 'High',     color: 'bg-orange-100 text-orange-700' },
  [TicketPriority.URGENT]:   { label: 'Urgent',   color: 'bg-red-100 text-red-700' },
};

// Arrays for select options iteration
const TICKET_STATUSES: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];
const TICKET_CATEGORIES: TicketCategory[] = [TicketCategory.GENERAL_QUESTION, TicketCategory.TECHNICAL_QUESTION, TicketCategory.REFUND_REQUEST];

// Helper functions to get labels (explicit assignment instead of regex/object lookup)
const getStatusLabel = (status: TicketStatus): string => {
  switch (status) {
    case TicketStatus.OPEN: return 'Open';
    case TicketStatus.IN_PROGRESS: return 'In Progress';
    case TicketStatus.RESOLVED: return 'Resolved';
    case TicketStatus.CLOSED: return 'Closed';
    default: return '';
  }
};

const getCategoryLabel = (category: TicketCategory): string => {
  switch (category) {
    case TicketCategory.GENERAL_QUESTION: return 'General Question';
    case TicketCategory.TECHNICAL_QUESTION: return 'Technical Question';
    case TicketCategory.REFUND_REQUEST: return 'Refund Request';
    default: return '';
  }
};

export default function TicketDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const user = session?.user as AuthUser | undefined;
  const isAdmin = user?.role === UserRole.ADMIN;

  const { data: ticket, isLoading, isError, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicketById(id!),
    enabled: !!id,
  });

  // State for editing fields
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | ''>('');
  const [selectedCategory, setSelectedCategory] = useState<TicketCategory | ''>('');
  const [agents, setAgents] = useState<Array<any>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Fetch agents (users with AGENT role) when component mounts or ticket changes
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const users = await fetchUsers();
        // Filter to only include agents (users with AGENT role)
        const agentUsers = users.filter((user: any) => user.role === UserRole.AGENT);
        setAgents(agentUsers);
      } catch (err) {
        console.error('Error fetching agents:', err);
        // We'll still allow the page to load, just with empty agents list
        setAgents([]);
      }
    };

    fetchAgents();
  }, []); // Empty deps - run once on mount

  // Set initial values when ticket loads
  useEffect(() => {
    if (ticket) {
      setSelectedAssignee(ticket.assigneeId || '');
      setSelectedStatus((ticket.status ?? '') as TicketStatus | '');
      setSelectedCategory((ticket.category ?? '') as TicketCategory | '');
    }
  }, [ticket]);

  const handleBack = () => {
    navigate(-1); // Go back to previous page
  };

  const handleSaveChanges = async () => {
    // Guard clause: only admins can update tickets
    if (!isAdmin) {
      setSaveError('Only administrators can update tickets');
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateTicket(id!, {
        assigneeId: selectedAssignee || undefined,
        status: selectedStatus as TicketStatus || undefined,
        category: selectedCategory === '' ? null : (selectedCategory as TicketCategory || undefined),
      });
      setSaveSuccess(true);
      // Refetch the ticket to show updated values
      await queryClient.invalidateQueries({ queryKey: ['ticket', id!] });
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Failed to update ticket');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" data-testid="loading-indicator" />
      </div>
    );
  }

  // Removed the session check because we are using PrivateRoute
  // if (!authClient.useSession().data) {
  //   return null; // or redirect to login? but we are using PrivateRoute in App.tsx
  // }

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          Failed to load ticket: {(error as any)?.message || 'Unknown error'}
        </div>
        <div className="mt-4">
          <button onClick={handleBack} className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          Ticket not found
        </div>
        <div className="mt-4">
          <button onClick={handleBack} className="px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tickets
          </button>
          <h1 className="text-xl font-bold text-slate-900">Ticket Details</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="p-6">
            <div className="mb-4">
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

            <div className="grid grid-cols-12 gap-6">
              {/* Left Column - Display Information (spans 8 columns) */}
              <div className="col-span-8">
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
                  <p className="text-slate-700 whitespace-pre-line">{ticket.body || 'No description provided'}</p>
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

              {/* Right Column - Edit Controls (spans 4 columns) */}
              <div className="col-span-4">
                {/* Assignee controls (only show if we have agents and user is admin) */}
                {agents.length > 0 && isAdmin && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Assignee</h3>

                    <div className="mb-2 flex flex-col gap-1">
                      <label htmlFor="assign-to-select" className="text-sm font-medium text-slate-700">Assign to:</label>
                      <select
                        id="assign-to-select"
                        value={selectedAssignee}
                        onChange={(e) => setSelectedAssignee(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
                      >
                        <option value="">Unassigned</option>
                        {agents.map((agent: any) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {saveError && (
                      <p className="mt-1 text-xs text-red-600">{saveError}</p>
                    )}
                    {saveSuccess && (
                      <p className="mt-1 text-xs text-green-600">Changes saved successfully!</p>
                    )}

                    {!isSaving && (
                      <button
                        onClick={handleSaveChanges}
                        className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    )}
                    {isSaving && (
                      <button className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200" disabled>
                        Saving...
                      </button>
                    )}
                  </div>
                )}

                {/* Show message when no agents available (only for admins) */}
                {agents.length === 0 && isAdmin && (
                  <div className="mb-6">
                    <p className="mt-2 text-xs text-slate-500 italic">
                      No agents available to assign
                    </p>
                  </div>
                )}

                {/* Status controls (only show if user is admin) */}
                {isAdmin && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Status</h3>

                    <div className="mb-2 flex flex-col gap-1">
                      <label htmlFor="status-select" className="text-sm font-medium text-slate-700">Status:</label>
                      <select
                        id="status-select"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as TicketStatus)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
                      >
                        {TICKET_STATUSES.map((status: TicketStatus) => (
                          <option key={status} value={status}>
                            {getStatusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {saveError && (
                      <p className="mt-1 text-xs text-red-600">{saveError}</p>
                    )}
                    {saveSuccess && (
                      <p className="mt-1 text-xs text-green-600">Changes saved successfully!</p>
                    )}

                    {!isSaving && (
                      <button
                        onClick={handleSaveChanges}
                        className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    )}
                    {isSaving && (
                      <button className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200" disabled>
                        Saving...
                      </button>
                    )}
                  </div>
                )}

                {/* Category controls (only show if user is admin) */}
                {isAdmin && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Category</h3>

                    <div className="mb-2 flex flex-col gap-1">
                      <label htmlFor="category-select" className="text-sm font-medium text-slate-700">Category:</label>
                      <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value as TicketCategory)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
                      >
                        <option value="">— None —</option>
                        {TICKET_CATEGORIES.map((category: TicketCategory) => (
                          <option key={category} value={category}>
                            {getCategoryLabel(category)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {saveError && (
                      <p className="mt-1 text-xs text-red-600">{saveError}</p>
                    )}
                    {saveSuccess && (
                      <p className="mt-1 text-xs text-green-600">Changes saved successfully!</p>
                    )}

                    {!isSaving && (
                      <button
                        onClick={handleSaveChanges}
                        className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    )}
                    {isSaving && (
                      <button className="mt-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200" disabled>
                        Saving...
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}