import { renderWithQuery } from './render-utils';
import { useParams } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';

function TestComponent() {
  const { id } = useParams<{ id: string }>();
  return <div data-testid="params-output">ID: {id}</div>;
}

describe('Routing Test', () => {
  it('should receive the route parameter', () => {
    renderWithQuery(
      <Routes>
        <Route path="/tickets/:id" element={<TestComponent />} />
      </Routes>,
      {
        route: '/tickets/123',
      }
    );

    const element = screen.getByTestId('params-output');
    expect(element).toHaveTextContent('ID: 123');
  });
});