import { renderWithQuery } from './render-utils';
import { useLocation } from 'react-router-dom';
import { screen } from '@testing-library/react';

function LocationTestComponent() {
  const location = useLocation();
  return <div data-testid="location-output">{location.pathname}</div>;
}

describe('Location Test', () => {
  it('should have the correct pathname', () => {
    renderWithQuery(<LocationTestComponent />, {
      route: '/tickets/123',
    });

    const element = screen.getByTestId('location-output');
    expect(element).toHaveTextContent('/tickets/123');
  });
});