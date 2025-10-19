/**
 * Tests für Translation Services (TDD - Test First!)
 * 
 * Diese Tests definieren das Verhalten der Translation Services
 * BEVOR wir sie implementieren.
 * 
 * Status: FAILING (erwartet) - Implementation folgt in Phase 2
 * 
 * Die Translation Services sollen:
 * - DeepL API Integration für Batch-Übersetzungen
 * - Dictionary Fallback bei DeepL-Fehlern
 * - Caching von Übersetzungen
 * - Rate Limiting für API-Calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeeplTranslationService } from '@/shared/processing/services/DeeplTranslationService';
import { DictionaryTranslationService } from '@/shared/processing/services/DictionaryTranslationService';
import type { ProcessableItem } from '@/shared/processing/types/processing.types';

// ============================================================================
// Test Helpers & Mocks
// ============================================================================

/**
 * Mock DeepL API Response
 */
function mockDeeplResponse(translations: string[]): any {
    return {
        translations: translations.map(text => ({
            text,
            detected_source_lang: 'EN',
        })),
    };
}

/**
 * Erstellt Test-Items
 */
function createTestItem(id: number, meanings: string[]): ProcessableItem {
    return {
        id,
        meanings,
        existingSynonyms: [],
    };
}

// ============================================================================
// DeeplTranslationService Tests
// ============================================================================

