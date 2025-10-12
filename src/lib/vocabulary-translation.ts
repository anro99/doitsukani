import * as deepl from '../lib/deepl';

// Type definitions
export interface VocabularyMeaning {
    meaning: string;
    primary: boolean;
}

export interface VocabularyItem {
    id: number;
    characters: string;
    meanings: VocabularyMeaning[];
}

export interface TranslationResult {
    vocabularyId: number;
    originalMeanings: string[];
    translatedSynonyms: string[];
    selected: boolean;
    error?: string;
}

/**
 * � REFACTOR Phase: Improved implementation with better error handling and structure
 * Translates vocabulary meanings using DeepL API with proper error recovery
 */
export async function translateVocabularyMeanings(
    vocabulary: VocabularyItem,
    deeplToken: string
): Promise<TranslationResult> {
    // Input validation
    if (!vocabulary || typeof vocabulary.id !== 'number') {
        return createErrorResult(0, [], 'Invalid vocabulary item');
    }

    if (!deeplToken || deeplToken.trim() === '') {
        return createErrorResult(vocabulary.id, [], 'DeepL token is required');
    }

    // Handle empty meanings array early
    if (!vocabulary.meanings || vocabulary.meanings.length === 0) {
        return createSuccessResult(vocabulary.id, [], [], false);
    }

    try {
        const originalMeanings = vocabulary.meanings.map(m => m.meaning);
        const translatedSynonyms = await translateMeanings(originalMeanings, deeplToken);

        return createSuccessResult(
            vocabulary.id,
            originalMeanings,
            translatedSynonyms,
            translatedSynonyms.length > 0
        );

    } catch (error) {
        const originalMeanings = vocabulary.meanings?.map(m => m.meaning) || [];
        const errorMessage = error instanceof Error ? error.message : 'Unknown translation error';
        return createErrorResult(vocabulary.id, originalMeanings, errorMessage);
    }
}

/**
 * Helper function to clean meanings before translation
 * Removes common English prefixes that cause DeepL to add German articles/prepositions
 */
function cleanMeaningForTranslation(meaning: string): string {
    return meaning
        .replace(/^To\s+/i, '')     // Remove "To " prefix ("To Insert" → "Insert")
        .replace(/^A\s+/i, '')      // Remove "A " prefix ("A Book" → "Book")
        .replace(/^An\s+/i, '')     // Remove "An " prefix ("An Apple" → "Apple")
        .replace(/^The\s+/i, '')    // Remove "The " prefix ("The House" → "House")
        .trim();
}

/**
 * Helper function to clean DeepL results (fallback for edge cases)
 * Removes common German prefixes that shouldn't be in WaniKani synonyms
 */
function cleanDeepLResult(translation: string): string {
    return translation
        .replace(/^zum\s+/i, '')    // Remove "zum " prefix
        .replace(/^zu\s+/i, '')     // Remove "zu " prefix
        .replace(/^der\s+/i, '')    // Remove "der " prefix
        .replace(/^die\s+/i, '')    // Remove "die " prefix
        .replace(/^das\s+/i, '')    // Remove "das " prefix
        .replace(/^ein\s+/i, '')    // Remove "ein " prefix
        .replace(/^eine\s+/i, '')   // Remove "eine " prefix
        .trim();
}

/**
 * Helper function to translate multiple meanings
 */
async function translateMeanings(meanings: string[], deeplToken: string): Promise<string[]> {
    const translatedSynonyms: string[] = [];

    for (const meaning of meanings) {
        if (!meaning || meaning.trim() === '') {
            continue; // Skip empty meanings
        }

        // 🎯 PRE-PROCESSING: Clean the meaning before sending to DeepL
        const cleanedMeaning = cleanMeaningForTranslation(meaning.trim());

        console.log(`🔄 Translation: "${meaning}" → cleaned: "${cleanedMeaning}"`);

        const translated = await deepl.translateText(deeplToken, cleanedMeaning, 'DE');

        if (translated && translated.trim() !== '') {
            // 🧹 POST-PROCESSING: Clean the result as fallback (in case some prefixes remain)
            const cleanedTranslation = cleanDeepLResult(translated.trim());

            console.log(`✅ Translation result: "${meaning}" → "${cleanedTranslation}" (raw: "${translated}")`);

            translatedSynonyms.push(cleanedTranslation);
        }
    }

    return translatedSynonyms;
}

/**
 * Helper function to create success result
 */
function createSuccessResult(
    vocabularyId: number,
    originalMeanings: string[],
    translatedSynonyms: string[],
    selected: boolean
): TranslationResult {
    return {
        vocabularyId,
        originalMeanings,
        translatedSynonyms,
        selected,
        error: undefined
    };
}

/**
 * Helper function to create error result
 */
function createErrorResult(
    vocabularyId: number,
    originalMeanings: string[],
    errorMessage: string
): TranslationResult {
    return {
        vocabularyId,
        originalMeanings,
        translatedSynonyms: [],
        selected: false,
        error: errorMessage
    };
}
