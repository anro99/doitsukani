import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('../../features/vocabulary/lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn()
}));

vi.mock('../../features/vocabulary/lib/vocabulary-wanikani-upload', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../features/vocabulary/lib/vocabulary-wanikani-upload')>();
    return {
        ...actual,
        uploadVocabularyBatch: vi.fn()
    };
});

import { processVocabularyStreaming } from '../../features/vocabulary/lib/vocabulary-streaming-integration';
import { translateVocabularyMeanings } from '../../features/vocabulary/lib/vocabulary-translation';
import { uploadVocabularyBatch } from '../../features/vocabulary/lib/vocabulary-wanikani-upload';

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

        it('should use unified progress bar based on completed vocabulary items only', async () => {
            const mockTranslateVocabularyMeanings = translateVocabularyMeanings as any;
            const mockUploadVocabularyBatch = uploadVocabularyBatch as any;

            // Setup mocks
            mockTranslateVocabularyMeanings.mockImplementation(async (vocabulary: any) => {
                // Simulate translation delay
                await new Promise(resolve => setTimeout(resolve, 10));
                return {
                    vocabularyId: vocabulary.id,
                    originalMeanings: vocabulary.meanings,
                    translatedSynonyms: [`german_${vocabulary.characters}`],
                    selected: [`german_${vocabulary.characters}`]
                };
            });

            mockUploadVocabularyBatch.mockImplementation(async (vocabularyTranslations: any) => {
                // Simulate upload delay
                await new Promise(resolve => setTimeout(resolve, 5));
                return {
                    success: true,
                    totalItems: vocabularyTranslations.length,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    results: vocabularyTranslations.map((vt: any) => ({
                        vocabularyId: vt.vocabulary.id,
                        status: 'created',
                        synonyms: vt.translatedSynonyms
                    })),
                    errors: []
                };
            });

            const testVocabulary = [
                { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
                { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] },
                { id: 3, characters: '鳥', meanings: [{ meaning: 'bird', primary: true }] }
            ];

            const progressUpdates: any[] = [];
            const onProgress = (phases: any) => {
                progressUpdates.push({
                    overallProgress: phases.overallPhase.progress,
                    translationActivity: phases.translationPhase.currentItem,
                    uploadActivity: phases.uploadPhase.currentItem,
                    completedItems: phases.overallPhase.completedItems || 0,
                    totalItems: testVocabulary.length
                });
            };

            const result = await processVocabularyStreaming(testVocabulary, mockOptions, onProgress);

            expect(result.success).toBe(true);
            expect(result.totalItems).toBe(3);

            // Progress should only increment when items are fully completed (uploaded)
            const finalProgress = progressUpdates[progressUpdates.length - 1];
            expect(finalProgress.overallProgress).toBe(100);
            expect(finalProgress.completedItems).toBe(3);

            // Should show current translation and upload activities
            const intermediateUpdates = progressUpdates.filter(update => update.overallProgress < 100);
            expect(intermediateUpdates.some(update => update.translationActivity)).toBe(true);
            expect(intermediateUpdates.some(update => update.uploadActivity)).toBe(true);
        });

        it('should handle mixed success/failure scenarios in unified progress', async () => {
            const mockTranslateVocabularyMeanings = translateVocabularyMeanings as any;
            const mockUploadVocabularyBatch = uploadVocabularyBatch as any;

            let translationCallCount = 0;
            mockTranslateVocabularyMeanings.mockImplementation(async (vocabulary: any) => {
                translationCallCount++;
                if (translationCallCount === 2) {
                    // Second translation fails
                    return { error: 'Translation failed' };
                }
                return {
                    vocabularyId: vocabulary.id,
                    originalMeanings: vocabulary.meanings,
                    translatedSynonyms: [`german_${vocabulary.characters}`],
                    selected: [`german_${vocabulary.characters}`]
                };
            });

            let uploadCallCount = 0;
            mockUploadVocabularyBatch.mockImplementation(async () => {
                uploadCallCount++;
                if (uploadCallCount === 1) {
                    // First upload fails
                    return {
                        success: false,
                        createdCount: 0,
                        updatedCount: 0,
                        errorCount: 1,
                        errors: ['Upload failed']
                    };
                }
                return {
                    success: true,
                    createdCount: 1,
                    updatedCount: 0,
                    errorCount: 0,
                    errors: []
                };
            });

            const testVocabulary = [
                { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
                { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] },
                { id: 3, characters: '鳥', meanings: [{ meaning: 'bird', primary: true }] }
            ];

            const progressUpdates: any[] = [];
            const onProgress = (phases: any) => {
                progressUpdates.push({
                    overallProgress: phases.overallPhase.progress,
                    completedItems: phases.overallPhase.completedItems || 0,
                    errorItems: phases.overallPhase.errorItems || 0
                });
            };

            const result = await processVocabularyStreaming(testVocabulary, mockOptions, onProgress);

            // Should complete with mixed results
            expect(result.totalItems).toBe(3);
            expect(result.errorCount).toBeGreaterThan(0);

            // Progress should still reach 100% when all items are processed (success or failure)
            const finalProgress = progressUpdates[progressUpdates.length - 1];
            expect(finalProgress.overallProgress).toBe(100);
            expect(finalProgress.completedItems + finalProgress.errorItems).toBe(3);
        });
    });
});
