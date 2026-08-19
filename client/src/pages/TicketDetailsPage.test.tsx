import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithQuery } from '../test/render-utils';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketDetailsPage from './TicketDetailsPage';
import { Routes, Route } from 'react-router-dom';

// Create mock functions using vi.hoisted so they are available in vi.mock factories
const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  fetchTicketById: vi.fn(),
  updateTicket: vi.fn(),
  fetchUsers: vi.fn(),
  fetchRepliesByTicketId: vi.fn(),
  createReply: vi.fn(),
  polishReply: vi.fn(),
  summarizeTicket: vi.fn(),
}));

// Mock the API functions
vi.mock('../api', () => {
  console.log('[MOCK] api factory called, mocks.fetchTicketById =', typeof mocks.fetchTicketById);
  return {
    fetchTicketById: mocks.fetchTicketById,
    updateTicket: mocks.updateTicket,
    fetchUsers: mocks.fetchUsers,
    fetchRepliesByTicketId: mocks.fetchRepliesByTicketId,
    createReply: mocks.createReply,
    polishReply: mocks.polishReply,
    summarizeTicket: mocks.summarizeTicket,
  };
});

// Mock authClient
vi.mock('../lib/auth-client', () => {
  console.log('[MOCK] auth-client factory called, mocks.useSession =', typeof mocks.useSession);
  return {
    authClient: {
      useSession: mocks.useSession,
      signIn: { email: vi.fn() },
      signUp: { email: vi.fn() },
      signOut: vi.fn(),
    },
  };
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
    description: 'Test description',
    createdAt: '2026-08-14T10:00:00Z',
    updatedAt: '2026-08-14T11:00:00Z',
  };

  const mockAgents = [
    { id: 'agent-1', name: 'Agent One', email: 'agent1@example.com', role: 'AGENT' },
    { id: 'agent-2', name: 'Agent Two', email: 'agent2@example.com', role: 'AGENT' },
  ];

  const mockAdminUser = { id: 'admin-1', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' };
  const mockRegularUser = { id: 'user-1', name: 'Regular User', email: 'user@example.com', role: 'AGENT' };

  const mockReplies = [
    {
      id: 'reply-1',
      body: 'This is a reply',
      ticketId: '1',
      authorId: 'agent-1',
      senderType: 'AGENT',
      createdAt: '2026-08-14T12:00:00Z',
      author: { id: 'agent-1', name: 'Agent One', email: 'agent1@example.com' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks for reply functions
    mocks.fetchRepliesByTicketId.mockResolvedValue([]);
    mocks.createReply.mockResolvedValue({ id: 'new-reply', body: 'Test reply' });
  });

  it('debug: check if mocks are applied', () => {
    console.log('[TEST] authClient module check');
    // This test verifies mock setup
    expect(mocks.useSession).toBeDefined();
    expect(mocks.fetchTicketById).toBeDefined();
    expect(typeof mocks.useSession.mockReturnValue).toBe('function');
    expect(typeof mocks.fetchTicketById.mockResolvedValue).toBe('function');
  });

  it('displays ticket details with assigned agent', async () => {
    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);

    // Render component with routing
    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Check loading state disappears
    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Check assignee display shows agent name
    expect(screen.getByTestId('assignee-name')).toHaveTextContent('Agent One');
    expect(screen.getByTestId('assignee-avatar')).toHaveTextContent('A'); // First letter

    // Check assignment controls are visible for admin
    expect(screen.getByLabelText(/assign to:/i)).toBeInTheDocument();
    // Check save button is present within the assignee controls section
    const assigneeControls = screen.getByTestId('assignee-controls');
    expect(within(assigneeControls).getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('shows invalid assignee warning when assignee is not an agent', async () => {
    const ticketWithInvalidAssignee = {
      ...mockTicket,
      assigneeId: 'invalid-user-id', // Not in agents list
    };

    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(ticketWithInvalidAssignee);
    mocks.fetchUsers.mockResolvedValue(mockAgents);

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Should show assignee ID with "(not an agent)" indicator
    expect(screen.getByTestId('assignee-name')).toHaveTextContent('invalid-user-id (not an agent)');
  });

  it('allows admin to assign ticket to agent', async () => {
    const ticketUnassigned = {
      ...mockTicket,
      assigneeId: undefined,
    };

    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(ticketUnassigned);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.updateTicket.mockResolvedValue({});

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Wait for ticket to load
    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Select agent from dropdown
    const select = screen.getByTestId('assign-to-select');
    await userEvent.selectOptions(select, 'agent-2');

    // Click save changes button
    const assigneeControls = screen.getByTestId('assignee-controls');
    const saveButton = within(assigneeControls).getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    // Wait for success message
    expect(await screen.findByText(/changes saved successfully/i)).toBeInTheDocument();

    // Verify updateTicket was called with correct payload
    expect(mocks.updateTicket).toHaveBeenCalledWith('1', { assigneeId: 'agent-2' });
  });

  it('allows admin to change ticket status', async () => {
    const ticket = {
      ...mockTicket,
      status: 'OPEN' as const,
    };

    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(ticket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.updateTicket.mockResolvedValue({});

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Wait for ticket to load
    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Select status from dropdown
    const statusSelect = screen.getByTestId('status-select');
    await userEvent.selectOptions(statusSelect, 'IN_PROGRESS');

    // Click save changes button
    const statusControls = screen.getByTestId('status-controls');
    const saveButton = within(statusControls).getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    // Wait for success message
    expect(await screen.findByText(/changes saved successfully/i)).toBeInTheDocument();

    // Verify updateTicket was called with correct payload
    expect(mocks.updateTicket).toHaveBeenCalledWith('1', { status: 'IN_PROGRESS' });
  });

  it('allows admin to change ticket category', async () => {
    const ticket = {
      ...mockTicket,
      category: 'GENERAL_QUESTION' as const,
    };

    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(ticket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.updateTicket.mockResolvedValue({});

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Wait for ticket to load
    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Select category from dropdown
    const categorySelect = screen.getByTestId('category-select');
    await userEvent.selectOptions(categorySelect, 'TECHNICAL_QUESTION');

    // Click save changes button
    const categoryControls = screen.getByTestId('category-controls');
    const saveButton = within(categoryControls).getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    // Wait for success message
    expect(await screen.findByText(/changes saved successfully/i)).toBeInTheDocument();

    // Verify updateTicket was called with correct payload
    expect(mocks.updateTicket).toHaveBeenCalledWith('1', { category: 'TECHNICAL_QUESTION' });
  });

  it('shows error when assignment fails', async () => {
    const ticketUnassigned = {
      ...mockTicket,
      assigneeId: undefined,
    };

    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(ticketUnassigned);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.updateTicket.mockRejectedValue(new Error('Assignment failed'));

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Wait for ticket to load
    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByTestId('assign-to-select'), 'agent-1');
    const assigneeControls = screen.getByTestId('assignee-controls');
    await userEvent.click(within(assigneeControls).getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/failed to update ticket/i)).toBeInTheDocument();
  });

  it('hides assignment controls for non-admin users', async () => {
    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockRegularUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();

    // Assignment controls should not be present
    expect(screen.queryByLabelText(/assign to:/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign ticket/i })).not.toBeInTheDocument();
    // Status and category controls should also be hidden for non-admin
    expect(screen.queryByLabelText(/status:/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/category:/i)).not.toBeInTheDocument();

    // But assignee info should still be visible
    expect(screen.getByTestId('assignee-name')).toHaveTextContent('Agent One');
  });

  it('shows loading states appropriately', async () => {
    // Setup mocks
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    // Simulate loading ticket
    mocks.fetchTicketById.mockImplementation(() => new Promise(() => {})); // pending promise
    mocks.fetchUsers.mockResolvedValue(mockAgents);

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Should show loading indicator
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();

    // Resolve the ticket fetch
    vi.waitFor(() => {}, { timeout: 100 }); // Just to flush mocks
  });

  // ===== REPLY COMPOSER TESTS =====

  it('shows reply composer when ticket has zero replies', async () => {
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.fetchRepliesByTicketId.mockResolvedValue([]);

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { route: '/tickets/1' }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();
    expect(await screen.findByText(/No replies yet/i)).toBeInTheDocument();

    // Reply composer must be visible
    expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
  });

  it('shows reply composer when ticket has existing replies', async () => {
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.fetchRepliesByTicketId.mockResolvedValue(mockReplies);

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { route: '/tickets/1' }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();
    expect(await screen.findByText(/This is a reply/i)).toBeInTheDocument();

    // Reply composer must be visible
    expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
  });

  it('shows reply composer while replies are loading', async () => {
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    // Simulate loading replies (pending promise)
    mocks.fetchRepliesByTicketId.mockImplementation(() => new Promise(() => {}));

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { route: '/tickets/1' }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading replies/i)).toBeInTheDocument();

    // Reply composer must be visible even while loading
    expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
  });

  it('shows reply composer even when replies API fails', async () => {
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.fetchRepliesByTicketId.mockRejectedValue(new Error('Failed to fetch replies'));

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { route: '/tickets/1' }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();
    expect(await screen.findByText(/Failed to load replies/i)).toBeInTheDocument();

    // Reply composer must be visible even when replies API fails
    expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
  });

  it('allows sending a reply and keeps composer visible', async () => {
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.fetchRepliesByTicketId.mockResolvedValue([]);
    mocks.createReply.mockResolvedValue({ id: 'new-reply', body: 'My new reply' });

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { route: '/tickets/1' }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();
    expect(await screen.findByText(/No replies yet/i)).toBeInTheDocument();

    // Type a reply
    const textarea = screen.getByLabelText(/write a reply/i);
    await userEvent.type(textarea, 'My new reply');

    // Click send reply
    const sendButton = screen.getByRole('button', { name: /send reply/i });
    await userEvent.click(sendButton);

    // Verify createReply was called
    expect(mocks.createReply).toHaveBeenCalledWith('1', { body: 'My new reply' });

    // Reply composer must still be visible
    expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
  });

  it('keeps reply composer and typed text when reply fails', async () => {
    mocks.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.fetchRepliesByTicketId.mockResolvedValue([]);
    mocks.createReply.mockRejectedValue(new Error('Failed to create reply'));

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { route: '/tickets/1' }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();
    expect(await screen.findByText(/No replies yet/i)).toBeInTheDocument();

    // Type a reply
    const textarea = screen.getByLabelText(/write a reply/i);
    await userEvent.type(textarea, 'This should be kept');

    // Click send reply
    const sendButton = screen.getByRole('button', { name: /send reply/i });
    await userEvent.click(sendButton);

    // Error message should appear
    expect(await screen.findByText(/Failed to create reply/i)).toBeInTheDocument();

    // Reply composer must still be visible
    expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();

    // Typed text should be preserved
    expect(screen.getByLabelText(/write a reply/i)).toHaveValue('This should be kept');
  });

  it('shows reply composer for non-admin users too', async () => {
    mocks.useSession.mockReturnValue({
      data: { user: mockRegularUser },
      isPending: false,
    });
    mocks.fetchTicketById.mockResolvedValue(mockTicket);
    mocks.fetchUsers.mockResolvedValue(mockAgents);
    mocks.fetchRepliesByTicketId.mockResolvedValue([]);

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      { route: '/tickets/1' }
    );

    expect(await screen.findByText(/Test Ticket/i)).toBeInTheDocument();
    expect(await screen.findByText(/No replies yet/i)).toBeInTheDocument();

    // Reply composer must be visible for non-admin users too
    expect(screen.getByTestId('reply-composer')).toBeInTheDocument();
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
  });
});
