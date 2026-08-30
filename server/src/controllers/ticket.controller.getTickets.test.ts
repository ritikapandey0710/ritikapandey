/**
 * Tests for the getTickets function to verify NEW and PROCESSING ticket visibility.
 */
import { describe, test, expect, mock, beforeEach } from 'bun:test';

// Mock Prisma
const prismaMock = {
  ticket: {
    findMany: mock(),
  },
};

// Mock request and response
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

function makeQuery(overrides: Record<string, unknown> = {}) {
  return { ...overrides } as any;
}

// Mock the prisma module
mock.module('../lib/prisma', () => ({ prisma: prismaMock }));

// Import the function we're testing
import { getTickets } from './ticket.controller';

beforeEach(() => {
  prismaMock.ticket.findMany.mockReset();
});

describe('getTickets controller', () => {
  test('includes NEW and PROCESSING tickets by default', async () => {
    // Arrange
    const mockTickets = [
      { id: '1', status: 'NEW', title: 'New ticket' },
      { id: '2', status: 'PROCESSING', title: 'Processing ticket' },
      { id: '3', status: 'OPEN', title: 'Open ticket' },
    ];
    prismaMock.ticket.findMany.mockResolvedValue(mockTickets);

    const req = { query: makeQuery() };
    const res = makeRes();

    // Act
    await getTickets(req, res);

    // Assert
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {}, // Empty where clause since no filters
        orderBy: { createdAt: 'desc' }, // Default sort
        include: expect.anything()
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockTickets);
  });

  test('excludes NEW and PROCESSING tickets when excludeAiResolved=true', async () => {
    // Arrange
    const mockTickets = [
      { id: '1', status: 'OPEN', title: 'Open ticket' },
      { id: '2', status: 'CLOSED', title: 'Closed ticket' },
    ];
    prismaMock.ticket.findMany.mockResolvedValue(mockTickets);

    const req = { query: makeQuery({ excludeAiResolved: 'true' }) };
    const res = makeRes();

    // Act
    await getTickets(req, res);

    // Assert
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: expect.objectContaining({
            status: expect.objectContaining({
              in: ['NEW', 'PROCESSING']
            })
          })
        }),
        orderBy: { createdAt: 'desc' },
        include: expect.anything()
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockTickets);
  });

  test('preserves other filters when excludeAiResolved is not set', async () => {
    // Arrange
    const mockTickets = [
      { id: '1', status: 'NEW', title: 'New ticket', priority: 'HIGH' },
    ];
    prismaMock.ticket.findMany.mockResolvedValue(mockTickets);

    const req = { query: makeQuery({ priority: 'HIGH' }) };
    const res = makeRes();

    // Act
    await getTickets(req, res);

    // Assert
    expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          priority: 'HIGH'
        }),
        orderBy: { createdAt: 'desc' },
        include: expect.anything()
      })
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockTickets);
  });
});