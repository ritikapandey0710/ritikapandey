import { useMutation } from '@tanstack/react-query';

/**
 * Custom hook for API mutations with consistent loading, error, and success states.
 * Encapsulates the common pattern of setting loading/error/success state variables.
 *
 * @param mutationFn - The async function to call for the mutation
 * @param options - Optional callbacks for success and error
 * @returns Object with mutate function and state properties
 */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: unknown, variables: TVariables) => void;
  }
) {
  const {
    mutate,
    isPending,
    isError,
    isSuccess,
    error,
  } = useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data, variables) => {
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });

  return {
    mutate,
    isLoading: isPending,
    error: isError ? (error as Error).message || String(error) : null,
    success: isSuccess,
  };
}