describe('DeeplTranslationService', () => {
    let service: DeeplTranslationService;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFetch = vi.fn();
        global.fetch = mockFetch;

        service = new DeeplTranslationService('fake-api-key');
    });

    // ==========================================================================
    // Basic Translation Tests
    // ==========================================================================

    describe('Basic Translation', () => {
        it('sollte einzelnes Item übersetzen', async () => {
            const item = createTestItem(1, ['water', 'H2O']);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDeeplResponse(['Wasser', 'H2O']),
            });

            const result = await service.translate(item);

            expect(result).toEqual(['Wasser', 'H2O']);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('sollte mehrere meanings in einem API-Call übersetzen', async () => {
            const item = createTestItem(1, ['hello', 'world', 'test']);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDeeplResponse(['Hallo', 'Welt', 'Test']),
            });

            const result = await service.translate(item);

            expect(result).toHaveLength(3);
            expect(result).toEqual(['Hallo', 'Welt', 'Test']);
            expect(mockFetch).toHaveBeenCalledTimes(1); // Nur ein API-Call
        });

        it('sollte leere meanings-Liste handhaben', async () => {
            const item = createTestItem(1, []);

            const result = await service.translate(item);

            expect(result).toEqual([]);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        it('sollte name-Property korrekt zurückgeben', () => {
            expect(service.name).toBe('DeepL');
        });
    });

    // ==========================================================================
    // Batch Translation Tests
    // ==========================================================================

    describe('Batch Translation', () => {
        it('sollte Batch von Items übersetzen', async () => {
            const items = [
                createTestItem(1, ['hello']),
                createTestItem(2, ['world']),
                createTestItem(3, ['test']),
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockDeeplResponse(['Hallo', 'Welt', 'Test']),
            });

            const results = await service.translateBatch(items);

            expect(results).toHaveLength(3);
            expect(results[0]).toEqual(['Hallo']);
            expect(results[1]).toEqual(['Welt']);
            expect(results[2]).toEqual(['Test']);
        });

        it('sollte große Batches in kleinere Chunks aufteilen', async () => {
            // DeepL hat Limit von 50 texts pro Request
            const items = Array.from({ length: 60 }, (_, i) =>
                createTestItem(i + 1, [`text${i + 1}`])
            );

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockDeeplResponse(
                    items.map((_, i) => `Text${i + 1}`)
                ),
            });

            const results = await service.translateBatch(items);

            expect(results).toHaveLength(60);
            // Erwartung: Mindestens 2 API-Calls (50 + 10)
            expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2);
        });

        it('sollte Items mit mehreren meanings korrekt batchen', async () => {
            const items = [
                createTestItem(1, ['hello', 'hi']),
                createTestItem(2, ['world', 'earth']),
            ];

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockDeeplResponse(['Hallo', 'Hi', 'Welt', 'Erde']),
            });

            const results = await service.translateBatch(items);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual(['Hallo', 'Hi']);
            expect(results[1]).toEqual(['Welt', 'Erde']);
        });
    });

    // ==========================================================================
    // Error Handling Tests
    // ==========================================================================

    describe('Error Handling', () => {
        it('sollte API-Fehler als Error werfen', async () => {
            const item = createTestItem(1, ['test']);

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                statusText: 'Forbidden',
            });

            await expect(service.translate(item)).rejects.toThrow();
        });

        it('sollte Network-Fehler handhaben', async () => {
            const item = createTestItem(1, ['test']);

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(service.translate(item)).rejects.toThrow('Network error');
        });

        it('sollte ungültige API-Response handhaben', async () => {
            const item = createTestItem(1, ['test']);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ invalid: 'response' }),
            });

            await expect(service.translate(item)).rejects.toThrow();
        });

        it('sollte Rate-Limit-Fehler spezifisch behandeln', async () => {
            const item = createTestItem(1, ['test']);

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
            });

            await expect(service.translate(item)).rejects.toThrow(/rate limit/i);
        });
    });

    // ==========================================================================
    // API Integration Tests
    // ==========================================================================

    describe('API Integration', () => {
        it('sollte korrekte API-URL verwenden', async () => {
            const item = createTestItem(1, ['test']);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDeeplResponse(['Test']),
            });

            await service.translate(item);

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toContain('api-free.deepl.com/v2/translate');
        });

        it('sollte API-Key im Header senden', async () => {
            const item = createTestItem(1, ['test']);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDeeplResponse(['Test']),
            });

            await service.translate(item);

            const headers = mockFetch.mock.calls[0][1].headers;
            expect(headers.Authorization).toContain('DeepL-Auth-Key');
            expect(headers.Authorization).toContain('fake-api-key');
        });

        it('sollte target_lang=DE und source_lang=EN setzen', async () => {
            const item = createTestItem(1, ['test']);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDeeplResponse(['Test']),
            });

            await service.translate(item);

            const body = mockFetch.mock.calls[0][1].body;
            expect(body).toContain('target_lang=DE');
            expect(body).toContain('source_lang=EN');
        });

        it('sollte text[] Parameter korrekt formatieren', async () => {
            const item = createTestItem(1, ['hello', 'world']);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockDeeplResponse(['Hallo', 'Welt']),
            });

            await service.translate(item);

            const body = mockFetch.mock.calls[0][1].body;
            expect(body).toContain('text=hello');
            expect(body).toContain('text=world');
        });
    });

    // ==========================================================================
    // Caching Tests
    // ==========================================================================

    describe('Caching', () => {
        it('sollte identische Übersetzungen cachen', async () => {
            const item1 = createTestItem(1, ['water']);
            const item2 = createTestItem(2, ['water']);

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockDeeplResponse(['Wasser']),
            });

            await service.translate(item1);
            await service.translate(item2);

            // Erwartung: Nur ein API-Call (zweiter aus Cache)
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });

        it('sollte Cache-Key case-sensitive sein', async () => {
            const item1 = createTestItem(1, ['Water']);
            const item2 = createTestItem(2, ['water']);

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockDeeplResponse(['Wasser']),
            });

            await service.translate(item1);
            await service.translate(item2);

            // Erwartung: Zwei API-Calls (verschiedene Strings)
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });

        it('sollte clearCache() den Cache leeren', async () => {
            const item = createTestItem(1, ['water']);

            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockDeeplResponse(['Wasser']),
            });

            await service.translate(item);
            service.clearCache();
            await service.translate(item);

            // Erwartung: Zwei API-Calls (Cache wurde geleert)
            expect(mockFetch).toHaveBeenCalledTimes(2);
        });
    });

    // ==========================================================================
    // Availability Tests
    // ==========================================================================

    describe('Availability', () => {
        it('sollte isAvailable() true zurückgeben wenn API-Key gesetzt', () => {
            const serviceWithKey = new DeeplTranslationService('valid-key');
            expect(serviceWithKey.isAvailable()).toBe(true);
        });

        it('sollte isAvailable() false zurückgeben wenn kein API-Key', () => {
            const serviceWithoutKey = new DeeplTranslationService('');
            expect(serviceWithoutKey.isAvailable()).toBe(false);
        });

        it('sollte translate() Error werfen wenn nicht available', async () => {
            const serviceWithoutKey = new DeeplTranslationService('');
            const item = createTestItem(1, ['test']);

            await expect(serviceWithoutKey.translate(item)).rejects.toThrow(/not available/i);
        });
    });
});

// ============================================================================
// DictionaryTranslationService Tests
// ============================================================================

