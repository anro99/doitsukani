/**
 * Branded Types für Type-Safety bei IDs
 * 
 * Branded Types verhindern, dass IDs verschiedener Entitäten versehentlich
 * vertauscht werden. TypeScript erkennt den Fehler zur Compile-Zeit.
 * 
 * Beispiel:
 * ```typescript
 * const vocabId = createVocabularyId(123);
 * const kanjiId = createKanjiId(456);
 * 
 * getVocabulary(kanjiId); // ❌ TypeScript Error!
 * getVocabulary(vocabId);  // ✅ OK
 * ```
 */

// Branded Type Helper
declare const __brand: unique symbol;
type Brand<T, TBrand extends string> = T & { [__brand]: TBrand };

/**
 * Vocabulary ID - eindeutige Kennung für Vocabulary-Items
 */
export type VocabularyId = Brand<number, 'VocabularyId'>;

/**
 * Kanji ID - eindeutige Kennung für Kanji-Items
 */
export type KanjiId = Brand<number, 'KanjiId'>;

/**
 * Radical ID - eindeutige Kennung für Radical-Items
 */
export type RadicalId = Brand<number, 'RadicalId'>;

/**
 * Subject ID - generische Kennung für alle WaniKani-Subjects
 * Kann in Kontexten verwendet werden, wo der genaue Typ nicht wichtig ist
 */
export type SubjectId = VocabularyId | KanjiId | RadicalId;

// Factory Functions zum Erstellen von Branded IDs

/**
 * Erstellt eine typsichere VocabularyId aus einer number
 */
export function createVocabularyId(id: number): VocabularyId {
    return id as VocabularyId;
}

/**
 * Erstellt eine typsichere KanjiId aus einer number
 */
export function createKanjiId(id: number): KanjiId {
    return id as KanjiId;
}

/**
 * Erstellt eine typsichere RadicalId aus einer number
 */
export function createRadicalId(id: number): RadicalId {
    return id as RadicalId;
}

// Utility Functions

/**
 * Extrahiert die numerische ID aus einer Branded ID
 * Nützlich für API-Calls die raw numbers erwarten
 */
export function unwrapId(id: SubjectId): number {
    return id as number;
}

/**
 * Konvertiert ein Array von numbers zu Branded IDs
 */
export function toVocabularyIds(ids: number[]): VocabularyId[] {
    return ids.map(createVocabularyId);
}

export function toKanjiIds(ids: number[]): KanjiId[] {
    return ids.map(createKanjiId);
}

export function toRadicalIds(ids: number[]): RadicalId[] {
    return ids.map(createRadicalId);
}

/**
 * Type Guard: Prüft ob ein Wert eine gültige ID ist
 */
export function isValidId(value: unknown): value is number {
    return typeof value === 'number' && value > 0 && Number.isInteger(value);
}

/**
 * Type Guard mit Assertion: Wirft Fehler wenn ID ungültig
 */
export function assertValidId(value: unknown, context: string): asserts value is number {
    if (!isValidId(value)) {
        throw new TypeError(
            `Ungültige ID in ${context}: erwartet positive integer, erhalten ${typeof value} (${value})`
        );
    }
}
