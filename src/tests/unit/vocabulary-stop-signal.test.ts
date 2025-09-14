import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processVocabularyComplete, CompleteProcessingOptions } from '../../lib/vocabulary-integration';
import { VocabularyItem } from '../../lib/vocabulary-translation';

// Mock the dependent modules
vi.mock('../../lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn()
}));

vi.mock('../../lib/vocabulary-wanikani-upload', () => ({
    uploadVocabularyBatch: vi.fn()
}));

describe('Vocabulary Stop Signal Functionality', () => {
    let mockTranslateVocabularyMeanings: any;
    let mockUploadVocabularyBatch: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        const vocabModule = await import('../../lib/vocabulary-translation');
        const uploadModule = await import('../../lib/vocabulary-wanikani-upload');

        mockTranslateVocabularyMeanings = vi.mocked(vocabModule.translateVocabularyMeanings);
        mockUploadVocabularyBatch = vi.mocked(uploadModule.uploadVocabularyBatch);
    });

    it('should stop translation processing when stop signal is activated', async () => {
        // Arrange
        const testVocabulary: VocabularyItem[] = [
            {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            },
            {
                id: 2,
                characters: '猫',
                meanings: [{ meaning: 'cat', primary: true }]
            }
        ];

        const options: CompleteProcessingOptions = {
            batchSize: 10,
            synonymMode: 'smart-merge',
            apiToken: 'test-api-token',
            deeplToken: 'test-deepl-token',
            enableProgressReporting: true,
            stopOnFirstError: false
        };

        const stopSignal = { current: false };

        // Mock translation to succeed for first item, then activate stop signal immediately
        let callCount = 0;
        mockTranslateVocabularyMeanings.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // First call succeeds and immediately activates stop signal
                stopSignal.current = true;
                return Promise.resolve({
                    translatedSynonyms: ['Hund'],
                    error: null
                });
            } else {
                // This should not be called due to stop signal
                throw new Error('Should not be called after stop signal');
            }
        });

        // Mock upload to return success
        mockUploadVocabularyBatch.mockResolvedValue({
            success: true,
            totalItems: 1,
            createdCount: 1,
            updatedCount: 0,
            errorCount: 0,
            results: [],
            errors: []
        });

        // Act
        const result = await processVocabularyComplete(testVocabulary, options, undefined, stopSignal);

        // Assert - focus on the core functionality
        expect(mockTranslateVocabularyMeanings).toHaveBeenCalledTimes(1); // Should stop after first call
        expect(result.translationResults.translations).toHaveLength(1); // Only one translation processed
        expect(result.translationResults.translations[0].vocabularyId).toBe(1);
        expect(result.translationResults.translations[0].error).toBeNull(); // No error in successful translation
        expect(result.uploadResults.success).toBe(true); // Upload should succeed
        expect(result.success).toBe(true); // Overall success - no actual errors occurred
    });

    it('should stop upload processing when stop signal is activated', async () => {
        // Arrange
        const testVocabulary: VocabularyItem[] = [
            {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            },
            {
                id: 2,
                characters: '猫',
                meanings: [{ meaning: 'cat', primary: true }]
            }
        ];

        const options: CompleteProcessingOptions = {
            batchSize: 10,
            synonymMode: 'smart-merge',
            apiToken: 'test-api-token',
            deeplToken: 'test-deepl-token',
            enableProgressReporting: true,
            stopOnFirstError: false
        };

        const stopSignal = { current: false };

        // Mock successful translations for all items
        mockTranslateVocabularyMeanings.mockResolvedValue({
            translatedSynonyms: ['Hund'],
            error: null
        });

        // Mock upload to activate stop signal
        mockUploadVocabularyBatch.mockImplementation(() => {
            stopSignal.current = true; // Activate stop during upload
            return Promise.resolve({
                success: true,
                totalItems: 2,
                createdCount: 1,
                updatedCount: 0,
                errorCount: 0,
                results: [],
                errors: []
            });
        });

        // Act
        const result = await processVocabularyComplete(testVocabulary, options, undefined, stopSignal);

        // Assert
        expect(result.success).toBe(true);
        expect(mockTranslateVocabularyMeanings).toHaveBeenCalledTimes(2); // Translation should complete
        expect(mockUploadVocabularyBatch).toHaveBeenCalledTimes(1); // Upload should be called
        expect(result.translationResults.successCount).toBe(2);
    });

    it('should handle progress reporting with stop signal', async () => {
        // Arrange
        const testVocabulary: VocabularyItem[] = [
            {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            }
        ];

        const options: CompleteProcessingOptions = {
            batchSize: 10,
            synonymMode: 'smart-merge',
            apiToken: 'test-api-token',
            deeplToken: 'test-deepl-token',
            enableProgressReporting: true,
            stopOnFirstError: false
        };

        const stopSignal = { current: false };
        const progressUpdates: any[] = [];

        const onProgress = (phase: any) => {
            progressUpdates.push(phase);
            // Activate stop signal during progress reporting
            if (phase.phase === 'translation' && phase.status === 'in-progress') {
                stopSignal.current = true;
            }
        };

        mockTranslateVocabularyMeanings.mockResolvedValue({
            translatedSynonyms: ['Hund'],
            error: null
        });

        // Act
        const result = await processVocabularyComplete(testVocabulary, options, onProgress, stopSignal);

        // Assert
        expect(result.success).toBe(true);
        expect(progressUpdates.length).toBeGreaterThan(0);
        expect(progressUpdates.some(p => p.phase === 'translation')).toBe(true);
    });
});
