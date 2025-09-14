import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn()
}));

vi.mock('../../lib/wanikani', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../lib/wanikani')>();
    return {
        ...actual,
        getVocabularyStudyMaterials: vi.fn(),
        createStudyMaterials: vi.fn(),
        updateSynonyms: vi.fn(),
        updateVocabularySynonyms: vi.fn()
    };
});

import {
    processVocabularyComplete,
    integratedVocabularyProcessor,
    type CompleteProcessingOptions,
    type ProcessingPhase
} from '../../lib/vocabulary-integration';
import * as deepl from '../../lib/deepl';
import * as wanikani from '../../lib/wanikani';
import { VocabularyItem } from '../../lib/vocabulary-translation';

describe('🔴 Phase A.4: Vocabulary Integration System (TDD)', () => {
    const mockCompleteOptions: CompleteProcessingOptions = {
        batchSize: 2,
        synonymMode: 'smart-merge',
        apiToken: 'test-wk-token',
        deeplToken: 'test-deepl-token',
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    const mockVocabularyItems: VocabularyItem[] = [
        {
            id: 1,
            characters: '猫',
            meanings: [{ meaning: 'cat', primary: true }]
        },
        {
            id: 2,
            characters: '犬',
            meanings: [{ meaning: 'dog', primary: true }]
        },
        {
            id: 3,
            characters: '鳥',
            meanings: [{ meaning: 'bird', primary: true }]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('processVocabularyComplete', () => {
        it('should process vocabulary through complete pipeline: translation → batch → upload', async () => {
            // Arrange
            // Mock DeepL translations
            vi.mocked(deepl.translateText)
                .mockResolvedValueOnce('Katze')
                .mockResolvedValueOnce('Hund')
                .mockResolvedValueOnce('Vogel');

            // Mock WaniKani study materials (none exist initially)
            vi.mocked(wanikani.getVocabularyStudyMaterials)
                .mockResolvedValue([] as any);

            // Mock WaniKani create operations
            vi.mocked(wanikani.createStudyMaterials)
                .mockResolvedValueOnce({ data: { id: 101, meaning_synonyms: ['Katze'] } } as any)
                .mockResolvedValueOnce({ data: { id: 102, meaning_synonyms: ['Hund'] } } as any)
                .mockResolvedValueOnce({ data: { id: 103, meaning_synonyms: ['Vogel'] } } as any);

            const progressUpdates: ProcessingPhase[] = [];
            const onProgress = (phase: ProcessingPhase) => progressUpdates.push(phase);

            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                mockCompleteOptions,
                onProgress
            );

            // Assert
            expect(result).toEqual({
                success: true,
                totalItems: 3,
                translationResults: {
                    successCount: 3,
                    errorCount: 0,
                    translations: [
                        { vocabularyId: 1, translatedSynonyms: ['Katze'], error: null },
                        { vocabularyId: 2, translatedSynonyms: ['Hund'], error: null },
                        { vocabularyId: 3, translatedSynonyms: ['Vogel'], error: null }
                    ]
                },
                uploadResults: {
                    success: true,
                    totalItems: 3,
                    createdCount: 3,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [
                        { vocabularyId: 1, studyMaterialId: 101, action: 'created', finalSynonyms: ['Katze'], success: true },
                        { vocabularyId: 2, studyMaterialId: 102, action: 'created', finalSynonyms: ['Hund'], success: true },
                        { vocabularyId: 3, studyMaterialId: 103, action: 'created', finalSynonyms: ['Vogel'], success: true }
                    ],
                    errors: []
                },
                processingTime: expect.any(Number),
                phases: progressUpdates
            });

            // Verify progress tracking includes key phases
            expect(progressUpdates).toContainEqual({ phase: 'translation', status: 'started', progress: 0 });
            expect(progressUpdates).toContainEqual({ phase: 'translation', status: 'completed', progress: 100 });
            expect(progressUpdates).toContainEqual({ phase: 'upload', status: 'started', progress: 0 });
            expect(progressUpdates).toContainEqual({ phase: 'upload', status: 'completed', progress: 100 });
            expect(progressUpdates.length).toBeGreaterThan(4); // Should have in-progress updates too
        });

        it('should handle mixed translation success/failure scenarios', async () => {
            // Arrange
            // Mock DeepL translations: success, fail, success
            vi.mocked(deepl.translateText)
                .mockResolvedValueOnce('Katze')
                .mockRejectedValueOnce(new Error('DeepL API Error'))
                .mockResolvedValueOnce('Vogel');

            // Mock WaniKani operations for successful translations only
            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);
            vi.mocked(wanikani.createStudyMaterials)
                .mockResolvedValueOnce({ data: { id: 101, meaning_synonyms: ['Katze'] } } as any)
                .mockResolvedValueOnce({ data: { id: 103, meaning_synonyms: ['Vogel'] } } as any);

            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                mockCompleteOptions
            );

            // Assert
            expect(result).toEqual({
                success: false, // Overall failure due to translation error
                totalItems: 3,
                translationResults: {
                    successCount: 2,
                    errorCount: 1,
                    translations: [
                        { vocabularyId: 1, translatedSynonyms: ['Katze'], error: null },
                        { vocabularyId: 2, translatedSynonyms: [], error: 'Translation failed: DeepL API Error' },
                        { vocabularyId: 3, translatedSynonyms: ['Vogel'], error: null }
                    ]
                },
                uploadResults: {
                    success: true, // Upload succeeds for translated items
                    totalItems: 2, // Only 2 items were successfully translated
                    createdCount: 2,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [
                        { vocabularyId: 1, studyMaterialId: 101, action: 'created', finalSynonyms: ['Katze'], success: true },
                        { vocabularyId: 3, studyMaterialId: 103, action: 'created', finalSynonyms: ['Vogel'], success: true }
                    ],
                    errors: []
                },
                processingTime: expect.any(Number),
                phases: expect.any(Array)
            });
        });

        it('should handle stopOnFirstError flag correctly', async () => {
            // Arrange
            const stopOnErrorOptions = { ...mockCompleteOptions, stopOnFirstError: true };

            // Mock DeepL translations: success, fail (should stop here)
            vi.mocked(deepl.translateText)
                .mockResolvedValueOnce('Katze')
                .mockRejectedValueOnce(new Error('DeepL API Error'));

            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                stopOnErrorOptions
            );

            // Assert
            expect(result.success).toBe(false);
            expect(result.translationResults.successCount).toBe(1);
            expect(result.translationResults.errorCount).toBe(1);
            // Should not attempt to translate third item
            expect(deepl.translateText).toHaveBeenCalledTimes(2);
        });

        it('should respect batch processing with progress reporting', async () => {
            // Arrange
            const batchOptions = { ...mockCompleteOptions, batchSize: 1 }; // Process one at a time

            // Mock successful translations
            vi.mocked(deepl.translateText)
                .mockResolvedValueOnce('Katze')
                .mockResolvedValueOnce('Hund')
                .mockResolvedValueOnce('Vogel');

            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);
            vi.mocked(wanikani.createStudyMaterials)
                .mockResolvedValue({ data: { id: 101, meaning_synonyms: ['Test'] } } as any);

            const progressUpdates: ProcessingPhase[] = [];
            const onProgress = (phase: ProcessingPhase) => progressUpdates.push(phase);

            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                batchOptions,
                onProgress
            );

            // Assert
            expect(result.success).toBe(true);
            expect(progressUpdates.length).toBeGreaterThan(4); // Should have multiple progress updates

            // Check that batch processing was used
            const uploadPhases = progressUpdates.filter(p => p.phase === 'upload');
            expect(uploadPhases.length).toBeGreaterThan(1); // Should have start and complete at minimum
        });
    });

    describe('integratedVocabularyProcessor', () => {
        it('should provide a high-level interface for complete vocabulary processing', async () => {
            // Arrange
            const processor = integratedVocabularyProcessor(mockCompleteOptions);

            // Mock successful operations
            vi.mocked(deepl.translateText).mockResolvedValue('Test');
            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);
            vi.mocked(wanikani.createStudyMaterials).mockResolvedValue({
                data: { id: 101, meaning_synonyms: ['Test'] }
            } as any);

            // Act
            const result = await processor.process(mockVocabularyItems.slice(0, 1));

            // Assert
            expect(result.success).toBe(true);
            expect(result.totalItems).toBe(1);
            expect(typeof processor.getStatistics).toBe('function');
            expect(typeof processor.reset).toBe('function');
        });

        it('should maintain processing statistics across multiple calls', async () => {
            // Arrange
            const processor = integratedVocabularyProcessor(mockCompleteOptions);

            // Mock successful operations
            vi.mocked(deepl.translateText).mockResolvedValue('Test');
            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);
            vi.mocked(wanikani.createStudyMaterials).mockResolvedValue({
                data: { id: 101, meaning_synonyms: ['Test'] }
            } as any);

            // Act
            await processor.process(mockVocabularyItems.slice(0, 1));
            await processor.process(mockVocabularyItems.slice(1, 2));

            const stats = processor.getStatistics();

            // Assert
            expect(stats).toEqual({
                totalProcessed: 2,
                totalTranslated: 2,
                totalUploaded: 2,
                totalErrors: 0,
                averageProcessingTime: expect.any(Number),
                successRate: 100
            });
        });

        it('should allow resetting statistics', async () => {
            // Arrange
            const processor = integratedVocabularyProcessor(mockCompleteOptions);

            // Mock operations
            vi.mocked(deepl.translateText).mockResolvedValue('Test');
            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);
            vi.mocked(wanikani.createStudyMaterials).mockResolvedValue({
                data: { id: 101, meaning_synonyms: ['Test'] }
            } as any);

            // Act
            await processor.process(mockVocabularyItems.slice(0, 1));
            processor.reset();
            const stats = processor.getStatistics();

            // Assert
            expect(stats.totalProcessed).toBe(0);
            expect(stats.successRate).toBe(0);
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('should handle WaniKani API rate limiting gracefully', async () => {
            // Arrange
            vi.mocked(deepl.translateText).mockResolvedValue('Test');
            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);

            // Mock rate limiting error then success
            vi.mocked(wanikani.createStudyMaterials)
                .mockRejectedValueOnce(new Error('Rate limit exceeded'))
                .mockResolvedValueOnce({ data: { id: 101, meaning_synonyms: ['Test'] } } as any);

            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems.slice(0, 1),
                mockCompleteOptions
            );

            // Assert
            expect(result.success).toBe(false); // Should fail due to upload error
            expect(result.uploadResults.errorCount).toBe(1);
            expect(result.uploadResults.errors).toContain('Rate limit exceeded');
        });

        it('should provide detailed error reporting for debugging', async () => {
            // Arrange - Both translations succeed, but WaniKani upload fails
            vi.mocked(deepl.translateText)
                .mockResolvedValueOnce('Katze')
                .mockResolvedValueOnce('Hund');

            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);
            vi.mocked(wanikani.createStudyMaterials)
                .mockRejectedValueOnce(new Error('WaniKani server error'))
                .mockResolvedValueOnce({ data: { id: 102, meaning_synonyms: ['Hund'] } } as any);

            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems.slice(0, 2),
                mockCompleteOptions
            );

            // Assert
            expect(result.success).toBe(false); // Overall failure due to upload error
            expect(result.translationResults.successCount).toBe(2); // Both translations succeeded
            expect(result.uploadResults.errorCount).toBe(1); // One upload failed

            // Find the error result
            const errorResults = result.uploadResults.results.filter((r: any) => !r.success);
            expect(errorResults).toHaveLength(1);
            expect(errorResults[0].error).toContain('WaniKani server error');
        });
    });
});
