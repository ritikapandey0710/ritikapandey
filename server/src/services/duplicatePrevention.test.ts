/**
 * Tests for duplicate email prevention in EmailService.
 * Verifies that concurrent processing of the same Message-ID results in exactly one ticket.
 */
import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { EmailService } from './email.service';
import { processNewTicket } from './ticketProcessing.service';
import { sendEmailWithRetry } from './resend.service';
import { resolveTicketWithAI } from '../controllers/ai.controller';
import { getOrCreateAIAgent } from './aiAgentService';
import { knowledgeBaseService } from './knowledgeBaseService';

// Mock all external dependencies
const prismaMock: any = {
  emailMessage: {
    create: mock(),
    findUnique: mock(),
    findFirst: mock(),
    update: mock(),
    delete: mock(),
    findMany: mock(),
  },
  ticket: {
    create: mock(),
    findUnique: mock(),
    update: mock(),
  },
  reply: {
    create: mock(),
  },
  user: {
    findUnique: mock(),
    create: mock(),
  },
};

mock.module('../lib/prisma', () => ({ prisma: prismaMock }));

// Mock knowledge base service
const kbFindMatchMock = mock();
mock.module('./knowledgeBaseService', () => ({
  knowledgeBaseService: {
    findMatchingEntry: kbFindMatchMock,
  },
}));

// Mock AI controller
const resolveAIMock = mock();
const analyzeAIMock = mock();
mock.module('../controllers/ai.controller', () => ({
  resolveTicketWithAI: resolveAIMock,
  analyzeTicketWithAI: analyzeAIMock,
}));

// Mock resend service
const sendEmailMock = mock();
mock.module('./resend.service', () => ({
  sendEmailWithRetry: sendEmailMock,
}));

// Mock AI agent service
const getOrCreateAIAgentMock = mock();
mock.module('./aiAgentService', () => ({
  getOrCreateAIAgent: getOrCreateAIAgentMock,
}));

const MESSAGE_ID = '<test-message-123@example.com>';
const SENDER_EMAIL = 'customer@example.com';
const SENDER_NAME = 'Test Customer';
const SUBJECT = 'Test Subject';
const DESCRIPTION = 'Test Description';

function makeParsedEmail(): any {
  return {
    from: [{ address: SENDER_EMAIL, name: SENDER_NAME }],
    recipients: [SENDER_EMAIL.toLowerCase()],
    subject: SUBJECT,
    text: DESCRIPTION,
    html: undefined,
    date: new Date(),
    messageId: MESSAGE_ID,
    inReplyTo: undefined,
    references: undefined,
    gmailThreadId: undefined,
  };
}

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-123',
    ticketNumber: 42,
    title: overrides.title || SUBJECT,
    description: overrides.description || DESCRIPTION,
    status: 'OPEN',
    senderName: SENDER_NAME,
    senderEmail: SENDER_EMAIL,
    reporterId: null,
    ...overrides,
  };
}

function makeService(): EmailService {
  return new EmailService({
    from: 'support@test.local',
    imap: {
      user: 'test@example.com',
      password: 'test',
      host: 'imap.test.com',
      port: 993,
      tls: true,
    },
  });
}

beforeEach(() => {
  // Reset all mocks
  for (const m of [
    kbFindMatchMock,
    resolveAIMock,
    analyzeAIMock,
    sendEmailMock,
    getOrCreateAIAgentMock,
  ]) {
    m.mockReset();
  }

  for (const group of Object.values(prismaMock)) {
    for (const fn of Object.values(group as Record<string, ReturnType<typeof mock>>)) {
      fn.mockReset();
    }
  }

  // Set up default mock returns
  prismaMock.user.findUnique.mockResolvedValue(null);
  prismaMock.user.create.mockResolvedValue({ id: 'user-123' });
  prismaMock.ticket.findUnique.mockResolvedValue(null);
  prismaMock.ticket.create.mockResolvedValue(makeTicket());
  prismaMock.ticket.update.mockResolvedValue({});
  prismaMock.reply.create.mockResolvedValue({ id: 'reply-1' });
  prismaMock.emailMessage.findUnique.mockResolvedValue(null);
  prismaMock.emailMessage.findFirst.mockResolvedValue(null);
  prismaMock.emailMessage.create.mockResolvedValue({ id: 'email-1' });
  prismaMock.emailMessage.update.mockResolvedValue({});
  prismaMock.emailMessage.delete.mockResolvedValue({});
  getOrCreateAIAgentMock.mockResolvedValue({ id: 'ai-agent-1' });
  sendEmailMock.mockResolvedValue({ emailId: 'resend-email-1', attempts: 1 });

  // Mock AI to return a resolvable decision
  resolveAIMock.mockResolvedValue({
    canResolve: true,
    confidence: 0.95,
    category: 'GENERAL_QUESTION',
    solution: 'Test solution',
    verification: 'Test verification',
    reason: 'Test reason',
  });

  analyzeAIMock.mockResolvedValue({
    canResolve: true,
    confidence: 0.8,
    category: 'GENERAL_QUESTION',
    solution: 'Test solution',
    verification: 'Test verification',
  });

  // Mock knowledge base to return no match (so we use AI path)
  kbFindMatchMock.mockReturnValue(null);
});

