import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DeepL module
vi.mock('../../shared/lib/deepl', () => ({
    translateText: vi.fn()
}));

import * as deepl from '../../shared/lib/deepl';
const mockedDeepL = vi.mocked(deepl);

import {
    translateVocabularyMeanings,
    VocabularyItem
} from '../../features/vocabulary/lib/vocabulary-translation';

describe('🎯 DeepL Translation Cleaning', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Pre-processing: English prefix removal', () => {
        it('should remove "To " prefix before sending to DeepL', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 1,
                characters: '入れる',
                meanings: [
                    { meaning: 'To Insert', primary: true },
                    { meaning: 'To Put In', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            // Mock DeepL to return clean translations (simulating what happens after prefix removal)
            mockedDeepL.translateText
                .mockResolvedValueOnce('Einfügen')    // for 'Insert' (cleaned from 'To Insert')
                .mockResolvedValueOnce('Einstecken'); // for 'Put In' (cleaned from 'To Put In')

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Verify DeepL was called with cleaned meanings (without "To ")
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Insert', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Put In', 'DE');

            // Expect clean results
            expect(result.translatedSynonyms).toEqual(['Einfügen', 'Einstecken']);
        });

        it('should remove "A ", "An ", "The " prefixes before sending to DeepL', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 2,
                characters: '本',
                meanings: [
                    { meaning: 'A Book', primary: true },
                    { meaning: 'An Apple', primary: false },
                    { meaning: 'The House', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            mockedDeepL.translateText
                .mockResolvedValueOnce('Buch')
                .mockResolvedValueOnce('Apfel')
                .mockResolvedValueOnce('Haus');

            await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Verify DeepL was called with cleaned meanings (without articles)
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Book', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Apple', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'House', 'DE');
        });

        it('should handle case-insensitive prefix removal', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 3,
                characters: '行く',
                meanings: [
                    { meaning: 'to go', primary: true },
                    { meaning: 'TO WALK', primary: false },
                    { meaning: 'a journey', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            mockedDeepL.translateText
                .mockResolvedValueOnce('gehen')
                .mockResolvedValueOnce('laufen')
                .mockResolvedValueOnce('Reise');

            await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Verify case-insensitive cleaning
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'go', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'WALK', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'journey', 'DE');
        });
    });

    describe('Post-processing: German prefix and punctuation removal', () => {
        it('should remove trailing punctuation from DeepL results', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 4,
                characters: '入る',
                meanings: [
                    { meaning: 'To Enter', primary: true }
                ]
            };

            const deeplToken = 'test-token';

            // Mock DeepL returning translation with punctuation (realistic scenario)
            mockedDeepL.translateText.mockResolvedValueOnce('eingeben.');

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Should remove the trailing period
            expect(result.translatedSynonyms).toEqual(['eingeben']);
        });

        it('should remove various types of trailing punctuation', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 5,
                characters: '言う',
                meanings: [
                    { meaning: 'say', primary: true },
                    { meaning: 'tell', primary: false },
                    { meaning: 'speak', primary: false },
                    { meaning: 'talk', primary: false },
                    { meaning: 'ask', primary: false },
                    { meaning: 'call', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            // Mock DeepL returning various punctuation
            mockedDeepL.translateText
                .mockResolvedValueOnce('sagen.')     // period
                .mockResolvedValueOnce('erzählen!')  // exclamation
                .mockResolvedValueOnce('sprechen?')  // question mark
                .mockResolvedValueOnce('reden:')     // colon
                .mockResolvedValueOnce('fragen;')    // semicolon
                .mockResolvedValueOnce('rufen,');    // comma

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // All punctuation should be removed
            expect(result.translatedSynonyms).toEqual([
                'sagen',
                'erzählen',
                'sprechen',
                'reden',
                'fragen',
                'rufen'
            ]);
        });

        it('should remove German prefixes as fallback (zum, zu, der, die, das, ein, eine)', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 6,
                characters: '作る',
                meanings: [
                    { meaning: 'create', primary: true },
                    { meaning: 'make', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            // Mock DeepL returning German with prefixes (edge case scenario)
            mockedDeepL.translateText
                .mockResolvedValueOnce('zum Erstellen')  // "zum " prefix
                .mockResolvedValueOnce('das Machen');     // "das " prefix

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Prefixes should be removed
            expect(result.translatedSynonyms).toEqual(['Erstellen', 'Machen']);
        });
    });

    describe('Combined pre and post-processing', () => {
        it('should handle both prefix removal and punctuation cleaning', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 7,
                characters: '取る',
                meanings: [
                    { meaning: 'To Take', primary: true },
                    { meaning: 'To Get', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            // Mock realistic scenario: DeepL adds punctuation even after prefix cleaning
            mockedDeepL.translateText
                .mockResolvedValueOnce('nehmen.')    // Clean input "Take" but DeepL adds period
                .mockResolvedValueOnce('bekommen!'); // Clean input "Get" but DeepL adds exclamation

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Should be called with cleaned prefixes
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Take', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Get', 'DE');

            // Results should have punctuation removed
            expect(result.translatedSynonyms).toEqual(['nehmen', 'bekommen']);
        });

        it('should preserve whitespace and case in the middle of words', async () => {
            const mockVocabulary: VocabularyItem = {
                id: 8,
                characters: '持つ',
                meanings: [
                    { meaning: 'To Hold On', primary: true },
                    { meaning: 'To Carry Out', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            mockedDeepL.translateText
                .mockResolvedValueOnce('festhalten')
                .mockResolvedValueOnce('durchführen');

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Multi-word inputs should be cleaned but internal spacing preserved
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Hold On', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Carry Out', 'DE');

            expect(result.translatedSynonyms).toEqual(['festhalten', 'durchführen']);
        });
    });

    describe('Real-world problem cases', () => {
        it('should fix the specific 入れる problem case', async () => {
            // Real problem case from user report
            const mockVocabulary: VocabularyItem = {
                id: 9,
                characters: '入れる',
                meanings: [
                    { meaning: 'To Insert', primary: true },
                    { meaning: 'To Put In', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            // Mock the actual problematic responses we want to fix
            mockedDeepL.translateText
                .mockResolvedValueOnce('Einfügen')    // Good result after prefix removal
                .mockResolvedValueOnce('Einstecken'); // Good result after prefix removal

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Should get clean results instead of "zum Einfügen", "zum Einstecken"
            expect(result.translatedSynonyms).toEqual(['Einfügen', 'Einstecken']);

            // Should have called DeepL with cleaned inputs
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Insert', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Put In', 'DE');
        });

        it('should fix the specific 入る problem case with punctuation', async () => {
            // Real problem case from user report with punctuation
            const mockVocabulary: VocabularyItem = {
                id: 10,
                characters: '入る',
                meanings: [
                    { meaning: 'To Enter', primary: true },
                    { meaning: 'To Go In', primary: false }
                ]
            };

            const deeplToken = 'test-token';

            // Mock problematic DeepL responses with punctuation
            mockedDeepL.translateText
                .mockResolvedValueOnce('eingeben.')     // With period (problem case)
                .mockResolvedValueOnce('hineingehen'); // Clean

            const result = await translateVocabularyMeanings(mockVocabulary, deeplToken);

            // Both should be clean - period removed from first
            expect(result.translatedSynonyms).toEqual(['eingeben', 'hineingehen']);

            // Should have been called with cleaned prefixes
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Enter', 'DE');
            expect(mockedDeepL.translateText).toHaveBeenCalledWith(deeplToken, 'Go In', 'DE');
        });
    });
});