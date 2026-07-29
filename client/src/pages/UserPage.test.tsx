import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserPage from './UserPage';
import { authClient } from '../lib/auth-client';
import { fetchUsers } from '../api';
import { renderWithQuery } from '../test/render-utils';

// Mock modules
vi.mock('../lib/auth-client', async () => {
  const actual = await import('../lib/auth-client');
  return {
    ...actual,
    authClient: {
      ...actual.authClient,
      useSession: vi.fn(),
    },
  };
});
vi.mock('../api', async () => {
  const actual = await import('../api');
  return {
    ...actual,
    fetchUsers: vi.fn(),
  };
});

const mockUsers = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'ADMIN',
    createdAt: '2023-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'AGENT',
    createdAt: '2023-01-02T00:00:00Z',
  },
];

describe('UserPage', () => {
  it('should import UserPage', () => {
    expect(UserPage).toBeDefined();
  });

  it('should log UserPage', () => {
    console.log('UserPage:', UserPage);
    expect(UserPage).toBeDefined();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when fetching users', async () => {
    // Mock auth session
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });

    // Mock loading state for query
    (fetchUsers as any).mockImplementation(() => {
      return new Promise(() => {});
    });

    renderWithQuery(<UserPage />);

    // Check for loading state - verify that user data is not yet shown
    expect(
      screen.queryAllByText(/john doe/i).length === 0 &&
      screen.queryAllByText(/jane smith/i).length === 0
    ).toBe(true);

    // Should see the page title
    expect(
      screen.getByText(/user management/i)
    ).toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    // Mock auth session
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });

    // Mock error state
    (fetchUsers as any).mockRejectedValue(
      new Error('Failed to load users')
    );

    renderWithQuery(<UserPage />);

    // Wait for error message
    expect(
      await screen.findByText(/failed to load users/i)
    ).toBeInTheDocument();
  });

  it('renders user list when data is fetched successfully', async () => {
    // Mock auth session
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });

    // Mock successful API response
    (fetchUsers as any).mockResolvedValue(mockUsers);

    renderWithQuery(<UserPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Created At')).toBeInTheDocument();

    // Check user data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    // Check role badges - get the cell and check its inner HTML for the span with correct class
    const adminRow = screen.getByText('John Doe').closest('tr');
    const adminBadge = adminRow.querySelector('td:nth-child(4) span');
    expect(adminBadge).toBeTruthy();
    expect(adminBadge?.className).toContain('bg-blue-100');

    const agentRow = screen.getByText('Jane Smith').closest('tr');
    const agentBadge = agentRow.querySelector('td:nth-child(4) span');
    expect(agentBadge).toBeTruthy();
    expect(agentBadge?.className).toContain('bg-green-100');
  });

  it('shows "No users found" when user list is empty', async () => {
    // Mock auth session
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });

    // Mock empty response
    (fetchUsers as any).mockResolvedValue([]);

    renderWithQuery(<UserPage />);

    // Wait for empty state message
    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    // Mock auth session as not authenticated
    (authClient.useSession as any).mockReturnValue({
      data: null,
      isPending: false,
    });

    renderWithQuery(<UserPage />);

    // UserPage should return null when not authenticated
    // which means nothing should be rendered
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('shows loading state while checking authentication', async () => {
    // Mock auth session as pending
    (authClient.useSession as any).mockReturnValue({
      data: undefined,
      isPending: true,
    });

    renderWithQuery(<UserPage />);

    // Check for loading state - verify that the main content is not yet shown
    expect(
      screen.queryByText(/user management/i)
    ).not.toBeInTheDocument();
  });
});