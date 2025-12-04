import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './test/mocks/server';

// Setup MSW server
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => {
  server.resetHandlers();
  cleanup();
});

// Close server after all tests
afterAll(() => server.close());

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Mock IndexedDB for tests
const indexedDB = {
  open: () => ({
    result: {
      createObjectStore: () => ({}),
      transaction: () => ({
        objectStore: () => ({
          add: () => Promise.resolve(),
          get: () => Promise.resolve(undefined),
          put: () => Promise.resolve(),
          delete: () => Promise.resolve(),
          clear: () => Promise.resolve(),
        }),
      }),
      close: () => {},
    },
    onerror: null,
    onsuccess: null,
  }),
};

Object.defineProperty(window, 'indexedDB', {
  value: indexedDB,
});

// Mock process.env for testing
Object.defineProperty(process, 'env', {
  value: {
    NODE_ENV: 'test',
    __DEV__: true,
  },
  writable: true,
});

// Mock import.meta.env
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        MODE: 'test',
        DEV: true,
        PROD: false,
        SSR: false,
        BASE_URL: '/',
      },
    },
  },
  writable: true,
});

// Console overrides to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalConsoleError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalConsoleWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});