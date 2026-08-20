/**
 * Shared helper for root-level CommonJS test scripts (`test-webhook*.js`).
 *
 * Loads the webhook secret from server/.env and exposes a `signedPost()` wrapper
 * around axios that automatically attaches the HMAC-SHA256 signature header so
 * webhook requests pass verification.
 */
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

// Load server .env so WEBHOOK_SECRET is available in these root-level scripts
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_SIGNATURE_HEADER = 'x-webhook-signature';

/**
 * Computes an HMAC-SHA256 signature for the given JSON body string.
 * @param {string} body - JSON stringified request body
 * @param {string} secret - The shared webhook secret
 * @returns {string} Signature in the format "sha256=<hex>"
 */
function computeSignature(body, secret) {
  return 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
}

/**
 * Posts data to a webhook endpoint with a valid HMAC-SHA256 signature header.
 *
 * @param {string} url - Full URL of the webhook endpoint
 * @param {object} data - The request payload (will be JSON-stringified and signed)
 * @returns {Promise< object>} The axios response
 */
async function signedPost(url, data) {
  const body = JSON.stringify(data);
  const signature = computeSignature(body, WEBHOOK_SECRET);

  return axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      [WEBHOOK_SIGNATURE_HEADER]: signature,
    },
  });
}

module.exports = { signedPost, computeSignature, WEBHOOK_SIGNATURE_HEADER, WEBHOOK_SECRET };
