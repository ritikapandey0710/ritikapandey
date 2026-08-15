import { RenderResult, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ReactQuery from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Create a query client for tests
export const createTestQueryClient = () => new QueryClient();

/**
 * Render a component with React Query providers
 * @param ui The component to render
 * @param options Additional options for the query client or testing-library render
 */
export const renderWithQuery = (
  ui: ReactElement,
  options: {
    queryClient?: QueryClient;
    route?: string;
  } = {}
): RenderResult => {
  const { queryClient: customQueryClient, route } = options;
  const queryClient = customQueryClient ?? createTestQueryClient();

  // Create initial entries for memory router
  const initialEntries = route ? [route] : ['/'];

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Use MockedProvider if available, otherwise pass through children
    const MockedProviderComponent = ReactQuery.MockedProvider || ((props: { children: ReactNode }) => {
      return React.createElement(React.Fragment, null, props.children);
    });

    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        MemoryRouter,
        { initialEntries },
        React.createElement(MockedProviderComponent, null, children)
      )
    );
  };

  return render(ui, { wrapper: Wrapper });
};