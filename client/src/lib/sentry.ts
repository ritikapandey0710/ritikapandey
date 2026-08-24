/**
 * Sentry error-monitoring setup for the React/Vite client.
 *
 * Design goals:
 * - Error monitoring only (no aggressive performance tracing).
 * - Expected user-facing errors (401/403/404, form validation, cancellations)
 *   are NOT reported.
 * - No sensitive data (bodies, credentials) is attached to events.
 *
 * Requires VITE_SENTRY_DSN to be set; without it this module is a no-op.
 */
import * as Sentry from "@sentry/react";

/** HTTP statuses that represent normal, user-facing API outcomes we ignore. */
const EXPECTED_HTTP_STATUSES = [400, 401, 402, 403, 404, 405, 409, 422];

export function isExpectedHttpError(status: unknown): boolean {
  return typeof status === "number" && EXPECTED_HTTP_STATUSES.includes(status);
}

/**
 * True when an error is an "expected" client-side condition that should NOT
 * become a Sentry event (e.g. invalid login, normal 401/403/404 responses,
 * aborted requests). Anything unexpected returns false (should be reported).
 */
export function isExpectedClientError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    response?: { status?: number };
    status?: number;
    code?: string;
    name?: string;
    message?: string;
  };
  // Axios-style errors carrying an HTTP response status.
  if (isExpectedHttpError(err.response?.status) || isExpectedHttpError(err.status)) {
    return true;
  }
  // Request cancellations (AbortController / axios CanceledError).
  if (
    err.code === "ERR_CANCELED" ||
    err.code === "ECONNABORTED" ||
    err.name === "CanceledError" ||
    err.name === "AbortError"
  ) {
    return true;
  }
  return false;
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
 * (e.g. local development or CI where reporting is not wanted).
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || initialized) return;

  Sentry.init({
    dsn,
    // "development" | "production" (falls back to the Vite mode).
    environment:
      (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ??
      import.meta.env.MODE ??
      "development",
    // Error monitoring focus: performance tracing disabled by default.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      // Drop expected user-facing errors entirely.
      if (hint?.originalException && isExpectedClientError(hint.originalException)) {
        return null;
      }
      return sanitizeEvent(event);
    },
  });
  initialized = true;
}

/** Re-exported ErrorBoundary so apps can wrap their tree once. */
export const SentryErrorBoundary = Sentry.ErrorBoundary;
