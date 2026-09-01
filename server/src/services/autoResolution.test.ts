/**
 * Tests for AI knowledge-base auto-resolution of email tickets.
 *
 * Run with: bun test src/services/autoResolution.test.ts
 */
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';

// ── Mocks (registered before modules under test are imported) ─────────────

const prismaMock: any = {
  ticket: { findUnique: mock(), update: mock(), create: mock() },
  reply: { create: mock() },
  emailMessage: {
    findFirst: mock(),
    findUnique: mock(),
    create: mock(),
    update: mock(),
    updateMany: mock(),
    findMany: mock(),
  },
  user: { findUnique: mock(), create: mock() },
};
mock.module('../lib/prisma', () => ({ prisma: prismaMock }));

const kbFindMatchMock = mock();
const kbGetStepsMock = mock();
const analyzeTAMock = mock();
mock.module('./knowledgeBaseService', () => ({
  knowledgeBaseService: {
    findMatchingEntry: kbFindMatchMock,
    getResolutionSteps: kbGetStepsMock,
  },
}));

const sendEmailMock = mock();
mock.module('./resend.service', () => ({ sendEmailWithRetry: sendEmailMock }));

const resolveAIMock = mock();
const analyzeAIMock = mock();
const classifyTicketMock = mock();
mock.module('../controllers/ai.controller', () => ({
  resolveTicketWithAI: resolveAIMock,
  analyzeTicketWithAI: analyzeAIMock,
  classifyTicket: classifyTicketMock,
}));

const getOrCreateAIAgentMock = mock();
mock.module('./aiAgentService', () => ({ getOrCreateAIAgent: getOrCreateAIAgentMock }));

// Import modules under test AFTER mocks are registered.
import {
  EmailService,
  buildSolutionEmail,
  buildFallbackEmail,
  buildAcknowledgementEmail,
  AI_RESOLUTION_CONFIDENCE_THRESHOLD,
} from './email.service';
import { processNewTicket } from './ticketProcessing.service';

// ── Shared fixtures ───────────────────────────────────────────────────────

const TICKET_ID = 'ticket-123';
const SENDER_EMAIL = 'customer@example.com';

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    ticketNumber: 42,
    title: 'Forgot password',
    description: "I forgot my password and can't log in. Can you help?",
    status: 'OPEN',
    senderName: 'Customer',
    senderEmail: SENDER_EMAIL,
    reporterId: null,
    ...overrides,
  };
}

const KB_ENTRY = {
  id: 'password-reset-issues',
  title: 'Password Reset Issues',
  category: 'GENERAL_QUESTION',
  keywords: ['forgot password'],
  content: '# Password Reset Issues\n## Troubleshooting Steps\n1. Verify email',
};

const GOOD_DECISION = {
  canResolve: true,
  confidence: 0.95,
  category: 'Password Reset',
  solution:
    '1. Verify your email address.\n2. Request a password reset email.\n3. Check your spam folder.',
  verification: '- Confirm you receive the reset email\n- Log in with the new password',
  reason: 'KB article directly addresses forgotten passwords.',
};

function makeService(): EmailService {
  return new EmailService({ from: 'support@test.local' });
}

function resolvedUpdateCalls(): any[] {
  return prismaMock.ticket.update.mock.calls.filter(
    (c: any[]) => c[0]?.data?.status === 'RESOLVED'
  );
}

beforeEach(() => {
  for (const m of [kbFindMatchMock, kbGetStepsMock, sendEmailMock, resolveAIMock, analyzeAIMock, classifyTicketMock, getOrCreateAIAgentMock]) {
    m.mockReset();
  }
  for (const group of Object.values(prismaMock)) {
    for (const fn of Object.values(group as Record<string, ReturnType<typeof mock>>)) {
      fn.mockReset();
    }
  }
  prismaMock.ticket.findUnique.mockResolvedValue(makeTicket());
  prismaMock.ticket.update.mockResolvedValue({});
  prismaMock.reply.create.mockResolvedValue({ id: 'reply-1' });
  prismaMock.emailMessage.findFirst.mockResolvedValue(null);
  prismaMock.emailMessage.findUnique.mockResolvedValue(null);
  prismaMock.emailMessage.create.mockResolvedValue({ id: 'row-1' });
  prismaMock.emailMessage.update.mockResolvedValue({});
  getOrCreateAIAgentMock.mockResolvedValue({ id: 'ai-agent-id' });
});

async function callSendAutoResponse(): Promise<void> {
  const svc = makeService();
  await (svc as any).sendAutoResponse(SENDER_EMAIL, 'Forgot password', TICKET_ID);
}

