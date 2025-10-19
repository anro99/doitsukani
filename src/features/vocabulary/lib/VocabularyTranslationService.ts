/**
 * Vocabulary Translation Service
 * 
 * Erweitert den DeeplTranslationService mit Vocabulary-spezifischen Features:
 * - Contextual Dictionary Fallback
 * - Prebuilt Translations Merger
 * - Hybrid Translation Strategy
 */

import { DeeplTranslationService } from '../../../shared/processing/services/DeeplTranslationService';
import type { ProcessableItem } from '../../../shared/processing/types/processing.types';
import { translateVocabularyMeanings, VocabularyItem } from './vocabulary-translation';
import { mergeTranslations, getPrebuiltTranslations } from './vocabulary-translation-merger';
import translationsJson from '../../../translations.json';

/**
 * Vocabulary-specific Translation Service
 * 
 * Features:
 * - DeepL Translation für alle Meanings
 * - Hybrid Translation: Merge mit prebuilt translations
 * - DELETE Mode Support (skip translation)
 */
export class VocabularyTranslationService extends DeeplTranslationService {
    private usePrebuiltTranslations: boolean;
    private synonymMode: 'smart' | 'replace' | 'delete';

    constructor(
        apiKey: string,
        options: {
            usePrebuiltTranslations?: boolean;
            synonymMode?: 'smart' | 'replace' | 'delete';
        } = {}
    ) {
        super(apiKey);
        this.usePrebuiltTranslations = options.usePrebuiltTranslations ?? true;
        this.synonymMode = options.synonymMode ?? 'smart';
    }

    /**
     * Override: Vocabulary-specific translation logic
     */
    async translate(item: ProcessableItem): Promise<string[]> {
        // DELETE Mode: Skip translation completely
        if (this.synonymMode === 'delete') {
            console.log(`🗑️ DELETE mode: Skipping translation for ${item.id}`);
            return [];
        }

        // Cast to VocabularyItem for vocabulary-specific operations
        const vocabItem = item as unknown as VocabularyItem;

        // Step 1: DeepL Translation using existing vocabulary-translation logic
        const translationResult = await translateVocabularyMeanings(vocabItem, this.apiKey);

        if (translationResult.error) {
            console.log(`❌ Translation failed for ${vocabItem.characters}: ${translationResult.error}`);
            throw new Error(`Translation failed: ${translationResult.error}`);
        }

        const deeplTranslations = translationResult.translatedSynonyms;
        console.log(`✅ DeepL translated ${vocabItem.characters}: ${deeplTranslations.join(', ')}`);

        // Step 2: Merge with prebuilt translations (if enabled)
        if (this.usePrebuiltTranslations) {
            const prebuiltTranslations = getPrebuiltTranslations(
                vocabItem.id,
                translationsJson as Record<string, string[]>
            );

            if (prebuiltTranslations.length > 0) {
                console.log(`📚 Found ${prebuiltTranslations.length} prebuilt translations for ${vocabItem.characters}`);

                // Merge: DeepL has priority, prebuilt as supplements
                const mergedTranslations = mergeTranslations(
                    deeplTranslations,
                    prebuiltTranslations,
                    8 // WaniKani synonym limit
                );

                console.log(`🔀 Merged translations for ${vocabItem.characters}: ${mergedTranslations.join(', ')}`);
                return mergedTranslations;
            }
        }

        // No prebuilt translations or feature disabled - use DeepL only
        return deeplTranslations;
    }

    /**
     * Batch translation for vocabulary items
     */
    async translateBatch(items: ProcessableItem[]): Promise<string[][]> {
        // Process sequentially to respect rate limits and maintain order
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
