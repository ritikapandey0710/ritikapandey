// Setup file for Vitest
import '@testing-library/jest-dom';

// Mock next/navigation if needed
// Mock next/router if needed
// Add any other global mocks here

// MatchMedia mock (required for some CSS media queries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((kind) => ({
    matches: false,
    media: kind,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});