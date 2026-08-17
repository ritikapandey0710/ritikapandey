/**
 * Safely parses an unknown value into a ticket number (integer).
 * Handles various input types and extracts numeric ticket IDs.
 *
 * @param raw - The unknown value to parse (string, number, etc.)
 * @returns A non-negative integer representing the ticket number, or 0 if parsing fails
 */
export function parseTicketId(raw: unknown): number {
  // Handle null or undefined
  if (raw === null || raw === undefined) {
    return 0;
  }

  // Handle number directly
  if (typeof raw === 'number') {
    // Handle special number cases
    if (isNaN(raw)) {
      return 0;
    }

    if (!isFinite(raw)) {
      // For Infinity or -Infinity, return the capped value
      return 1_000_000_000;
    }

    // Ensure it's a non-negative integer
    const num = Math.floor(Math.abs(raw));
    // Cap at a reasonable maximum for ticket numbers (e.g., 1 billion)
    return Math.min(num, 1_000_000_000);
  }

  // Handle string
  if (typeof raw === 'string') {
    // Try to parse as integer
    const num = parseInt(raw.trim(), 10);
    if (!isNaN(num)) {
      return Math.min(Math.abs(num), 1_000_000_000);
    }

    // If direct parsing fails, try to extract numbers from the string
    const match = raw.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      return !isNaN(num) ? Math.min(Math.abs(num), 1_000_000_000) : 0;
    }
  }

  // Handle objects with a toString method (like some custom classes)
  if (typeof raw === 'object' && raw !== null) {
    if (typeof (raw as any).toString === 'function') {
      return parseTicketId((raw as any).toString());
    }
  }

  // Default fallback
  return 0;
}