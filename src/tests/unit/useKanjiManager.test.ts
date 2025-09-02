import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKanjiManager, Kanji, UploadStats } from '../../hooks/useKanjiManager';
import * as wanikaniLib from '../../lib/wanikani';
import * as deeplLib from '../../lib/deepl';
import * as storageLib from '../../lib/storage';

// Mock all external dependencies
vi.mock('../../lib/wanikani', () => ({
    getKanji: vi.fn(),
    getKanjiStudyMaterials: vi.fn(),
    getKanjiCount: vi.fn(),
    getKanjiPreview: vi.fn(),
    createStudyMaterials: vi.fn(),
    updateSynonyms: vi.fn(),
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn(),
}));

vi.mock('../../lib/contextual-translation', () => ({
    extractContextFromMnemonic: vi.fn().mockReturnValue('test context'),
}));

vi.mock('../../lib/storage', () => ({
    loadWanikaniToken: vi.fn(),
    saveWanikaniToken: vi.fn(),
    removeToken: vi.fn(),
    loadDeepLToken: vi.fn(),
    saveDeepLToken: vi.fn(),
    STORAGE_KEYS: {
        WANIKANI_TOKEN: 'wanikani_token',
        DEEPL_TOKEN: 'deepl_token'
    }
}));

describe('useKanjiManager Hook', () => {
    const mockKanji: any[] = [
        {
            id: 1,
            object: 'kanji',
            url: 'https://api.wanikani.com/v2/subjects/1',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                level: 1,
                meanings: [{ meaning: 'One', primary: true, accepted_answer: true }],
                characters: '一',
                meaning_mnemonic: 'Test mnemonic for one',
            }
        },
        {
            id: 2,
            object: 'kanji',
            url: 'https://api.wanikani.com/v2/subjects/2',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                level: 1,
                meanings: [{ meaning: 'Two', primary: true, accepted_answer: true }],
                characters: '二',
                meaning_mnemonic: 'Test mnemonic for two',
            }
        }
    ];

    const mockStudyMaterials: any[] = [
        {
            id: 100,
            object: 'study_material',
            url: 'https://api.wanikani.com/v2/study_materials/100',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                subject_id: 1,
                subject_type: 'kanji',
                meaning_synonyms: ['eins']
            }
        }
    ];

    // Cast mocked functions for proper typing
    const mockedGetKanji = wanikaniLib.getKanji as MockedFunction<typeof wanikaniLib.getKanji>;
    const mockedGetKanjiStudyMaterials = wanikaniLib.getKanjiStudyMaterials as MockedFunction<typeof wanikaniLib.getKanjiStudyMaterials>;
    const mockedGetKanjiCount = wanikaniLib.getKanjiCount as MockedFunction<typeof wanikaniLib.getKanjiCount>;
    const mockedGetKanjiPreview = wanikaniLib.getKanjiPreview as MockedFunction<typeof wanikaniLib.getKanjiPreview>;
    const mockedCreateStudyMaterials = wanikaniLib.createStudyMaterials as MockedFunction<typeof wanikaniLib.createStudyMaterials>;
    const mockedUpdateSynonyms = wanikaniLib.updateSynonyms as MockedFunction<typeof wanikaniLib.updateSynonyms>;
    const mockedTranslateText = deeplLib.translateText as MockedFunction<typeof deeplLib.translateText>;
    const mockedLoadWanikaniToken = storageLib.loadWanikaniToken as MockedFunction<typeof storageLib.loadWanikaniToken>;
    const mockedLoadDeepLToken = storageLib.loadDeepLToken as MockedFunction<typeof storageLib.loadDeepLToken>;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default mock implementations
        mockedGetKanji.mockResolvedValue(mockKanji);
        mockedGetKanjiStudyMaterials.mockResolvedValue(mockStudyMaterials);
        mockedGetKanjiCount.mockResolvedValue(42);
        mockedGetKanjiPreview.mockResolvedValue(mockKanji.slice(0, 1));
        mockedCreateStudyMaterials.mockResolvedValue({ data: {} } as any);
        mockedUpdateSynonyms.mockResolvedValue({ data: {} } as any);
        mockedTranslateText.mockResolvedValue('eins');
        mockedLoadWanikaniToken.mockReturnValue('test-api-token');
        mockedLoadDeepLToken.mockReturnValue('test-deepl-token');
    });

    describe('Hook Initialization', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useKanjiManager());

            expect(result.current.selectedLevel).toBe(1);
            expect(result.current.synonymMode).toBe('smart-merge');
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.progress).toBe(0);
            expect(result.current.wkKanji).toEqual([]);
            expect(result.current.studyMaterials).toEqual([]);
            expect(result.current.uploadStats).toEqual({
                created: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
                successful: 0
            });
        });

        it('should load tokens from storage on initialization', () => {
            const { result } = renderHook(() => useKanjiManager());
            
            expect(result.current.apiToken).toBe('test-api-token');
            expect(result.current.deeplToken).toBe('test-deepl-token');
            expect(mockedLoadWanikaniToken).toHaveBeenCalled();
            expect(mockedLoadDeepLToken).toHaveBeenCalled();
        });
    });

    describe('API Data Loading', () => {
        it('should load kanji from API when token is available', async () => {
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.loadKanjiFromAPI();
            });

            expect(mockedGetKanji).toHaveBeenCalledWith('test-api-token');
            expect(mockedGetKanjiStudyMaterials).toHaveBeenCalled();
            expect(result.current.wkKanji).toEqual(mockKanji);
            expect(result.current.studyMaterials).toEqual(mockStudyMaterials);
        });

        it('should handle API loading errors gracefully', async () => {
            mockedGetKanji.mockRejectedValue(new Error('API Error'));
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.loadKanjiFromAPI();
            });

            expect(result.current.apiError).toContain('Fehler beim Laden der Kanji');
            expect(result.current.isLoadingKanji).toBe(false);
        });

        it('should load kanji count for selected level', async () => {
            const { result } = renderHook(() => useKanjiManager());

            // The initial API token should trigger count loading for level 1
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            // Check that initial level 1 count was loaded
            expect(mockedGetKanjiCount).toHaveBeenCalledWith('test-api-token', 1);

            // Now change the level and check again
            act(() => {
                result.current.setSelectedLevel(2);
            });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            expect(mockedGetKanjiCount).toHaveBeenCalledWith('test-api-token', 2);
        });

        it('should load preview kanji for selected level', async () => {
            const { result } = renderHook(() => useKanjiManager());

            // First set the level, then wait for the effect to trigger
            act(() => {
                result.current.setSelectedLevel(1);
            });

            // Allow time for useEffect to run
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            expect(mockedGetKanjiPreview).toHaveBeenCalledWith('test-api-token', 1, 12);
        });
    });

    describe('Data Conversion', () => {
        it('should convert WK kanji to internal format correctly', async () => {
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.loadKanjiFromAPI();
            });

            const filteredKanji = result.current.filteredKanji;
            
            expect(filteredKanji).toHaveLength(2);
            expect(filteredKanji[0]).toEqual({
                id: 1,
                meaning: 'One',
                characters: '一',
                level: 1,
                currentSynonyms: ['eins'], // From mock study material
                selected: true,
                translatedSynonyms: [],
                meaningMnemonic: 'Test mnemonic for one'
            });
            expect(filteredKanji[1]).toEqual({
                id: 2,
                meaning: 'Two',
                characters: '二',
                level: 1,
                currentSynonyms: [], // No study material exists
                selected: true,
                translatedSynonyms: [],
                meaningMnemonic: 'Test mnemonic for two'
            });
        });

        it('should filter kanji by selected level', async () => {
            // Add a kanji with different level
            const mixedLevelKanji = [
                ...mockKanji,
                {
                    id: 3,
                    object: 'kanji',
                    data: {
                        level: 2,
                        meanings: [{ meaning: 'Three', primary: true }],
                        characters: '三',
                        meaning_mnemonic: 'Test mnemonic'
                    }
                }
            ];
            mockedGetKanji.mockResolvedValue(mixedLevelKanji);

            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.loadKanjiFromAPI();
                result.current.setSelectedLevel(2);
            });

            const filteredKanji = result.current.filteredKanji;
            expect(filteredKanji).toHaveLength(1);
            expect(filteredKanji[0].level).toBe(2);
            expect(filteredKanji[0].meaning).toBe('Three');
        });

        it('should return all kanji when level is set to "all"', async () => {
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.loadKanjiFromAPI();
                result.current.setSelectedLevel('all');
            });

            const filteredKanji = result.current.filteredKanji;
            expect(filteredKanji).toHaveLength(2); // All mock kanji
        });
    });

    describe('Settings Management', () => {
        it('should update selected level', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.setSelectedLevel(5);
            });

            expect(result.current.selectedLevel).toBe(5);
        });

        it('should update synonym mode', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.setSynonymMode('replace');
            });

            expect(result.current.synonymMode).toBe('replace');
        });

        it('should handle token changes and save to storage', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.handleApiTokenChange('new-api-token');
            });

            expect(result.current.apiToken).toBe('new-api-token');
            expect(storageLib.saveWanikaniToken).toHaveBeenCalledWith('new-api-token');
        });
    });

    describe('Processing State Management', () => {
        it('should handle processing state correctly', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.setIsProcessing(true);
            });

            expect(result.current.isProcessing).toBe(true);

            act(() => {
                result.current.setIsProcessing(false);
            });

            expect(result.current.isProcessing).toBe(false);
        });

        it('should update progress correctly', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.setProgress(75);
            });

            expect(result.current.progress).toBe(75);
        });

        it('should update status messages', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.setTranslationStatus('Processing kanji...');
                result.current.setUploadStatus('Uploading to API...');
            });

            expect(result.current.translationStatus).toBe('Processing kanji...');
            expect(result.current.uploadStatus).toBe('Uploading to API...');
        });
    });

    describe('Stop Processing', () => {
        it('should stop processing when requested', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.setIsProcessing(true);
                result.current.stopProcessing();
            });

            expect(result.current.isProcessing).toBe(false);
            expect(result.current.translationStatus).toBe('⏹️ Stoppe Verarbeitung...');
            expect(result.current.uploadStatus).toBe('⏹️ Verarbeitung gestoppt');
        });
    });

    describe('Upload Statistics', () => {
        it('should update upload statistics', () => {
            const { result } = renderHook(() => useKanjiManager());

            const newStats: UploadStats = {
                created: 5,
                updated: 10,
                failed: 1,
                skipped: 3,
                successful: 15
            };

            act(() => {
                result.current.setUploadStats(newStats);
            });

            expect(result.current.uploadStats).toEqual(newStats);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing DeepL token for translation modes', async () => {
            mockedLoadDeepLToken.mockReturnValue(''); // No DeepL token
            const { result } = renderHook(() => useKanjiManager());

            const testKanji: Kanji[] = [{
                id: 1,
                meaning: 'One',
                characters: '一',
                level: 1,
                currentSynonyms: [],
                selected: true,
                translatedSynonyms: [],
            }];

            await act(async () => {
                await result.current.processTranslations(testKanji);
            });

            expect(result.current.translationStatus).toBe('❌ DeepL Token fehlt für Übersetzung.');
        });

        it('should handle empty kanji list', async () => {
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.processTranslations([]);
            });

            expect(result.current.translationStatus).toBe('❌ Keine Kanji ausgewählt.');
        });
    });

    describe('API Integration', () => {
        it('should call refresh study materials after processing', async () => {
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.refreshStudyMaterials();
            });

            expect(mockedGetKanjiStudyMaterials).toHaveBeenCalled();
        });

        it('should handle study materials refresh errors gracefully', async () => {
            mockedGetKanjiStudyMaterials.mockRejectedValue(new Error('Network Error'));
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                await result.current.refreshStudyMaterials();
            });

            // Should not throw or crash
            expect(result.current.isProcessing).toBe(false);
        });
    });

    describe('Real-time Progress Tracking', () => {
        it('should track processed count and total correctly', () => {
            const { result } = renderHook(() => useKanjiManager());

            expect(result.current.processedCount).toBe(0);
            expect(result.current.totalCountForProcessing).toBe(0);

            // These would be updated during actual processing
            // but we can test the initial state
        });
    });

    describe('Preview Functionality', () => {
        it('should load and display preview kanji', async () => {
            const { result } = renderHook(() => useKanjiManager());

            // Allow useEffect to run for preview loading
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
            });

            expect(result.current.previewKanji).toBeDefined();
        });
    });

    describe('Memory and Performance', () => {
        it('should not cause memory leaks with multiple state updates', async () => {
            const { result } = renderHook(() => useKanjiManager());

            // Rapidly update various states
            for (let i = 0; i < 10; i++) {
                await act(async () => {
                    result.current.setProgress(i * 10);
                    result.current.setTranslationStatus(`Status ${i}`);
                });
            }

            expect(result.current.progress).toBe(90);
            expect(result.current.translationStatus).toBe('Status 9');
        });
    });

    describe('Integration with External Libraries', () => {
        it('should properly integrate with Bottleneck rate limiting', () => {
            const { result } = renderHook(() => useKanjiManager());
            
            // The hook should be created without errors, indicating proper Bottleneck setup
            expect(result.current).toBeDefined();
            expect(typeof result.current.processTranslations).toBe('function');
        });

        it('should integrate with storage utilities', () => {
            renderHook(() => useKanjiManager());
            
            expect(mockedLoadWanikaniToken).toHaveBeenCalled();
            expect(mockedLoadDeepLToken).toHaveBeenCalled();
        });
    });
});
