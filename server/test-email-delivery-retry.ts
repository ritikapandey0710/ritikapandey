import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import {
  processDueEmails,
  retryOutboundEmail,
  MAX_DELIVERY_ATTEMPTS,
} from './src/services/emailDelivery.service';

/**
 * Phase 5 tests: outbound email delivery retry worker.
 * Uses the real database but mocks global fetch (Resend API) so no real
 * emails are sent. Cleans up only records it created.
 */

const TAG = `dlvtest${Date.now()}`;
const SENDER = `${TAG}@example.com`;

// Capture console output
const logs: string[] = [];
const origLog = console.log;
const origErr = console.error;
console.log = (...a: any[]) => { const s = a.join(' '); logs.push(s); origLog('[log]', s); };
console.error = (...a: any[]) => { const s = a.join(' '); logs.push(s); origErr('[err]', s); };

type FetchMock = (url: string, init?: any) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

let fetchCalls = 0;
function mockFetch(handler: FetchMock) {
  (globalThis as any).fetch = async (url: string, init?: any) => {
    fetchCalls++;
    if (!url.toString().includes('api.resend.com')) {
      // Pass through non-Resend calls (none expected here)
      throw new Error(`Unexpected fetch to ${url}`);
    }
    return handler(url, init);
  };
}

async function makeFixture(status: 'QUEUED' | 'FAILED', extra: any = {}) {
  const user = await prisma.user.create({
    data: { email: `${TAG}-${Math.random().toString(36).slice(2)}@example.com`, name: 'DLV Test', role: 'AGENT' },
  });
  const ticket = await prisma.ticket.create({
    data: {
      title: `Delivery test ${TAG}`,
      senderName: 'DLV Test',
      senderEmail: SENDER,
      reporterId: user.id,
    },
  });
  const em = await prisma.emailMessage.create({
    data: {
      messageId: `pending-${TAG}-${Math.random().toString(36).slice(2)}`,
      ticketId: ticket.id,
      direction: 'OUTBOUND',
      deliveryStatus: status,
      toAddress: SENDER,
      subject: 'Re: Delivery test',
      bodyHtml: '<p>hello</p>',
      ...extra,
    },
  });
  return { user, ticket, em };
}

