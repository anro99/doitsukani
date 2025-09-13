import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DeepL module
vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn()
}));

import * as deepl from '../../lib/deepl';
const mockedDeepL = vi.mocked(deepl);

// Import the function and types we just implemented
import {
    translateVocabularyMeanings,
    VocabularyItem,
    VocabularyMeaning,
    TranslationResult
} from '../../lib/vocabulary-translation';

describe('🔴 RED Phase: Vocabulary Translation Processing (TDD)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('translateVocabularyMeanings', () => {
        it('should translate vocabulary meanings using DeepL', async () => {
            // 🔴 RED: This test will fail because the function doesn't exist yet

            // Arrange
            const mockVocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [
                    { meaning: 'dog', primary: true },
                    { meaning: 'canine', primary: false }
                ]
            };

            const deeplToken = 'test-deepl-token';

            // Mock DeepL responses
            mockedDeepL.translateText
                .mockResolvedValueOnce('Hund')      // for 'dog'
                .mockResolvedValueOnce('Hundeartig'); // for 'canine'

            // Act & Assert
            // 🔴 This will fail because translateVocabularyMeanings doesn't exist
            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Expected behavior
            expect(result).toEqual({
                vocabularyId: 1,
                originalMeanings: ['dog', 'canine'],
                translatedSynonyms: ['Hund', 'Hundeartig'],
                selected: true,
                error: undefined
            });

            // Verify DeepL was called correctly
            expect(mockedDeepL.translateText).toHaveBeenCalledTimes(2);
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'dog', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'canine', 'DE');
        });

        it('should handle translation errors gracefully', async () => {
            // 🔴 RED: Another failing test for error handling

            const mockVocabulary: VocabularyItem = {
                id: 2,
                characters: '猫',
                meanings: [
                    { meaning: 'cat', primary: true }
                ]
            };

            const deeplToken = 'invalid-token';

            // Mock DeepL error
            mockedDeepL.translateText.mockRejectedValue(new Error('DeepL API error'));

            // Act & Assert
            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            expect(result).toEqual({
                vocabularyId: 2,
                originalMeanings: ['cat'],
                translatedSynonyms: [],
                selected: false,
                error: 'DeepL API error'
            });
        });

        it('should handle empty meanings array', async () => {
            // 🔴 RED: Edge case test

            const mockVocabulary: VocabularyItem = {
                id: 3,
                characters: '？',
                meanings: []
            };

            const deeplToken = 'test-token';

            // Act & Assert
            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            expect(result).toEqual({
                vocabularyId: 3,
                originalMeanings: [],
                translatedSynonyms: [],
                selected: false,
                error: undefined
            });

            // Should not call DeepL for empty meanings
            expect(mockedDeepL.translateText).not.toHaveBeenCalled();
        });

        // 🔴 New failing tests for expanded coverage
        it('should handle invalid vocabulary input', async () => {
            const invalidVocabulary = null as any;
            const deeplToken = 'test-token';

            const result = await translateVocabularyMeanings(invalidVocabulary, deeplToken);

            expect(result).toEqual({
                vocabularyId: 0,
                originalMeanings: [],
                translatedSynonyms: [],
                selected: false,
                error: 'Invalid vocabulary item'
            });
        });

        it('should handle missing DeepL token', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 4,
                characters: '本',
                meanings: [{ meaning: 'book', primary: true }]
            };

            const result = await translateVocabularyMeanings(mockVocabulary, '');

            expect(result).toEqual({
                vocabularyId: 4,
                originalMeanings: [],
                translatedSynonyms: [],
                selected: false,
                error: 'DeepL token is required'
            });
        });

        it('should handle whitespace-only meanings', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 5,
                characters: '水',
                meanings: [
                    { meaning: '   ', primary: true },
                    { meaning: '', primary: false },
                    { meaning: 'water', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            mockedDeepL.translateText.mockResolvedValue('Wasser');

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            expect(result.translatedSynonyms).toEqual(['Wasser']);
            expect(result.selected).toBe(true);
            // Should only call DeepL for the valid 'water' meaning
            expect(mockedDeepL.translateText).toHaveBeenCalledTimes(1);
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'water', 'DE');
        });

        it('should handle partial translation failures gracefully', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 6,
                characters: '車',
                meanings: [
                    { meaning: 'car', primary: true },
                    { meaning: 'vehicle', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            // First translation succeeds, second fails
            mockedDeepL.translateText
                .mockResolvedValueOnce('Auto')
                .mockRejectedValueOnce(new Error('Rate limit exceeded'));

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            expect(result).toEqual({
                vocabularyId: 6,
                originalMeanings: ['car', 'vehicle'],
                translatedSynonyms: [],
                selected: false,
                error: 'Rate limit exceeded'
            });
        });
    });
});
