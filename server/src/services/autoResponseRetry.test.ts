/**
 * Tests for the Phase 2 targeted fixes:
 *
 *   FIX 1 — Gemini transient failure: retry with backoff; never send the
 *           generic fallback because the AI call THREW. Fallback is only
 *           allowed when the AI actually answers canResolve=false.
 *   FIX 3/4 — On successful AI resolution: Reply persisted with the exact
 *           solution text, ticket becomes RESOLVED / resolvedByAI=true.
 *   FIX 5 — Customer reply threading: In-Reply-To match plus the safe,
 *           sender-guarded normalized-subject fallback.
 *
 * Run with: bun test src/services/autoResponseRetry.test.ts
 */
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';

// ── Mocks (registered before modules under test are imported) ─────────────

const prismaMock: any = {
  ticket: { findUnique: mock(), update: mock(), create: mock() },
  reply: { create: mock() },
  emailMessage: {
    findFirst: mock(),
    findUnique: mock(),
    findMany: mock(),
    create: mock(),
    update: mock(),
  },
  user: { findUnique: mock(), create: mock() },
};
mock.module('../lib/prisma', () => ({ prisma: prismaMock }));

const kbFindMatchMock = mock();
mock.module('./knowledgeBaseService', () => ({
  knowledgeBaseService: {
    findMatchingEntry: kbFindMatchMock,
    getResolutionSteps: mock(),
  },
}));

const sendEmailMock = mock();
mock.module('./resend.service', () => ({ sendEmailWithRetry: sendEmailMock }));

const resolveAIMock = mock();
const analyzeAIMock = mock();
mock.module('../controllers/ai.controller', () => ({
  resolveTicketWithAI: resolveAIMock,
  analyzeTicketWithAI: analyzeAIMock,
  classifyTicket: mock(),
}));

const getOrCreateAIAgentMock = mock();
mock.module('./aiAgentService', () => ({ getOrCreateAIAgent: getOrCreateAIAgentMock }));

mock.module('../lib/sentry', () => ({ captureServerError: mock() }));

// Import modules under test AFTER mocks are registered.
import { EmailService } from './email.service';

const TICKET_ID = 'ticket-123';
const SENDER_EMAIL = 'customer@example.com';
const AI_AGENT_ID = 'ai-agent-1';

function makeTicket(): any {
  return {
    id: TICKET_ID,
    ticketNumber: 42,
    title: 'My system is behaving strangely',
    description: 'The system crashes when I click submit.',
    status: 'OPEN',
    senderName: 'Ritika Pandey',
    senderEmail: SENDER_EMAIL,
    reporterId: null,
  };
}

function makeService(): EmailService {
  return new EmailService({ from: 'support@test.local' });
}

function resolvedUpdates(): any[] {
  return prismaMock.ticket.update.mock.calls.filter(
    (c: any[]) => c[0]?.data?.status === 'RESOLVED'
  );
}

const ORIGINAL_RESEND_KEY = process.env.RESEND_API_KEY;

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-key';
  for (const m of [kbFindMatchMock, sendEmailMock, resolveAIMock, analyzeAIMock, getOrCreateAIAgentMock]) {
    m.mockReset();
  }
  for (const group of Object.values(prismaMock)) {
    for (const fn of Object.values(group as Record<string, ReturnType<typeof mock>>)) {
      (fn as any).mockReset();
    }
  }
});

