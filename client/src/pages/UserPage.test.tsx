import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserPage from './UserPage';
import { authClient } from '../lib/auth-client';
import { fetchUsers, createUser, updateUser } from '../api';
import { renderWithQuery } from '../test/render-utils';
import { createTestQueryClient } from '../test/render-utils';

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
vi.mock('../api', () => {
  return {
    fetchUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock implementations
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (createUser as any).mockResolvedValue({});
    (updateUser as any).mockResolvedValue({});
  });

  it('should import UserPage', () => {
    expect(UserPage).toBeDefined();
  });

  it('should log UserPage', () => {
    console.log('UserPage:', UserPage);
    expect(UserPage).toBeDefined();
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
    expect(screen.getByText(/user management/i)).toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    // Mock auth session
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });

    // Mock error state by returning a rejected promise
    (fetchUsers as any).mockImplementation(() => {
      console.log('fetchUsers called, returning rejected promise');
      return Promise.reject(new Error('failed to load users'));
    });

    const queryClient = createTestQueryClient();
    const { container } = renderWithQuery(<UserPage />, { queryClient });

    expect(fetchUsers).toHaveBeenCalledTimes(1);

    // Wait for the query to be in a non-pending state
    await waitFor(() => {
      const state = queryClient.getQueryState(['users']);
      console.log('Query state while waiting:', state);
      return state?.status !== 'pending';
    }, { timeout: 5000 }); // Increase timeout for debugging

    // Now check the state
    const state = queryClient.getQueryState(['users']);
    console.log('Final query state:', state);
    expect(state?.status).toBe('error');

    // Log the container's innerHTML to see what is rendered
    console.log('Container innerHTML:', container.innerHTML);

    // Then check for the error message in the DOM
    expect(await screen.findByText(/failed to load users/i)).toBeInTheDocument();
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
      expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/jane@example.com/i)).toBeInTheDocument();
    });

    // Check table headers - using getByRole for table header cells
    expect(screen.getByRole('columnheader', { name: /user/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /joined/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();

    // Check user data
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument();
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
    expect(screen.queryByText(/user management/i)).not.toBeInTheDocument();
  });

  // New tests for modal behavior
  it('opens create user modal when button is clicked', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);

    renderWithQuery(<UserPage />);

    // wait for users to load
    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    const createBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(createBtn);

    expect(screen.getByText(/create new user/i)).toBeInTheDocument();
  });

  it('closes create user modal when clicking outside', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    const createBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(createBtn);
    expect(screen.getByText(/create new user/i)).toBeInTheDocument();

    // Click on the backdrop to close the modal
    const backdrop = screen.getByTestId('backdrop');
    expect(backdrop).toBeInTheDocument();
    await userEvent.click(backdrop);

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText(/create new user/i)).not.toBeInTheDocument();
    });
  });

  it('closes create user modal when pressing escape key', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    const createBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(createBtn);
    expect(screen.getByText(/create new user/i)).toBeInTheDocument();

    await userEvent.keyboard({ key: 'Escape' });

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText(/create new user/i)).not.toBeInTheDocument();
    });
  });

  // New tests for create user form
  it('shows validation errors when form is submitted with invalid data', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (createUser as any).mockResolvedValue({});

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    const createBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(createBtn);
    expect(screen.getByText(/create new user/i)).toBeInTheDocument();

    // Fill in invalid data
    const nameInput = screen.getByPlaceholderText(/enter full name/i);
    const emailInput = screen.getByPlaceholderText(/enter email address/i);
    const passwordInput = screen.getByPlaceholderText(/min. 8 characters/i);

    await userEvent.type(nameInput, 'Jo'); // too short
    await userEvent.type(emailInput, 'invalid'); // invalid email
    await userEvent.type(passwordInput, '1234567'); // too short

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(submitBtn);

    // Check for validation errors
    expect(await screen.findByText(/name must be at least 3 characters/i)).toBeInTheDocument();
    await screen.findByText(/invalid email address/i);
    await screen.findByText(/password must be at least 8 characters/i);
  });

  it('submits the form with valid data and calls onSuccess and closes modal', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (createUser as any).mockResolvedValue({});

    // Create a mock query client
    const queryClient = {
      invalidateQueries: vi.fn(),
    };

    renderWithQuery(<UserPage />, { queryClient });

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    const createBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(createBtn);
    expect(screen.getByText(/create new user/i)).toBeInTheDocument();

    // Fill in valid data
    const nameInput = screen.getByPlaceholderText(/enter full name/i);
    const emailInput = screen.getByPlaceholderText(/enter email address/i);
    const passwordInput = screen.getByPlaceholderText(/min. 8 characters/i);

    await userEvent.type(nameInput, 'John Doe');
    await userEvent.type(emailInput, 'john@example.com');
    await userEvent.type(passwordInput, 'password123');

    // Submit the form
    const submitBtn = screen.getByRole('button', { name: /create user/i });
    await userEvent.click(submitBtn);

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText(/create new user/i)).not.toBeInTheDocument();
    });

    // Check that invalidateQueries was called with the correct key
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] });
    // Check that createUser was called
    expect(createUser).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });
  });

  // New tests for edit user functionality
  it('opens edit user modal when edit button is clicked', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (updateUser as any).mockResolvedValue({});

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    // Find John's row and then the edit button within that row
    const johnsRow = screen.getByText(/john@example.com/i).closest('tr');
    const editBtn = johnsRow.querySelector('button');
    expect(editBtn).toBeInTheDocument();
    await userEvent.click(editBtn as HTMLElement);

    expect(screen.getByText(/edit user/i)).toBeInTheDocument();
  });

  it('closes edit user modal when clicking outside', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (updateUser as any).mockResolvedValue({});

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    // Find John's row and then the edit button within that row
    const johnsRow = screen.getByText(/john@example.com/i).closest('tr');
    const editBtn = johnsRow.querySelector('button');
    expect(editBtn).toBeInTheDocument();
    await userEvent.click(editBtn as HTMLElement);
    expect(screen.getByText(/edit user/i)).toBeInTheDocument();

    // Click on the backdrop to close the modal
    const backdrop = screen.getByTestId('backdrop-edit');
    expect(backdrop).toBeInTheDocument();
    await userEvent.click(backdrop);

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText(/edit user/i)).not.toBeInTheDocument();
    });
  });

  it('closes edit user modal when pressing escape key', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (updateUser as any).mockResolvedValue({});

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    // Find John's row and then the edit button within that row
    const johnsRow = screen.getByText(/john@example.com/i).closest('tr');
    const editBtn = johnsRow.querySelector('button');
    expect(editBtn).toBeInTheDocument();
    await userEvent.click(editBtn as HTMLElement);
    expect(screen.getByText(/edit user/i)).toBeInTheDocument();

    await userEvent.keyboard({ key: 'Escape' });

    // Wait for modal to close
    await waitFor(() => {
      expect(screen.queryByText(/edit user/i)).not.toBeInTheDocument();
    });
  });

  it('updates user with new name and email but keeps password when left blank', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (updateUser as any).mockResolvedValue({});

    // Create a mock query client
    const queryClient = {
      invalidateQueries: vi.fn(),
    };

    renderWithQuery(<UserPage />, { queryClient });

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    // Find John's row and then the edit button within that row
    const johnsRow = screen.getByText(/john@example.com/i).closest('tr');
    const editBtn = johnsRow.querySelector('button');
    expect(editBtn).toBeInTheDocument();
    await userEvent.click(editBtn as HTMLElement);

    await waitFor(() => expect(screen.getByText(/edit user/i)).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText(/enter full name/i);
    const emailInput = screen.getByPlaceholderText(/enter email address/i);
    const passwordInput = screen.getByPlaceholderText(/min. 8 characters/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jonathan Doe');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'jonathan@example.com');
    // Leave password empty

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/edit user/i)).not.toBeInTheDocument();
    });

    expect(updateUser).toHaveBeenCalledWith('1', {
      name: 'Jonathan Doe',
      email: 'jonathan@example.com',
      // password should not be in payload when left empty
    });

    // Check that invalidateQueries was called
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('updates user password when provided', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (updateUser as any).mockResolvedValue({});

    // Create a mock query client
    const queryClient = {
      invalidateQueries: vi.fn(),
    };

    renderWithQuery(<UserPage />, { queryClient });

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    // Find John's row and then the edit button within that row
    const johnsRow = screen.getByText(/john@example.com/i).closest('tr');
    const editBtn = johnsRow.querySelector('button');
    expect(editBtn).toBeInTheDocument();
    await userEvent.click(editBtn as HTMLElement);

    await waitFor(() => expect(screen.getByText(/edit user/i)).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText(/enter full name/i);
    const emailInput = screen.getByPlaceholderText(/enter email address/i);
    const passwordInput = screen.getByPlaceholderText(/min. 8 characters/i);

    await userEvent.type(nameInput, 'John Doe');
    await userEvent.type(emailInput, 'john@example.com');
    await userEvent.type(passwordInput, 'newpassword123');

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText(/edit user/i)).not.toBeInTheDocument();
    });

    expect(updateUser).toHaveBeenCalledWith('1', {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'newpassword123',
    });

    // Check that invalidateQueries was called
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['users'] });
  });

  it('shows validation errors when editing user with invalid data', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (updateUser as any).mockResolvedValue({});

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    // Find John's row and then the edit button within that row
    const johnsRow = screen.getByText(/john@example.com/i).closest('tr');
    const editBtn = johnsRow.querySelector('button');
    expect(editBtn).toBeInTheDocument();
    await userEvent.click(editBtn as HTMLElement);

    await waitFor(() => expect(screen.getByText(/edit user/i)).toBeInTheDocument());

    // Fill in invalid data
    const nameInput = screen.getByPlaceholderText(/enter full name/i);
    const emailInput = screen.getByPlaceholderText(/enter email address/i);
    const passwordInput = screen.getByPlaceholderText(/min. 8 characters/i);

    await userEvent.type(nameInput, 'Jo'); // too short
    await userEvent.type(emailInput, 'invalid'); // invalid email
    await userEvent.type(passwordInput, '1234567'); // too short

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(submitBtn);

    // Check for validation errors
    expect(await screen.findByText(/name must be at least 3 characters/i)).toBeInTheDocument();
    await screen.findByText(/invalid email address/i);
    await screen.findByText(/password must be at least 8 characters/i);
  });

  it('shows error message when updating user fails', async () => {
    (authClient.useSession as any).mockReturnValue({
      data: { user: { role: 'ADMIN', email: 'admin@example.com' } },
      isPending: false,
    });
    (fetchUsers as any).mockResolvedValue(mockUsers);
    (updateUser as any).mockRejectedValue({
      response: {
        data: {
          error: 'Failed to update user'
        }
      }
    });

    renderWithQuery(<UserPage />);

    await waitFor(() => expect(screen.getByText(/john@example.com/i)).toBeInTheDocument());

    // Find John's row and then the edit button within that row
    const johnsRow = screen.getByText(/john@example.com/i).closest('tr');
    const editBtn = johnsRow.querySelector('button');
    expect(editBtn).toBeInTheDocument();
    await userEvent.click(editBtn as HTMLElement);

    await waitFor(() => expect(screen.getByText(/edit user/i)).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText(/enter full name/i);
    const emailInput = screen.getByPlaceholderText(/enter email address/i);
    const passwordInput = screen.getByPlaceholderText(/min. 8 characters/i);

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Jonathan Doe');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'jonathan@example.com');
    // Leave password empty

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    await userEvent.click(submitBtn);

    // Wait for error message to appear
    expect(await screen.findByText(/failed to update user/i)).toBeInTheDocument();
  });
});