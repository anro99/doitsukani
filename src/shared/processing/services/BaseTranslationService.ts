/**
 * Base Translation Service
 * 
 * Abstrakte Basisklasse für alle Feature-spezifischen Translation Services.
 * Bietet gemeinsame Funktionalität wie Byte-Length Truncation, Batch Processing,
 * Error Handling und Logging.
 * 
 * Erweitert von:
 * - VocabularyTranslationService
 * - KanjiTranslationService
 * - RadicalTranslationService
 */

import { DeeplTranslationService } from './DeeplTranslationService';
import type { ProcessableItem } from '../types/processing.types';
import { createLogger, Logger } from '../../lib/logger';

// Constants
export const MAX_SYNONYM_BYTES = 63; // WaniKani hat 64 byte limit, using 63 für safety margin

/**
 * Get UTF-8 byte length of a string (browser-compatible)
 */
export function getByteLength(str: string): number {
    return new TextEncoder().encode(str).length;
}

/**
 * Truncate synonym to fit WaniKani's 64-byte limit per synonym.
 * Uses 63-byte safety margin for minimal overhead.
 * Adds "~" indicator when truncated.
 */
export function truncateSynonym(str: string): string {
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
}

/**
 * Remove duplicate translations (case-insensitive)
 */
export function removeDuplicates(translations: string[]): string[] {
    const seen = new Set<string>();
    return translations.filter(t => {
        const lower = t.toLowerCase();
        if (seen.has(lower)) {
            return false;
        }
        seen.add(lower);
        return true;
    });
}

/**
 * Abstrakte Basisklasse für Feature-spezifische Translation Services
 * 
 * Bietet:
 * - Byte-Length Truncation (WaniKani 64-byte limit)
 * - Batch Processing mit Error Handling
 * - Structured Logging
 * - Duplicate Removal
 */
export abstract class BaseTranslationService extends DeeplTranslationService {
    protected readonly logger: Logger;

    constructor(apiKey: string, loggerContext: string) {
        super(apiKey);
        this.logger = createLogger(loggerContext);
    }

    /**
     * Abstract method: Feature-specific translation logic
     * 
     * Muss von Subklassen implementiert werden.
     * Sollte die spezifische Logik für Vocabulary/Kanji/Radical enthalten.
     */
    abstract translate(item: ProcessableItem): Promise<string[]>;

    /**
     * Batch translation mit standardisiertem Error Handling
     * 
     * Processes sequentially to respect rate limits and maintain order.
     * Returns empty array on error for individual items.
     */
    async translateBatch(items: ProcessableItem[]): Promise<string[][]> {
        const results: string[][] = [];

        for (const item of items) {
            try {
                const translations = await this.translate(item);
                results.push(translations);
            } catch (error) {
                this.logger.warn(`Translation failed for item`, { itemId: item.id, error });
                results.push([]); // Empty array on error
            }
        }

        return results;
    }

    /**
     * Helper: Truncate all translations in array
     */
    protected truncateAll(translations: string[]): string[] {
        return translations.map(truncateSynonym);
    }

    /**
     * Helper: Remove duplicates from translations (case-insensitive)
     */
    protected deduplicateTranslations(translations: string[]): string[] {
        return removeDuplicates(translations);
    }
}
