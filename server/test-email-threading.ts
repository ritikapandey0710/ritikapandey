import 'dotenv/config';
import { prisma } from './src/lib/prisma';
import { EmailService } from './src/services/email.service';

const TAG = `threadtest${Date.now()}`;
const SENDER = `${TAG}@example.com`;

function rawEmail(opts: {
  messageId: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const headers = [
    `From: Test Sender <${SENDER}>`,
    `To: support@example.com`,
    `Subject: ${opts.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${opts.messageId}`,
  ];
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  const CRLF = String.fromCharCode(13, 10);
  return headers.join(CRLF) + CRLF + CRLF + opts.body + CRLF;
}

// Capture console output to verify pipeline behavior without changing code
const logs: string[] = [];
const origLog = console.log;
const origErr = console.error;
console.log = (...a: any[]) => { const s = a.join(' '); logs.push(s); origLog('[log]', s); };
console.error = (...a: any[]) => { const s = a.join(' '); logs.push(s); origErr('[err]', s); };

async function processRaw(svc: EmailService, raw: string) {
  // processEmail is private; invoke via cast (no production code modified)
  await (svc as any).processEmail(null, raw);
}

async function main() {
  const results: Record<string, string> = {};
  const svc = new EmailService({ from: 'support@example.com' });

  const msgIdA = `<${TAG}-a@example.com>`;
  const msgIdB = `<${TAG}-b@example.com>`;
  const msgIdC = `<${TAG}-c@example.com>`;
  const msgIdD = `<${TAG}-d@example.com>`;

  const ticketsBefore = await prisma.ticket.count();

  // ---- TEST 1: new email creates exactly 1 ticket ----
  await processRaw(svc, rawEmail({
    messageId: msgIdA,
    subject: `Threading test A ${TAG}`,
    body: 'Initial request body for threading test.',
  }));
  await new Promise(r => setTimeout(r, 1500)); // allow background AI classification attempt to log

  const emA = await prisma.emailMessage.findUnique({ where: { messageId: msgIdA.slice(1, -1).toLowerCase() } });
  const ticketsA = await prisma.ticket.count({ where: { senderEmail: SENDER } });
  results['1'] = ticketsA === 1 && !!emA ? 'PASS' : `FAIL (tickets=${ticketsA}, emailMessage=${!!emA})`;
  const ticketAId = emA?.ticketId;

  // ---- TEST 2: same Message-ID again -> no new ticket ----
  await processRaw(svc, rawEmail({
    messageId: msgIdA,
    subject: `Threading test A duplicate ${TAG}`,
    body: 'Duplicate delivery of the same message.',
  }));
  const ticketsAfterDup = await prisma.ticket.count({ where: { senderEmail: SENDER } });
  const dupSkipped = logs.some(l => l.includes('Skipping duplicate email'));
  results['2'] = ticketsAfterDup === 1 && dupSkipped ? 'PASS' : `FAIL (tickets=${ticketsAfterDup}, dupSkipLogged=${dupSkipped})`;

  // ---- TEST 3: In-Reply-To match -> CUSTOMER reply on existing ticket ----
  await processRaw(svc, rawEmail({
    messageId: msgIdB,
    subject: 'Re: Threading test A',
    body: 'Customer follow-up via In-Reply-To.',
    inReplyTo: msgIdA,
  }));
  const emB = await prisma.emailMessage.findUnique({
    where: { messageId: msgIdB.slice(1, -1).toLowerCase() },
    include: { reply: true },
  });
  const repliesOnA = await prisma.reply.count({ where: { ticketId: ticketAId!, senderType: 'CUSTOMER' } });
  results['3'] =
    !!emB && emB.ticketId === ticketAId && !!emB.replyId &&
    emB.reply?.senderType === 'CUSTOMER' && repliesOnA === 1
      ? 'PASS'
      : `FAIL (emB=${JSON.stringify(emB ? { ticketId: emB.ticketId, replyId: emB.replyId, type: emB.reply?.senderType } : null)}, customerReplies=${repliesOnA})`;

  // ---- TEST 4: References match -> CUSTOMER reply on existing ticket ----
  await processRaw(svc, rawEmail({
    messageId: msgIdC,
    subject: 'Re: Re: Threading test A',
    body: 'Customer follow-up via References header.',
    references: `<other-${TAG}@x.com> ${msgIdA}`,
  }));
  const emC = await prisma.emailMessage.findUnique({
    where: { messageId: msgIdC.slice(1, -1).toLowerCase() },
    include: { reply: true },
  });
  const repliesOnAAfterC = await prisma.reply.count({ where: { ticketId: ticketAId!, senderType: 'CUSTOMER' } });
  results['4'] =
    !!emC && emC.ticketId === ticketAId && !!emC.replyId &&
    emC.reply?.senderType === 'CUSTOMER' && repliesOnAAfterC === 2
      ? 'PASS'
      : `FAIL (emC=${JSON.stringify(emC ? { ticketId: emC.ticketId, replyId: emC.replyId, type: emC.reply?.senderType } : null)}, customerReplies=${repliesOnAAfterC})`;

  // ---- TEST 5: no thread headers -> new ticket ----
  await processRaw(svc, rawEmail({
    messageId: msgIdD,
    subject: `Threading test D standalone ${TAG}`,
    body: 'Completely unrelated new conversation.',
  }));
  const ticketsD = await prisma.ticket.count({ where: { senderEmail: SENDER } });
  const emD = await prisma.emailMessage.findUnique({ where: { messageId: msgIdD.slice(1, -1).toLowerCase() } });
  results['5'] = ticketsD === 2 && !!emD && emD.ticketId !== ticketAId ? 'PASS' : `FAIL (tickets=${ticketsD})`;
  const ticketDId = emD?.ticketId;

  // ---- TEST 6: new email went through processNewTicket() pipeline ----
  // Pipeline evidence: status transitions logged + final status OPEN or RESOLVED,
  // plus "Created ticket ... from email" log.
  const tA = await prisma.ticket.findUnique({ where: { id: ticketAId! } });
  const tD = await prisma.ticket.findUnique({ where: { id: ticketDId! } });
  const createdLogs = logs.filter(l => l.includes('Created ticket')).length;
  const pipelineOk = [tA, tD].every(t => t && ['OPEN', 'RESOLVED', 'PROCESSING', 'NEW'].includes(t.status));
  const kbOrOpen = logs.some(l => l.includes('auto-resolved using knowledge base')) ||
    [tA, tD].some(t => t?.status === 'OPEN');
  results['6'] = createdLogs >= 2 && pipelineOk && kbOrOpen
    ? 'PASS'
    : `FAIL (createdLogs=${createdLogs}, statuses=${tA?.status}/${tD?.status})`;

  // ---- TEST 7: customer replies did NOT trigger new-ticket auto-response ----
  // sendAutoResponse is only called in the new-ticket branch; with RESEND_API_KEY
  // unset it logs "skipping auto-response". Verify: no auto-response log tied to a
  // reply message, and reply emails created zero additional tickets.
  const autoRespLogs = logs.filter(l => l.toLowerCase().includes('auto-response'));
  const ticketsFinal = await prisma.ticket.count({ where: { senderEmail: SENDER } });
  results['7'] = ticketsFinal === 2 && autoRespLogs.every(l => !l.includes(msgIdB) && !l.includes(msgIdC))
    ? 'PASS'
    : `FAIL (tickets=${ticketsFinal}, autoRespLogs=${JSON.stringify(autoRespLogs)})`;

  // ---- TEST 8: EmailMessage links correct ----
  const emA2 = await prisma.emailMessage.findUnique({ where: { messageId: msgIdA.slice(1, -1).toLowerCase() } });
  const emD2 = await prisma.emailMessage.findUnique({ where: { messageId: msgIdD.slice(1, -1).toLowerCase() } });
  const linkOk =
    emA2 && emA2.ticketId === ticketAId && emA2.replyId === null &&
    emB && emB.ticketId === ticketAId && !!emB.replyId &&
    emC && emC.ticketId === ticketAId && !!emC.replyId &&
    emD2 && emD2.ticketId === ticketDId && emD2.replyId === null;
  results['8'] = linkOk ? 'PASS' : 'FAIL';

  console.log = origLog;
  console.error = origErr;

  origLog(String.fromCharCode(10) + '===== RESULTS =====');
  const labels: Record<string, string> = {
    '1': 'New email -> exactly 1 new ticket',
    '2': 'Same Message-ID reprocessed -> no duplicate ticket',
    '3': 'In-Reply-To match -> CUSTOMER reply on existing ticket',
    '4': 'References match -> CUSTOMER reply on existing ticket',
    '5': 'No thread headers -> new ticket',
    '6': 'New email goes through processNewTicket() pipeline',
    '7': 'Customer reply does NOT trigger new-ticket auto-response',
    '8': 'EmailMessage records correctly linked to Ticket/Reply',
  };
  for (const k of ['1','2','3','4','5','6','7','8']) origLog(`${k}. ${labels[k]}: ${results[k]}`);

  // Cleanup ONLY the records this test created
  const ids = [ticketAId, ticketDId].filter(Boolean) as string[];
  await prisma.emailMessage.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.reply.deleteMany({ where: { ticketId: { in: ids } } });
  await prisma.ticket.deleteMany({ where: { id: { in: ids } } });
  await prisma.user.deleteMany({ where: { email: SENDER } });
  origLog('Cleanup complete (only test-created records removed).');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Test crashed:', e);
  await prisma.$disconnect();
  process.exit(1);
});