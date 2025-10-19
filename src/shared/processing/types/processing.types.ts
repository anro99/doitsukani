/**
 * Core Processing Types für Doitsukani
 * 
 * Diese Datei definiert alle Interfaces und Typen für das generische
 * Streaming-Processing-System, das von Vocabulary, Kanji und Radicals
 * verwendet wird.
 * 
 * @module processing.types
 */

// ============================================================================
// Core Item Interfaces
// ============================================================================

/**
 * Basis-Interface für alle verarbeitbaren Items (Vocabulary, Kanji, Radicals)
 * 
 * Jedes Item das durch unser Processing-System laufen kann muss diese
 * Properties implementieren.
 */
export interface ProcessableItem {
    /** Eindeutige WaniKani Subject ID */
    id: number;

    /** Englische Bedeutungen aus WaniKani */
    meanings: string[];

    /** Bereits existierende Synonyme (User + App) */
    existingSynonyms: string[];

    /** WaniKani SRS Stage (0-9) */
    srsStage?: number;

    /** Ist das Item bereits "burned" (SRS Stage 9)? */
    burned?: boolean;
}

/**
 * Erweitertes Interface für Items mit Lesung (Vocabulary, Kanji)
 * 
 * Radicals haben keine Readings, daher ist dies ein separates Interface.
 */
export interface ReadableItem extends ProcessableItem {
    /** Japanische Zeichen (Kanji/Kana) */
    characters: string;

    /** Mögliche Lesungen in Hiragana/Katakana */
    readings: string[];
}

/**
 * Type Guard: Prüft ob ein Item ein ReadableItem ist
 */
export function isReadableItem(item: ProcessableItem): item is ReadableItem {
    return 'characters' in item && 'readings' in item;
}

// ============================================================================
// Processing Result Types
// ============================================================================

/**
 * Ergebnis eines einzelnen Item-Processings
 */
export interface ItemProcessingResult {
    /** Item ID */
    id: number;

    /** War die Verarbeitung erfolgreich? */
    success: boolean;

    /** Übersetzte/gefundene Synonyme */
    translations: string[];

    /** Finale Synonyme nach Merge-Strategy */
    finalSynonyms: string[];

    /** Fehlermeldung bei Fehler */
    error?: string;

    /** Verwendeter Translation-Service ('deepl' | 'dictionary' | 'none') */
    translationSource?: 'deepl' | 'dictionary' | 'none';

    /** Zeit in Millisekunden */
    processingTime?: number;
}

/**
 * Gesamt-Ergebnis eines Processing-Laufs
 */
export interface ProcessingResult {
    /** Erfolgreich verarbeitete Items */
    successful: ItemProcessingResult[];

    /** Fehlgeschlagene Items */
    failed: ItemProcessingResult[];

    /** Übersprungene Items (z.B. bereits burned) */
    skipped: ItemProcessingResult[];

    /** Gesamtstatistiken */
    stats: ProcessingStatistics;

    /** Gesamtzeit in Millisekunden */
    totalTime: number;

    /** Wurde der Prozess gestoppt? */
    wasStopped: boolean;
}

/**
 * Statistiken über einen Processing-Lauf
 */
export interface ProcessingStatistics {
    /** Anzahl der verarbeiteten Items */
    total: number;

    /** Anzahl erfolgreicher Verarbeitungen */
    successful: number;

    /** Anzahl fehlgeschlagener Verarbeitungen */
    failed: number;

    /** Anzahl übersprungener Items */
    skipped: number;

    /** Anzahl Items mit DeepL übersetzt */
    translatedWithDeepL: number;

    /** Anzahl Items mit Dictionary übersetzt */
    translatedWithDictionary: number;

    /** Anzahl Items ohne Übersetzung */
    notTranslated: number;

    /** Durchschnittliche Verarbeitungszeit pro Item (ms) */
    averageProcessingTime: number;
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

/**
 * Aktuelle Processing-Phase
 */
export type ProcessingPhase =
    | 'idle'          // Noch nicht gestartet
    | 'fetching'      // Lade Items von WaniKani
    | 'translating'   // Übersetze Items
    | 'uploading'     // Lade Synonyme zu WaniKani hoch
    | 'complete'      // Fertig
    | 'error'         // Fehler aufgetreten
    | 'stopped';      // Vom User gestoppt

/**
 * Fortschritt während des Processings
 * 
 * Streaming-Processing hat 3 separate Progress-Werte:
 * - Translation Progress (0-100)
 * - Upload Progress (0-100)
 * - Overall Progress (0-100)
 */
export interface ProcessingProgress {
    /** Aktuelle Phase */
    phase: ProcessingPhase;

    /** Gesamt-Fortschritt (0-100) */
    overallProgress: number;

    /** Translation-Fortschritt (0-100) */
    translationProgress: number;

    /** Upload-Fortschritt (0-100) */
    uploadProgress: number;

    /** Anzahl verarbeiteter Items */
    processedCount: number;

