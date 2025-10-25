/**
 * Vocabulary Types - Shared type definitions for Vocabulary feature
 * 
 * Extracted from vocabulary-integration.ts (Phase 5: Type-Migration)
 * Used by: useVocabularyManager, vocabulary-streaming-integration
 */

import { VocabularyItem } from './vocabulary-translation';

/**
 * Result of processing a single vocabulary item
 * Used for live updates during streaming
 */
export interface VocabularyItemResult {
    vocabularyId: number;
    success: boolean;
    translatedSynonyms: string[];
    uploadedSynonyms: string[];
    message: string;
}

/**
 * Error information for a failed vocabulary item
 * Includes phase (translation/upload) and retry information
 */
export interface VocabularyItemError {
    vocabularyId: number;
    phase: 'translation' | 'upload';
    error: string;
    originalError?: Error;
    timestamp?: string;
    retryable?: boolean;
}

/**
 * Processing options for vocabulary streaming
 * Subset of CompleteProcessingOptions with only fields used by streaming
 */
export interface VocabularyProcessingOptions {
    batchSize?: number;
    synonymMode: 'smart-merge' | 'replace' | 'delete';
    apiToken: string;
    deeplToken: string;
    enableProgressReporting?: boolean;

    // Live update callbacks (optional)
    onItemProcessing?: (item: VocabularyItem, phase: 'translation' | 'upload') => void;
    onItemUpdated?: (item: VocabularyItem, result: VocabularyItemResult) => void;
    onItemError?: (item: VocabularyItem, error: VocabularyItemError) => void;
}

/**
 * Legacy: Full processing options (kept for backward compatibility with tests)
 * @deprecated Use VocabularyProcessingOptions instead
 */
export interface CompleteProcessingOptions extends VocabularyProcessingOptions {
    stopOnFirstError: boolean;
}