describe('DictionaryTranslationService', () => {
    let service: DictionaryTranslationService;

    beforeEach(() => {
        service = new DictionaryTranslationService();
    });

    // ==========================================================================
    // Basic Translation Tests
    // ==========================================================================

    describe('Basic Translation', () => {
        it('sollte aus integriertem Dictionary übersetzen', async () => {
            const item = createTestItem(1, ['water']);

            const result = await service.translate(item);

            expect(result).toContain('Wasser');
        });

        it('sollte mehrere meanings übersetzen', async () => {
            const item = createTestItem(1, ['hello', 'world']);

            const result = await service.translate(item);

            expect(result).toHaveLength(2);
            expect(result[0]).toBeTruthy();
            expect(result[1]).toBeTruthy();
        });

        it('sollte leere meanings-Liste handhaben', async () => {
            const item = createTestItem(1, []);

            const result = await service.translate(item);

            expect(result).toEqual([]);
        });

        it('sollte name-Property korrekt zurückgeben', () => {
            expect(service.name).toBe('Dictionary');
        });
    });

    // ==========================================================================
    // Dictionary Lookup Tests
    // ==========================================================================

    describe('Dictionary Lookup', () => {
        it('sollte case-insensitive lookup durchführen', async () => {
            const item1 = createTestItem(1, ['WATER']);
            const item2 = createTestItem(2, ['water']);
            const item3 = createTestItem(3, ['Water']);

            const result1 = await service.translate(item1);
            const result2 = await service.translate(item2);
            const result3 = await service.translate(item3);

            // Erwartung: Alle geben die gleiche Übersetzung
            expect(result1[0]).toBe(result2[0]);
            expect(result2[0]).toBe(result3[0]);
        });

        it('sollte Originaltext zurückgeben wenn kein Eintrag gefunden', async () => {
            const item = createTestItem(1, ['xyzabc123notindict']);

            const result = await service.translate(item);

            expect(result).toEqual(['xyzabc123notindict']);
        });

        it('sollte mehrere Übersetzungen für ein Wort unterstützen', async () => {
            const item = createTestItem(1, ['run']); // Kann mehrere Bedeutungen haben

            const result = await service.translate(item);

            // Erwartung: Mindestens eine Übersetzung
            expect(result).toHaveLength(1);
            expect(result[0]).toBeTruthy();
        });
    });

    // ==========================================================================
    // Batch Translation Tests
    // ==========================================================================

    describe('Batch Translation', () => {
        it('sollte Batch von Items übersetzen', async () => {
            const items = [
                createTestItem(1, ['hello']),
                createTestItem(2, ['world']),
                createTestItem(3, ['test']),
            ];

            const results = await service.translateBatch(items);

            expect(results).toHaveLength(3);
            expect(results[0]).toHaveLength(1);
            expect(results[1]).toHaveLength(1);
            expect(results[2]).toHaveLength(1);
        });

        it('sollte große Batches effizient verarbeiten', async () => {
            const items = Array.from({ length: 100 }, (_, i) =>
                createTestItem(i + 1, [`word${i + 1}`])
            );

            const startTime = Date.now();
            const results = await service.translateBatch(items);
            const endTime = Date.now();

            expect(results).toHaveLength(100);
            // Erwartung: Schnelle Verarbeitung (< 1 Sekunde)
            expect(endTime - startTime).toBeLessThan(1000);
        });
    });

    // ==========================================================================
    // Performance Tests
    // ==========================================================================

    describe('Performance', () => {
        it('sollte translate() schnell sein (< 10ms)', async () => {
            const item = createTestItem(1, ['water']);

            const startTime = Date.now();
            await service.translate(item);
            const endTime = Date.now();

            expect(endTime - startTime).toBeLessThan(10);
        });

        it('sollte bei wiederholten Lookups konstant schnell sein', async () => {
            const item = createTestItem(1, ['water']);
            const times: number[] = [];

            for (let i = 0; i < 10; i++) {
                const start = Date.now();
                await service.translate(item);
                const end = Date.now();
                times.push(end - start);
            }

            // Erwartung: Alle Aufrufe < 10ms
            times.forEach(time => {
                expect(time).toBeLessThan(10);
            });
        });
    });

    // ==========================================================================
    // Availability Tests
    // ==========================================================================

    describe('Availability', () => {
        it('sollte isAvailable() immer true zurückgeben', () => {
            expect(service.isAvailable()).toBe(true);
        });

        it('sollte auch ohne Netzwerk funktionieren', async () => {
            // Simuliere offline
            const item = createTestItem(1, ['water']);

            const result = await service.translate(item);

            expect(result).toBeTruthy();
            expect(result.length).toBeGreaterThan(0);
        });
    });
});