    /** Gesamtanzahl zu verarbeitender Items */
    totalCount: number;

    /** Geschätzte verbleibende Zeit in Sekunden */
    estimatedTimeRemaining?: number;

    /** Aktuelles Item (für Debugging) */
    currentItem?: string;

    /** Aktuelle Statistiken */
    stats: ProcessingStatistics;
}

/**
 * Callback-Funktion für Progress-Updates
 */
export type ProgressCallback = (progress: ProcessingProgress) => void;

// ============================================================================
// Service Interfaces
// ============================================================================

/**
 * Translation Service Interface
 * 
 * Implementierungen:
 * - DeepLTranslationService (DeepL API)
 * - VocabularyTranslationService (DeepL + Dictionary Fallback)
 * - MockTranslationService (für Tests)
 */
export interface TranslationService<T extends ProcessableItem = ProcessableItem> {
    /**
     * Übersetzt ein einzelnes Item
     * 
     * @param item - Das zu übersetzende Item
     * @returns Array von deutschen Übersetzungen
     */
    translate(item: T): Promise<string[]>;

    /**
     * Übersetzt mehrere Items in einem Batch
     * 
     * @param items - Array von Items
     * @returns Array von Übersetzungs-Arrays
     */
    translateBatch(items: T[]): Promise<string[][]>;

    /**
     * Name des Services (für Logging/Stats)
     */
    readonly name: string;

    /**
     * Ist der Service verfügbar? (z.B. API Key vorhanden?)
     */
    isAvailable(): boolean;
}

/**
 * Upload Service Interface
 * 
 * Implementierungen:
 * - WaniKaniUploadService (WaniKani API)
 * - MockUploadService (für Tests)
 */
export interface UploadService {
    /**
     * Lädt Synonyme für ein Item zu WaniKani hoch
     * 
     * @param itemId - WaniKani Subject ID
     * @param synonyms - Array von Synonymen
     * @returns true bei Erfolg, false bei Fehler
     */
    upload(itemId: number, synonyms: string[]): Promise<boolean>;

    /**
     * Lädt mehrere Items in einem Batch hoch
     * 
     * @param items - Array von {id, synonyms} Paaren
     * @returns Array von Erfolgs-Flags
     */
    uploadBatch(items: Array<{ id: number; synonyms: string[] }>): Promise<boolean[]>;

    /**
     * Name des Services (für Logging)
     */
    readonly name: string;
}

/**
 * Streaming Processor Interface
 * 
 * Der Kern unseres neuen Processing-Systems.
 * Verarbeitet Items in Batches mit paralleler Translation und Upload.
 */
export interface StreamingProcessor<T extends ProcessableItem = ProcessableItem> {
    /**
     * Verarbeitet Items mit Streaming-Approach
     * 
     * @param items - Array von zu verarbeitenden Items
     * @param translationService - Service für Übersetzungen
     * @param uploadService - Service für Uploads
     * @param options - Processing-Optionen
     * @returns Gesamt-Ergebnis
     */
    process(
        items: T[],
        translationService: TranslationService<T>,
        uploadService: UploadService,
        options: ProcessingOptions
    ): Promise<ProcessingResult>;

    /**
     * Stoppt den aktuellen Processing-Lauf
     */
    stop(): void;

    /**
     * Pausiert den aktuellen Processing-Lauf
     */
    pause(): void;

    /**
     * Setzt einen pausierten Processing-Lauf fort
     */
    resume(): void;

    /**
     * Gibt den aktuellen Status zurück
     */
    getStatus(): ProcessorStatus;
}

/**
 * Status eines Streaming Processors
 */
export interface ProcessorStatus {
    /** Läuft aktuell ein Processing? */
    isProcessing: boolean;

    /** Ist der Processor pausiert? */
    isPaused: boolean;

    /** Aktueller Fortschritt */
    progress: ProcessingProgress;
}

// ============================================================================
// Processing Options
// ============================================================================

/**
 * Synonym-Modus: Wie sollen neue Synonyme mit existierenden kombiniert werden?
 */
export type SynonymMode =
    | 'smart'    // Merge: Behalte existierende + füge neue hinzu (max 8)
    | 'replace'  // Replace: Ersetze alle existierenden durch neue
    | 'delete';  // Delete: Entferne alle Synonyme

/**
 * Optionen für das Processing
 */
export interface ProcessingOptions {
    /** Synonym-Modus */
    synonymMode: SynonymMode;

    /** Batch-Größe (wie viele Items parallel verarbeiten?) */
    batchSize?: number;

    /** Progress-Callback */
    onProgress?: ProgressCallback;

    /** Soll-Stop-Callback (wird vor jedem Batch gecheckt) */
    shouldStop?: () => boolean;

    /** Maximum Synonyme pro Item */
    maxSynonyms?: number;

    /** Retry-Versuche bei Fehlern */
    maxRetries?: number;

    /** Filter: Nur Items ohne existierende Synonyme? */
    onlyWithoutSynonyms?: boolean;

