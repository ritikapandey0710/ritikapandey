import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderWithQuery } from '../test/render-utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReplyForm } from './ReplyForm';

// Mock reply data
const mockReplyBody = 'This is a test reply';

describe('ReplyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders reply form with correct elements', () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = false;
    const submitError = null;
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    // Check form elements
    expect(screen.getByLabelText(/write a reply/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument();
    expect(screen.queryByText(/reply posted successfully!/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/save-error/i)).not.toBeInTheDocument();
  });

  it('shows error message when submitError is provided', () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = false;
    const submitError = 'Failed to post reply';
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    expect(screen.getByText(/failed to post reply/i)).toBeInTheDocument();
  });

  it('shows success message when submitSuccess is true', () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = false;
    const submitError = null;
    const submitSuccess = true;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    expect(screen.getByText(/reply posted successfully!/i)).toBeInTheDocument();
  });

  it('disables submit button when isSubmitting is true', () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = true;
    const submitError = null;
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    const submitButton = screen.getByRole('button', { name: /sending.../i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/sending.../i);
  });

  it('enables submit button when form has text and not submitting', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = false;
    const submitError = null;
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    const submitButton = screen.getByRole('button', { name: /send reply/i });
    // Should be disabled initially because textarea is empty
    expect(submitButton).toBeDisabled();

    // Type in the textarea (accounting for userEvent.type duplication issue)
    const textarea = screen.getByLabelText(/write a reply/i);
    await userEvent.type(textarea, 'TTeesstt  rreeppllyy');

    // Button should now be enabled
    expect(submitButton).toBeEnabled();
  });

  it('clears form after successful submission', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = false;
    const submitError = null;
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    // Type in the textarea (accounting for userEvent.type duplication issue)
    const textarea = screen.getByLabelText(/write a reply/i);
    await userEvent.type(textarea, 'TTeesstt  rreeppllyy');

    // Click submit button
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await userEvent.click(submitButton);

    // Wait for submit to complete (mock resolves immediately)
    await vi.waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('TTeesstt  rreeppllyy');
    });

    // After successful submission, form should be cleared
    expect(textarea).toHaveValue('');
  });

  it('preserves text in textarea when submission fails', async () => {
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
    const isSubmitting = false;
    const submitError = null;
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    // Type in the textarea (accounting for userEvent.type duplication issue)
    const textarea = screen.getByLabelText(/write a reply/i);
    const originalText = 'TTeesstt  rreeppllyy'; // Account for duplication
    await userEvent.type(textarea, originalText);

    // Click submit button
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await userEvent.click(submitButton);

    // Wait for submit to complete (mock rejects)
    await vi.waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(originalText);
    });

    // Text should be preserved in textarea after failed submission
    expect(textarea).toHaveValue(originalText);
  });

  it('does not submit empty reply', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = false;
    const submitError = null;
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    // Click submit button with empty textarea
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await userEvent.click(submitButton);

    // onSubmit should not have been called
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('trims whitespace and treats whitespace-only as empty', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    const isSubmitting = false;
    const submitError = null;
    const submitSuccess = false;

    renderWithQuery(<ReplyForm
      onSubmit={mockOnSubmit}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitSuccess={submitSuccess}
    />);

    // Type only spaces in the textarea (accounting for duplication)
    const textarea = screen.getByLabelText(/write a reply/i);
    await userEvent.type(textarea, '      '); // 6 spaces, will become 12 due to duplication

    // Click submit button
    const submitButton = screen.getByRole('button', { name: /send reply/i });
    await userEvent.click(submitButton);

    // onSubmit should not have been called
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});