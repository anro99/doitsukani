import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Set NODE_ENV for proper test configuration
process.env.NODE_ENV = 'test';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom', // Keep jsdom for unit tests that mock DOM elements
        setupFiles: ['./src/test/setup.ts'],
        testTimeout: 60000, // Increased timeout for rate-limited integration tests
        // Prevent parallel execution to avoid rate limiting issues
        maxConcurrency: 1,
        pool: 'forks', // Use process isolation for better test separation
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.test.ts',
                '**/*.test.tsx',
                'src/test/**',
                'vite.config.ts',
                'vitest.config.ts',
                '.vscode/**'
            ]
        },
        // Include TypeScript files
        include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        // Exclude certain patterns
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*'
        ]
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '~': resolve(__dirname, './'),
        }
    }
});
