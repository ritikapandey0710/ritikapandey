/**
 * End-to-end test of the REAL webhook route (server/src/routes/webhooks.ts)
 * — the actual modified code path.
 *
 * Starts the server with an EMPTY GEMINI_API_KEY so classifyTicket (the AI
 * text-generation step) throws immediately ("GEMINI_API_KEY is not set").
 * Then POSTs a non-KB ticket through /api/webhooks/tickets and verifies that,
 * after the background classification fails, the ticket status is OPEN and
 * all other fields are unchanged (failure case on the real route).
 */
import { spawn } from 'child_process';
import { prisma } from './src/lib/prisma';

async function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const env = { ...process.env };
  // Empty (but present) so classifyTicket throws fast — no real API call.
  env.GEMINI_API_KEY = '';

  // Use the same bun binary that is running this test (process.execPath) so the
  // server subprocess resolves even when 'bun' is not on PATH for raw spawn.
  const server = spawn(process.execPath, ['run', 'src/index.ts'], {
    cwd: process.cwd(),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let ready = false;
  let serverLog = '';
  server.stdout.on('data', (d) => {
    const s = d.toString();
    serverLog += s;
    if (s.includes('Server running')) ready = true;
  });
  server.stderr.on('data', (d) => {
    serverLog += d.toString();
  });

  let pass = true;
  let createdId: string | undefined;

  const stopServer = () => { try { server.kill(); } catch { /* ignore */ } };

  // Wait for server readiness (up to 30s)
  const start = Date.now();
  while (!ready && Date.now() - start < 30000) {
    if (server.exitCode !== null && !ready) break;
    await wait(250);
  }

  if (!ready) {
    console.error('FAIL: Server did not become ready. Server log:\n', serverLog);
    stopServer();
    await prisma.$disconnect();
    process.exit(1);
  }
  console.log('Server ready.');

  const title = `E2E_NONMATCH_${Date.now()}`;
  const res = await fetch('http://localhost:3001/api/webhooks/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description: 'zqxjk random text about a flibberdigibbet quantum widget — not in any knowledge base.',
      senderName: 'E2E Customer',
      senderEmail: 'e2e@example.com',
      priority: 'MEDIUM',
      category: null,
    }),
  });
  const body = await res.json();
  console.log('Webhook response: HTTP', res.status, '| ticket id:', body.id, '| status:', body.status);
  if (!body.id) {
    console.error('FAIL: no ticket id returned');
    pass = false;
  } else {
    createdId = body.id;
  }

  if (createdId) {
    // classifyTicket runs in the background; with an empty key it throws
    // synchronously inside the async fn -> .catch sets status to OPEN.
    await wait(3000);

    const t = await prisma.ticket.findUnique({ where: { id: createdId } });
    console.log('Ticket after background classification:', JSON.stringify({
      id: t?.id, status: t?.status, title: t?.title,
      category: t?.category, priority: t?.priority,
      senderName: t?.senderName, senderEmail: t?.senderEmail,
    }, null, 2));

    const caughtInLog = serverLog.includes('AI classification failed for webhook ticket');
    console.log('Server logged "AI classification failed for webhook ticket":', caughtInLog);

    if (t?.status !== 'OPEN') { console.error('FAIL: expected status OPEN, got', t?.status); pass = false; }
    else console.log('PASS (E2E failure case): ticket status is OPEN after classifyTicket threw');
    if (!caughtInLog) { console.error('FAIL: .catch handler did not run (no error log)'); pass = false; }
    else console.log('PASS (E2E): .catch handler ran and logged the original error');
    if (t?.title !== title) { console.error('FAIL: title was changed by the error path'); pass = false; }
    else console.log('PASS: title unchanged by error path');
    if (t?.category !== null) { console.error('FAIL: category should remain null'); pass = false; }
    else console.log('PASS: category unchanged (null)');
    if (t?.priority !== 'MEDIUM') { console.error('FAIL: priority should remain MEDIUM'); pass = false; }
    else console.log('PASS: priority unchanged');
  }

  // cleanup
  try { await prisma.ticket.deleteMany({ where: { title: { startsWith: 'E2E_NONMATCH_' } } }); } catch { /* ok */ }
  stopServer();
  await prisma.$disconnect();

  console.log(pass ? '\nE2E PASSED' : '\nE2E FAILED');
  process.exit(pass ? 0 : 1);
}

main().catch(async (e) => { console.error(e); try { await prisma.$disconnect(); } catch { /* noop */ } process.exit(1); });
