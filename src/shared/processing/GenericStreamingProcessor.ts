/**
 * Generic Streaming Processor
 * 
 * Verarbeitet Items in Batches mit paralleler Translation und Upload.
 * Unterstützt 3-Phasen Progress Tracking, Error Handling, und Stop/Pause/Resume.
 * 
 * Verwendet von: Vocabulary, Kanji, Radicals Features
 */

import type {
    ProcessableItem,
    TranslationService,
    UploadService,
    ProcessingOptions,
    ProcessingProgress,
    ProcessingResult,
    ItemProcessingResult
} from './types/processing.types';

export class GenericStreamingProcessor<T extends ProcessableItem> {
    private isStopped = false;
    private isPaused = false;
    private pausePromise: Promise<void> | null = null;
    private pauseResolve: (() => void) | null = null;

    /**
     * Verarbeitet Items in Batches
     */
    async process(
        items: T[],
        translationService: TranslationService<T>,
        uploadService: UploadService,
        options: ProcessingOptions
    ): Promise<ProcessingResult> {
        const startTime = Date.now();
        const result: ProcessingResult = {
            successful: [],
            failed: [],
            skipped: [],
            wasStopped: false,
            stats: {
                total: items.length,
                successful: 0,
                failed: 0,
                skipped: 0,
                translatedWithDeepL: 0,
                translatedWithDictionary: 0,
                notTranslated: 0,
                averageProcessingTime: 0,
            },
            totalTime: 0,
        };

        // Filter Items basierend auf Optionen
        const filteredItems = this.filterItems(items, options);
        const skippedItems = items.filter(item => !filteredItems.includes(item));

        // Convert skipped items to ItemProcessingResult
        result.skipped = skippedItems.map(item => ({
            id: item.id,
            success: false,
            translations: [],
            finalSynonyms: item.existingSynonyms || [],
            translationSource: 'none' as const,
        }));
        result.stats.skipped = result.skipped.length;

        if (filteredItems.length === 0) {
            result.totalTime = Date.now() - startTime;
            return result;
        }

        // Reset state
        this.isStopped = false;
        this.isPaused = false;

        // Verarbeite in Batches
        const batchSize = options.batchSize || 10;
        const batches = this.createBatches(filteredItems, batchSize);

        let processedCount = 0;
        const totalToProcess = filteredItems.length;

        for (const batch of batches) {
            // Check stop condition
            if (this.isStopped || (options.shouldStop && options.shouldStop())) {
                result.wasStopped = true;
                break;
            }

            // Handle pause
            if (this.isPaused) {
                await this.waitForResume();
            }

            // Process batch
            const batchResults = await this.processBatch(
                batch,
                translationService,
                uploadService,
                options
            );

            // Collect results
            batchResults.forEach(batchResult => {
                if (batchResult.success) {
                    result.successful.push(batchResult);
                    result.stats.successful++;

                    // Track translation source
                    if (batchResult.translationSource === 'deepl') {
                        result.stats.translatedWithDeepL++;
                    } else if (batchResult.translationSource === 'dictionary') {
                        result.stats.translatedWithDictionary++;
                    } else if (batchResult.translationSource === 'none') {
                        result.stats.notTranslated++;
                    }
                } else {
                    result.failed.push(batchResult);
                    result.stats.failed++;
                }
            });

            processedCount += batch.length;

            // Report progress
            if (options.onProgress) {
                const progress = this.calculateProgress(
                    processedCount,
                    totalToProcess,
                    startTime
                );
                options.onProgress(progress);
            }
        }

        // Calculate final statistics
        result.totalTime = Date.now() - startTime;
        result.stats.averageProcessingTime =
            result.successful.length > 0
                ? result.successful.reduce((sum, item) => sum + (item.processingTime || 0), 0) / result.successful.length
                : 0;

        return result;
    }

    /**
     * Verarbeitet einen einzelnen Batch
     */
    private async processBatch(
        batch: T[],
        translationService: TranslationService<T>,
        uploadService: UploadService,
        options: ProcessingOptions
    ): Promise<ItemProcessingResult[]> {
        const results: ItemProcessingResult[] = [];

        for (const item of batch) {
            const itemStartTime = Date.now();
            let retries = 0;
            const maxRetries = options.maxRetries ?? 3;

            while (retries <= maxRetries) {
                try {
                    // Translation
                    const translations = await this.translateItem(
                        item,
                        translationService,
                        options
                    );

                    // Upload
                    const uploadSuccess = await uploadService.upload(item.id, translations);

                    if (uploadSuccess) {
                        results.push({
                            id: item.id,
                            success: true,
                            translations,
                            finalSynonyms: translations,
                            translationSource: translationService.name === 'DeepL' ? 'deepl' : 'dictionary',
                            processingTime: Date.now() - itemStartTime,
                        });
                        break;
                    } else {
                        throw new Error('Upload failed');
                    }
                } catch (error) {
                    retries++;

                    if (retries > maxRetries) {
                        results.push({
                            id: item.id,
                            success: false,
                            translations: [],
                            finalSynonyms: item.existingSynonyms || [],
                            error: error instanceof Error ? error.message : 'Unknown error',
                            translationSource: 'none',
                            processingTime: Date.now() - itemStartTime,
                        });
                    } else {
                        // Wait before retry (exponential backoff)
                        await this.sleep(Math.pow(2, retries) * 100);
                    }
                }
            }
        }

        return results;
    }

