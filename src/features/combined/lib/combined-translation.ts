/**
 * Combined Translation Service
 * 
 * Polymorphe Translation für Combined Items (Radical, Kanji, Vocabulary).
 * Delegiert an die spezifischen Translation Services basierend auf item.type.
 * 
 * Features:
 * - Polymorphe Translation basierend auf Discriminated Union
 * - Type-Safe Delegation zu spezifischen Services
 * - Unified Interface für alle drei Item Types
 * - Batch Processing Support
 * - Strukturiertes Logging
 */

import { RadicalTranslationService } from '../../radicals/lib/RadicalTranslationService';
import { KanjiTranslationService } from '../../kanji/lib/KanjiTranslationService';
import { VocabularyTranslationService } from '../../vocabulary/lib/VocabularyTranslationService';
import { isRadical, isKanji, isVocabulary } from '../types/combined-types';
import type { CombinedItem } from '../types/combined-types';
import { createLogger, Logger } from '../../../shared/lib/logger';

/**
 * Combined Translation Service Options
 */
export interface CombinedTranslationOptions {
    deeplToken: string;
    usePrebuiltTranslations?: boolean; // Nur für Vocabulary relevant
    synonymMode?: 'smart' | 'replace' | 'delete'; // Nur für Vocabulary relevant
}

/**
 * Translation Result mit Type Information
 */
export interface CombinedTranslationResult {
    item: CombinedItem;
    translations: string[];
    type: 'radical' | 'kanji' | 'vocabulary';
    success: boolean;
    error?: string;
}

/**
 * Combined Translation Service
 * 
 * Zentraler Service für polymorphe Translation von Combined Items.
 * Delegiert basierend auf item.type an die spezifischen Services:
 * - RadicalTranslationService für Radicals
 * - KanjiTranslationService für Kanji
 * - VocabularyTranslationService für Vocabulary
 * 
 * Bietet:
 * - Type-Safe Dispatch via Discriminated Unions
 * - Unified API für alle Item Types
 * - Batch Processing mit Error Handling
 * - Strukturiertes Logging
 */
export class CombinedTranslationService {
    private readonly radicalService: RadicalTranslationService;
    private readonly kanjiService: KanjiTranslationService;
    private readonly vocabularyService: VocabularyTranslationService;
    private readonly logger: Logger;

    constructor(options: CombinedTranslationOptions) {
        this.radicalService = new RadicalTranslationService(options.deeplToken);
        this.kanjiService = new KanjiTranslationService(options.deeplToken);
        this.vocabularyService = new VocabularyTranslationService(options.deeplToken, {
            usePrebuiltTranslations: options.usePrebuiltTranslations ?? true,
            synonymMode: options.synonymMode ?? 'smart',
        });
        this.logger = createLogger('CombinedTranslationService');
    }

    /**
     * Translate single Combined Item (polymorphic dispatch)
     * 
     * Verwendet Type Guards für type-safe dispatch:
     * - isRadical() → RadicalTranslationService
     * - isKanji() → KanjiTranslationService
     * - isVocabulary() → VocabularyTranslationService
     * 
     * @param item - CombinedItem (Radical | Kanji | Vocabulary)
     * @returns Promise<CombinedTranslationResult>
     */
    async translateItem(item: CombinedItem): Promise<CombinedTranslationResult> {
        try {
            let translations: string[];
            let type: 'radical' | 'kanji' | 'vocabulary';

            // Polymorphic dispatch basierend auf item.type
            if (isRadical(item)) {
                type = 'radical';
                this.logger.debug(`Translating Radical`, {
                    id: item.id,
                    characters: item.characters,
                    primaryMeaning: item.primaryMeaning,
                });
                translations = await this.radicalService.translate(item);
            } else if (isKanji(item)) {
                type = 'kanji';
                this.logger.debug(`Translating Kanji`, {
                    id: item.id,
                    characters: item.characters,
                    primaryMeaning: item.primaryMeaning,
                });
                translations = await this.kanjiService.translate(item);
            } else if (isVocabulary(item)) {
                type = 'vocabulary';
                this.logger.debug(`Translating Vocabulary`, {
                    id: item.id,
                    characters: item.characters,
                    primaryMeaning: item.primaryMeaning,
                });
                translations = await this.vocabularyService.translate(item);
            } else {
                // TypeScript exhaustiveness check - sollte nie erreicht werden
                const exhaustiveCheck: never = item;
                throw new Error(`Unknown item type: ${(exhaustiveCheck as CombinedItem).type}`);
            }

            this.logger.info(`Translation completed`, {
                type,
                id: item.id,
                translationCount: translations.length,
            });

            return {
                item,
                translations,
                type,
                success: true,
            };
        } catch (error) {
            this.logger.error(`Translation failed`, error as Error, {
                itemId: item.id,
                itemType: item.type,
            });

            return {
                item,
                translations: [],
                type: item.type,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Translate batch of Combined Items (sequential processing)
     * 
     * Processes items sequentially um Rate Limits einzuhalten.
     * Fehler bei einzelnen Items führen nicht zum Abbruch der gesamten Batch.
     * 
     * @param items - Array of CombinedItems
     * @returns Promise<CombinedTranslationResult[]>
     */
    async translateBatch(items: CombinedItem[]): Promise<CombinedTranslationResult[]> {
        this.logger.info(`Starting batch translation`, {
            itemCount: items.length,
            types: {
                radicals: items.filter(isRadical).length,
                kanji: items.filter(isKanji).length,
                vocabulary: items.filter(isVocabulary).length,
            },
        });

        const results: CombinedTranslationResult[] = [];

        for (const item of items) {
            const result = await this.translateItem(item);
            results.push(result);
        }

        // Statistics
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        this.logger.info(`Batch translation completed`, {
            total: items.length,
            successful,
            failed,
        });

        return results;
    }

    /**
     * Helper: Extract successful translations from batch results
     * 
     * Filtert erfolgreiche Übersetzungen und extrahiert die translations.
     * Nützlich für UI-Updates oder weitere Verarbeitung.
     * 
     * @param results - Batch translation results
     * @returns Map<itemId, translations>
     */
    static extractSuccessfulTranslations(
        results: CombinedTranslationResult[]
    ): Map<number, string[]> {
        const translationsMap = new Map<number, string[]>();

        for (const result of results) {
            if (result.success && result.translations.length > 0) {
                translationsMap.set(result.item.id, result.translations);
            }
        }

        return translationsMap;
    }

    /**
     * Helper: Get statistics from batch results
     * 
     * Berechnet Statistiken über Translation Success/Failure pro Type.
     * 
     * @param results - Batch translation results
     * @returns Statistics object
     */
    static getStatistics(results: CombinedTranslationResult[]): {
        total: number;
        successful: number;
        failed: number;
        byType: {
            radical: { total: number; successful: number; failed: number };
            kanji: { total: number; successful: number; failed: number };
            vocabulary: { total: number; successful: number; failed: number };
        };
    } {
        const stats = {
            total: results.length,
            successful: 0,
            failed: 0,
            byType: {
                radical: { total: 0, successful: 0, failed: 0 },
                kanji: { total: 0, successful: 0, failed: 0 },
                vocabulary: { total: 0, successful: 0, failed: 0 },
            },
        };

        for (const result of results) {
            if (result.success) {
                stats.successful++;
                stats.byType[result.type].successful++;
            } else {
                stats.failed++;
                stats.byType[result.type].failed++;
            }
            stats.byType[result.type].total++;
        }

        return stats;
    }
}
