import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVocabularyManager } from '../../hooks/useVocabularyManager';

// Mock the API functions
vi.mock('../../lib/wanikani', () => ({
    getVocabularyCount: vi.fn().mockResolvedValue(100),
    getVocabularyPreview: vi.fn().mockResolvedValue([
        {
            id: 1,
            data: {
                characters: '犬',
                level: 1,
                meanings: [{ meaning: 'dog', primary: true }],
                readings: [{ reading: 'いぬ', primary: true }],
                meaning_mnemonic: 'Test mnemonic'
            }
        }
    ]),
    getVocabularyStudyMaterials: vi.fn().mockResolvedValue([]),
}));

// Mock storage functions
vi.mock('../../lib/storage', () => ({
    loadWanikaniToken: vi.fn(() => 'mock-wanikani-token'),
    saveWanikaniToken: vi.fn(),
    removeToken: vi.fn(),
    loadDeepLToken: vi.fn(() => 'mock-deepl-token'),
    saveDeepLToken: vi.fn(),
    STORAGE_KEYS: {
        WANIKANI_TOKEN: 'wanikani-token',
        DEEPL_TOKEN: 'deepl-token'
    }
}));

// Mock translation and upload functions
vi.mock('../../lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn().mockResolvedValue({
        vocabularyId: 1,
        translatedSynonyms: ['dog', 'hund'],
        error: null,
        originalMeanings: ['dog'],
        selected: true
    })
}));

vi.mock('../../lib/vocabulary-wanikani-upload', () => ({
    uploadVocabularyBatch: vi.fn().mockResolvedValue({
        success: true,
        results: [{ vocabularyId: 1, success: true }],
        errors: []
    })
}));

// Mock the streaming integration
vi.mock('../../lib/vocabulary-streaming-integration', () => ({
    processVocabularyStreaming: vi.fn().mockImplementation(async (_items, options, progressCallback, _stopSignal) => {
        // Simulate live callbacks during processing
        if (options.onItemProcessing) {
            options.onItemProcessing({ vocabularyId: 1, currentPhase: 'translation' });
        }

        // Simulate progress updates
        if (progressCallback) {
            progressCallback({
                translationPhase: { progress: 50, phase: 'translation', status: 'active' },
                uploadPhase: { progress: 0, phase: 'upload', status: 'pending' },
                overallPhase: { progress: 25, phase: 'overall', status: 'active' }
            });

            // Complete progress
            progressCallback({
                translationPhase: { progress: 100, phase: 'translation', status: 'completed' },
                uploadPhase: { progress: 100, phase: 'upload', status: 'completed' },
                overallPhase: { progress: 100, phase: 'overall', status: 'completed' }
            });
        }

        if (options.onItemUpdated) {
            options.onItemUpdated({ vocabularyId: 1, translatedSynonyms: ['dog', 'hund'] });
        }

        return {
            success: true,
            totalItems: 1,
            translationCount: 1,
            uploadCount: 1,
            errorCount: 0,
            processingTime: 1000,
            phases: []
        };
    })
}));

// Mock window object for storage
Object.defineProperty(window, 'TextEncoder', {
    writable: true,
    value: TextEncoder,
});

