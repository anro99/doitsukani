import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVocabularyManager } from '../../hooks/useVocabularyManager';
import * as wanikaniLib from '../../lib/wanikani';
import * as storageLib from '../../lib/storage';

// Mock external dependencies
vi.mock('../../lib/wanikani');
vi.mock('../../lib/storage');

const mockedWanikani = vi.mocked(wanikaniLib);
const mockedStorage = vi.mocked(storageLib);

describe('VocabularyManager Hook Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup storage mocks - no tokens by default
        mockedStorage.loadWanikaniToken.mockReturnValue('');
        mockedStorage.loadDeepLToken.mockReturnValue('');
        mockedStorage.saveWanikaniToken.mockImplementation(() => { });
        mockedStorage.saveDeepLToken.mockImplementation(() => { });
        mockedStorage.removeToken.mockImplementation(() => { });

        // Setup API mocks with empty responses by default
        mockedWanikani.getVocabularyCount.mockResolvedValue(0);
        mockedWanikani.getVocabularyPreview.mockResolvedValue([]);
        mockedWanikani.getVocabularyStudyMaterials.mockResolvedValue([]);
    });

    describe('Hook Initialization', () => {
        it('should initialize with correct default state', () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Check initial state
            expect(result.current.selectedLevel).toBe(1);
            expect(result.current.synonymMode).toBe('smart-merge');
            expect(result.current.apiToken).toBe('');
            expect(result.current.deeplToken).toBe('');
            expect(result.current.filteredVocabulary).toEqual([]);
            expect(result.current.vocabularyCount).toBe(0);
            expect(result.current.isLoadingVocabulary).toBe(false);
            expect(result.current.apiError).toBe('');
            expect(result.current.isProcessing).toBe(false);
        });

        it('should load saved tokens from storage', () => {
            // Mock saved tokens
            mockedStorage.loadWanikaniToken.mockReturnValue('saved-wk-token');
            mockedStorage.loadDeepLToken.mockReturnValue('saved-deepl-token');

            const { result } = renderHook(() => useVocabularyManager());

            expect(result.current.apiToken).toBe('saved-wk-token');
            expect(result.current.deeplToken).toBe('saved-deepl-token');
        });
    });

    describe('Token Management', () => {
        it('should handle API token changes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleApiTokenChange('new-api-token');
            });

            expect(result.current.apiToken).toBe('new-api-token');
            expect(mockedStorage.saveWanikaniToken).toHaveBeenCalledWith('new-api-token');
        });

        it('should handle DeepL token changes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleDeepLTokenChange('new-deepl-token');
            });

            expect(result.current.deeplToken).toBe('new-deepl-token');
            expect(mockedStorage.saveDeepLToken).toHaveBeenCalledWith('new-deepl-token');
        });

        it('should remove token when setting empty string', () => {
            const { result } = renderHook(() => useVocabularyManager());

            // First set a token
            act(() => {
                result.current.handleApiTokenChange('some-token');
            });

            // Then clear it
            act(() => {
                result.current.handleApiTokenChange('');
            });

            expect(result.current.apiToken).toBe('');
            expect(mockedStorage.removeToken).toHaveBeenCalled();
        });
    });

    describe('Level Management', () => {
        it('should handle level changes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.setSelectedLevel(5);
            });

            expect(result.current.selectedLevel).toBe(5);
        });

        it('should handle "all" level selection', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.setSelectedLevel('all');
            });

            expect(result.current.selectedLevel).toBe('all');
        });
    });

    describe('Synonym Mode Management', () => {
        it('should handle synonym mode changes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.setSynonymMode('replace');
            });

            expect(result.current.synonymMode).toBe('replace');
        });

        it('should support all synonym modes', () => {
            const { result } = renderHook(() => useVocabularyManager());

            const modes = ['replace', 'smart-merge', 'delete'] as const;

            modes.forEach(mode => {
                act(() => {
                    result.current.setSynonymMode(mode);
                });
                expect(result.current.synonymMode).toBe(mode);
            });
        });
    });

    describe('Data Loading Integration', () => {
        it('should trigger API call when token is set', async () => {
            // Mock successful API responses
            mockedWanikani.getVocabularyCount.mockResolvedValue(50);
            mockedWanikani.getVocabularyPreview.mockResolvedValue([]);

            const { result } = renderHook(() => useVocabularyManager());

            // Set token to trigger loading
            act(() => {
                result.current.handleApiTokenChange('valid-token');
            });

            // Wait for async operations to complete
            await vi.waitFor(() => {
                expect(mockedWanikani.getVocabularyCount).toHaveBeenCalledWith('valid-token', 1);
                expect(mockedWanikani.getVocabularyPreview).toHaveBeenCalled();
            });
        });

        it('should handle API errors gracefully', async () => {
            // Mock API error
            mockedWanikani.getVocabularyCount.mockRejectedValue(new Error('API Error'));
            mockedWanikani.getVocabularyPreview.mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleApiTokenChange('invalid-token');
            });

            await vi.waitFor(() => {
                expect(result.current.apiError).toContain('Fehler beim Laden');
            });
        });

        it('should load vocabulary for different levels', async () => {
            mockedWanikani.getVocabularyCount.mockResolvedValue(25);

            const { result } = renderHook(() => useVocabularyManager());

            // Set token first
            act(() => {
                result.current.handleApiTokenChange('valid-token');
            });

            // Change level
            act(() => {
                result.current.setSelectedLevel(3);
            });

            await vi.waitFor(() => {
                expect(mockedWanikani.getVocabularyCount).toHaveBeenCalledWith('valid-token', 3);
            });
        });
    });

    describe('Processing State Management', () => {
        it('should have correct initial processing state', () => {
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

        it('should handle processing actions', () => {
            const { result } = renderHook(() => useVocabularyManager());

            // These are placeholder functions, should not throw
            expect(() => {
                result.current.processTranslations();
            }).not.toThrow();

            expect(() => {
                result.current.stopProcessing();
            }).not.toThrow();
        });
    });

    describe('Manual Loading Actions', () => {
        it('should handle manual vocabulary loading', async () => {
            mockedWanikani.getVocabularyPreview.mockResolvedValue([]);

            const { result } = renderHook(() => useVocabularyManager());

            // Set token first
            act(() => {
                result.current.handleApiTokenChange('valid-token');
            });

            // Manually trigger loading
            await act(async () => {
                await result.current.loadVocabularyFromAPI();
            });

            expect(mockedWanikani.getVocabularyPreview).toHaveBeenCalled();
        });

        it('should handle loading more vocabulary', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set token first
            act(() => {
                result.current.handleApiTokenChange('valid-token');
            });

            // Load more vocabulary
            await act(async () => {
                await result.current.loadMorePreviewVocabulary();
            });

            // Should increase displayed count
            expect(result.current.displayedPreviewCount).toBeGreaterThan(12);
        });
    });

    describe('Error Recovery', () => {
        it('should clear errors when retrying with valid token', async () => {
            // Start with error
            mockedWanikani.getVocabularyPreview.mockRejectedValueOnce(new Error('First error'));

            const { result } = renderHook(() => useVocabularyManager());

            act(() => {
                result.current.handleApiTokenChange('bad-token');
            });

            await vi.waitFor(() => {
                expect(result.current.apiError).toBeTruthy();
            });

            // Fix the mock and retry
            mockedWanikani.getVocabularyPreview.mockResolvedValue([]);
            mockedWanikani.getVocabularyCount.mockResolvedValue(10);

            act(() => {
                result.current.handleApiTokenChange('good-token');
            });

            await vi.waitFor(() => {
                expect(result.current.apiError).toBe('');
            });
        });
    });

    describe('Data Filtering Integration', () => {
        it('should filter vocabulary by selected level', async () => {
            // Mock vocabulary data with different levels
            const mockVocabulary = [
                {
                    id: 1,
                    object: 'vocabulary' as const,
                    data: {
                        characters: '一',
                        meanings: [{ meaning: 'one', primary: true, accepted_answer: true }],
                        readings: [{ reading: 'いち', primary: true, accepted_answer: true }],
                        level: 1,
                        meaning_mnemonic: 'One finger',
                        component_subject_ids: [],
                        context_sentences: [],
                        parts_of_speech: ['numeral'],
                        pronunciation_audios: [],
                        reading_mnemonic: 'One reading',
                        lesson_position: 1
                    }
                },
                {
                    id: 2,
                    object: 'vocabulary' as const,
                    data: {
                        characters: '二',
                        meanings: [{ meaning: 'two', primary: true, accepted_answer: true }],
                        readings: [{ reading: 'に', primary: true, accepted_answer: true }],
                        level: 2,
                        meaning_mnemonic: 'Two fingers',
                        component_subject_ids: [],
                        context_sentences: [],
                        parts_of_speech: ['numeral'],
                        pronunciation_audios: [],
                        reading_mnemonic: 'Two reading',
                        lesson_position: 1
                    }
                }
            ];

            mockedWanikani.getVocabularyPreview.mockResolvedValue(mockVocabulary);
            mockedWanikani.getVocabularyStudyMaterials.mockResolvedValue([]);

            const { result } = renderHook(() => useVocabularyManager());

            // Set token and level 1
            act(() => {
                result.current.handleApiTokenChange('valid-token');
                result.current.setSelectedLevel(1);
            });

            await vi.waitFor(() => {
                expect(result.current.filteredVocabulary).toHaveLength(1);
                expect(result.current.filteredVocabulary[0].characters).toBe('一');
            });

            // Change to level 2
            act(() => {
                result.current.setSelectedLevel(2);
            });

            await vi.waitFor(() => {
                expect(result.current.filteredVocabulary).toHaveLength(1);
                expect(result.current.filteredVocabulary[0].characters).toBe('二');
            });
        });
    });
});
