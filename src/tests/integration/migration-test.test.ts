/**
 * Migration Test: Verify that the new precise synonym management functions
 * are correctly integrated into the main vocabulary processing pipeline.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { processVocabularyStreaming } from '../../../src/lib/vocabulary-streaming-integration';
import { processVocabularyComplete } from '../../../src/lib/vocabulary-integration';
import type { VocabularyItem } from '../../../src/lib/vocabulary-translation';

// Mock external dependencies
vi.mock('../../../src/lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn()
}));

vi.mock('../../../src/lib/vocabulary-wanikani-upload', () => ({
    uploadVocabularyBatchPrecise: vi.fn(),
    BatchUploadResult: {},
    VocabularyTranslation: {}
}));

describe('🚀 Migration Test - New Precise Functions Integration', () => {
    const mockVocabulary: VocabularyItem[] = [
        {
            id: 1,
            characters: '本',
            meanings: [
                { meaning: 'book', primary: true },
                { meaning: 'origin', primary: false }
            ]
        }
    ];

    const mockOptions = {
        batchSize: 10,
        synonymMode: 'smart-merge' as const,
        apiToken: 'test-api-key',
        deeplToken: 'test-deepl-key',
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('streaming integration should use uploadVocabularyBatchPrecise', async () => {
        const { translateVocabularyMeanings } = await import('../../../src/lib/vocabulary-translation');
        const { uploadVocabularyBatchPrecise } = await import('../../../src/lib/vocabulary-wanikani-upload');

        // Mock translation success
        vi.mocked(translateVocabularyMeanings).mockResolvedValue({
            vocabularyId: 1,
            originalMeanings: ['book'],
            translatedSynonyms: ['Buch', 'Band'],
            selected: true
        });

        // Mock upload success  
        vi.mocked(uploadVocabularyBatchPrecise).mockResolvedValue({
            success: true,
            totalItems: 1,
            createdCount: 1,
            updatedCount: 0,
            errorCount: 0,
            results: [{
                vocabularyId: 1,
                studyMaterialId: 123,
                action: 'created',
                finalSynonyms: ['Buch', 'Band'],
                success: true
            }],
            errors: []
        });

        // Test streaming integration
        await processVocabularyStreaming(
            mockVocabulary,
            mockOptions,
            () => { },
            { current: false }
        );

        // Verify the precise function was called
        expect(uploadVocabularyBatchPrecise).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    vocabulary: expect.objectContaining({ id: 1 }),
                    translatedSynonyms: ['Buch', 'Band']
                })
            ]),
            expect.objectContaining({
                synonymMode: 'smart-merge',
                apiToken: 'test-api-key'
            })
        );
    });

    test('batch integration should use uploadVocabularyBatchPrecise', async () => {
        const { translateVocabularyMeanings } = await import('../../../src/lib/vocabulary-translation');
        const { uploadVocabularyBatchPrecise } = await import('../../../src/lib/vocabulary-wanikani-upload');

        // Mock translation success
        vi.mocked(translateVocabularyMeanings).mockResolvedValue({
            vocabularyId: 1,
            originalMeanings: ['book'],
            translatedSynonyms: ['Buch', 'Band'],
            selected: true
        });

        // Mock upload success
        vi.mocked(uploadVocabularyBatchPrecise).mockResolvedValue({
            success: true,
            totalItems: 1,
            createdCount: 1,
            updatedCount: 0,
            errorCount: 0,
            results: [{
                vocabularyId: 1,
                studyMaterialId: 123,
                action: 'created',
                finalSynonyms: ['Buch', 'Band'],
                success: true
            }],
            errors: []
        });

        // Test batch integration
        await processVocabularyComplete(
            mockVocabulary,
            mockOptions,
            () => { },
            { current: false }
        );

        // Verify the precise function was called
        expect(uploadVocabularyBatchPrecise).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    vocabulary: expect.objectContaining({ id: 1 }),
                    translatedSynonyms: ['Buch', 'Band']
                })
            ]),
            expect.objectContaining({
                synonymMode: 'smart-merge',
                apiToken: 'test-api-key'
            }),
            expect.any(Object), // stopSignal
            expect.any(Function) // progress callback
        );
    });

    test('migration should maintain backward compatibility', async () => {
        // Use importOriginal to get the real functions, not mocks
        const actual = await vi.importActual('../../../src/lib/vocabulary-wanikani-upload') as any;

        expect(typeof actual.uploadVocabularyBatch).toBe('function');
        expect(typeof actual.uploadVocabularyBatchPrecise).toBe('function');

        // They should be different functions
        expect(actual.uploadVocabularyBatch).not.toBe(actual.uploadVocabularyBatchPrecise);
    });
});
