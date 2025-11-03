/**
 * Combined Processing Types
 * 
 * Zusätzliche Type-Definitionen für den Combined Manager
 * Kompatibel mit existierenden Types aus combined-streaming-integration.ts
 * Angelehnt an Vocabulary Manager für konsistente UI/UX
 */

// Re-export existierende Types aus combined-streaming-integration
export type {
    CombinedProcessingResult,
    CombinedProcessingProgress,
    CombinedItemResult,
    CombinedItemError,
    SynonymMode,
} from './combined-streaming-integration';

/**
 * Upload-Statistiken für UI-Anzeige
 * Kompatibel mit ProcessingResultAlert Komponente (wie bei Vocabulary)
 */
export interface CombinedUploadStats {
    created: number;      // Neu erstellte Study Materials
    updated: number;      // Aktualisierte Study Materials
    failed: number;       // Fehlgeschlagene Uploads
    skipped: number;      // Übersprungene Items
    successful: number;   // Erfolgreich hochgeladene Items
}
