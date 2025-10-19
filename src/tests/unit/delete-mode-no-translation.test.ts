import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { processVocabularyStreaming } from '../../features/vocabulary/lib/vocabulary-streaming-integration';
import { processVocabularyComplete } from '../../features/vocabulary/lib/vocabulary-integration';
import { VocabularyTranslationService } from '../../features/vocabulary/lib/VocabularyTranslationService';
import { WaniKaniUploadService } from '../../shared/processing/services/WaniKaniUploadService';
import { uploadVocabularyBatch } from '../../features/vocabulary/lib/vocabulary-wanikani-upload';
import type { VocabularyItem } from '../../features/vocabulary/lib/vocabulary-translation';

// Mock Services (for streaming)
vi.mock('../../features/vocabulary/lib/VocabularyTranslationService', () => {
    return {
        VocabularyTranslationService: vi.fn()
    };
});

vi.mock('../../shared/processing/services/WaniKaniUploadService', () => {
    return {
        WaniKaniUploadService: vi.fn()
    };
});

// Mock old upload function (for batch)
vi.mock('../../features/vocabulary/lib/vocabulary-wanikani-upload', () => {
    return {
        uploadVocabularyBatch: vi.fn()
    };
});

describe('🗑️ DELETE Mode - No Translation Required', () => {
    const mockOptions = {
        batchSize: 1, // Streaming mode
        synonymMode: 'delete' as const,
        apiToken: 'test-api-token',
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
        }
    ];

    let mockTranslate: Mock;
    let mockUpload: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // DELETE mode returns empty array
        mockTranslate = vi.fn().mockResolvedValue([]);
        mockUpload = vi.fn().mockResolvedValue(true);

        (VocabularyTranslationService as any).mockImplementation(() => ({
            name: 'Vocabulary',
            translate: mockTranslate,
            translateBatch: vi.fn()
        }));

        (WaniKaniUploadService as any).mockImplementation(() => ({
            name: 'WaniKani',
            upload: mockUpload,
            uploadBatch: vi.fn()
        }));
    });

    describe('Streaming Integration - DELETE Mode', () => {
        it('should NOT call translate() in DELETE mode (performance optimization)', async () => {
            // Act
            const result = await processVocabularyStreaming(
                mockVocabularyItems,
                mockOptions
            );

            // Assert - GenericStreamingProcessor skips translation in DELETE mode
            expect(mockTranslate).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.translationCount).toBe(2); // Counted as "translated" for progress
            expect(result.uploadCount).toBe(2);
        });

        it('should upload with empty synonyms in DELETE mode', async () => {
            // Act
            await processVocabularyStreaming(
                mockVocabularyItems,
                mockOptions
            );

            // Assert - upload() called with empty synonyms
            expect(mockUpload).toHaveBeenCalledTimes(2);

            // GenericStreamingProcessor calls upload with (itemId, synonyms)
            // First upload
            expect(mockUpload).toHaveBeenNthCalledWith(
                1,
                1, // vocabularyId
                [] // empty synonyms
            );

            // Second upload
            expect(mockUpload).toHaveBeenNthCalledWith(
                2,
                2, // vocabularyId
                [] // empty synonyms
            );
        });

        it('should report progress correctly in DELETE mode', async () => {
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

            // Should have progress reports showing instant completion
            const finalReport = progressReports[progressReports.length - 1];
            expect(finalReport.translationPhase.progress).toBe(100);
            expect(finalReport.uploadPhase.progress).toBe(100);
            expect(finalReport.overallPhase.progress).toBe(100);
        });
    });

    describe('Batch Integration - DELETE Mode', () => {
        beforeEach(() => {
            // Batch mode uses old uploadVocabularyBatch function
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

        it('should NOT call translate() in DELETE mode', async () => {
            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                { ...mockOptions, batchSize: 10 } // Batch mode
            );

            // Assert - GenericStreamingProcessor skips translation in DELETE mode
            expect(mockTranslate).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.translationResults.successCount).toBe(2);
            expect(result.translationResults.errorCount).toBe(0);
        });

        it('should process with empty synonyms for DELETE mode', async () => {
            // Act
            const result = await processVocabularyComplete(
                mockVocabularyItems,
                { ...mockOptions, batchSize: 10 }
            );

            // Assert
            expect(result.translationResults.translations).toHaveLength(2);

            // Check that all translations have empty synonyms
            result.translationResults.translations.forEach(translation => {
                expect(translation.translatedSynonyms).toEqual([]);
                expect(translation.error).toBeNull();
            });
        });
    });

    describe('Performance Benefits', () => {
        it('should skip translation completely in DELETE mode', async () => {
            const smallVocabularyList: VocabularyItem[] = Array.from({ length: 5 }, (_, i) => ({
                id: i + 1,
                characters: `漢字${i}`,
                meanings: [{ meaning: `meaning${i}`, primary: true }]
            }));

            mockUpload = vi.fn().mockResolvedValue(true);

            (WaniKaniUploadService as any).mockImplementation(() => ({
                name: 'WaniKani',
                upload: mockUpload,
                uploadBatch: vi.fn()
            }));

            // Act
            const result = await processVocabularyStreaming(
                smallVocabularyList,
                mockOptions
            );

            // Assert - No translate() calls (performance optimization)
            expect(mockTranslate).not.toHaveBeenCalled();
            expect(result.translationCount).toBe(5);
            expect(result.uploadCount).toBe(5);

            console.log(`✅ DELETE mode processed ${smallVocabularyList.length} items without translation`);
        });
    });
});
