import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteTicket from './DeleteTicket';
import * as api from '../../api';

vi.mock('../../api', () => ({
  deleteTicket: vi.fn(),
}));

const mockedDelete = vi.mocked(api.deleteTicket);

describe('DeleteTicket', () => {
  const onDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedDelete.mockResolvedValue({ message: 'Ticket deleted successfully' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not delete without confirmation (dialog prevents accidental deletion)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DeleteTicket ticketId="t1" onDeleted={onDeleted} />);

    // Dialog not shown initially.
    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('delete-ticket-button'));

    // Dialog appears and asks the required question.
    const dialog = screen.getByTestId('delete-confirm-dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Delete this ticket\?/)).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();

    // Cancel closes the dialog and does NOT call the API.
    await user.click(screen.getByTestId('delete-cancel-button'));
    expect(screen.queryByTestId('delete-confirm-dialog')).not.toBeInTheDocument();
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and notifies parent', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DeleteTicket ticketId="t1" onDeleted={onDeleted} />);

    await user.click(screen.getByTestId('delete-ticket-button'));
    await user.click(screen.getByTestId('delete-confirm-button'));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('t1'));
    expect(await screen.findByTestId('delete-success')).toHaveTextContent(
      'Ticket deleted successfully'
    );

    // Navigation happens after the brief success delay.
    vi.advanceTimersByTime(700);
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
  });

  it('disables the action while deletion is in progress', async () => {
    let resolveDelete!: (v: unknown) => void;
    mockedDelete.mockImplementation(
      () => new Promise((resolve) => { resolveDelete = resolve; })
    );
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DeleteTicket ticketId="t2" onDeleted={onDeleted} />);

    await user.click(screen.getByTestId('delete-ticket-button'));
    fireEvent.click(screen.getByTestId('delete-confirm-button'));

    // In-flight state: buttons disabled + loading indicator.
    expect(screen.getByTestId('delete-confirm-button')).toBeDisabled();
    expect(screen.getByTestId('delete-cancel-button')).toBeDisabled();
    expect(screen.getAllByText('Deleting…').length).toBeGreaterThan(0);

    resolveDelete({});
    await waitFor(() => expect(mockedDelete).toHaveBeenCalled());
  });

  it('shows the backend error when deletion fails', async () => {
    mockedDelete.mockRejectedValue({
      response: { data: { error: 'Forbidden: Admin access required' } },
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DeleteTicket ticketId="t3" onDeleted={onDeleted} />);

    await user.click(screen.getByTestId('delete-ticket-button'));
    await user.click(screen.getByTestId('delete-confirm-button'));

    expect(await screen.findByTestId('delete-error')).toHaveTextContent(
      'Forbidden: Admin access required'
    );
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