afterEach(() => {
  if (ORIGINAL_RESEND_KEY === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = ORIGINAL_RESEND_KEY;
});

// ── FIX 1 / FIX 3 / FIX 4: sendAutoResponse behavior ──────────────────────

describe('sendAutoResponse — Gemini transient failure handling', () => {
  test('Gemini 503 → retried, then success → solution persisted and emailed', async () => {
    const SOLUTION = '1. Restart the service.\n2. Clear the cache.';
    analyzeAIMock
      .mockRejectedValueOnce(new Error('Gemini API error: high demand (503)'))
      .mockRejectedValueOnce(new Error('Gemini API error: high demand (503)'))
      .mockResolvedValueOnce({
        canResolve: true,
        confidence: 0.92,
        category: 'Technical',
        solution: SOLUTION,
        verification: '',
        reason: 'Known issue',
      });
    kbFindMatchMock.mockReturnValue(null);
    prismaMock.ticket.findUnique.mockResolvedValue(makeTicket());
    prismaMock.emailMessage.findFirst.mockResolvedValue(null);
    prismaMock.emailMessage.findUnique.mockResolvedValue(null);
    prismaMock.emailMessage.create.mockResolvedValue({ id: 'outbound-1' });
    prismaMock.emailMessage.update.mockResolvedValue({});
    prismaMock.reply.create.mockResolvedValue({ id: 'reply-1' });
    prismaMock.ticket.update.mockResolvedValue({});
    sendEmailMock.mockResolvedValue({ emailId: 'resend-1', attempts: 1 });
    getOrCreateAIAgentMock.mockResolvedValue({ id: AI_AGENT_ID });

    const svc = makeService();
    await (svc as any).sendAutoResponse(SENDER_EMAIL, 'My system is behaving strangely', TICKET_ID);

    // Retry happened: 3 attempts total.
    expect(analyzeAIMock).toHaveBeenCalledTimes(3);

    // FIX 3: Reply persisted with the ACTUAL solution text, AGENT sender, AI author.
    expect(prismaMock.reply.create).toHaveBeenCalledTimes(1);
    const replyData = prismaMock.reply.create.mock.calls[0][0].data;
    expect(replyData.body).toContain('Restart the service');
    expect(replyData.body).toContain('Clear the cache');
    expect(replyData.senderType).toBe('AGENT');
    expect(replyData.authorId).toBe(AI_AGENT_ID);
    expect(replyData.ticketId).toBe(TICKET_ID);

    // FIX 4: ticket became RESOLVED with resolvedByAI/resolvedAt/assignee.
    expect(resolvedUpdates()).toHaveLength(1);
    const resolvedData = resolvedUpdates()[0][0].data;
    expect(resolvedData.resolvedByAI).toBe(true);
    expect(resolvedData.resolvedAt).toBeInstanceOf(Date);
    expect(resolvedData.assigneeId).toBe(AI_AGENT_ID);
    expect(resolvedData.category).toBe('TECHNICAL_QUESTION');

    // The solution email (not the fallback) was sent once.
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sentHtml = sendEmailMock.mock.calls[0][2] as string;
    expect(sentHtml).toContain('Restart the service');
    expect(sentHtml).not.toContain('requires further assistance');
  });



  test('Gemini keeps failing → NO misleading fallback email, ticket untouched', async () => {
    analyzeAIMock.mockRejectedValue(new Error('Gemini API error: high demand (503)'));
    kbFindMatchMock.mockReturnValue(null);
    prismaMock.ticket.findUnique.mockResolvedValue(makeTicket());

    const svc = makeService();
    await (svc as any).sendAutoResponse(SENDER_EMAIL, 'My system is behaving strangely', TICKET_ID);

    // All retry attempts were made...
    expect(analyzeAIMock).toHaveBeenCalledTimes(3);
    // ...but NO email was sent at all (no fake fallback, no solution).
    expect(sendEmailMock).not.toHaveBeenCalled();
    // No Reply created, no RESOLVED update, no OPEN/unassign update either
    // (ticket state — incl. AI assignment/classification — is preserved).
    expect(prismaMock.reply.create).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
    expect(prismaMock.emailMessage.create).not.toHaveBeenCalled();
  });

  test('AI explicitly answers canResolve=false → fallback IS allowed', async () => {
    analyzeAIMock.mockResolvedValue({
      canResolve: false,
      confidence: 0.2,
      category: 'Billing',
      solution: '',
      reason: 'Requires account-specific investigation',
    });
    kbFindMatchMock.mockReturnValue(null);
    prismaMock.ticket.findUnique.mockResolvedValue(makeTicket());
    prismaMock.emailMessage.findFirst.mockResolvedValue(null);
    prismaMock.emailMessage.findUnique.mockResolvedValue(null);
    prismaMock.emailMessage.create.mockResolvedValue({ id: 'outbound-1' });
    prismaMock.emailMessage.update.mockResolvedValue({});
    prismaMock.ticket.update.mockResolvedValue({});
    sendEmailMock.mockResolvedValue({ emailId: 'resend-2', attempts: 1 });

    const svc = makeService();
    await (svc as any).sendAutoResponse(SENDER_EMAIL, 'Refund question', TICKET_ID);

    // Analyzed exactly once (no retry — the AI answered).
    expect(analyzeAIMock).toHaveBeenCalledTimes(1);
    // Fallback email sent.
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const sentHtml = sendEmailMock.mock.calls[0][2] as string;
    expect(sentHtml).toContain('requires further assistance');
    // Ticket routed to a human: OPEN + unassigned, with AI classification kept.
    expect(prismaMock.ticket.update).toHaveBeenCalledTimes(1);
    const updateData = prismaMock.ticket.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('OPEN');
    // 'Billing' maps to the valid Prisma enum REFUND_REQUEST (ticketEnums).
    expect(updateData.category).toBe('REFUND_REQUEST');
  });
});


// ── FIX 5: customer reply threading ───────────────────────────────────────

describe('findThreadMatch — customer reply threading', () => {
  function makeParsedEmail(overrides: Record<string, unknown> = {}): any {
    return {
      from: [{ address: SENDER_EMAIL, name: 'Ritika Pandey' }],
      recipients: ['helpdesk@example.com'],
      subject: 'Re: My system is behaving strangely',
      text: 'I tried the steps, still broken.',
      date: new Date(),
      messageId: '<customer-reply-1@mail.gmail.com>',
      ...overrides,
    };
  }

  test('In-Reply-To matches stored messageId → attaches to existing ticket', async () => {
    prismaMock.emailMessage.findFirst.mockResolvedValue({ ticketId: 'ticket-abc' });
    const svc = makeService();
    const result = await (svc as any).findThreadMatch(
      makeParsedEmail({ inReplyTo: '<resend-1@resend.dev>' })
    );
    expect(result).toBe('ticket-abc');
    const where = prismaMock.emailMessage.findFirst.mock.calls[0][0].where;
    expect(where.messageId).toBe('resend-1@resend.dev'); // normalized
    expect(where.ticketId).toEqual({ not: null });
  });

  test('normalized subject fallback matches outbound subject + same sender', async () => {
    // No header matches available.
    prismaMock.emailMessage.findFirst.mockResolvedValue(null);
    prismaMock.emailMessage.findMany.mockResolvedValue([
      { ticketId: 'ticket-xyz', subject: 'Re: My system is behaving strangely' },
    ]);
    prismaMock.ticket.findUnique.mockResolvedValue({ senderEmail: 'Customer@Example.com ' });

    const svc = makeService();
    const result = await (svc as any).findThreadMatch(makeParsedEmail());
    expect(result).toBe('ticket-xyz');

    const findManyArgs = prismaMock.emailMessage.findMany.mock.calls[0][0];
    expect(findManyArgs.where.direction).toBe('OUTBOUND');
    expect(findManyArgs.where.ticketId).toEqual({ not: null });
  });

  test('normalized subject fallback does NOT attach a different sender', async () => {
    prismaMock.emailMessage.findFirst.mockResolvedValue(null);
    prismaMock.emailMessage.findMany.mockResolvedValue([
      { ticketId: 'ticket-xyz', subject: 'Re: My system is behaving strangely' },
    ]);
    // Ticket belongs to someone else — must NOT attach.
    prismaMock.ticket.findUnique.mockResolvedValue({ senderEmail: 'someoneelse@example.com' });

    const svc = makeService();
    const result = await (svc as any).findThreadMatch(makeParsedEmail());
    expect(result).toBeNull();
  });

  test('unrelated subject does not attach to any ticket', async () => {
    prismaMock.emailMessage.findFirst.mockResolvedValue(null);
    prismaMock.emailMessage.findMany.mockResolvedValue([
      { ticketId: 'ticket-xyz', subject: 'Re: My system is behaving strangely' },
    ]);

    const svc = makeService();
    const result = await (svc as any).findThreadMatch(
      makeParsedEmail({ subject: 'Win a free cruise!!!' })
    );
    expect(result).toBeNull();
    // Never even needed the sender check.
    expect(prismaMock.ticket.findUnique).not.toHaveBeenCalled();
  });

  test('empty subject → no fallback lookup at all', async () => {
    prismaMock.emailMessage.findFirst.mockResolvedValue(null);
    const svc = makeService();
    const result = await (svc as any).findThreadMatch(makeParsedEmail({ subject: '' }));
    expect(result).toBeNull();
    expect(prismaMock.emailMessage.findMany).not.toHaveBeenCalled();
  });

  test('normalizeSubject strips repeated Re:/Fwd: prefixes and case', async () => {
    const svc = makeService();
    const norm = (s?: string | null) => (svc as any).normalizeSubject(s);
    expect(norm('Re: Hello')).toBe('hello');
    expect(norm('RE: RE: Fwd: Hello')).toBe('hello');
    expect(norm('  Hello   World ')).toBe('hello world');
    expect(norm(null)).toBe('');
    expect(norm(undefined)).toBe('');
  });
});
