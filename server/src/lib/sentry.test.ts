import { describe, expect, test } from "bun:test";
import {
  attachExpressErrorHandler,
  captureServerError,
  initSentry,
  isExpectedHttpError,
  isExpectedServerError,
  isSentryInitialized,
  sanitizeEvent,
} from "./sentry";

describe("isExpectedHttpError", () => {
  test.each([400, 401, 403, 404, 422])("treats %i as expected (not reported)", (status: number) => {
    expect(isExpectedHttpError(status)).toBe(true);
  });

  test.each([500, 502, 503])("treats %i as unexpected (reported)", (status: number) => {
    expect(isExpectedHttpError(status)).toBe(false);
  });
});

describe("isExpectedServerError", () => {
  test("ignores expected auth/validation-style errors", () => {
    expect(isExpectedServerError({ status: 401 })).toBe(true);
    expect(isExpectedServerError({ statusCode: 422 })).toBe(true);
  });

  test("reports genuine application errors", () => {
    expect(isExpectedServerError(new Error("db exploded"))).toBe(false);
    expect(isExpectedServerError({ status: 500 })).toBe(false);
  });
});

describe("sanitizeEvent", () => {
  test("removes bodies, cookies, webhook signatures, and auth headers", () => {
    const event = {
      request: {
        data: { title: "customer ticket body" },
        cookies: { session: "abc" },
        headers: {
          authorization: "Bearer x",
          cookie: "session=abc",
          "x-webhook-signature": "sha256=deadbeef",
          "content-type": "application/json",
        },
      },
    };
    const result = sanitizeEvent(event);
    expect(result.request!.data).toBeUndefined();
    expect(result.request!.cookies).toBeUndefined();
    expect(result.request!.headers.authorization).toBeUndefined();
    expect(result.request!.headers["x-webhook-signature"]).toBeUndefined();
    expect(result.request!.headers["content-type"]).toBe("application/json");
  });
});

describe("captureServerError", () => {
  test("is a safe no-op when Sentry is not initialized", () => {
    // Must not throw even without SENTRY_DSN set.
    expect(() =>
      captureServerError(new Error("test"), { service: "email", operation: "test" })
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Initialization tests. These run LAST because initSentry() sets module-level
// state. A throwaway localhost DSN is used so nothing is ever delivered to a
// real Sentry project during automated tests.
// ---------------------------------------------------------------------------
const TEST_DSN = "https://test@test.ingest.sentry.io/test";

describe("initSentry", () => {
  test("initializing without a DSN is safe and leaves Sentry uninitialized", () => {
    const original = process.env.SENTRY_DSN;
    delete process.env.SENTRY_DSN;
    expect(() => initSentry()).not.toThrow();
    expect(isSentryInitialized()).toBe(false);
    // captureServerError stays a safe no-op while uninitialized.
    expect(() =>
      captureServerError(new Error("still uninitialized"))
    ).not.toThrow();
    if (original !== undefined) process.env.SENTRY_DSN = original;
  });

  test("initializing with a DSN does not crash and cannot double-initialize", () => {
    const original = process.env.SENTRY_DSN;
    process.env.SENTRY_DSN = TEST_DSN;
    expect(() => initSentry()).not.toThrow();
    expect(isSentryInitialized()).toBe(true);
    // Second call must be a guarded no-op: exactly ONE Sentry.init per process.
    expect(() => initSentry()).not.toThrow();
    expect(isSentryInitialized()).toBe(true);
    // Unexpected errors can be captured safely once initialized.
    expect(() =>
      captureServerError(new Error("unexpected failure"), { service: "test" })
    ).not.toThrow();
    if (original !== undefined) process.env.SENTRY_DSN = original;
  });
});

describe("Express error-handler ordering", () => {
  test("errors still produce the existing 500 response after Sentry middleware", async () => {
    const express = (await import("express")).default;
    const { attachExpressErrorHandler } = await import("./sentry");

    const app = express();
    app.get("/boom", () => {
      throw new Error("unexpected route failure");
    });
    // Sentry handler AFTER routes...
    attachExpressErrorHandler(app);
    // ...existing fallback BEFORE responding.
    app.use(
      (err: unknown, _req: unknown, res: { status: (n: number) => any; json: (b: unknown) => any }, _next: unknown) => {
        void err;
        res.status(500).json({ error: "Internal server error" });
      }
    );

    const server = app.listen(0);
    const port = (server.address() as { port: number }).port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/boom`);
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Internal server error" });
    } finally {
      server.close();
    }
  });
});

