import { renderWithQuery } from '@/test/render-utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketDetailsPage from './TicketDetailsPage';

// Mock the API functions
vi.mock('@/api', () => ({
  fetchTicketById: vi.fn(),
  updateTicket: vi.fn(),
  fetchUsers: vi.fn(),
}));

// Mock authClient
vi.mock('@/lib/auth-client', () => {
  const authClient = {
    useSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  };
  return { authClient };
});

describe('TicketDetailsPage', () => {
  const mockTicket = {
    id: '1',
    ticketNumber: 1001,
    title: 'Test Ticket',
    status: 'OPEN' as const,
    priority: 'MEDIUM' as const,
    category: 'GENERAL_QUESTION' as const,
    senderName: 'John Doe',
    senderEmail: 'john@example.com',
    assigneeId: 'agent-1',
    body: 'Test description',
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T11:00:00Z',
  };

  const mockAgents = [
    { id: 'agent-1', name: 'Agent One', email: 'agent1@example.com', role: 'AGENT' },
    { id: 'agent-2', name: 'Agent Two', email: 'agent2@example.com', role: 'AGENT' },
  ];

  const mockAdminUser = { id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' };
  const mockRegularUser = { id: 'user-1', name: 'Regular User', email: 'user@example.com', role: 'AGENT' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays ticket details with assigned agent', async () => {
    // Setup mocks
    (require('@/lib/auth-client').authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    (require('@/api').fetchTicketById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
    (require('@/api').fetchUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgents);

    // Render component
    renderWithQuery(<TicketDetailsPage />, {
      route: '/tickets/1',
    });

    // Check loading state disappears
    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Check assignee display shows agent name
    expect(screen.getByText(/Agent One/i)).toBeInTheDocument();
    expect(screen.getByTestId(/assignee-avatar/i)).toHaveTextContent('A'); // First letter

    // Check assignment controls are visible for admin
    expect(screen.getByLabelText(/assign to:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign ticket/i })).toBeInTheDocument();
  });

  it('shows invalid assignee warning when assignee is not an agent', async () => {
    const ticketWithInvalidAssignee = {
      ...mockTicket,
      assigneeId: 'invalid-user-id', // Not in agents list
    };

    (require('@/lib/auth-client').authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    (require('@/api').fetchTicketById as ReturnType<typeof vi.fn>).mockResolvedValue(ticketWithInvalidAssignee);
    (require('@/api').fetchUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgents);

    renderWithQuery(<TicketDetailsPage />, {
      route: '/tickets/1',
    });

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Should show assignee ID with "(not an agent)" indicator
    expect(screen.getByText(/invalid-user-id \(not an agent\)/i)).toBeInTheDocument();
  });

  it('allows admin to assign ticket to agent', async () => {
    const ticketUnassigned = {
      ...mockTicket,
      assigneeId: undefined,
    };

    (require('@/lib/auth-client').authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    (require('@/api').fetchTicketById as ReturnType<typeof vi.fn>).mockResolvedValue(ticketUnassigned);
    (require('@/api').fetchUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgents);
    (require('@/api').updateTicket as ReturnType<typeof vi.fn>).mockResolvedValue({});

    renderWithQuery(<TicketDetailsPage />, {
      route: '/tickets/1',
    });

    // Select agent from dropdown
    const select = screen.getByLabelText(/assign to:/i);
    await userEvent.selectOptions(select, 'agent-2');

    // Click assign button
    const assignButton = screen.getByRole('button', { name: /assign ticket/i });
    await userEvent.click(assignButton);

    // Wait for success message
    expect(await screen.findByText(/ticket assigned successfully/i)).toBeInTheDocument();

    // Verify updateTicket was called with correct payload
    expect(require('@/api').updateTicket).toHaveBeenCalledWith('1', { assigneeId: 'agent-2' });
  });

  it('shows error when assignment fails', async () => {
    const ticketUnassigned = {
      ...mockTicket,
      assigneeId: undefined,
    };

    (require('@/lib/auth-client').authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    (require('@/api').fetchTicketById as ReturnType<typeof vi.fn>).mockResolvedValue(ticketUnassigned);
    (require('@/api').fetchUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgents);
    (require('@/api').updateTicket as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Assignment failed')
    );

    renderWithQuery(<TicketDetailsPage />, {
      route: '/tickets/1',
    });

    await userEvent.selectOptions(screen.getByLabelText(/assign to:/i), 'agent-1');
    await userEvent.click(screen.getByRole('button', { name: /assign ticket/i }));

    expect(await screen.findByText(/failed to assign ticket/i)).toBeInTheDocument();
  });

  it('hides assignment controls for non-admin users', async () => {
    (require('@/lib/auth-client').authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: mockRegularUser },
      isPending: false,
    });
    (require('@/api').fetchTicketById as ReturnType<typeof vi.fn>).mockResolvedValue(mockTicket);
    (require('@/api').fetchUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgents);

    renderWithQuery(<TicketDetailsPage />, {
      route: '/tickets/1',
    });

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Assignment controls should not be present
    expect(screen.queryByLabelText(/assign to:/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign ticket/i })).not.toBeInTheDocument();

    // But assignee info should still be visible
    expect(screen.getByText(/Agent One/i)).toBeInTheDocument();
  });

  it('shows loading states appropriately', async () => {
    (require('@/lib/auth-client').authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    // Simulate loading ticket
    (require('@/api').fetchTicketById as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {})); // pending promise
    (require('@/api').fetchUsers as ReturnType<typeof vi.fn>).mockResolvedValue(mockAgents);

    renderWithQuery(<TicketDetailsPage />, {
      route: '/tickets/1',
    });

    // Should show loading indicator
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Resolve the ticket fetch
    vi.waitFor(() => {}, { timeout: 100 }); // Just to flush mocks
  });
});