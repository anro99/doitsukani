/**
 * Type Guards für API-Responses
 * 
 * Type Guards validieren unbekannte Daten zur Laufzeit und bieten
 * TypeScript Type-Narrowing. Besonders wichtig für externe API-Responses.
 */

/**
 * Prüft ob ein Wert ein Objekt ist (nicht null, nicht Array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Prüft ob ein Wert ein Array ist
 */
export function isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
}

/**
 * Prüft ob ein Wert ein String ist
 */
export function isString(value: unknown): value is string {
    return typeof value === 'string';
}

/**
 * Prüft ob ein Wert eine number ist
 */
export function isNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Prüft ob ein Objekt eine Property hat
 */
export function hasProperty<K extends string>(
    obj: unknown,
    key: K
): obj is Record<K, unknown> {
    return isObject(obj) && key in obj;
}

/**
 * Type Guard für WaniKani API Response Structure
 */
export interface WaniKaniResponse<T> {
    object: string;
    url: string;
    data_updated_at: string;
    data: T[];
    pages?: {
        next_url: string | null;
        previous_url: string | null;
        per_page: number;
    };
    total_count?: number;
}

export function isWaniKaniResponse<T>(
    value: unknown
): value is WaniKaniResponse<T> {
    if (!isObject(value)) return false;
    
    return (
        hasProperty(value, 'object') && isString(value.object) &&
        hasProperty(value, 'url') && isString(value.url) &&
        hasProperty(value, 'data') && isArray(value.data)
    );
}

/**
 * Type Guard für WaniKani Subject (generisch)
 */
export interface WaniKaniSubject {
    id: number;
    object: string;
    url: string;
    data_updated_at: string;
    data: {
        level: number;
        created_at: string;
        slug: string;
        hidden_at: string | null;
        document_url: string;
        characters: string | null;
        meanings: Array<{
            meaning: string;
            primary: boolean;
            accepted_answer: boolean;
        }>;
    };
}

export function isWaniKaniSubject(value: unknown): value is WaniKaniSubject {
    if (!isObject(value)) return false;
    
    if (!hasProperty(value, 'id') || !isNumber(value.id)) return false;
    if (!hasProperty(value, 'object') || !isString(value.object)) return false;
    if (!hasProperty(value, 'data') || !isObject(value.data)) return false;
    
    const data = value.data;
    
    return (
        hasProperty(data, 'level') && isNumber(data.level) &&
        hasProperty(data, 'meanings') && isArray(data.meanings)
    );
}

/**
 * Type Guard für Vocabulary Readings
 */
function hasVocabularyReadings(data: unknown): boolean {
    if (!isObject(data)) return false;
    if (!hasProperty(data, 'readings')) return false;
    
    return isArray(data.readings) && hasProperty(data, 'parts_of_speech');
}

/**
 * Type Guard für Kanji Readings
 */
function hasKanjiReadings(data: unknown): boolean {
    if (!isObject(data)) return false;
    if (!hasProperty(data, 'readings')) return false;
    
    return isArray(data.readings);
}

/**
 * Type Guard: Prüft ob ein WaniKani Subject vom Typ Vocabulary ist
 */
export function isVocabularySubject(value: unknown): boolean {
    if (!isWaniKaniSubject(value)) return false;
    
    return (
        value.object === 'vocabulary' &&
        hasVocabularyReadings(value.data)
    );
}

/**
 * Type Guard: Prüft ob ein WaniKani Subject vom Typ Kanji ist
 */
export function isKanjiSubject(value: unknown): boolean {
    if (!isWaniKaniSubject(value)) return false;
    
    return (
        value.object === 'kanji' &&
        hasKanjiReadings(value.data)
    );
}

/**
 * Type Guard: Prüft ob ein WaniKani Subject vom Typ Radical ist
 */
export function isRadicalSubject(value: unknown): boolean {
    if (!isWaniKaniSubject(value)) return false;
    
    return value.object === 'radical';
}

/**
 * Type Guard für DeepL API Response
 */
export interface DeepLResponse {
    translations: Array<{
        detected_source_language: string;
        text: string;
    }>;
}

export function isDeepLResponse(value: unknown): value is DeepLResponse {
    if (!isObject(value)) return false;
    if (!hasProperty(value, 'translations')) return false;
    if (!isArray(value.translations)) return false;
    
    // Prüfe erstes Element falls vorhanden
    if (value.translations.length > 0) {
        const firstTranslation = value.translations[0];
        if (!isObject(firstTranslation)) return false;
        if (!hasProperty(firstTranslation, 'text')) return false;
        if (!isString(firstTranslation.text)) return false;
    }
    
    return true;
}

/**
 * Type Guard für Axios Error
 */
export interface AxiosError extends Error {
    response?: {
        status: number;
        data: unknown;
        headers: Record<string, string>;
    };
    request?: unknown;
    config?: unknown;
}

export function isAxiosError(error: unknown): error is AxiosError {
    return (
        error instanceof Error &&
        hasProperty(error, 'isAxiosError') &&
        error.isAxiosError === true
    );
}

/**
 * Assertion: Wirft Fehler wenn value kein WaniKaniResponse ist
 */
export function assertWaniKaniResponse<T>(
    value: unknown,
    context: string
): asserts value is WaniKaniResponse<T> {
    if (!isWaniKaniResponse(value)) {
        throw new TypeError(
            `Ungültige WaniKani API Response in ${context}: ${JSON.stringify(value)}`
        );
    }
}

/**
 * Assertion: Wirft Fehler wenn value kein DeepLResponse ist
 */
export function assertDeepLResponse(
    value: unknown,
    context: string
): asserts value is DeepLResponse {
    if (!isDeepLResponse(value)) {
        throw new TypeError(
            `Ungültige DeepL API Response in ${context}: ${JSON.stringify(value)}`
        );
    }
}
