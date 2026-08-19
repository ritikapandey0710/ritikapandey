import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithQuery } from '../../test/render-utils';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TicketDetail } from './TicketDetail';
import { TicketStatus, TicketCategory, TicketPriority } from '@/types/ticket';

// Mock agent data
const mockAgents = [
  { id: 'agent-1', name: 'Agent One', email: 'agent1@example.com' },
  { id: 'agent-2', name: 'Agent Two', email: 'agent2@example.com' },
];

// Mock ticket data
const mockTicket = {
  id: '1',
  ticketNumber: 1001,
  title: 'Test Ticket',
  status: TicketStatus.OPEN,
  priority: TicketPriority.MEDIUM,
  category: TicketCategory.GENERAL_QUESTION,
  senderName: 'John Doe',
  senderEmail: 'john@example.com',
  assigneeId: 'agent-1',
  body: 'This is a test ticket description.',
  createdAt: '2026-08-14T10:00:00Z',
  updatedAt: '2026-08-14T11:00:00Z',
};

describe('TicketDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ticket title', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      mockTicket.title
    );
  });

  it('renders ticket number correctly', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    // Should show TKT-01001 (ticketNumber padded to 5 digits)
    expect(screen.getByText(/tkt-01001/i)).toBeInTheDocument();
  });

  it('renders ticket number from ID when ticketNumber is null', () => {
    const ticketWithoutNumber = {
      ...mockTicket,
      ticketNumber: null,
    };

    renderWithQuery(<TicketDetail ticket={ticketWithoutNumber} agents={mockAgents} />);

    // Should show TKT-00001 (first 8 chars of ID padded)
    expect(screen.getByText(/tkt-00001/i)).toBeInTheDocument();
  });

  it('renders status with correct label and color', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    // Find the h3 with text "Status"
    const statusHeading = screen.getByRole('heading', { level: 3, name: /status/i });
    // Get the parent div of the h3 (which is the mb-6 container)
    const statusContainer = statusHeading.parentElement;
    // Within that container, find the status badge
    const statusElement = within(statusContainer).getByText(/open/i);
    expect(statusElement).toBeInTheDocument();
    // Check that it has the status badge styling
    expect(statusElement).toHaveClass('bg-blue-100');
    expect(statusElement).toHaveClass('text-blue-700');
  });

  it('renders priority with correct label and color', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    // Find the strong element with text "Priority:"
    const priorityLabel = screen.getByText(/priority:/i);
    // Get the next element sibling (should be the priority badge span)
    const priorityElement = priorityLabel.nextElementSibling;
    expect(priorityElement).toBeInTheDocument();
    // Check that it has the priority badge styling
    expect(priorityElement).toHaveClass('bg-yellow-100');
    expect(priorityElement).toHaveClass('text-yellow-700');
  });

  it('renders category with correct label', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    // Find the h3 with text "Category"
    const categoryHeading = screen.getByRole('heading', { level: 3, name: /category/i });
    // Get the parent div of the h3 (which is the mb-6 container)
    const categoryContainer = categoryHeading.parentElement;
    // Within that container, find the category badge
    const categoryElement = within(categoryContainer).getByText(/general question/i);
    expect(categoryElement).toBeInTheDocument();
    // Check that it has the category badge styling
    expect(categoryElement).toHaveClass('bg-violet-100');
    expect(categoryElement).toHaveClass('text-violet-700');
  });

  it('renders sender information', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    expect(screen.getByText(/name/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
  });

  it('renders assignee information when assigned', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    expect(screen.getByText(/assignee/i)).toBeInTheDocument();
    expect(screen.getByTestId('assignee-name')).toHaveTextContent('Agent One');
    expect(screen.getByTestId('assignee-avatar')).toHaveTextContent('A');
  });

  it('renders assignee as unassigned when assigneeId is null', () => {
    const ticketUnassigned = {
      ...mockTicket,
      assigneeId: null,
    };

    renderWithQuery(<TicketDetail ticket={ticketUnassigned} agents={mockAgents} />);

    expect(screen.getByText(/unassigned/i)).toBeInTheDocument();
    // When assigneeId is null, avatar element should not be rendered
    expect(screen.queryByTestId('assignee-avatar')).not.toBeInTheDocument();
  });

  it('renders assignee as "(not an agent)" when assigneeId is not in agents list', () => {
    const ticketWithInvalidAssignee = {
      ...mockTicket,
      assigneeId: 'invalid-id',
    };

    renderWithQuery(<TicketDetail ticket={ticketWithInvalidAssignee} agents={mockAgents} />);

    expect(screen.getByTestId('assignee-name')).toHaveTextContent(
      'invalid-id (not an agent)'
    );
  });

  it('renders description/body', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    // Find the h3 with text "Description"
    const descriptionHeading = screen.getByRole('heading', { level: 3, name: /description/i });
    // Get the parent div of the h3 (which is the mb-6 container)
    const descriptionContainer = descriptionHeading.parentElement;
    // Within that container, find the description body (p element)
    const descriptionElement = within(descriptionContainer).getByText(/this is a test ticket description/i);
    expect(descriptionElement).toBeInTheDocument();
  });

  it('renders timestamps', () => {
    renderWithQuery(<TicketDetail ticket={mockTicket} agents={mockAgents} />);

    // Find the Created At section
    const createdAtLabel = screen.getByText(/created at/i);
    const createdAtContainer = createdAtLabel.parentElement;
    const createdAtValue = within(createdAtContainer).getByText(/aug 14, 2026/i);
    expect(createdAtValue).toBeInTheDocument();

    // Find the Updated At section
    const updatedAtLabel = screen.getByText(/updated at/i);
    const updatedAtContainer = updatedAtLabel.parentElement;
    const updatedAtValue = within(updatedAtContainer).getByText(/aug 14, 2026/i);
    expect(updatedAtValue).toBeInTheDocument();
  });

  it('does not show updated at when it is null', () => {
    const ticketWithoutUpdate = {
      ...mockTicket,
      updatedAt: null,
    };

    renderWithQuery(<TicketDetail ticket={ticketWithoutUpdate} agents={mockAgents} />);

    // Should not contain "Updated At" section when updatedAt is null
    expect(screen.queryByText(/updated at/i)).not.toBeInTheDocument();

    // Should still show Created At section
    expect(screen.getByText(/created at/i)).toBeInTheDocument();
  });

  it('handles all status types', () => {
    const statuses = [
      { status: TicketStatus.OPEN, label: 'Open', color: 'bg-blue-100 text-blue-700' },
      { status: TicketStatus.IN_PROGRESS, label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
      { status: TicketStatus.RESOLVED, label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
      { status: TicketStatus.CLOSED, label: 'Closed', color: 'bg-slate-100 text-slate-600' },
    ];

    statuses.forEach(({ status, label, color }) => {
      const ticketWithStatus = {
        ...mockTicket,
        status,
      };

      const { container } = renderWithQuery(<TicketDetail ticket={ticketWithStatus} agents={mockAgents} />);

      // Find the h3 with text "Status" within the container
      const statusHeading = within(container).getByRole('heading', { level: 3, name: /status/i });
      // Get the parent div of the h3 (which is the mb-6 container)
      const statusContainer = statusHeading.parentElement;
      // Within that container, find the status badge
      const statusElement = within(statusContainer).getByText(new RegExp(label, 'i'));
      expect(statusElement).toBeInTheDocument();
      const [bgColor, textColor] = color.split(' ');
      expect(statusElement).toHaveClass(bgColor);
      expect(statusElement).toHaveClass(textColor);
    });
  });

  it('handles all priority types', () => {
    const priorities = [
      { priority: TicketPriority.LOW, label: 'Low', color: 'bg-green-100 text-green-700' },
      { priority: TicketPriority.MEDIUM, label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
      { priority: TicketPriority.HIGH, label: 'High', color: 'bg-orange-100 text-orange-700' },
      { priority: TicketPriority.URGENT, label: 'Urgent', color: 'bg-red-100 text-red-700' },
    ];

    priorities.forEach(({ priority, label, color }) => {
      const ticketWithPriority = {
        ...mockTicket,
        priority,
      };

      const { container } = renderWithQuery(<TicketDetail ticket={ticketWithPriority} agents={mockAgents} />);

      // Find the strong element with text "Priority:" within the container
      const priorityLabel = within(container).getByText(/priority:/i);
      // Get the next element sibling (should be the priority badge span)
      const priorityElement = priorityLabel.nextElementSibling;
      expect(priorityElement).toBeInTheDocument();
      const [bgColor, textColor] = color.split(' ');
      expect(priorityElement).toHaveClass(bgColor);
      expect(priorityElement).toHaveClass(textColor);
    });
  });

  it('handles all category types', () => {
    const categories = [
      { category: TicketCategory.GENERAL_QUESTION, label: 'General Question', bgColor: 'bg-violet-100 text-violet-700' },
      { category: TicketCategory.TECHNICAL_QUESTION, label: 'Technical Question', bgColor: 'bg-blue-100 text-blue-700' },
      { category: TicketCategory.REFUND_REQUEST, label: 'Refund Request', bgColor: 'bg-pink-100 text-pink-700' },
    ];

    categories.forEach(({ category, label, bgColor }) => {
      const ticketWithCategory = {
        ...mockTicket,
        category,
      };

      const { container } = renderWithQuery(<TicketDetail ticket={ticketWithCategory} agents={mockAgents} />);

      // Find the h3 with text "Category" within the container
      const categoryHeading = within(container).getByRole('heading', { level: 3, name: /category/i });
      // Get the parent div of the h3 (which is the mb-6 container)
      const categoryContainer = categoryHeading.parentElement;
      // Within that container, find the category badge
      const categoryElement = within(categoryContainer).getByText(new RegExp(label, 'i'));
      expect(categoryElement).toBeInTheDocument();
      const [bg, text] = bgColor.split(' ');
      expect(categoryElement).toHaveClass(bg);
      expect(categoryElement).toHaveClass(text);
    });
  });

  it('shows "No description provided" when body is empty', () => {
    const ticketWithoutBody = {
      ...mockTicket,
      body: '',
    };

    renderWithQuery(<TicketDetail ticket={ticketWithoutBody} agents={mockAgents} />);

    expect(screen.getByText(/no description provided/i)).toBeInTheDocument();
  });

  it('shows "No description provided" when body is null', () => {
    const ticketWithoutBody = {
      ...mockTicket,
      body: null,
    };

    renderWithQuery(<TicketDetail ticket={ticketWithoutBody} agents={mockAgents} />);

    expect(screen.getByText(/no description provided/i)).toBeInTheDocument();
  });
});