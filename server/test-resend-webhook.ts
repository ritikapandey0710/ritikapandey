import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { prisma } from './src/lib/prisma';
import { verifyResendWebhookSignature } from './src/middleware/resendWebhook.middleware';
import resendWebhookRouter from './src/routes/resendWebhooks';

/**
 * Phase 5 tests: Resend delivery-event webhook.
 * Starts a real Express server on an ephemeral port and sends signed Svix
 * requests. Uses the real database; cleans up only records it created.
 */

const TAG = `rsvtest${Date.now()}`;
const SECRET = 'whsec_' + Buffer.from(`test-secret-${TAG}`).toString('base64');
process.env.RESEND_WEBHOOK_SECRET = SECRET;

const origLog = console.log;
const origErr = console.error;

function sign(payload: string, timestamp?: number) {
  const ts = timestamp ?? Math.floor(Date.now() / 1000);
  const id = `msg_${Math.random().toString(36).slice(2)}`;
  const sig = crypto
    .createHmac('sha256', Buffer.from(SECRET.slice(6), 'base64'))
    .update(`${id}.${ts}.${payload}`)
    .digest('base64');
  return { id, ts, signature: sig };
}

async function post(app: any, port: number, body: string, headers: Record<string, string>) {
  const res = await fetch(`http://127.0.0.1:${port}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

async function main() {
  const results: Record<string, string> = {};
  const emailIds: string[] = [];
  const ticketIds: string[] = [];
  const userIds: string[] = [];

  const app = express();
  app.use(express.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));
  app.use('/', verifyResendWebhookSignature, resendWebhookRouter);
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = (server.address() as any).port;

  try {
    // Fixture: one SENT outbound email tracked with a Resend id.
    const user = await prisma.user.create({
      data: { email: `${TAG}@example.com`, name: 'RSV Test', role: 'AGENT' },
    });
    userIds.push(user.id);
    const ticket = await prisma.ticket.create({
      data: { title: `RSV test ${TAG}`, senderName: 'RSV', senderEmail: `${TAG}@example.com`, reporterId: user.id },
    });
    ticketIds.push(ticket.id);
    const resendId = `re_webhook_${Date.now()}`;
    const em = await prisma.emailMessage.create({
      data: {
        messageId: resendId,
        ticketId: ticket.id,
        direction: 'OUTBOUND',
        deliveryStatus: 'SENT',
        toAddress: `${TAG}@example.com`,
        subject: 'Re: RSV test',
        bodyHtml: '<p>hi</p>',
      },
    });
    emailIds.push(em.id);

    // ---- TEST 1: valid signed email.delivered -> DELIVERED ----
    {
      const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: resendId } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      const after = await prisma.emailMessage.findUnique({ where: { id: em.id } });
      results['1'] =
        r.status === 200 && r.json?.updated === true && after?.deliveryStatus === 'DELIVERED'
          ? 'PASS' : `FAIL (status=${r.status}, updated=${r.json?.updated}, status2=${after?.deliveryStatus})`;
    }

    // ---- TEST 2: forward-only — second delivered event does not change state ----
    {
      const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: resendId } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      const after = await prisma.emailMessage.findUnique({ where: { id: em.id } });
      results['2'] =
        r.status === 200 && r.json?.updated === false && after?.deliveryStatus === 'DELIVERED'
          ? 'PASS' : `FAIL (status=${r.status}, updated=${r.json?.updated}, status2=${after?.deliveryStatus})`;
    }

    // ---- TEST 3: invalid signature rejected with 401 ----
    {
      const payload = JSON.stringify({ type: 'email.bounced', data: { email_id: resendId } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': 'AAAAinvalid==',
      });
      results['3'] = r.status === 401 ? 'PASS' : `FAIL (status=${r.status})`;
    }

    // ---- TEST 4: missing svix headers rejected with 401 ----
    {
      const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: resendId } });
      const r = await post(app, port, payload, {});
      results['4'] = r.status === 401 ? 'PASS' : `FAIL (status=${r.status})`;
    }

    // ---- TEST 5: replayed old timestamp rejected ----
    {
      const payload = JSON.stringify({ type: 'email.bounced', data: { email_id: resendId } });
      const oldTs = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const s = sign(payload, oldTs);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      results['5'] = r.status === 401 ? 'PASS' : `FAIL (status=${r.status})`;
    }

    // ---- TEST 6: bounced event on a fresh SENT row -> BOUNCED + lastError ----
    {
      const em2 = await prisma.emailMessage.create({
        data: {
          messageId: `re_bounce_${Date.now()}`,
          ticketId: ticket.id,
          direction: 'OUTBOUND',
          deliveryStatus: 'SENT',
          toAddress: `${TAG}@example.com`,
          subject: 'Re: RSV bounce',
          bodyHtml: '<p>hi</p>',
        },
      });
      emailIds.push(em2.id);
      const payload = JSON.stringify({ type: 'email.bounced', data: { email_id: em2.messageId } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      const after = await prisma.emailMessage.findUnique({ where: { id: em2.id } });
      results['6'] =
        r.status === 200 && after?.deliveryStatus === 'BOUNCED' && !!after.lastError && after.nextRetryAt === null
          ? 'PASS' : `FAIL (status=${r.status}, status2=${after?.deliveryStatus}, err=${!!after?.lastError})`;
    }

    // ---- TEST 7: unknown email_id acknowledged without update ----
    {
      const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_unknown_123' } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      results['7'] =
        r.status === 200 && r.json?.updated === false ? 'PASS' : `FAIL (status=${r.status}, json=${JSON.stringify(r.json)})`;
    }

    // ---- TEST 8: unhandled event type acknowledged without update ----
    {
      const payload = JSON.stringify({ type: 'email.opened', data: { email_id: resendId } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      results['8'] =
        r.status === 200 && r.json?.updated === false ? 'PASS' : `FAIL (status=${r.status}, json=${JSON.stringify(r.json)})`;
    }

    // ---- TEST 9: unconfigured secret -> 500 (loud misconfiguration) ----
    {
      delete process.env.RESEND_WEBHOOK_SECRET;
      const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: resendId } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      process.env.RESEND_WEBHOOK_SECRET = SECRET;
      results['9'] = r.status === 500 ? 'PASS' : `FAIL (status=${r.status})`;
    }

    // ---- TEST 10: INBOUND rows are never updated by webhook ----
    {
      const em3 = await prisma.emailMessage.create({
        data: {
          messageId: `inbound-${Date.now()}@example.com`,
          ticketId: ticket.id,
          direction: 'INBOUND',
        },
      });
      emailIds.push(em3.id);
      const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: em3.messageId } });
      const s = sign(payload);
      const r = await post(app, port, payload, {
        'svix-id': s.id, 'svix-timestamp': String(s.ts), 'svix-signature': s.signature,
      });
      const after = await prisma.emailMessage.findUnique({ where: { id: em3.id } });
      results['10'] =
        r.status === 200 && after?.deliveryStatus === null ? 'PASS' : `FAIL (status=${r.status}, status2=${after?.deliveryStatus})`;
    }
  } finally {
    server.close();
    await prisma.emailMessage.deleteMany({ where: { id: { in: emailIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    origLog('Cleanup complete (only test-created records removed).');
  }

  origLog(String.fromCharCode(10) + '===== RESEND WEBHOOK RESULTS =====');
  const labels: Record<string, string> = {
    '1': 'Valid signed email.delivered -> DELIVERED',
    '2': 'Forward-only: repeated delivered event ignored',
    '3': 'Invalid signature rejected (401)',
    '4': 'Missing svix headers rejected (401)',
    '5': 'Replayed old timestamp rejected (401)',
    '6': 'Bounced event -> BOUNCED with lastError, no retry scheduled',
    '7': 'Unknown email_id acknowledged without update',
    '8': 'Unhandled event type acknowledged without update',
    '9': 'Unconfigured secret -> 500 (loud failure)',
    '10': 'INBOUND rows never updated by webhook',
  };
  let failures = 0;
  for (const k of Object.keys(labels)) {
    origLog(`${k}. ${labels[k]}: ${results[k]}`);
    if (!results[k]?.startsWith('PASS')) failures++;
  }
  await prisma.$disconnect();
  if (failures > 0) process.exit(1);
}

main().catch(async (e) => {
  origErr('Test crashed:', e);
  await prisma.$disconnect();
  process.exit(1);
});