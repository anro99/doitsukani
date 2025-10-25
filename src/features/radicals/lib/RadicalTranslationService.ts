/**
 * Radical Translation Service
 * 
 * Erweitert den DeeplTranslationService mit Radical-spezifischen Features:
 * - Primary Meaning Translation (simpler als Kanji - keine alternative meanings)
 * - Nullable Characters Handling (Radicals können text-only sein)
 * - Byte-Length Truncation (WaniKani 64-byte limit)
 * 
 * Note: Radicals haben keine kontextuelle Übersetzung (mnemonics werden nicht verwendet)
 */

import { DeeplTranslationService } from '../../../shared/processing/services/DeeplTranslationService';
import type { ProcessableItem } from '../../../shared/processing/types/processing.types';
import { translateText } from '../../../shared/lib/deepl';

// Radical-specific types
export interface RadicalItem extends ProcessableItem {
    id: number;
    characters: string | null; // ⚠️ Kann null sein (text-only radicals)
    primaryMeaning: string;
    meaningMnemonic?: string;
    currentSynonyms?: string[];
}

// Constants
const MAX_SYNONYM_BYTES = 63; // WaniKani hat 64 byte limit, using 63 für safety margin

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
 * Radical-specific Translation Service
 * 
 * Features:
 * - Primary Meaning Translation (nur primary, keine alternatives)
 * - Nullable Characters Handling (text-only radicals)
 * - Byte-Length Truncation (WaniKani 64-byte limit)
 * 
 * Simpler als KanjiTranslationService:
 * - Keine kontextuelle Übersetzung (mnemonics nicht verwendet)
 * - Keine alternative meanings
 * - Nur primary meaning wird übersetzt
 */
export class RadicalTranslationService extends DeeplTranslationService {
    constructor(apiKey: string) {
        super(apiKey);
    }

    /**
     * Override: Radical-specific translation logic
     * 
     * Translates nur Primary Meaning (Radicals haben keine alternatives).
     * Returns array: [primaryTranslation]
     */
    async translate(item: ProcessableItem): Promise<string[]> {
        const radicalItem = item as unknown as RadicalItem;
        const translations: string[] = [];

        // Radicals haben nur Primary Meaning (keine alternatives wie Kanji)
        try {
            const primaryTranslation = await translateText(
                this.apiKey,
                radicalItem.primaryMeaning,
                'DE',
                false, // formality
                3      // max_retries
                // ⚠️ Kein context - Radicals nutzen mnemonics nicht für Übersetzung
            );

            const cleanedPrimary = primaryTranslation.trim();
            if (cleanedPrimary && cleanedPrimary.length > 0) {
                translations.push(truncateSynonym(cleanedPrimary));

                // Log mit character (wenn vorhanden) oder ID
                const displayName = radicalItem.characters || `Radical #${radicalItem.id}`;
                console.log(`✅ Translation for ${displayName}: ${cleanedPrimary}`);
            }
        } catch (error) {
            const displayName = radicalItem.characters || `Radical #${radicalItem.id}`;
            console.warn(`❌ Translation failed for "${radicalItem.primaryMeaning}" (${displayName}):`, error);
            // Return empty array on error
        }

        return translations;
    }

    /**
     * Batch translation for radical items
     * 
     * Note: Processes sequentially to respect rate limits and maintain order.
     * Radicals haben nur primary meanings (simpler als Kanji).
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
