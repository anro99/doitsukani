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
 * Helper function to translate multiple meanings
 */
async function translateMeanings(meanings: string[], deeplToken: string): Promise<string[]> {
    const translatedSynonyms: string[] = [];

    for (const meaning of meanings) {
        if (!meaning || meaning.trim() === '') {
            continue; // Skip empty meanings
        }

        const translated = await deepl.translateText(deeplToken, meaning.trim(), 'DE');
        if (translated && translated.trim() !== '') {
            translatedSynonyms.push(translated.trim());
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
