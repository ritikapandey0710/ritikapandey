import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithQuery } from '../test/render-utils';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock ReplyThread component (since it may not exist as a separate component yet,
// we'll test the reply display logic that would be in such a component)
// In a real implementation, this would import the actual ReplyThread component
const ReplyThread = ({ replies, isLoading, error }: {
  replies: Array<any>;
  isLoading: boolean;
  error: string | null
}) => {
  if (isLoading) {
    return <div data-testid="reply-loading">Loading replies...</div>;
  }

  if (error) {
    return <div data-testid="reply-error">Failed to load replies: {error}</div>;
  }

  if (!replies || replies.length === 0) {
    return <div data-testid="reply-empty">No replies yet</div>;
  }

  return (
    <div data-testid="reply-list">
      {replies.map((reply) => (
        <div key={reply.id} data-testid="reply-item">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold"
              data-testid="reply-avatar"
            >
              {reply.author?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">{reply.author?.name}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    reply.senderType === 'AGENT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {reply.senderType === 'AGENT' ? 'Agent' : 'Customer'}
                </span>
              </div>
              <p className="text-sm text-slate-500">{new Date(reply.createdAt).toLocaleString()}</p>
              <p className="mt-1 text-slate-700 whitespace-pre-line">{reply.body}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

describe('ReplyThread', () => {
  const mockReplies = [
    {
      id: 'reply-1',
      body: 'This is a reply from an agent',
      ticketId: '1',
      authorId: 'agent-1',
      senderType: 'AGENT',
      createdAt: '2026-08-14T12:00:00Z',
      author: { id: 'agent-1', name: 'Agent One', email: 'agent1@example.com' },
    },
    {
      id: 'reply-2',
      body: 'This is a reply from a customer',
      ticketId: '1',
      authorId: 'user-1',
      senderType: 'CUSTOMER',
      createdAt: '2026-08-14T13:00:00Z',
      author: { id: 'user-1', name: 'Regular User', email: 'user@example.com' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when isLoading is true', () => {
    renderWithQuery(<ReplyThread replies={[]} isLoading={true} error={null} />);

    expect(screen.getByTestId('reply-loading')).toHaveTextContent(/loading replies/i);
  });

  it('shows error state when error is provided', () => {
    renderWithQuery(<ReplyThread replies={[]} isLoading={false} error="Failed to load" />);

    expect(screen.getByTestId('reply-error')).toHaveTextContent(/failed to load replies/i);
  });

  it('shows empty state when replies array is empty', () => {
    renderWithQuery(<ReplyThread replies={[]} isLoading={false} error={null} />);

    expect(screen.getByTestId('reply-empty')).toHaveTextContent(/no replies yet/i);
  });

  it('shows empty state when replies is null', () => {
    renderWithQuery(<ReplyThread replies={null as unknown as Array<any>} isLoading={false} error={null} />);

    expect(screen.getByTestId('reply-empty')).toHaveTextContent(/no replies yet/i);
  });

  it('renders list of replies with correct data', () => {
    renderWithQuery(<ReplyThread replies={mockReplies} isLoading={false} error={null} />);

    // Should show reply list container
    expect(screen.getByTestId('reply-list')).toBeInTheDocument();

    // Should show two reply items
    const replyItems = screen.getAllByTestId('reply-item');
    expect(replyItems).toHaveLength(2);

    // Check first reply (agent)
    const firstReply = replyItems[0];
    expect(within(firstReply).getByTestId('reply-avatar')).toHaveTextContent('A');
    expect(within(firstReply).getByText(/agent one/i)).toBeInTheDocument();
    // Find the agent badge specifically (the span with Agent text that has the badge classes)
    const agentElements = within(firstReply).getAllByText(/agent/i);
    const agentBadge = agentElements.find((el) =>
      el.classList.contains('bg-blue-100') &&
      el.classList.contains('text-blue-700') &&
      el.classList.contains('inline-flex') &&
      el.classList.contains('items-center') &&
      el.classList.contains('px-2') &&
      el.classList.contains('py-0.5') &&
      el.classList.contains('rounded-full') &&
      el.classList.contains('text-xs') &&
      el.classList.contains('font-semibold'));
    expect(agentBadge).toBeInTheDocument();
    expect(firstReply).toHaveTextContent(/this is a reply from an agent/i);

    // Check second reply (customer)
    const secondReply = replyItems[1];
    expect(within(secondReply).getByTestId('reply-avatar')).toHaveTextContent('R');
    expect(within(secondReply).getByText(/regular user/i)).toBeInTheDocument();
    // Find the customer badge specifically (the span with Customer text that has the badge classes)
    const customerElements = within(secondReply).getAllByText(/customer/i);
    const customerBadge = customerElements.find((el) =>
      el.classList.contains('bg-purple-100') &&
      el.classList.contains('text-purple-700') &&
      el.classList.contains('inline-flex') &&
      el.classList.contains('items-center') &&
      el.classList.contains('px-2') &&
      el.classList.contains('py-0.5') &&
      el.classList.contains('rounded-full') &&
      el.classList.contains('text-xs') &&
      el.classList.contains('font-semibold'));
    expect(customerBadge).toBeInTheDocument();
    expect(secondReply).toHaveTextContent(/this is a reply from a customer/i);
  });

  it('handles reply with missing author name', () => {
    const replyWithMissingAuthor = {
      ...mockReplies[0],
      author: { ...mockReplies[0].author, name: '' },
    };

    renderWithQuery(<ReplyThread replies={[replyWithMissingAuthor]} isLoading={false} error={null} />);

    const replyItem = screen.getByTestId('reply-item');
    expect(within(replyItem).getByTestId('reply-avatar')).toHaveTextContent('?');
    // Should still show the reply body
    expect(replyItem).toHaveTextContent(/this is a reply from an agent/i);
  });

  it('handles reply with missing author object', () => {
    const replyWithMissingAuthor = {
      ...mockReplies[0],
      author: null as unknown as { name: string },
    };

    renderWithQuery(<ReplyThread replies={[replyWithMissingAuthor]} isLoading={false} error={null} />);

    const replyItem = screen.getByTestId('reply-item');
    expect(within(replyItem).getByTestId('reply-avatar')).toHaveTextContent('?');
    // Should still show the reply body
    expect(replyItem).toHaveTextContent(/this is a reply from an agent/i);
  });
});