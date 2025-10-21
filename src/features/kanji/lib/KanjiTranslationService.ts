/**
 * Kanji Translation Service
 * 
 * Erweitert den DeeplTranslationService mit Kanji-spezifischen Features:
 * - Contextual Translation (aus Mnemonics extrahiert)
 * - Primary + Alternative Meanings Support
 * - Smart Synonym Management für Kanji
 */

import { DeeplTranslationService } from '../../../shared/processing/services/DeeplTranslationService';
import type { ProcessableItem } from '../../../shared/processing/types/processing.types';
import { translateText } from '../../../shared/lib/deepl';
import { extractContextFromMnemonic } from '../../../shared/lib/contextual-translation';

// Kanji-specific types
export interface KanjiItem extends ProcessableItem {
    characters: string;
    primaryMeaning: string;
    alternativeMeanings: string[];
    meaningMnemonic?: string;
    currentSynonyms?: string[];
}

// Constants
const MAX_SYNONYM_BYTES = 63; // WaniKani has 64 byte limit, using 63 for safety margin

/**
 * Get UTF-8 byte length of a string (browser-compatible)
 */
const getByteLength = (str: string): number => {
    return new TextEncoder().encode(str).length;
};

/**
 * Truncate synonym to fit WaniKani's 64-byte limit per synonym.
 * Uses 63-byte safety margin for minimal overhead.
 * Adds "~" indicator when truncated.
 */
const truncateSynonym = (str: string): string => {
    let truncated = str.replace(/…/g, "~"); // Replace ellipsis (3 bytes) with tilde (1 byte)
    let wasTruncated = false;

    while (getByteLength(truncated) > MAX_SYNONYM_BYTES) {
        truncated = truncated.slice(0, -1);
        wasTruncated = true;
    }

    if (wasTruncated) {
        // Make sure we have space for the "~"
        while (getByteLength(truncated + "~") > MAX_SYNONYM_BYTES) {
            truncated = truncated.slice(0, -1);
        }
        truncated += "~";
    }

    return truncated;
};

/**
 * Kanji-specific Translation Service
 * 
 * Features:
 * - Contextual Translation (extrahiert aus Mnemonics)
 * - Primary Meaning Translation (immer zuerst)
 * - Alternative Meanings Translation (als Ergänzung)
 * - Byte-Length Truncation (WaniKani 64-byte limit)
 */
export class KanjiTranslationService extends DeeplTranslationService {
    constructor(apiKey: string) {
        super(apiKey);
    }

    /**
     * Override: Kanji-specific translation logic
     * 
     * Translates Primary Meaning + Alternative Meanings mit contextual hints.
     * Returns array: [primaryTranslation, ...alternativeTranslations]
     */
    async translate(item: ProcessableItem): Promise<string[]> {
        const kanjiItem = item as unknown as KanjiItem;
        const translations: string[] = [];

        // Step 1: Translate Primary Meaning (always first, highest priority)
        try {
            const context = extractContextFromMnemonic(
                kanjiItem.meaningMnemonic || '',
                kanjiItem.primaryMeaning
            );

            const primaryTranslation = await translateText(
                this.apiKey,
                kanjiItem.primaryMeaning,
                'DE',
                false, // formality
                3,     // max_retries
                context || undefined
            );

            const cleanedPrimary = primaryTranslation.trim();
            if (cleanedPrimary && cleanedPrimary.length > 0) {
                translations.push(truncateSynonym(cleanedPrimary));
                console.log(`✅ Primary translation for ${kanjiItem.characters}: ${cleanedPrimary}`);
            }
        } catch (error) {
            console.warn(`❌ Primary translation failed for "${kanjiItem.primaryMeaning}":`, error);
            // Continue with alternatives even if primary fails
        }

        // Step 2: Translate Alternative Meanings (as supplements)
        for (const alternativeMeaning of kanjiItem.alternativeMeanings || []) {
            try {
                const context = extractContextFromMnemonic(
                    kanjiItem.meaningMnemonic || '',
                    alternativeMeaning
                );

                const altTranslation = await translateText(
                    this.apiKey,
                    alternativeMeaning,
                    'DE',
                    false,
                    3,
                    context || undefined
                );

                const cleanedAlt = altTranslation.trim();
                if (cleanedAlt && cleanedAlt.length > 0) {
                    translations.push(truncateSynonym(cleanedAlt));
                    console.log(`✅ Alternative translation for ${kanjiItem.characters}: ${cleanedAlt}`);
                }
            } catch (error) {
                console.warn(`⚠️ Alternative translation failed for "${alternativeMeaning}":`, error);
                // Continue with next alternative
            }
        }

        console.log(`🎯 Total translations for ${kanjiItem.characters}: ${translations.length}`);
        return translations;
    }

    /**
     * Batch translation for kanji items
     * 
     * Note: Processes sequentially to respect rate limits and maintain order.
     * Primary meanings are always translated first, alternatives as supplements.
     */
    async translateBatch(items: ProcessableItem[]): Promise<string[][]> {
        const results: string[][] = [];

        for (const item of items) {
            try {
                const translations = await this.translate(item);
                results.push(translations);
            } catch (error) {
                console.warn(`Translation failed for item ${item.id}:`, error);
                results.push([]); // Empty array on error
            }
        }

        return results;
    }
}
