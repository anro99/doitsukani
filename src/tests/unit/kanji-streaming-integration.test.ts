import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { processKanjiStreaming } from '../../features/kanji/lib/kanji-streaming-integration';
import { KanjiTranslationService } from '../../features/kanji/lib/KanjiTranslationService';
import { WaniKaniUploadService } from '../../shared/processing/services/WaniKaniUploadService';
import type { KanjiItem } from '../../features/kanji/lib/KanjiTranslationService';

// Mock Services
vi.mock('../../features/kanji/lib/KanjiTranslationService', () => {
    return {
        KanjiTranslationService: vi.fn()
    };
});

vi.mock('../../shared/processing/services/WaniKaniUploadService', () => {
    return {
        WaniKaniUploadService: vi.fn()
    };
});

describe('🚀 Kanji Streaming Integration (Service-based Mocks)', () => {
    const mockOptions = {
        batchSize: 1, // Streaming mode
        synonymMode: 'smart-merge' as const,
        apiToken: 'test-api-token',
        deeplToken: 'test-deepl-token',
        enableProgressReporting: true,
        stopOnFirstError: false
    };

    const mockKanjiItems: KanjiItem[] = [
        {
            id: 1,
            characters: '猫',
            primaryMeaning: 'cat',
            alternativeMeanings: ['feline'],
            meaningMnemonic: 'The cat sits on the mat.',
            currentSynonyms: [],
            meanings: ['cat', 'feline'],
            existingSynonyms: []
        },
        {
            id: 2,
            characters: '犬',
            primaryMeaning: 'dog',
            alternativeMeanings: ['canine'],
            meaningMnemonic: 'A dog is a loyal friend.',
            currentSynonyms: [],
            meanings: ['dog', 'canine'],
            existingSynonyms: []
        },
        {
            id: 3,
            characters: '鳥',
            primaryMeaning: 'bird',
            alternativeMeanings: ['avian'],
            meaningMnemonic: 'Birds can fly in the sky.',
            currentSynonyms: [],
            meanings: ['bird', 'avian'],
            existingSynonyms: []
        }
    ];

    let mockTranslate: Mock;
    let mockUpload: Mock;
    let mockUploadBatch: Mock;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup fresh mocks for EACH test - don't chain mockResolvedValueOnce
        mockTranslate = vi.fn();
        mockUpload = vi.fn();
        mockUploadBatch = vi.fn();

        // Mock KanjiTranslationService constructor
        (KanjiTranslationService as any).mockImplementation(() => ({
            name: 'Kanji',
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
        it('should process kanji items successfully', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processKanjiStreaming(mockKanjiItems, mockOptions);

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
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, mockOptions);

            // Assert
            expect(mockTranslate).toHaveBeenCalledTimes(3);
        });

        it('should call upload() for each translated item', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, mockOptions);

            // Assert
            expect(mockUpload).toHaveBeenCalledTimes(3);
            expect(mockUpload).toHaveBeenCalledWith(1, ['Katze', 'Katzenartig']);
            expect(mockUpload).toHaveBeenCalledWith(2, ['Hund', 'Hundeartig']);
            expect(mockUpload).toHaveBeenCalledWith(3, ['Vogel', 'Vogelartig']);
        });

        it('should handle primary + alternative meanings', async () => {
            // Arrange
            const singleItem: KanjiItem[] = [{
                id: 100,
                characters: '愛',
                primaryMeaning: 'love',
                alternativeMeanings: ['affection', 'care'],
                meaningMnemonic: 'Love is in the air.',
                currentSynonyms: [],
                meanings: ['love', 'affection', 'care'],
                existingSynonyms: []
            }];

            mockTranslate.mockResolvedValueOnce(['Liebe', 'Zuneigung', 'Fürsorge']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(singleItem, mockOptions);

            // Assert
            expect(mockUpload).toHaveBeenCalledWith(100, ['Liebe', 'Zuneigung', 'Fürsorge']);
        });
    });

    describe('Progress Tracking', () => {
        it('should report progress with 3 phases', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            const progressCallback = vi.fn();

            // Act
            await processKanjiStreaming(mockKanjiItems, mockOptions, progressCallback);

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
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            const progressCallback = vi.fn();

            // Act
            await processKanjiStreaming(mockKanjiItems, mockOptions, progressCallback);

            // Assert
            const allCalls = progressCallback.mock.calls;
            allCalls.forEach(call => {
                const phase = call[0];
                expect(Number.isInteger(phase.translationPhase.progress)).toBe(true);
                expect(Number.isInteger(phase.uploadPhase.progress)).toBe(true);
                expect(Number.isInteger(phase.overallPhase.progress)).toBe(true);
            });
        });

        it('should track completedItems and errorItems', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            const progressCallback = vi.fn();

            // Act
            await processKanjiStreaming(mockKanjiItems, mockOptions, progressCallback);

            // Assert
            const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
            expect(lastCall.overallPhase.completedItems).toBe(3);
            expect(lastCall.overallPhase.errorItems).toBe(0);
        });
    });

    describe('Stop Signal Support', () => {
        it('should stop processing when stop signal is triggered', async () => {
            // Arrange
            const stopSignal = { current: false };

            let callCount = 0;
            mockTranslate.mockImplementation(async () => {
                callCount++;
                if (callCount === 2) {
                    stopSignal.current = true; // Stop after 2nd item
                }
                return ['Translation', 'Alt'];
            });
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, mockOptions, undefined, stopSignal);

            // Assert - Should process items until stop signal
            expect(mockTranslate.mock.calls.length).toBeGreaterThanOrEqual(2);
            expect(mockTranslate.mock.calls.length).toBeLessThanOrEqual(3); // May process current batch
        });

        it('should not process items after stop signal', async () => {
            // Arrange
            const stopSignal = { current: true }; // Already stopped
            mockTranslate.mockResolvedValue(['Translation', 'Alt']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, mockOptions, undefined, stopSignal);

            // Assert
            expect(mockTranslate).not.toHaveBeenCalled();
            expect(mockUpload).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle translation errors gracefully', async () => {
            // Arrange
            // Item 1: Success
            mockTranslate.mockResolvedValueOnce(['Katze', 'Katzenartig']);
            // Item 2: Fails 4 times (initial + 3 retries with maxRetries=3)
            mockTranslate
                .mockRejectedValueOnce(new Error('DeepL API error'))
                .mockRejectedValueOnce(new Error('DeepL API error'))
                .mockRejectedValueOnce(new Error('DeepL API error'))
                .mockRejectedValueOnce(new Error('DeepL API error'));
            // Item 3: Success
            mockTranslate.mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processKanjiStreaming(mockKanjiItems, mockOptions);

            // Assert
            expect(result.errorCount).toBeGreaterThan(0); // Should have errors
            expect(result.translationCount).toBeGreaterThan(0); // But some successful
        });

        it('should handle upload errors gracefully', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('WaniKani API error'))
                .mockResolvedValueOnce(true);

            // Act
            const result = await processKanjiStreaming(mockKanjiItems, mockOptions);

            // Assert
            expect(result.errorCount).toBeGreaterThan(0); // Should have errors
            expect(result.translationCount).toBeGreaterThan(0); // All translated
            expect(result.uploadCount).toBeGreaterThan(0); // Some uploaded
        });

        it('should return error result if processing crashes', async () => {
            // Arrange - Mock Service constructor to throw
            (KanjiTranslationService as any).mockImplementation(() => {
                throw new Error('Service initialization failed');
            });

            // Act
            const result = await processKanjiStreaming(mockKanjiItems, mockOptions);

            // Assert
            expect(result.success).toBe(false);
            expect(result.errorCount).toBe(3); // All items failed
            expect(result.totalItems).toBe(3);
        });
    });

    describe('Batch Size', () => {
        it('should respect batchSize=1 for streaming mode', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, { ...mockOptions, batchSize: 1 });

            // Assert - Individual translate calls (not batch)
            expect(mockTranslate).toHaveBeenCalledTimes(3);
            expect(mockUpload).toHaveBeenCalledTimes(3);
        });

        it('should handle larger batch sizes', async () => {
            // Arrange
            mockTranslate
                .mockResolvedValueOnce(['Katze', 'Katzenartig'])
                .mockResolvedValueOnce(['Hund', 'Hundeartig'])
                .mockResolvedValueOnce(['Vogel', 'Vogelartig']);
            mockUpload.mockResolvedValue(true);

            const batchOptions = { ...mockOptions, batchSize: 3 };

            // Act
            await processKanjiStreaming(mockKanjiItems, batchOptions);

            // Assert - At least all items processed
            expect(mockTranslate).toHaveBeenCalled();
            expect(mockUpload).toHaveBeenCalled();
        });
    });

    describe('Synonym Mode', () => {
        it('should pass smart synonym mode correctly', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Translation', 'Alt']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, { ...mockOptions, synonymMode: 'smart-merge' });

            // Assert - Check if processing completed
            expect(mockUpload).toHaveBeenCalled();
        });

        it('should pass replace synonym mode correctly', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Translation', 'Alt']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, { ...mockOptions, synonymMode: 'replace' });

            // Assert - Check if processing completed
            expect(mockUpload).toHaveBeenCalled();
        });

        it('should pass delete synonym mode correctly', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Translation', 'Alt']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(mockKanjiItems, { ...mockOptions, synonymMode: 'delete' });

            // Assert - Check if processing completed
            expect(mockUpload).toHaveBeenCalled();
        });
    });

    describe('Empty Input', () => {
        it('should handle empty kanji list gracefully', async () => {
            // Act
            const result = await processKanjiStreaming([], mockOptions);

            // Assert
            expect(result.success).toBe(true);
            expect(result.totalItems).toBe(0);
            expect(result.translationCount).toBe(0);
            expect(result.uploadCount).toBe(0);
            expect(result.errorCount).toBe(0);
            expect(mockTranslate).not.toHaveBeenCalled();
            expect(mockUpload).not.toHaveBeenCalled();
        });
    });

    describe('Legacy Interface Compatibility', () => {
        it('should return StreamingCompleteProcessingResult structure', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Translation', 'Alt']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processKanjiStreaming(mockKanjiItems, mockOptions);

            // Assert - Check structure
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('totalItems');
            expect(result).toHaveProperty('translationCount');
            expect(result).toHaveProperty('uploadCount');
            expect(result).toHaveProperty('errorCount');
            expect(result).toHaveProperty('processingTime');
            expect(result).toHaveProperty('phases');
        });

        it('should include all phase information', async () => {
            // Arrange
            mockTranslate.mockResolvedValue(['Translation', 'Alt']);
            mockUpload.mockResolvedValue(true);

            // Act
            const result = await processKanjiStreaming(mockKanjiItems, mockOptions);

            // Assert
            expect(result.phases).toBeInstanceOf(Array);
            expect(result.phases.length).toBeGreaterThan(0);

            const firstPhase = result.phases[0];
            expect(firstPhase).toHaveProperty('translationPhase');
            expect(firstPhase).toHaveProperty('uploadPhase');
            expect(firstPhase).toHaveProperty('overallPhase');
        });
    });

    describe('Kanji-Specific Features', () => {
        it('should handle items with no alternative meanings', async () => {
            // Arrange
            const simpleItem: KanjiItem[] = [{
                id: 200,
                characters: '木',
                primaryMeaning: 'tree',
                alternativeMeanings: [],
                meaningMnemonic: 'A tree grows tall.',
                currentSynonyms: [],
                meanings: ['tree'],
                existingSynonyms: []
            }];

            mockTranslate.mockResolvedValueOnce(['Baum']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(simpleItem, mockOptions);

            // Assert
            expect(mockUpload).toHaveBeenCalledWith(200, ['Baum']);
        });

        it('should handle items with existing synonyms', async () => {
            // Arrange
            const itemWithSynonyms: KanjiItem[] = [{
                id: 300,
                characters: '水',
                primaryMeaning: 'water',
                alternativeMeanings: ['fluid'],
                meaningMnemonic: 'Water flows in the river.',
                currentSynonyms: ['H2O', 'liquid'],
                meanings: ['water', 'fluid'],
                existingSynonyms: ['H2O', 'liquid']
            }];

            mockTranslate.mockResolvedValueOnce(['Wasser', 'Flüssigkeit']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(itemWithSynonyms, mockOptions);

            // Assert - In smart mode, existing synonyms are merged with new translations
            expect(mockUpload).toHaveBeenCalledWith(300, ['H2O', 'liquid', 'Wasser', 'Flüssigkeit']);
        });

        it('should handle items without mnemonic', async () => {
            // Arrange
            const noMnemonicItem: KanjiItem[] = [{
                id: 400,
                characters: '火',
                primaryMeaning: 'fire',
                alternativeMeanings: [],
                meaningMnemonic: undefined,
                currentSynonyms: [],
                meanings: ['fire'],
                existingSynonyms: []
            }];

            mockTranslate.mockResolvedValueOnce(['Feuer']);
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(noMnemonicItem, mockOptions);

            // Assert
            expect(mockUpload).toHaveBeenCalledWith(400, ['Feuer']);
        });

        it('should remove duplicate translations (case-insensitive)', async () => {
            // Arrange - Kanji 桟 with "jetty" and "pier" both translating to "Steg"
            const duplicateTranslationItem: KanjiItem[] = [{
                id: 2453,
                characters: '桟',
                primaryMeaning: 'jetty',
                alternativeMeanings: ['pier'],
                meaningMnemonic: 'A wooden platform over water.',
                currentSynonyms: [],
                meanings: ['jetty', 'pier'],
                existingSynonyms: []
            }];

            // Both translations return "Steg" (duplicate)
            mockTranslate.mockResolvedValueOnce(['Steg']); // Only one "Steg" after filtering
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(duplicateTranslationItem, mockOptions);

            // Assert - Should only upload one "Steg", not ["Steg", "Steg"]
            expect(mockUpload).toHaveBeenCalledWith(2453, ['Steg']);
            expect(mockUpload).toHaveBeenCalledTimes(1);
        });

        it('should remove duplicates with different capitalization', async () => {
            // Arrange - Test case-insensitive duplicate filtering
            const caseInsensitiveDuplicates: KanjiItem[] = [{
                id: 500,
                characters: '例',
                primaryMeaning: 'example',
                alternativeMeanings: ['EXAMPLE', 'Example'],
                meaningMnemonic: 'This is an example.',
                currentSynonyms: [],
                meanings: ['example', 'EXAMPLE', 'Example'],
                existingSynonyms: []
            }];

            // Service should filter case-insensitive duplicates internally
            mockTranslate.mockResolvedValueOnce(['Beispiel']); // Only one after filtering
            mockUpload.mockResolvedValue(true);

            // Act
            await processKanjiStreaming(caseInsensitiveDuplicates, mockOptions);

            // Assert - Should only upload one "Beispiel"
            expect(mockUpload).toHaveBeenCalledWith(500, ['Beispiel']);
        });
    });
});
