import { describe, it, expect, vi, beforeEach } from 'vitest';
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

    it('should handle stop processing with console logging', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        const { result } = renderHook(() => useRadicalsManager());

        act(() => {
            result.current.stopProcessing();
        });

        expect(consoleSpy).toHaveBeenCalledWith('🛑 STOP: User clicked stop button');
        expect(consoleSpy).toHaveBeenCalledWith('🛑 STOP: All flags set');

        consoleSpy.mockRestore();
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
        const { result } = renderHook(() => useRadicalsManager());

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

        act(() => {
            result.current.processTranslations(mockRadicals);
        });

        expect(result.current.translationStatus).toContain('DeepL Token fehlt');
        expect(result.current.isProcessing).toBe(false);
    });
});
