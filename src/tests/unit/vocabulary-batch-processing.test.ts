import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('../../shared/lib/deepl', () => ({
    translateText: vi.fn()
}));

vi.mock('../../shared/lib/wanikani', () => ({
    updateVocabularySynonyms: vi.fn(),
    createVocabularySynonyms: vi.fn(),
    getVocabularyPreview: vi.fn()
}));

import * as deepl from '../../shared/lib/deepl';
import * as wanikani from '../../shared/lib/wanikani';
import { VocabularyItem } from '../../features/vocabulary/lib/vocabulary-translation';

const mockedDeepL = vi.mocked(deepl);
const mockedWaniKani = vi.mocked(wanikani);

// Types are now imported from the implementation file

// Import the functions we just implemented
import {
    processBatchesSequentially,
    createProcessingProgress,
    type BatchProcessingOptions,
    type ProcessingProgress
} from '../../features/vocabulary/lib/vocabulary-batch-processing'; describe('🔴 Phase A.2: Vocabulary Batch Processing (TDD)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('processBatchesSequentially', () => {
        it('should process vocabulary items in batches', async () => {
            // 🔴 RED: This test will fail because the function doesn't exist yet

            // Arrange
            const mockVocabularyItems: VocabularyItem[] = [
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

            const options: BatchProcessingOptions = {
                batchSize: 1,
                synonymMode: 'smart-merge',
                apiToken: 'wanikani-token',
                deeplToken: 'deepl-token'
            };

            // Mock successful translations and uploads
            mockedDeepL.translateText
                .mockResolvedValueOnce('Hund')
                .mockResolvedValueOnce('Katze');

            // Mock WaniKani StudyMaterial responses
            mockedWaniKani.updateVocabularySynonyms
                .mockResolvedValueOnce({
                    object: 'study_material',
                    id: 1,
                    data: { meaning_synonyms: ['Hund'] }
                } as any)
                .mockResolvedValueOnce({
                    object: 'study_material',
                    id: 2,
                    data: { meaning_synonyms: ['Katze'] }
                } as any);

            // Act
            const result = await processBatchesSequentially(mockVocabularyItems, options);

            // Assert
            expect(result).toEqual({
                success: true,
                processedCount: 2,
                successCount: 2,
                errorCount: 0,
                errors: [],
                stopped: false
            });

            // Verify DeepL calls
            expect(mockedDeepL.translateText).toHaveBeenCalledTimes(2);
            expect(mockedDeepL.translateText).toHaveBeenCalledWith('deepl-token', 'dog', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith('deepl-token', 'cat', 'DE');

            // Verify WaniKani uploads
            expect(mockedWaniKani.updateVocabularySynonyms).toHaveBeenCalledTimes(2);
        });

        it('should handle batch processing errors gracefully', async () => {
            // 🔴 RED: Error handling test

            const mockVocabularyItems: VocabularyItem[] = [
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

            const options: BatchProcessingOptions = {
                batchSize: 2,
                synonymMode: 'smart-merge',
                apiToken: 'wanikani-token',
                deeplToken: 'deepl-token'
            };

            // Mock first translation success, second fails
            mockedDeepL.translateText
                .mockResolvedValueOnce('Hund')
                .mockRejectedValueOnce(new Error('DeepL rate limit'));

            mockedWaniKani.updateVocabularySynonyms
                .mockResolvedValueOnce({
                    object: 'study_material',
                    id: 1,
                    data: { meaning_synonyms: ['Hund'] }
                } as any);

            // Act
            const result = await processBatchesSequentially(mockVocabularyItems, options);

            // Assert
            expect(result).toEqual({
                success: false,
                processedCount: 2,
                successCount: 1,
                errorCount: 1,
                errors: ['猫: Translation failed: DeepL rate limit'],
                stopped: false
            });
        });

        it('should respect stop signal during processing', async () => {
            // 🔴 RED: Stop mechanism test

            const mockVocabularyItems: VocabularyItem[] = [
                { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
                { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] },
                { id: 3, characters: '鳥', meanings: [{ meaning: 'bird', primary: true }] }
            ];

            const options: BatchProcessingOptions = {
                batchSize: 1,
                synonymMode: 'smart-merge',
                apiToken: 'wanikani-token',
                deeplToken: 'deepl-token'
            };

            const stopSignal = { current: false };

            // Mock translations - stop after first item
            mockedDeepL.translateText.mockImplementation(async (_token, text) => {
                if (text === 'cat') {
                    stopSignal.current = true; // Signal stop before processing cat
                }
                return text === 'dog' ? 'Hund' : 'Katze';
            });

            mockedWaniKani.updateVocabularySynonyms
                .mockResolvedValue({
                    object: 'study_material',
                    id: 1,
                    data: { meaning_synonyms: [] }
                } as any);

            // Act
            const result = await processBatchesSequentially(
                mockVocabularyItems,
                options,
                undefined,
                stopSignal
            );

            // Assert
            expect(result.stopped).toBe(true);
            expect(result.processedCount).toBeLessThan(3); // Should stop before processing all
        });
    });

    describe('createProcessingProgress', () => {
        it('should create proper progress object', () => {
            // 🔴 RED: Progress tracking test

            const progress = createProcessingProgress(
                2, // currentBatch
                5, // totalBatches
                '犬', // currentItem
                10, // processedCount
                25, // totalCount
                8, // successCount
                2 // errorCount
            );

            expect(progress).toEqual({
                currentBatch: 2,
                totalBatches: 5,
                currentItem: '犬',
                processedCount: 10,
                totalCount: 25,
                successCount: 8,
                errorCount: 2,
                isProcessing: true,
                canStop: true
            });
        });
    });

    describe('Progress Tracking Integration', () => {
        it('should call progress callback during processing', async () => {
            // 🔴 RED: Progress callback test

            const mockVocabularyItems: VocabularyItem[] = [
                { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
                { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] }
            ];

            const options: BatchProcessingOptions = {
                batchSize: 1,
                synonymMode: 'smart-merge',
                apiToken: 'wanikani-token',
                deeplToken: 'deepl-token'
            };

            const progressUpdates: ProcessingProgress[] = [];
            const onProgress = (progress: ProcessingProgress) => {
                progressUpdates.push({ ...progress });
            };

            // Mock successful processing
            mockedDeepL.translateText
                .mockResolvedValueOnce('Hund')
                .mockResolvedValueOnce('Katze');

            mockedWaniKani.updateVocabularySynonyms
                .mockResolvedValue({
                    object: 'study_material',
                    id: 1,
                    data: { meaning_synonyms: [] }
                } as any);

            // Act
            await processBatchesSequentially(mockVocabularyItems, options, onProgress);

            // Assert
            expect(progressUpdates).toHaveLength(2); // One update per batch
            expect(progressUpdates[0].currentItem).toBe('犬');
            expect(progressUpdates[1].currentItem).toBe('猫');
            expect(progressUpdates[1].processedCount).toBe(2);
        });
    });
});
