import { beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// Global test setup
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

// React 19 specific test setup
if (typeof globalThis !== 'undefined') {
    // Mock scheduler for React 19 concurrent features
    (globalThis as any).scheduler = {
        postTask: vi.fn().mockImplementation((callback) => {
            // Execute immediately in tests
            return Promise.resolve(callback());
        })
    };
}

// Mock window object for browser APIs (only in jsdom environment)
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(), // deprecated
            removeListener: vi.fn(), // deprecated
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });

    // Mock scheduler.postTask for React 19
    Object.defineProperty(window, 'scheduler', {
        writable: true,
        value: {
            postTask: vi.fn().mockImplementation((callback) => {
                return Promise.resolve(callback());
            })
        }
    });
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Environment variables for tests
process.env.NODE_ENV = 'test';
