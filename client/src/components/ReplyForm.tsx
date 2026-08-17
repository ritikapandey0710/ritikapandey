import { useState } from 'react';
import { ErrorMessage } from './ErrorMessage';

interface ReplyFormProps {
  onSubmit: (replyBody: string) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
  submitSuccess: boolean;
}

/**
 * A component for submitting a reply to a ticket.
 * @param props.onSubmit - Async function to handle form submission
 * @param props.isSubmitting - Whether the form is currently submitting
 * @param props.submitError - Error message from submission, if any
 * @param props.submitSuccess - Whether the last submission was successful
 */
export const ReplyForm: React.FC<ReplyFormProps> = ({
  onSubmit,
  isSubmitting,
  submitError,
  submitSuccess,
}) => {
  const [replyBody, setReplyBody] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) {
      // We don't set errors here; the parent should handle validation
      return;
    }
    try {
      await onSubmit(replyBody);
      // Only clear the form after successful submission
      setReplyBody('');
    } catch (err) {
      // Keep the typed text on error - the parent handles error display
      // Do not clear the textarea
    }
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
      </div>

      <ErrorMessage error={submitError} />
      {submitSuccess && (
        <p className="mt-1 text-xs text-green-600">Reply posted successfully!</p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={isSubmitting || !replyBody.trim()}
          className={`px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200 ${
            isSubmitting ? 'bg-violet-500' : ''
          }`}
        >
          {isSubmitting ? 'Sending...' : 'Send Reply'}
        </button>
      </div>
    </form>
  );
};