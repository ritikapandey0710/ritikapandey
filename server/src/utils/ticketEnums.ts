/**
 * Validate/normalize AI-provided enum values against the actual Prisma enums.
 *
 * The AI model can return values like "technical", "TECHNICAL", or
 * "technical_question" that are NOT valid Prisma enum values. Writing such a
 * value to Prisma raises PrismaClientValidationError and silently aborts the
 * whole ticket update (e.g. the RESOLVED status never persisted).
 *
 * These helpers guarantee that only valid enum values are ever written.
 */
import { TicketCategory, TicketPriority } from '../generated/prisma/enums';

export const VALID_CATEGORIES: string[] = Object.values(TicketCategory);
export const VALID_PRIORITIES: string[] = Object.values(TicketPriority);

/**
 * Common AI-output variants mapped to the real enum values.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  general: TicketCategory.GENERAL_QUESTION,
  general_question: TicketCategory.GENERAL_QUESTION,
  generalquestion: TicketCategory.GENERAL_QUESTION,
  question: TicketCategory.GENERAL_QUESTION,
  other: TicketCategory.GENERAL_QUESTION,
  miscellaneous: TicketCategory.GENERAL_QUESTION,
  technical: TicketCategory.TECHNICAL_QUESTION,
  tech: TicketCategory.TECHNICAL_QUESTION,
  technical_question: TicketCategory.TECHNICAL_QUESTION,
  technicalquestion: TicketCategory.TECHNICAL_QUESTION,
  technical_issue: TicketCategory.TECHNICAL_QUESTION,
  technical_issue_question: TicketCategory.TECHNICAL_QUESTION,
  bug: TicketCategory.TECHNICAL_QUESTION,
  problem: TicketCategory.TECHNICAL_QUESTION,
  how_to: TicketCategory.TECHNICAL_QUESTION,
  refund: TicketCategory.REFUND_REQUEST,
  refunds: TicketCategory.REFUND_REQUEST,
  refund_request: TicketCategory.REFUND_REQUEST,
  refundrequest: TicketCategory.REFUND_REQUEST,
  billing: TicketCategory.REFUND_REQUEST,
  payment: TicketCategory.REFUND_REQUEST,
};

/**
 * Normalize an arbitrary AI-provided category string into a valid
 * TicketCategory value. Returns `fallback` when no safe mapping exists.
 */
export function normalizeCategory(
  value: unknown,
  fallback: string = TicketCategory.GENERAL_QUESTION
): string {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (raw.length === 0) return fallback;

  // Exact enum value (any casing).
  const upper = raw.toUpperCase().replace(/[\s-]+/g, '_');
  if ((VALID_CATEGORIES as string[]).includes(upper)) return upper;

  // Known alias (e.g. "technical" -> TECHNICAL_QUESTION).
  const alias = CATEGORY_ALIASES[raw.toLowerCase().replace(/[\s-]+/g, '_')];
  if (alias) return alias;

  // Substring heuristic: "technical question category" -> TECHNICAL_QUESTION
  const lower = raw.toLowerCase();
  if (lower.includes('refund')) return TicketCategory.REFUND_REQUEST;
  if (lower.includes('technic') || lower.includes('bug') || lower.includes('error'))
    return TicketCategory.TECHNICAL_QUESTION;

  return fallback;
}

/**
 * Normalize an arbitrary AI-provided priority string into a valid
 * TicketPriority value. Returns `fallback` when no safe mapping exists.
 */
export function normalizePriority(
  value: unknown,
  fallback: string = TicketPriority.MEDIUM
): string {
  if (typeof value !== 'string') return fallback;
  const upper = value.trim().toUpperCase();
  if ((VALID_PRIORITIES as string[]).includes(upper)) return upper;

  const lower = value.trim().toLowerCase();
  if (lower === 'urgent' || lower === 'critical' || lower === 'emergency' || lower === 'highest' || lower === 'severe')
    return TicketPriority.URGENT;
  if (lower === 'high' || lower === 'important') return TicketPriority.HIGH;
  if (lower === 'normal' || lower === 'default' || lower === 'standard') return TicketPriority.MEDIUM;
  if (lower === 'low' || lower === 'minor' || lower === 'lowest' || lower === 'trivial')
    return TicketPriority.LOW;

  return fallback;
}
