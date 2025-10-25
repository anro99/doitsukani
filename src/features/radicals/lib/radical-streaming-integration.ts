/**
 * Radical Streaming Integration (Phase 3.3)
 * 
 * Nutzt GenericStreamingProcessor für vereinfachte, wartbare Streaming-Processing-Logik.
 * 
 * Migration von useRadicalsManager.ts:
 * - Legacy: Manuelle Batch-Processing (processBatchesSequentially)
 * - Neue Version: GenericStreamingProcessor (< 100 Zeilen)
 * - Behält alle Features: Streaming, Progress Tracking, Error Handling
 * 
 * Simpler als Kanji:
 * - Keine kontextuelle Übersetzung (mnemonics nicht verwendet)
 * - Keine alternative meanings (nur primary)
 * - Nullable characters (text-only radicals)
 */

import { GenericStreamingProcessor } from '../../../shared/processing/GenericStreamingProcessor';
import { WaniKaniUploadService } from '../../../shared/processing/services/WaniKaniUploadService';
import { RadicalTranslationService } from './RadicalTranslationService';
import type {
    ProcessingOptions,
    ProcessingProgress,
    ProcessingResult,
    ProcessableItem,
} from '../../../shared/processing/types/processing.types';
import type { RadicalItem } from './RadicalTranslationService';

// ============================================================================
// Legacy Interfaces (für Backward Compatibility)
// ============================================================================

export interface StreamingProcessingPhase {
    translationPhase: {
        phase: string;
        status: string;
        progress: number;
        currentItem?: string;
    };
    uploadPhase: {
        phase: string;
        status: string;
        progress: number;
        currentItem?: string;
    };
    overallPhase: {
        phase: string;
        status: string;
        progress: number;
        currentItem?: string;
        completedItems?: number;
        errorItems?: number;
    };
}