// ── Helper unit tests ─────────────────────────────────────────────────────

describe('buildSolutionEmail / buildFallbackEmail', () => {
  test('solution email contains KB steps + verification, no internal details', () => {
    const html = buildSolutionEmail(GOOD_DECISION as any);
    expect(html).toContain('Verify your email address');
    expect(html).toContain('To confirm the issue is resolved');
    for (const forbidden of ['gemini', 'knowledge base', 'system prompt']) {
      expect(html.toLowerCase()).not.toContain(forbidden);
    }
  });

  test('fallback email does not claim resolution', () => {
    const html = buildFallbackEmail();
    expect(html).toContain('requires further assistance');
    expect(html.toLowerCase()).not.toContain('has been resolved');
  });
});

describe('sendAutoResponse — AI knowledge-base auto-resolution', () => {
  test('KB match + high-confidence AI → solution sent, Reply stored, ticket RESOLVED', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    resolveAIMock.mockResolvedValue(GOOD_DECISION);
    sendEmailMock.mockResolvedValue({ emailId: 'resend-email-1', attempts: 1 });

    await callSendAutoResponse();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const htmlSent = sendEmailMock.mock.calls[0][2] as string;
    expect(htmlSent).toContain('Request a password reset email');

    // Customer reply stored correctly.
    expect(prismaMock.reply.create).toHaveBeenCalledTimes(1);
    const replyData = prismaMock.reply.create.mock.calls[0][0].data;
    expect(replyData.ticketId).toBe(TICKET_ID);
    expect(replyData.senderType).toBe('AGENT');
    expect(replyData.body).toContain('password reset');

    // Ticket resolved only after successful send.
    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({ status: 'RESOLVED', resolvedByAI: true }),
    });
  });

  test('no knowledge-base match → fallback sent, ticket stays OPEN', async () => {
    kbFindMatchMock.mockReturnValue(null);
    sendEmailMock.mockResolvedValue({ emailId: 'resend-email-2', attempts: 1 });

    await callSendAutoResponse();

    expect(resolveAIMock).not.toHaveBeenCalled();
    expect((sendEmailMock.mock.calls[0][2] as string)).toContain('requires further assistance');
    expect(resolvedUpdateCalls().length).toBe(0);
    expect(prismaMock.reply.create).not.toHaveBeenCalled();
  });

  test('low-confidence AI (< threshold) → fallback sent, ticket stays OPEN', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    resolveAIMock.mockResolvedValue({ ...GOOD_DECISION, confidence: 0.5 });
    sendEmailMock.mockResolvedValue({ emailId: 'resend-email-3', attempts: 1 });

    await callSendAutoResponse();

    expect(AI_RESOLUTION_CONFIDENCE_THRESHOLD).toBe(0.85);
    expect((sendEmailMock.mock.calls[0][2] as string)).toContain('requires further assistance');
    expect(resolvedUpdateCalls().length).toBe(0);
    expect(prismaMock.reply.create).not.toHaveBeenCalled();
  });
});

describe('sendAutoResponse — failure handling', () => {
  test('Gemini throws → logged safely, fallback sent, ticket stays OPEN, no crash', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    resolveAIMock.mockRejectedValue(new Error('Gemini API error: quota exceeded'));
    sendEmailMock.mockResolvedValue({ emailId: 'resend-email-4', attempts: 1 });

    await callSendAutoResponse(); // must not throw

    expect((sendEmailMock.mock.calls[0][2] as string)).toContain('requires further assistance');
    expect(resolvedUpdateCalls().length).toBe(0);
    expect(prismaMock.reply.create).not.toHaveBeenCalled();
  });

  test('email sending failure → ticket NOT marked RESOLVED, row marked FAILED', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    resolveAIMock.mockResolvedValue(GOOD_DECISION);
    sendEmailMock.mockResolvedValue({ emailId: null, error: 'Resend unavailable', attempts: 3 });

    await callSendAutoResponse();

    expect(prismaMock.emailMessage.update).toHaveBeenCalledWith({
      where: { id: 'row-1' },
      data: expect.objectContaining({ deliveryStatus: 'FAILED' }),
    });
    expect(resolvedUpdateCalls().length).toBe(0);
    expect(prismaMock.reply.create).not.toHaveBeenCalled();
  });
});

