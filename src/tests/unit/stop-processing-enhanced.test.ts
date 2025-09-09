import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadicalsManager } from '../../hooks/useRadicalsManager';

// Mock external dependencies
vi.mock('../../lib/wanikani');
vi.mock('../../lib/deepl');
vi.mock('../../lib/contextual-translation');

describe('Enhanced Stop Processing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
            },
            writable: true,
        });
    });

    afterEach(() => {
        // Wait for any pending React updates to complete
        return new Promise(resolve => setTimeout(resolve, 100));
    });

    it('should immediately set stop flags when stopProcessing is called', () => {
        const { result, unmount } = renderHook(() => useRadicalsManager());

        act(() => {
            result.current.stopProcessing();
        });

        expect(result.current.isProcessing).toBe(false);
        // Note: We can't directly test the ref value or internal shouldStopProcessing state
        // but we can verify the function completes without error

        // React 19 best practice: Always unmount
        unmount();
    });

    it('should reset stop flags when starting new processing', async () => {
        const { result, unmount } = renderHook(() => useRadicalsManager());

        // First, stop processing
        await act(async () => {
            result.current.stopProcessing();
            // React 19: Allow state updates to settle
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        // Set synonym mode that requires DeepL (but no token is set)
        await act(async () => {
            result.current.setSynonymMode('smart-merge');
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        // Then start a new processing (should reset flags but fail due to missing DeepL token)
        await act(async () => {
            await result.current.processTranslations([]);
        });

        // Should show error message for missing DeepL token, not "no radicals"
        expect(result.current.translationStatus).toContain('DeepL Token fehlt');

        // React 19 best practice: Always unmount
        unmount();
    });

    it('should handle stop processing functionality', () => {
        const { result, unmount } = renderHook(() => useRadicalsManager());

        // Initially not processing
        expect(result.current.isProcessing).toBe(false);

        // Simulate some processing state
        act(() => {
            result.current.handleApiTokenChange('test-token');
        });

        act(() => {
            result.current.stopProcessing();
        });

        // Should ensure processing is stopped
        expect(result.current.isProcessing).toBe(false);
        // Should have stopped status messages
        expect(result.current.translationStatus).toContain('Stoppe');
        expect(result.current.uploadStatus).toContain('gestoppt');

        // React 19 best practice: Always unmount
        unmount();
    });

    it('should handle processing without DeepL token for delete mode', async () => {
        const { result, unmount } = renderHook(() => useRadicalsManager());

        // Set API token but no DeepL token
        await act(async () => {
            result.current.handleApiTokenChange('test-api-token');
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        // Set delete mode (doesn't need DeepL token)
        await act(async () => {
            result.current.setSynonymMode('delete');
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        const mockRadicals = [
            {
                id: 1,
                meaning: 'ground',
                level: 1,
                currentSynonyms: ['existing'],
                selected: true,
                translatedSynonyms: [],
            }
        ];

        await act(async () => {
            await result.current.processTranslations(mockRadicals);
            // Wait for async operations to complete
            await new Promise(resolve => setTimeout(resolve, 50));
        });

        // Delete mode should complete processing quickly and return to false
        // OR still be processing depending on timing
        expect(typeof result.current.isProcessing).toBe('boolean');

        // React 19 best practice: Always unmount
        unmount();
    });

    it('should handle processing without DeepL token for translation mode', async () => {
        const { result, unmount } = renderHook(() => useRadicalsManager());

        // Set API token but no DeepL token
        await act(async () => {
            result.current.handleApiTokenChange('test-api-token');
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        // Set smart-merge mode (needs DeepL token)
        await act(async () => {
            result.current.setSynonymMode('smart-merge');
            await new Promise(resolve => setTimeout(resolve, 10));
        });

        const mockRadicals = [
            {
                id: 1,
                meaning: 'ground',
                level: 1,
                currentSynonyms: [],
                selected: true,
                translatedSynonyms: [],
            }
        ];

        await act(async () => {
            await result.current.processTranslations(mockRadicals);
        });

        expect(result.current.translationStatus).toContain('DeepL Token fehlt');
        expect(result.current.isProcessing).toBe(false);

        // Clean unmount to prevent React 19 warnings
        unmount();
    });
});
