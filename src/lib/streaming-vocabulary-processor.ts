/**
 * Streaming Vocabulary Processor
 * 
 * Processes vocabulary items in a streaming fashion where translation and upload
 * happen in parallel pipelines for better performance and user experience.
 */

// Re-export existing types for compatibility
export type { VocabularyItem } from './vocabulary-translation';

export interface TranslationResult {
    translatedSynonyms: string[];
}

export interface UploadResult {
    success: boolean;
    action: 'created' | 'updated' | 'error';
    studyMaterialId?: number;
    error?: string;
}

export interface StreamingProgress {
    phase: 'translation' | 'upload' | 'both';
    translationProgress: number;
    uploadProgress: number;
    currentTranslation?: string;
    currentUpload?: string;
    totalItems: number;
    translatedItems: number;
    uploadedItems: number;
    errors: Array<{
        phase: 'translation' | 'upload';
        error: string;
        item?: any;
    }>;
}

export interface StreamingProcessorConfig {
    translateFn: (item: any) => Promise<TranslationResult>;
    uploadFn: (item: any) => Promise<UploadResult>;
    onProgress: (progress: StreamingProgress) => void;
    concurrency?: number;
    rateLimitMs?: number;
}

export interface StreamingProcessorResult {
    processed: number;
    errors: Array<{
        phase: 'translation' | 'upload';
        error: string;
        item?: any;
    }>;
}

/**
 * StreamingVocabularyProcessor
 * 
 * Processes vocabulary items in a streaming pipeline where:
 * 1. Items are translated as soon as possible
 * 2. Translated items are immediately queued for upload
 * 3. Translation and upload happen in parallel
 * 4. Real-time progress updates are provided
 */
export class StreamingVocabularyProcessor {
    private abortController = new AbortController();
    private progressState: StreamingProgress;
    private translationQueue: any[] = [];
    private uploadQueue: Array<any & TranslationResult> = [];
    private processingComplete = false;
    private completionPromise: Promise<StreamingProcessorResult> | null = null;
    private completionResolve: ((result: StreamingProcessorResult) => void) | null = null;

    constructor(private config: StreamingProcessorConfig) {
        this.progressState = {
            phase: 'translation',
            translationProgress: 0,
            uploadProgress: 0,
            totalItems: 0,
            translatedItems: 0,
            uploadedItems: 0,
            errors: []
        };
    }

    /**
     * Process a batch of vocabulary items in streaming fashion
     */
    async process(items: any[]): Promise<StreamingProcessorResult> {
        // Return immediately if no items or already stopped
        if (items.length === 0 || this.abortController.signal.aborted) {
            return { processed: 0, errors: [] };
        }

        // Reset state for new processing session
        this.resetState();
        this.progressState.totalItems = items.length;

        // Set up completion promise
        this.completionPromise = new Promise<StreamingProcessorResult>((resolve) => {
            this.completionResolve = resolve;
        });

        // Initialize queues
        this.translationQueue = [...items];
        this.uploadQueue = [];

        // Start parallel processing
        this.startTranslationPipeline();
        this.startUploadPipeline();

        // Start progress monitoring
        this.monitorProgress();

        return this.completionPromise;
    }

    /**
     * Stop processing immediately
     */
    stop(): void {
        this.abortController.abort();
        this.processingComplete = true;

        if (this.completionResolve) {
            this.completionResolve({
                processed: this.progressState.uploadedItems,
                errors: this.progressState.errors
            });
        }
    }

    private resetState(): void {
        // Only reset abort controller if not already aborted
        if (!this.abortController.signal.aborted) {
            this.abortController = new AbortController();
        }
        this.processingComplete = false;
        this.completionPromise = null;
        this.completionResolve = null;
        this.progressState = {
            phase: 'translation',
            translationProgress: 0,
            uploadProgress: 0,
            totalItems: 0,
            translatedItems: 0,
            uploadedItems: 0,
            errors: []
        };
    }

