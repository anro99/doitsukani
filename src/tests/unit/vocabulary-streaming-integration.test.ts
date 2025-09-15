import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('../../lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn()
}));

vi.mock('../../lib/vocabulary-wanikani-upload', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../lib/vocabulary-wanikani-upload')>();
    return {
        ...actual,
        uploadVocabularyBatch: vi.fn()
    };
});

import { processVocabularyStreaming } from '../../lib/vocabulary-streaming-integration';
import { translateVocabularyMeanings } from '../../lib/vocabulary-translation';
import { uploadVocabularyBatch } from '../../lib/vocabulary-wanikani-upload';

describe('🚀 Phase 2: Streaming Vocabulary Integration (TDD)', () => {
    const mockOptions = {
        batchSize: 10,
        synonymMode: 'smart-merge' as const,
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

    describe('processVocabularyStreaming', () => {
        it('should process vocabulary items with immediate upload after each translation', async () => {
            // Arrange
            vi.mocked(translateVocabularyMeanings)
                .mockResolvedValueOnce({
                    vocabularyId: 1,
                    originalMeanings: ['cat'],
                    translatedSynonyms: ['Katze'],
                    selected: true
                })
                .mockResolvedValueOnce({
                    vocabularyId: 2,
                    originalMeanings: ['dog'],
                    translatedSynonyms: ['Hund'],
                    selected: true
                })
                .mockResolvedValueOnce({
                    vocabularyId: 3,
                    originalMeanings: ['bird'],
                    translatedSynonyms: ['Vogel'],
                    selected: true
                });

            vi.mocked(uploadVocabularyBatch)
                .mockResolvedValueOnce({
                    success: true,
                    totalItems: 1,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [{ vocabularyId: 1, studyMaterialId: 101, action: 'created', finalSynonyms: ['Katze'], success: true }],
                    errors: []
                })
                .mockResolvedValueOnce({
                    success: true,
                    totalItems: 1,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [{ vocabularyId: 2, studyMaterialId: 102, action: 'created', finalSynonyms: ['Hund'], success: true }],
                    errors: []
                })
                .mockResolvedValueOnce({
                    success: true,
                    totalItems: 1,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [{ vocabularyId: 3, studyMaterialId: 103, action: 'created', finalSynonyms: ['Vogel'], success: true }],
                    errors: []
                });

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert
            expect(result).toEqual({
                success: true,
                totalItems: 3,
                translationCount: 3,
                uploadCount: 3,
                errorCount: 0,
                processingTime: expect.any(Number),
                phases: expect.any(Array)
            });

            // Verify translation calls
            expect(translateVocabularyMeanings).toHaveBeenCalledTimes(3);
            expect(translateVocabularyMeanings).toHaveBeenCalledWith(mockVocabularyItems[0], mockOptions.deeplToken);
            expect(translateVocabularyMeanings).toHaveBeenCalledWith(mockVocabularyItems[1], mockOptions.deeplToken);
            expect(translateVocabularyMeanings).toHaveBeenCalledWith(mockVocabularyItems[2], mockOptions.deeplToken);

            // Verify upload calls (should happen immediately after each translation)
            expect(uploadVocabularyBatch).toHaveBeenCalledTimes(3);
            expect(uploadVocabularyBatch).toHaveBeenCalledWith(
                [{ vocabulary: mockVocabularyItems[0], translatedSynonyms: ['Katze'] }],
                { synonymMode: mockOptions.synonymMode, apiToken: mockOptions.apiToken }
            );
        });

        it('should track progress for both translation and upload phases in parallel', async () => {
            // Arrange
            const progressCallback = vi.fn();

            vi.mocked(translateVocabularyMeanings)
                .mockResolvedValueOnce({
                    vocabularyId: 1,
                    originalMeanings: ['cat'],
                    translatedSynonyms: ['Katze'],
                    selected: true
                })
                .mockResolvedValueOnce({
                    vocabularyId: 2,
                    originalMeanings: ['dog'],
                    translatedSynonyms: ['Hund'],
                    selected: true
                });

            vi.mocked(uploadVocabularyBatch)
                .mockResolvedValue({
                    success: true,
                    totalItems: 1,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [{ vocabularyId: 1, studyMaterialId: 101, action: 'created', finalSynonyms: ['Test'], success: true }],
                    errors: []
                });

            // Act
            await processVocabularyStreaming(mockVocabularyItems.slice(0, 2), mockOptions, progressCallback);

            // Assert
            expect(progressCallback).toHaveBeenCalled();

            // Check that we got progress updates for both phases
            const calls = progressCallback.mock.calls;
            expect(calls.length).toBeGreaterThan(0);

            // Should have separate progress for translation and upload phases
            const lastCall = calls[calls.length - 1][0];
            expect(lastCall).toMatchObject({
                translationPhase: expect.objectContaining({
                    phase: 'translation',
                    progress: expect.any(Number)
                }),
                uploadPhase: expect.objectContaining({
                    phase: 'upload',
                    progress: expect.any(Number)
                }),
                overallPhase: expect.objectContaining({
                    phase: 'both',
                    progress: expect.any(Number)
                })
            });
        });

        it('should handle translation errors gracefully and continue processing', async () => {
            // Arrange
            vi.mocked(translateVocabularyMeanings)
                .mockResolvedValueOnce({
                    vocabularyId: 1,
                    originalMeanings: ['cat'],
                    translatedSynonyms: ['Katze'],
                    selected: true
                })
                .mockResolvedValueOnce({
                    vocabularyId: 2,
                    originalMeanings: ['dog'],
                    translatedSynonyms: [],
                    selected: true,
                    error: 'Translation failed'
                })
                .mockResolvedValueOnce({
                    vocabularyId: 3,
                    originalMeanings: ['bird'],
                    translatedSynonyms: ['Vogel'],
                    selected: true
                });

            vi.mocked(uploadVocabularyBatch)
                .mockResolvedValueOnce({
                    success: true,
                    totalItems: 1,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [{ vocabularyId: 1, studyMaterialId: 101, action: 'created', finalSynonyms: ['Katze'], success: true }],
                    errors: []
                })
                .mockResolvedValueOnce({
                    success: true,
                    totalItems: 1,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [{ vocabularyId: 3, studyMaterialId: 103, action: 'created', finalSynonyms: ['Vogel'], success: true }],
                    errors: []
                });

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert
            expect(result).toEqual({
                success: false, // Should be false due to translation error
                totalItems: 3,
                translationCount: 2, // Only 2 successful translations
                uploadCount: 2,     // Only 2 successful uploads
                errorCount: 1,      // 1 translation error
                processingTime: expect.any(Number),
                phases: expect.any(Array)
            });

            // Should only upload successful translations
            expect(uploadVocabularyBatch).toHaveBeenCalledTimes(2);
        });

        it('should respect stop signal and halt processing', async () => {
            // Arrange
            const stopSignal = { current: false };

            vi.mocked(translateVocabularyMeanings)
                .mockImplementation(async () => {
                    // Simulate stopping after first translation
                    stopSignal.current = true;
                    return {
                        vocabularyId: 1,
                        originalMeanings: ['cat'],
                        translatedSynonyms: ['Katze'],
                        selected: true
                    };
                });

            vi.mocked(uploadVocabularyBatch)
                .mockResolvedValue({
                    success: true,
                    totalItems: 1,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: [{ vocabularyId: 1, studyMaterialId: 101, action: 'created', finalSynonyms: ['Katze'], success: true }],
                    errors: []
                });

            // Act
            const result = await processVocabularyStreaming(mockVocabularyItems, mockOptions, undefined, stopSignal);

            // Assert
            expect(result.totalItems).toBe(3);
            expect(result.translationCount).toBeLessThan(3); // Should stop before processing all items
            expect(translateVocabularyMeanings).toHaveBeenCalledTimes(1); // Should stop after first item
        });

        it('should demonstrate the key difference: immediate upload vs batch upload', async () => {
            // Arrange
            const uploadCalls: any[] = [];
            vi.mocked(uploadVocabularyBatch).mockImplementation(async (items) => {
                uploadCalls.push({ itemCount: items.length, timestamp: Date.now() });
                return {
                    success: true,
                    totalItems: items.length,
                    createdCount: items.length,
                    updatedCount: 0,
                    errorCount: 0,
                    results: items.map((item, idx) => ({
                        vocabularyId: item.vocabulary.id,
                        studyMaterialId: 100 + idx,
                        action: 'created' as const,
                        finalSynonyms: item.translatedSynonyms,
                        success: true
                    })),
                    errors: []
                };
            });

            vi.mocked(translateVocabularyMeanings)
                .mockResolvedValueOnce({
                    vocabularyId: 1,
                    originalMeanings: ['cat'],
                    translatedSynonyms: ['Katze'],
                    selected: true
                })
                .mockResolvedValueOnce({
                    vocabularyId: 2,
                    originalMeanings: ['dog'],
                    translatedSynonyms: ['Hund'],
                    selected: true
                })
                .mockResolvedValueOnce({
                    vocabularyId: 3,
                    originalMeanings: ['bird'],
                    translatedSynonyms: ['Vogel'],
                    selected: true
                });

            // Act
            await processVocabularyStreaming(mockVocabularyItems, mockOptions);

            // Assert
            expect(uploadCalls).toHaveLength(3);

            // Each upload should be for exactly 1 item (streaming mode)
            uploadCalls.forEach(call => {
                expect(call.itemCount).toBe(1);
            });

            // This proves "Sobald ein Vocabulary übersetzt worden ist, soll es zu Wanikani hochgeladen werden"
            console.log('📊 Upload pattern (Streaming Mode):', uploadCalls.map(c => `${c.itemCount} item(s)`));
        });
    });
});
