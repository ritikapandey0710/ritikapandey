import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TicketsPage from './TicketsPage';

// Mock auth client
vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
  },
}));

// Mock API
vi.mock('../api', () => ({
  fetchTickets: vi.fn(),
  createTicket: vi.fn(),
}));

import { authClient } from '../lib/auth-client';
import { fetchTickets, createTicket } from '../api';

const mockSession = { user: { id: '1', name: 'Test User', email: 'test@example.com' } };

const mockTickets = [
  {
    id: 'ticket-1',
    ticketNumber: 1,
    title: 'Login issue',
    body: 'Cannot log in',
    senderName: 'Alice',
    senderEmail: 'alice@example.com',
    status: 'OPEN',
    priority: 'MEDIUM',
    category: 'TECHNICAL_QUESTION',
    assigneeId: null,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'ticket-2',
    ticketNumber: 2,
    title: 'Refund request',
    body: null,
    senderName: 'Bob',
    senderEmail: 'bob@example.com',
    status: 'RESOLVED',
    priority: 'HIGH',
    category: 'REFUND_REQUEST',
    assigneeId: 'agent@example.com',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
  },
];

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<TicketsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authClient.useSession).mockReturnValue({ data: mockSession, isPending: false } as any);
});

describe('TicketsPage', () => {
  it('shows loading spinner while fetching', () => {
    vi.mocked(fetchTickets).mockReturnValue(new Promise(() => {}));
    renderPage();
    // Current application uses an animate-spin spinner for loading
    expect(document.querySelectorAll('.animate-spin').length).toBeGreaterThan(0);
  });

  it('renders ticket rows when data loads', async () => {
    vi.mocked(fetchTickets).mockResolvedValue(mockTickets);
    renderPage();
    await screen.findByText('Login issue');
    expect(screen.getByText('Refund request')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // senderEmail is not displayed as a separate column in the current UI
  });

  it('shows correct ticket count in header', async () => {
    vi.mocked(fetchTickets).mockResolvedValue(mockTickets);
    renderPage();
    await screen.findByText(/1-2 of 2 tickets/);
  });

  it('shows empty state when no tickets', async () => {
    vi.mocked(fetchTickets).mockResolvedValue([]);
    renderPage();
    await screen.findByText('No tickets yet');
    expect(screen.getByText('Create your first ticket to get started')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    vi.mocked(fetchTickets).mockRejectedValue(new Error('Network error'));
    renderPage();
    await screen.findByText(/Failed to load tickets/i);
  });

  it('renders status badges correctly', async () => {
    vi.mocked(fetchTickets).mockResolvedValue(mockTickets);
    renderPage();
    // Use getAllByText since both filter options and badges have status text
    await waitFor(() => {
      expect(screen.getAllByText(/Open/).length).toBeGreaterThan(0);
    });
    // Verify the actual badge (span) elements exist in the table
    const row = screen.getAllByRole('row')[1]; // first data row
    expect(row.textContent).toContain('Open');
    const row2 = screen.getAllByRole('row')[2]; // second data row
    expect(row2.textContent).toContain('Resolved');
  });

  it('renders category labels correctly', async () => {
    vi.mocked(fetchTickets).mockResolvedValue(mockTickets);
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/Technical Question/).length).toBeGreaterThan(0);
    });
    const row = screen.getAllByRole('row')[1];
    expect(row.textContent).toContain('Technical Question');
    const row2 = screen.getAllByRole('row')[2];
    expect(row2.textContent).toContain('Refund Request');
  });

  it('renders dash for null assignedTo', async () => {
    vi.mocked(fetchTickets).mockResolvedValue(mockTickets);
    renderPage();
    await screen.findByText('Login issue');
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('sorts tickets newest first', async () => {
    vi.mocked(fetchTickets).mockResolvedValue(mockTickets);
    renderPage();
    await screen.findByText('Login issue');
    const rows = screen.getAllByRole('row');
    // ticket-1 (Jan 2) should appear before ticket-2 (Jan 1)
    expect(rows[1].textContent).toContain('Login issue');
    expect(rows[2].textContent).toContain('Refund request');
  });

  it('shows spinner while auth is pending', () => {
    vi.mocked(authClient.useSession).mockReturnValue({ data: null, isPending: true } as any);
    vi.mocked(fetchTickets).mockResolvedValue([]);
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders nothing when not authenticated', () => {
    vi.mocked(authClient.useSession).mockReturnValue({ data: null, isPending: false } as any);
    vi.mocked(fetchTickets).mockResolvedValue([]);
    const { container } = renderPage();
    expect(container.firstChild).toBeNull();
  });

  describe('CreateTicketModal', () => {
    beforeEach(() => {
      vi.mocked(fetchTickets).mockResolvedValue([]);
    });

    it('modal is hidden by default', async () => {
      renderPage();
      await screen.findByText('No tickets yet');
      expect(screen.queryByText('New Ticket')).not.toBeNull(); // button exists
      expect(screen.queryByRole('heading', { name: 'New Ticket' })).toBeNull();
    });

    it('opens modal on New Ticket button click', async () => {
      renderPage();
      await screen.findByText('No tickets yet');
      fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
      expect(screen.getByRole('heading', { name: 'New Ticket' })).toBeInTheDocument();
    });

    it('closes modal on Cancel click', async () => {
      renderPage();
      await screen.findByText('No tickets yet');
      fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(screen.queryByRole('heading', { name: 'New Ticket' })).toBeNull();
    });

    it('shows validation errors on empty submit', async () => {
      renderPage();
      await screen.findByText('No tickets yet');
      fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));
      fireEvent.click(screen.getByRole('button', { name: /create ticket/i }));
      await screen.findByText('Subject must be at least 3 characters');
      expect(screen.getByText('Sender name is required')).toBeInTheDocument();
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('submits form and closes modal on success', async () => {
      vi.mocked(createTicket).mockResolvedValue({ id: 'new-1' });
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No tickets yet');

      fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));

      await user.type(screen.getByPlaceholderText('Describe the issue briefly'), 'My subject');
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');

      fireEvent.click(screen.getByRole('button', { name: /create ticket/i }));

      await waitFor(() => {
        expect(createTicket).toHaveBeenCalledWith(expect.objectContaining({
          subject: 'My subject',
          senderName: 'Jane',
          senderEmail: 'jane@example.com',
        }));
      });
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'New Ticket' })).toBeNull();
      });
    });

    it('shows API error message on failed submit', async () => {
      vi.mocked(createTicket).mockRejectedValue({ response: { data: { error: 'Server error' } } });
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('No tickets yet');

      fireEvent.click(screen.getByRole('button', { name: /new ticket/i }));

      await user.type(screen.getByPlaceholderText('Describe the issue briefly'), 'My subject');
      await user.type(screen.getByPlaceholderText('John Doe'), 'Jane');
      await user.type(screen.getByPlaceholderText('john@example.com'), 'jane@example.com');

      fireEvent.click(screen.getByRole('button', { name: /create ticket/i }));

      await screen.findByText('Server error');
    });
  });
});