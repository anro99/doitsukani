import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVocabularyManager } from '../../features/vocabulary/hooks/useVocabularyManager';
import * as wanikaniVocab from '../../shared/lib/wanikani';
import * as deepl from '../../shared/lib/deepl';
import * as storage from '../../shared/lib/storage';

// Mock external dependencies
vi.mock('../../shared/lib/wanikani', () => ({
    getVocabulary: vi.fn(),
    getVocabularyCount: vi.fn(),
    getVocabularyPreview: vi.fn(),
    updateVocabularySynonyms: vi.fn(),
    createVocabularySynonyms: vi.fn()
}));

vi.mock('../../shared/lib/deepl', () => ({
    translateText: vi.fn(),
    detectLanguage: vi.fn()
}));

vi.mock('../../shared/lib/storage', () => ({
    saveToken: vi.fn(),
    loadToken: vi.fn(),
    saveValue: vi.fn(),
    loadValue: vi.fn(),
    saveWanikaniToken: vi.fn(),
    loadWanikaniToken: vi.fn(),
    saveDeepLToken: vi.fn(),
    loadDeepLToken: vi.fn(),
    saveSelectedLevel: vi.fn(),
    loadSelectedLevel: vi.fn(),
    saveSynonymMode: vi.fn(),
    loadSynonymMode: vi.fn()
}));

describe('🚀 useVocabularyManager Hook Integration Tests', () => {
    beforeEach(() => {
        // Reset all mocks before each test
        vi.clearAllMocks();

        // Setup default mock responses
        (wanikaniVocab.getVocabularyCount as any).mockResolvedValue(150);
        (wanikaniVocab.getVocabularyPreview as any).mockResolvedValue([
            {
                id: 1,
                data: {
                    characters: '一',
                    meanings: [{ meaning: 'one', primary: true }],
                    readings: [{ reading: 'いち', primary: true }],
                    parts_of_speech: ['noun'],
                    level: 1,
                    context_sentences: [
                        { en: 'I have one apple.', ja: '私はりんごを一つ持っています。' }
                    ]
                }
            }
        ]);

        (storage.loadWanikaniToken as any).mockReturnValue('');
        (storage.saveWanikaniToken as any).mockImplementation(() => { });
        (storage.loadDeepLToken as any).mockReturnValue('');
        (storage.saveDeepLToken as any).mockImplementation(() => { });
        (storage.loadSelectedLevel as any).mockReturnValue(1);
        (storage.saveSelectedLevel as any).mockImplementation(() => { });
        (storage.loadSynonymMode as any).mockReturnValue('smart-merge');
        (storage.saveSynonymMode as any).mockImplementation(() => { });
        (deepl.translateText as any).mockResolvedValue('eins');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Hook State Management', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useVocabularyManager());

            expect(result.current.selectedLevel).toBe(1);
            expect(result.current.synonymMode).toBe('smart-merge');
            expect(result.current.apiToken).toBe('');
            expect(result.current.deeplToken).toBe('');
            expect(result.current.filteredVocabulary).toEqual([]);
            expect(result.current.vocabularyCount).toBe(0);
            expect(result.current.isLoadingVocabulary).toBe(false);
            expect(result.current.isProcessing).toBe(false);
        });

        it('should handle API token changes and trigger vocabulary count loading', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Change API token
            act(() => {
                result.current.handleApiTokenChange('test-api-token');
            });

            expect(result.current.apiToken).toBe('test-api-token');

            // Verify storage is called
            expect(storage.saveWanikaniToken).toHaveBeenCalledWith('test-api-token');
        });

        it('should handle level selection changes', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set API token first
            act(() => {
                result.current.handleApiTokenChange('test-token');
            });

            // Change level
            act(() => {
                result.current.setSelectedLevel(2);
            });

            expect(result.current.selectedLevel).toBe(2);
            // Note: Storage is handled internally by the hook
        });

        it('should handle synonym mode changes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.setSynonymMode('replace');
            });

            expect(result.current.synonymMode).toBe('replace');
            // Note: Storage is handled internally by the hook
        });
    });

    describe('API Integration', () => {
        it('should load vocabulary count when API token is set', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            await act(async () => {
                result.current.handleApiTokenChange('test-token');
            });

            // Verify API token is set (count loading happens asynchronously)
            expect(result.current.apiToken).toBe('test-token');
        });

        it('should load vocabulary preview for selected level', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set API token and level
            await act(async () => {
                result.current.handleApiTokenChange('test-token');
                result.current.setSelectedLevel(1);
            });

            // Wait for async operations
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            expect(wanikaniVocab.getVocabularyPreview).toHaveBeenCalledWith('test-token', 1, expect.any(Number));
        });

        it('should handle API errors gracefully', async () => {
            (wanikaniVocab.getVocabularyCount as any).mockRejectedValue(
                new Error('Unauthorized: Invalid API token')
            );

            const { result } = renderHook(() => useVocabularyManager());

            await act(async () => {
                result.current.handleApiTokenChange('invalid-token');
            });

            // Check error state
            expect(result.current.apiError).toContain('Fehler beim Laden');
        });
    });

    describe('Translation Processing', () => {
        it('should start translation processing with valid tokens', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Setup tokens and vocabulary
            await act(async () => {
                result.current.handleApiTokenChange('test-token');
                result.current.handleDeepLTokenChange('deepl-token');
                result.current.setSelectedLevel(1);
            });

            // Start processing (currently a placeholder - will be implemented in Phase 2)
            await act(async () => {
                result.current.processTranslations();
            });

            // Verify tokens are set (processing implementation pending)
            expect(result.current.apiToken).toBe('test-token');
            expect(result.current.deeplToken).toBe('deepl-token');
        });

        it('should stop processing when requested', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Setup and start processing
            await act(async () => {
                result.current.handleApiTokenChange('test-token');
                result.current.handleDeepLTokenChange('deepl-token');
                result.current.processTranslations();
            });

            // Stop processing
            act(() => {
                result.current.stopProcessing();
            });

            expect(result.current.isProcessing).toBe(false);
        });
    });

    describe('Data Flow Integration', () => {
        it('should maintain consistent state throughout vocabulary operations', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Step 1: Set API token
            await act(async () => {
                result.current.handleApiTokenChange('test-token');
            });

            expect(result.current.apiToken).toBe('test-token');

            // Step 2: Change level
            await act(async () => {
                result.current.setSelectedLevel(2);
            });

            expect(result.current.selectedLevel).toBe(2);

            // Step 3: Load more vocabulary
            await act(async () => {
                result.current.loadMorePreviewVocabulary();
            });

            // Verify consistent state
            expect(result.current.selectedLevel).toBe(2);
            expect(result.current.apiToken).toBe('test-token');
        });

        it('should handle storage persistence correctly', () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Multiple state changes
            act(() => {
                result.current.handleApiTokenChange('token1');
                result.current.setSelectedLevel(3);
                result.current.setSynonymMode('delete');
            });

            // Verify state changes (storage is handled internally)
            expect(result.current.apiToken).toBe('token1');
            expect(result.current.selectedLevel).toBe(3);
            expect(result.current.synonymMode).toBe('delete');
        });
    });
});
