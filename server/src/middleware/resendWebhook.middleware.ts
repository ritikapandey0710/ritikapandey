import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Phase 5: Resend delivery-event webhook verification.
 *
 * Resend signs its webhooks using Svix: the `svix-signature` header contains
 * one or more space-separated base64 HMAC-SHA256 signatures computed over
 * `${svix-id}.${svix-timestamp}.${rawBody}` with the webhook signing secret
 * (RESEND_WEBHOOK_SECRET, a `whsec_...` string whose base64 part is the key).
 *
 * The raw request body must be available on (req as any).rawBody — populated
 * by the `verify` callback passed to express.json() in index.ts.
 */

const TOLERANCE_SECONDS = 5 * 60; // reject replays older than 5 minutes

function verifySvixSignature(
  secret: string,
  id: string,
  timestamp: string,
  rawBody: Buffer,
  signatureHeader: string
): boolean {
  const timestampNumber = parseInt(timestamp, 10);
  if (!Number.isFinite(timestampNumber)) return false;

  // Replay protection
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampNumber) > TOLERANCE_SECONDS) {
    return false;
  }

  const secretPart = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const key = Buffer.from(secretPart, "base64");
  const payload = `${id}.${timestamp}.${rawBody.toString("utf8")}`;
  const expected = crypto.createHmac("sha256", key).update(payload).digest("base64");

  // One or more signatures may be present (space-separated); any match passes.
  const provided = signatureHeader.split(" ").filter(Boolean);
  const expectedBuf = Buffer.from(expected, "utf8");
  return provided.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, "utf8");
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}

/**
 * Express middleware that verifies the Svix signature of an incoming Resend
 * webhook request against process.env.RESEND_WEBHOOK_SECRET.
 *
 * If RESEND_WEBHOOK_SECRET is not configured the request is rejected with 500
 * so misconfiguration is loudly visible rather than silently allowing through.
 */
export const verifyResendWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.error(
      "RESEND_WEBHOOK_SECRET is not configured. Resend webhook verification cannot proceed."
    );
    return res
      .status(500)
      .json({ error: "Server resend webhook secret not configured" });
  }

  const id = req.headers["svix-id"] as string | undefined;
  const timestamp = req.headers["svix-timestamp"] as string | undefined;
  const signature = req.headers["svix-signature"] as string | undefined;

  if (!id || !timestamp || !signature) {
    return res.status(401).json({
      error: "Missing svix-id, svix-timestamp or svix-signature headers",
    });
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    return res.status(401).json({
      error: "Request body not available for signature verification",
    });
  }

  if (!verifySvixSignature(secret, id, timestamp, rawBody, signature)) {
    return res.status(401).json({ error: "Invalid resend webhook signature" });
  }

  next();
};