import { RenderResult, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

/**
 * Create a QueryClient suitable for tests: no retries so error states appear
 * immediately.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

interface RenderWithQueryOptions {
  /**
   * Optional QueryClient. For convenience, a partial mock containing only
   * spies (e.g. `{ invalidateQueries: vi.fn() }`) is also accepted: it is
   * backed by a real QueryClient and `invalidateQueries` calls are delegated
   * to the provided spy so assertions like
   * `expect(queryClient.invalidateQueries).toHaveBeenCalledWith(...)` work.
   */
  queryClient?: QueryClient | { invalidateQueries?: (...args: any[]) => unknown };
  /** Initial route for the MemoryRouter. */
  route?: string;
}

/**
 * Render a component wrapped in a QueryClientProvider and MemoryRouter.
 */
export function renderWithQuery(
  ui: ReactElement,
  options: RenderWithQueryOptions = {}
): RenderResult {
  const { queryClient: provided, route } = options;

  let client: QueryClient;
  if (
    provided &&
    !(provided instanceof QueryClient) &&
    typeof provided.invalidateQueries === 'function'
  ) {
    // Partial mock: back it with a real client and delegate invalidateQueries.
    client = createTestQueryClient();
    const originalInvalidate = client.invalidateQueries.bind(client);
    const spy = provided.invalidateQueries;
    client.invalidateQueries = ((...args: any[]) => {
      spy(...args);
      return originalInvalidate(
        ...(args as Parameters<QueryClient['invalidateQueries']>)
      );
    }) as QueryClient['invalidateQueries'];
  } else if (provided instanceof QueryClient) {
    client = provided;
  } else {
    client = createTestQueryClient();
  }

  return render(
    React.createElement(
      QueryClientProvider,
      { client },
      React.createElement(MemoryRouter, { initialEntries: [route ?? '/'] }, ui)
    )
  );
}
