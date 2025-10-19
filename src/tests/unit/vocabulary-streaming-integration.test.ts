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

describe('🚀 Vocabulary Streaming Integration (Service-based Mocks)', () => {
    const mockOptions = {
        batchSize: 1, // Streaming mode
        synonymMode: 'smart-merge' as const,
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
        },
        {
            id: 3,
            characters: '鳥',
            meanings: [{ meaning: 'bird', primary: true }]
        }
    ];

    let mockTranslate: Mock;
    let mockUpload: Mock;
    let mockUploadBatch: Mock;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default mocks
        mockTranslate = vi.fn()
            .mockResolvedValueOnce(['Katze'])
            .mockResolvedValueOnce(['Hund'])
            .mockResolvedValueOnce(['Vogel']);
        
        mockUpload = vi.fn().mockResolvedValue(true);
        mockUploadBatch = vi.fn().mockResolvedValue([true, true, true]);

        // Mock VocabularyTranslationService constructor
        (VocabularyTranslationService as any).mockImplementation(() => ({
            name: 'Vocabulary',
            translate: mockTranslate,
            translateBatch: vi.fn()
        }));

        // Mock WaniKaniUploadService constructor
        (WaniKaniUploadService as any).mockImplementation(() => ({
            name: 'WaniKani',
            upload: mockUpload,
            uploadBatch: mockUploadBatch
        }));
    });

    describe('Basic Processing', () => {
        it('should process vocabulary items successfully', async () => {
            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert - Result structure
            expect(result.success).toBe(true);
            expect(result.totalItems).toBe(3);
            expect(result.translationCount).toBe(3);
            expect(result.uploadCount).toBe(3);
            expect(result.errorCount).toBe(0);
            expect(result.processingTime).toBeGreaterThan(0);
            expect(result.phases).toBeInstanceOf(Array);
        });

        it('should call translate() for each item', async () => {
            // Act
            await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert
            expect(mockTranslate).toHaveBeenCalledTimes(3);
        });

        it('should call upload() for each translated item', async () => {
            // Act
            await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert
            expect(mockUpload).toHaveBeenCalledTimes(3);
            expect(mockUpload).toHaveBeenCalledWith(1, ['Katze']);
            expect(mockUpload).toHaveBeenCalledWith(2, ['Hund']);
            expect(mockUpload).toHaveBeenCalledWith(3, ['Vogel']);
        });
    });

    describe('Progress Tracking', () => {
        it('should report progress with 3 phases', async () => {
            // Arrange
            const progressCallback = vi.fn();

            // Act
            await processVocabularyStreaming(mockVocabularyItems, mockOptions, progressCallback);

            // Assert
            expect(progressCallback).toHaveBeenCalled();
            
            const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
            expect(lastCall).toMatchObject({
                translationPhase: expect.objectContaining({
                    phase: 'translation',
                    status: expect.any(String),
                    progress: expect.any(Number)
                }),
                uploadPhase: expect.objectContaining({
                    phase: 'upload',
                    status: expect.any(String),
                    progress: expect.any(Number)
                }),
                overallPhase: expect.objectContaining({
                    phase: 'both',
                    status: expect.any(String),
                    progress: expect.any(Number),
                    completedItems: 3
                })
            });
        });

        it('should report rounded progress percentages', async () => {
            // Arrange
            const progressCallback = vi.fn();

            // Act
            await processVocabularyStreaming(mockVocabularyItems, mockOptions, progressCallback);

            // Assert
            const calls = progressCallback.mock.calls;
            calls.forEach(([phase]) => {
                // All progress values should be integers (rounded)
                expect(Number.isInteger(phase.translationPhase.progress)).toBe(true);
                expect(Number.isInteger(phase.uploadPhase.progress)).toBe(true);
                expect(Number.isInteger(phase.overallPhase.progress)).toBe(true);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle translation errors gracefully', async () => {
            // Arrange
            mockTranslate = vi.fn()
                .mockResolvedValueOnce(['Katze'])
                .mockRejectedValueOnce(new Error('Translation failed'))
                .mockResolvedValueOnce(['Vogel']);

            (VocabularyTranslationService as any).mockImplementation(() => ({
                name: 'Vocabulary',
                translate: mockTranslate,
                translateBatch: vi.fn()
            }));

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert
            expect(result.success).toBe(false); // Has errors
            expect(result.errorCount).toBeGreaterThan(0);
            expect(result.translationCount).toBeLessThan(3); // Not all succeeded
        });

        it('should handle upload errors gracefully', async () => {
            // Arrange
            mockUpload = vi.fn()
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false) // Upload fails
                .mockResolvedValueOnce(true);

            (WaniKaniUploadService as any).mockImplementation(() => ({
                name: 'WaniKani',
                upload: mockUpload,
                uploadBatch: mockUploadBatch
            }));

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert
            expect(result.success).toBe(false); // Has errors
            expect(result.errorCount).toBeGreaterThan(0);
        });
    });

    describe('Stop Signal', () => {
        it('should respect stop signal', async () => {
            // Arrange
            const stopSignal = { current: false };
            
            // Stop after first item
            mockTranslate = vi.fn().mockImplementation(async () => {
                stopSignal.current = true;
                return ['Katze'];
            });

            (VocabularyTranslationService as any).mockImplementation(() => ({
                name: 'Vocabulary',
                translate: mockTranslate,
                translateBatch: vi.fn()
            }));

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, mockOptions, undefined, stopSignal);

            // Assert
            expect(result.success).toBe(false); // Stopped = not successful
            expect(result.uploadCount).toBeLessThan(3); // Should stop before all items
        });
    });

    describe('DELETE Mode', () => {
        it('should handle DELETE mode (empty synonyms)', async () => {
            // Arrange
            mockTranslate = vi.fn().mockResolvedValue([]); // DELETE returns empty array

            (VocabularyTranslationService as any).mockImplementation(() => ({
                name: 'Vocabulary',
                translate: mockTranslate,
                translateBatch: vi.fn()
            }));

            const deleteOptions = { ...mockOptions, synonymMode: 'delete' as const };

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, deleteOptions);

            // Assert
            expect(result.success).toBe(true);
            expect(mockUpload).toHaveBeenCalledTimes(3);
            // All uploads should be with empty arrays
            expect(mockUpload).toHaveBeenCalledWith(1, []);
            expect(mockUpload).toHaveBeenCalledWith(2, []);
            expect(mockUpload).toHaveBeenCalledWith(3, []);
        });
    });
});
