export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export const TICKET_STATUSES: TicketStatus[] = [TicketStatus.OPEN, TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED, TicketStatus.CLOSED];

export enum TicketCategory {
  GENERAL_QUESTION = 'GENERAL_QUESTION',
  TECHNICAL_QUESTION = 'TECHNICAL_QUESTION',
  REFUND_REQUEST = 'REFUND_REQUEST',
}

export const TICKET_CATEGORIES: TicketCategory[] = [TicketCategory.GENERAL_QUESTION, TicketCategory.TECHNICAL_QUESTION, TicketCategory.REFUND_REQUEST];

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export const TICKET_PRIORITIES: TicketPriority[] = [TicketPriority.LOW, TicketPriority.MEDIUM, TicketPriority.HIGH, TicketPriority.URGENT];

export interface TicketUserBrief {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

export interface Ticket {
  id: string;
  ticketNumber?: string | null;
  title: string;
  body: string | null;
  senderName: string;
  senderEmail: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  assigneeId: string | null;
  reporterId?: string | null;
  user_Ticket_reporterIdTouser?: TicketUserBrief | null;
  user_Ticket_assigneeIdTouser?: TicketUserBrief | null;
  createdAt: string;
  updatedAt: string | null;
}
