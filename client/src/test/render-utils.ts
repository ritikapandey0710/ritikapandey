import { RenderResult, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as ReactQuery from '@tanstack/react-query';
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
  } = {}
): RenderResult => {
  const { queryClient: customQueryClient } = options;
  const queryClient = customQueryClient ?? createTestQueryClient();

  const Wrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Use MockedProvider if available, otherwise pass through children
    const MockedProviderComponent = ReactQuery.MockedProvider || ((props: { children: ReactNode }) => {
      return React.createElement(React.Fragment, null, props.children);
    });

    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(MockedProviderComponent, null, children)
    );
  };

  return render(ui, { wrapper: Wrapper });
};