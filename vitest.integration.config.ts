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
        environment: 'node', // Use Node.js environment for real HTTP requests
        setupFiles: ['./src/test/setup.integration.ts'],
        testTimeout: 120000, // 2 minutes for slow DeepL API calls
        // Prevent parallel execution to avoid rate limiting issues
        maxConcurrency: 1,
        pool: 'forks', // Use process isolation for better test separation
        // Only run integration tests
        include: ['**/integration/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: [
            '**/unit/**',
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
