/**
 * Tests for the secure ticket-deletion feature.
 *
 * Run with: bun test src/controllers/ticket.controller.test.ts
 */
import { describe, test, expect, mock, beforeEach } from 'bun:test';

// ── Mocks ─────────────────────────────────────────────────────────────────

const prismaMock: any = {
  ticket: {
    findUnique: mock(),
    delete: mock(),
  },
  reply: { deleteMany: mock() },
  emailMessage: { deleteMany: mock() },
  $transaction: mock(),
};
mock.module('../lib/prisma', () => ({ prisma: prismaMock }));

const getSessionMock = mock();
mock.module('../lib/auth', () => ({
  auth: { api: { getSession: getSessionMock } },
}));

import { deleteTicket } from './ticket.controller';
import { authenticateAndAuthorizeAdmin } from '../middleware/auth.middleware';

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return { params: { id: 'ticket-1' }, headers: {}, ...overrides } as any;
}

beforeEach(() => {
  for (const m of [getSessionMock, prismaMock.$transaction]) m.mockReset();
  for (const group of [prismaMock.ticket, prismaMock.reply, prismaMock.emailMessage]) {
    for (const fn of Object.values(group as Record<string, ReturnType<typeof mock>>)) {
      fn.mockReset();
    }
  }
  prismaMock.ticket.findUnique.mockResolvedValue({ id: 'ticket-1' });
  prismaMock.ticket.delete.mockResolvedValue({});
  prismaMock.reply.deleteMany.mockResolvedValue({ count: 2 });
  prismaMock.emailMessage.deleteMany.mockResolvedValue({ count: 3 });
  prismaMock.$transaction.mockImplementation(async (ops: any[]) => ops);
});

// ── Controller behaviour ──────────────────────────────────────────────────

describe('deleteTicket controller', () => {
  test('admin can delete an existing ticket', async () => {
    const req = makeReq({ user: { id: 'u1', role: 'ADMIN' } });
    const res = makeRes();

    await deleteTicket(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Ticket deleted successfully');
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  test('related records are deleted before the ticket, inside a transaction', async () => {
    const req = makeReq({ user: { id: 'u1', role: 'ADMIN' } });
    const res = makeRes();

    await deleteTicket(req, res);

    const ops = prismaMock.$transaction.mock.calls[0][0] as any[];
    expect(ops.length).toBe(3);
    expect(prismaMock.emailMessage.deleteMany).toHaveBeenCalledWith({
      where: { ticketId: 'ticket-1' },
    });
    expect(prismaMock.reply.deleteMany).toHaveBeenCalledWith({
      where: { ticketId: 'ticket-1' },
    });
    expect(prismaMock.ticket.delete).toHaveBeenCalledWith({ where: { id: 'ticket-1' } });
  });

  test('agent (non-admin) receives 403 and nothing is deleted', async () => {
    const req = makeReq({ user: { id: 'u2', role: 'AGENT' } });
    const res = makeRes();

    await deleteTicket(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toContain('Forbidden');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.ticket.delete).not.toHaveBeenCalled();
  });

  test('regular user (USER role) receives 403', async () => {
    const req = makeReq({ user: { id: 'u3', role: 'USER' } });
    const res = makeRes();

    await deleteTicket(req, res);

    expect(res.statusCode).toBe(403);
    expect(prismaMock.ticket.delete).not.toHaveBeenCalled();
  });

  test('non-existent ticket returns 404', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);
    const req = makeReq({ user: { id: 'u1', role: 'ADMIN' } });
    const res = makeRes();

    await deleteTicket(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Ticket not found');
    expect(prismaMock.ticket.delete).not.toHaveBeenCalled();
  });

  test('deletion failure returns 500 without a false success', async () => {
    prismaMock.$transaction.mockRejectedValue(new Error('FK violation'));
    const req = makeReq({ user: { id: 'u1', role: 'ADMIN' } });
    const res = makeRes();

    await deleteTicket(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body.error).toBe('Failed to delete ticket');
  });

  test('missing user on request gets 403 (defense-in-depth)', async () => {
    const req = makeReq(); // no req.user at all
    const res = makeRes();

    await deleteTicket(req, res);

    expect(res.statusCode).toBe(403);
    expect(prismaMock.ticket.delete).not.toHaveBeenCalled();
  });
});

// ── Route middleware (existing better-auth based authorization) ───────────

describe('authenticateAndAuthorizeAdmin middleware', () => {
  test('unauthenticated request is rejected with 401', async () => {
    getSessionMock.mockResolvedValue(null);
    const req = makeReq();
    const res = makeRes();
    const next = mock();

    await authenticateAndAuthorizeAdmin(req as any, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('agent session is rejected with 403', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u2', role: 'AGENT' } });
    const req = makeReq();
    const res = makeRes();
    const next = mock();

    await authenticateAndAuthorizeAdmin(req as any, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('admin session passes through to the handler', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u1', role: 'ADMIN' } });
    const req = makeReq();
    const res = makeRes();
    const next = mock();

    await authenticateAndAuthorizeAdmin(req as any, res, next);

    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

