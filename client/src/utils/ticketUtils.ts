import { TicketStatus, TicketCategory, TicketPriority } from '@/types/ticket';

export const getStatusLabel = (status: TicketStatus): string => {
  switch (status) {
    case TicketStatus.OPEN: return 'Open';
    case TicketStatus.IN_PROGRESS: return 'In Progress';
    case TicketStatus.RESOLVED: return 'Resolved';
    case TicketStatus.CLOSED: return 'Closed';
    default: return '';
  }
};

export const getCategoryLabel = (category: TicketCategory): string => {
  switch (category) {
    case TicketCategory.GENERAL_QUESTION: return 'General Question';
    case TicketCategory.TECHNICAL_QUESTION: return 'Technical Question';
    case TicketCategory.REFUND_REQUEST: return 'Refund Request';
    default: return '';
  }
};

export const STATUS_LABELS: Record<TicketStatus, { label: string; color: string }> = {
  [TicketStatus.OPEN]: { label: 'Open', color: 'bg-blue-100 text-blue-700' },
  [TicketStatus.IN_PROGRESS]: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  [TicketStatus.RESOLVED]: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
  [TicketStatus.CLOSED]: { label: 'Closed', color: 'bg-slate-100 text-slate-600' },
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General Question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical Question',
  [TicketCategory.REFUND_REQUEST]: 'Refund Request',
};

export const PRIORITY_LABELS: Record<TicketPriority, { label: string; color: string }> = {
  [TicketPriority.LOW]: { label: 'Low', color: 'bg-green-100 text-green-700' },
  [TicketPriority.MEDIUM]: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
  [TicketPriority.HIGH]: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  [TicketPriority.URGENT]: { label: 'Urgent', color: 'bg-red-100 text-red-700' },
};