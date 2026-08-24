/**
 * Sentry error-monitoring setup for the Express/Bun server.
 *
 * Design goals:
 * - Error monitoring only (no aggressive performance tracing).
 * - Observes errors WITHOUT changing existing HTTP responses: the existing
 *   global error handler still formats every response; we only add a
 *   capture call alongside the existing console.error logging.
 * - Sensitive request data (bodies, cookies, auth headers) is stripped.
 *
 * Requires SENTRY_DSN to be set; without it this module is a no-op.
 */
import * as Sentry from "@sentry/node";

export type SafeContext = Record<string, string | number | boolean>;

/** HTTP statuses that represent normal, user-facing API outcomes we ignore. */
const EXPECTED_HTTP_STATUSES = [400, 401, 402, 403, 404, 405, 409, 422];

export function isExpectedHttpError(status: unknown): boolean {
  return typeof status === "number" && EXPECTED_HTTP_STATUSES.includes(status);
}

/**
 * True for "expected" server-side conditions (validation failures,
 * unauthorized access, not-found) that should NOT create noisy events.
 */
export function isExpectedServerError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { status?: number; statusCode?: number };
  return (
    isExpectedHttpError(err.status) || isExpectedHttpError(err.statusCode)
  );
}

/** Strip anything potentially sensitive from an outgoing event. */
export function sanitizeEvent<T>(event: T): T {
  // Operate loosely: Sentry's ErrorEvent types are structurally complex,
  // but request data/cookies/headers are plain objects at runtime.
  const target = event as unknown as {
    request?: Record<string, any>;
    extra?: Record<string, unknown>;
  };
  if (target.request) {
    delete target.request.data;
    delete target.request.cookies;
    const headers = target.request.headers as Record<string, any> | undefined;
    if (headers && typeof headers === "object") {
      delete headers.authorization;
      delete headers.cookie;
      delete headers["set-cookie"];
      delete headers["x-webhook-signature"];
      delete headers["x-api-key"];
    }
  }
  return event;
}

let initialized = false;

export function isSentryInitialized(): boolean {
  return initialized;
}

/**
 * Initialize Sentry. Safe to call multiple times; no-ops without a DSN
 * so local development and tests are unaffected.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      // Expected validation/auth/not-found style errors stay out of Sentry.
      if (hint?.originalException && isExpectedServerError(hint.originalException)) {
        return null;
      }
      return sanitizeEvent(event);
    },
  });
  initialized = true;
}

/**
 * Capture an unexpected error with optional safe context tags
 * (e.g. ticketId, service, operation). Never include email bodies or
 * ticket descriptions here. No-op when Sentry is not initialized.
 */
export function captureServerError(error: unknown, context?: SafeContext): void {
  if (!initialized) return;
  Sentry.captureException(error, context ? { tags: context } : undefined);
}

/**
 * Register Sentry's Express error-handling middleware. Per Sentry's
 * recommended ordering it must be added AFTER all routes/controllers and
 * BEFORE the application's final fallback error middleware. The middleware
 * only observes errors and forwards them via next(err), so the existing
 * fallback handler still produces the unchanged `{ error: "Internal server
 * error" }` response. Safe to call even when Sentry is uninitialized.
 */
export function attachExpressErrorHandler(app: {
  use: (...args: any[]) => any;
}): void {
  Sentry.setupExpressErrorHandler(app as never);
}
