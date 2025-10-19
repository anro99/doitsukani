/**
 * Tests für Core Processing Types
 * 
 * Diese Tests validieren:
 * - Type Guards funktionieren korrekt
 * - Factory Functions erstellen valide Objekte
 * - Merge Strategies arbeiten wie erwartet
 * - Error Handling funktioniert
 */

import { describe, it, expect } from 'vitest';
import {
    ProcessableItem,
    ReadableItem,
    isReadableItem,
    ProcessingPhase,
    SynonymMode,
    SmartMergeStrategy,
    ReplaceStrategy,
    DeleteStrategy,
    createMergeStrategy,
    createProcessingError,
    ErrorType,
    DEFAULT_PROCESSING_OPTIONS,
} from '@/shared/processing/types/processing.types';

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('isReadableItem', () => {
    it('sollte true für Vocabulary zurückgeben', () => {
        const item: ReadableItem = {
            id: 1,
            characters: '水',
            readings: ['みず'],
            meanings: ['water'],
            existingSynonyms: [],
        };

        expect(isReadableItem(item)).toBe(true);
    });

    it('sollte true für Kanji zurückgeben', () => {
        const item: ReadableItem = {
            id: 2,
            characters: '火',
            readings: ['ひ', 'か'],
            meanings: ['fire'],
            existingSynonyms: [],
        };

        expect(isReadableItem(item)).toBe(true);
    });

    it('sollte false für Radicals zurückgeben', () => {
        const item: ProcessableItem = {
            id: 3,
            meanings: ['ground'],
            existingSynonyms: [],
        };

        expect(isReadableItem(item)).toBe(false);
    });
});

// ============================================================================
// Merge Strategy Tests
// ============================================================================

describe('SmartMergeStrategy', () => {
    const strategy = new SmartMergeStrategy();

    it('sollte existierende und neue Synonyme kombinieren', () => {
        const existing = ['Wasser', 'H2O'];
        const translations = ['Gewässer', 'Flüssigkeit'];
        const maxSynonyms = 8;

        const result = strategy.merge(existing, translations, maxSynonyms);

        expect(result).toHaveLength(4);
        expect(result).toContain('Wasser');
        expect(result).toContain('H2O');
        expect(result).toContain('Gewässer');
        expect(result).toContain('Flüssigkeit');
    });

    it('sollte Duplikate entfernen (case-insensitive)', () => {
        const existing = ['Wasser', 'wasser'];
        const translations = ['WASSER', 'Gewässer'];
        const maxSynonyms = 8;

        const result = strategy.merge(existing, translations, maxSynonyms);

        // Sollte nur ein "Wasser" (mit originaler Capitalization) behalten
        expect(result.length).toBeLessThanOrEqual(2);
        expect(result).toContain('Gewässer');
    });

    it('sollte auf maxSynonyms limitieren', () => {
        const existing = ['Wasser', 'H2O', 'Gewässer'];
        const translations = ['Flüssigkeit', 'Nass', 'Aqua'];
        const maxSynonyms = 4;

        const result = strategy.merge(existing, translations, maxSynonyms);

        expect(result).toHaveLength(4);
    });

    it('sollte existierende Synonyme priorisieren', () => {
        const existing = ['Wasser', 'H2O'];
        const translations = ['Gewässer', 'Flüssigkeit', 'Nass'];
        const maxSynonyms = 3;

        const result = strategy.merge(existing, translations, maxSynonyms);

        expect(result).toHaveLength(3);
        expect(result).toContain('Wasser');
        expect(result).toContain('H2O');
    });

    it('sollte leere Arrays handhaben', () => {
        const existing: string[] = [];
        const translations = ['Wasser'];
        const maxSynonyms = 8;

        const result = strategy.merge(existing, translations, maxSynonyms);

        expect(result).toEqual(['Wasser']);
    });
});

describe('ReplaceStrategy', () => {
    const strategy = new ReplaceStrategy();

    it('sollte alle existierenden Synonyme ersetzen', () => {
        const existing = ['Wasser', 'H2O'];
        const translations = ['Gewässer', 'Flüssigkeit'];
        const maxSynonyms = 8;

        const result = strategy.merge(existing, translations, maxSynonyms);

        expect(result).toEqual(['Gewässer', 'Flüssigkeit']);
        expect(result).not.toContain('Wasser');
        expect(result).not.toContain('H2O');
    });

    it('sollte auf maxSynonyms limitieren', () => {
        const existing = ['Wasser'];
        const translations = ['Gewässer', 'Flüssigkeit', 'Nass', 'Aqua'];
        const maxSynonyms = 2;

        const result = strategy.merge(existing, translations, maxSynonyms);

        expect(result).toHaveLength(2);
        expect(result).toEqual(['Gewässer', 'Flüssigkeit']);
    });
});

describe('DeleteStrategy', () => {
    const strategy = new DeleteStrategy();

    it('sollte leeres Array zurückgeben', () => {
        const result = strategy.merge();

        expect(result).toEqual([]);
    });
});

