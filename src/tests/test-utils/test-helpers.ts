/**
 * Test Utilities - Test Helpers
 * 
 * Wiederverwendbare Helper-Funktionen für Tests.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

// ============================================================================
// Rendering Helpers
// ============================================================================

/**
 * Render Component und warte auf Loading State
 */
export async function renderAndWaitForLoading(component: React.ReactElement) {
    const result = render(component);

    // Warte bis Loading-Indikator verschwunden ist
    await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    return result;
}

/**
 * Finde Element by Test ID mit Error Message
 */
export function getByTestIdSafe(testId: string) {
    const element = screen.getByTestId(testId);
    if (!element) {
        throw new Error(`Element with test ID "${testId}" not found`);
    }
    return element;
}

// ============================================================================
// Mock Setup Helpers
// ============================================================================

/**
 * Setup Mock mit Standard Return Values
 */
export function setupMockWithDefaults<T>(
    mockFn: ReturnType<typeof vi.fn>,
    defaultValue: T
) {
    mockFn.mockResolvedValue(defaultValue);
    return mockFn;
}

/**
 * Setup Mock mit mehreren Return Values (für mehrere Calls)
 */
export function setupMockWithSequence<T>(
    mockFn: ReturnType<typeof vi.fn>,
    values: T[]
) {
    values.forEach(value => mockFn.mockResolvedValueOnce(value));
    return mockFn;
}

/**
 * Setup Mock mit Error
 */
export function setupMockWithError(
    mockFn: ReturnType<typeof vi.fn>,
    errorMessage: string = 'Mock error'
) {
    mockFn.mockRejectedValue(new Error(errorMessage));
    return mockFn;
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert dass Mock genau N mal aufgerufen wurde
 */
export function assertMockCalledTimes(
    mockFn: ReturnType<typeof vi.fn>,
    times: number,
    message?: string
) {
    expect(mockFn).toHaveBeenCalledTimes(times);
    if (message) {
        console.log(message);
    }
}

/**
 * Assert dass Mock mit spezifischen Args aufgerufen wurde
 */
export function assertMockCalledWith<T extends any[]>(
    mockFn: ReturnType<typeof vi.fn>,
    ...args: T
) {
    expect(mockFn).toHaveBeenCalledWith(...args);
}

/**
 * Assert dass Element Text enthält (case-insensitive)
 */
export function assertTextInDocument(text: string | RegExp) {
    const element = screen.getByText(text);
    expect(element).toBeInTheDocument();
    return element;
}

/**
 * Assert dass Element NICHT im Document ist
 */
export function assertTextNotInDocument(text: string | RegExp) {
    expect(screen.queryByText(text)).not.toBeInTheDocument();
}

// ============================================================================
// Async Helpers
// ============================================================================

/**
 * Warte bis Condition erfüllt ist
 */
export async function waitForCondition(
    condition: () => boolean,
    timeout: number = 3000,
    interval: number = 100
): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error(`Timeout waiting for condition after ${timeout}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
}

/**
 * Warte bis Mock aufgerufen wurde
 */
export async function waitForMockCall(
    mockFn: ReturnType<typeof vi.fn>,
    times: number = 1,
    timeout: number = 3000
) {
    await waitFor(() => {
        expect(mockFn).toHaveBeenCalledTimes(times);
    }, { timeout });
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

/**
 * Clear alle Mocks
 */
export function clearAllMocks(...mocks: Array<ReturnType<typeof vi.fn>>) {
    mocks.forEach(mock => mock.mockClear());
}

/**
 * Reset alle Mocks
 */
export function resetAllMocks(...mocks: Array<ReturnType<typeof vi.fn>>) {
    mocks.forEach(mock => mock.mockReset());
}

// ============================================================================
// Test Data Helpers
// ============================================================================

/**
 * Erstelle Error Map für Tests
 */
export function createErrorMap(errors: Record<number, string>): Map<number, string> {
    return new Map(Object.entries(errors).map(([k, v]) => [Number(k), v]));
}

/**
 * Erstelle Progress Callback Mock
 */
export function createProgressCallback() {
    return vi.fn((_progress: number) => {
        // Optional: Log für Debugging
        // console.log(`Progress: ${_progress}%`);
    });
}
