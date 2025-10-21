/**
 * Kanji Streaming Integration (Refactored für Phase 3.2)
 * 
 * Nutzt GenericStreamingProcessor für vereinfachte, wartbare Streaming-Processing-Logik.
 * 
 * Migration von useKanjiManager.ts:
 * - Legacy: Manuelle Batch-Processing (processBatchesSequentially)
 * - Neue Version: GenericStreamingProcessor (< 100 Zeilen)
 * - Behält alle Features: Streaming, Progress Tracking, Error Handling, Contextual Translation
 */

import { GenericStreamingProcessor } from '../../../shared/processing/GenericStreamingProcessor';
import { WaniKaniUploadService } from '../../../shared/processing/services/WaniKaniUploadService';
import { KanjiTranslationService } from './KanjiTranslationService';
import type {
    ProcessingOptions,
    ProcessingProgress,
    ProcessingResult,
    ProcessableItem,
} from '../../../shared/processing/types/processing.types';
import type { KanjiItem } from './KanjiTranslationService';

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
 * Konvertiert KanjiItem zu ProcessableItem (GenericStreamingProcessor Format)
 */
function toProcessableItems(kanjiItems: KanjiItem[]): ProcessableItem[] {
    return kanjiItems.map(item => ({
        id: item.id,
        meanings: [item.primaryMeaning, ...item.alternativeMeanings],
        existingSynonyms: item.currentSynonyms || [],
        // Keep Kanji-specific properties for KanjiTranslationService
        characters: item.characters,
        primaryMeaning: item.primaryMeaning,
        alternativeMeanings: item.alternativeMeanings,
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
 * Streaming Kanji Processing (Refactored)
 * 
 * Features:
 * - Nutzt GenericStreamingProcessor für Batch-Processing
 * - 3-Phase Progress Tracking (Translation → Upload → Complete)
 * - Stop Signal Support
 * - Error Handling mit Retry
 * - Kanji-specific Translation Service (contextual, primary+alternatives)
 * - Legacy Callbacks & Interface Support
 * 
 * @param kanjiItems - Kanji Items zu verarbeiten
 * @param options - Processing Options (incl. API tokens, synonym mode, callbacks)
 * @param onProgress - Legacy Progress Callback
 * @param stopSignal - Stop Signal Ref
 */
export async function processKanjiStreaming(
    kanjiItems: KanjiItem[],
    options: {
        batchSize: number;
        synonymMode: 'smart' | 'smart-merge' | 'replace' | 'delete';
        apiToken: string;
        deeplToken: string;
        enableProgressReporting: boolean;
        stopOnFirstError: boolean;
    },
    onProgress?: (phases: StreamingProcessingPhase) => void,
    stopSignal?: { current: boolean }
): Promise<StreamingCompleteProcessingResult> {
    console.log(`🚀 Starting STREAMING processing of ${kanjiItems.length} kanji items (GenericStreamingProcessor)`);

    // Track all phases for legacy interface
    const allPhases: StreamingProcessingPhase[] = [];

    try {
        // Setup Services
        const translationService = new KanjiTranslationService(options.deeplToken);
        const uploadService = new WaniKaniUploadService(options.apiToken);

        // Setup Processor
        const processor = new GenericStreamingProcessor();

        // Convert Kanji Items to ProcessableItems
        const processableItems = toProcessableItems(kanjiItems);

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
            totalItems: kanjiItems.length,
            translationCount: 0,
            uploadCount: 0,
            errorCount: kanjiItems.length,
            processingTime: 0,
            phases: allPhases,
        };
    }
}
