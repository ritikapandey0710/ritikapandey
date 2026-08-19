import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authClient } from '../lib/auth-client';
import { fetchUsers, createUser, updateUser, deleteUser } from '../api';
import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AuthUser } from '@/types/user';
import { UserTable } from '../components/users/UserTable';
import { DeleteUserModal } from '../components/users/DeleteUserModal';

function UserModal({
  isOpen,
  onClose,
  onSuccess,
  user, // If provided, edit mode; if null/undefined, create mode
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: AuthUser | null | undefined;
}) {
  const isEditMode = !!user;
  const schema = z.object({
    name: z.string().trim().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .union([
        z.string().min(8, "Password must be at least 8 characters"),
        z.literal(""),
      ])
      .optional()
      .transform((val) => {
        if (val === "") {
          return undefined;
        }
        return val;
      }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: ""
    },
  });

  const [apiError, setApiError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setApiError("");
    try {
      if (isEditMode) {
        // Edit mode
        // Validate user exists
        if (!user) {
          setApiError("Invalid user");
          return;
        }

        // Validate user has an ID that's not null or undefined
        if (user.id === null || user.id === undefined) {
          setApiError("Invalid user ID");
          return;
        }

        // Convert ID to string to handle both string and number IDs
        const userId = String(user.id);
        if (!userId || userId.trim() === "") {
          setApiError("Invalid user ID");
          return;
        }

        // Prepare update data - only include fields that have values
        const updatePayload = {
          name: data.name.trim(),
          email: data.email.toLowerCase().trim(),
        };

        // Only include password if it's provided and meets requirements
        if (data.password && data.password.trim().length >= 8) {
          // @ts-expect-error - We know this is safe because we checked the length above
          updatePayload.password = data.password;
        }

        // Double-check that we have a valid object (defensive programming)
        if (typeof updatePayload !== 'object' || updatePayload === null || Array.isArray(updatePayload)) {
          throw new Error('Internal error: failed to create update payload');
        }

        await updateUser(userId, updatePayload);
      } else {
        // Create mode
        await createUser({
          name: data.name,
          email: data.email,
          password: data.password || "",
        });
      }

      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('User operation error:', err); // Add logging for debugging
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        setApiError(err.response.data?.error || `Server error: ${err.response.status}`);
      } else if (err.request) {
        // The request was made but no response was received
        setApiError('Network error - please try again');
      } else {
        // Something happened in setting up the request that triggered an Error
        setApiError('Request setup error: ' + err.message);
      }
    }
  };

  const handleClose = () => {
    reset();
    setApiError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div data-testid="backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div ref={modalRef} className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-slate-300/50 border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{isEditMode ? "Edit User" : "Create New User"}</h2>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {apiError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {apiError}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Full Name
            </label>
            <input
              {...register("name")}
              placeholder="Enter full name"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${
                errors.name ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email
            </label>
            <input
              {...register("email")}
              type="email"
              placeholder="Enter email address"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${
                errors.email ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {isEditMode ? "Password (leave blank to keep current)" : "Password"}
            </label>
            <input
              {...register("password")}
              type="password"
              placeholder="Min. 8 characters"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition ${
                errors.password ? "border-red-300 bg-red-50" : "border-slate-200"
              }`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-60 rounded-xl transition shadow-sm shadow-violet-200"
            >
              {isSubmitting ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isEditMode ? "Save Changes" : "Create User"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserPage() {
  const { data: session, isPending: authPending } = authClient.useSession();
  const enabled = !authPending && !!session;
  const [dialogState, setDialogState] = useState<{ open: false } | { open: true, mode: 'create' } | { open: true, mode: 'edit', user: AuthUser }>({ open: false });
  const [deleteUserState, setDeleteUserState] = useState<{ open: false } | { open: true, userId: string; userName: string; loading: boolean }>({ open: false });
  const { data: users, isLoading, error, isError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled,
  });
  const queryClient = useQueryClient();

  if (authPending) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  if (isError) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Failed to load users: {error?.message || 'Unknown error'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {users ? `${users.length} user${users.length !== 1 ? 's' : ''}` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => setDialogState({ open: true, mode: 'create' })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition shadow-sm shadow-violet-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </button>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !users?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No users found</p>
              <p className="text-xs text-slate-500 mt-1">Create your first user to get started</p>
            </div>
          ) : (
            <UserTable
              users={users}
              currentUserId={session?.user?.id ?? null}
              onEdit={(user) => {
                setDialogState({ open: true, mode: 'edit', user });
              }}
              onDelete={(userId, userName) => {
                setDeleteUserState({ open: true, userId, userName, loading: false });
              }}
            />
          )}
        </div>

        {/* Modal */}
        {dialogState.open && dialogState.mode === 'create' && (
          <UserModal
            isOpen={true}
            onClose={() => setDialogState({ open: false })}
            onSuccess={() => {
              setDialogState({ open: false });
              queryClient.invalidateQueries({ queryKey: ['users'] });
            }}
            user={null}
          />
        )}

        {dialogState.open && dialogState.mode === 'edit' && (
          <UserModal
            isOpen={true}
            onClose={() => setDialogState({ open: false })}
            onSuccess={() => {
              setDialogState({ open: false });
              queryClient.invalidateQueries({ queryKey: ['users'] });
            }}
            user={dialogState.user}
          />
        )}

        {deleteUserState.open && (
          <DeleteUserModal
            isOpen={true}
            onClose={() => setDeleteUserState({ open: false })}
            userId={deleteUserState.userId}
            userName={deleteUserState.userName}
            onConfirm={async () => {
              try {
                setDeleteUserState(prev => ({
                  ...(prev as { open: true, userId: string; userName: string; loading: boolean }),
                  loading: true
                }));
                await deleteUser(deleteUserState.userId);
                setDeleteUserState({ open: false });
                queryClient.invalidateQueries({ queryKey: ['users'] });
              } catch (error) {
                setDeleteUserState(prev => ({
                  ...(prev as { open: true, userId: string; userName: string; loading: boolean }),
                  loading: false
                }));
                // Error will be handled by the DeleteUserModal component
                throw error;
              }
            }}
            loading={((deleteUserState as { open: true, userId: string; userName: string; loading: boolean })?.loading ?? false)}
          />
        )}
      </div>
    </div>
  );
}