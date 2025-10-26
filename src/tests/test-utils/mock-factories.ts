/**
 * Test Utilities - Mock Factories
 * 
 * Wiederverwendbare Mock-Factories für Vocabulary, Kanji und Radicals Tests.
 * Reduziert Duplikation und sorgt für konsistente Test-Daten.
 */

import { vi } from 'vitest';

// ============================================================================
// Type Definitions für Preview Components
// ============================================================================

/**
 * Vocabulary für Preview (hat primaryMeaning, alternativeMeanings)
 */
export interface VocabularyPreviewItem {
    id: number;
    characters: string;
    primaryMeaning: string;
    alternativeMeanings: string[];
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
    readings?: string[];
    partsOfSpeech?: string[];
    contextSentences?: Array<{
        en: string;
        ja: string;
    }>;
}

/**
 * Kanji für Preview
 */
export interface KanjiPreviewItem {
    id: number;
    characters: string;
    primaryMeaning: string;
    alternativeMeanings: string[];
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
}

/**
 * Radical für Preview
 */
export interface RadicalPreviewItem {
    id: number;
    meaning: string;
    characters: string | null;
    level: number;
    currentSynonyms: string[];
    selected: boolean;
    translatedSynonyms: string[];
    meaningMnemonic?: string;
}

// ============================================================================
// Vocabulary Mocks
// ============================================================================

/**
 * Erstelle Mock Vocabulary Item
 */
export function createMockVocabulary(overrides?: Partial<VocabularyPreviewItem>): VocabularyPreviewItem {
    return {
        id: 1,
        characters: '犬',
        primaryMeaning: 'dog',
        alternativeMeanings: ['puppy', 'hound'],
        level: 1,
        currentSynonyms: ['Hund'],
        selected: true,
        translatedSynonyms: [],
        meaningMnemonic: 'Test mnemonic',
        readings: ['いぬ', 'けん'],
        partsOfSpeech: ['noun'],
        contextSentences: [
            {
                en: 'The dog is running.',
                ja: '犬が走っています。'
            }
        ],
        ...overrides
    };
}

/**
 * Erstelle Array von Mock Vocabulary Items
 */
export function createMockVocabularyList(count: number = 3): VocabularyPreviewItem[] {
    return Array.from({ length: count }, (_, i) => 
        createMockVocabulary({
            id: i + 1,
            characters: `字${i + 1}`,
            primaryMeaning: `meaning${i + 1}`,
            currentSynonyms: [`synonym${i + 1}`]
        })
    );
}

// ============================================================================
// Kanji Mocks
// ============================================================================

/**
 * Erstelle Mock Kanji Item
 */
export function createMockKanji(overrides?: Partial<KanjiPreviewItem>): KanjiPreviewItem {
    return {
        id: 1,
        characters: '犬',
        primaryMeaning: 'dog',
        alternativeMeanings: ['canine'],
        level: 1,
        currentSynonyms: ['Hund'],
        selected: true,
        translatedSynonyms: [],
        meaningMnemonic: 'Test kanji mnemonic',
        ...overrides
    };
}

/**
 * Erstelle Array von Mock Kanji Items
 */
export function createMockKanjiList(count: number = 3): KanjiPreviewItem[] {
    return Array.from({ length: count }, (_, i) => 
        createMockKanji({
            id: i + 1,
            characters: `字${i + 1}`,
            primaryMeaning: `meaning${i + 1}`,
            currentSynonyms: [`synonym${i + 1}`]
        })
    );
}

// ============================================================================
// Radical Mocks
// ============================================================================

/**
 * Erstelle Mock Radical Item
 */
export function createMockRadical(overrides?: Partial<RadicalPreviewItem>): RadicalPreviewItem {
    return {
        id: 1,
        meaning: 'ground',
        characters: '一',
        level: 1,
        currentSynonyms: ['Boden'],
        selected: true,
        translatedSynonyms: [],
        meaningMnemonic: 'Test radical mnemonic',
        ...overrides
    };
}

/**
 * Erstelle Array von Mock Radical Items
 */
export function createMockRadicalList(count: number = 3): RadicalPreviewItem[] {
    return Array.from({ length: count }, (_, i) => 
        createMockRadical({
            id: i + 1,
            meaning: `meaning${i + 1}`,
            characters: i % 2 === 0 ? `部${i + 1}` : null, // Mix von characters und text-only
            currentSynonyms: [`synonym${i + 1}`]
        })
    );
}

// ============================================================================
// Service Mocks
// ============================================================================

/**
 * Erstelle Mock DeepL Translation Service
 */
export function createMockDeepLService() {
    return {
        translateText: vi.fn().mockResolvedValue(['translated']),
        translateBatch: vi.fn().mockResolvedValue(['translated1', 'translated2'])
    };
}

/**
 * Erstelle Mock WaniKani API Client
 */
export function createMockWaniKaniClient() {
    return {
        get: vi.fn().mockResolvedValue({ data: [] }),
        put: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} })
    };
}

/**
 * Erstelle Mock Upload Service
 */
export function createMockUploadService() {
    return {
        uploadBatch: vi.fn().mockResolvedValue([true, true, true]),
        updateSynonyms: vi.fn().mockResolvedValue(true)
    };
}

// ============================================================================
// Processing Result Mocks
// ============================================================================

/**
 * Erstelle Mock Processing Result
 */
export function createMockProcessingResult(overrides?: Partial<any>) {
    return {
        success: true,
        wasStopped: false,
        totalItems: 10,
        translationCount: 10,
        uploadCount: 10,
        errorCount: 0,
        processingTime: 1000,
        ...overrides
    };
}

/**
 * Erstelle Mock Streaming Phases
 */
export function createMockStreamingPhases(overrides?: Partial<any>) {
    return {
        translationPhase: {
            status: 'translating',
            progress: 50
        },
        uploadPhase: {
            status: 'uploading',
            progress: 30
        },
        overallPhase: {
            status: 'processing',
            progress: 40,
            currentItem: 'test item'
        },
        ...overrides
    };
}
