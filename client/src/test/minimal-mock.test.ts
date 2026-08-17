import { vi, describe, it, expect } from 'vitest';

vi.mock('../api', () => {
  console.log('[MINIMAL MOCK] factory called');
  return {
    fetchTicketById: vi.fn(() => 'mocked-value'),
    updateTicket: vi.fn(),
    fetchUsers: vi.fn(),
  };
});

import { fetchTicketById } from '../api';

describe('minimal mock test', () => {
  it('mock should work', () => {
    console.log('[MINIMAL TEST] fetchTicketById =', fetchTicketById);
    console.log('[MINIMAL TEST] typeof fetchTicketById =', typeof fetchTicketById);
    console.log('[MINIMAL TEST] result =', fetchTicketById('1'));
    expect(fetchTicketById('1')).toBe('mocked-value');
  });
});