async function cleanup(ids: string[], userIds: string[]) {
  await prisma.emailMessage.deleteMany({ where: { id: { in: ids } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  const results: Record<string, string> = {};
  const emailIds: string[] = [];
  const ticketIds: string[] = [];
  const userIds: string[] = [];

  process.env.RESEND_API_KEY = 'test-key-not-real';

  try {
    // ---- TEST 1: QUEUED row with snapshot is sent by the worker ----
    // Simulates an inline send attempt that recorded lastAttemptAt but left
    // the row QUEUED (e.g. response lost) -> immediately due for retry.
    {
      const f = await makeFixture('QUEUED', {
        lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      let resendId = '';
      mockFetch(async () => {
        resendId = `re_ok_${Date.now()}`;
        return { ok: true, status: 200, text: async () => JSON.stringify({ id: resendId }) };
      });
      const processed = await processDueEmails();
      const after = await prisma.emailMessage.findUnique({ where: { id: f.em.id } });
      results['1'] =
        processed >= 1 && after?.deliveryStatus === 'SENT' && after.messageId === resendId
          ? 'PASS'
          : `FAIL (processed=${processed}, status=${after?.deliveryStatus}, msgId=${after?.messageId})`;
    }

    // ---- TEST 2: FAILED row is retried and flips to SENT ----
    {
      const f = await makeFixture('FAILED', {
        lastError: 'Resend API returned HTTP 500',
        retryCount: 3,
        lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      let resendId = '';
      mockFetch(async () => {
        resendId = `re_retry_${Date.now()}`;
        return { ok: true, status: 200, text: async () => JSON.stringify({ id: resendId }) };
      });
      const res = await retryOutboundEmail(f.em.id);
      const after = await prisma.emailMessage.findUnique({ where: { id: f.em.id } });
      results['2'] =
        res === 'SENT' && after?.deliveryStatus === 'SENT' && after.retryCount === 4 && after.nextRetryAt === null
          ? 'PASS'
          : `FAIL (res=${res}, status=${after?.deliveryStatus}, retryCount=${after?.retryCount})`;
    }

    // ---- TEST 3: failed retry schedules exponential backoff ----
    {
      const f = await makeFixture('FAILED', {
        retryCount: 1,
        lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      mockFetch(async () => ({
        ok: false, status: 500, text: async () => JSON.stringify({ message: 'boom' }),
      }));
      const before = Date.now();
      const res = await retryOutboundEmail(f.em.id);
      const after = await prisma.emailMessage.findUnique({ where: { id: f.em.id } });
      const deltaMin = after?.nextRetryAt ? (after.nextRetryAt.getTime() - before) / 60000 : -1;
      results['3'] =
        res === 'FAILED' && after?.deliveryStatus === 'FAILED' &&
        after.retryCount === 2 && deltaMin > 4 && deltaMin < 6
          ? 'PASS'
          : `FAIL (res=${res}, retryCount=${after?.retryCount}, backoffMin=${deltaMin.toFixed(1)})`;
    }

    // ---- TEST 4: attempts exhausted -> terminal FAILED, no nextRetryAt ----
    {
      const f = await makeFixture('FAILED', {
        retryCount: MAX_DELIVERY_ATTEMPTS - 1,
        lastAttemptAt: new Date(Date.now() - 10 * 60 * 1000),
      });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      mockFetch(async () => ({
        ok: false, status: 500, text: async () => JSON.stringify({ message: 'still down' }),
      }));
      const res = await retryOutboundEmail(f.em.id);
      const after = await prisma.emailMessage.findUnique({ where: { id: f.em.id } });
      results['4'] =
        res === 'FAILED' && after?.retryCount === MAX_DELIVERY_ATTEMPTS && after.nextRetryAt === null
          ? 'PASS'
          : `FAIL (res=${res}, retryCount=${after?.retryCount}, nextRetryAt=${after?.nextRetryAt})`;
    }

    // ---- TEST 5: exhausted rows are not picked up again ----
    {
      const f = await makeFixture('FAILED', { retryCount: MAX_DELIVERY_ATTEMPTS });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      fetchCalls = 0;
      mockFetch(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ id: 'x' }) }));
      const res = await retryOutboundEmail(f.em.id);
      results['5'] = res === 'SKIPPED' && fetchCalls === 0 ? 'PASS' : `FAIL (res=${res}, fetchCalls=${fetchCalls})`;
    }

    // ---- TEST 6: legacy rows without snapshot are skipped safely ----
    {
      const f = await makeFixture('FAILED', { toAddress: null, bodyHtml: null });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      fetchCalls = 0;
      mockFetch(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ id: 'x' }) }));
      const res = await retryOutboundEmail(f.em.id);
      const after = await prisma.emailMessage.findUnique({ where: { id: f.em.id } });
      results['6'] =
        res === 'SKIPPED' && fetchCalls === 0 && after?.deliveryStatus === 'FAILED'
          ? 'PASS'
          : `FAIL (res=${res}, fetchCalls=${fetchCalls})`;
    }

    // ---- TEST 7: concurrent claims do not double-send ----
    {
      const f = await makeFixture('QUEUED');
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      fetchCalls = 0;
      mockFetch(async () => ({
        ok: true, status: 200, text: async () => JSON.stringify({ id: `re_conc_${Date.now()}` }),
      }));
      const [a, b] = await Promise.all([
        retryOutboundEmail(f.em.id),
        retryOutboundEmail(f.em.id),
      ]);
      const outcomes = [a, b].sort().join(',');
      results['7'] =
        fetchCalls === 1 && outcomes === 'SENT,SKIPPED'
          ? 'PASS'
          : `FAIL (outcomes=${outcomes}, fetchCalls=${fetchCalls})`;
    }

    // ---- TEST 8: stale never-attempted QUEUED row is crash-recovered ----
    {
      const f = await makeFixture('QUEUED', {
        createdAt: new Date(Date.now() - 10 * 60 * 1000), // older than STALE_QUEUED_MS
      });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      let sent = false;
      mockFetch(async () => {
        sent = true;
        return { ok: true, status: 200, text: async () => JSON.stringify({ id: `re_stale_${Date.now()}` }) };
      });
      const processed = await processDueEmails();
      const after = await prisma.emailMessage.findUnique({ where: { id: f.em.id } });
      results['8'] =
        processed >= 1 && sent && after?.deliveryStatus === 'SENT'
          ? 'PASS'
          : `FAIL (processed=${processed}, sent=${sent}, status=${after?.deliveryStatus})`;
    }

    // ---- TEST 9: fresh never-attempted QUEUED row is NOT immediately retried ----
    {
      const f = await makeFixture('QUEUED'); // createdAt = now
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      fetchCalls = 0;
      mockFetch(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ id: 'x' }) }));
      const processed = await processDueEmails();
      results['9'] = processed === 0 && fetchCalls === 0
        ? 'PASS'
        : `FAIL (processed=${processed}, fetchCalls=${fetchCalls})`;
    }

    // ---- TEST 10: INBOUND rows are never touched by the worker ----
    {
      const f = await makeFixture('QUEUED');
      await prisma.emailMessage.update({
        where: { id: f.em.id },
        data: { direction: 'INBOUND', deliveryStatus: null },
      });
      emailIds.push(f.em.id); ticketIds.push(f.ticket.id); userIds.push(f.user.id);
      fetchCalls = 0;
      mockFetch(async () => ({ ok: true, status: 200, text: async () => JSON.stringify({ id: 'x' }) }));
      const res = await retryOutboundEmail(f.em.id);
      results['10'] = res === 'SKIPPED' && fetchCalls === 0 ? 'PASS' : `FAIL (res=${res})`;
    }
  } finally {
    console.log = origLog;
    console.error = origErr;
    await cleanup(emailIds, userIds);
    origLog('Cleanup complete (only test-created records removed).');
  }

  origLog(String.fromCharCode(10) + '===== DELIVERY RETRY RESULTS =====');
  const labels: Record<string, string> = {
    '1': 'QUEUED row with snapshot is sent by worker',
    '2': 'FAILED row retried and flipped to SENT',
    '3': 'Failed retry schedules exponential backoff (~5min at attempt 2)',
    '4': 'Attempts exhausted -> terminal FAILED, no nextRetryAt',
    '5': 'Exhausted rows are not picked up again',
    '6': 'Legacy rows without snapshot skipped safely',
    '7': 'Concurrent claims do not double-send',
    '8': 'Stale never-attempted QUEUED row crash-recovered',
    '9': 'Fresh never-attempted QUEUED row not immediately retried',
    '10': 'INBOUND rows never touched by worker',
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