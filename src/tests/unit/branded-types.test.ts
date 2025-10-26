import { describe, it, expect } from 'vitest';
import {
    createVocabularyId,
    createKanjiId,
    createRadicalId,
    unwrapId,
    toVocabularyIds,
    toKanjiIds,
    toRadicalIds,
    isValidId,
    assertValidId,
    type VocabularyId,
    type KanjiId,
} from '../../shared/types/branded-types';

describe('Branded Types', () => {
    describe('ID Factory Functions', () => {
        it('sollte VocabularyId erstellen', () => {
            const id = createVocabularyId(123);
            expect(unwrapId(id)).toBe(123);
        });

        it('sollte KanjiId erstellen', () => {
            const id = createKanjiId(456);
            expect(unwrapId(id)).toBe(456);
        });

        it('sollte RadicalId erstellen', () => {
            const id = createRadicalId(789);
            expect(unwrapId(id)).toBe(789);
        });
    });

    describe('Type Safety', () => {
        it('sollte Vocabulary und Kanji IDs nicht verwechselbar machen', () => {
            const vocabId: VocabularyId = createVocabularyId(123);
            const kanjiId: KanjiId = createKanjiId(123);

            // TypeScript verhindert dies zur Compile-Zeit:
            // const test: VocabularyId = kanjiId; // ❌ Compile Error

            // Zur Laufzeit sind sie aber gleich (da nur Type-Level Unterschied)
            expect(unwrapId(vocabId)).toBe(unwrapId(kanjiId));
        });

        it('sollte verschiedene ID-Typen unterscheiden', () => {
            function acceptVocabularyId(id: VocabularyId): number {
                return unwrapId(id);
            }

            const vocabId = createVocabularyId(123);
            expect(acceptVocabularyId(vocabId)).toBe(123);

            // TypeScript verhindert dies:
            // const kanjiId = createKanjiId(456);
            // acceptVocabularyId(kanjiId); // ❌ Compile Error
        });
    });

    describe('Array Conversions', () => {
        it('sollte Array von numbers zu VocabularyIds konvertieren', () => {
            const numbers = [1, 2, 3, 4, 5];
            const ids = toVocabularyIds(numbers);

            expect(ids.length).toBe(5);
            expect(unwrapId(ids[0])).toBe(1);
            expect(unwrapId(ids[4])).toBe(5);
        });

        it('sollte Array von numbers zu KanjiIds konvertieren', () => {
            const numbers = [10, 20, 30];
            const ids = toKanjiIds(numbers);

            expect(ids.length).toBe(3);
            expect(unwrapId(ids[0])).toBe(10);
            expect(unwrapId(ids[2])).toBe(30);
        });

        it('sollte Array von numbers zu RadicalIds konvertieren', () => {
            const numbers = [100, 200];
            const ids = toRadicalIds(numbers);

            expect(ids.length).toBe(2);
            expect(unwrapId(ids[0])).toBe(100);
            expect(unwrapId(ids[1])).toBe(200);
        });

        it('sollte leere Arrays handhaben', () => {
            expect(toVocabularyIds([])).toEqual([]);
            expect(toKanjiIds([])).toEqual([]);
            expect(toRadicalIds([])).toEqual([]);
        });
    });

    describe('unwrapId', () => {
        it('sollte Branded ID zu number zurück konvertieren', () => {
            const vocabId = createVocabularyId(123);
            const kanjiId = createKanjiId(456);
            const radicalId = createRadicalId(789);

            expect(unwrapId(vocabId)).toBe(123);
            expect(unwrapId(kanjiId)).toBe(456);
            expect(unwrapId(radicalId)).toBe(789);
        });

        it('sollte mit allen ID-Typen funktionieren', () => {
            const ids = [
                createVocabularyId(1),
                createKanjiId(2),
                createRadicalId(3),
            ];

            const unwrapped = ids.map(unwrapId);
            expect(unwrapped).toEqual([1, 2, 3]);
        });
    });

    describe('ID Validation', () => {
        describe('isValidId', () => {
            it('sollte gültige IDs erkennen', () => {
                expect(isValidId(1)).toBe(true);
                expect(isValidId(123)).toBe(true);
                expect(isValidId(999999)).toBe(true);
            });

            it('sollte ungültige IDs ablehnen', () => {
                expect(isValidId(0)).toBe(false);
                expect(isValidId(-1)).toBe(false);
                expect(isValidId(1.5)).toBe(false);
                expect(isValidId('123')).toBe(false);
                expect(isValidId(null)).toBe(false);
                expect(isValidId(undefined)).toBe(false);
                expect(isValidId(NaN)).toBe(false);
                expect(isValidId(Infinity)).toBe(false);
            });
        });

        describe('assertValidId', () => {
            it('sollte bei gültiger ID nicht werfen', () => {
                expect(() => assertValidId(1, 'test')).not.toThrow();
                expect(() => assertValidId(123, 'test')).not.toThrow();
            });

            it('sollte bei ungültiger ID werfen', () => {
                expect(() => assertValidId(0, 'test')).toThrow(TypeError);
                expect(() => assertValidId(-1, 'test')).toThrow(TypeError);
                expect(() => assertValidId(1.5, 'test')).toThrow(TypeError);
                expect(() => assertValidId('123', 'test')).toThrow(TypeError);
                expect(() => assertValidId(null, 'test')).toThrow(TypeError);
            });

            it('sollte Kontext in Fehlermeldung enthalten', () => {
                expect(() => assertValidId(null, 'VocabularyService')).toThrow(/VocabularyService/);
            });
        });
    });

    describe('Real-World Usage', () => {
        // Simuliere API-Funktionen mit Type Safety
        function fetchVocabulary(id: VocabularyId): { id: VocabularyId; text: string } {
            return { id, text: `Vocabulary ${unwrapId(id)}` };
        }

        function fetchKanji(id: KanjiId): { id: KanjiId; text: string } {
            return { id, text: `Kanji ${unwrapId(id)}` };
        }

        it('sollte in realen Szenarien Type-Safety bieten', () => {
            const vocabId = createVocabularyId(123);
            const kanjiId = createKanjiId(456);

            const vocab = fetchVocabulary(vocabId);
            const kanji = fetchKanji(kanjiId);

            expect(vocab.text).toBe('Vocabulary 123');
            expect(kanji.text).toBe('Kanji 456');

            // TypeScript verhindert:
            // fetchVocabulary(kanjiId); // ❌ Compile Error
            // fetchKanji(vocabId); // ❌ Compile Error
        });

        it('sollte API-Responses sicher verarbeiten', () => {
            // Simuliere API Response mit raw numbers
            const apiResponse = {
                vocabulary_ids: [1, 2, 3],
                kanji_ids: [10, 20, 30],
            };

            // Konvertiere zu Branded Types
            const vocabIds = toVocabularyIds(apiResponse.vocabulary_ids);
            const kanjiIds = toKanjiIds(apiResponse.kanji_ids);

            // Jetzt Type-Safe
            vocabIds.forEach(id => {
                const vocab = fetchVocabulary(id);
                expect(vocab).toBeDefined();
            });

            kanjiIds.forEach(id => {
                const kanji = fetchKanji(id);
                expect(kanji).toBeDefined();
            });
        });
    });
});
