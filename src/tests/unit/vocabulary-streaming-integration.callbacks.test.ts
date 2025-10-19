import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { processVocabularyStreaming } from '../../features/vocabulary/lib/vocabulary-streaming-integration';
import { VocabularyTranslationService } from '../../features/vocabulary/lib/VocabularyTranslationService';
import { WaniKaniUploadService } from '../../shared/processing/services/WaniKaniUploadService';
import type { VocabularyItem } from '../../features/vocabulary/lib/vocabulary-translation';

// Mock Services
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

describe('🔄 Vocabulary Streaming Callbacks', () => {
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
    let onItemUpdated: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup callback mocks
        onItemUpdated = vi.fn();

        // Setup service mocks
        mockTranslate = vi.fn()
            .mockResolvedValueOnce(['Katze'])
            .mockResolvedValueOnce(['Hund']);

        mockUpload = vi.fn().mockResolvedValue(true);

        (VocabularyTranslationService as any).mockImplementation(() => ({
            name: 'Vocabulary',
            translate: mockTranslate,
            translateBatch: vi.fn()
        }));

        (WaniKaniUploadService as any).mockImplementation(() => ({
            name: 'WaniKani',
            upload: mockUpload,
            uploadBatch: vi.fn().mockResolvedValue([true, true])
        }));
    });

    describe('onItemUpdated Callback', () => {
        it('should call onItemUpdated after successful upload', async () => {
            // Arrange
            const options = {
                batchSize: 1,
                synonymMode: 'smart-merge' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemUpdated
            };

            // Act
            await processVocabularyStreaming(mockVocabularyItems, options);

            // Assert - onItemUpdated should be called for each successful item
            expect(onItemUpdated).toHaveBeenCalledTimes(2);

            // First item
            expect(onItemUpdated).toHaveBeenNthCalledWith(
                1,
                expect.objectContaining({ id: 1, characters: '猫' }),
                expect.objectContaining({
                    vocabularyId: 1,
                    success: true,
                    translatedSynonyms: ['Katze'],
                    uploadedSynonyms: ['Katze']
                })
            );

            // Second item
            expect(onItemUpdated).toHaveBeenNthCalledWith(
                2,
                expect.objectContaining({ id: 2, characters: '犬' }),
                expect.objectContaining({
                    vocabularyId: 2,
                    success: true,
                    translatedSynonyms: ['Hund'],
                    uploadedSynonyms: ['Hund']
                })
            );
        });

        it('should call onItemUpdated immediately after each upload (live updates)', async () => {
            // Arrange
            const callOrder: string[] = [];

            mockUpload = vi.fn().mockImplementation(async (itemId: number) => {
                callOrder.push(`upload-${itemId}`);
                return true;
            });

            onItemUpdated = vi.fn().mockImplementation((item: VocabularyItem) => {
                callOrder.push(`callback-${item.id}`);
            });

            (WaniKaniUploadService as any).mockImplementation(() => ({
                name: 'WaniKani',
                upload: mockUpload,
                uploadBatch: vi.fn()
            }));

            const options = {
                batchSize: 1,
                synonymMode: 'smart-merge' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemUpdated
            };

            // Act
            await processVocabularyStreaming(mockVocabularyItems, options);

            // Assert - Callbacks should happen immediately after upload (streaming)
            expect(callOrder).toEqual([
                'upload-1',
                'callback-1',
                'upload-2',
                'callback-2'
            ]);
        });

        it('should NOT call onItemUpdated if upload fails', async () => {
            // Arrange
            mockUpload = vi.fn()
                .mockResolvedValueOnce(true)  // First upload succeeds
                .mockResolvedValueOnce(false); // Second upload fails

            (WaniKaniUploadService as any).mockImplementation(() => ({
                name: 'WaniKani',
                upload: mockUpload,
                uploadBatch: vi.fn()
            }));

            const options = {
                batchSize: 1,
                synonymMode: 'smart-merge' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemUpdated
            };

            // Act
            await processVocabularyStreaming(mockVocabularyItems, options);

            // Assert - Only called for successful upload
            expect(onItemUpdated).toHaveBeenCalledTimes(1);
            expect(onItemUpdated).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1 }),
                expect.anything()
            );
        });

        it('should not duplicate onItemUpdated calls', async () => {
            // Arrange
            const options = {
                batchSize: 1,
                synonymMode: 'smart-merge' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemUpdated
            };

            // Act
            await processVocabularyStreaming(mockVocabularyItems, options);

            // Assert - Each item should trigger callback exactly once
            expect(onItemUpdated).toHaveBeenCalledTimes(2);

            // Check no duplicates
            const callIds = onItemUpdated.mock.calls.map(call => call[0].id);
            const uniqueIds = [...new Set(callIds)];
            expect(callIds.length).toBe(uniqueIds.length);
        });
    });

    describe('Callback Error Handling', () => {
        it('should continue processing if onItemUpdated throws error', async () => {
            // Arrange
            onItemUpdated = vi.fn()
                .mockImplementationOnce(() => {
                    throw new Error('Callback error');
                })
                .mockImplementationOnce(() => {
                    // Second call succeeds
                });

            const options = {
                batchSize: 1,
                synonymMode: 'smart-merge' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemUpdated
            };

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, options);

            // Assert - Processing should continue despite callback error
            expect(result.success).toBe(true);
            expect(result.uploadCount).toBe(2);
            expect(onItemUpdated).toHaveBeenCalledTimes(2);
        });

        it('should handle callback being undefined gracefully', async () => {
            // Arrange
            const options = {
                batchSize: 1,
                synonymMode: 'smart-merge' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false
                // No callbacks defined
            };

            // Act & Assert - Should not throw
            await expect(
                processVocabularyStreaming(mockVocabularyItems, options)
            ).resolves.toBeDefined();
        });
    });

    describe('DELETE Mode Callbacks', () => {
        it('should call onItemUpdated with empty synonyms in DELETE mode', async () => {
            // Arrange
            mockTranslate = vi.fn().mockResolvedValue([]); // DELETE returns empty

            (VocabularyTranslationService as any).mockImplementation(() => ({
                name: 'Vocabulary',
                translate: mockTranslate,
                translateBatch: vi.fn()
            }));

            const options = {
                batchSize: 1,
                synonymMode: 'delete' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemUpdated
            };

            // Act
            await processVocabularyStreaming(mockVocabularyItems, options);

            // Assert
            expect(onItemUpdated).toHaveBeenCalledTimes(2);
            expect(onItemUpdated).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1 }),
                expect.objectContaining({
                    translatedSynonyms: [],
                    uploadedSynonyms: []
                })
            );
        });
    });

    describe('Progress + Callbacks Integration', () => {
        it('should call both onProgress and onItemUpdated', async () => {
            // Arrange
            const onProgress = vi.fn();

            const options = {
                batchSize: 1,
                synonymMode: 'smart-merge' as const,
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemUpdated
            };

            // Act
            await processVocabularyStreaming(mockVocabularyItems, options, onProgress);

            // Assert
            expect(onProgress).toHaveBeenCalled();
            expect(onItemUpdated).toHaveBeenCalledTimes(2);
        });
    });
});
