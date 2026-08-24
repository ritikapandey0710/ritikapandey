import { describe, expect, it } from "vitest";
import { isExpectedClientError, isExpectedHttpError, sanitizeEvent } from "./sentry";

describe("isExpectedHttpError", () => {
  it.each([400, 401, 403, 404, 422])("treats %i as expected (not reported)", (status: number) => {
    expect(isExpectedHttpError(status)).toBe(true);
  });

  it.each([500, 502, 503])("treats %i as unexpected (reported)", (status: number) => {
    expect(isExpectedHttpError(status)).toBe(false);
  });

  it("treats missing status as unexpected", () => {
    expect(isExpectedHttpError(undefined)).toBe(false);
  });
});

describe("isExpectedClientError", () => {
  it("ignores axios-style 401/403/404 responses", () => {
    const e = Object.assign(new Error("Request failed"), {
      response: { status: 401 },
    });
    expect(isExpectedClientError(e)).toBe(true);
  });

  it("ignores cancelled requests", () => {
    const e = Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
    expect(isExpectedClientError(e)).toBe(true);
  });

  it("reports genuine application exceptions", () => {
    expect(isExpectedClientError(new TypeError("cannot read properties"))).toBe(false);
  });

  it("reports unexpected 5xx responses", () => {
    const e = Object.assign(new Error("boom"), { response: { status: 500 } });
    expect(isExpectedClientError(e)).toBe(false);
  });
});

describe("sanitizeEvent", () => {
  it("removes request bodies, cookies, and authorization headers", () => {
    const event = {
      request: {
        data: { password: "secret" },
        cookies: { session: "abc" },
        headers: {
          authorization: "Bearer x",
          cookie: "session=abc",
          "content-type": "application/json",
        },
      },
    };
    const result = sanitizeEvent(event) as typeof event & {
      request: Record<string, unknown>;
    };
    expect(result.request.data).toBeUndefined();
    expect(result.request.cookies).toBeUndefined();
    const headers = result.request.headers as Record<string, unknown>;
    expect(headers.authorization).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers["content-type"]).toBe("application/json");
  });
});

describe("isExpectedClientError", () => {
  it("ignores axios-style 401/403/404 responses", () => {
    const e = Object.assign(new Error("Request failed"), {
      response: { status: 401 },
    });
    expect(isExpectedClientError(e)).toBe(true);
  });

  it("ignores cancelled requests", () => {
    const e = Object.assign(new Error("canceled"), { code: "ERR_CANCELED" });
    expect(isExpectedClientError(e)).toBe(true);
  });

  it("reports genuine application exceptions", () => {
    expect(isExpectedClientError(new TypeError("cannot read properties"))).toBe(false);
  });

  it("reports unexpected 5xx responses", () => {
    const e = Object.assign(new Error("boom"), { response: { status: 500 } });
    expect(isExpectedClientError(e)).toBe(false);
  });
});

describe("sanitizeEvent", () => {
  it("removes request bodies, cookies, and authorization headers", () => {
    const event = {
      request: {
        data: { password: "secret" },
        cookies: { session: "abc" },
        headers: {
          authorization: "Bearer x",
          cookie: "session=abc",
          "content-type": "application/json",
        },
      },
    };
    const result = sanitizeEvent(event) as typeof event & {
      request: Record<string, unknown>;
    };
    expect(result.request.data).toBeUndefined();
    expect(result.request.cookies).toBeUndefined();
    const headers = result.request.headers as Record<string, unknown>;
    expect(headers.authorization).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
    expect(headers["content-type"]).toBe("application/json");
  });
});
