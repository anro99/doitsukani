/**
 * Combined Upload Service
 * 
 * Polymorphes Upload Handling für Combined Items (Radical, Kanji, Vocabulary).
 * Nutzt den WaniKaniUploadService für alle drei Types.
 * 
 * Features:
 * - Polymorphes Upload basierend auf item.type
 * - Rate Limiting via WaniKaniUploadService (1 req/sec)
 * - Batch Processing mit Error Handling
 * - Study Materials Create/Update
 * - Strukturiertes Logging
 */

import { WaniKaniUploadService } from '../../../shared/processing/services/WaniKaniUploadService';
import { isRadical, isKanji, isVocabulary } from '../types/combined-types';
import type { CombinedItem } from '../types/combined-types';
import { createLogger, Logger } from '../../../shared/lib/logger';

/**
 * Combined Upload Options
 */
export interface CombinedUploadOptions {
    apiToken: string;
}

/**
 * Upload Result mit Type Information
 */
export interface CombinedUploadResult {
    item: CombinedItem;
    success: boolean;
    type: 'radical' | 'kanji' | 'vocabulary';
    error?: string;
}

/**
 * Combined Upload Service
 * 
 * Zentraler Service für polymorphes Upload von Combined Items.
 * Alle drei Types (Radical, Kanji, Vocabulary) nutzen denselben
 * WaniKaniUploadService, da die API identisch ist.
 * 
 * Bietet:
 * - Polymorphes Upload basierend auf item.type
 * - Unified API für alle Item Types
 * - Batch Processing mit Error Handling
 * - Rate Limiting via WaniKaniUploadService
 * - Strukturiertes Logging
 */
export class CombinedUploadService {
    private readonly uploadService: WaniKaniUploadService;
    private readonly logger: Logger;

    constructor(options: CombinedUploadOptions) {
        this.uploadService = new WaniKaniUploadService(options.apiToken);
        this.logger = createLogger('CombinedUploadService');
    }

    /**
     * Upload single Combined Item (polymorphic dispatch)
     * 
     * Alle drei Types (Radical, Kanji, Vocabulary) nutzen dieselbe
     * WaniKani Study Materials API. Der type wird nur für Logging verwendet.
     * 
     * @param item - CombinedItem (Radical | Kanji | Vocabulary)
     * @param synonyms - Array of translated synonyms
     * @returns Promise<CombinedUploadResult>
     */
    async uploadItem(item: CombinedItem, synonyms: string[]): Promise<CombinedUploadResult> {
        try {
            let type: 'radical' | 'kanji' | 'vocabulary';

            // Polymorphic dispatch - nur für Logging, API ist identisch
            if (isRadical(item)) {
                type = 'radical';
                this.logger.debug(`Uploading Radical`, {
                    id: item.id,
                    characters: item.characters,
                    synonymCount: synonyms.length,
                });
            } else if (isKanji(item)) {
                type = 'kanji';
                this.logger.debug(`Uploading Kanji`, {
                    id: item.id,
                    characters: item.characters,
                    synonymCount: synonyms.length,
                });
            } else if (isVocabulary(item)) {
                type = 'vocabulary';
                this.logger.debug(`Uploading Vocabulary`, {
                    id: item.id,
                    characters: item.characters,
                    synonymCount: synonyms.length,
                });
            } else {
                // TypeScript exhaustiveness check
                const exhaustiveCheck: never = item;
                throw new Error(`Unknown item type: ${(exhaustiveCheck as CombinedItem).type}`);
            }

            // Upload via WaniKaniUploadService (identisch für alle Types)
            const success = await this.uploadService.upload(item.id, synonyms);

            if (success) {
                this.logger.info(`Upload completed`, {
                    type,
                    id: item.id,
                    synonymCount: synonyms.length,
                });
            } else {
                this.logger.warn(`Upload failed`, {
                    type,
                    id: item.id,
                });
            }

            return {
                item,
                success,
                type,
            };
        } catch (error) {
            this.logger.error(`Upload failed`, error as Error, {
                itemId: item.id,
                itemType: item.type,
            });

            return {
                item,
                success: false,
                type: item.type,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }

    /**
     * Upload batch of Combined Items (sequential processing)
     * 
     * Processes items sequentially um Rate Limits einzuhalten.
     * WaniKaniUploadService verwendet interne Queue mit 1 req/sec Limit.
     * 
     * @param items - Array of { item, synonyms } pairs
     * @returns Promise<CombinedUploadResult[]>
     */
    async uploadBatch(
        items: Array<{ item: CombinedItem; synonyms: string[] }>
    ): Promise<CombinedUploadResult[]> {
        this.logger.info(`Starting batch upload`, {
            itemCount: items.length,
            types: {
                radicals: items.filter(i => isRadical(i.item)).length,
                kanji: items.filter(i => isKanji(i.item)).length,
                vocabulary: items.filter(i => isVocabulary(i.item)).length,
            },
        });

        const results: CombinedUploadResult[] = [];

        for (const { item, synonyms } of items) {
            const result = await this.uploadItem(item, synonyms);
            results.push(result);
        }

        // Statistics
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        this.logger.info(`Batch upload completed`, {
            total: items.length,
            successful,
            failed,
        });

        return results;
    }

    /**
     * Helper: Get statistics from batch results
     * 
     * Berechnet Statistiken über Upload Success/Failure pro Type.
     * 
     * @param results - Batch upload results
     * @returns Statistics object
     */
    static getStatistics(results: CombinedUploadResult[]): {
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

    /**
     * Check if service is available (API token configured)
     */
    isAvailable(): boolean {
        return this.uploadService.isAvailable();
    }

    /**
     * Get rate limit status from underlying WaniKaniUploadService
     */
    getRateLimitStatus(): { requestsInLastSecond: number; canMakeRequest: boolean } {
        return this.uploadService.getRateLimitStatus();
    }
}