    /**
     * Übersetzt ein Item basierend auf Synonym Mode
     */
    private async translateItem(
        item: T,
        translationService: TranslationService<T>,
        options: ProcessingOptions
    ): Promise<string[]> {
        const mode = options.synonymMode;
        const maxSynonyms = options.maxSynonyms ?? 10;

        // Delete Mode: Return empty array
        if (mode === 'delete') {
            return [];
        }

        // Translate meanings
        const newSynonyms = await translationService.translate(item);

        // Replace Mode: Return only new synonyms
        if (mode === 'replace') {
            return newSynonyms.slice(0, maxSynonyms);
        }

        // Smart-Merge Mode: Merge existing + new (case-insensitive deduplication)
        if (mode === 'smart-merge') {
            const existing = item.existingSynonyms || [];
            const merged = [...existing];
            const mergedLower = merged.map(s => s.toLowerCase());

            // Add new synonyms that aren't duplicates (case-insensitive)
            for (const synonym of newSynonyms) {
                const synonymLower = synonym.toLowerCase();
                if (!mergedLower.includes(synonymLower) && merged.length < maxSynonyms) {
                    merged.push(synonym);
                    mergedLower.push(synonymLower);
                }
            }

            return merged;
        }

        return newSynonyms;
    }

    /**
     * Filtert Items basierend auf Optionen
     */
    private filterItems(items: T[], options: ProcessingOptions): T[] {
        return items.filter(item => {
            // Filter burned items
            if (options.ignoreBurned && item.burned) {
                return false;
            }

            // Filter items with synonyms
            if (options.onlyWithoutSynonyms) {
                const hasSynonyms = item.existingSynonyms && item.existingSynonyms.length > 0;
                if (hasSynonyms) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * Erstellt Batches aus Items
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Berechnet Progress für 3 Phasen
     */
    private calculateProgress(
        processedCount: number,
        totalCount: number,
        startTime: number
    ): ProcessingProgress {
        const now = Date.now();
        const elapsedTime = now - startTime;
        const progress = processedCount / totalCount;

        // Translation und Upload laufen parallel, daher jeweils 50%
        // ✅ Math.round() für keine Nachkommastellen
        const translationProgress = Math.round(Math.min(100, progress * 100));
        const uploadProgress = Math.round(Math.min(100, progress * 100));
        const overallProgress = Math.round(Math.min(100, progress * 100));

        // Estimate remaining time (in seconds)
        const estimatedTimeRemaining =
            processedCount > 0
                ? ((elapsedTime / processedCount) * (totalCount - processedCount)) / 1000
                : undefined;

        return {
            phase: overallProgress === 100 ? 'complete' : 'translating',
            translationProgress,
            uploadProgress,
            overallProgress,
            processedCount,
            totalCount,
            estimatedTimeRemaining,
            stats: {
                total: totalCount,
                successful: processedCount,
                failed: 0,
                skipped: 0,
                translatedWithDeepL: 0,
                translatedWithDictionary: 0,
                notTranslated: 0,
                averageProcessingTime: 0,
            },
        };
    }

    /**
     * Pausiert die Verarbeitung
     */
    pause(): void {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pausePromise = new Promise(resolve => {
                this.pauseResolve = resolve;
            });
        }
    }

    /**
     * Setzt die Verarbeitung fort
     */
    resume(): void {
        if (this.isPaused && this.pauseResolve) {
            this.isPaused = false;
            this.pauseResolve();
            this.pausePromise = null;
            this.pauseResolve = null;
        }
    }

    /**
     * Stoppt die Verarbeitung komplett
     */
    stop(): void {
        this.isStopped = true;
        this.resume(); // Resume if paused to allow clean exit
    }

    /**
     * Gibt aktuellen Status zurück
     */
    getStatus(): { isPaused: boolean; isStopped: boolean } {
        return {
            isPaused: this.isPaused,
            isStopped: this.isStopped,
        };
    }

    /**
     * Wartet bis Resume aufgerufen wird
     */
    private async waitForResume(): Promise<void> {
        if (this.pausePromise) {
            await this.pausePromise;
        }
    }

    /**
     * Sleep Helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
