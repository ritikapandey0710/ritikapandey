import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Name of the HTTP header that carries the webhook signature.
 * Expected format: "sha256=<hex_digest>"
 */
const WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";

/**
 * Express middleware that verifies the HMAC-SHA256 signature of an incoming
 * webhook request body against the value of process.env.WEBHOOK_SECRET.
 *
 * The raw request body must be available on (req as any).rawBody — this is
 * populated by the `verify` callback passed to express.json() in index.ts.
 *
 * If the signature is missing or invalid the request is rejected with 401.
 * If WEBHOOK_SECRET is not configured the middleware returns 500 so
 * misconfiguration is loudly visible rather than silently allowing through.
 */
export const verifyWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const webhookSecret = process.env.WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "WEBHOOK_SECRET is not configured. Webhook verification cannot proceed."
    );
    return res
      .status(500)
      .json({ error: "Server webhook secret not configured" });
  }

  const signature = req.headers[WEBHOOK_SIGNATURE_HEADER] as string | undefined;

  if (!signature) {
    return res
      .status(401)
      .json({ error: `Missing ${WEBHOOK_SIGNATURE_HEADER} header` });
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;

  if (!rawBody) {
    return res.status(401).json({
      error: "Request body not available for signature verification",
    });
  }

  // Compute the expected HMAC-SHA256 signature
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  // Strip the optional "sha256=" prefix from the provided signature
  const providedSignature = signature.startsWith("sha256=")
    ? signature.substring(7)
    : signature;

  const expectedBuffer = Buffer.from(expectedSignature, "hex");
  const providedBuffer = Buffer.from(providedSignature, "hex");

  // Length mismatch means the signature is definitely wrong
  if (providedBuffer.length !== expectedBuffer.length) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  // Use timing-safe comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  next();
};