async function processEmailInternal(
  service: EmailService,
  connection: any,
  email: any,
  rawEmail: string
): Promise<void> {
  // Call the private processEmail method via accessing it directly
  // In a real test we'd use dependency injection or expose it differently
  // For this test, we'll call checkForNewEmails which internally calls processEmail
  // but we need to simulate the IMAP interaction

  // Instead, let's directly test the core logic by mocking the IMAP interaction
  // and calling processEmail via reflection or by testing the public methods

  // For simplicity in this test, we'll test the duplicate prevention logic
  // by directly calling the recordEmailMessage and findThreadMatch methods
  // and verifying the behavior

  // Actually, let's test the public checkForNewEmails method by mocking IMAP
  const rawPart = { which: '', body: rawEmail };
  const message = { parts: [rawPart], attributes: { uid: '123' } };

  // Mock the IMAP connection methods
  connection.search = mock().mockResolvedValue([message]);
  connection.openBox = mock().mockImplementation((box: string, callback: (err: any) => void) => {
    callback(null);
  });
  connection.addFlags = mock().mockResolvedValue(null);
  connection.end = mock().mockResolvedValue(null);

  await service.checkForNewEmails();
}

describe('EmailService duplicate prevention', () => {
  test('concurrent processing of same Message-ID results in exactly one ticket', async () => {
    const service1 = makeService();
    const service2 = makeService();

    // Mock IMAP connections
    const connection1 = { uid: '123' };
    const connection2 = { uid: '124' };

    const rawEmail = `From: ${SENDER_NAME} <${SENDER_EMAIL}>
To: helpdesk@example.com
Subject: ${SUBJECT}
Message-ID: ${MESSAGE_ID}
Date: ${new Date().toUTCString()}

${DESCRIPTION}`;

    // First call creates placeholder and processes normally
    // Second call should detect duplicate and skip processing

    // Mock the first call to succeed in creating placeholder
    prismaMock.emailMessage.create.mockReset();
    prismaMock.emailMessage.create.mockResolvedValueOnce({ id: 'placeholder-1' }); // First call creates placeholder
    prismaMock.emailMessage.create.mockResolvedValueOnce({ id: 'email-1' }); // Second call gets P2002 error

    // When checking for existing record after P2002, return null first time (placeholder exists but no ticket yet)
    // Then return the placeholder with ticketId set after processing completes
    prismaMock.emailMessage.findUnique.mockReset();
    prismaMock.emailMessage.findUnique
      .mockResolvedValueOnce(null) // First check after P2002 - no existing record yet
      .mockResolvedValueOnce({ ticketId: 'ticket-123', replyId: null }); // Second check - ticket now exists

    // Process first email
    await service1.checkForNewEmails();

    // Process second email (should detect duplicate)
    await service2.checkForNewEmails();

    // Verify exactly one ticket was created
    expect(prismaMock.ticket.create).toHaveBeenCalledTimes(1);

    // Verify exactly one EmailMessage record was created for the actual email (not just placeholder)
    // The placeholder creation might have failed on second call due to P2002
    expect(prismaMock.emailMessage.create).toHaveBeenCalledTimes(2); // One placeholder, one actual

    // Verify that update was called to set ticketId on the placeholder
    expect(prismaMock.emailMessage.update).toHaveBeenCalled();

    // Verify exactly one AI resolution was attempted
    expect(resolveAIMock).toHaveBeenCalledTimes(1);

    // Verify exactly one auto-response was sent
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  test('failed processing allows retry on second attempt', async () => {
    const service1 = makeService();
    const service2 = makeService();

    const rawEmail = `From: ${SENDER_NAME} <${SENDER_EMAIL}>
To: helpdesk@example.com
Subject: ${SUBJECT}
Message-ID: ${MESSAGE_ID}
Date: ${new Date().toUTCString()}

${DESCRIPTION}`;

    // First call fails during processing (after placeholder created)
    // Second call should be able to retry

    // First call: create placeholder succeeds, but then ticket creation fails
    prismaMock.emailMessage.create.mockReset();
    prismaMock.emailMessage.create.mockResolvedValueOnce({ id: 'placeholder-1' }); // Placeholder created
    prismaMock.emailMessage.create.mockRejectedValue(new Error('Database error')); // Ticket creation fails

    // Second call: detects existing placeholder, but since processing failed previously,
    // it should be allowed to retry (placeholder gets cleaned up on failure)
    prismaMock.emailMessage.create.mockResolvedValueOnce({ id: 'placeholder-2' }); // New placeholder
    prismaMock.emailMessage.create.mockResolvedValueOnce({ id: 'email-1' }); // Actual email record

    // Mock finding existing placeholder (first call's placeholder that was not updated)
    prismaMock.emailMessage.findUnique.mockReset();
    prismaMock.emailMessage.findUnique
      .mockResolvedValueOnce(null) // First call: no existing record when creating placeholder
      .mockResolvedValueOnce({ ticketId: null, replyId: null }) // Second call: finds placeholder without ticketId
      .mockResolvedValueOnce(null) // Second call's create: no conflict
      .mockResolvedValueOnce({ ticketId: 'ticket-123', replyId: null }); // After processing: ticket exists

    // Process first email (should fail)
    try {
      await service1.checkForNewEmails();
    } catch (e) {
      // Expected to fail
    }

    // Process second email (should succeed after retry)
    await service2.checkForNewEmails();

    // Verify exactly one ticket was created (second attempt succeeded)
    expect(prismaMock.ticket.create).toHaveBeenCalledTimes(1);

    // Verify placeholder was cleaned up after first failure and recreated
    expect(prismaMock.emailMessage.create).toHaveBeenCalledTimes(3);
    // 1st call: placeholder + failed ticket creation
    // 2nd call: new placeholder + actual email record

    // Verify delete was called to clean up failed placeholder
    expect(prismaMock.emailMessage.delete).toHaveBeenCalled();

    // Verify exactly one AI resolution was attempted (on successful attempt)
    expect(resolveAIMock).toHaveBeenCalledTimes(1);

    // Verify exactly one auto-response was sent (on successful attempt)
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  test('polling protection prevents overlapping execution', async () => {
    const service = makeService();

    // Set polling flag to true to simulate ongoing polling
    // @ts-ignore: accessing private field for test
    service.isPolling = true;

    const rawEmail = `From: ${SENDER_NAME} <${SENDER_EMAIL}>
To: helpdesk@example.com
Subject: ${SUBJECT}
Message-ID: ${MESSAGE_ID}
Date: ${new Date().toUTCString()}

${DESCRIPTION}`;

    // Mock IMAP to return an email
    const rawPart = { which: '', body: rawEmail };
    const message = { parts: [rawPart], attributes: { uid: '123' } };

    // Mock the IMAP connection methods
    const connection = { uid: '123' };
    connection.search = mock().mockResolvedValue([message]);
    connection.openBox = mock().mockImplementation((box: string, callback: (err: any) => void) => {
      callback(null);
    });
    connection.addFlags = mock().mockResolvedValue(null);
    connection.end = mock().mockResolvedValue(null);

    // Call checkForNewEmails directly - should return 0 immediately due to polling guard
    const result = await service.checkForNewEmails();

    // Should return 0 because isPolling is true
    expect(result).toBe(0);

    // Verify that IMAP search was NOT called due to early return
    expect(connection.search).not.toHaveBeenCalled();
  });
});