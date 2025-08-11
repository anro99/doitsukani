import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRadicalsManager } from '../../hooks/useRadicalsManager';
import * as wanikaniModule from '../../lib/wanikani';
import * as deeplModule from '../../lib/deepl';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock Bottleneck
vi.mock('bottleneck', () => {
    const MockBottleneck = vi.fn().mockImplementation(() => ({
        schedule: vi.fn((fn) => fn()),
    }));
    return {
        default: MockBottleneck,
    };
});

// Mock API modules
vi.mock('../../lib/wanikani', () => ({
    getRadicals: vi.fn(),
    getRadicalStudyMaterials: vi.fn(),
    createRadicalSynonyms: vi.fn(),
    updateRadicalSynonyms: vi.fn(),
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn(),
}));

vi.mock('../../lib/contextual-translation', () => ({
    extractContextFromMnemonic: vi.fn().mockReturnValue('test context'),
}));

describe('useRadicalsManager Hook', () => {
    const mockRadicals: any[] = [
        {
            id: 1,
            object: 'radical',
            url: 'https://api.wanikani.com/v2/subjects/1',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                level: 1,
                meanings: [{ meaning: 'Ground', primary: true, accepted_answer: true }],
                characters: '一',
                meaning_mnemonic: 'Test mnemonic',
                character_images: []
            }
        },
        {
            id: 2,
            object: 'radical',
            url: 'https://api.wanikani.com/v2/subjects/2',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                level: 2,
                meanings: [{ meaning: 'Heaven', primary: true, accepted_answer: true }],
                characters: null,
                meaning_mnemonic: 'Test mnemonic 2',
                character_images: []
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
                subject_type: 'radical',
                meaning_note: null,
                reading_note: null,
                meaning_synonyms: ['earth', 'floor'],
                hidden: false,
                created_at: '2023-01-01T00:00:00.000000Z'
            }
        }
    ];

    const mockStudyMaterialResponse: any = {
        id: 101,
        object: 'study_material',
        url: 'https://api.wanikani.com/v2/study_materials/101',
        data_updated_at: '2023-01-01T00:00:00.000000Z',
        data: {
            subject_id: 1,
            subject_type: 'radical',
            meaning_note: null,
            reading_note: null,
            meaning_synonyms: ['updated'],
            hidden: false,
            created_at: '2023-01-01T00:00:00.000000Z'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue('');
        vi.mocked(wanikaniModule.getRadicals).mockResolvedValue(mockRadicals);
        vi.mocked(wanikaniModule.getRadicalStudyMaterials).mockResolvedValue(mockStudyMaterials);
        vi.mocked(wanikaniModule.createRadicalSynonyms).mockResolvedValue(mockStudyMaterialResponse);
        vi.mocked(wanikaniModule.updateRadicalSynonyms).mockResolvedValue(mockStudyMaterialResponse);
        vi.mocked(deeplModule.translateText).mockResolvedValue('übersetzt');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with empty state', () => {
            const { result } = renderHook(() => useRadicalsManager());

            expect(result.current.apiToken).toBe('');
            expect(result.current.deeplToken).toBe('');
            expect(result.current.selectedLevel).toBe(1);
            expect(result.current.synonymMode).toBe('smart-merge');
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.progress).toBe(0);
            expect(result.current.wkRadicals).toEqual([]);
            expect(result.current.studyMaterials).toEqual([]);
            expect(result.current.isLoadingRadicals).toBe(false);
            expect(result.current.apiError).toBe('');
        });

        it('should initialize tokens from localStorage', () => {
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === 'wanikani-api-token') return 'saved-wk-token';
                if (key === 'deepl-api-token') return 'saved-deepl-token';
                return null;
            });

            const { result } = renderHook(() => useRadicalsManager());

            expect(result.current.apiToken).toBe('saved-wk-token');
            expect(result.current.deeplToken).toBe('saved-deepl-token');
        });
    });

    describe('Token Management', () => {
        it('should update API token and persist to localStorage', () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('new-api-token');
            });

            expect(result.current.apiToken).toBe('new-api-token');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('wanikani-api-token', 'new-api-token');
        });

        it('should remove token from localStorage when empty', () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('  '); // whitespace only
            });

            expect(result.current.apiToken).toBe('  ');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('wanikani-api-token');
        });

        it('should update DeepL token and persist to localStorage', () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleDeeplTokenChange('new-deepl-token');
            });

            expect(result.current.deeplToken).toBe('new-deepl-token');
            expect(localStorageMock.setItem).toHaveBeenCalledWith('deepl-api-token', 'new-deepl-token');
        });
    });

    describe('API Integration', () => {
        it('should load radicals from API successfully', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            // Set API token first
            act(() => {
                result.current.handleApiTokenChange('test-token');
            });

            await waitFor(() => {
                expect(result.current.wkRadicals).toEqual(mockRadicals);
                expect(result.current.studyMaterials).toEqual(mockStudyMaterials);
                expect(result.current.isLoadingRadicals).toBe(false);
                expect(result.current.apiError).toBe('');
            });

            expect(wanikaniModule.getRadicals).toHaveBeenCalledWith('test-token');
            expect(wanikaniModule.getRadicalStudyMaterials).toHaveBeenCalled();
        });

        it('should handle API errors gracefully', async () => {
            vi.mocked(wanikaniModule.getRadicals).mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('test-token');
            });

            await waitFor(() => {
                expect(result.current.apiError).toContain('Fehler beim Laden der Radicals');
                expect(result.current.isLoadingRadicals).toBe(false);
            });
        });

        it('should refresh study materials', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            // Set initial state
            act(() => {
                result.current.handleApiTokenChange('test-token');
            });

            await waitFor(() => {
                expect(result.current.wkRadicals).toEqual(mockRadicals);
            });

            // Clear mock calls from initial load
            vi.clearAllMocks();
            const updatedStudyMaterialsMock: any[] = [
                {
                    id: 101,
                    object: 'study_material',
                    url: 'https://api.wanikani.com/v2/study_materials/101',
                    data_updated_at: '2023-01-01T00:00:00.000000Z',
                    data: {
                        subject_id: 1,
                        subject_type: 'radical',
                        meaning_note: null,
                        reading_note: null,
                        meaning_synonyms: ['updated'],
                        hidden: false,
                        created_at: '2023-01-01T00:00:00.000000Z'
                    }
                }
            ];
            vi.mocked(wanikaniModule.getRadicalStudyMaterials).mockResolvedValue(updatedStudyMaterialsMock);

            await act(async () => {
                await result.current.refreshStudyMaterials();
            });

            expect(wanikaniModule.getRadicalStudyMaterials).toHaveBeenCalledWith(
                'test-token',
                undefined,
                { subject_ids: '1,2' }
            );
        });
    });

    describe('Data Conversion', () => {
        it('should convert WaniKani radicals to internal format', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('test-token');
            });

            await waitFor(() => {
                expect(result.current.filteredRadicals).toEqual([
                    {
                        id: 1,
                        meaning: 'Ground',
                        characters: '一',
                        level: 1,
                        currentSynonyms: ['earth', 'floor'],
                        selected: true,
                        translatedSynonyms: [],
                        meaningMnemonic: 'Test mnemonic'
                    }
                ]);
            });
        });

        it('should handle radicals without characters', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('test-token');
                result.current.setSelectedLevel('all');
            });

            await waitFor(() => {
                const radical2 = result.current.filteredRadicals.find(r => r.id === 2);
                expect(radical2).toEqual({
                    id: 2,
                    meaning: 'Heaven',
                    characters: undefined,
                    level: 2,
                    currentSynonyms: [],
                    selected: true,
                    translatedSynonyms: [],
                    meaningMnemonic: 'Test mnemonic 2'
                });
            });
        });
    });

    describe('Level Filtering', () => {
        it('should filter radicals by selected level', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('test-token');
                result.current.setSelectedLevel(1);
            });

            await waitFor(() => {
                expect(result.current.filteredRadicals).toHaveLength(1);
                expect(result.current.filteredRadicals[0].level).toBe(1);
            });
        });

        it('should show all radicals when level is "all"', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('test-token');
                result.current.setSelectedLevel('all');
            });

            await waitFor(() => {
                expect(result.current.filteredRadicals).toHaveLength(2);
            });
        });
    });

    describe('Upload Statistics', () => {
        it('should initialize upload stats correctly', () => {
            const { result } = renderHook(() => useRadicalsManager());

            expect(result.current.uploadStats).toEqual({
                created: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
                successful: 0
            });
        });

        it('should update upload stats', () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.setUploadStats({
                    created: 5,
                    updated: 3,
                    failed: 1,
                    skipped: 2,
                    successful: 8
                });
            });

            expect(result.current.uploadStats).toEqual({
                created: 5,
                updated: 3,
                failed: 1,
                skipped: 2,
                successful: 8
            });
        });
    });

    describe('Processing State', () => {
        it('should manage processing state', () => {
            const { result } = renderHook(() => useRadicalsManager());

            expect(result.current.isProcessing).toBe(false);
            expect(result.current.progress).toBe(0);
            expect(result.current.translationStatus).toBe('');
            expect(result.current.uploadStatus).toBe('');

            act(() => {
                result.current.setIsProcessing(true);
                result.current.setProgress(50);
                result.current.setTranslationStatus('Processing...');
                result.current.setUploadStatus('Uploading...');
            });

            expect(result.current.isProcessing).toBe(true);
            expect(result.current.progress).toBe(50);
            expect(result.current.translationStatus).toBe('Processing...');
            expect(result.current.uploadStatus).toBe('Uploading...');
        });

        it('should manage synonym mode', () => {
            const { result } = renderHook(() => useRadicalsManager());

            expect(result.current.synonymMode).toBe('smart-merge');

            act(() => {
                result.current.setSynonymMode('replace');
            });

            expect(result.current.synonymMode).toBe('replace');

            act(() => {
                result.current.setSynonymMode('delete');
            });

            expect(result.current.synonymMode).toBe('delete');
        });
    });

    describe('Error Handling', () => {
        it('should not load radicals without API token', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            // Don't set API token
            await waitFor(() => {
                expect(result.current.wkRadicals).toEqual([]);
                expect(wanikaniModule.getRadicals).not.toHaveBeenCalled();
            });
        });

        it('should handle empty token gracefully', () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.handleApiTokenChange('');
            });

            expect(result.current.apiToken).toBe('');
            expect(localStorageMock.removeItem).toHaveBeenCalledWith('wanikani-api-token');
        });
    });
});
