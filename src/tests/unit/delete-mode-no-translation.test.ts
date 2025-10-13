import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { processVocabularyStreaming } from '../../features/vocabulary/lib/vocabulary-streaming-integration';
import { processVocabularyComplete } from '../../features/vocabulary/lib/vocabulary-integration';
import { translateVocabularyMeanings } from '../../features/vocabulary/lib/vocabulary-translation';
import { uploadVocabularyBatch } from '../../features/vocabulary/lib/vocabulary-wanikani-upload';

// Mock the dependencies
vi.mock('../../features/vocabulary/lib/vocabulary-translation');
vi.mock('../../features/vocabulary/lib/vocabulary-wanikani-upload');

describe('🗑️ DELETE Mode - No Translation Required', () => {
    const mockOptions = {
        batchSize: 5,
        synonymMode: 'delete' as const,
        apiToken: 'test-api-token',
        deeplToken: 'test-deepl-token',
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    const mockVocabularyItems = [
        {
            id: 1,
            characters: '猫',
            meanings: [{ meaning: 'cat', primary: true }]
        },
        {
            id: 2,
            characters: '犬',
            meanings: [{ meaning: 'dog', primary: true }]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock successful upload results
        (uploadVocabularyBatch as Mock).mockResolvedValue({
            success: true,
            totalItems: 2,
            createdCount: 0,
            updatedCount: 2,
            errorCount: 0,
            results: [
                { vocabularyId: 1, action: 'updated', success: true },
                { vocabularyId: 2, action: 'updated', success: true }
            ],
            errors: []
        });
    });

    describe('Streaming Integration - DELETE Mode', () => {
        it('should NOT call translateVocabularyMeanings in DELETE mode', async () => {
            // Act
            const result = await processVocabularyStreaming(
                mockVocabularyItems,
                mockOptions,
                undefined, // no progress callback
                { current: false } // stop signal
            );

            // Assert
            expect(translateVocabularyMeanings).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.translationCount).toBe(2); // Should count as "translated" for progress
            expect(result.uploadCount).toBe(2);
        });

        it('should upload with empty synonyms in DELETE mode', async () => {
            // Act
            await processVocabularyStreaming(
                mockVocabularyItems,
                mockOptions
            );

            // Assert
            expect(uploadVocabularyBatch).toHaveBeenCalledTimes(2);

            // Check first upload call
            expect(uploadVocabularyBatch).toHaveBeenNthCalledWith(1,
                [{ vocabulary: mockVocabularyItems[0], translatedSynonyms: [] }],
                { synonymMode: 'delete', apiToken: 'test-api-token' }
            );

            // Check second upload call
            expect(uploadVocabularyBatch).toHaveBeenNthCalledWith(2,
                [{ vocabulary: mockVocabularyItems[1], translatedSynonyms: [] }],
                { synonymMode: 'delete', apiToken: 'test-api-token' }
            );
        });

        it('should report progress correctly without translation phase', async () => {
            const progressReports: any[] = [];

            // Act
            await processVocabularyStreaming(
                mockVocabularyItems,
                mockOptions,
                (phases) => {
                    progressReports.push(phases);
                }
            );

            // Assert
            expect(progressReports.length).toBeGreaterThan(0);

            // Should have progress reports showing translation phase completed instantly
            const finalReport = progressReports[progressReports.length - 1];
            expect(finalReport.translationPhase.progress).toBe(100);
            expect(finalReport.uploadPhase.progress).toBe(100);
            expect(finalReport.overallPhase.progress).toBe(100);
        });
    });

    describe('Batch Integration - DELETE Mode', () => {
        it('should NOT call translateVocabularyMeanings in DELETE mode', async () => {
            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                mockOptions
            );

            // Assert
            expect(translateVocabularyMeanings).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.translationResults.successCount).toBe(2);
            expect(result.translationResults.errorCount).toBe(0);
        });

        it('should create translation results with empty synonyms for DELETE mode', async () => {
            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                mockOptions
            );

            // Assert
            expect(result.translationResults.translations).toHaveLength(2);
            expect(result.translationResults.translations[0]).toEqual({
                vocabularyId: 1,
                translatedSynonyms: [],
                error: null
            });
            expect(result.translationResults.translations[1]).toEqual({
                vocabularyId: 2,
                translatedSynonyms: [],
                error: null
            });
        });

        it('should still call upload with empty synonyms in DELETE mode', async () => {
            // Act
            await processVocabularyComplete(
                mockVocabularyItems,
                mockOptions
            );

            // Assert
            expect(uploadVocabularyBatch).toHaveBeenCalledTimes(1);
            expect(uploadVocabularyBatch).toHaveBeenCalledWith(
                [
                    { vocabulary: mockVocabularyItems[0], translatedSynonyms: [] },
                    { vocabulary: mockVocabularyItems[1], translatedSynonyms: [] }
                ],
                { synonymMode: 'delete', apiToken: 'test-api-token' },
                undefined, // stop signal (fresh signal created in processVocabularyComplete)
                expect.any(Function) // progress callback
            );
        });
    });

    describe('Performance Benefits', () => {
        it('should skip DeepL API calls completely in DELETE mode', async () => {
            const smallVocabularyList = Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                characters: `漢字${i}`,
                meanings: [{ meaning: `meaning${i}`, primary: true }]
            }));

            // Mock upload to succeed quickly
            (uploadVocabularyBatch as Mock).mockResolvedValue({
                success: true,
                totalItems: 1,
                createdCount: 0,
                updatedCount: 1,
                errorCount: 0,
                results: [{ vocabularyId: 1, action: 'updated', success: true }],
                errors: []
            });

            // Act
            await processVocabularyStreaming(
                smallVocabularyList,
                mockOptions
            );

            // Assert
            expect(translateVocabularyMeanings).not.toHaveBeenCalled();

            console.log(`✅ DELETE mode processed ${smallVocabularyList.length} items without translation`);
        });
    });
});
