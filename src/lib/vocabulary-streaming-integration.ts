import { translateVocabularyMeanings, VocabularyItem } from './vocabulary-translation';
import { uploadVocabularyBatch } from './vocabulary-wanikani-upload';
import { CompleteProcessingOptions, ProcessingPhase } from './vocabulary-integration';

// Extended ProcessingPhase interface for unified progress
export interface UnifiedProcessingPhase extends ProcessingPhase {
    completedItems?: number;  // Successfully processed items (uploaded)
    errorItems?: number;      // Items that failed during processing
}

// Streaming-specific interfaces
export interface StreamingProcessingPhase {
    translationPhase: ProcessingPhase;
    uploadPhase: ProcessingPhase;
    overallPhase: UnifiedProcessingPhase;  // Now includes unified progress properties
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

/**
 * 🚀 NEW: Streaming vocabulary processing with immediate upload
 * "Sobald ein Vocabulary übersetzt worden ist, soll es zu Wanikani hochgeladen werden"
 * 
 * This processes vocabulary items one by one, uploading each translation immediately
 * instead of waiting for all translations to complete first.
 */
export async function processVocabularyStreaming(
    vocabularyItems: VocabularyItem[],
    options: CompleteProcessingOptions,
    onProgress?: (phases: StreamingProcessingPhase) => void,
    stopSignal?: { current: boolean }
): Promise<StreamingCompleteProcessingResult> {
    const startTime = Date.now();
    const phases: StreamingProcessingPhase[] = [];

    let translatedCount = 0;
    let uploadedCount = 0;
    let errorCount = 0;

    const reportPhases = (translationProgress: number, uploadProgress: number, currentItem?: string) => {
        const translationPhase: ProcessingPhase = {
            phase: 'translation',
            status: translatedCount >= vocabularyItems.length ? 'completed' : 'in-progress',
            progress: translationProgress,
            currentItem
        };

        const uploadPhase: ProcessingPhase = {
            phase: 'upload',
            status: uploadedCount >= translatedCount ? 'completed' : 'in-progress',
            progress: uploadProgress,
            currentItem
        };

        // Unified progress: completed items are those that finished processing (success or failure)
        const totalProcessedItems = uploadedCount + errorCount;
        const unifiedProgress = vocabularyItems.length === 0 ? 100 : Math.round((totalProcessedItems / vocabularyItems.length) * 100);

        const overallPhase: UnifiedProcessingPhase = {
            phase: 'both',
            status: translationPhase.status === 'completed' && uploadPhase.status === 'completed'
                ? 'completed' : 'in-progress',
            progress: unifiedProgress,  // Use unified progress instead of max
            currentItem,
            completedItems: uploadedCount,
            errorItems: errorCount
        };

        const streamingPhase: StreamingProcessingPhase = {
            translationPhase,
            uploadPhase,
            overallPhase
        };

        phases.push(streamingPhase);
        console.log(`📊 STREAMING: Translation ${translationProgress}%, Upload ${uploadProgress}%, Unified ${unifiedProgress}% - ${currentItem}`);
        if (onProgress) onProgress(streamingPhase);
    };

    try {
        console.log(`🚀 Starting STREAMING processing of ${vocabularyItems.length} vocabulary items`);

        // Process each vocabulary item individually with immediate upload
        for (let i = 0; i < vocabularyItems.length; i++) {
            if (stopSignal?.current === true) {
                console.log('🛑 Streaming processing stopped by user request');
                break;
            }

            const vocabulary = vocabularyItems[i];
            const currentItem = vocabulary.characters;

            try {
                let translatedSynonyms: string[] = [];

                // Check if translation is needed based on synonym mode
                if (options.synonymMode === 'delete') {
                    // DELETE mode: Skip translation, use empty array for removal
                    console.log(`🗑️ DELETE mode: Skipping translation for ${currentItem}, removing all synonyms`);
                    translatedSynonyms = []; // Empty array means remove all
                    translatedCount++; // Count as "translated" for progress purposes
                } else {
                    // Step 1: Translate (for replace and smart-merge modes)
                    console.log(`🔄 Translating ${currentItem}...`);
                    const translationResult = await translateVocabularyMeanings(vocabulary, options.deeplToken);

                    if (translationResult.error) {
                        console.log(`❌ Translation failed for ${currentItem}: ${translationResult.error}`);
                        errorCount++;
                        // Skip upload if translation failed
                        const translationProgress = Math.round(((i + 1) / vocabularyItems.length) * 100);
                        const uploadProgress = translatedCount === 0 ? 0 : Math.round((uploadedCount / translatedCount) * 100);
                        reportPhases(translationProgress, uploadProgress, currentItem);
                        continue;
                    } else {
                        translatedCount++;
                        translatedSynonyms = translationResult.translatedSynonyms;
                        console.log(`✅ Translated ${currentItem}: ${translatedSynonyms.join(', ')}`);
                    }
                }

                // Step 2: Upload after translation (or skip in DELETE mode)
                try {
                    console.log(`📤 Uploading ${currentItem}...`);
                    const uploadResult = await uploadVocabularyBatch([{
                        vocabulary,
                        translatedSynonyms
                    }], {
                        synonymMode: options.synonymMode,
                        apiToken: options.apiToken
                    });

                    if (uploadResult.success && uploadResult.results.length > 0) {
                        uploadedCount++;
                        console.log(`✅ Uploaded ${currentItem} successfully`);
                    } else {
                        errorCount++;
                        console.log(`❌ Upload failed for ${currentItem}: ${uploadResult.errors.join(', ')}`);
                    }
                } catch (uploadError) {
                    errorCount++;
                    console.log(`❌ Upload error for ${currentItem}: ${uploadError}`);
                }

                // Report progress after each item
                const translationProgress = Math.round(((i + 1) / vocabularyItems.length) * 100);
                const uploadProgress = translatedCount === 0 ? 0 : Math.round((uploadedCount / translatedCount) * 100);
                reportPhases(translationProgress, uploadProgress, currentItem);

                // Small delay to prevent overwhelming the APIs
                await new Promise(resolve => setTimeout(resolve, 200));

            } catch (error) {
                errorCount++;
                console.log(`❌ Processing error for ${currentItem}: ${error}`);

                const translationProgress = Math.round(((i + 1) / vocabularyItems.length) * 100);
                const uploadProgress = translatedCount === 0 ? 0 : Math.round((uploadedCount / translatedCount) * 100);
                reportPhases(translationProgress, uploadProgress, currentItem);
            }
        }

        const processingTime = Date.now() - startTime;

        const result: StreamingCompleteProcessingResult = {
            success: errorCount === 0,
            totalItems: vocabularyItems.length,
            translationCount: translatedCount,
            uploadCount: uploadedCount,
            errorCount,
            processingTime,
            phases
        };

        console.log('🎯 STREAMING Processing completed:', result);
        return result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown streaming processing error';
        console.log('❌ STREAMING Processing failed:', errorMessage);

        return {
            success: false,
            totalItems: vocabularyItems.length,
            translationCount: translatedCount,
            uploadCount: uploadedCount,
            errorCount: vocabularyItems.length - translatedCount,
            processingTime: Date.now() - startTime,
            phases
        };
    }
}