    /** Filter: Ignoriere burned Items? */
    ignoreBurned?: boolean;
}

/**
 * Default Processing Options
 */
export const DEFAULT_PROCESSING_OPTIONS: Required<Omit<ProcessingOptions, 'onProgress' | 'shouldStop'>> = {
    synonymMode: 'smart',
    batchSize: 5,
    maxSynonyms: 8,
    maxRetries: 3,
    onlyWithoutSynonyms: false,
    ignoreBurned: true,
};

// ============================================================================
// Synonym Merge Strategy
// ============================================================================

/**
 * Strategie-Interface für Synonym-Merging
 */
export interface SynonymMergeStrategy {
    /**
     * Merged existierende und neue Synonyme
     * 
     * @param existing - Bereits vorhandene Synonyme
     * @param translations - Neue Übersetzungen
     * @param maxSynonyms - Maximum Anzahl Synonyme
     * @returns Finales Synonym-Array
     */
    merge(
        existing: string[],
        translations: string[],
        maxSynonyms: number
    ): string[];
}

/**
 * Smart Merge Strategy: Behalte existierende + füge neue hinzu
 */
export class SmartMergeStrategy implements SynonymMergeStrategy {
    merge(existing: string[], translations: string[], maxSynonyms: number): string[] {
        // Kombiniere beide Arrays
        const combined = [...existing, ...translations];

        // Entferne Duplikate (case-insensitive)
        const unique = Array.from(
            new Set(combined.map(s => s.toLowerCase()))
        ).map(lower =>
            // Finde das Original mit korrekter Capitalization
            combined.find(s => s.toLowerCase() === lower)!
        );

        // Limitiere auf maxSynonyms
        return unique.slice(0, maxSynonyms);
    }
}

/**
 * Replace Strategy: Ersetze alle existierenden durch neue
 */
export class ReplaceStrategy implements SynonymMergeStrategy {
    merge(_existing: string[], translations: string[], maxSynonyms: number): string[] {
        return translations.slice(0, maxSynonyms);
    }
}

/**
 * Delete Strategy: Entferne alle Synonyme
 */
export class DeleteStrategy implements SynonymMergeStrategy {
    merge(): string[] {
        return [];
    }
}

/**
 * Factory-Funktion: Erstellt die passende Strategy für einen SynonymMode
 */
export function createMergeStrategy(mode: SynonymMode): SynonymMergeStrategy {
    switch (mode) {
        case 'smart':
            return new SmartMergeStrategy();
        case 'replace':
            return new ReplaceStrategy();
        case 'delete':
            return new DeleteStrategy();
    }
}

// ============================================================================
// Error Handling Types
// ============================================================================

/**
 * Error-Typen die während des Processings auftreten können
 */
export type ErrorType =
    | 'translation_error'   // DeepL/Dictionary Fehler
    | 'upload_error'        // WaniKani Upload Fehler
    | 'network_error'       // Netzwerk-Fehler
    | 'rate_limit_error'    // Rate-Limiting getroffen
    | 'auth_error'          // API-Token ungültig
    | 'validation_error'    // Ungültige Daten
    | 'unknown_error';      // Unbekannter Fehler

/**
 * Processing-Error mit zusätzlichen Informationen
 */
export interface ProcessingError extends Error {
    /** Error-Typ */
    type: ErrorType;

    /** Item ID die den Fehler verursacht hat */
    itemId?: number;

    /** Ursprünglicher Error */
    cause?: Error;

    /** Ist der Fehler retry-bar? */
    retriable: boolean;

    /** Timestamp des Fehlers */
    timestamp: Date;
}

/**
 * Factory-Funktion: Erstellt einen ProcessingError
 */
export function createProcessingError(
    type: ErrorType,
    message: string,
    options?: {
        itemId?: number;
        cause?: Error;
        retriable?: boolean;
    }
): ProcessingError {
    const error = new Error(message) as ProcessingError;
    error.type = type;
    error.itemId = options?.itemId;
    error.cause = options?.cause;
    error.retriable = options?.retriable ?? (type !== 'auth_error');
    error.timestamp = new Date();
    return error;
}

/**
 * Error Handler Interface
 */
export interface ErrorHandler {
    /**
     * Behandelt einen Fehler
     * 
     * @param error - Der aufgetretene Fehler
     * @returns Soll der Fehler erneut versucht werden?
     */
    handle(error: ProcessingError): Promise<boolean>;

    /**
     * Gibt alle gesammelten Fehler zurück
     */
    getErrors(): ProcessingError[];

    /**
     * Löscht alle Fehler
     */
    clear(): void;
}

// ============================================================================
// Type Exports für Feature-spezifische Extensions
// ============================================================================

/**
 * Re-exports für einfachere Imports in Feature-Code
 */
export type {
    ProcessableItem as Item,
    ReadableItem as ReadableItemType,
    ProcessingResult as Result,
    ProcessingProgress as Progress,
    ProcessingOptions as Options,
    ProcessingStatistics as Statistics,
};
