import { Resend } from 'resend';

const DEFAULT_FROM = 'Help Desk <onboarding@resend.dev>';
const RESEND_API_URL = 'https://api.resend.com/emails';

/** Maximum total send attempts (1 initial + 2 retries). */
const MAX_SEND_ATTEMPTS = 3;

/**
 * Get the configured sender email address.
 * Falls back to the default Resend onboarding address if EMAIL_FROM is not set.
 */
export function getEmailFrom(): string {
  const configured = process.env.EMAIL_FROM;
  if (configured) {
    // Normalize: trim and strip any matching surrounding quotes (e.g. a value
    // pasted as "Name <email@example.com>" with literal quotes into a config
    // / env var, which Resend's from-field format validation would otherwise reject).
    const trimmed = configured.trim();;
    if (
      trimmed.length >= 2 &&
      ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
      return trimmed.slice(1, -1).trim();
    }
    return trimmed;;
  }
  return DEFAULT_FROM;;
}

export interface SendEmailAttempt {
  /** Resend email ID on success, null otherwise. */
  emailId: string | null;
  /** Error message when the send failed. */
  error?: string;
  /** Number of attempts actually made (0..MAX_SEND_ATTEMPTS). */
  attempts: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Classify a thrown fetch/network error as retryable or not.
 *
 * Retryable (clearly transient, provider did NOT accept the email):
 *   - Connection-level failures (refused / DNS / reset) where the request
 *     never reached the provider.
 *
 * NOT retryable:
 *   - Timeouts / aborted requests (ambiguous: the provider may already have
 *     accepted the email, so re-sending risks duplicates).
 *   - Anything else unknown.
 */
function isRetryableNetworkError(error: any): boolean {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return false;
  }
  const retryableCodes = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ECONNRESET',
    'EAI_AGAIN',
    'UND_ERR_CONNECT_FAILED',
  ];
  const code = error?.code ?? error?.cause?.code;
  return typeof code === 'string' && retryableCodes.includes(code);
}

/**
 * Send an email using the Resend REST API with limited retry for
 * clearly-retryable, transient failures.
 *
 * Retry policy (max MAX_SEND_ATTEMPTS total attempts):
 *   - HTTP 5xx responses            -> retried (transient server-side failure)
 *   - HTTP 429 (rate limited)       -> retried (request explicitly not accepted)
 *   - Connection-level network errs -> retried (request never reached provider)
 *   - Any other 4xx                 -> NOT retried (config/validation/auth)
 *   - Timeouts / aborted requests   -> NOT retried (ambiguous; provider may
 *                                      already have accepted the email)
 *
 * Returns emailId=null when RESEND_API_KEY is not configured (attempts=0).
 */
export async function sendEmailWithRetry(
  to: string,
  subject: string,
  html: string,
  headers?: Record<string, string>
): Promise<SendEmailAttempt> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY not configured, skipping email send');
    return { emailId: null, error: 'RESEND_API_KEY not configured', attempts: 0 };
  }

  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    try {
      // Translate EMAIL headers into the corresponding Resend API BODY fields.
      // Previously these were forwarded as HTTP request headers, which Resend
      // ignores — meaning threading (In-Reply-To/References) never worked and
      // there was no Reply-To, so customer replies went to the bare
      // onboarding@resend.dev sender instead of the support inbox.
      const inReplyTo = headers?.['In-Reply-To'];
      const references = headers?.['References'];
      const replyTo =
        headers?.['Reply-To'] ??
        process.env.EMAIL_REPLY_TO ??
        process.env.EMAIL_IMAP_USER ??
        undefined;

      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: getEmailFrom(),
          to,
          subject,
          html,
          ...(replyTo ? { reply_to: replyTo } : {}),
          ...(inReplyTo ? { in_reply_to: inReplyTo } : {}),
          ...(references ? { references } : {}),
        }),
      });

      const bodyText = await response.text();
      let parsed: any = {};
      try {
        parsed = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        // Non-JSON body; fall through to status-based handling.
      }

      if (response.ok) {
        // NOTE: the Resend send API returns only its opaque email ID
        // (parsed.id) — it does NOT expose the RFC Message-ID that
        // recipients see in their mail client. Nothing more can be stored
        // here; customer-reply threading relies on In-Reply-To/References
        // of previously received inbound mail plus the sender-guarded
        // normalized-subject fallback in EmailService.findThreadMatch.
        console.log(`Email sent via Resend: ${parsed?.id} (attempt ${attempt})`);
        return { emailId: parsed?.id ?? null, attempts: attempt };
      }

      lastError = parsed?.message || parsed?.error?.message || `Resend API returned HTTP ${response.status}`;
      console.error(`Failed to send email via Resend (attempt ${attempt}): HTTP ${response.status} - ${lastError}`);

      // 5xx and 429 are clearly transient -> retry. Everything else (4xx) is
      // permanent -> stop immediately.
      const retryableStatus = response.status >= 500 || response.status === 429;
      if (!retryableStatus || attempt === MAX_SEND_ATTEMPTS) {
        break;
      }
      await sleep(1000 * attempt);
    } catch (error: any) {
      lastError = error?.message || String(error);
      console.error(`Error sending email via Resend (attempt ${attempt}):`, error);

      if (!isRetryableNetworkError(error) || attempt === MAX_SEND_ATTEMPTS) {
        break;
      }
      // Exponential backoff: 1s, 2s
      await sleep(1000 * attempt);
    }
  }

  return { emailId: null, error: lastError, attempts: MAX_SEND_ATTEMPTS };
}

/**
 * Legacy single-attempt send. Kept for backward compatibility.
 * @returns The Resend email ID on success, or null if unavailable/failed.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  headers?: Record<string, string>
): Promise<string | null> {
  const result = await sendEmailWithRetry(to, subject, html, headers);
  return result.emailId;
}