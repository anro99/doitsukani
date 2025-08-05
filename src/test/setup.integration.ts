import { beforeEach, vi } from 'vitest';

// Global test setup for integration tests (Node.js environment)
beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
});

// Mock console.log/warn/error for cleaner test output
global.console = {
    ...console,
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
};

// No window mocks needed in Node.js environment
