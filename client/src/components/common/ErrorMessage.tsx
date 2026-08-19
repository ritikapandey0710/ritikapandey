import React from 'react';

interface ErrorMessageProps {
  /** The error message to display. If null or empty string, nothing is rendered. */
  error: string | null;
  /** Additional class names to apply to the error message element. */
  className?: string;
}

/**
 * A reusable component for displaying error messages.
 * Renders a paragraph with the error message if provided.
 * @param props.error - The error message to display
 * @param props.className - Optional additional class names
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, className = '' }) => {
  if (!error) {
    return null;
  }

  return (
    <p className={`mt-1 text-xs text-red-600 ${className}`}>
      {error}
    </p>
  );
};