/**
 * Test: Vocabulary Processing Integration
 * Tests the actual vocabulary processing pipeline with real-like data
 */

import { describe, it, expect, vi } from 'vitest';
import { processVocabularyComplete, CompleteProcessingOptions, ProcessingPhase } from '../../lib/vocabulary-integration';
import { VocabularyItem } from '../../lib/vocabulary-translation';

// Mock the actual API calls but with realistic behavior
vi.mock('../../lib/vocabulary-translation', () => ({
    translateVocabularyMeanings: vi.fn()
}));

vi.mock('../../lib/vocabulary-wanikani-upload', () => ({
    uploadVocabularyBatch: vi.fn()
}));

describe.skip('Vocabulary Processing Integration Real-World Test - OBSOLETE - Sequential Mode Tests', () => {
    it('should provide proper progress updates during processing', async () => {
        const mockTranslate = vi.mocked((await import('../../lib/vocabulary-translation')).translateVocabularyMeanings);
        const mockUpload = vi.mocked((await import('../../lib/vocabulary-wanikani-upload')).uploadVocabularyBatch);

        // Test data that resembles real vocabulary
        const testVocabulary: VocabularyItem[] = [
            { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
            { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] },
            { id: 3, characters: '鳥', meanings: [{ meaning: 'bird', primary: true }] },
            { id: 4, characters: '魚', meanings: [{ meaning: 'fish', primary: true }] }
        ];

        const options: CompleteProcessingOptions = {
            batchSize: 2,
            synonymMode: 'smart-merge',
            apiToken: 'real-api-token',
            deeplToken: 'real-deepl-token',
            enableProgressReporting: true,
            stopOnFirstError: false
        };

        // Mock realistic translation responses
        mockTranslate.mockImplementation(async (vocab) => {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 100));

            const translations: { [key: string]: string[] } = {
                '犬': ['Hund'],
                '猫': ['Katze'],
                '鳥': ['Vogel'],
                '魚': ['Fisch']
            };

            return {
                vocabularyId: vocab.id,
                originalMeanings: vocab.meanings.map(m => m.meaning),
                translatedSynonyms: translations[vocab.characters] || ['Test'],
                selected: true,
                error: undefined
            };
        });

        // Mock realistic upload response
        mockUpload.mockResolvedValue({
            success: true,
            totalItems: 4,
            createdCount: 2,
            updatedCount: 2,
            errorCount: 0,
            results: [],
            errors: []
        });

        // Track all progress updates
        const progressUpdates: ProcessingPhase[] = [];
        const onProgress = (phase: ProcessingPhase) => {
            progressUpdates.push(phase);
            console.log(`Progress: ${phase.phase} - ${phase.status} - ${phase.progress}%`);
        };

        // Execute the processing
        const result = await processVocabularyComplete(testVocabulary, options, onProgress);

        // Verify progress updates were sent
        expect(progressUpdates.length).toBeGreaterThan(0);

        // Should have translation start, progress updates, completion
        const translationPhases = progressUpdates.filter(p => p.phase === 'translation');
        expect(translationPhases.length).toBeGreaterThanOrEqual(3); // start, progress(es), complete

        // Should have upload phases
        const uploadPhases = progressUpdates.filter(p => p.phase === 'upload');
        expect(uploadPhases.length).toBeGreaterThanOrEqual(2); // start, complete

        // Check progress values make sense
        const inProgressUpdates = progressUpdates.filter(p => p.status === 'in-progress');
        expect(inProgressUpdates.length).toBeGreaterThan(0);

        // Progress should increase
        const progressValues = inProgressUpdates.map(p => p.progress);
        for (let i = 1; i < progressValues.length; i++) {
            expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
        }

        // Verify final result
        expect(result.success).toBe(true);
        expect(result.translationResults.successCount).toBe(4);
        expect(result.uploadResults.success).toBe(true);
        expect(mockTranslate).toHaveBeenCalledTimes(4);
        expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully with progress updates', async () => {
        const mockTranslate = vi.mocked((await import('../../lib/vocabulary-translation')).translateVocabularyMeanings);
        const mockUpload = vi.mocked((await import('../../lib/vocabulary-wanikani-upload')).uploadVocabularyBatch);

        const testVocabulary: VocabularyItem[] = [
            { id: 1, characters: '犬', meanings: [{ meaning: 'dog', primary: true }] },
            { id: 2, characters: '猫', meanings: [{ meaning: 'cat', primary: true }] }
        ];

        const options: CompleteProcessingOptions = {
            batchSize: 1,
            synonymMode: 'smart-merge',
            apiToken: 'invalid-api-token',
            deeplToken: 'invalid-deepl-token',
            enableProgressReporting: true,
            stopOnFirstError: false
        };

        // Mock API failures
        mockTranslate.mockResolvedValue({
            vocabularyId: 1,
            originalMeanings: ['dog'],
            translatedSynonyms: [],
            selected: false,
            error: 'DeepL API key invalid'
        });

        mockUpload.mockResolvedValue({
            success: false,
            totalItems: 0,
            createdCount: 0,
            updatedCount: 0,
            errorCount: 0,
            results: [],
            errors: ['No successful translations to upload']
        });

        const progressUpdates: ProcessingPhase[] = [];
        const onProgress = (phase: ProcessingPhase) => {
            progressUpdates.push(phase);
        };

        const result = await processVocabularyComplete(testVocabulary, options, onProgress);

        // Should still provide progress updates even with errors
        expect(progressUpdates.length).toBeGreaterThan(0);

        // Should complete but with errors
        expect(result.success).toBe(false); // Should fail due to translation errors
        expect(result.translationResults.errorCount).toBe(2);
    });
});
