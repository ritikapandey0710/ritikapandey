// Mock the API functions
vi.mock('../api', () => ({
  fetchTicketById: vi.fn(),
  updateTicket: vi.fn(),
  fetchUsers: vi.fn(),
}));

// Mock authClient
vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn(),
    signIn: { email: vi.fn() },
    signUp: { email: vi.fn() },
    signOut: vi.fn(),
  },
}));

import { renderWithQuery } from '../test/render-utils';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TicketDetailsPage from './TicketDetailsPage';
import {authClient} from '../lib/auth-client';
import {fetchTicketById, updateTicket, fetchUsers} from '../api';
import {Routes, Route} from 'react-router-dom';

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
    authClient.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockResolvedValue(mockTicket);
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);

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
    const assigneeSection = screen.getByRole('heading', { level: 3, name: /assignee/i });
    expect(within(assigneeSection).getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('shows invalid assignee warning when assignee is not an agent', async () => {
    const ticketWithInvalidAssignee = {
      ...mockTicket,
      assigneeId: 'invalid-user-id', // Not in agents list
    };

    // Setup mocks
    authClient.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockResolvedValue(ticketWithInvalidAssignee);
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);

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
    authClient.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockResolvedValue(ticketUnassigned);
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);
    const updateTicketMock = vi.mocked(updateTicket);
    updateTicketMock.mockResolvedValue({});

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Select agent from dropdown
    const select = screen.getByTestId('assign-to-select');
    await userEvent.selectOptions(select, 'agent-2');

// Click save changes button
    const assigneeSection = screen.getByRole('heading', { level: 3, name: /assignee/i });
    const saveButton = within(assigneeSection).getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    // Wait for success message
    expect(await screen.findByText(/changes saved successfully/i)).toBeInTheDocument();

    // Verify updateTicket was called with correct payload
    expect(updateTicketMock).toHaveBeenCalledWith('1', { assigneeId: 'agent-2' });
  });

  it('allows admin to change ticket status', async () => {
    const ticket = {
      ...mockTicket,
      status: 'OPEN' as const,
    };

    // Setup mocks
    authClient.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockResolvedValue(ticket);
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);
    const updateTicketMock = vi.mocked(updateTicket);
    updateTicketMock.mockResolvedValue({});

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Select status from dropdown
    const statusSelect = screen.getByTestId('status-select');
    await userEvent.selectOptions(statusSelect, 'IN_PROGRESS');

    // Click save changes button
    const statusSection = screen.getByRole('heading', { level: 3, name: /status/i });
    const saveButton = within(statusSection).getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    // Wait for success message
    expect(await screen.findByText(/changes saved successfully/i)).toBeInTheDocument();

    // Verify updateTicket was called with correct payload
    expect(updateTicketMock).toHaveBeenCalledWith('1', { status: 'IN_PROGRESS' });
  });

  it('allows admin to change ticket category', async () => {
    const ticket = {
      ...mockTicket,
      category: 'GENERAL_QUESTION' as const,
    };

    // Setup mocks
    authClient.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockResolvedValue(ticket);
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);
    const updateTicketMock = vi.mocked(updateTicket);
    updateTicketMock.mockResolvedValue({});

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    // Select category from dropdown
    const categorySelect = screen.getByTestId('category-select');
    await userEvent.selectOptions(categorySelect, 'TECHNICAL_QUESTION');

    // Click save changes button
    const categorySection = screen.getByRole('heading', { level: 3, name: /category/i });
    const saveButton = within(categorySection).getByRole('button', { name: /save changes/i });
    await userEvent.click(saveButton);

    // Wait for success message
    expect(await screen.findByText(/changes saved successfully/i)).toBeInTheDocument();

    // Verify updateTicket was called with correct payload
    expect(updateTicketMock).toHaveBeenCalledWith('1', { category: 'TECHNICAL_QUESTION' });
  });

  it('shows error when assignment fails', async () => {
    const ticketUnassigned = {
      ...mockTicket,
      assigneeId: undefined,
    };

    // Setup mocks
    authClient.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockResolvedValue(ticketUnassigned);
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);
    const updateTicketMock = vi.mocked(updateTicket);
    updateTicketMock.mockRejectedValue(new Error('Assignment failed'));

    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TicketDetailsPage />} />
      </Routes>,
      {
        route: '/tickets/1',
      }
    );

    await userEvent.selectOptions(screen.getByTestId('assign-to-select'), 'agent-1');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/failed to update ticket/i)).toBeInTheDocument();
  });

  it('hides assignment controls for non-admin users', async () => {
    // Setup mocks
    authClient.useSession.mockReturnValue({
      data: { user: mockRegularUser },
      isPending: false,
    });
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockResolvedValue(mockTicket);
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);

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
    authClient.useSession.mockReturnValue({
      data: { user: mockAdminUser },
      isPending: false,
    });
    // Simulate loading ticket
    const fetchTicketByIdMock = vi.mocked(fetchTicketById);
    fetchTicketByIdMock.mockImplementation(() => new Promise(() => {})); // pending promise
    const fetchUsersMock = vi.mocked(fetchUsers);
    fetchUsersMock.mockResolvedValue(mockAgents);

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
});