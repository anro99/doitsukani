/**
 * Kanji Translation Service
 * 
 * Erweitert BaseTranslationService mit Kanji-spezifischen Features:
 * - Contextual Translation (aus Mnemonics extrahiert)
 * - Primary + Alternative Meanings Support
 * - Smart Synonym Management für Kanji
 * - Byte-Length Truncation automatisch via BaseTranslationService
 */

import { BaseTranslationService, truncateSynonym } from '../../../shared/processing/services/BaseTranslationService';
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

/**
 * Kanji-specific Translation Service
 * 
 * Features:
 * - Contextual Translation (extrahiert aus Mnemonics)
 * - Primary Meaning Translation (immer zuerst)
 * - Alternative Meanings Translation (als Ergänzung)
 * - Byte-Length Truncation automatisch via BaseTranslationService
 * - Duplicate Removal (case-insensitive)
 */
export class KanjiTranslationService extends BaseTranslationService {
    constructor(apiKey: string) {
        super(apiKey, 'KanjiTranslationService');
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
                this.logger.info(`Primary translation`, {
                    characters: kanjiItem.characters,
                    translation: cleanedPrimary,
                });
            }
        } catch (error) {
            this.logger.warn(`Primary translation failed`, {
                characters: kanjiItem.characters,
                primaryMeaning: kanjiItem.primaryMeaning,
                error,
            });
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
                    const truncatedAlt = truncateSynonym(cleanedAlt);
                    // Skip duplicates (case-insensitive)
                    if (!translations.some(t => t.toLowerCase() === truncatedAlt.toLowerCase())) {
                        translations.push(truncatedAlt);
                        this.logger.debug(`Alternative translation`, {
                            characters: kanjiItem.characters,
                            translation: cleanedAlt,
                        });
                    } else {
                        this.logger.debug(`Skipped duplicate translation`, {
                            characters: kanjiItem.characters,
                            duplicate: cleanedAlt,
                        });
                    }
                }
            } catch (error) {
                this.logger.warn(`Alternative translation failed`, {
                    characters: kanjiItem.characters,
                    alternativeMeaning,
                    error,
                });
                // Continue with next alternative
            }
        }

        this.logger.info(`Total translations`, {
            characters: kanjiItem.characters,
            count: translations.length,
        });
        return translations;
    }

    // translateBatch() inherited from BaseTranslationService
}
