import { translateVocabularyMeanings, VocabularyItem } from './vocabulary-translation';
import { uploadVocabularyBatch, BatchUploadResult } from './vocabulary-wanikani-upload';

// Types for integrated processing
export interface CompleteProcessingOptions {
    batchSize: number;
    synonymMode: 'smart-merge' | 'replace' | 'delete';
    apiToken: string;
    deeplToken: string;
    enableProgressReporting: boolean;
    stopOnFirstError: boolean;
}

export interface ProcessingPhase {
    phase: 'translation' | 'upload';
    status: 'started' | 'in-progress' | 'completed' | 'error';
    progress: number;
    currentItem?: string;
    error?: string;
}

export interface TranslationResultSummary {
    vocabularyId: number;
    translatedSynonyms: string[];
    error: string | null;
}

export interface CompleteTranslationResults {
    successCount: number;
    errorCount: number;
    translations: TranslationResultSummary[];
}

export interface CompleteProcessingResult {
    success: boolean;
    totalItems: number;
    translationResults: CompleteTranslationResults;
    uploadResults: BatchUploadResult;
    processingTime: number;
    phases: ProcessingPhase[];
}

export interface ProcessingStatistics {
    totalProcessed: number;
    totalTranslated: number;
    totalUploaded: number;
    totalErrors: number;
    averageProcessingTime: number;
    successRate: number;
}

/**
 * 🔴 RED Phase: Complete vocabulary processing pipeline
 * Integrates translation, batch processing, and WaniKani upload
 */
export async function processVocabularyComplete(
    vocabularyItems: VocabularyItem[],
    options: CompleteProcessingOptions,
    onProgress?: (phase: ProcessingPhase) => void,
    stopSignal?: { current: boolean }
): Promise<CompleteProcessingResult> {
    const startTime = Date.now();
    const phases: ProcessingPhase[] = [];

    const reportPhase = (phase: ProcessingPhase) => {
        phases.push(phase);
        console.log(`📊 PROGRESS: ${phase.phase} - ${phase.status} - ${phase.progress}%`, phase.currentItem ? `(${phase.currentItem})` : '');
        if (onProgress) onProgress(phase);
    };

    try {
        // Phase 1: Translation
        reportPhase({ phase: 'translation', status: 'started', progress: 0 });

        console.log(`🚀 Starting translation of ${vocabularyItems.length} vocabulary items`);

        const translationResults = await processTranslations(
            vocabularyItems,
            options.deeplToken,
            options.stopOnFirstError,
            (progress) => {
                const currentIndex = Math.floor(progress / 100 * vocabularyItems.length);
                const currentItem = vocabularyItems[currentIndex]?.characters;
                console.log(`📊 Translation progress: ${progress}% (item ${currentIndex + 1}/${vocabularyItems.length}: ${currentItem})`);

                reportPhase({
                    phase: 'translation',
                    status: 'in-progress',
                    progress: Math.round(progress),
                    currentItem: currentItem
                });
            },
            stopSignal
        );

        reportPhase({ phase: 'translation', status: 'completed', progress: 100 });

        // Phase 2: Upload (only successful translations)
        const successfulTranslations = translationResults.translations
            .filter(t => t.error === null && t.translatedSynonyms.length > 0)
            .map(t => ({
                vocabulary: vocabularyItems.find(v => v.id === t.vocabularyId)!,
                translatedSynonyms: t.translatedSynonyms
            }));

        let uploadResults: BatchUploadResult;

        if (successfulTranslations.length > 0) {
            console.log(`📤 Starting upload of ${successfulTranslations.length} successful translations`);
            reportPhase({ phase: 'upload', status: 'started', progress: 0 });

            // Create new stop signal for upload phase - don't carry over translation stop state
            const uploadStopSignal = stopSignal ? { current: false } : undefined;
            console.log('🔄 Created fresh stop signal for upload phase');

            uploadResults = await uploadVocabularyBatch(successfulTranslations, {
                synonymMode: options.synonymMode,
                apiToken: options.apiToken
            }, uploadStopSignal, (progress) => {
                const currentIndex = Math.floor(progress / 100 * successfulTranslations.length);
                const currentItem = successfulTranslations[currentIndex]?.vocabulary.characters;
                console.log(`📊 Upload progress: ${progress}% (item ${currentIndex + 1}/${successfulTranslations.length}: ${currentItem})`);

                reportPhase({
                    phase: 'upload',
                    status: 'in-progress',
                    progress: Math.round(progress),
                    currentItem: currentItem
                });
            });

            reportPhase({ phase: 'upload', status: 'completed', progress: 100 });
        } else {
            // No successful translations to upload
            uploadResults = {
                success: true,
                totalItems: 0,
                createdCount: 0,
                updatedCount: 0,
                errorCount: 0,
                results: [],
                errors: []
            };
        }

        const processingTime = Date.now() - startTime;

        // Success criteria: no actual errors (regardless of whether processing was stopped by user)
        const hasActualErrors = translationResults.translations.some(t => t.error !== null);
        const overallSuccess = !hasActualErrors && uploadResults.success;

        const result = {
            success: overallSuccess,
            totalItems: vocabularyItems.length,
            translationResults,
            uploadResults,
            processingTime,
            phases
        };

        console.log('🎯 Processing completed:', {
            success: result.success,
            totalItems: result.totalItems,
            translated: result.translationResults.successCount,
            translationErrors: result.translationResults.errorCount,
            uploaded: result.uploadResults.createdCount + result.uploadResults.updatedCount,
            uploadErrors: result.uploadResults.errorCount,
            processingTime: result.processingTime + 'ms'
        });

        return result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
        reportPhase({
            phase: 'translation',
            status: 'error',
            progress: 0,
            error: errorMessage
        });

        return {
            success: false,
            totalItems: vocabularyItems.length,
            translationResults: {
                successCount: 0,
                errorCount: vocabularyItems.length,
                translations: vocabularyItems.map(v => ({
                    vocabularyId: v.id,
                    translatedSynonyms: [],
                    error: errorMessage
                }))
            },
            uploadResults: {
                success: false,
                totalItems: 0,
                createdCount: 0,
                updatedCount: 0,
                errorCount: 0,
                results: [],
                errors: [errorMessage]
            },
            processingTime: Date.now() - startTime,
            phases
        };
    }
}

