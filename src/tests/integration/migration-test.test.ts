/**
 * Migration Test: Verify that the new precise synonym management functions
 * are correctly integrated into the main vocabulary processing pipeline.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { processVocabularyStreaming } from '../../../src/features/vocabulary/lib/vocabulary-streaming-integration';
import { processVocabularyComplete } from '../../../src/features/vocabulary/lib/vocabulary-integration';
import type { VocabularyItem } from '../../../src/features/vocabulary/lib/vocabulary-translation';

// Mock external dependencies
vi.mock('../../../src/features/vocabulary/lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn()
}));

vi.mock('../../../src/features/vocabulary/lib/vocabulary-wanikani-upload', () => ({
    uploadVocabularyBatch: vi.fn(),
    BatchUploadResult: {},
    VocabularyTranslation: {}
}));

describe('🚀 Legacy Removal Test - Clean Precise Functions', () => {
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

    // LEGACY TEST - Can be removed after Phase 3.4 cleanup
    // This tests the old uploadVocabularyBatch function integration
    // The new architecture uses VocabularyTranslationService and WaniKaniUploadService
    test.skip('[LEGACY] streaming integration should use uploadVocabularyBatch (now precise)', async () => {
        const { translateVocabularyMeanings } = await import('../../../src/features/vocabulary/lib/vocabulary-translation');
        const { uploadVocabularyBatch } = await import('../../../src/features/vocabulary/lib/vocabulary-wanikani-upload');

        // Mock translation success
        vi.mocked(translateVocabularyMeanings).mockResolvedValue({
            vocabularyId: 1,
            originalMeanings: ['book'],
            translatedSynonyms: ['Buch', 'Band'],
            selected: true
        });

        // Mock upload success  
        vi.mocked(uploadVocabularyBatch).mockResolvedValue({
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
        expect(uploadVocabularyBatch).toHaveBeenCalledWith(
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

    // LEGACY TEST - Can be removed after Phase 3.4 cleanup
    // This tests the old uploadVocabularyBatch function integration
    test.skip('[LEGACY] batch integration should use uploadVocabularyBatch (now precise)', async () => {
        const { translateVocabularyMeanings } = await import('../../../src/features/vocabulary/lib/vocabulary-translation');
        const { uploadVocabularyBatch } = await import('../../../src/features/vocabulary/lib/vocabulary-wanikani-upload');

        // Mock translation success
        vi.mocked(translateVocabularyMeanings).mockResolvedValue({
            vocabularyId: 1,
            originalMeanings: ['book'],
            translatedSynonyms: ['Buch', 'Band'],
            selected: true
        });

        // Mock upload success
        vi.mocked(uploadVocabularyBatch).mockResolvedValue({
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
        expect(uploadVocabularyBatch).toHaveBeenCalledWith(
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

    test('should only have precise functions (no legacy)', async () => {
        // Use importOriginal to get the real functions, not mocks
        const actual = await vi.importActual('../../../src/features/vocabulary/lib/vocabulary-wanikani-upload') as any;

        expect(typeof actual.uploadVocabularyBatch).toBe('function');
        expect(typeof actual.createOrUpdateStudyMaterial).toBe('function');
        expect(typeof actual.processPreciseSynonymManagement).toBe('function');

        // Legacy functions should not exist
        expect(actual.uploadVocabularyBatchPrecise).toBeUndefined();
        expect(actual.createOrUpdateStudyMaterialPrecise).toBeUndefined();
    });
});