export interface StreamingCompleteProcessingResult {
    success: boolean;
    totalItems: number;
    translationCount: number;
    uploadCount: number;
    errorCount: number;
    processingTime: number;
    phases: StreamingProcessingPhase[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Konvertiert RadicalItem zu ProcessableItem (GenericStreamingProcessor Format)
 */
function toProcessableItems(radicalItems: RadicalItem[]): ProcessableItem[] {
    return radicalItems.map(item => ({
        id: item.id,
        meanings: [item.primaryMeaning], // Radicals haben nur primary meaning
        existingSynonyms: item.currentSynonyms || [],
        // Keep Radical-specific properties für RadicalTranslationService
        characters: item.characters, // ⚠️ Kann null sein
        primaryMeaning: item.primaryMeaning,
        meaningMnemonic: item.meaningMnemonic,
        currentSynonyms: item.currentSynonyms,
    } as ProcessableItem));
}

/**
 * Konvertiert ProcessingProgress (GenericStreamingProcessor) zu StreamingProcessingPhase (Legacy)
 */
function toLegacyPhase(progress: ProcessingProgress): StreamingProcessingPhase {
    return {
        translationPhase: {
            phase: 'translation',
            status: progress.phase === 'translating' ? 'in-progress' : 'completed',
            progress: Math.round(progress.translationProgress),
            currentItem: progress.currentItem,
        },
        uploadPhase: {
            phase: 'upload',
            status: progress.phase === 'uploading' ? 'in-progress' :
                progress.phase === 'complete' ? 'completed' : 'in-progress',
            progress: Math.round(progress.uploadProgress),
            currentItem: progress.currentItem,
        },
        overallPhase: {
            phase: 'both',
            status: progress.phase === 'complete' ? 'completed' : 'in-progress',
            progress: Math.round(progress.overallProgress),
            currentItem: progress.currentItem,
            completedItems: progress.processedCount,
            errorItems: progress.stats.failed,
        },
    };
}

/**
 * Konvertiert ProcessingResult zu StreamingCompleteProcessingResult (Legacy)
 */
function toLegacyResult(
    result: ProcessingResult,
    allPhases: StreamingProcessingPhase[]
): StreamingCompleteProcessingResult {
    return {
        success: result.stats.failed === 0 && !result.wasStopped,
        totalItems: result.stats.total,
        translationCount: result.stats.translatedWithDeepL + result.stats.translatedWithDictionary,
        uploadCount: result.stats.successful,
        errorCount: result.stats.failed,
        processingTime: result.totalTime,
        phases: allPhases,
    };
}

// ============================================================================
// Main Processing Function
// ============================================================================

/**
 * Streaming Radical Processing (Refactored)
 * 
 * Features:
 * - Nutzt GenericStreamingProcessor für Batch-Processing
 * - 3-Phase Progress Tracking (Translation → Upload → Complete)
 * - Stop Signal Support
 * - Error Handling mit Retry
 * - Radical-specific Translation Service (primary meaning only, no context)
 * - Legacy Callbacks & Interface Support
 * 
 * @param radicalItems - Radical Items zu verarbeiten
 * @param options - Processing Options (incl. API tokens, synonym mode, callbacks)
 * @param onProgress - Legacy Progress Callback
 * @param stopSignal - Stop Signal Ref
 */
export interface RadicalItemResult {
    radicalId: number;
    success: boolean;
    translatedSynonyms?: string[];
    uploadedSynonyms?: string[];
    message?: string;
}

export async function processRadicalStreaming(
    radicalItems: RadicalItem[],
    options: {
        batchSize: number;
        synonymMode: 'smart' | 'smart-merge' | 'replace' | 'delete';
        apiToken: string;
        deeplToken: string;
        enableProgressReporting: boolean;
        stopOnFirstError: boolean;
        onItemUpdated?: (item: RadicalItem, result: RadicalItemResult) => void;
        onItemProcessing?: (item: RadicalItem) => void;
        onItemError?: (item: RadicalItem, error: Error) => void;
    },
    onProgress?: (phases: StreamingProcessingPhase) => void,
    stopSignal?: { current: boolean }
): Promise<StreamingCompleteProcessingResult> {
    console.log(`🚀 Starting STREAMING processing of ${radicalItems.length} radical items (GenericStreamingProcessor)`);

    // Track all phases for legacy interface
    const allPhases: StreamingProcessingPhase[] = [];

    // Track successful items for live preview updates
    const processedItemIds = new Set<number>();

    try {
        // Setup Services
        const translationService = new RadicalTranslationService(options.deeplToken);
        const baseUploadService = new WaniKaniUploadService(options.apiToken);

        // Wrapper um Upload Service für Live-Callbacks
        const uploadService = {
            name: baseUploadService.name,
            upload: async (itemId: number, synonyms: string[]) => {
                const success = await baseUploadService.upload(itemId, synonyms);

                // Live-Update: Rufe onItemUpdated sofort nach erfolgreichem Upload auf
                if (success && options.onItemUpdated && !processedItemIds.has(itemId)) {
                    processedItemIds.add(itemId);

                    const originalItem = radicalItems.find(r => r.id === itemId);
                    if (originalItem) {
                        try {
                            options.onItemUpdated(originalItem, {
                                radicalId: itemId,
                                success: true,
                                translatedSynonyms: synonyms,
                                uploadedSynonyms: synonyms,
                                message: 'Successfully processed and uploaded'
                            });

                            // Display name mit nullable characters handling
                            const displayName = originalItem.characters || `Radical #${itemId}`;
                            console.log(`✅ Live-updated preview for ${displayName}`);
                        } catch (error) {
                            console.warn(`⚠️ Callback error in live onItemUpdated for item ${itemId}:`, error);
                        }
                    }
                }

                return success;
            },
            uploadBatch: async (items: Array<{ id: number; synonyms: string[] }>) => {
                // Delegate to original service
                return baseUploadService.uploadBatch(items);
            }
        };

        // Setup Processor
        const processor = new GenericStreamingProcessor();

        // Convert Radical Items to ProcessableItems
        const processableItems = toProcessableItems(radicalItems);

        // Progress Callback Wrapper
        const progressCallback = (progress: ProcessingProgress) => {
            const legacyPhase = toLegacyPhase(progress);
            allPhases.push(legacyPhase);

            console.log(`📊 Progress: ${progress.overallProgress}% (${progress.processedCount}/${progress.totalCount})`);

            // Call legacy onProgress callback
            if (onProgress) {
                try {
                    onProgress(legacyPhase);
                } catch (error) {
                    console.warn('⚠️ Callback error in onProgress:', error);
                }
            }
        };

        // Should Stop Callback
        const shouldStopCallback = () => {
            return stopSignal?.current === true;
        };

        // Processing Options
        const processingOptions: ProcessingOptions = {
            synonymMode: options.synonymMode,
            batchSize: options.batchSize || 1, // Default to streaming (batchSize=1)
            maxRetries: 3,
            ignoreBurned: false,
            onlyWithoutSynonyms: false,
            onProgress: progressCallback,
            shouldStop: shouldStopCallback,
        };

        // Execute Processing
        const result = await processor.process(
            processableItems,
            translationService,
            uploadService,
            processingOptions
        );

        console.log('🎯 Processing completed:', result.stats);

        // Convert to legacy result format
        return toLegacyResult(result, allPhases);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown streaming processing error';
        console.error('❌ STREAMING Processing failed:', errorMessage);

        return {
            success: false,
            totalItems: radicalItems.length,
            translationCount: 0,
            uploadCount: 0,
            errorCount: radicalItems.length,
            processingTime: 0,
            phases: allPhases,
        };
    }
}
