/**
 * Combined Translation Service - Unit Tests
 * 
 * Testet polymorphe Translation für Radical, Kanji und Vocabulary Items
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombinedTranslationService } from '../../features/combined/lib/combined-translation';
import type { CombinedRadical, CombinedKanji, CombinedVocabulary } from '../../features/combined/types/combined-types';

// Mock alle Translation Services
vi.mock('../../features/radicals/lib/RadicalTranslationService');
vi.mock('../../features/kanji/lib/KanjiTranslationService');
vi.mock('../../features/vocabulary/lib/VocabularyTranslationService');

describe('Combined Translation Service', () => {
    let service: CombinedTranslationService;
    const mockDeeplToken = 'test-deepl-token';

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CombinedTranslationService({
            deeplToken: mockDeeplToken,
            usePrebuiltTranslations: true,
            synonymMode: 'smart',
        });
    });

    describe('translateItem() - Polymorphic Dispatch', () => {
        it('sollte Radical Items korrekt übersetzen', async () => {
            const mockRadical: CombinedRadical = {
                id: 1,
                type: 'radical',
                characters: '一',
                level: 1,
                primaryMeaning: 'Ground',
                meanings: ['Ground'],
                meaningMnemonic: 'This radical...',
                existingSynonyms: [],
                selected: false,
                translatedSynonyms: [],
            };

            // Mock RadicalTranslationService.translate()
            const { RadicalTranslationService } = await import('../../features/radicals/lib/RadicalTranslationService');
            vi.mocked(RadicalTranslationService.prototype.translate).mockResolvedValue(['Boden']);

            const result = await service.translateItem(mockRadical);

            expect(result.success).toBe(true);
            expect(result.type).toBe('radical');
            expect(result.translations).toEqual(['Boden']);
            expect(result.item).toBe(mockRadical);
        });

        it('sollte Kanji Items korrekt übersetzen', async () => {
            const mockKanji: CombinedKanji = {
                id: 440,
                type: 'kanji',
                characters: '一',
                level: 1,
                primaryMeaning: 'One',
                alternativeMeanings: ['Singular'],
                meanings: ['One', 'Singular'],
                meaningMnemonic: 'This kanji...',
                existingSynonyms: [],
                selected: false,
                translatedSynonyms: [],
            };

            // Mock KanjiTranslationService.translate()
            const { KanjiTranslationService } = await import('../../features/kanji/lib/KanjiTranslationService');
            vi.mocked(KanjiTranslationService.prototype.translate).mockResolvedValue(['Eins', 'Singular']);

            const result = await service.translateItem(mockKanji);

            expect(result.success).toBe(true);
            expect(result.type).toBe('kanji');
            expect(result.translations).toEqual(['Eins', 'Singular']);
            expect(result.item).toBe(mockKanji);
        });

        it('sollte Vocabulary Items korrekt übersetzen', async () => {
            const mockVocabulary: CombinedVocabulary = {
                id: 2467,
                type: 'vocabulary',
                characters: '一',
                level: 1,
                primaryMeaning: 'One',
                alternativeMeanings: [],
                meanings: ['One'],
                existingSynonyms: [],
                selected: false,
                translatedSynonyms: [],
            };

            // Mock VocabularyTranslationService.translate()
            const { VocabularyTranslationService } = await import('../../features/vocabulary/lib/VocabularyTranslationService');
            vi.mocked(VocabularyTranslationService.prototype.translate).mockResolvedValue(['Eins', 'Eines']);

            const result = await service.translateItem(mockVocabulary);

            expect(result.success).toBe(true);
            expect(result.type).toBe('vocabulary');
            expect(result.translations).toEqual(['Eins', 'Eines']);
            expect(result.item).toBe(mockVocabulary);
        });

        it('sollte Fehler gracefully handhaben', async () => {
            const mockRadical: CombinedRadical = {
                id: 1,
                type: 'radical',
                characters: '一',
                level: 1,
                primaryMeaning: 'Ground',
                meanings: ['Ground'],
                meaningMnemonic: 'This radical...',
                existingSynonyms: [],
                selected: false,
                translatedSynonyms: [],
            };

            // Mock error
            const { RadicalTranslationService } = await import('../../features/radicals/lib/RadicalTranslationService');
            vi.mocked(RadicalTranslationService.prototype.translate).mockRejectedValue(
                new Error('DeepL API Error')
            );

            const result = await service.translateItem(mockRadical);

            expect(result.success).toBe(false);
            expect(result.error).toBe('DeepL API Error');
            expect(result.translations).toEqual([]);
        });
    });

    describe('translateBatch() - Batch Processing', () => {
        it('sollte mehrere Items unterschiedlicher Types übersetzen', async () => {
            const mockItems = [
                {
                    id: 1,
                    type: 'radical' as const,
                    characters: '一',
                    level: 1,
                    primaryMeaning: 'Ground',
                    meanings: ['Ground'],
                    meaningMnemonic: 'This radical...',
                    existingSynonyms: [],
                    selected: false,
                    translatedSynonyms: [],
                },
                {
                    id: 440,
                    type: 'kanji' as const,
                    characters: '一',
                    level: 1,
                    primaryMeaning: 'One',
                    alternativeMeanings: ['Singular'],
                    meanings: ['One', 'Singular'],
                    meaningMnemonic: 'This kanji...',
                    existingSynonyms: [],
                    selected: false,
                    translatedSynonyms: [],
                },
                {
                    id: 2467,
                    type: 'vocabulary' as const,
                    characters: '一',
                    level: 1,
                    primaryMeaning: 'One',
                    alternativeMeanings: [],
                    meanings: ['One'],
                    existingSynonyms: [],
                    selected: false,
                    translatedSynonyms: [],
                },
            ];

            // Mock alle Services
            const { RadicalTranslationService } = await import('../../features/radicals/lib/RadicalTranslationService');
            const { KanjiTranslationService } = await import('../../features/kanji/lib/KanjiTranslationService');
            const { VocabularyTranslationService } = await import('../../features/vocabulary/lib/VocabularyTranslationService');

            vi.mocked(RadicalTranslationService.prototype.translate).mockResolvedValue(['Boden']);
            vi.mocked(KanjiTranslationService.prototype.translate).mockResolvedValue(['Eins']);
            vi.mocked(VocabularyTranslationService.prototype.translate).mockResolvedValue(['Eins', 'Eines']);

            const results = await service.translateBatch(mockItems);

            expect(results).toHaveLength(3);
            expect(results[0].type).toBe('radical');
            expect(results[0].success).toBe(true);
            expect(results[1].type).toBe('kanji');
            expect(results[1].success).toBe(true);
            expect(results[2].type).toBe('vocabulary');
            expect(results[2].success).toBe(true);
        });

        it('sollte bei Fehlern einzelner Items weitermachen', async () => {
            const mockItems = [
                {
                    id: 1,
                    type: 'radical' as const,
                    characters: '一',
                    level: 1,
                    primaryMeaning: 'Ground',
                    meanings: ['Ground'],
                    meaningMnemonic: 'This radical...',
                    existingSynonyms: [],
                    selected: false,
                    translatedSynonyms: [],
                },
                {
                    id: 440,
                    type: 'kanji' as const,
                    characters: '二',
                    level: 1,
                    primaryMeaning: 'Two',
                    alternativeMeanings: [],
                    meanings: ['Two'],
                    meaningMnemonic: 'This kanji...',
                    existingSynonyms: [],
                    selected: false,
                    translatedSynonyms: [],
                },
            ];

            // Mock: Erster erfolgreich, zweiter fehlerhaft
            const { RadicalTranslationService } = await import('../../features/radicals/lib/RadicalTranslationService');
            const { KanjiTranslationService } = await import('../../features/kanji/lib/KanjiTranslationService');

            vi.mocked(RadicalTranslationService.prototype.translate).mockResolvedValue(['Boden']);
            vi.mocked(KanjiTranslationService.prototype.translate).mockRejectedValue(
                new Error('Translation failed')
            );

            const results = await service.translateBatch(mockItems);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[0].translations).toEqual(['Boden']);
            expect(results[1].success).toBe(false);
            expect(results[1].error).toBe('Translation failed');
        });
    });

    describe('Helper Functions', () => {
        it('extractSuccessfulTranslations() sollte nur erfolgreiche Übersetzungen extrahieren', () => {
            const mockResults = [
                {
                    item: { id: 1, type: 'radical' as const } as CombinedRadical,
                    translations: ['Boden'],
                    type: 'radical' as const,
                    success: true,
                },
                {
                    item: { id: 2, type: 'kanji' as const } as CombinedKanji,
                    translations: [],
                    type: 'kanji' as const,
                    success: false,
                    error: 'Failed',
                },
                {
                    item: { id: 3, type: 'vocabulary' as const } as CombinedVocabulary,
                    translations: ['Eins', 'Eines'],
                    type: 'vocabulary' as const,
                    success: true,
                },
            ];

            const translationsMap = CombinedTranslationService.extractSuccessfulTranslations(mockResults);

            expect(translationsMap.size).toBe(2);
            expect(translationsMap.get(1)).toEqual(['Boden']);
            expect(translationsMap.get(2)).toBeUndefined();
            expect(translationsMap.get(3)).toEqual(['Eins', 'Eines']);
        });

        it('getStatistics() sollte korrekte Statistiken berechnen', () => {
            const mockResults = [
                {
                    item: { id: 1 } as CombinedRadical,
                    translations: ['Boden'],
                    type: 'radical' as const,
                    success: true,
                },
                {
                    item: { id: 2 } as CombinedRadical,
                    translations: [],
                    type: 'radical' as const,
                    success: false,
                    error: 'Failed',
                },
                {
                    item: { id: 3 } as CombinedKanji,
                    translations: ['Eins'],
                    type: 'kanji' as const,
                    success: true,
                },
                {
                    item: { id: 4 } as CombinedVocabulary,
                    translations: ['Eins', 'Eines'],
                    type: 'vocabulary' as const,
                    success: true,
                },
            ];

            const stats = CombinedTranslationService.getStatistics(mockResults);

            expect(stats.total).toBe(4);
            expect(stats.successful).toBe(3);
            expect(stats.failed).toBe(1);
            expect(stats.byType.radical.total).toBe(2);
            expect(stats.byType.radical.successful).toBe(1);
            expect(stats.byType.radical.failed).toBe(1);
            expect(stats.byType.kanji.total).toBe(1);
            expect(stats.byType.kanji.successful).toBe(1);
            expect(stats.byType.vocabulary.total).toBe(1);
            expect(stats.byType.vocabulary.successful).toBe(1);
        });
    });
});
