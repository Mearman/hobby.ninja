import { setupServer } from 'msw/node';

export const handlers = [
  // Mock API endpoints for testing
  {
    id: 'health-check',
    method: 'GET',
    path: '/api/health',
    response: { status: 'ok', timestamp: new Date().toISOString() },
  },
  {
    id: 'gunpla-data',
    method: 'GET',
    path: '/api/gunpla/kits',
    response: [
      {
        id: 'test-kit-1',
        sku: 'HG-1/144-RX-78-2',
        name: 'RX-78-2 Gundam',
        grade: 'HG',
        scale: '1/144',
        releaseDate: '2023-01-01',
        price: 1200,
        description: 'Test kit for development',
      },
    ],
  },
];

export const server = setupServer(...handlers);