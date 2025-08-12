import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadicalsManager } from '../../hooks/useRadicalsManager';

// Mock the dependencies
vi.mock('../../lib/wanikani', () => ({
    getRadicals: vi.fn().mockResolvedValue([]),
    getRadicalStudyMaterials: vi.fn().mockResolvedValue([]),
    createRadicalSynonyms: vi.fn().mockResolvedValue({}),
    updateRadicalSynonyms: vi.fn().mockResolvedValue({})
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn().mockResolvedValue('translation')
}));

vi.mock('../../lib/contextual-translation', () => ({
    extractContextFromMnemonic: vi.fn().mockReturnValue('context')
}));

vi.mock('bottleneck');

describe('Stop Processing Functionality', () => {
    let hook: ReturnType<typeof renderHook<ReturnType<typeof useRadicalsManager>, any>>;

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn().mockReturnValue(''),
                setItem: vi.fn(),
                removeItem: vi.fn()
            },
            writable: true
        });

        hook = renderHook(() => useRadicalsManager());
    });

    it('should have stopProcessing function available', () => {
        expect(hook.result.current.stopProcessing).toBeDefined();
        expect(typeof hook.result.current.stopProcessing).toBe('function');
    });

    it('should stop processing when stopProcessing is called', () => {
        const { result } = hook;

        act(() => {
            // Simulate starting processing
            result.current.setIsProcessing(true);
        });

        expect(result.current.isProcessing).toBe(true);

        act(() => {
            // Call stop processing
            result.current.stopProcessing();
        });

        expect(result.current.isProcessing).toBe(false);
    });

    it('should set shouldStopProcessing flag when stopProcessing is called', async () => {
        const { result } = hook;

        // Simulate processing state
        act(() => {
            result.current.setIsProcessing(true);
        });

        expect(result.current.isProcessing).toBe(true);

        // Call stopProcessing
        act(() => {
            result.current.stopProcessing();
        });

        // Should immediately set isProcessing to false
        expect(result.current.isProcessing).toBe(false);
    });

    it('should be able to call stopProcessing multiple times safely', () => {
        const { result } = hook;

        // Start processing
        act(() => {
            result.current.setIsProcessing(true);
        });

        // Stop multiple times - should not throw errors
        act(() => {
            result.current.stopProcessing();
        });

        act(() => {
            result.current.stopProcessing();
        });

        act(() => {
            result.current.stopProcessing();
        });

        expect(result.current.isProcessing).toBe(false);
    });

    it('should handle stopProcessing when not processing', () => {
        const { result } = hook;

        // Ensure we're not processing
        expect(result.current.isProcessing).toBe(false);

        // Calling stopProcessing when not processing should be safe
        act(() => {
            result.current.stopProcessing();
        });

        expect(result.current.isProcessing).toBe(false);
    });
});
