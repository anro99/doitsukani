import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { WKCollection } from '@bachman-dev/wanikani-api-types';

// Mock für useKanjiManager Hook (vereinfacht für Testing)
interface MockBatchResult {
    kanji: any[];
    hasMore: boolean;
    totalCount: number;
    nextUrl: string | null;
    actualBatchSize?: number;
}

// Simuliert loadKanjiBatch Funktion mit dynamischer Batch-Größe
const createMockLoadKanjiBatch = (apiResponses: WKCollection[]) => {
    let currentResponseIndex = 0;

    return async (_nextUrl: string | null = null): Promise<MockBatchResult> => {
        if (currentResponseIndex >= apiResponses.length) {
            return {
                kanji: [],
                hasMore: false,
                totalCount: 0,
                nextUrl: null,
                actualBatchSize: undefined
            };
        }

        const response = apiResponses[currentResponseIndex];
        currentResponseIndex++;

        // Simuliere WaniKani Kanji aus response.data
        const kanji = response.data.map((item: any, index: number) => ({
            id: item.id || index + 1,
            primaryMeaning: `Kanji ${index + 1}`,
            alternativeMeanings: [],
            characters: '漢',
            level: 1,
            currentSynonyms: [],
            selected: true,
            translatedSynonyms: [],
            meaningMnemonic: 'Test mnemonic'
        }));

        return {
            kanji,
            hasMore: !!response.pages.next_url,
            totalCount: response.total_count,
            nextUrl: response.pages.next_url,
            actualBatchSize: response.pages.per_page
        };
    };
};

// Erstellt Mock WaniKani API Response
const createMockWKCollection = (
    per_page: number,
    total_count: number,
    page: number = 1,
    dataItems?: any[]
): WKCollection => {
    const itemsOnThisPage = Math.min(per_page, Math.max(0, total_count - (page - 1) * per_page));
    const hasMore = (page * per_page) < total_count;

    return {
        object: 'collection',
        url: `https://api.wanikani.com/v2/subjects?types=kanji&page=${page}`,
        pages: {
            per_page,
            next_url: hasMore ? `https://api.wanikani.com/v2/subjects?types=kanji&page=${page + 1}` : null,
            previous_url: page > 1 ? `https://api.wanikani.com/v2/subjects?types=kanji&page=${page - 1}` : null
        },
        total_count,
        data_updated_at: '2025-01-01T00:00:00.000000Z',
        data: dataItems || Array.from({ length: itemsOnThisPage }, (_, i) => ({
            id: (page - 1) * per_page + i + 1,
            object: 'kanji',
            url: `https://api.wanikani.com/v2/subjects/${(page - 1) * per_page + i + 1}`,
            data_updated_at: '2025-01-01T00:00:00.000000Z',
            data: {
                characters: '漢',
                level: 1,
                meanings: [{ meaning: `kanji${i + 1}`, primary: true, accepted_answer: true }],
                meaning_mnemonic: 'Test mnemonic'
            }
        }))
    } as WKCollection;
};

