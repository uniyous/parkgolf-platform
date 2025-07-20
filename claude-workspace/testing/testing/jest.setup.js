// Global Jest setup for all tests

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret';
process.env.NATS_URL = 'nats://localhost:4222';
process.env.REDIS_URL = 'redis://localhost:6379';

// Global test utilities
global.testUtils = {
  // Add common test utilities here
};

// Setup global mocks
jest.mock('@nestjs/microservices', () => ({
  // Mock NATS client
  Client: jest.fn(),
  Transport: {
    NATS: 'NATS',
  },
}));

// Increase timeout for integration tests
jest.setTimeout(30000);