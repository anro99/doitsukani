/**
 * Tests für WaniKaniUploadService (TDD - Test First!)
 * 
 * Diese Tests definieren das Verhalten des WaniKani Upload Service
 * BEVOR wir ihn implementieren.
 * 
 * Status: FAILING (erwartet) - Implementation folgt in Phase 2
 * 
 * Der WaniKani Upload Service soll:
 * - Study Materials per API erstellen/aktualisieren
 * - Rate Limiting (1 Request/Sekunde) einhalten
 * - Retry-Logik bei Fehlern
 * - Batch-Operationen optimieren
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaniKaniUploadService } from '@/shared/processing/services/WaniKaniUploadService';

// ============================================================================
// Test Helpers & Mocks
// ============================================================================

/**
 * Mock WaniKani API Response für Study Material
 */
function mockStudyMaterialResponse(subjectId: number, synonyms: string[]): any {
    return {
        id: 1234567,
        object: 'study_material',
        data: {
            subject_id: subjectId,
            subject_type: 'vocabulary',
            meaning_synonyms: synonyms,
            created_at: new Date().toISOString(),
        },
    };
}

/**
 * Mock WaniKani API Collection Response
 */
function mockCollectionResponse(studyMaterials: any[]): any {
    return {
        object: 'collection',
        url: 'https://api.wanikani.com/v2/study_materials',
        pages: {
            next_url: null,
            previous_url: null,
            per_page: 500,
        },
        total_count: studyMaterials.length,
        data_updated_at: new Date().toISOString(),
        data: studyMaterials,
    };
}

// ============================================================================
// WaniKaniUploadService Tests
// ============================================================================