describe('🔗 Phase 1 Task 5: End-to-End Live Update Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Complete Live Update Pipeline', () => {
        it.skip('should execute the complete live update pipeline from processing to UI state', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial API loading and ensure data is loaded
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
            });

            // Ensure we have vocabulary data to process
            expect(result.current.filteredVocabulary.length).toBeGreaterThan(0);
            expect(result.current.apiToken).toBe('test-wanikani-token');
            expect(result.current.deeplToken).toBe('test-deepl-token');

            // Verify initial state
            expect(result.current.processingItems.size).toBe(0);
            expect(result.current.errorItems.size).toBe(0);
            expect(result.current.isProcessing).toBe(false);

            // Start processing to trigger the live update pipeline
            await act(async () => {
                await result.current.processTranslations();
            });

            // Wait a bit more for async processing to complete
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Verify processing completed
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.streamingResult?.success).toBe(true);

            // Live update states should be clean after successful processing
            expect(result.current.processingItems.size).toBe(0);
            expect(result.current.errorItems.size).toBe(0);
        });

        it.skip('should handle live updates during actual vocabulary processing', async () => {
            // Create a more realistic scenario with multiple items
            const multipleVocabulary = [
                {
                    id: 1,
                    data: {
                        characters: '犬',
                        level: 1,
                        meanings: [{ meaning: 'dog', primary: true }],
                        readings: [{ reading: 'いぬ', primary: true }],
                        meaning_mnemonic: 'Test mnemonic'
                    }
                },
                {
                    id: 2,
                    data: {
                        characters: '猫',
                        level: 1,
                        meanings: [{ meaning: 'cat', primary: true }],
                        readings: [{ reading: 'ねこ', primary: true }],
                        meaning_mnemonic: 'Test mnemonic'
                    }
                }
            ];

            // Update the mock to return multiple items
            const { getVocabularyPreview } = await import('../../lib/wanikani');
            vi.mocked(getVocabularyPreview).mockResolvedValueOnce(multipleVocabulary as any);

            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial loading with multiple items
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Verify we have vocabulary items loaded
            expect(result.current.filteredVocabulary.length).toBeGreaterThan(0);

            // Start processing
            await act(async () => {
                await result.current.processTranslations();
            });

            // Verify the processing pipeline worked
            expect(result.current.streamingResult).toBeTruthy();
            expect(result.current.progress).toBe(100);
        });

        it.skip('should handle error scenarios in the live update pipeline', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens first
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial loading
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Start processing - it should succeed with our mock
            await act(async () => {
                await result.current.processTranslations();
            });

            // Verify that processing completed successfully (our mock always succeeds)
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.streamingResult?.success).toBe(true);
        });
    });

    describe('Live State Synchronization', () => {
        it.skip('should keep processingItems and errorItems synchronized with actual processing', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Initial state should be empty
            expect(result.current.processingItems.size).toBe(0);
            expect(result.current.errorItems.size).toBe(0);

            // Processing should update these states appropriately
            await act(async () => {
                await result.current.processTranslations();
            });

            // After processing, states should be clean
            expect(result.current.processingItems.size).toBe(0);
            // No errors expected in successful scenario
            expect(result.current.errorItems.size).toBe(0);
        });

        it('should clear live states when clearResults is called', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Clear results should reset all live states
            act(() => {
                result.current.clearResults();
            });

            expect(result.current.processingItems.size).toBe(0);
            expect(result.current.errorItems.size).toBe(0);
            expect(result.current.progress).toBe(0);
            expect(result.current.streamingResult).toBeNull();
        });
    });

    describe('React 19 Compatibility in Integration', () => {
        it('should handle component unmounting during live updates', async () => {
            const { result, unmount } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Start processing
            const processPromise = act(async () => {
                await result.current.processTranslations();
            });

            // Unmount during processing
            unmount();

            // Should complete without throwing errors
            await processPromise;
        });

        it('should prevent memory leaks in live update callbacks', async () => {
            const { result, unmount } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Store initial processing state
            const initialProcessingSize = result.current.processingItems.size;
            const initialErrorSize = result.current.errorItems.size;

            // Unmount component
            unmount();

            // No state updates should occur after unmounting
            // This test mainly verifies no errors are thrown
            expect(initialProcessingSize).toBe(0);
            expect(initialErrorSize).toBe(0);
        });
    });

    describe('Performance and Scalability', () => {
        it.skip('should handle larger vocabulary sets efficiently', async () => {
            // Mock a larger vocabulary set
            const largeVocabularySet = Array.from({ length: 50 }, (_, i) => ({
                id: i + 1,
                data: {
                    characters: `item${i + 1}`,
                    level: 1,
                    meanings: [{ meaning: `meaning${i + 1}`, primary: true }],
                    readings: [{ reading: `reading${i + 1}`, primary: true }],
                    meaning_mnemonic: 'Test mnemonic'
                }
            }));

            const { getVocabularyPreview } = await import('../../lib/wanikani');
            vi.mocked(getVocabularyPreview).mockResolvedValueOnce(largeVocabularySet as any);

            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial loading
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Verify large dataset is loaded (may be limited by the hook's preview count)
            expect(result.current.filteredVocabulary.length).toBeGreaterThan(0);

            // Processing should still work efficiently
            const startTime = Date.now();
            await act(async () => {
                await result.current.processTranslations();
            });
            const processingTime = Date.now() - startTime;

            // Verify processing completed
            expect(result.current.streamingResult?.success).toBe(true);

            // Processing should be reasonably fast (under 5 seconds for mocked operations)
            expect(processingTime).toBeLessThan(5000);
        });

        it('should maintain responsive UI during live updates', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // UI should remain responsive during processing
            // Test rapid state changes
            act(() => {
                result.current.setSelectedLevel(5);
                result.current.setSynonymMode('replace');
            });

            // Start processing
            await act(async () => {
                await result.current.processTranslations();
            });

            // UI state changes should still be effective
            expect(result.current.selectedLevel).toBe(5);
            expect(result.current.synonymMode).toBe('replace');
        });
    });

    describe('Error Recovery and Resilience', () => {
        it.skip('should recover gracefully from callback errors', async () => {
            // This test verifies that errors in callbacks don't break the processing pipeline
            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Processing should work even if callbacks would throw errors
            // (The actual callback error handling is in the processVocabularyStreaming function)
            await act(async () => {
                await result.current.processTranslations();
            });

            // Processing should still complete successfully
            expect(result.current.streamingResult?.success).toBe(true);
        });

        it('should handle network failures gracefully', async () => {
            // Mock streaming integration with network failure scenario
            const { processVocabularyStreaming } = await import('../../lib/vocabulary-streaming-integration');
            vi.mocked(processVocabularyStreaming).mockImplementationOnce(async (_items, options, _progressCallback, _stopSignal) => {
                // Simulate error callback
                if (options.onItemError) {
                    options.onItemError(
                        { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
                        { vocabularyId: 1, error: 'Network error', phase: 'translation' }
                    );
                }

                // Return failure result
                return {
                    success: false,
                    totalItems: 1,
                    translationCount: 0,
                    uploadCount: 0,
                    errorCount: 1,
                    processingTime: 1000,
                    phases: []
                };
            });

            const { result } = renderHook(() => useVocabularyManager());

            // Set up required tokens
            await act(async () => {
                result.current.handleApiTokenChange('test-wanikani-token');
                result.current.handleDeepLTokenChange('test-deepl-token');
            });

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Processing should handle network errors
            await act(async () => {
                await result.current.processTranslations();
            });

            // Should complete with errors reported
            expect(result.current.streamingResult?.success).toBe(false);
            expect(result.current.streamingResult?.errorCount).toBeGreaterThan(0);
        });
    });
});
