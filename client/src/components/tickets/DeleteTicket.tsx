import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteTicket } from '../../api';

interface DeleteTicketProps {
  ticketId: string;
  /** Called after the ticket was deleted successfully (page navigates away). */
  onDeleted: () => void;
  /**
   * 'section' (default): full "Danger Zone" card used on the details page.
   * 'icon': compact trash icon button used inline in table rows.
   */
  variant?: 'section' | 'icon';
}

/**
 * Admin-only control for permanently deleting a ticket.
 *
 * Shows a confirmation dialog before deleting, disables the action while the
 * deletion request is in flight, surfaces backend errors inline, and invokes
 * onDeleted() once the backend confirms success.
 */
export default function DeleteTicket({ ticketId, onDeleted, variant = 'section' }: DeleteTicketProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await deleteTicket(ticketId);
      setShowConfirm(false);
      setSuccess('Ticket deleted successfully.');
      // Give the user a beat to see the confirmation, then leave the page.
      setTimeout(() => {
        onDeleted();
      }, 600);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.message ||
          'Failed to delete ticket'
      );
      setIsDeleting(false);
    }
  };

  if (variant === 'icon') {
    return (
      <div data-testid="delete-ticket-section">
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          disabled={isDeleting}
          data-testid="delete-ticket-button"
          title="Delete ticket"
          aria-label="Delete ticket"
          className="p-1.5 rounded-lg text-red-600 hover:text-red-800 hover:bg-red-50 transition disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>

        {showConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
            data-testid="delete-confirm-dialog"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
              <h4 id="delete-confirm-title" className="text-lg font-bold text-slate-900 mb-2">
                Delete this ticket?
              </h4>
              <p className="text-sm text-slate-600 mb-6">
                This will permanently delete the ticket along with all replies and
                email messages. <strong>This action cannot be undone.</strong>
              </p>

              {error && (
                <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2" data-testid="delete-error">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !isDeleting && setShowConfirm(false)}
                  disabled={isDeleting}
                  data-testid="delete-cancel-button"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  data-testid="delete-confirm-button"
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition ${
                    isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isDeleting && (
                    <span
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="delete-ticket-section"
      className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 mb-6"
    >
      <h3 className="text-base font-semibold text-red-700 mb-2">Danger Zone</h3>
      <p className="text-sm text-slate-500 mb-4">
        Permanently remove this ticket and all of its replies and email history.
        This action affects only administrators and cannot be undone from the UI.
      </p>

      {success && (
        <p className="mb-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2" data-testid="delete-success">
          {success}
        </p>
      )}

      {error && (
        <p className="mb-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2" data-testid="delete-error">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isDeleting}
        data-testid="delete-ticket-button"
        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition shadow-sm ${
          isDeleting
            ? 'bg-red-400 cursor-not-allowed'
            : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        {isDeleting ? (
          <>
            <span
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            Deleting…
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Delete Ticket
          </>
        )}
      </button>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          data-testid="delete-confirm-dialog"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h4 id="delete-confirm-title" className="text-lg font-bold text-slate-900 mb-2">
              Delete this ticket?
            </h4>
            <p className="text-sm text-slate-600 mb-6">
              This will permanently delete the ticket along with all replies and
              email messages. <strong>This action cannot be undone.</strong>
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !isDeleting && setShowConfirm(false)}
                disabled={isDeleting}
                data-testid="delete-cancel-button"
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                data-testid="delete-confirm-button"
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition ${
                  isDeleting
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isDeleting && (
                  <span
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                )}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