describe('WaniKaniUploadService', () => {
    let service: WaniKaniUploadService;
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockFetch = vi.fn();
        global.fetch = mockFetch;

        service = new WaniKaniUploadService('fake-api-token');
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // ==========================================================================
    // Basic Upload Tests
    // ==========================================================================

    describe('Basic Upload', () => {
        it('sollte Study Material erstellen wenn noch nicht vorhanden', async () => {
            const subjectId = 123;
            const synonyms = ['Wasser', 'H2O'];

            // Mock: GET returns no existing study material
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCollectionResponse([]),
            });

            // Mock: POST creates study material
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStudyMaterialResponse(subjectId, synonyms),
            });

            const result = await service.upload(subjectId, synonyms);

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(2); // GET + POST

            // Verify POST request
            const postCall = mockFetch.mock.calls[1];
            expect(postCall[0]).toContain('/study_materials');
            expect(postCall[1].method).toBe('POST');
        });

        it('sollte Study Material aktualisieren wenn bereits vorhanden', async () => {
            const subjectId = 123;
            const synonyms = ['Wasser', 'H2O'];
            const existingMaterial = mockStudyMaterialResponse(subjectId, ['old']);

            // Mock: GET returns existing study material
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCollectionResponse([existingMaterial]),
            });

            // Mock: PUT updates study material
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStudyMaterialResponse(subjectId, synonyms),
            });

            const result = await service.upload(subjectId, synonyms);

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(2); // GET + PUT

            // Verify PUT request
            const putCall = mockFetch.mock.calls[1];
            expect(putCall[0]).toContain('/study_materials/');
            expect(putCall[1].method).toBe('PUT');
        });

        it('sollte leere Synonym-Liste handhaben', async () => {
            const subjectId = 123;
            const synonyms: string[] = [];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCollectionResponse([]),
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockStudyMaterialResponse(subjectId, synonyms),
            });

            const result = await service.upload(subjectId, synonyms);

            expect(result).toBe(true);
        });

        it('sollte name-Property korrekt zurückgeben', () => {
            expect(service.name).toBe('WaniKani');
        });
    });

    // ==========================================================================
    // Rate Limiting Tests
    // ==========================================================================

    describe('Rate Limiting', () => {
        it('sollte 1 Request/Sekunde Rate Limit einhalten', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockCollectionResponse([]),
            }).mockResolvedValue({
                ok: true,
                json: async () => mockStudyMaterialResponse(1, []),
            });

            // Start zwei Uploads gleichzeitig
            const upload1Promise = service.upload(1, ['test1']);
            const upload2Promise = service.upload(2, ['test2']);

            // Warte auf ersten Upload
            await vi.advanceTimersByTimeAsync(100);

            // Erwartung: Erster Upload fertig, zweiter wartet
            const callsAfterFirst = mockFetch.mock.calls.length;
            expect(callsAfterFirst).toBeGreaterThan(0);

            // Warte weitere 900ms (insgesamt 1 Sekunde)
            await vi.advanceTimersByTimeAsync(900);

            // Erwartung: Zweiter Upload jetzt auch gestartet
            const callsAfterSecond = mockFetch.mock.calls.length;
            expect(callsAfterSecond).toBeGreaterThan(callsAfterFirst);

            await Promise.all([upload1Promise, upload2Promise]);
        });

        it('sollte bei Batch-Upload Rate Limit für jeden Request einhalten', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockCollectionResponse([]),
            }).mockResolvedValue({
                ok: true,
                json: async () => mockStudyMaterialResponse(1, []),
            });

            const batch = [
                { id: 1, synonyms: ['test1'] },
                { id: 2, synonyms: ['test2'] },
                { id: 3, synonyms: ['test3'] },
            ];

            const batchPromise = service.uploadBatch(batch);

            // Advance time für alle Requests
            await vi.advanceTimersByTimeAsync(3000);

            const results = await batchPromise;

            expect(results).toHaveLength(3);
            expect(results.every(r => r === true)).toBe(true);
        });

        it('sollte Rate Limit Status verfügbar machen', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockCollectionResponse([]),
            }).mockResolvedValue({
                ok: true,
                json: async () => mockStudyMaterialResponse(1, []),
            });

            const uploadPromise = service.upload(1, ['test']);

            const status = service.getRateLimitStatus();

            expect(status).toHaveProperty('requestsInLastSecond');
            expect(status).toHaveProperty('canMakeRequest');

            await vi.advanceTimersByTimeAsync(1000);
            await uploadPromise;
        });
    });

    // ==========================================================================
    // Error Handling & Retry Tests
    // ==========================================================================

    describe('Error Handling & Retry', () => {
        it('sollte bei 429 (Rate Limit) automatisch retries', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCollectionResponse([]),
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    headers: new Headers({ 'Retry-After': '1' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStudyMaterialResponse(1, ['test']),
                });

            const uploadPromise = service.upload(1, ['test']);

            // Warte auf Retry
            await vi.advanceTimersByTimeAsync(2000);

            const result = await uploadPromise;

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(3); // GET + POST (fail) + POST (success)
        });

        it('sollte bei Network-Fehler retries', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCollectionResponse([]),
                })
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStudyMaterialResponse(1, ['test']),
                });

            const uploadPromise = service.upload(1, ['test']);

            await vi.advanceTimersByTimeAsync(2000);

            const result = await uploadPromise;

            expect(result).toBe(true);
        });

        it('sollte nach max Retries aufgeben', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });

            const uploadPromise = service.upload(1, ['test']);

            // Advance time for rate limiting and retries
            await vi.advanceTimersByTimeAsync(10000);

            const result = await uploadPromise;

            expect(result).toBe(false);
            // Erwartung: 1 initial + maxRetries attempts
            expect(mockFetch.mock.calls.length).toBeGreaterThan(1);
        });

        it('sollte bei 401 (Unauthorized) nicht retries', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
            });

            const result = await service.upload(1, ['test']);

            expect(result).toBe(false);
            expect(mockFetch).toHaveBeenCalledTimes(1); // Keine Retries
        });

        it('sollte bei 404 (Not Found) nicht retries', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            });

            const result = await service.upload(1, ['test']);

            expect(result).toBe(false);
            expect(mockFetch).toHaveBeenCalledTimes(1);
        });
    });

    // ==========================================================================
    // API Integration Tests
    // ==========================================================================

    describe('API Integration', () => {
        it('sollte korrekte API-URL verwenden', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockCollectionResponse([]),
            });

            await service.upload(123, ['test']);

            const callUrl = mockFetch.mock.calls[0][0];
            expect(callUrl).toContain('api.wanikani.com/v2');
        });

        it('sollte API-Token im Header senden', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockCollectionResponse([]),
            });

            await service.upload(123, ['test']);

            const headers = mockFetch.mock.calls[0][1].headers;
            expect(headers.Authorization).toContain('Bearer');
            expect(headers.Authorization).toContain('fake-api-token');
        });

        it('sollte Content-Type application/json setzen', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCollectionResponse([]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStudyMaterialResponse(1, ['test']),
                });

            await service.upload(1, ['test']);

            const postCall = mockFetch.mock.calls[1];
            const headers = postCall[1].headers;
            expect(headers['Content-Type']).toBe('application/json');
        });

        it('sollte POST body korrekt formatieren', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCollectionResponse([]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStudyMaterialResponse(1, ['test']),
                });

            await service.upload(123, ['Wasser', 'H2O']);

            const postCall = mockFetch.mock.calls[1];
            const body = JSON.parse(postCall[1].body);

            expect(body.study_material.subject_id).toBe(123);
            expect(body.study_material.meaning_synonyms).toEqual(['Wasser', 'H2O']);
        });

        it('sollte PUT body korrekt formatieren', async () => {
            const existingMaterial = mockStudyMaterialResponse(123, ['old']);

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockCollectionResponse([existingMaterial]),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockStudyMaterialResponse(123, ['new']),
                });

            await service.upload(123, ['new']);

            const putCall = mockFetch.mock.calls[1];
            const body = JSON.parse(putCall[1].body);

            expect(body.study_material.meaning_synonyms).toEqual(['new']);
        });
    });

    // ==========================================================================
    // Batch Upload Tests
    // ==========================================================================

    describe('Batch Upload', () => {
        it('sollte Batch von Items sequenziell hochladen', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => mockCollectionResponse([]),
            }).mockResolvedValue({
                ok: true,
                json: async () => mockStudyMaterialResponse(1, []),
            });

            const batch = [
                { id: 1, synonyms: ['test1'] },
                { id: 2, synonyms: ['test2'] },
                { id: 3, synonyms: ['test3'] },
            ];

            const resultsPromise = service.uploadBatch(batch);

            await vi.advanceTimersByTimeAsync(5000);

            const results = await resultsPromise;

            expect(results).toHaveLength(3);
            expect(results.every((r: boolean) => r === true)).toBe(true);
        });

        it('sollte Batch teilweise erfolgreich sein bei Fehlern', async () => {
            mockFetch
                // Item 1: Success
                .mockResolvedValueOnce({ ok: true, json: async () => mockCollectionResponse([]) })
                .mockResolvedValueOnce({ ok: true, json: async () => mockStudyMaterialResponse(1, []) })
                // Item 2: Fail (with retries)
                .mockResolvedValueOnce({ ok: true, json: async () => mockCollectionResponse([]) })
                .mockResolvedValueOnce({ ok: false, status: 500 }) // First attempt
                .mockResolvedValueOnce({ ok: false, status: 500 }) // Retry 1
                .mockResolvedValueOnce({ ok: false, status: 500 }) // Retry 2
                .mockResolvedValueOnce({ ok: false, status: 500 }) // Retry 3 (max retries)
                // Item 3: Success
                .mockResolvedValueOnce({ ok: true, json: async () => mockCollectionResponse([]) })
                .mockResolvedValueOnce({ ok: true, json: async () => mockStudyMaterialResponse(3, []) });

            const batch = [
                { id: 1, synonyms: ['test1'] },
                { id: 2, synonyms: ['test2'] },
                { id: 3, synonyms: ['test3'] },
            ];

            const resultsPromise = service.uploadBatch(batch);

            await vi.advanceTimersByTimeAsync(20000); // More time for retries

            const results = await resultsPromise;

            expect(results).toHaveLength(3);
            expect(results[0]).toBe(true);
            expect(results[1]).toBe(false);
            expect(results[2]).toBe(true);
        });
    });

    // ==========================================================================
    // Availability Tests
    // ==========================================================================

    describe('Availability', () => {
        it('sollte isAvailable() true zurückgeben wenn API-Token gesetzt', () => {
            const serviceWithToken = new WaniKaniUploadService('valid-token');
            expect(serviceWithToken.isAvailable()).toBe(true);
        });

        it('sollte isAvailable() false zurückgeben wenn kein API-Token', () => {
            const serviceWithoutToken = new WaniKaniUploadService('');
            expect(serviceWithoutToken.isAvailable()).toBe(false);
        });
    });
});
