import { translateVocabularyMeanings, VocabularyItem } from './vocabulary-translation';
import * as wanikani from './wanikani';

// Types for batch processing
export interface BatchProcessingOptions {
    batchSize: number;
    synonymMode: 'smart-merge' | 'replace' | 'delete';
    apiToken: string;
    deeplToken: string;
}

export interface ProcessingProgress {
    currentBatch: number;
    totalBatches: number;
    currentItem: string;
    processedCount: number;
    totalCount: number;
    successCount: number;
    errorCount: number;
    isProcessing: boolean;
    canStop: boolean;
}

export interface BatchProcessingResult {
    success: boolean;
    processedCount: number;
    successCount: number;
    errorCount: number;
    errors: string[];
    stopped: boolean;
}

/**
 * � REFACTOR Phase: Improved batch processing with better error handling and performance
 * Processes vocabulary items in batches with translation and upload to WaniKani
 */
export async function processBatchesSequentially(
    vocabularyItems: VocabularyItem[],
    options: BatchProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void,
    stopSignal?: { current: boolean }
): Promise<BatchProcessingResult> {
    const state = createProcessingState(vocabularyItems, options);

    try {
        for (let batchIndex = 0; batchIndex < state.totalBatches; batchIndex++) {
            if (isStopRequested(stopSignal)) {
                state.stopped = true;
                break;
            }

            await processBatch(state, batchIndex, onProgress, stopSignal);

            if (state.stopped) break;
        }

        return createFinalResult(state);

    } catch (error) {
        return handleProcessingError(error, state);
    }
}

/**
 * Creates initial processing state
 */
function createProcessingState(vocabularyItems: VocabularyItem[], options: BatchProcessingOptions) {
    const batches = createBatches(vocabularyItems, options.batchSize);

    return {
        batches,
        totalBatches: batches.length,
        totalCount: vocabularyItems.length,
        processedCount: 0,
        successCount: 0,
        errorCount: 0,
        errors: [] as string[],
        stopped: false,
        options
    };
}

/**
 * Processes a single batch of vocabulary items
 */
async function processBatch(
    state: any,
    batchIndex: number,
    onProgress?: (progress: ProcessingProgress) => void,
    stopSignal?: { current: boolean }
) {
    const batch = state.batches[batchIndex];

    for (const vocabulary of batch) {
        if (isStopRequested(stopSignal)) {
            state.stopped = true;
            break;
        }

        await processVocabularyItem(state, vocabulary, batchIndex, onProgress);

        if (state.stopped) break;
    }
}

/**
 * Processes a single vocabulary item with translation and upload
 */
async function processVocabularyItem(
    state: any,
    vocabulary: VocabularyItem,
    batchIndex: number,
    onProgress?: (progress: ProcessingProgress) => void
) {
    try {
        // Step 1: Translate meanings
        const translationResult = await translateVocabularyMeanings(
            vocabulary,
            state.options.deeplToken
        );

        if (translationResult.error) {
            throw new ProcessingError(`Translation failed: ${translationResult.error}`, vocabulary.id);
        }

        // Step 2: Upload to WaniKani
        await wanikani.updateVocabularySynonyms(
            state.options.apiToken,
            vocabulary.id,
            translationResult.translatedSynonyms
        );

        state.successCount++;
        reportProgress(state, vocabulary, batchIndex, onProgress);

    } catch (error) {
        handleItemError(error, vocabulary, state);
    } finally {
        state.processedCount++;
    }
}

/**
 * Custom error class for processing errors
 */
class ProcessingError extends Error {
    constructor(message: string, public vocabularyId: number) {
        super(message);
        this.name = 'ProcessingError';
    }
}

/**
 * Reports processing progress (throttled for performance)
 */
function reportProgress(
    state: any,
    vocabulary: VocabularyItem,
    batchIndex: number,
    onProgress?: (progress: ProcessingProgress) => void
) {
    if (onProgress) {
        const progress = createProcessingProgress(
            batchIndex + 1,
            state.totalBatches,
            vocabulary.characters,
            state.processedCount + 1,
            state.totalCount,
            state.successCount,
            state.errorCount
        );
        onProgress(progress);
    }
}

/**
 * Handles individual item processing errors
 */
function handleItemError(error: unknown, vocabulary: VocabularyItem, state: any) {
    state.errorCount++;

    let errorMessage: string;
    if (error instanceof ProcessingError) {
        errorMessage = `${vocabulary.characters}: ${error.message}`;
    } else if (error instanceof Error) {
        errorMessage = `${vocabulary.characters}: ${error.message}`;
    } else {
        errorMessage = `${vocabulary.characters}: Unknown processing error`;
    }

    state.errors.push(errorMessage);
}

/**
 * Checks if stop was requested
 */
function isStopRequested(stopSignal?: { current: boolean }): boolean {
    return stopSignal?.current === true;
}

/**
 * Creates final processing result
 */
function createFinalResult(state: any): BatchProcessingResult {
    return {
        success: state.errorCount === 0 && !state.stopped,
        processedCount: state.processedCount,
        successCount: state.successCount,
        errorCount: state.errorCount,
        errors: state.errors,
        stopped: state.stopped
    };
}

/**
 * Handles top-level processing errors
 */
function handleProcessingError(error: unknown, state: any): BatchProcessingResult {
    const errorMessage = error instanceof Error ? error.message : 'Batch processing failed';

    return {
        success: false,
        processedCount: state.processedCount,
        successCount: state.successCount,
        errorCount: state.errorCount + 1,
        errors: [...state.errors, errorMessage],
        stopped: state.stopped
    };
}

/**
 * Creates processing progress object
 */
export function createProcessingProgress(
    currentBatch: number,
    totalBatches: number,
    currentItem: string,
    processedCount: number,
    totalCount: number,
    successCount: number,
    errorCount: number
): ProcessingProgress {
    return {
        currentBatch,
        totalBatches,
        currentItem,
        processedCount,
        totalCount,
        successCount,
        errorCount,
        isProcessing: true,
        canStop: true
    };
}

/**
 * Helper function to split array into batches with validation
 */
function createBatches<T>(items: T[], batchSize: number): T[][] {
    if (batchSize <= 0) {
        throw new Error('Batch size must be greater than 0');
    }

    if (items.length === 0) {
        return [];
    }

    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        batches.push(batch);
    }

    return batches;
}
