import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../lib/auth-client';
import { fetchTickets, createTicket } from '../api';
import { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TicketStatus, TicketCategory, TicketPriority, TICKET_STATUSES, TICKET_CATEGORIES, TICKET_PRIORITIES } from '../types/ticket';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type FilterFnOption,
  type SortingState,
  type Updater,
} from '@tanstack/react-table';

const STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  [TicketStatus.OPEN]: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  [TicketStatus.IN_PROGRESS]: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  [TicketStatus.RESOLVED]: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
  [TicketStatus.CLOSED]: { label: 'Closed', color: 'bg-slate-100 text-slate-600' },
};

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General Question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical Question',
  [TicketCategory.REFUND_REQUEST]: 'Refund Request',
};

const PRIORITY_LABELS: Record<TicketPriority, { label: string; color: string }> = {
  [TicketPriority.LOW]: { label: 'Low', color: 'bg-green-100 text-green-700' },
  [TicketPriority.MEDIUM]: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  [TicketPriority.HIGH]: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  [TicketPriority.URGENT]: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};

const createTicketSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  body: z.string().trim().optional(),
  senderName: z.string().trim().min(1, 'Sender name is required'),
  senderEmail: z.string().email('Invalid email address'),
  category: z.preprocess((v) => (v === '' ? undefined : v), z.union([z.literal('GENERAL_QUESTION'), z.literal('TECHNICAL_QUESTION'), z.literal('REFUND_REQUEST')]).optional()),
  status: z.union([z.literal('OPEN'), z.literal('IN_PROGRESS'), z.literal('RESOLVED'), z.literal('CLOSED')]).default('OPEN' as TicketStatus),
});

function CreateTicketModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { title: '', body: '', senderName: '', senderEmail: '', category: undefined, status: 'OPEN' as TicketStatus },
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
            <input
              {...register('title')}
              placeholder="Describe the issue briefly"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${errors.title ? 'border-red-300' : 'border-slate-200'}"
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
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
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${errors.senderName ? 'border-red-300' : 'border-slate-200'}"
              />
              {errors.senderName && <p className="mt-1 text-xs text-red-600">{errors.senderName.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Sender Email</label>
              <input
                {...register('senderEmail')}
                type="email"
                placeholder="john@example.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${errors.senderEmail ? 'border-red-300' : 'border-slate-200'}"
              />
              {errors.senderEmail && <p className="mt-1 text-xs text-red-600">{errors.senderEmail.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category <span className="text-slate-400 font-normal">(optional)</span></label>
              <select
                {...register('category')}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
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
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
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

// Custom filter functions for TanStack Table (column filters + global search)
const filterFns: Record<string, FilterFn<any>> = {
  equals: (row, id, filterValue) => {
    if (filterValue === '' || filterValue == null) return true;
    return row.getValue(id) === filterValue;
  },
  categoryMatch: (row, id, filterValue) => {
    if (filterValue === '' || filterValue == null) return true;
    const cellVal = row.getValue(id);
    if (filterValue === '__NONE__') return cellVal == null || cellVal === '';
    return cellVal === filterValue;
  },
  assigneeMatch: (row, id, filterValue) => {
    if (filterValue === '' || filterValue == null) return true;
    const cellVal = row.getValue(id);
    if (filterValue === '__UNASSIGNED__') return cellVal == null || cellVal === '';
    // Column accessorFn returns the assignee's display name (from the related User)
    return cellVal === filterValue;
  },
  createdDate: (row, id, filterValue) => {
    if (filterValue === '' || filterValue == null) return true;
    const raw = row.getValue(id);
    if (!raw) return false;
    const d = new Date(raw as string);
    const now = new Date();
    if (filterValue === 'today') return d.toDateString() === now.toDateString();
    if (filterValue === 'last7') { const cut = new Date(); cut.setDate(cut.getDate() - 7); return d >= cut; }
    if (filterValue === 'last30') { const cut = new Date(); cut.setDate(cut.getDate() - 30); return d >= cut; }
    return true;
  },
  globalSearch: (row, _id, filterValue) => {
    const q = String(filterValue ?? '').toLowerCase();
    if (!q) return true;
    const original = row.original as any;
    const ticketNum = original?.ticketNumber != null ? String(original.ticketNumber) : '';
    const title = String(original?.title || '');
    const sender = String(
      original?.user_Ticket_reporterIdTouser?.name ?? original?.senderName ?? ''
    );
    const assignee = String(
      original?.user_Ticket_assigneeIdTouser?.name ?? original?.assigneeId ?? ''
    );
    const id = String(original?.id || '');
    return (
      `TKT-${ticketNum.padStart(5, '0')}`.toLowerCase().includes(q) ||
      ticketNum.toLowerCase().includes(q) ||
      title.toLowerCase().includes(q) ||
      sender.toLowerCase().includes(q) ||
      assignee.toLowerCase().includes(q) ||
      id.toLowerCase().includes(q)
    );
  },
};

// Helper to cast filter fn name for ColumnDef typing
const filterOpt = (name: string): FilterFnOption<any> => name as any;

export default function TicketsPage() {
  const { data: session, isPending: authPending } = authClient.useSession();
  const enabled = !authPending && !!session;
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleClose = useCallback(() => setIsModalOpen(false), []);

  // Table state for sorting
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleSortChange = useCallback((columnId: string) => {
    setSorting((prev) => {
      const isAlreadySorted = prev.some((s) => s.id === columnId);
      if (isAlreadySorted) {
        // Toggle direction
        return prev.map((s) =>
          s.id === columnId ? { ...s, desc: !s.desc } : s
        );
      } else {
        // New sort: ascending by default
        return [{ id: columnId, desc: false }];
      }
    });
  }, []);

  // Fetch tickets
  const { data: tickets, isLoading, isError, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => fetchTickets({}),
    enabled,
  });

  // ---- Filter state (client-side, does NOT refetch) ----
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Derive available categories & assignees from the loaded ticket data
  const availableCategories = useMemo(() => {
    if (!tickets) return [];
    const set = new Set<string>();
    tickets.forEach((t: any) => { if (t.category) set.add(t.category); });
    return Array.from(set);
  }, [tickets]);

  const availableAssignees = useMemo(() => {
    if (!tickets) return [];
    const set = new Set<string>();
    tickets.forEach((t: any) => {
      const name = t.user_Ticket_assigneeIdTouser?.name;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [tickets]);

  const hasAnyFilter = !!(globalFilter || statusFilter || priorityFilter || categoryFilter || assigneeFilter || dateFilter);

  // Pagination state
  const [paginationState, setPaginationState] = useState({ pageIndex: 0, pageSize: 10 });
  const setPagination = useCallback((updater: Updater<{ pageIndex: number; pageSize: number }>) => {
    setPaginationState((prev) => {
      return typeof updater === 'function' ? updater(prev) : updater;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setGlobalFilter('');
    setStatusFilter('');
    setPriorityFilter('');
    setCategoryFilter('');
    setAssigneeFilter('');
    setDateFilter('');
    // Reset to first page when clearing filters
    setPaginationState((prev) => ({ pageIndex: 0, pageSize: prev.pageSize }));
  }, []);

  // Table columns configuration
  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'ticketNumber',
      header: 'Ticket #',
      enableSorting: true,
      cell: ({ getValue, row }) => {
        const ticketNumber = getValue() as number | null | undefined;
        if (ticketNumber !== null && ticketNumber !== undefined) {
          return <div className="text-xs text-slate-400 font-mono">TKT-{String(ticketNumber).padStart(5, '0')}</div>;
        }
        const id = row.original.id as string;
        return <div className="text-xs text-slate-400 font-mono">TKT-{id.substring(0, 8).toUpperCase()}</div>;
      }
    },
    {
      accessorKey: 'title',
      header: 'Subject',
      enableSorting: true,
      cell: ({ getValue, row }) => {
        const ticketId = (row.original as any).id;
        return (
          <Link to={`/tickets/${ticketId}`} className="link">
            <div className="text-sm text-slate-600 line-clamp-1 max-w-48">
              {getValue() as string}
            </div>
          </Link>
        );
      }
    },
    {
      accessorKey: 'senderName',
      header: 'Sender',
      enableSorting: true,
      accessorFn: (row) =>
        (row as any).user_Ticket_reporterIdTouser?.name ?? (row as any).senderName,
      cell: ({ getValue }) => {
        const val = getValue() as string;
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
              {val?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium">{val}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      enableSorting: true,
      filterFn: filterOpt('equals'),
      cell: ({ getValue }) => {
        const status = getValue() as TicketStatus;
        const labelInfo = STATUS_LABELS[status];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${labelInfo.color}`}>
            {labelInfo.label}
          </span>
        );
      }
    },
    {
      accessorKey: 'category',
      header: 'Category',
      enableSorting: true,
      filterFn: filterOpt('categoryMatch'),
      cell: ({ getValue }) => {
        const category = getValue() as TicketCategory | null;
        if (!category) return <span className="text-xs text-slate-500 italic">—</span>;
        const label = CATEGORY_LABELS[category];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${category === 'GENERAL_QUESTION' ? 'bg-violet-100 text-violet-700' : category === 'TECHNICAL_QUESTION' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
            {label}
          </span>
        );
      }
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      enableSorting: true,
      filterFn: filterOpt('equals'),
      cell: ({ getValue }) => {
        const priority = getValue() as TicketPriority;
        const labelInfo = PRIORITY_LABELS[priority];
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${labelInfo.color}`}>
            {labelInfo.label}
          </span>
        );
      }
    },
    {
      accessorKey: 'assigneeId',
      header: 'Assigned To',
      enableSorting: true,
      filterFn: filterOpt('assigneeMatch'),
      accessorFn: (row) =>
        (row as any).user_Ticket_assigneeIdTouser?.name ?? (row as any).assigneeId,
      cell: ({ getValue }) => {
        const assignedTo = getValue() as string | null;
        if (!assignedTo) return <span className="text-xs text-slate-500 italic">—</span>;
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
              {assignedTo.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs">{assignedTo}</span>
          </div>
        );
      }
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      enableSorting: true,
      filterFn: filterOpt('createdDate'),
      cell: ({ getValue }) => {
        const date = new Date(getValue() as string);
        return (
          <span className="text-xs text-slate-500 whitespace-nowrap">
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        );
      }
    },
    {
      id: 'actions',
      accessorKey: 'id',
      header: 'Actions',
      enableSorting: true,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm font-medium">
          <button
            onClick={() => {
              const ticketNumber = (row.original as any).ticketNumber;
              if (ticketNumber !== null && ticketNumber !== undefined) {
                alert(`View ticket TKT-${String(ticketNumber).padStart(5, '0')}`);
              } else {
                const id = (row.original as any).id as string;
                alert(`View ticket TKT-${id.substring(0, 8).toUpperCase()}`);
              }
            }}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4-1 1-4 9.5-9.5z"/>
            </svg>
            View
          </button>
        </div>
      )
    }
  ], []);

  // Build column filters from the dropdown states
  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = [];
    if (statusFilter) filters.push({ id: 'status', value: statusFilter });
    if (priorityFilter) filters.push({ id: 'priority', value: priorityFilter });
    if (categoryFilter) filters.push({ id: 'category', value: categoryFilter });
    if (assigneeFilter) filters.push({ id: 'assigneeId', value: assigneeFilter });
    if (dateFilter) filters.push({ id: 'createdAt', value: dateFilter });
    return filters;
  }, [statusFilter, priorityFilter, categoryFilter, assigneeFilter, dateFilter]);

  // Set up the table
  const table = useReactTable({
    data: tickets || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    filterFns,
    globalFilterFn: 'globalSearch' as any,
    state: { sorting, columnFilters, globalFilter, pagination: paginationState },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getRowId: (row) => {
      const ticketNumber = (row as any).ticketNumber;
      if (ticketNumber !== null && ticketNumber !== undefined) {
        return ticketNumber.toString();
      }
      return (row as any).id;
    }
  });

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const startIndex = filteredRowCount > 0 ? paginationState.pageIndex * paginationState.pageSize + 1 : 0;
  const endIndex = Math.min(startIndex + paginationState.pageSize - 1, filteredRowCount);
  const hasRows = table.getRowModel().rows.length > 0;
  const noResults = hasAnyFilter && !hasRows && (tickets?.length ?? 0) > 0;

  // Show spinner while auth is pending (session loading) - BEFORE isLoading check
  // because enabled=false when authPending=true means isLoading is never true
  if (authPending) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoading) {
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
              {tickets
                ? `${startIndex}-${endIndex} of ${filteredRowCount} ticket${filteredRowCount !== 1 ? 's' : ''}`
                : 'Loading...'}
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

        {/* Filter toolbar */}
        <div className="mb-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-col gap-4">
            {/* Global search */}
            <div className="relative">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search tickets..."
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                  aria-label="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter selects in a compact row */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              >
                <option value="">All Statuses</option>
                {TICKET_STATUSES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s].label}</option>
                ))}
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              >
                <option value="">All Priorities</option>
                {TICKET_PRIORITIES.map(p => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p].label}</option>
                ))}
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              >
                <option value="">All Categories</option>
                {availableCategories.map(c => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c as TicketCategory]}</option>
                ))}
                <option value="__NONE__">Uncategorized</option>
              </select>

              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              >
                <option value="">All Assignees</option>
                {availableAssignees.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
                <option value="__UNASSIGNED__">Unassigned</option>
              </select>

              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              >
                <option value="">All Dates</option>
                <option value="today">Today</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
              </select>

              {hasAnyFilter && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {(tickets?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2H5z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No tickets yet</p>
              <p className="text-xs text-slate-500 mt-1">Create your first ticket to get started</p>
            </div>
          ) : noResults ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No tickets found</p>
              <p className="text-xs text-slate-500 mt-1">Try adjusting your filters</p>
              <button
                onClick={clearFilters}
                className="mt-4 px-4 py-2 text-sm font-semibold text-violet-600 hover:text-violet-800 hover:bg-violet-50 rounded-xl transition"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          colSpan={header.colSpan}
                          onClick={() => handleSortChange(header.column.id)}
                          className={
                            'text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide' +
                            (header.column.getCanSort() ? ' cursor-pointer' : '') +
                            ' select-none'
                          }
                        >
                          {header.isPlaceholder ? null : (
                            <div className="flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsSorted() === 'desc' ? (
                                <ArrowDown className="ml-1 h-4 w-4 text-slate-600" />
                              ) : header.column.getIsSorted() === 'asc' ? (
                                <ArrowUp className="ml-1 h-4 w-4 text-slate-600" />
                              ) : (
                                <ArrowUpDown className="ml-1 h-4 w-4 text-slate-400" />
                              )}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel() && table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-5 py-4"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4">
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-slate-700">Rows per page:</label>
            <select
              value={paginationState.pageSize}
              onChange={(e) => {
                setPaginationState({ pageIndex: 0, pageSize: Number(e.target.value) });
              }}
              className="px-3 py-2 text-sm rounded-xl border bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setPaginationState((prev) => ({
                  pageIndex: Math.max(prev.pageIndex - 1, 0),
                  pageSize: prev.pageSize,
                }))
              }}
              disabled={paginationState.pageIndex === 0}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${paginationState.pageIndex === 0 ? 'text-slate-400 hover:text-slate-500' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-xl transition`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <span className="text-sm text-slate-600">
              Page {paginationState.pageIndex + 1} of {Math.max(1, Math.ceil(filteredRowCount / paginationState.pageSize))}
            </span>

            <button
              onClick={() => {
                setPaginationState((prev) => ({
                  pageIndex: Math.min(prev.pageIndex + 1, Math.ceil(filteredRowCount / prev.pageSize) - 1),
                  pageSize: prev.pageSize,
                }))
              }}
              disabled={
                paginationState.pageIndex >= Math.ceil(filteredRowCount / paginationState.pageSize) - 1 ||
                filteredRowCount === 0
              }
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${paginationState.pageIndex >= Math.ceil(filteredRowCount / paginationState.pageSize) - 1 || filteredRowCount === 0 ? 'text-slate-400 hover:text-slate-500' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} rounded-xl transition`}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {isModalOpen && (
          <CreateTicketModal
            isOpen={isModalOpen}
            onClose={handleClose}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['tickets'] })}
          />
        )}
      </div>
    </div>
  );
}
