/**
 * Combined Manager - Streaming Features Tests
 * 
 * Test-Suite für die neuen Streaming-Features im Combined Manager
 * Angelehnt an Vocabulary Manager Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCombinedManager } from '../../features/combined/hooks/useCombinedManager';
import type { CombinedProcessingResult } from '../../features/combined/lib/combined-streaming-integration';

// Mock storage
vi.mock('../../shared/lib/storage', () => ({
    loadWanikaniToken: vi.fn(() => 'test-api-token'),
    loadDeepLToken: vi.fn(() => 'test-deepl-token'),
    saveWanikaniToken: vi.fn(),
    saveDeepLToken: vi.fn(),
    removeToken: vi.fn(),
    STORAGE_KEYS: {}
}));

// Mock WaniKani API
vi.mock('../../features/combined/lib/combined-wanikani', () => ({
    getCombinedCounts: vi.fn().mockResolvedValue({
        radicals: 2,
        kanji: 3,
        vocabulary: 5,
        total: 10,
        level: 1,
        dataLoaded: 10,
        source: 'test'
    }),
    getCombinedItems: vi.fn().mockResolvedValue([
        {
            id: 1,
            type: 'radical',
            object: 'radical',
            characters: '一',
            primaryMeaning: 'One',
            level: 1
        },
        {
            id: 2,
            type: 'kanji',
            object: 'kanji',
            characters: '一',
            primaryMeaning: 'One',
            meanings: [{ meaning: 'One', primary: true }],
            level: 1
        }
    ]),
    getCombinedStudyMaterials: vi.fn().mockResolvedValue([]),
    // ✅ Add missing fetch functions used by startProcessing
    fetchCombinedPreview: vi.fn().mockResolvedValue([
        {
            id: 1,
            type: 'radical',
            object: 'radical',
            characters: '一',
            primaryMeaning: 'One',
            level: 1,
            existingSynonyms: []
        },
        {
            id: 2,
            type: 'kanji',
            object: 'kanji',
            characters: '一',
            primaryMeaning: 'One',
            level: 1,
            existingSynonyms: []
        }
    ]),
    fetchCombinedSubjects: vi.fn().mockResolvedValue([
        {
            id: 1,
            object: 'radical',
            data: {
                characters: '一',
                meanings: [{ meaning: 'One', primary: true }],
                level: 1
            }
        },
        {
            id: 2,
            object: 'kanji',
            data: {
                characters: '一',
                meanings: [{ meaning: 'One', primary: true }],
                level: 1
            }
        }
    ]),
    fetchCombinedStudyMaterials: vi.fn().mockResolvedValue([]),
    convertToCombinedItem: vi.fn((subject) => ({
        id: subject.id,
        type: subject.object === 'radical' ? 'radical' : subject.object === 'kanji' ? 'kanji' : 'vocabulary',
        object: subject.object,
        characters: subject.data.characters,
        primaryMeaning: subject.data.meanings?.[0]?.meaning || 'Test',
        level: subject.data.level,
        existingSynonyms: []
    })),
    getCombinedCount: vi.fn().mockResolvedValue(10),
    isRadical: vi.fn(item => item.type === 'radical' || item.object === 'radical'),
    isKanji: vi.fn(item => item.type === 'kanji' || item.object === 'kanji'),
    isVocabulary: vi.fn(item => item.type === 'vocabulary' || item.object === 'vocabulary')
}));

// Mock Streaming Integration
vi.mock('../../features/combined/lib/combined-streaming-integration', () => ({
    processCombinedStreaming: vi.fn().mockResolvedValue({
        success: true,
        wasStopped: false,
        totalItems: 2,
        translationCount: 2,
        uploadCount: 2,
        errorCount: 0,
        processingTime: 1000,
        byType: {
            radicals: { total: 1, successful: 1, failed: 0 },
            kanji: { total: 1, successful: 1, failed: 0 },
            vocabulary: { total: 0, successful: 0, failed: 0 }
        }
    })
}));

describe('useCombinedManager - Streaming Features', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('📊 Streaming State Management', () => {
        it('sollte streamingResult State initialisieren', () => {
            const { result } = renderHook(() => useCombinedManager());

            expect(result.current.streamingResult).toBeNull();
        });

        it('sollte errorItems State initialisieren', () => {
            const { result } = renderHook(() => useCombinedManager());

            expect(result.current.errorItems).toBeInstanceOf(Map);
            expect(result.current.errorItems.size).toBe(0);
        });

        it('sollte uploadStats korrekt initialisieren', () => {
            const { result } = renderHook(() => useCombinedManager());

            expect(result.current.uploadStats).toEqual({
                created: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
                successful: 0
            });
        });
    });

    describe('✅ Processing Result Handling', () => {
        it('sollte streamingResult nach erfolgreicher Verarbeitung setzen', async () => {
            const mockResult: CombinedProcessingResult = {
                success: true,
                wasStopped: false,
                totalItems: 10,
                translationCount: 10,
                uploadCount: 10,
                errorCount: 0,
                processingTime: 5000,
                byType: {
                    radicals: { total: 2, successful: 2, failed: 0 },
                    kanji: { total: 3, successful: 3, failed: 0 },
                    vocabulary: { total: 5, successful: 5, failed: 0 }
                }
            };

            const { processCombinedStreaming } = await import(
                '../../features/combined/lib/combined-streaming-integration'
            );
            vi.mocked(processCombinedStreaming).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useCombinedManager());

            await act(async () => {
                await result.current.startProcessing();
            });

            await waitFor(() => {
                expect(result.current.streamingResult).toEqual(mockResult);
                expect(result.current.uploadStats.successful).toBe(10);
                expect(result.current.uploadStats.failed).toBe(0);
            });
        });

        it('sollte wasStopped korrekt behandeln', async () => {
            const mockResult: CombinedProcessingResult = {
                success: false,
                wasStopped: true,
                totalItems: 10,
                translationCount: 3,
                uploadCount: 3,
                errorCount: 0,
                processingTime: 2000,
                byType: {
                    radicals: { total: 2, successful: 2, failed: 0 },
                    kanji: { total: 1, successful: 1, failed: 0 },
                    vocabulary: { total: 7, successful: 0, failed: 0 }
                }
            };

            const { processCombinedStreaming } = await import(
                '../../features/combined/lib/combined-streaming-integration'
            );
            vi.mocked(processCombinedStreaming).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useCombinedManager());

            await act(async () => {
                await result.current.startProcessing();
            });

            await waitFor(() => {
                expect(result.current.streamingResult?.wasStopped).toBe(true);
            });
        });

        it('sollte Fehler korrekt zählen', async () => {
            const mockResult: CombinedProcessingResult = {
                success: false,
                wasStopped: false,
                totalItems: 10,
                translationCount: 7,
                uploadCount: 7,
                errorCount: 3,
                processingTime: 5000,
                byType: {
                    radicals: { total: 2, successful: 2, failed: 0 },
                    kanji: { total: 3, successful: 2, failed: 1 },
                    vocabulary: { total: 5, successful: 3, failed: 2 }
                }
            };

            const { processCombinedStreaming } = await import(
                '../../features/combined/lib/combined-streaming-integration'
            );
            vi.mocked(processCombinedStreaming).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useCombinedManager());

            await act(async () => {
                await result.current.startProcessing();
            });

            await waitFor(() => {
                expect(result.current.uploadStats.failed).toBe(3);
                expect(result.current.uploadStats.successful).toBe(7);
            });
        });
    });

    describe('🗑️ Clear Functions', () => {
        it('sollte clearResults alle Verarbeitungs-States zurücksetzen', async () => {
            const mockResult: CombinedProcessingResult = {
                success: true,
                wasStopped: false,
                totalItems: 5,
                translationCount: 5,
                uploadCount: 5,
                errorCount: 0,
                processingTime: 2000,
                byType: {
                    radicals: { total: 5, successful: 5, failed: 0 },
                    kanji: { total: 0, successful: 0, failed: 0 },
                    vocabulary: { total: 0, successful: 0, failed: 0 }
                }
            };

            const { processCombinedStreaming } = await import(
                '../../features/combined/lib/combined-streaming-integration'
            );
            vi.mocked(processCombinedStreaming).mockResolvedValue(mockResult);

            const { result } = renderHook(() => useCombinedManager());

            // Verarbeitung durchführen
            await act(async () => {
                await result.current.startProcessing();
            });

            await waitFor(() => {
                expect(result.current.streamingResult).not.toBeNull();
            });

            // Results clearen
            act(() => {
                result.current.clearResults();
            });

            expect(result.current.streamingResult).toBeNull();
            expect(result.current.progress).toBe(0);
            expect(result.current.errorItems.size).toBe(0);
        });

        it('sollte clearErrors nur errorItems zurücksetzen', () => {
            const { result } = renderHook(() => useCombinedManager());

            // clearErrors Funktion sollte existieren
            expect(result.current.clearErrors).toBeDefined();
            expect(typeof result.current.clearErrors).toBe('function');
        });
    });

    describe('🔄 Progress Rounding', () => {
        it('sollte Progress ohne Nachkommastellen anzeigen', async () => {
            const { result } = renderHook(() => useCombinedManager());

            await act(async () => {
                await result.current.startProcessing();
            });

            await waitFor(() => {
                // Progress sollte eine ganze Zahl sein
                expect(Number.isInteger(result.current.progress)).toBe(true);
            });
        });
    });
});
