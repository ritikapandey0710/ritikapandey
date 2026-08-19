import { useState } from 'react';
import { ErrorMessage } from '../common/ErrorMessage';
import { polishReply } from '../../api';

interface ReplyFormProps {
  onSubmit: (replyBody: string) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
  ticketId?: string;
  customerName?: string;
  subject?: string;
}

export const ReplyForm: React.FC<ReplyFormProps> = ({
  onSubmit,
  isSubmitting,
  submitError,
  submitSuccess,
  ticketId,
  customerName,
  subject,
}) => {
  const [replyBody, setReplyBody] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishError, setPolishError] = useState<string | null>(null);

  const handlePolish = async () => {
    if (!replyBody.trim() || isPolishing) return;

    setIsPolishing(true);
    setPolishError(null);

    try {
      // Validate required parameters
      if (!ticketId) {
        throw new Error('Ticket ID is required for polishing replies');
      }

      // Call the server-side AI polish endpoint with agent, customer, and subject info
      const result = await polishReply(replyBody, ticketId, customerName, subject);

      // Update the textarea with the polished version
      setReplyBody(result.polished);
    } catch (err: any) {
      console.error('Failed to polish reply:', err);
      setPolishError(err?.message || 'Failed to polish reply');
    } finally {
      setIsPolishing(false);
    }
  };

  const isReplyEmpty = !replyBody.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReplyEmpty) {
      // The Send button is disabled when the reply is empty, so we never
      // reach this state through normal user interaction. Guard anyway.
      return;
    }

    try {
      // Format the reply to address customer by first name and ensure professional tone
      const formattedReply = formatReplyForCustomer(replyBody, customerName);
      await onSubmit(formattedReply);
      // Only clear the form after successful submission
      setReplyBody('');
    } catch (err) {
      // Keep the typed text on error - the parent handles error display
      // Do not clear the textarea
    }
  };

  // Formats reply to address customer by first name and ensure professional tone
  const formatReplyForCustomer = (body: string, customerName: string | undefined): string => {
    // Trim the body
    let formattedBody = body.trim();

    // If we have a customer name, address them by first name
    if (customerName) {
      // Extract first name (assuming format like "John Doe" or just "John")
      const firstName = customerName.split(' ')[0];

      // Check if the body already starts with a greeting to the customer
      const lowerBody = formattedBody.toLowerCase();
      const greetingPatterns = [
        `hi ${firstName.toLowerCase()},`,
        `hello ${firstName.toLowerCase()},`,
        `hey ${firstName.toLowerCase()},`,
        `dear ${firstName.toLowerCase()},`
      ];

      const alreadyHasGreeting = greetingPatterns.some(pattern => lowerBody.startsWith(pattern));

      // If it doesn't already have a greeting, prepend one
      if (!alreadyHasGreeting && firstName) {
        formattedBody = `Hi ${firstName}, ${formattedBody}`;
      }
    }

    return formattedBody;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="reply-body" className="block text-sm font-medium text-slate-700 mb-1">
          Write a reply
        </label>
        <textarea
          id="reply-body"
          value={replyBody}
          onChange={(e) => {
            setReplyBody(e.target.value);
          }}
          rows={4}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition resize-y"
          placeholder="Type your reply here..."
        />
        {polishError && (
          <p className="mt-1 text-xs text-red-600">{polishError}</p>
        )}
      </div>

      <ErrorMessage error={submitError} />
      {submitSuccess && (
        <p className="mt-1 text-xs text-green-600">Reply posted successfully!</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePolish}
            disabled={isSubmitting || !replyBody.trim() || isPolishing}
            className={`px-4 py-2 text-sm font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded-xl transition shadow-sm shadow-gray-200 ${
              isPolishing ? 'bg-gray-500' : ''
            }`}
          >
            {isPolishing ? 'Polishing...' : 'Polish Reply'}
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || isReplyEmpty}
          className={`px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200 ${
            isSubmitting || isReplyEmpty ? 'bg-violet-500' : 'hover-bg-violet-700'
          }`}
        >
          {isSubmitting ? 'Sending...' : 'Send Reply'}
        </button>
      </div>
    </form>
  );
};