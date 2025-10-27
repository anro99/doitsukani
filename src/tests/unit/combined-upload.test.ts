/**
 * Combined Upload Service - Unit Tests
 * 
 * Testet polymorphes Upload Handling für Radical, Kanji und Vocabulary Items
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CombinedUploadService } from '../../features/combined/lib/combined-upload';
import type { CombinedRadical, CombinedKanji, CombinedVocabulary } from '../../features/combined/types/combined-types';
import { WaniKaniUploadService } from '../../shared/processing/services/WaniKaniUploadService';

// Mock WaniKaniUploadService
vi.mock('../../shared/processing/services/WaniKaniUploadService');

describe('Combined Upload Service', () => {
    let service: CombinedUploadService;
    const mockApiToken = 'test-api-token';

    beforeEach(() => {
        vi.clearAllMocks();
        service = new CombinedUploadService({ apiToken: mockApiToken });
    });

    describe('uploadItem() - Polymorphic Dispatch', () => {
        it('sollte Radical Items korrekt hochladen', async () => {
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

            const mockSynonyms = ['Boden', 'Erde'];

            // Mock WaniKaniUploadService.upload()
            const { WaniKaniUploadService } = await import('../../shared/processing/services/WaniKaniUploadService');
            vi.mocked(WaniKaniUploadService.prototype.upload).mockResolvedValue(true);

            const result = await service.uploadItem(mockRadical, mockSynonyms);

            expect(result.success).toBe(true);
            expect(result.type).toBe('radical');
            expect(result.item).toBe(mockRadical);
            expect(WaniKaniUploadService.prototype.upload).toHaveBeenCalledWith(1, mockSynonyms);
        });

        it('sollte Kanji Items korrekt hochladen', async () => {
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

            const mockSynonyms = ['Eins', 'Singular'];

            const { WaniKaniUploadService } = await import('../../shared/processing/services/WaniKaniUploadService');
            vi.mocked(WaniKaniUploadService.prototype.upload).mockResolvedValue(true);

            const result = await service.uploadItem(mockKanji, mockSynonyms);

            expect(result.success).toBe(true);
            expect(result.type).toBe('kanji');
            expect(result.item).toBe(mockKanji);
            expect(WaniKaniUploadService.prototype.upload).toHaveBeenCalledWith(440, mockSynonyms);
        });

        it('sollte Vocabulary Items korrekt hochladen', async () => {
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

            const mockSynonyms = ['Eins', 'Eines'];

            const { WaniKaniUploadService } = await import('../../shared/processing/services/WaniKaniUploadService');
            vi.mocked(WaniKaniUploadService.prototype.upload).mockResolvedValue(true);

            const result = await service.uploadItem(mockVocabulary, mockSynonyms);

            expect(result.success).toBe(true);
            expect(result.type).toBe('vocabulary');
            expect(result.item).toBe(mockVocabulary);
            expect(WaniKaniUploadService.prototype.upload).toHaveBeenCalledWith(2467, mockSynonyms);
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

            const mockSynonyms = ['Boden'];

            // Mock error
            const { WaniKaniUploadService } = await import('../../shared/processing/services/WaniKaniUploadService');
            vi.mocked(WaniKaniUploadService.prototype.upload).mockRejectedValue(
                new Error('API Error')
            );

            const result = await service.uploadItem(mockRadical, mockSynonyms);

            expect(result.success).toBe(false);
            expect(result.error).toBe('API Error');
        });

        it('sollte Upload Failure korrekt zurückgeben', async () => {
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

            const mockSynonyms = ['Boden'];

            // Mock upload returning false (failure)
            const { WaniKaniUploadService } = await import('../../shared/processing/services/WaniKaniUploadService');
            vi.mocked(WaniKaniUploadService.prototype.upload).mockResolvedValue(false);

            const result = await service.uploadItem(mockRadical, mockSynonyms);

            expect(result.success).toBe(false);
            expect(result.error).toBeUndefined(); // No error, just failed
        });
    });

    describe('uploadBatch() - Batch Processing', () => {
        it('sollte mehrere Items unterschiedlicher Types hochladen', async () => {
            const mockItems = [
                {
                    item: {
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
                    synonyms: ['Boden'],
                },
                {
                    item: {
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
                    synonyms: ['Eins'],
                },
                {
                    item: {
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
                    synonyms: ['Eins', 'Eines'],
                },
            ];

            // Mock alle Uploads als erfolgreich
            const { WaniKaniUploadService } = await import('../../shared/processing/services/WaniKaniUploadService');
            vi.mocked(WaniKaniUploadService.prototype.upload).mockResolvedValue(true);

            const results = await service.uploadBatch(mockItems);

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
                    item: {
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
                    synonyms: ['Boden'],
                },
                {
                    item: {
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
                    synonyms: ['Zwei'],
                },
            ];

            // Mock: Erster erfolgreich, zweiter fehlerhaft
            const { WaniKaniUploadService } = await import('../../shared/processing/services/WaniKaniUploadService');
            vi.mocked(WaniKaniUploadService.prototype.upload)
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const results = await service.uploadBatch(mockItems);

            expect(results).toHaveLength(2);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
        });
    });

    describe('Helper Functions', () => {
        it('getStatistics() sollte korrekte Statistiken berechnen', () => {
            const mockResults = [
                {
                    item: { id: 1 } as CombinedRadical,
                    success: true,
                    type: 'radical' as const,
                },
                {
                    item: { id: 2 } as CombinedRadical,
                    success: false,
                    type: 'radical' as const,
                    error: 'Failed',
                },
                {
                    item: { id: 3 } as CombinedKanji,
                    success: true,
                    type: 'kanji' as const,
                },
                {
                    item: { id: 4 } as CombinedVocabulary,
                    success: true,
                    type: 'vocabulary' as const,
                },
            ];

            const stats = CombinedUploadService.getStatistics(mockResults);

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

    describe('Service Availability', () => {
        it('sollte isAvailable() korrekt zurückgeben', () => {
            vi.mocked(WaniKaniUploadService.prototype.isAvailable).mockReturnValue(true);

            const result = service.isAvailable();

            expect(result).toBe(true);
        });

        it('sollte getRateLimitStatus() korrekt delegieren', () => {
            const mockStatus = { requestsInLastSecond: 0, canMakeRequest: true };

            vi.mocked(WaniKaniUploadService.prototype.getRateLimitStatus).mockReturnValue(mockStatus);

            const result = service.getRateLimitStatus();

            expect(result).toEqual(mockStatus);
        });
    });
});