    private async startTranslationPipeline(): Promise<void> {
        const { translateFn, rateLimitMs = 1000 } = this.config;
        let delay = 0;

        while (this.translationQueue.length > 0 && !this.abortController.signal.aborted) {
            const item = this.translationQueue.shift();
            if (!item) break;

            try {
                // Apply rate limiting
                if (delay > 0) {
                    await this.sleep(delay);
                }

                // Update current item
                this.progressState.currentTranslation = item.characters || `Item ${item.id}`;
                this.updateProgress();

                // Translate item
                const result = await translateFn(item);

                // Add to upload queue
                this.uploadQueue.push({ ...item, ...result });

                // Update progress
                this.progressState.translatedItems++;
                this.progressState.translationProgress =
                    (this.progressState.translatedItems / this.progressState.totalItems) * 100;
                this.updateProgress();

            } catch (error) {
                this.progressState.errors.push({
                    phase: 'translation',
                    error: error instanceof Error ? error.message : 'Unknown translation error',
                    item
                });
                this.updateProgress();
            }

            delay = rateLimitMs;
        }

        // Clear current translation when done
        this.progressState.currentTranslation = undefined;
        this.updateProgress();
    }

    private async startUploadPipeline(): Promise<void> {
        const { uploadFn, rateLimitMs = 1000 } = this.config;
        let delay = 0;

        while (!this.processingComplete) {
            // Wait for items in upload queue or completion
            if (this.uploadQueue.length === 0) {
                // Check if translation is complete and queue is empty
                if (this.progressState.translatedItems + this.getTranslationErrors() >= this.progressState.totalItems) {
                    break;
                }

                // Wait a bit for more items
                await this.sleep(50);
                continue;
            }

            if (this.abortController.signal.aborted) break;

            const item = this.uploadQueue.shift();
            if (!item) continue;

            try {
                // Apply rate limiting
                if (delay > 0) {
                    await this.sleep(delay);
                }

                // Update current item
                this.progressState.currentUpload = item.characters || `Item ${item.id}`;
                this.updateProgress();

                // Upload item
                await uploadFn(item);

                // Update progress
                this.progressState.uploadedItems++;
                this.progressState.uploadProgress =
                    (this.progressState.uploadedItems / Math.max(1, this.progressState.translatedItems)) * 100;
                this.updateProgress();

            } catch (error) {
                this.progressState.errors.push({
                    phase: 'upload',
                    error: error instanceof Error ? error.message : 'Unknown upload error',
                    item
                });
                this.updateProgress();
            }

            delay = rateLimitMs;
        }

        // Clear current upload when done
        this.progressState.currentUpload = undefined;
        this.updateProgress();

        // Complete processing
        this.completeProcessing();
    }

    private monitorProgress(): void {
        const monitor = () => {
            if (this.processingComplete) return;

            this.updateProgress();

            // Continue monitoring
            setTimeout(monitor, 200);
        };

        monitor();
    }

    private updateProgress(): void {
        // Determine current phase
        const { translatedItems, uploadedItems, totalItems } = this.progressState;
        const translationErrors = this.getTranslationErrors();
        const totalTranslated = translatedItems + translationErrors;

        if (translatedItems > 0 && uploadedItems < translatedItems && totalTranslated < totalItems) {
            this.progressState.phase = 'both';
        } else if (totalTranslated >= totalItems) {
            this.progressState.phase = 'upload';
        } else {
            this.progressState.phase = 'translation';
        }

        // Update upload progress based on successful translations
        if (translatedItems > 0) {
            this.progressState.uploadProgress =
                (this.progressState.uploadedItems / translatedItems) * 100;
        }

        this.config.onProgress({ ...this.progressState });
    }

    private getTranslationErrors(): number {
        return this.progressState.errors.filter(e => e.phase === 'translation').length;
    }

    private completeProcessing(): void {
        this.processingComplete = true;

        if (this.completionResolve) {
            this.completionResolve({
                processed: this.progressState.uploadedItems,
                errors: this.progressState.errors
            });
        }
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
