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
