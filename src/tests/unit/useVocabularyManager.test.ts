import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVocabularyManager } from '../../hooks/useVocabularyManager';

// Mock the API functions
vi.mock('../../lib/wanikani', () => ({
    getVocabularyCount: vi.fn().mockResolvedValue(100),
    getVocabularyPreview: vi.fn().mockResolvedValue([]),
    getVocabularyStudyMaterials: vi.fn().mockResolvedValue([]),
}));

// Mock storage functions
vi.mock('../../lib/storage', () => ({
    loadWanikaniToken: vi.fn(() => 'mock-wanikani-token'),
    saveWanikaniToken: vi.fn(),
    removeToken: vi.fn(),
    loadDeepLToken: vi.fn(() => 'mock-deepl-token'),
    saveDeepLToken: vi.fn(),
    STORAGE_KEYS: {
        WANIKANI_TOKEN: 'wanikani-token',
        DEEPL_TOKEN: 'deepl-token'
    }
}));

// Mock window object for storage
Object.defineProperty(window, 'TextEncoder', {
    writable: true,
    value: TextEncoder,
});

describe('useVocabularyManager Hook - Phase 1 Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Initialization', () => {
        it('should initialize with default values', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial API calls to complete
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            expect(result.current.selectedLevel).toBe(1);
            expect(result.current.synonymMode).toBe('smart-merge');
            expect(result.current.displayedPreviewCount).toBe(12);
            expect(result.current.apiError).toBe('');
            expect(result.current.filteredVocabulary).toEqual([]);
            expect(result.current.vocabularyCount).toBeGreaterThanOrEqual(0);
        });

        it('should load tokens from storage', () => {
            const { result } = renderHook(() => useVocabularyManager());

            expect(result.current.apiToken).toBe('mock-wanikani-token');
            expect(result.current.deeplToken).toBe('mock-deepl-token');
        });
    });

    describe('Settings Management', () => {
        it('should update selected level', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.setSelectedLevel(5);
            });

            expect(result.current.selectedLevel).toBe(5);
        });

        it('should update synonym mode', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.setSynonymMode('replace');
            });

            expect(result.current.synonymMode).toBe('replace');
        });

        it('should support "all" levels selection', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.setSelectedLevel('all');
            });

            expect(result.current.selectedLevel).toBe('all');
        });
    });

    describe('Token Management', () => {
        it('should handle API token changes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleApiTokenChange('new-token');
            });

            expect(result.current.apiToken).toBe('new-token');
        });

        it('should handle DeepL token changes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleDeepLTokenChange('new-deepl-token');
            });

            expect(result.current.deeplToken).toBe('new-deepl-token');
        });
    });

    describe('Processing State (Phase 1 Placeholders)', () => {
        it('should have placeholder processing states', () => {
            const { result } = renderHook(() => useVocabularyManager());

            expect(result.current.isProcessing).toBe(false);
            expect(result.current.progress).toBe(0);
            expect(result.current.translationStatus).toBe('');
            expect(result.current.uploadStatus).toBe('');
            expect(result.current.uploadStats).toEqual({
                created: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
                successful: 0
            });
        });

        it('should have integrated processing functions', async () => {
            const { result } = renderHook(() => useVocabularyManager());
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { });

            // Processing should now use the integrated system
            await act(async () => {
                await result.current.processTranslations();
            });

            // Should log success message for streaming mode
            expect(consoleSpy).toHaveBeenCalledWith('✅ Streaming processing completed successfully:', expect.any(Object));

            // Stop processing should still work
            act(() => {
                result.current.stopProcessing();
            });

            expect(consoleSpy).toHaveBeenCalledWith('🛑 Stop processing requested');

            consoleSpy.mockRestore();
        });
    });

    describe('Data Structure', () => {
        it('should support vocabulary-specific data structure', () => {
            const { result } = renderHook(() => useVocabularyManager());

            // The vocabulary structure should support readings (unlike kanji)
            // This will be validated once we have actual data
            expect(Array.isArray(result.current.filteredVocabulary)).toBe(true);
        });
    });
});