describe('processNewTicket — existing behaviour preserved', () => {
  test('default (API/webhook) path keeps KB auto-resolution: match resolves ticket', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    kbGetStepsMock.mockReturnValue('1. Reset via link');
    prismaMock.ticket.create.mockResolvedValue(makeTicket({ status: 'NEW' }));

    await processNewTicket({
      title: 'Forgot password',
      description: 'I forgot my password',
      senderName: 'C',
      senderEmail: SENDER_EMAIL,
    });

    const resolvedCall = resolvedUpdateCalls()[0];
    expect(resolvedCall).toBeDefined();
    expect(kbGetStepsMock).toHaveBeenCalled();
  });

  test('skipAutoResolve=true (email path) defers resolution to sendAutoResponse', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    prismaMock.ticket.create.mockResolvedValue(makeTicket({ status: 'NEW' }));
    classifyTicketMock.mockRejectedValue(new Error('no gemini in test'));

    await processNewTicket({
      title: 'Forgot password',
      description: 'I forgot my password',
      senderName: 'C',
      senderEmail: SENDER_EMAIL,
      skipAutoResolve: true,
    });

    expect(resolvedUpdateCalls().length).toBe(0);
    expect(prismaMock.reply.create).not.toHaveBeenCalled();
    // Background classification fired; its failure handler must NOT override
    // an already-RESOLVED ticket (guarded with status: { not: "RESOLVED" }).
    expect(classifyTicketMock).toHaveBeenCalled();
  });
});

// ── Issue 1: AI-resolved tickets are assigned to the existing AI agent ────

describe('buildAcknowledgementEmail — immediate acknowledgement (Problem E)', () => {
  test('greets the sender by first name and never promises human follow-up', () => {
    const html = buildAcknowledgementEmail('Ritika Pandey', 'Wi-Fi connection issue');
    expect(html).toContain('Hello Ritika,');
    expect(html).toContain('Wi-Fi connection issue');
    expect(html).toContain('analyzing the issue');
    expect(html.toLowerCase()).not.toContain('requires further assistance');
    expect(html.toLowerCase()).not.toContain('support agent will follow up');
    expect(html.toLowerCase()).not.toContain('agent will follow up');
  });

  test('falls back to a generic greeting when no sender name is available', () => {
    const html = buildAcknowledgementEmail();
    expect(html).toContain('Hello,');
    expect(html).not.toContain('Hello undefined');
  });

  test('escapes user-provided name/subject in the acknowledgement', () => {
    const html = buildAcknowledgementEmail('<script>x</script>', '<b>Wi-Fi</b>');
    expect(html).not.toContain('<script>x</script>');
    expect(html).not.toContain('<b>Wi-Fi</b>');
  });
});

describe('sendAutoResponse — AI agent assignment', () => {
  test('AI-resolved ticket gets assigneeId = existing AI agent, resolvedByAI, RESOLVED', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    resolveAIMock.mockResolvedValue(GOOD_DECISION);
    sendEmailMock.mockResolvedValue({ emailId: 'resend-email-10', attempts: 1 });

    await callSendAutoResponse();

    expect(prismaMock.ticket.update).toHaveBeenCalledWith({
      where: { id: TICKET_ID },
      data: expect.objectContaining({
        status: 'RESOLVED',
        resolvedByAI: true,
        assigneeId: 'ai-agent-id',
      }),
    });
    // The SAME existing AI agent authored the reply (no new AI user created).
    const replyData = prismaMock.reply.create.mock.calls[0][0].data;
    expect(replyData.authorId).toBe('ai-agent-id');
    expect(getOrCreateAIAgentMock).toHaveBeenCalledTimes(1);
  });

  test('failed AI resolution does NOT assign or resolve the ticket', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    resolveAIMock.mockRejectedValue(new Error('Gemini down'));
    sendEmailMock.mockResolvedValue({ emailId: 'resend-email-11', attempts: 1 });

    await callSendAutoResponse();

    const data = prismaMock.ticket.update.mock.calls[0]?.[0]?.data;
    expect(data?.status).not.toBe('RESOLVED');
    // The ticket must NOT be marked as resolved nor assigned to AI; it is
    // unassigned (assigneeId null) so it is visible to human agents.
    expect(data?.assigneeId).toBeNull();
    expect(prismaMock.reply.create).not.toHaveBeenCalled();
  });

  test('email send failure → no assignment, no resolution', async () => {
    kbFindMatchMock.mockReturnValue(KB_ENTRY);
    resolveAIMock.mockResolvedValue(GOOD_DECISION);
    sendEmailMock.mockResolvedValue({ emailId: null, error: 'down', attempts: 3 });

    await callSendAutoResponse();

    for (const call of prismaMock.ticket.update.mock.calls) {
      expect(call[0].data.status).not.toBe('RESOLVED');
      expect(call[0].data.assigneeId).toBeUndefined();
    }
  });
});

