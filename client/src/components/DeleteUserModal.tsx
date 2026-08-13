import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  onConfirm,
  loading,
}) => {
  void userId;
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const handleConfirm = async () => {
    await onConfirm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-96 max-w-[90%]">
        <div className="pointer-events-auto bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5">
          {/* Header */}
          <div className="flex items-start justify-between p-6 space-y-4">
            <div className="flex-shrink-0 flex items-center h-10 w-10 rounded-md bg-red-50 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2 text-left">
              <h3 className="text-lg font-semibold leading-none text-gray-900">
                Delete User
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete the user <strong className="font-medium">{userName}</strong>? This action cannot be undone.
              </p>
            </div>
            <button
              className="rounded-md p-1 inline-flex h-8 w-8 items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 space-x-3 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              size="default"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              size="default"
              disabled={loading || currentUserId === undefined}
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Delete User"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};