import crypto from "crypto";

/**
 * Header name used to carry the webhook signature.
 */
export const WEBHOOK_SIGNATURE_HEADER = "x-webhook-signature";

/**
 * Computes the HMAC-SHA256 signature for a request body using the given secret.
 *
 * Returns the signature in the format "sha256=<hex_digest>" which is the
 * standard convention used by GitHub, Stripe, and other webhook providers.
 *
 * @param body     The raw request body (either as a string or Buffer)
 * @param secret   The shared webhook secret
 * @returns        The signature string "sha256=<hex>"
 */
export function computeWebhookSignature(
  body: string | Buffer,
  secret: string
): string {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body).digest("hex")
  );
}
