/**
 * Vocabulary Streaming Integration (Refactored für Phase 3)
 * 
 * Nutzt GenericStreamingProcessor für vereinfachte, wartbare Streaming-Processing-Logik.
 * 
 * Migration von vocabulary-streaming-integration.ts:
 * - Legacy Version hatte 300+ Zeilen manueller Processing-Logik
 * - Neue Version nutzt GenericStreamingProcessor (< 100 Zeilen)
 * - Behält alle Features: Streaming, Progress Tracking, Callbacks, Error Handling
 */

import { GenericStreamingProcessor } from '../../../shared/processing/GenericStreamingProcessor';
import { WaniKaniUploadService } from '../../../shared/processing/services/WaniKaniUploadService';
import { VocabularyTranslationService } from './VocabularyTranslationService';
import type {
    ProcessingOptions,
    ProcessingProgress,
    ProcessingResult,
} from '../../../shared/processing/types/processing.types';
import type { VocabularyItem } from './vocabulary-translation';
import type { CompleteProcessingOptions } from './vocabulary-integration';

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
 * Konvertiert VocabularyItem zu ProcessableItem (GenericStreamingProcessor Format)
 */
function toProcessableItems(vocabItems: VocabularyItem[]): Array<{
    id: number;
    meanings: string[];
    existingSynonyms: string[];
}> {
    return vocabItems.map(item => ({
        id: item.id,
        meanings: item.meanings.map(m => m.meaning),
        existingSynonyms: [], // Vocabulary items don't track existing synonyms in this format
    }));
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
 * Streaming Vocabulary Processing (Refactored)
 * 
 * Features:
 * - Nutzt GenericStreamingProcessor für Batch-Processing
 * - 3-Phase Progress Tracking (Translation → Upload → Complete)
 * - Stop Signal Support
 * - Error Handling mit Retry
 * - Vocabulary-specific Translation Service
 * - Legacy Callbacks & Interface Support
 * 
 * @param vocabularyItems - Vocabulary Items zu verarbeiten
 * @param options - Processing Options (incl. API tokens, synonym mode, callbacks)
 * @param onProgress - Legacy Progress Callback
 * @param stopSignal - Stop Signal Ref
 */
export async function processVocabularyStreaming(
    vocabularyItems: VocabularyItem[],
    options: CompleteProcessingOptions,
    onProgress?: (phases: StreamingProcessingPhase) => void,
    stopSignal?: { current: boolean }
): Promise<StreamingCompleteProcessingResult> {
    console.log(`🚀 Starting STREAMING processing of ${vocabularyItems.length} vocabulary items (GenericStreamingProcessor)`);

    // Track all phases for legacy interface
    const allPhases: StreamingProcessingPhase[] = [];

    try {
        // Setup Services
        const synonymMode = options.synonymMode === 'smart-merge' ? 'smart' : options.synonymMode;

        const translationService = new VocabularyTranslationService(options.deeplToken, {
            usePrebuiltTranslations: true,
            synonymMode,
        });

        const uploadService = new WaniKaniUploadService(options.apiToken);

        // Setup Processor
        const processor = new GenericStreamingProcessor();

        // Convert Vocabulary Items to ProcessableItems
        const processableItems = toProcessableItems(vocabularyItems);

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
            synonymMode,
            batchSize: 1, // Process one-by-one for streaming (immediate upload)
            maxRetries: 3,
            ignoreBurned: false, // Vocabulary doesn't have burned status in this context
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

        // Post-Processing: Rufe onItemUpdated für alle erfolgreich verarbeiteten Items auf
        // Dies aktualisiert die Preview mit den echten Daten
        if (options.onItemUpdated) {
            for (const itemResult of result.successful) {
                try {
                    // Finde das ursprüngliche VocabularyItem
                    const originalItem = vocabularyItems.find(v => v.id === itemResult.id);
                    if (originalItem) {
                        options.onItemUpdated(originalItem, {
                            vocabularyId: originalItem.id,
                            success: true,
                            translatedSynonyms: itemResult.translations,
                            uploadedSynonyms: itemResult.finalSynonyms,
                            message: 'Successfully processed and uploaded'
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️ Callback error in post-processing onItemUpdated for item ${itemResult.id}:`, error);
                }
            }
        }

        // Convert to legacy result format
        return toLegacyResult(result, allPhases);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown streaming processing error';
        console.error('❌ STREAMING Processing failed:', errorMessage);

        return {
            success: false,
            totalItems: vocabularyItems.length,
            translationCount: 0,
            uploadCount: 0,
            errorCount: vocabularyItems.length,
            processingTime: 0,
            phases: allPhases,
        };
    }
}