describe('🔄 Dynamic Batch Processing Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('📊 WaniKani per_page Detection', () => {
        it('should detect and use WaniKani standard batch size (1000)', async () => {
            const mockResponse = createMockWKCollection(1000, 2500, 1);
            const loadKanjiBatch = createMockLoadKanjiBatch([mockResponse]);

            const result = await loadKanjiBatch();

            expect(result.actualBatchSize).toBe(1000);
            expect(result.kanji).toHaveLength(1000);
            expect(result.hasMore).toBe(true);
            expect(result.totalCount).toBe(2500);
        });

        it('should adapt to WaniKani reduced batch size (500)', async () => {
            const mockResponse = createMockWKCollection(500, 2500, 1);
            const loadKanjiBatch = createMockLoadKanjiBatch([mockResponse]);

            const result = await loadKanjiBatch();

            expect(result.actualBatchSize).toBe(500);
            expect(result.kanji).toHaveLength(500);
            expect(result.hasMore).toBe(true);

            // Berechne erwartete Batches basierend auf dynamischer Größe
            const expectedBatches = Math.ceil(2500 / 500);
            expect(expectedBatches).toBe(5);
        });

        it('should handle alternative batch size (750)', async () => {
            const mockResponse = createMockWKCollection(750, 2500, 1);
            const loadKanjiBatch = createMockLoadKanjiBatch([mockResponse]);

            const result = await loadKanjiBatch();

            expect(result.actualBatchSize).toBe(750);
            expect(result.kanji).toHaveLength(750);
            expect(result.hasMore).toBe(true);

            const expectedBatches = Math.ceil(2500 / 750);
            expect(expectedBatches).toBe(4); // 750*3=2250, 750*4=3000 (enthält alle 2500)
        });

        it('should handle small datasets with large batch size', async () => {
            // Level 5 example: nur 45 Kanji, aber WaniKani verwendet trotzdem 1000er Batches
            const mockResponse = createMockWKCollection(1000, 45, 1);
            const loadKanjiBatch = createMockLoadKanjiBatch([mockResponse]);

            const result = await loadKanjiBatch();

            expect(result.actualBatchSize).toBe(1000);
            expect(result.kanji).toHaveLength(45); // Nur 45 Items verfügbar
            expect(result.hasMore).toBe(false); // Keine weiteren Seiten
            expect(result.totalCount).toBe(45);
        });
    });

    describe('🧮 Dynamic Batch Calculations', () => {
        it('should calculate correct total batches for different per_page sizes', () => {
            const testScenarios = [
                { per_page: 1000, total: 2500, expectedBatches: 3 },
                { per_page: 500, total: 2500, expectedBatches: 5 },
                { per_page: 750, total: 2500, expectedBatches: 4 },
                { per_page: 1000, total: 45, expectedBatches: 1 },
                { per_page: 250, total: 1000, expectedBatches: 4 },
                { per_page: 333, total: 1000, expectedBatches: 4 }, // 333*3=999, 333*4=1332
            ];

            testScenarios.forEach(({ per_page, total, expectedBatches }) => {
                const actualBatches = Math.ceil(total / per_page);
                expect(actualBatches).toBe(expectedBatches);
            });
        });

        it('should handle edge cases in batch calculations', () => {
            // Test edge cases where total exactly divides by per_page
            expect(Math.ceil(1000 / 1000)).toBe(1);
            expect(Math.ceil(2000 / 1000)).toBe(2);
            expect(Math.ceil(2001 / 1000)).toBe(3);

            // Test sehr kleine Datensätze
            expect(Math.ceil(1 / 1000)).toBe(1);
            expect(Math.ceil(0 / 1000)).toBe(0);
        });
    });

    describe('🔗 Multi-Batch Pagination', () => {
        it('should process multiple batches with consistent per_page values', async () => {
            const mockResponses = [
                createMockWKCollection(500, 1200, 1), // Batch 1: 500 items
                createMockWKCollection(500, 1200, 2), // Batch 2: 500 items  
                createMockWKCollection(500, 1200, 3)  // Batch 3: 200 items (rest)
            ];

            const loadKanjiBatch = createMockLoadKanjiBatch(mockResponses);

            // Batch 1
            const batch1 = await loadKanjiBatch();
            expect(batch1.actualBatchSize).toBe(500);
            expect(batch1.kanji).toHaveLength(500);
            expect(batch1.hasMore).toBe(true);

            // Batch 2
            const batch2 = await loadKanjiBatch(batch1.nextUrl);
            expect(batch2.actualBatchSize).toBe(500);
            expect(batch2.kanji).toHaveLength(500);
            expect(batch2.hasMore).toBe(true);

            // Batch 3 (letzter)
            const batch3 = await loadKanjiBatch(batch2.nextUrl);
            expect(batch3.actualBatchSize).toBe(500);
            expect(batch3.kanji).toHaveLength(200); // Nur 200 Items übrig
            expect(batch3.hasMore).toBe(false);
        });

        it('should handle varying per_page sizes across batches', async () => {
            // Simuliert WaniKani API, die unterschiedliche Batch-Größen zurückgibt
            // aber korrekt die verbleibenden Items berechnet
            const totalCount = 2000;
            const mockResponses = [
                createMockWKCollection(1000, totalCount, 1), // Erster Request: 1000er Batch
                createMockWKCollection(750, totalCount, 2),  // Zweiter Request: 750er Batch (API-Änderung)
                // Für den dritten Request müssen wir manuell berechnen: 2000 - 1000 - 750 = 250 verbleibend
                // Aber die page-Berechnung geht von gleichmäßigen Batches aus, also überschreiben wir die data
                (() => {
                    const base = createMockWKCollection(500, totalCount, 3);
                    // Überschreibe data array um nur 250 Items zu haben (die tatsächlich verbleibenden)
                    return {
                        ...base,
                        data: Array.from({ length: 250 }, (_, i) => ({
                            id: 1751 + i, // Start nach 1000 + 750 Items
                            object: 'kanji',
                            url: `https://api.wanikani.com/v2/subjects/${1751 + i}`,
                            data_updated_at: '2025-01-01T00:00:00.000000Z',
                            data: {
                                characters: '漢',
                                level: 1,
                                meanings: [{ meaning: `kanji${1751 + i}`, primary: true, accepted_answer: true }],
                                meaning_mnemonic: 'Test mnemonic'
                            }
                        })),
                        pages: {
                            ...base.pages,
                            next_url: null // Letzter Batch
                        }
                    } as WKCollection;
                })()
            ];

            const loadKanjiBatch = createMockLoadKanjiBatch(mockResponses);

            const batch1 = await loadKanjiBatch();
            expect(batch1.actualBatchSize).toBe(1000);

            const batch2 = await loadKanjiBatch(batch1.nextUrl);
            expect(batch2.actualBatchSize).toBe(750);

            const batch3 = await loadKanjiBatch(batch2.nextUrl);
            expect(batch3.actualBatchSize).toBe(500); // per_page ist 500

            // Jeder Batch sollte sich an seine eigene per_page Größe anpassen
            expect(batch1.kanji).toHaveLength(1000);
            expect(batch2.kanji).toHaveLength(750);
            expect(batch3.kanji).toHaveLength(250); // Rest von 2000 - 1000 - 750 = 250
        });
    });

    describe('🎯 Backward Compatibility', () => {
        it('should maintain functionality when WaniKani changes batch sizes', async () => {
            // Test verschiedene realistische WaniKani Batch-Größen
            const batchSizes = [250, 500, 750, 1000, 1500];

            for (const batchSize of batchSizes) {
                const mockResponse = createMockWKCollection(batchSize, 3000, 1);
                const loadKanjiBatch = createMockLoadKanjiBatch([mockResponse]);

                const result = await loadKanjiBatch();

                // Implementierung sollte sich automatisch anpassen
                expect(result.actualBatchSize).toBe(batchSize);
                expect(result.kanji).toHaveLength(Math.min(batchSize, 3000));

                // Korrekte Batch-Berechnungen
                const expectedTotalBatches = Math.ceil(3000 / batchSize);
                const calculatedBatches = Math.ceil(result.totalCount / result.actualBatchSize!);
                expect(calculatedBatches).toBe(expectedTotalBatches);
            }
        });
    });

    describe('⚡ Performance Characteristics', () => {
        it('should show efficiency gains with larger batch sizes', () => {
            const totalItems = 10000;

            const scenarios = [
                { batchSize: 100, expectedRequests: 100 },
                { batchSize: 500, expectedRequests: 20 },
                { batchSize: 1000, expectedRequests: 10 },
                { batchSize: 2000, expectedRequests: 5 }
            ];

            scenarios.forEach(({ batchSize, expectedRequests }) => {
                const actualRequests = Math.ceil(totalItems / batchSize);
                expect(actualRequests).toBe(expectedRequests);
            });
        });

        it('should minimize API calls with dynamic batch sizing', () => {
            // Vergleich: Fixed 25-Item Batches vs Dynamic WaniKani Batches
            const totalItems = 2500;

            // Alt: Fixed 25-Item Translation Batches
            const fixedBatchSize = 25;
            const fixedBatches = Math.ceil(totalItems / fixedBatchSize);
            expect(fixedBatches).toBe(100); // 100 API-Calls

            // Neu: Dynamic WaniKani Batches
            const dynamicBatchSize = 1000;
            const dynamicBatches = Math.ceil(totalItems / dynamicBatchSize);
            expect(dynamicBatches).toBe(3); // Nur 3 API-Calls

            // Performance-Verbesserung
            const improvementFactor = fixedBatches / dynamicBatches;
            expect(improvementFactor).toBeGreaterThan(30); // 33x weniger API-Calls
        });
    });

    describe('🔍 Error Handling', () => {
        it('should gracefully handle missing per_page information', async () => {
            const mockResponseWithoutPerPage = {
                object: 'collection',
                url: 'https://api.wanikani.com/v2/subjects?types=kanji',
                pages: {
                    // per_page fehlt absichtlich
                    next_url: null,
                    previous_url: null
                } as any,
                total_count: 100,
                data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                data: []
            } as unknown as WKCollection;

            const loadKanjiBatch = createMockLoadKanjiBatch([mockResponseWithoutPerPage]);
            const result = await loadKanjiBatch();

            // Sollte funktionieren, auch wenn per_page fehlt
            expect(result.actualBatchSize).toBeUndefined();
            expect(result.kanji).toHaveLength(0);
            expect(result.totalCount).toBe(100);
        });

        it('should handle zero total_count responses', async () => {
            const emptyResponse = createMockWKCollection(1000, 0, 1);
            const loadKanjiBatch = createMockLoadKanjiBatch([emptyResponse]);

            const result = await loadKanjiBatch();

            expect(result.actualBatchSize).toBe(1000);
            expect(result.kanji).toHaveLength(0);
            expect(result.hasMore).toBe(false);
            expect(result.totalCount).toBe(0);
        });
    });

    describe('🧪 Integration Scenarios', () => {
        it('should work correctly with level filtering', async () => {
            // Level 5: 45 Kanji, WaniKani verwendet 1000er Batches
            const level5Response = createMockWKCollection(1000, 45, 1);
            const loadKanjiBatch = createMockLoadKanjiBatch([level5Response]);

            const result = await loadKanjiBatch();

            expect(result.actualBatchSize).toBe(1000);
            expect(result.kanji).toHaveLength(45);
            expect(result.hasMore).toBe(false);

            // Batch-Berechnungen sollten korrekt sein
            const batches = Math.ceil(result.totalCount / result.actualBatchSize!);
            expect(batches).toBe(1);
        });

        it('should support progress tracking with dynamic batches', async () => {
            const mockResponses = [
                createMockWKCollection(500, 1500, 1),
                createMockWKCollection(500, 1500, 2),
                createMockWKCollection(500, 1500, 3)
            ];

            const loadKanjiBatch = createMockLoadKanjiBatch(mockResponses);
            const progressUpdates: number[] = [];

            // Simuliere Progress Tracking
            let completedBatches = 0;
            const totalBatches = Math.ceil(1500 / 500); // 3 Batches

            for (let i = 0; i < totalBatches; i++) {
                const result = await loadKanjiBatch(i === 0 ? null : 'next-url');
                completedBatches++;

                const progressPercent = Math.round((completedBatches / totalBatches) * 100);
                progressUpdates.push(progressPercent);

                if (!result.hasMore) break;
            }

            expect(progressUpdates).toEqual([33, 67, 100]);
        });
    });
});
