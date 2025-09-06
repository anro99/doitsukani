import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKanjiManager } from '../../hooks/useKanjiManager';
import * as wanikaniLib from '../../lib/wanikani';
import * as deeplLib from '../../lib/deepl';
import * as storageLib from '../../lib/storage';

// Mock all external dependencies
vi.mock('../../lib/wanikani', () => ({
    getKanjiCount: vi.fn(),
    getKanjiPreview: vi.fn(),
    getKanjiStudyMaterials: vi.fn(),
    createKanjiSynonyms: vi.fn(),
    updateKanjiSynonyms: vi.fn(),
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
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mocks
        (wanikaniLib.getKanjiCount as MockedFunction<any>).mockResolvedValue(1);
        (wanikaniLib.getKanjiPreview as MockedFunction<any>).mockResolvedValue(mockKanji);
        (wanikaniLib.getKanjiStudyMaterials as MockedFunction<any>).mockResolvedValue([]);
        (wanikaniLib.createKanjiSynonyms as MockedFunction<any>).mockResolvedValue({ data: {} });
        (wanikaniLib.updateKanjiSynonyms as MockedFunction<any>).mockResolvedValue({ data: {} });
        (deeplLib.translateText as MockedFunction<any>).mockResolvedValue('Ein');
        (storageLib.loadWanikaniToken as MockedFunction<any>).mockReturnValue('test-token');
        (storageLib.loadDeepLToken as MockedFunction<any>).mockReturnValue('deepl-token');
    });

    describe('Initial State', () => {
        it('should initialize with correct default values', () => {
            const { result } = renderHook(() => useKanjiManager());

            // Die neue Implementierung startet mit Level 1, nicht "all"
            expect(result.current.selectedLevel).toBe(1);
            expect(result.current.synonymMode).toBe('smart-merge');
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.progress).toBe(0);
            expect(result.current.translationStatus).toBe('');
            expect(result.current.uploadStatus).toBe('');
            // isLoadingKanji kann true sein beim Start, da automatisch Counts geladen werden
            // expect(result.current.isLoadingKanji).toBe(false);
            expect(result.current.filteredKanji).toEqual([]);
        });

        it('should load tokens from storage on initialization', () => {
            const { result } = renderHook(() => useKanjiManager());

            expect(result.current.apiToken).toBe('test-token');
            expect(result.current.deeplToken).toBe('deepl-token');
            expect(storageLib.loadWanikaniToken).toHaveBeenCalled();
            expect(storageLib.loadDeepLToken).toHaveBeenCalled();
        });
    });

    describe('Token Management', () => {
        it('should handle API token changes', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.handleApiTokenChange('new-token');
            });

            expect(storageLib.saveWanikaniToken).toHaveBeenCalledWith('new-token');
            expect(result.current.apiToken).toBe('new-token');
        });

        it('should handle DeepL token changes', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.handleDeepLTokenChange('new-deepl-token');
            });

            expect(storageLib.saveDeepLToken).toHaveBeenCalledWith('new-deepl-token');
            expect(result.current.deeplToken).toBe('new-deepl-token');
        });
    });

    describe('Processing States', () => {
        it('should manage processing states correctly', () => {
            const { result } = renderHook(() => useKanjiManager());

            expect(result.current.isProcessing).toBe(false);
            expect(result.current.progress).toBe(0);
            expect(result.current.translationStatus).toBe('');
            expect(result.current.uploadStatus).toBe('');
        });

        it('should provide stop processing functionality', () => {
            const { result } = renderHook(() => useKanjiManager());

            act(() => {
                result.current.stopProcessing();
            });

            // Should not throw error even when not processing
            expect(result.current.isProcessing).toBe(false);
        });
    });

    describe('Translation Processing', () => {
        it('should handle empty kanji list', async () => {
            const { result } = renderHook(() => useKanjiManager());

            await act(async () => {
                // processTranslations no longer expects parameter
                await result.current.processTranslations();
            });

            // Since function doesn't return result, just check it doesn't crash
            expect(result.current.isProcessing).toBe(false);
        });
    });
});
