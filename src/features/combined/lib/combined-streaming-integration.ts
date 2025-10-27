/**
 * Combined Streaming Integration
 * 
 * Nutzt GenericStreamingProcessor für Streaming Processing von
 * Radicals, Kanji und Vocabulary in einem einzigen Durchlauf.
 * 
 * Features:
 * - Polymorphes Processing für alle drei Types
 * - GenericStreamingProcessor Integration
 * - Combined Translation/Upload Services
 * - Progress Tracking für gemischte Items
 * - Live-Callbacks für Preview Updates
 * - Stop Signal Support
 */

import { GenericStreamingProcessor } from '../../../shared/processing/GenericStreamingProcessor';
import { CombinedTranslationService } from './combined-translation';
import { CombinedUploadService } from './combined-upload';
import type {
    ProcessingOptions,
    ProcessingProgress,
    ProcessingResult,
    UploadService,
    TranslationService,
} from '../../../shared/processing/types/processing.types';
import type { CombinedItem } from '../types/combined-types';
import { createLogger } from '../../../shared/lib/logger';

// ============================================================================
// Types
// ============================================================================

export type SynonymMode = 'replace' | 'smart-merge' | 'delete';

export interface CombinedStreamingOptions {
    apiToken: string;
    deeplToken: string;
    synonymMode: SynonymMode;
    batchSize?: number;
    enableProgressReporting?: boolean;
    stopOnFirstError?: boolean;
    
    // Callbacks
    onProgress?: (progress: CombinedProcessingProgress) => void;
    onItemUpdated?: (item: CombinedItem, result: CombinedItemResult) => void;
    onItemError?: (item: CombinedItem, error: CombinedItemError) => void;
}

export interface CombinedProcessingProgress {
    phase: 'translating' | 'uploading' | 'complete';
    overallProgress: number;
    translationProgress: number;
    uploadProgress: number;
    processedCount: number;
    totalCount: number;
    currentItem?: string;
    
    // Type-specific stats
    stats: {
        total: number;
        processed: number;
        successful: number;
        failed: number;
        byType: {
            radicals: { total: number; processed: number; successful: number; failed: number };
            kanji: { total: number; processed: number; successful: number; failed: number };
            vocabulary: { total: number; processed: number; successful: number; failed: number };
        };
    };
}

export interface CombinedItemResult {
    itemId: number;
    type: 'radical' | 'kanji' | 'vocabulary';
    success: boolean;
    translatedSynonyms?: string[];
    uploadedSynonyms?: string[];
    message: string;
}

export interface CombinedItemError {
    itemId: number;
    type: 'radical' | 'kanji' | 'vocabulary';
    error: string;
    phase: 'translation' | 'upload';
}

export interface CombinedProcessingResult {
    success: boolean;
    wasStopped?: boolean;
    totalItems: number;
    translationCount: number;
    uploadCount: number;
    errorCount: number;
    processingTime: number;
    