// ── Issue 2: recipient-based filtering ────────────────────────────────────

describe('recipient filtering (isAddressedToHelpdesk / extractRecipients)', () => {
  const ORIGINAL_IMAP_USER = process.env.EMAIL_IMAP_USER;
  const ORIGINAL_ALIASES = process.env.HELPDESK_TO_ADDRESSES;

  beforeEach(() => {
    process.env.EMAIL_IMAP_USER = 'HelpDesk@Support.example.com';
    delete process.env.HELPDESK_TO_ADDRESSES;
  });

  afterEach(() => {
    if (ORIGINAL_IMAP_USER === undefined) delete process.env.EMAIL_IMAP_USER;
    else process.env.EMAIL_IMAP_USER = ORIGINAL_IMAP_USER;
    if (ORIGINAL_ALIASES === undefined) delete process.env.HELPDESK_TO_ADDRESSES;
    else process.env.HELPDESK_TO_ADDRESSES = ORIGINAL_ALIASES;
  });

  function makeParsedEmail(recipients: string[]): any {
    return { recipients } as any;
  }

  test('email addressed To Help Desk → accepted', () => {
    const svc = makeService();
    expect(svc.isAddressedToHelpdesk(makeParsedEmail(['helpdesk@support.example.com']))).toBe(true);
  });

  test('email addressed only to personal Gmail → ignored', () => {
    const svc = makeService();
    expect(svc.isAddressedToHelpdesk(makeParsedEmail(['customer@gmail.com']))).toBe(false);
  });

  test('Google security notification to personal Gmail → ignored', () => {
    const svc = makeService();
    expect(
      svc.isAddressedToHelpdesk(makeParsedEmail(['ritikapandey0710@gmail.com']))
    ).toBe(false);
  });

  test('newsletter to personal Gmail → ignored', () => {
    const svc = makeService();
    expect(svc.isAddressedToHelpdesk(makeParsedEmail(['subscriber@gmail.com']))).toBe(false);
  });

  test('Cc to Help Desk → accepted', () => {
    const svc = makeService();
    expect(
      svc.isAddressedToHelpdesk(makeParsedEmail(['friend@gmail.com', 'helpdesk@support.example.com']))
    ).toBe(true);
  });

  test('case-insensitive matching', () => {
    const svc = makeService();
    expect(
      svc.isAddressedToHelpdesk(makeParsedEmail(['HELPDESK@SUPPORT.EXAMPLE.COM']))
    ).toBe(true);
    expect(
      svc.isAddressedToHelpdesk(makeParsedEmail(['HelpDesk@Support.Example.Com']))
    ).toBe(true);
  });

  test('multiple recipients including Help Desk → accepted', () => {
    const svc = makeService();
    expect(
      svc.isAddressedToHelpdesk(
        makeParsedEmail(['a@x.com', 'b@y.org', 'helpdesk@support.example.com', 'c@z.net'])
      )
    ).toBe(true);
  });

  test('optional alias addresses are honored', () => {
    process.env.HELPDESK_TO_ADDRESSES = 'tickets@help.example.com, other@x.com';
    const svc = makeService();
    expect(svc.getHelpdeskAddresses()).toContain('tickets@help.example.com');
    expect(svc.isAddressedToHelpdesk(makeParsedEmail(['tickets@help.example.com']))).toBe(true);
    expect(svc.isAddressedToHelpdesk(makeParsedEmail(['other@gmail.com']))).toBe(false);
  });

  test('extractRecipients collects To, Cc, Delivered-To, X-Original-To', () => {
    const svc = makeService();
    const parsed = {
      to: { value: [{ address: 'One@X.com' }, { address: 'two@y.com' }] },
      cc: { value: [{ address: 'Three@Z.com' }] },
    };
    const headers = new Map<string, any>([
      ['delivered-to', 'Delivered <four@w.com>'],
      ['x-original-to', 'five@v.com'],
    ]);
    const recips = (svc as any).extractRecipients(parsed, headers);
    expect(recips).toEqual(
      expect.arrayContaining([
        'one@x.com', 'two@y.com', 'three@z.com', 'four@w.com', 'five@v.com',
      ])
    );
  });

  test('no configured receiving address fails open (ingestion not broken)', () => {
    delete process.env.EMAIL_IMAP_USER;
    const svc = makeService();
    expect(svc.isAddressedToHelpdesk(makeParsedEmail([]))).toBe(true);
  });
});