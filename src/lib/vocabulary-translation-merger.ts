/**
 * Vocabulary Translation Merger
 * 
 * Combines DeepL translations (primary) with prebuilt translations (secondary)
 * while maintaining DeepL priority and respecting WaniKani synonym limits.
 */

export interface TranslationMergerOptions {
    /** Whether to perform case-sensitive duplicate detection (default: false) */
    caseSensitive?: boolean;
}

/**
 * Merges primary translations (DeepL) with secondary translations (prebuilt).
 * 
 * CRITICAL REQUIREMENTS:
 * - DeepL translations ALWAYS have priority and are NEVER reduced
 * - Prebuilt translations are added as supplements, avoiding duplicates
 * - When exceeding maxSynonyms, prebuilt translations are trimmed first
 * - Case-insensitive duplicate detection by default
 * 
 * @param primaryTranslations - DeepL translations (highest priority, never reduced)
 * @param secondaryTranslations - Prebuilt translations (supplements)
 * @param maxSynonyms - Maximum number of synonyms (WaniKani limit: 8)
 * @param options - Additional options for merging behavior
 * @returns Combined translations with DeepL priority maintained
 */
export const mergeTranslations = (
    primaryTranslations: string[],
    secondaryTranslations: string[],
    maxSynonyms: number = 8,
    options: TranslationMergerOptions = {}
): string[] => {
    const { caseSensitive = false } = options;

    // CRITICAL: DeepL translations are NEVER reduced or modified
    // They have absolute priority regardless of limits
    const result = [...primaryTranslations];

    // Normalize function for case-insensitive comparison
    const normalize = (str: string) => caseSensitive ? str : str.toLowerCase().trim();

    // Create set of existing primary translations for duplicate detection
    const existingNormalized = new Set(primaryTranslations.map(normalize));

    // Filter secondary translations to avoid duplicates with primary
    const uniqueSecondaryTranslations = secondaryTranslations.filter(
        translation => {
            const normalizedTranslation = normalize(translation);
            return !existingNormalized.has(normalizedTranslation);
        }
    );

    // Calculate how many secondary translations we can add
    const availableSlots = Math.max(0, maxSynonyms - primaryTranslations.length);

    // Add secondary translations up to the available slots
    // If primary already exceeds maxSynonyms, no secondary will be added
    const secondaryToAdd = uniqueSecondaryTranslations.slice(0, availableSlots);

    result.push(...secondaryToAdd);

    return result;
};

/**
 * Retrieves prebuilt translations for a specific vocabulary ID.
 * 
 * @param vocabularyId - WaniKani vocabulary ID
 * @param translationsJson - Translation mapping object
 * @returns Array of prebuilt translations or empty array if none found
 */
export const getPrebuiltTranslations = (
    vocabularyId: number,
    translationsJson: Record<string, string[]>
): string[] => {
    const translations = translationsJson[vocabularyId.toString()];

    // Handle null, undefined, or invalid values
    if (!Array.isArray(translations)) {
        return [];
    }

    return translations;
};

/**
 * Validates that translation arrays don't contain invalid values.
 * 
 * @param translations - Array of translation strings
 * @returns Filtered array with only valid string translations
 */
export const validateTranslations = (translations: string[]): string[] => {
    return translations.filter(translation =>
        typeof translation === 'string' &&
        translation.trim().length > 0
    );
};

/**
 * Debug helper to log translation merge statistics.
 * 
 * @param vocabularyId - Vocabulary ID for logging
 * @param primaryCount - Number of primary translations
 * @param secondaryCount - Number of secondary translations
 * @param finalCount - Number of final merged translations
 * @param duplicatesRemoved - Number of duplicates removed
 */
export const logMergeStatistics = (
    vocabularyId: number,
    primaryCount: number,
    secondaryCount: number,
    finalCount: number,
    duplicatesRemoved: number
): void => {
    console.log(`🔀 Translation merge for vocabulary ${vocabularyId}:`, {
        primary_translations: primaryCount,
        secondary_translations: secondaryCount,
        duplicates_removed: duplicatesRemoved,
        final_count: finalCount,
        within_limit: finalCount <= 8
    });
};

/**
 * Advanced merge function with detailed statistics and validation.
 * 
 * @param vocabularyId - Vocabulary ID for debugging
 * @param primaryTranslations - DeepL translations
 * @param secondaryTranslations - Prebuilt translations
 * @param maxSynonyms - Maximum synonyms allowed
 * @param options - Merge options
 * @returns Object with merged translations and statistics
 */
export const mergeTranslationsWithStats = (
    vocabularyId: number,
    primaryTranslations: string[],
    secondaryTranslations: string[],
    maxSynonyms: number = 8,
    options: TranslationMergerOptions = {}
) => {
    // Validate inputs
    const validPrimary = validateTranslations(primaryTranslations);
    const validSecondary = validateTranslations(secondaryTranslations);

    // Perform merge
    const merged = mergeTranslations(validPrimary, validSecondary, maxSynonyms, options);

    // Calculate statistics
    const duplicatesRemoved = validSecondary.length - (merged.length - validPrimary.length);

    // Log statistics in debug mode
    if (process.env.NODE_ENV === 'development') {
        logMergeStatistics(
            vocabularyId,
            validPrimary.length,
            validSecondary.length,
            merged.length,
            duplicatesRemoved
        );
    }

    return {
        translations: merged,
        statistics: {
            primaryCount: validPrimary.length,
            secondaryCount: validSecondary.length,
            finalCount: merged.length,
            duplicatesRemoved,
            exceedsLimit: merged.length > maxSynonyms,
            primaryPreserved: merged.slice(0, validPrimary.length).join(',') === validPrimary.join(',')
        }
    };
};