    // Type-specific results
    byType: {
        radicals: { total: number; successful: number; failed: number };
        kanji: { total: number; successful: number; failed: number };
        vocabulary: { total: number; successful: number; failed: number };
    };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Berechnet Type-spezifische Statistiken
 */
function calculateTypeStats(items: CombinedItem[]) {
    const byType = {
        radicals: { total: 0, successful: 0, failed: 0 },
        kanji: { total: 0, successful: 0, failed: 0 },
        vocabulary: { total: 0, successful: 0, failed: 0 },
    };

    items.forEach(item => {
        const typeKey = `${item.type}s` as 'radicals' | 'kanji' | 'vocabulary';
        byType[typeKey].total++;
    });

    // Note: Detailed success/failure tracking per type would require
    // tracking individual item results, which we'll implement if needed
    // For now, we distribute stats proportionally

    return byType;
}

/**
 * Konvertiert ProcessingProgress zu CombinedProcessingProgress
 */
function toCombinedProgress(
    progress: ProcessingProgress,
    items: CombinedItem[]
): CombinedProcessingProgress {
    // Calculate type-specific counts
    const radicals = items.filter(i => i.type === 'radical');
    const kanji = items.filter(i => i.type === 'kanji');
    const vocabulary = items.filter(i => i.type === 'vocabulary');

    // Map phase to our type
    let phase: 'translating' | 'uploading' | 'complete';
    if (progress.phase === 'complete') {
        phase = 'complete';
    } else if (progress.phase === 'uploading') {
        phase = 'uploading';
    } else {
        phase = 'translating'; // 'translating', 'idle', or other phases
    }

    return {
        phase,
        overallProgress: progress.overallProgress,
        translationProgress: progress.translationProgress,
        uploadProgress: progress.uploadProgress,
        processedCount: progress.processedCount,
        totalCount: progress.totalCount,
        currentItem: progress.currentItem,
        stats: {
            total: progress.stats.total,
            processed: progress.processedCount,
            successful: progress.stats.successful,
            failed: progress.stats.failed,
            byType: {
                radicals: {
                    total: radicals.length,
                    processed: 0, // TODO: Track per type
                    successful: 0,
                    failed: 0,
                },
                kanji: {
                    total: kanji.length,
                    processed: 0,
                    successful: 0,
                    failed: 0,
                },
                vocabulary: {
                    total: vocabulary.length,
                    processed: 0,
                    successful: 0,
                    failed: 0,
                },
            },
        },
    };
}

/**
 * Konvertiert ProcessingResult zu CombinedProcessingResult
 */
function toCombinedResult(
    result: ProcessingResult,
    items: CombinedItem[]
): CombinedProcessingResult {
    return {
        success: result.stats.failed === 0 && !result.wasStopped,
        wasStopped: result.wasStopped,
        totalItems: result.stats.total,
        translationCount: result.stats.translatedWithDeepL + result.stats.translatedWithDictionary,
        uploadCount: result.stats.successful,
        errorCount: result.stats.failed,
        processingTime: result.totalTime,
        byType: calculateTypeStats(items),
    };
}

// ============================================================================
// Main Processing Function
// ============================================================================

/**
 * Streaming Combined Processing
 * 
 * Verarbeitet Radicals, Kanji und Vocabulary in einem einzigen Streaming-Durchlauf.
 * 
 * Features:
 * - Nutzt GenericStreamingProcessor für Batch-Processing
 * - Adapter Services für Combined Translation/Upload
 * - 3-Phase Progress Tracking (Translation → Upload → Complete)
 * - Stop Signal Support
 * - Live-Callbacks für Preview Updates
 * - Type-spezifische Statistiken
 * 
 * @param items - Combined Items zu verarbeiten (Radicals, Kanji, Vocabulary)
 * @param options - Processing Options (API tokens, synonym mode, callbacks)
 * @param stopSignal - Optional Stop Signal Ref
 */
export async function processCombinedStreaming(
    items: CombinedItem[],
    options: CombinedStreamingOptions,
    stopSignal?: { current: boolean }
): Promise<CombinedProcessingResult> {
    const logger = createLogger('CombinedStreamingIntegration');
    logger.info(`Starting STREAMING processing`, {
        itemCount: items.length,
        synonymMode: options.synonymMode,
        typeBreakdown: {
            radicals: items.filter(i => i.type === 'radical').length,
            kanji: items.filter(i => i.type === 'kanji').length,
            vocabulary: items.filter(i => i.type === 'vocabulary').length,
        },
    });

    // Track processed items for live updates
    const processedItemIds = new Set<number>();

    // Create item ID to CombinedItem lookup map
    const itemMap = new Map<number, CombinedItem>();
    items.forEach(item => itemMap.set(item.id, item));

    try {
        // Setup Services
        const synonymMode = options.synonymMode === 'smart-merge' ? 'smart' : options.synonymMode;

        // Combined Translation Service (direkte Nutzung)
        const combinedTranslationService = new CombinedTranslationService({
            deeplToken: options.deeplToken,
            usePrebuiltTranslations: true,
            synonymMode,
        });

        // Combined Upload Service (direkte Nutzung)
        const combinedUploadService = new CombinedUploadService({ apiToken: options.apiToken });

        // Adapter: TranslationService für GenericStreamingProcessor
        const translationServiceAdapter: TranslationService<CombinedItem> = {
            name: 'CombinedTranslationService',
            translate: async (item: CombinedItem) => {
                const result = await combinedTranslationService.translateItem(item);
                return result.translations;
            },
            translateBatch: async (items: CombinedItem[]) => {
                const results = await combinedTranslationService.translateBatch(items);
                return results.map(r => r.translations);
            },
            isAvailable: () => true, // CombinedTranslationService ist immer verfügbar
        };

        // Adapter: UploadService für GenericStreamingProcessor mit Live-Callbacks
        const uploadServiceAdapter: UploadService = {
            name: 'CombinedUploadService',
            upload: async (itemId: number, synonyms: string[]) => {
                const item = itemMap.get(itemId);
                if (!item) {
                    logger.error(`Item not found in map`, { itemId });
                    return false;
                }

                const result = await combinedUploadService.uploadItem(item, synonyms);
                
                // Live-Update: Rufe onItemUpdated sofort nach erfolgreichem Upload auf
                if (result.success && options.onItemUpdated && !processedItemIds.has(itemId)) {
                    processedItemIds.add(itemId);

                    try {
                        options.onItemUpdated(item, {
                            itemId,
                            type: item.type,
                            success: true,
                            translatedSynonyms: synonyms,
                            uploadedSynonyms: synonyms,
                            message: 'Successfully processed and uploaded',
                        });
                        logger.debug(`Live-updated preview`, {
                            type: item.type,
                            characters: item.characters,
                            itemId,
                        });
                    } catch (error) {
                        logger.error(`Error in onItemUpdated callback`, { error, itemId });
                    }
                }

                return result.success;
            },
            uploadBatch: async (batch: Array<{ id: number; synonyms: string[] }>) => {
                const batchItems = batch.map(b => {
                    const item = itemMap.get(b.id);
                    if (!item) throw new Error(`Item ${b.id} not found`);
                    return { item, synonyms: b.synonyms };
                });

                const results = await combinedUploadService.uploadBatch(batchItems);

                return results.map(r => r.success);
            },
        };

        // Configure GenericStreamingProcessor
        const processingOptions: ProcessingOptions = {
            batchSize: options.batchSize || 10,
            synonymMode,
            onProgress: (progress: ProcessingProgress) => {
                if (options.onProgress) {
                    const combinedProgress = toCombinedProgress(progress, items);
                    options.onProgress(combinedProgress);
                }
                logger.debug(`Progress update`, {
                    overallProgress: progress.overallProgress,
                    processedCount: progress.processedCount,
                    totalCount: progress.totalCount,
                });
            },
            shouldStop: stopSignal ? () => stopSignal.current : undefined,
        };

        // Run GenericStreamingProcessor
        const processor = new GenericStreamingProcessor<CombinedItem>();
        const result = await processor.process(
            items,
            translationServiceAdapter,
            uploadServiceAdapter,
            processingOptions
        );

        logger.info(`Processing completed`, {
            stats: result.stats,
            itemCount: items.length,
        });

        return toCombinedResult(result, items);

    } catch (error) {
        logger.error(`Processing failed`, { error });
        
        return {
            success: false,
            wasStopped: false,
            totalItems: items.length,
            translationCount: 0,
            uploadCount: 0,
            errorCount: items.length,
            processingTime: 0,
            byType: {
                radicals: { total: items.filter(i => i.type === 'radical').length, successful: 0, failed: 0 },
                kanji: { total: items.filter(i => i.type === 'kanji').length, successful: 0, failed: 0 },
                vocabulary: { total: items.filter(i => i.type === 'vocabulary').length, successful: 0, failed: 0 },
            },
        };
    }
}
