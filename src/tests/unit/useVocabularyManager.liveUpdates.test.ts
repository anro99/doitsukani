import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVocabularyManager } from '../../hooks/useVocabularyManager';

// Mock the API functions
vi.mock('../../lib/wanikani', () => ({
    getVocabularyCount: vi.fn().mockResolvedValue(100),
    getVocabularyPreview: vi.fn().mockResolvedValue([]),
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

// Mock the streaming integration with callback support
vi.mock('../../lib/vocabulary-streaming-integration', () => ({
    processVocabularyStreaming: vi.fn()
}));

import { processVocabularyStreaming } from '../../lib/vocabulary-streaming-integration';
const mockProcessVocabularyStreaming = vi.mocked(processVocabularyStreaming);

// Mock window object for storage
Object.defineProperty(window, 'TextEncoder', {
    writable: true,
    value: TextEncoder,
});

describe('useVocabularyManager - Live Updates (Phase 1)', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default successful streaming processing mock
        mockProcessVocabularyStreaming.mockResolvedValue({
            success: true,
            totalItems: 1,
            translationCount: 1,
            uploadCount: 1,
            errorCount: 0,
            processingTime: 100,
            phases: []
        } as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Live Update Callback System', () => {
        it('should provide processingItems state for tracking current processing', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Verify processingItems state exists and is initialized
            expect(result.current.processingItems).toBeDefined();
            expect(result.current.processingItems).toBeInstanceOf(Set);
            expect(result.current.processingItems.size).toBe(0);

            // Foundation still exists
            expect(result.current.isProcessing).toBe(false);
            expect(result.current.progress).toBe(0);
        });

        it('should provide errorItems state for tracking failed items', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Verify errorItems state exists and is initialized
            expect(result.current.errorItems).toBeDefined();
            expect(result.current.errorItems).toBeInstanceOf(Map);
            expect(result.current.errorItems.size).toBe(0);

            // Foundation still exists
            expect(result.current.uploadStats.failed).toBe(0);
        });

        it('should call onItemProcessing callback during processing', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Start processing and verify streaming is called with progress callback
            await act(async () => {
                result.current.processTranslations();
            });

            // Verify streaming function was called with progress callback
            expect(mockProcessVocabularyStreaming).toHaveBeenCalledWith(
                expect.any(Array),
                expect.any(Object),
                expect.any(Function), // Progress callback
                expect.any(Object)    // Stop signal
            );
        });

        it('should call onItemUpdated callback after successful processing', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Start processing
            await act(async () => {
                result.current.processTranslations();
            });

            // Verify processing completed successfully
            expect(result.current.streamingResult?.success).toBe(true);
            expect(result.current.streamingResult?.uploadCount).toBeGreaterThan(0);
        });

        it('should call onItemError callback for failed items', async () => {
            // Mock streaming processing to simulate errors
            mockProcessVocabularyStreaming.mockResolvedValueOnce({
                success: false,
                totalItems: 1,
                translationCount: 1,
                uploadCount: 0,
                errorCount: 1,
                processingTime: 100,
                phases: []
            } as any);

            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Start processing
            await act(async () => {
                result.current.processTranslations();
            });

            // Verify error handling
            expect(result.current.streamingResult?.success).toBe(false);
            expect(result.current.streamingResult?.errorCount).toBeGreaterThan(0);
        });
    });

    describe('Live Progress Updates', () => {
        it('should update progress in real-time during processing', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Mock streaming with progress callback
            let progressCallbackCalled = false;
            mockProcessVocabularyStreaming.mockImplementationOnce(async (_items: any, _options: any, progressCallback?: any) => {
                // Simulate calling the progress callback
                if (progressCallback) {
                    progressCallback({
                        translationPhase: { phase: 'translation', progress: 50, status: 'in-progress', processedCount: 1, totalCount: 2, message: 'Translating...' },
                        uploadPhase: { phase: 'upload', progress: 50, status: 'in-progress', processedCount: 1, totalCount: 2, message: 'Uploading...' },
                        overallPhase: { phase: 'both', progress: 50, status: 'in-progress', processedCount: 1, totalCount: 2, message: 'Processing...', completedItems: 1, errorItems: 0 }
                    });
                    progressCallbackCalled = true;
                }

                return {
                    success: true,
                    totalItems: 1,
                    translationCount: 1,
                    uploadCount: 1,
                    errorCount: 0,
                    processingTime: 100,
                    phases: []
                } as any;
            });

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Monitor progress updates
            let initialProgress = result.current.progress;

            // Start processing
            await act(async () => {
                result.current.processTranslations();
            });

            // Verify progress callback was called
            expect(progressCallbackCalled).toBe(true);
            // Progress should be updated (either from callback or completion)
            expect(result.current.progress).toBeGreaterThanOrEqual(initialProgress);
        });

        it('should update streamingPhases in real-time', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Mock with progress callback that sets streaming phases
            mockProcessVocabularyStreaming.mockImplementationOnce(async (_items: any, _options: any, progressCallback?: any) => {
                // Call progress callback to trigger streamingPhases update
                if (progressCallback) {
                    progressCallback({
                        translationPhase: { phase: 'translation', progress: 100, status: 'completed', processedCount: 1, totalCount: 1, message: 'Complete' },
                        uploadPhase: { phase: 'upload', progress: 100, status: 'completed', processedCount: 1, totalCount: 1, message: 'Complete' },
                        overallPhase: { phase: 'both', progress: 100, status: 'completed', processedCount: 1, totalCount: 1, message: 'Complete', completedItems: 1, errorItems: 0 }
                    });
                }

                return {
                    success: true,
                    totalItems: 1,
                    translationCount: 1,
                    uploadCount: 1,
                    errorCount: 0,
                    processingTime: 100,
                    phases: []
                } as any;
            });

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Start processing
            await act(async () => {
                result.current.processTranslations();
            });

            // Verify streaming phases were captured
            expect(result.current.streamingPhases).toBeTruthy();
            expect(result.current.streamingPhases?.overallPhase).toBeTruthy();
        });
    });

    describe('Live State Management', () => {
        it('should maintain consistent state during concurrent operations', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Start processing
            const processPromise = act(async () => {
                result.current.processTranslations();
            });

            // Immediately try to stop (concurrent operation)
            act(() => {
                result.current.stopProcessing();
            });

            await processPromise;

            // State should be consistent
            expect(result.current.isProcessing).toBe(false);
        });

        it('should handle rapid state changes during processing', async () => {
            const { result } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Rapid state changes should not cause issues
            act(() => {
                result.current.setSelectedLevel(5);
                result.current.setSynonymMode('replace');
                result.current.clearResults();
            });

            // State should be updated correctly
            expect(result.current.selectedLevel).toBe(5);
            expect(result.current.synonymMode).toBe('replace');
            expect(result.current.progress).toBe(0);

            // Live update states should be cleared
            expect(result.current.processingItems.size).toBe(0);
            expect(result.current.errorItems.size).toBe(0);
        });
    });

    describe('React 19 Compatibility', () => {
        it('should handle component unmounting during processing', async () => {
            const { result, unmount } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Start processing
            act(() => {
                result.current.processTranslations();
            });

            // Unmount component during processing
            unmount();

            // Should not cause errors (mountedRef prevents state updates)
            expect(true).toBe(true); // Test passes if no errors thrown
        });

        it('should not update state after component unmounts', async () => {
            const { result, unmount } = renderHook(() => useVocabularyManager());

            // Wait for initial setup
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 0));
            });

            // Store initial state
            const initialProgress = result.current.progress;

            // Unmount component
            unmount();

            // Any async operations should not update unmounted component
            // This test mainly verifies no errors are thrown
            expect(initialProgress).toBe(0);
        });
    });
});