/**
 * Process translations for all vocabulary items
 */
async function processTranslations(
    vocabularyItems: VocabularyItem[],
    deeplToken: string,
    stopOnFirstError: boolean,
    onProgress?: (progress: number) => void,
    stopSignal?: { current: boolean }
): Promise<CompleteTranslationResults> {
    const translations: TranslationResultSummary[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < vocabularyItems.length; i++) {
        // Check stop signal before processing each item
        if (stopSignal?.current === true) {
            console.log('🛑 Translation processing stopped by user request');
            break;
        }

        const vocabulary = vocabularyItems[i];

        try {
            const result = await translateVocabularyMeanings(vocabulary, deeplToken);

            if (result.error) {
                translations.push({
                    vocabularyId: vocabulary.id,
                    translatedSynonyms: [],
                    error: `Translation failed: ${result.error}`
                });
                errorCount++;

                if (stopOnFirstError) break;
            } else {
                translations.push({
                    vocabularyId: vocabulary.id,
                    translatedSynonyms: result.translatedSynonyms,
                    error: null
                });
                successCount++;
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown translation error';
            translations.push({
                vocabularyId: vocabulary.id,
                translatedSynonyms: [],
                error: `Translation failed: ${errorMessage}`
            });
            errorCount++;

            if (stopOnFirstError) break;
        }

        // Report progress after each vocabulary item (success or error)
        if (onProgress) {
            const progress = ((i + 1) / vocabularyItems.length) * 100;
            onProgress(progress);
        }
    }

    return {
        successCount,
        errorCount,
        translations
    };
}

/**
 * High-level processor interface with statistics tracking
 */
export function integratedVocabularyProcessor(options: CompleteProcessingOptions) {
    let statistics: ProcessingStatistics = {
        totalProcessed: 0,
        totalTranslated: 0,
        totalUploaded: 0,
        totalErrors: 0,
        averageProcessingTime: 0,
        successRate: 0
    };

    const processingTimes: number[] = [];

    return {
        async process(vocabularyItems: VocabularyItem[]): Promise<CompleteProcessingResult> {
            const result = await processVocabularyComplete(vocabularyItems, options);

            // Update statistics
            statistics.totalProcessed += vocabularyItems.length;
            statistics.totalTranslated += result.translationResults.successCount;
            statistics.totalUploaded += result.uploadResults.createdCount + result.uploadResults.updatedCount;
            statistics.totalErrors += result.translationResults.errorCount + result.uploadResults.errorCount;

            processingTimes.push(result.processingTime);
            statistics.averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
            statistics.successRate = statistics.totalProcessed > 0
                ? ((statistics.totalTranslated + statistics.totalUploaded) / (statistics.totalProcessed * 2)) * 100
                : 0;

            return result;
        },

        getStatistics(): ProcessingStatistics {
            return { ...statistics };
        },

        reset(): void {
            statistics = {
                totalProcessed: 0,
                totalTranslated: 0,
                totalUploaded: 0,
                totalErrors: 0,
                averageProcessingTime: 0,
                successRate: 0
            };
            processingTimes.length = 0;
        }
    };
}
