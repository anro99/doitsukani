import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamingVocabularyProcessor } from './streaming-vocabulary-processor';
import type { VocabularyItem, StreamingProgress, StreamingProcessorConfig } from './streaming-vocabulary-processor';

describe('StreamingVocabularyProcessor', () => {
    let processor: StreamingVocabularyProcessor;
    let mockTranslate: vi.MockedFunction<any>;
    let mockUpload: vi.MockedFunction<any>;
    let mockProgress: vi.MockedFunction<any>;
    let config: StreamingProcessorConfig;

    beforeEach(() => {
        mockTranslate = vi.fn();
        mockUpload = vi.fn();
        mockProgress = vi.fn();

        config = {
            translateFn: mockTranslate,
            uploadFn: mockUpload,
            onProgress: mockProgress,
            concurrency: 2,
            rateLimitMs: 10 // Short delay for tests
        };

        processor = new StreamingVocabularyProcessor(config);
    });

    afterEach(() => {
        if (processor) {
            processor.stop();
        }
    });

    describe('Basic Functionality', () => {
        it('should process items in streaming fashion', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            mockTranslate
                .mockResolvedValueOnce({ translatedSynonyms: ['Test1'] })
                .mockResolvedValueOnce({ translatedSynonyms: ['Test2'] });

            mockUpload
                .mockResolvedValueOnce({ success: true, action: 'created' })
                .mockResolvedValueOnce({ success: true, action: 'updated' });

            // Act
            const result = await processor.process(items);

            // Assert
            expect(result.processed).toBe(2);
            expect(mockTranslate).toHaveBeenCalledTimes(2);
            expect(mockUpload).toHaveBeenCalledTimes(2);

            // Verify that upload was called with translated data
            expect(mockUpload).toHaveBeenNthCalledWith(1,
                expect.objectContaining({
                    id: 1,
                    characters: 'test1',
                    translatedSynonyms: ['Test1']
                })
            );
            expect(mockUpload).toHaveBeenNthCalledWith(2,
                expect.objectContaining({
                    id: 2,
                    characters: 'test2',
                    translatedSynonyms: ['Test2']
                })
            );
        });

        it('should handle single item processing', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'single', meanings: ['single'] }
            ];

            mockTranslate.mockResolvedValue({ translatedSynonyms: ['Einzeln'] });
            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            const result = await processor.process(items);

            // Assert
            expect(result.processed).toBe(1);
            expect(result.errors).toHaveLength(0);
        });

        it('should handle empty items array', async () => {
            // Arrange
            const items: VocabularyItem[] = [];

            // Act
            const result = await processor.process(items);

            // Assert
            expect(result.processed).toBe(0);
            expect(result.errors).toHaveLength(0);
            expect(mockTranslate).not.toHaveBeenCalled();
            expect(mockUpload).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle translation errors gracefully', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            mockTranslate
                .mockRejectedValueOnce(new Error('Translation failed'))
                .mockResolvedValueOnce({ translatedSynonyms: ['Test2'] });

            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            const result = await processor.process(items);

            // Assert
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toMatchObject({
                phase: 'translation',
                error: 'Translation failed',
                item: items[0]
            });

            // Should not upload failed translation, but should upload successful one
            expect(mockUpload).toHaveBeenCalledTimes(1);
            expect(result.processed).toBe(1);
        });

        it('should handle upload errors gracefully', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            mockTranslate
                .mockResolvedValueOnce({ translatedSynonyms: ['Test1'] })
                .mockResolvedValueOnce({ translatedSynonyms: ['Test2'] });

            mockUpload
                .mockRejectedValueOnce(new Error('Upload failed'))
                .mockResolvedValueOnce({ success: true, action: 'created' });

            // Act
            const result = await processor.process(items);

            // Assert
            expect(result.errors).toHaveLength(1);
            expect(result.errors[0]).toMatchObject({
                phase: 'upload',
                error: 'Upload failed'
            });

            expect(result.processed).toBe(1); // One successful upload
        });

        it('should continue processing after individual item failures', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'fail', meanings: ['fail'] },
                { id: 2, characters: 'success', meanings: ['success'] }
            ];

            mockTranslate
                .mockRejectedValueOnce(new Error('Translation failed'))
                .mockResolvedValueOnce({ translatedSynonyms: ['Erfolg'] });

            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            const result = await processor.process(items);

            // Assert
            expect(result.processed).toBe(1);
            expect(result.errors).toHaveLength(1);
            expect(mockUpload).toHaveBeenCalledTimes(1); // Only successful translation uploaded
        });
    });

    describe('Progress Updates', () => {
        it('should provide real-time progress updates', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            mockTranslate.mockImplementation((item) =>
                new Promise(resolve =>
                    setTimeout(() => resolve({ translatedSynonyms: [`Translated-${item.id}`] }), 50)
                )
            );
            mockUpload.mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() => resolve({ success: true, action: 'created' }), 30)
                )
            );

            // Act
            await processor.process(items);

            // Assert
            expect(mockProgress).toHaveBeenCalled();

            // Check that progress was called with expected structure
            const progressCalls = mockProgress.mock.calls;
            expect(progressCalls.length).toBeGreaterThan(0);

            // Verify progress call structure
            const firstCall = progressCalls[0][0] as StreamingProgress;
            expect(firstCall).toMatchObject({
                phase: expect.stringMatching(/translation|upload|both/),
                translationProgress: expect.any(Number),
                uploadProgress: expect.any(Number),
                totalItems: 2,
                translatedItems: expect.any(Number),
                uploadedItems: expect.any(Number),
                errors: expect.any(Array)
            });
        });

        it('should update current item information', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] }
            ];

            mockTranslate.mockResolvedValue({ translatedSynonyms: ['Test1'] });
            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            await processor.process(items);

            // Assert
            const progressCalls = mockProgress.mock.calls;
            const callsWithCurrentItem = progressCalls.filter(call =>
                call[0].currentTranslation || call[0].currentUpload
            );

            expect(callsWithCurrentItem.length).toBeGreaterThan(0);
        });

        it('should calculate correct progress percentages', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            mockTranslate.mockResolvedValue({ translatedSynonyms: ['Test'] });
            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            await processor.process(items);

            // Assert
            const finalProgressCall = mockProgress.mock.calls[mockProgress.mock.calls.length - 1][0] as StreamingProgress;
            expect(finalProgressCall.translationProgress).toBe(100);
            expect(finalProgressCall.uploadProgress).toBe(100);
        });
    });

    describe('Phase Detection', () => {
        it('should correctly identify processing phases', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            // Make translation slower than upload to test phase detection
            mockTranslate.mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() => resolve({ translatedSynonyms: ['Test'] }), 100)
                )
            );
            mockUpload.mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() => resolve({ success: true, action: 'created' }), 20)
                )
            );

            // Act
            await processor.process(items);

            // Assert
            const progressCalls = mockProgress.mock.calls.map(call => call[0] as StreamingProgress);

            // Should start with translation phase
            expect(progressCalls[0].phase).toBe('translation');

            // Should have 'both' phase when translation is ahead of upload
            const bothPhases = progressCalls.filter(call => call.phase === 'both');
            expect(bothPhases.length).toBeGreaterThan(0);
        });
    });

    describe('Stop Functionality', () => {
        it('should stop processing when requested', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] },
                { id: 3, characters: 'test3', meanings: ['test3'] }
            ];

            mockTranslate.mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() => resolve({ translatedSynonyms: ['Test'] }), 100)
                )
            );
            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            const processPromise = processor.process(items);

            // Stop after a short delay
            setTimeout(() => processor.stop(), 50);

            const result = await processPromise;

            // Assert
            expect(result.processed).toBeLessThan(items.length);
        });

        it('should not start new work after stop is called', async () => {
            // Arrange
            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            mockTranslate.mockImplementation(() =>
                new Promise(resolve =>
                    setTimeout(() => resolve({ translatedSynonyms: ['Test'] }), 200)
                )
            );
            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            processor.stop(); // Stop before processing
            const result = await processor.process(items);

            // Assert
            expect(result.processed).toBe(0);
            expect(mockTranslate).not.toHaveBeenCalled();
        });
    });

    describe('Rate Limiting', () => {
        it('should respect rate limiting configuration', async () => {
            // Arrange
            const rateLimitMs = 100;
            const customConfig = { ...config, rateLimitMs };
            const rateLimitedProcessor = new StreamingVocabularyProcessor(customConfig);

            const items: VocabularyItem[] = [
                { id: 1, characters: 'test1', meanings: ['test1'] },
                { id: 2, characters: 'test2', meanings: ['test2'] }
            ];

            mockTranslate.mockResolvedValue({ translatedSynonyms: ['Test'] });
            mockUpload.mockResolvedValue({ success: true, action: 'created' });

            // Act
            const startTime = Date.now();
            await rateLimitedProcessor.process(items);
            const endTime = Date.now();

            // Assert
            // Should take at least rateLimitMs * items.length due to rate limiting
            expect(endTime - startTime).toBeGreaterThanOrEqual(rateLimitMs);

            rateLimitedProcessor.stop();
        });
    });
});
