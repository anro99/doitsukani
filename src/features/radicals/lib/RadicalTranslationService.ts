/**
 * Radical Translation Service
 * 
 * Erweitert BaseTranslationService mit Radical-spezifischen Features:
 * - Primary Meaning Translation (simpler als Kanji - keine alternative meanings)
 * - Nullable Characters Handling (Radicals können text-only sein)
 * - Byte-Length Truncation automatisch via BaseTranslationService
 * 
 * Note: Radicals haben keine kontextuelle Übersetzung (mnemonics werden nicht verwendet)
 */

import { BaseTranslationService, truncateSynonym } from '../../../shared/processing/services/BaseTranslationService';
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

/**
 * Radical-specific Translation Service
 * 
 * Features:
 * - Primary Meaning Translation (nur primary, keine alternatives)
 * - Nullable Characters Handling (text-only radicals)
 * - Byte-Length Truncation automatisch via BaseTranslationService
 * 
 * Simpler als KanjiTranslationService:
 * - Keine kontextuelle Übersetzung (mnemonics nicht verwendet)
 * - Keine alternative meanings
 * - Nur primary meaning wird übersetzt
 */
export class RadicalTranslationService extends BaseTranslationService {
    constructor(apiKey: string) {
        super(apiKey, 'RadicalTranslationService');
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
                this.logger.info(`Translation completed`, {
                    displayName,
                    translation: cleanedPrimary,
                });
            }
        } catch (error) {
            const displayName = radicalItem.characters || `Radical #${radicalItem.id}`;
            this.logger.warn(`Translation failed`, {
                displayName,
                primaryMeaning: radicalItem.primaryMeaning,
                error,
            });
            // Return empty array on error
        }

        return translations;
    }
}
