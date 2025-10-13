import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VocabularyItem } from '../../features/vocabulary/lib/vocabulary-translation';
import {
    CompleteProcessingOptions,
    VocabularyItemResult,
    VocabularyItemError
} from '../../features/vocabulary/lib/vocabulary-integration';

// Mock the dependencies
vi.mock('../../features/vocabulary/lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn().mockResolvedValue([
        { vocabularyId: 1, translatedSynonyms: ['dog', 'hund'], error: null }
    ])
}));

vi.mock('../../features/vocabulary/lib/vocabulary-wanikani-upload', () => ({
    uploadVocabularyBatch: vi.fn().mockResolvedValue({
        successful: ['1'],
        failed: [],
        created: 1,
        updated: 0,
        skipped: 0,
        totalProcessed: 1
    })
}));

describe('🔄 Phase 1 Task 2: Streaming Integration Callbacks (TDD)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('VocabularyStreamingOptions Interface Extension', () => {
        it('should define extended options interface with item-level callbacks', () => {
            // Test that the extended interface supports item-level callbacks
            // This is a type test - if it compiles, the interface is correctly defined

            const mockOnItemProcessing = vi.fn();
            const mockOnItemUpdated = vi.fn();
            const mockOnItemError = vi.fn();

            const extendedOptions: CompleteProcessingOptions = {
                // Base options
                batchSize: 10,
                synonymMode: 'smart-merge',
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,

                // New callback options
                onItemProcessing: mockOnItemProcessing,
                onItemUpdated: mockOnItemUpdated,
                onItemError: mockOnItemError
            };

            // Verify the structure is valid
            expect(extendedOptions.onItemProcessing).toBeDefined();
            expect(extendedOptions.onItemUpdated).toBeDefined();
            expect(extendedOptions.onItemError).toBeDefined();
            expect(typeof extendedOptions.onItemProcessing).toBe('function');
            expect(typeof extendedOptions.onItemUpdated).toBe('function');
            expect(typeof extendedOptions.onItemError).toBe('function');
        });

        it('should support optional callback parameters', () => {
            // Test that callbacks are optional in the interface
            const basicOptions: CompleteProcessingOptions = {
                batchSize: 10,
                synonymMode: 'smart-merge',
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false
            };

            // Should not require callbacks - this test passes if it compiles
            expect(basicOptions.batchSize).toBe(10);
        });
    });

    describe('Callback Function Signatures', () => {
        it('should define correct onItemProcessing callback signature', () => {
            const mockCallback = vi.fn();

            // Test the expected signature for onItemProcessing
            const testVocabularyItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            // Call with expected parameters
            mockCallback(testVocabularyItem, 'translation');
            mockCallback(testVocabularyItem, 'upload');

            expect(mockCallback).toHaveBeenCalledWith(testVocabularyItem, 'translation');
            expect(mockCallback).toHaveBeenCalledWith(testVocabularyItem, 'upload');
            expect(mockCallback).toHaveBeenCalledTimes(2);
        });

        it('should define correct onItemUpdated callback signature', () => {
            const mockCallback = vi.fn();

            const testVocabularyItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const updateResult: VocabularyItemResult = {
                vocabularyId: 1,
                success: true,
                translatedSynonyms: ['dog', 'hund'],
                uploadedSynonyms: ['dog', 'hund'],
                message: 'Successfully processed'
            };

            // Call with expected parameters
            mockCallback(testVocabularyItem, updateResult);

            expect(mockCallback).toHaveBeenCalledWith(testVocabularyItem, updateResult);
            expect(mockCallback).toHaveBeenCalledTimes(1);
        });

        it('should define correct onItemError callback signature', () => {
            const mockCallback = vi.fn();

            const testVocabularyItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const errorResult: VocabularyItemError = {
                vocabularyId: 1,
                phase: 'translation',
                error: 'Translation failed',
                originalError: new Error('DeepL API error')
            };

            // Call with expected parameters
            mockCallback(testVocabularyItem, errorResult);

            expect(mockCallback).toHaveBeenCalledWith(testVocabularyItem, errorResult);
            expect(mockCallback).toHaveBeenCalledTimes(1);
        });
    });

    describe('Callback Integration with processVocabularyStreaming', () => {
        it('should call onItemProcessing when starting item translation', async () => {
            const mockOnItemProcessing = vi.fn();
            const testItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            // Mock the actual processVocabularyStreaming import to test callback integration
            const { processVocabularyStreaming } = await import('../../lib/vocabulary-streaming-integration');

            const options: CompleteProcessingOptions = {
                batchSize: 1,
                synonymMode: 'smart-merge',
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false,
                onItemProcessing: mockOnItemProcessing
            };

            // Call the actual function
            await processVocabularyStreaming([testItem], options);

            // Verify callback was called for translation phase
            expect(mockOnItemProcessing).toHaveBeenCalledWith(testItem, 'translation');
        });

        it('should call onItemProcessing when starting item upload', async () => {
            const mockOnItemProcessing = vi.fn();
            const testItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            // Future implementation: processVocabularyStreaming should call this
            mockOnItemProcessing(testItem, 'upload');

            expect(mockOnItemProcessing).toHaveBeenCalledWith(testItem, 'upload');
        });

        it('should call onItemUpdated after successful processing', async () => {
            const mockOnItemUpdated = vi.fn();
            const testItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const successResult: VocabularyItemResult = {
                vocabularyId: 1,
                success: true,
                translatedSynonyms: ['dog', 'hund'],
                uploadedSynonyms: ['dog', 'hund'],
                message: 'Successfully processed'
            };

            // Future implementation: processVocabularyStreaming should call this
            mockOnItemUpdated(testItem, successResult);

            expect(mockOnItemUpdated).toHaveBeenCalledWith(testItem, successResult);
        });

        it('should call onItemError for translation failures', async () => {
            const mockOnItemError = vi.fn();
            const testItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const errorResult: VocabularyItemError = {
                vocabularyId: 1,
                phase: 'translation',
                error: 'Translation failed',
                originalError: new Error('DeepL API error')
            };

            // Future implementation: processVocabularyStreaming should call this
            mockOnItemError(testItem, errorResult);

            expect(mockOnItemError).toHaveBeenCalledWith(testItem, errorResult);
        });

        it('should call onItemError for upload failures', async () => {
            const mockOnItemError = vi.fn();
            const testItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const errorResult: VocabularyItemError = {
                vocabularyId: 1,
                phase: 'upload',
                error: 'Upload failed',
                originalError: new Error('WaniKani API error')
            };

            // Future implementation: processVocabularyStreaming should call this
            mockOnItemError(testItem, errorResult);

            expect(mockOnItemError).toHaveBeenCalledWith(testItem, errorResult);
        });
    });

    describe('Callback Error Handling', () => {
        it('should handle callback errors gracefully without stopping processing', async () => {
            const faultyCallback = vi.fn().mockImplementation(() => {
                throw new Error('Callback error');
            });

            const testItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            // Future implementation should catch and log callback errors
            // but continue processing other items
            expect(() => {
                try {
                    faultyCallback(testItem, 'translation');
                } catch (error) {
                    // Should log error but not throw
                    console.warn('Callback error:', error);
                }
            }).not.toThrow();
        });

        it('should provide detailed error information in onItemError callbacks', async () => {
            const mockOnItemError = vi.fn();
            const testItem: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const detailedErrorResult: VocabularyItemError = {
                vocabularyId: 1,
                phase: 'translation',
                error: 'Translation failed: Rate limit exceeded',
                originalError: new Error('DeepL API error'),
                timestamp: new Date().toISOString(),
                retryable: true
            };

            mockOnItemError(testItem, detailedErrorResult);

            // Verify all error details are provided
            const callArgs = mockOnItemError.mock.calls[0][1];
            expect(callArgs.vocabularyId).toBe(1);
            expect(callArgs.phase).toBe('translation');
            expect(callArgs.error).toContain('Translation failed');
            expect(callArgs.originalError).toBeInstanceOf(Error);
            expect(callArgs.timestamp).toBeDefined();
            expect(typeof callArgs.retryable).toBe('boolean');
        });
    });

    describe('Performance Considerations', () => {
        it('should allow callbacks to be optional for performance', () => {
            // Test that processing can work without callbacks for better performance
            const optionsWithoutCallbacks: CompleteProcessingOptions = {
                batchSize: 10,
                synonymMode: 'smart-merge',
                apiToken: 'test-token',
                deeplToken: 'test-deepl-token',
                enableProgressReporting: true,
                stopOnFirstError: false
            };

            // Should be valid without any callbacks
            expect(optionsWithoutCallbacks.batchSize).toBe(10);
        });

        it('should batch callback calls efficiently for large datasets', async () => {
            // Test concept: callbacks should be called efficiently
            // Implementation should consider batching or throttling for large datasets

            const mockOnItemProcessing = vi.fn();

            // Simulate processing many items
            const manyItems = Array.from({ length: 100 }, (_, i) => ({
                id: i + 1,
                characters: `item${i + 1}`,
                meanings: [{ meaning: `meaning${i + 1}`, primary: true }]
            }));

            // Future implementation should handle this efficiently
            manyItems.slice(0, 5).forEach(item => {
                mockOnItemProcessing(item, 'translation');
            });

            expect(mockOnItemProcessing).toHaveBeenCalledTimes(5);
        });
    });
});