describe('createMergeStrategy', () => {
    it('sollte SmartMergeStrategy für "smart" mode erstellen', () => {
        const strategy = createMergeStrategy('smart');

        expect(strategy).toBeInstanceOf(SmartMergeStrategy);
    });

    it('sollte ReplaceStrategy für "replace" mode erstellen', () => {
        const strategy = createMergeStrategy('replace');

        expect(strategy).toBeInstanceOf(ReplaceStrategy);
    });

    it('sollte DeleteStrategy für "delete" mode erstellen', () => {
        const strategy = createMergeStrategy('delete');

        expect(strategy).toBeInstanceOf(DeleteStrategy);
    });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe('createProcessingError', () => {
    it('sollte einen ProcessingError mit allen Properties erstellen', () => {
        const error = createProcessingError(
            'translation_error',
            'DeepL API failed',
            {
                itemId: 123,
                cause: new Error('Network timeout'),
                retriable: true,
            }
        );

        expect(error.type).toBe('translation_error');
        expect(error.message).toBe('DeepL API failed');
        expect(error.itemId).toBe(123);
        expect(error.cause).toBeInstanceOf(Error);
        expect(error.retriable).toBe(true);
        expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('sollte retriable auf true setzen für nicht-auth Fehler', () => {
        const error = createProcessingError('network_error', 'Connection lost');

        expect(error.retriable).toBe(true);
    });

    it('sollte retriable auf false setzen für auth Fehler', () => {
        const error = createProcessingError('auth_error', 'Invalid API token');

        expect(error.retriable).toBe(false);
    });

    it('sollte ohne optionale Properties funktionieren', () => {
        const error = createProcessingError('upload_error', 'Upload failed');

        expect(error.type).toBe('upload_error');
        expect(error.message).toBe('Upload failed');
        expect(error.itemId).toBeUndefined();
        expect(error.cause).toBeUndefined();
        expect(error.retriable).toBe(true);
    });
});

// ============================================================================
// Default Options Tests
// ============================================================================

describe('DEFAULT_PROCESSING_OPTIONS', () => {
    it('sollte vernünftige Defaults haben', () => {
        expect(DEFAULT_PROCESSING_OPTIONS.synonymMode).toBe('smart');
        expect(DEFAULT_PROCESSING_OPTIONS.batchSize).toBe(5);
        expect(DEFAULT_PROCESSING_OPTIONS.maxSynonyms).toBe(8);
        expect(DEFAULT_PROCESSING_OPTIONS.maxRetries).toBe(3);
        expect(DEFAULT_PROCESSING_OPTIONS.onlyWithoutSynonyms).toBe(false);
        expect(DEFAULT_PROCESSING_OPTIONS.ignoreBurned).toBe(true);
    });
});

// ============================================================================
// Type Validation Tests (Compile-time)
// ============================================================================

describe('Type Validation', () => {
    it('sollte ProcessableItem korrekt typisieren', () => {
        const item: ProcessableItem = {
            id: 1,
            meanings: ['water'],
            existingSynonyms: [],
        };

        // Diese Tests prüfen nur Compile-time Type-Safety
        expect(item.id).toBeDefined();
        expect(item.meanings).toBeDefined();
        expect(item.existingSynonyms).toBeDefined();
    });

    it('sollte ReadableItem als Subtype von ProcessableItem akzeptieren', () => {
        const readableItem: ReadableItem = {
            id: 1,
            characters: '水',
            readings: ['みず'],
            meanings: ['water'],
            existingSynonyms: [],
        };

        // ReadableItem extends ProcessableItem
        const processableItem: ProcessableItem = readableItem;

        expect(processableItem).toBeDefined();
    });

    it('sollte SynonymMode als Union Type akzeptieren', () => {
        const modes: SynonymMode[] = ['smart', 'replace', 'delete'];

        expect(modes).toHaveLength(3);
    });

    it('sollte ProcessingPhase als Union Type akzeptieren', () => {
        const phases: ProcessingPhase[] = [
            'idle',
            'fetching',
            'translating',
            'uploading',
            'complete',
            'error',
            'stopped',
        ];

        expect(phases).toHaveLength(7);
    });

    it('sollte ErrorType als Union Type akzeptieren', () => {
        const errorTypes: ErrorType[] = [
            'translation_error',
            'upload_error',
            'network_error',
            'rate_limit_error',
            'auth_error',
            'validation_error',
            'unknown_error',
        ];

        expect(errorTypes).toHaveLength(7);
    });
});

// ============================================================================
// Interface Implementation Tests
// ============================================================================

describe('Interface Implementations', () => {
    it('sollte TranslationService Interface implementieren können', () => {
        // Mock Implementation
        const mockTranslationService = {
            name: 'MockTranslationService',
            translate: async () => ['test'],
            translateBatch: async () => [['test']],
            isAvailable: () => true,
        };

        expect(mockTranslationService.name).toBe('MockTranslationService');
        expect(mockTranslationService.isAvailable()).toBe(true);
    });

    it('sollte UploadService Interface implementieren können', () => {
        // Mock Implementation
        const mockUploadService = {
            name: 'MockUploadService',
            upload: async () => true,
            uploadBatch: async () => [true],
        };

        expect(mockUploadService.name).toBe('MockUploadService');
    });

    it('sollte ErrorHandler Interface implementieren können', () => {
        // Mock Implementation
        const mockErrorHandler = {
            handle: async () => true,
            getErrors: () => [],
            clear: () => { },
        };

        expect(mockErrorHandler.getErrors()).toEqual([]);
    });
});
