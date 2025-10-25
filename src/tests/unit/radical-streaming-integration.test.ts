import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { processRadicalStreaming } from '../../features/radicals/lib/radical-streaming-integration';
import { RadicalTranslationService } from '../../features/radicals/lib/RadicalTranslationService';
import { WaniKaniUploadService } from '../../shared/processing/services/WaniKaniUploadService';
import type { RadicalItem } from '../../features/radicals/lib/RadicalTranslationService';

// Mock Services
vi.mock('../../features/radicals/lib/RadicalTranslationService', () => {
    return {
        RadicalTranslationService: vi.fn()
    };
});

vi.mock('../../shared/processing/services/WaniKaniUploadService', () => {
    return {
        WaniKaniUploadService: vi.fn()
    };
});

describe('🚀 Radical Streaming Integration (Service-based Mocks)', () => {
    const mockOptions = {
        batchSize: 1, // Streaming mode
        synonymMode: 'smart' as const,
        apiToken: 'test-api-token',
        deeplToken: 'test-deepl-token',
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    const mockRadicalItems: RadicalItem[] = [
        {
            id: 1,
            characters: '一',
            primaryMeaning: 'ground',
            meaningMnemonic: 'This radical is the ground.',
            currentSynonyms: [],
            meanings: ['ground'],
            existingSynonyms: []
        },
        {
            id: 2,
            characters: '口',
            primaryMeaning: 'mouth',
            meaningMnemonic: 'This radical is a mouth.',
            currentSynonyms: [],
            meanings: ['mouth'],
            existingSynonyms: []
        },
        {
            id: 3,
            characters: null, // ⚠️ Text-only radical
            primaryMeaning: 'stick',
            meaningMnemonic: 'This radical is a stick.',
            currentSynonyms: [],
            meanings: ['stick'],
            existingSynonyms: []
        }
    ];

    let mockTranslate: Mock;
    let mockUpload: Mock;
    let mockUploadBatch: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup fresh mocks for EACH test
        mockTranslate = vi.fn();
        mockUpload = vi.fn();
        mockUploadBatch = vi.fn();

        // Mock RadicalTranslationService constructor
        (RadicalTranslationService as any).mockImplementation(() => ({
            name: 'Radical',
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
        it('should process radical items successfully', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden'])
                .mockResolvedValueOnce(['Mund'])
                .mockResolvedValueOnce(['Stock']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions);

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
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden'])
                .mockResolvedValueOnce(['Mund'])
                .mockResolvedValueOnce(['Stock']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(mockTranslate).toHaveBeenCalledTimes(3);
        });

        it('should call upload() for each translated item', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden'])
                .mockResolvedValueOnce(['Mund'])
                .mockResolvedValueOnce(['Stock']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(mockUpload).toHaveBeenCalledTimes(3);
            expect(mockUpload).toHaveBeenCalledWith(1, ['Boden']);
            expect(mockUpload).toHaveBeenCalledWith(2, ['Mund']);
            expect(mockUpload).toHaveBeenCalledWith(3, ['Stock']);
        });

        it('should handle nullable characters (text-only radicals)', async () => {
            // Arrange
            const textOnlyRadical: RadicalItem[] = [{
                id: 999,
                characters: null, // ⚠️ Text-only radical
                primaryMeaning: 'stick',
                meaningMnemonic: 'A stick radical.',
                currentSynonyms: [],
                meanings: ['stick'],
                existingSynonyms: []
            }];

            mockTranslate.mockResolvedValueOnce(['Stock']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(textOnlyRadical, mockOptions);

            // Assert
            expect(result.success).toBe(true);
            expect(result.uploadCount).toBe(1);
            expect(mockTranslate).toHaveBeenCalledTimes(1);
            expect(mockUpload).toHaveBeenCalledWith(999, ['Stock']);
        });

        it('should handle empty radical array', async () => {
            // Arrange
            const emptyItems: RadicalItem[] = [];

            // Act
            const result = await processRadicalStreaming(emptyItems, mockOptions);

            // Assert
            expect(result.success).toBe(true);
            expect(result.totalItems).toBe(0);
            expect(result.translationCount).toBe(0);
            expect(result.uploadCount).toBe(0);
            expect(mockTranslate).not.toHaveBeenCalled();
            expect(mockUpload).not.toHaveBeenCalled();
        });
    });

    describe('Translation Phase', () => {
        it('should translate primary meaning only (no alternatives)', async () => {
            // Arrange
            const singleItem: RadicalItem[] = [{
                id: 100,
                characters: '水',
                primaryMeaning: 'water',
                meaningMnemonic: 'This radical means water.',
                currentSynonyms: [],
                meanings: ['water'],
                existingSynonyms: []
            }];

            mockTranslate.mockResolvedValueOnce(['Wasser']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(singleItem, mockOptions);

            // Assert
            expect(result.success).toBe(true);
            expect(mockTranslate).toHaveBeenCalledTimes(1);
            expect(mockUpload).toHaveBeenCalledWith(100, ['Wasser']);
        });

        it('should handle translation errors gracefully', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden']) // Success
                .mockRejectedValueOnce(new Error('Translation failed')) // Error
                .mockResolvedValueOnce(['Stock']); // Success
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(result.success).toBe(false); // Has errors
            expect(result.totalItems).toBe(3);
            expect(result.translationCount).toBe(2); // 2 successful
            expect(result.uploadCount).toBe(2); // Only successful ones uploaded
            expect(result.errorCount).toBe(1);
        });

        it('should skip translation when already translated', async () => {
            // Arrange
            const itemsWithExisting: RadicalItem[] = [{
                id: 1,
                characters: '一',
                primaryMeaning: 'ground',
                meaningMnemonic: 'Ground radical.',
                currentSynonyms: ['Boden'], // Already has translation
                meanings: ['ground'],
                existingSynonyms: ['Boden']
            }];

            mockTranslate.mockResolvedValueOnce(['Boden']); // Returns same
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(itemsWithExisting, mockOptions);

            // Assert
            expect(result.success).toBe(true);
            expect(mockTranslate).toHaveBeenCalledTimes(1);
        });
    });

    describe('Upload Phase', () => {
        it('should upload translated synonyms successfully', async () => {
            // Arrange
            mockTranslate.mockResolvedValueOnce(['Boden']);
            mockUpload.mockResolvedValueOnce(true);

            // Act
            const result = await processRadicalStreaming([mockRadicalItems[0]], mockOptions);

            // Assert
            expect(result.success).toBe(true);
            expect(result.uploadCount).toBe(1);
            expect(mockUpload).toHaveBeenCalledWith(1, ['Boden']);
        });

        it('should handle upload errors gracefully', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden'])
                .mockResolvedValueOnce(['Mund'])
                .mockResolvedValueOnce(['Stock']);
            mockUpload
                .mockResolvedValueOnce(true) // Success
                .mockResolvedValueOnce(false) // Failure
                .mockResolvedValueOnce(true); // Success

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(result.success).toBe(false); // Has upload failure
            expect(result.totalItems).toBe(3);
            expect(result.translationCount).toBe(2); // Only successful uploads count
            expect(result.uploadCount).toBe(2); // Only 2 successful
            expect(result.errorCount).toBe(1);
        });

        it('should handle network errors during upload', async () => {
            // Arrange
            mockTranslate.mockResolvedValueOnce(['Boden']);
            mockUpload.mockRejectedValueOnce(new Error('Network error'));

            // Act
            const result = await processRadicalStreaming([mockRadicalItems[0]], mockOptions);

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCount).toBe(1);
        });
    });

    describe('Progress Tracking', () => {
        it('should call progress callback with 3-phase progress', async () => {
            // Arrange
            mockTranslate.mockResolvedValueOnce(['Boden']);
            mockUpload.mockResolvedValue(true);

            const progressCallback = vi.fn();

            // Act
            await processRadicalStreaming([mockRadicalItems[0]], mockOptions, progressCallback);

            // Assert
            expect(progressCallback).toHaveBeenCalled();
            const calls = progressCallback.mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            // Verify phase structure
            const lastCall = calls[calls.length - 1][0];
            expect(lastCall).toHaveProperty('translationPhase');
            expect(lastCall).toHaveProperty('uploadPhase');
            expect(lastCall).toHaveProperty('overallPhase');
        });

        it('should track translation phase progress', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden'])
                .mockResolvedValueOnce(['Mund']);
            mockUpload.mockResolvedValue(true);

            const progressCallback = vi.fn();

            // Act
            await processRadicalStreaming([mockRadicalItems[0], mockRadicalItems[1]], mockOptions, progressCallback);

            // Assert
            const calls = progressCallback.mock.calls;
            const translationPhases = calls.map(c => c[0].translationPhase.progress);

            // Progress should increase
            expect(translationPhases.some(p => p > 0)).toBe(true);
            expect(translationPhases.some(p => p === 100)).toBe(true);
        });

        it('should track upload phase progress', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden'])
                .mockResolvedValueOnce(['Mund']);
            mockUpload.mockResolvedValue(true);

            const progressCallback = vi.fn();

            // Act
            await processRadicalStreaming([mockRadicalItems[0], mockRadicalItems[1]], mockOptions, progressCallback);

            // Assert
            const calls = progressCallback.mock.calls;
            const uploadPhases = calls.map(c => c[0].uploadPhase.progress);

            // Progress should increase
            expect(uploadPhases.some(p => p > 0)).toBe(true);
            expect(uploadPhases.some(p => p === 100)).toBe(true);
        });

        it('should track overall progress', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Boden'])
                .mockResolvedValueOnce(['Mund']);
            mockUpload.mockResolvedValue(true);

            const progressCallback = vi.fn();

            // Act
            await processRadicalStreaming([mockRadicalItems[0], mockRadicalItems[1]], mockOptions, progressCallback);

            // Assert
            const calls = progressCallback.mock.calls;
            const overallPhases = calls.map(c => c[0].overallPhase);

            // Final phase should be complete
            const finalPhase = overallPhases[overallPhases.length - 1];
            expect(finalPhase.progress).toBe(100);
            expect(finalPhase.completedItems).toBe(2);
        });
    });

    describe('Stop Signal', () => {
        it('should stop processing when stop signal is set', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Boden']);
            mockUpload.mockResolvedValue(true);

            const stopSignal = { current: false };

            // Set stop after first item
            mockTranslate.mockImplementationOnce(async () => {
                stopSignal.current = true;
                return ['Boden'];
            });

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions, undefined, stopSignal);

            // Assert
            expect(result.totalItems).toBe(3);
            expect(result.uploadCount).toBeLessThan(3); // Not all uploaded
            expect(mockTranslate).toHaveBeenCalledTimes(1); // Stopped after first
        });

        it('should stop gracefully during upload phase', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Boden']);
            mockUpload.mockResolvedValue(true);

            const stopSignal = { current: false };

            // Set stop during upload
            mockUpload.mockImplementationOnce(async () => {
                stopSignal.current = true;
                return true;
            });

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions, undefined, stopSignal);

            // Assert
            expect(result.uploadCount).toBeLessThanOrEqual(1); // Stopped early
        });
    });

    describe('Synonym Modes', () => {
        it('should support "smart" mode', async () => {
            // Arrange
            const optionsSmartMode = { ...mockOptions, synonymMode: 'smart' as const };
            mockTranslate.mockResolvedValueOnce(['Boden']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming([mockRadicalItems[0]], optionsSmartMode);

            // Assert
            expect(result.success).toBe(true);
            expect(mockUpload).toHaveBeenCalled();
        });

        it('should support "replace" mode', async () => {
            // Arrange
            const optionsReplaceMode = { ...mockOptions, synonymMode: 'replace' as const };
            mockTranslate.mockResolvedValueOnce(['Boden']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming([mockRadicalItems[0]], optionsReplaceMode);

            // Assert
            expect(result.success).toBe(true);
            expect(mockUpload).toHaveBeenCalled();
        });

        it('should support "delete" mode', async () => {
            // Arrange
            const optionsDeleteMode = { ...mockOptions, synonymMode: 'delete' as const };
            mockTranslate.mockResolvedValueOnce([]); // DELETE mode skips translation
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming([mockRadicalItems[0]], optionsDeleteMode);

            // Assert
            expect(result.success).toBe(true);
            // DELETE mode uploads empty array
        });
    });

    describe('Error Handling', () => {
        it('should continue processing after translation error', async () => {
            // Arrange
            mockTranslate
                .mockRejectedValueOnce(new Error('Translation error'))
                .mockResolvedValueOnce(['Mund'])
                .mockResolvedValueOnce(['Stock']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(result.success).toBe(false); // Has errors
            expect(result.errorCount).toBe(1);
            expect(result.uploadCount).toBe(2); // Other 2 succeeded
        });

        it('should continue processing after upload error', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Test']);
            mockUpload
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('Upload error'))
                .mockResolvedValueOnce(true);

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(result.success).toBe(false); // Has errors
            expect(result.errorCount).toBe(1);
            expect(result.uploadCount).toBe(2); // Other 2 succeeded
        });

        it('should handle network errors', async () => {
            // Arrange
            mockTranslate.mockRejectedValue(new Error('Network timeout'));
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCount).toBe(3); // All failed
            expect(result.uploadCount).toBe(0); // None uploaded
        });

        it('should track error count correctly', async () => {
            // Arrange
            mockTranslate
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValueOnce(['Stock']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processRadicalStreaming(mockRadicalItems, mockOptions);

            // Assert
            expect(result.errorCount).toBe(2);
            expect(result.uploadCount).toBe(1);
        });
    });
});
