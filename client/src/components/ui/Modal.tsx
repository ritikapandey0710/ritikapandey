import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Optional label for the action button (e.g., "Add", "Save") */
  actionLabel?: string;
  /** Callback when the action button is clicked */
  onAction?: () => void;
  /** If true, the action button shows a loading state */
  isActionLoading?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actionLabel,
  onAction,
  isActionLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="bg-white rounded-lg shadow-xl divide-y divide-gray-200">
          <div className="px-6 py-4 text-lg font-semibold text-gray-900">
            {title}
          </div>
          <div className="px-6 py-6 space-y-4 overflow-y-auto max-h-[70vh]">
            {children}
          </div>
          {children && (
            <div className="flex justify-end px-6 py-4 space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              {actionLabel && (
                <button
                  onClick={onAction}
                  disabled={isActionLoading}
                  className={`px-4 py-2 bg-primary text-white font-medium rounded-md disabled:opacity-50 hover:!bg-primary/90 transition-colors`}
                >
                  {isActionLoading ? 'Adding...' : actionLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;