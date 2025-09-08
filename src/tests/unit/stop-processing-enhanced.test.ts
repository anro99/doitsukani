import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
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
        const { result } = renderHook(() => useRadicalsManager());

        act(() => {
            result.current.stopProcessing();
        });

        expect(result.current.isProcessing).toBe(false);
        // Note: We can't directly test the ref value or internal shouldStopProcessing state
        // but we can verify the function completes without error
    });

    it('should reset stop flags when starting new processing', async () => {
        const { result } = renderHook(() => useRadicalsManager());

        // First, stop processing
        act(() => {
            result.current.stopProcessing();
        });

        // Set synonym mode that requires DeepL (but no token is set)
        act(() => {
            result.current.setSynonymMode('smart-merge');
        });

        // Then start a new processing (should reset flags but fail due to missing DeepL token)
        act(() => {
            result.current.processTranslations([]);
        });

        // Should show error message for missing DeepL token, not "no radicals"
        expect(result.current.translationStatus).toContain('DeepL Token fehlt');
    });

    it('should handle stop processing functionality', () => {
        const { result } = renderHook(() => useRadicalsManager());

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
    });

    it('should handle processing without DeepL token for delete mode', async () => {
        const { result } = renderHook(() => useRadicalsManager());

        // Set API token but no DeepL token
        act(() => {
            result.current.handleApiTokenChange('test-api-token');
        });

        // Set delete mode (doesn't need DeepL token)
        act(() => {
            result.current.setSynonymMode('delete');
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

        act(() => {
            result.current.processTranslations(mockRadicals);
        });

        expect(result.current.isProcessing).toBe(true);
    });

    it('should handle processing without DeepL token for translation mode', async () => {
        const { result, unmount } = renderHook(() => useRadicalsManager());

        // Set API token but no DeepL token
        act(() => {
            result.current.handleApiTokenChange('test-api-token');
        });

        // Set smart-merge mode (needs DeepL token)
        act(() => {
            result.current.setSynonymMode('smart-merge');
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
