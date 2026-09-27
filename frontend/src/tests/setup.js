import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Automatically cleanup DOM and mocks after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

// Polyfill window methods
window.scrollTo = vi.fn();
window.print = vi.fn();
