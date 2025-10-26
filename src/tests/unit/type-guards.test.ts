import { describe, it, expect } from 'vitest';
import {
    isObject,
    isArray,
    hasProperty,
    isWaniKaniResponse,
    isWaniKaniSubject,
    isVocabularySubject,
    isKanjiSubject,
    isRadicalSubject,
    isDeepLResponse,
    isAxiosError,
    assertWaniKaniResponse,
    assertDeepLResponse,
} from '../../shared/types/type-guards';

describe('Type Guards - Basic Utilities', () => {
    describe('isObject', () => {
        it('sollte true für Objekte zurückgeben', () => {
            expect(isObject({})).toBe(true);
            expect(isObject({ a: 1 })).toBe(true);
        });

        it('sollte false für Nicht-Objekte zurückgeben', () => {
            expect(isObject(null)).toBe(false);
            expect(isObject([])).toBe(false);
            expect(isObject('string')).toBe(false);
            expect(isObject(123)).toBe(false);
            expect(isObject(undefined)).toBe(false);
        });
    });

    describe('isArray', () => {
        it('sollte true für Arrays zurückgeben', () => {
            expect(isArray([])).toBe(true);
            expect(isArray([1, 2, 3])).toBe(true);
        });

        it('sollte false für Nicht-Arrays zurückgeben', () => {
            expect(isArray({})).toBe(false);
            expect(isArray('string')).toBe(false);
            expect(isArray(null)).toBe(false);
        });
    });

    describe('hasProperty', () => {
        it('sollte true für vorhandene Properties zurückgeben', () => {
            const obj = { name: 'test', value: 42 };
            expect(hasProperty(obj, 'name')).toBe(true);
            expect(hasProperty(obj, 'value')).toBe(true);
        });

        it('sollte false für fehlende Properties zurückgeben', () => {
            const obj = { name: 'test' };
            expect(hasProperty(obj, 'missing')).toBe(false);
        });
    });
});

describe('Type Guards - WaniKani API', () => {
    describe('isWaniKaniResponse', () => {
        it('sollte gültige WaniKani Response erkennen', () => {
            const response = {
                object: 'collection',
                url: 'https://api.wanikani.com/v2/subjects',
                data: [],
                data_updated_at: '2023-01-01T00:00:00.000000Z',
            };

            expect(isWaniKaniResponse(response)).toBe(true);
        });

        it('sollte ungültige Response ablehnen', () => {
            expect(isWaniKaniResponse(null)).toBe(false);
            expect(isWaniKaniResponse({})).toBe(false);
            expect(isWaniKaniResponse({ object: 'test' })).toBe(false);
            expect(isWaniKaniResponse({ object: 'test', url: 'test' })).toBe(false);
        });
    });

    describe('isWaniKaniSubject', () => {
        it('sollte gültiges Subject erkennen', () => {
            const subject = {
                id: 123,
                object: 'vocabulary',
                url: 'https://api.wanikani.com/v2/subjects/123',
                data_updated_at: '2023-01-01T00:00:00.000000Z',
                data: {
                    level: 5,
                    created_at: '2023-01-01T00:00:00.000000Z',
                    slug: 'test',
                    hidden_at: null,
                    document_url: 'https://example.com',
                    characters: 'テスト',
                    meanings: [
                        { meaning: 'test', primary: true, accepted_answer: true }
                    ],
                },
            };

            expect(isWaniKaniSubject(subject)).toBe(true);
        });

        it('sollte ungültiges Subject ablehnen', () => {
            expect(isWaniKaniSubject(null)).toBe(false);
            expect(isWaniKaniSubject({})).toBe(false);
            expect(isWaniKaniSubject({ id: 123 })).toBe(false);
        });
    });

    describe('Subject Type Guards', () => {
        const baseSubject = {
            id: 123,
            object: 'vocabulary',
            url: 'https://api.wanikani.com/v2/subjects/123',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                level: 5,
                created_at: '2023-01-01T00:00:00.000000Z',
                slug: 'test',
                hidden_at: null,
                document_url: 'https://example.com',
                characters: 'テスト',
                meanings: [{ meaning: 'test', primary: true, accepted_answer: true }],
            },
        };

        it('sollte Vocabulary Subject erkennen', () => {
            const vocabSubject = {
                ...baseSubject,
                object: 'vocabulary',
                data: {
                    ...baseSubject.data,
                    readings: [{ reading: 'てすと', primary: true }],
                    parts_of_speech: ['noun'],
                },
            };

            expect(isVocabularySubject(vocabSubject)).toBe(true);
            expect(isKanjiSubject(vocabSubject)).toBe(false);
            expect(isRadicalSubject(vocabSubject)).toBe(false);
        });

        it('sollte Kanji Subject erkennen', () => {
            const kanjiSubject = {
                ...baseSubject,
                object: 'kanji',
                data: {
                    ...baseSubject.data,
                    readings: [{ reading: 'てすと', primary: true, type: 'onyomi' }],
                },
            };

            expect(isKanjiSubject(kanjiSubject)).toBe(true);
            expect(isVocabularySubject(kanjiSubject)).toBe(false);
            expect(isRadicalSubject(kanjiSubject)).toBe(false);
        });

        it('sollte Radical Subject erkennen', () => {
            const radicalSubject = {
                ...baseSubject,
                object: 'radical',
            };

            expect(isRadicalSubject(radicalSubject)).toBe(true);
            expect(isVocabularySubject(radicalSubject)).toBe(false);
            expect(isKanjiSubject(radicalSubject)).toBe(false);
        });
    });
});

describe('Type Guards - DeepL API', () => {
    describe('isDeepLResponse', () => {
        it('sollte gültige DeepL Response erkennen', () => {
            const response = {
                translations: [
                    {
                        detected_source_language: 'EN',
                        text: 'Hallo Welt',
                    },
                ],
            };

            expect(isDeepLResponse(response)).toBe(true);
        });

        it('sollte leere Translations-Array akzeptieren', () => {
            const response = {
                translations: [],
            };

            expect(isDeepLResponse(response)).toBe(true);
        });

        it('sollte ungültige Response ablehnen', () => {
            expect(isDeepLResponse(null)).toBe(false);
            expect(isDeepLResponse({})).toBe(false);
            expect(isDeepLResponse({ translations: 'not an array' })).toBe(false);
            expect(isDeepLResponse({ translations: [{ invalid: 'object' }] })).toBe(false);
        });
    });
});

describe('Type Guards - Axios Error', () => {
    describe('isAxiosError', () => {
        it('sollte Axios Error erkennen', () => {
            const error = new Error('Network Error');
            (error as any).isAxiosError = true;
            (error as any).response = {
                status: 404,
                data: {},
                headers: {},
            };

            expect(isAxiosError(error)).toBe(true);
        });

        it('sollte normale Errors ablehnen', () => {
            const error = new Error('Normal Error');
            expect(isAxiosError(error)).toBe(false);
            expect(isAxiosError(null)).toBe(false);
            expect(isAxiosError({})).toBe(false);
        });
    });
});

describe('Type Guards - Assertions', () => {
    describe('assertWaniKaniResponse', () => {
        it('sollte bei gültiger Response nicht werfen', () => {
            const response = {
                object: 'collection',
                url: 'https://api.wanikani.com/v2/subjects',
                data: [],
                data_updated_at: '2023-01-01T00:00:00.000000Z',
            };

            expect(() => assertWaniKaniResponse(response, 'test')).not.toThrow();
        });

        it('sollte bei ungültiger Response werfen', () => {
            expect(() => assertWaniKaniResponse(null, 'test')).toThrow(TypeError);
            expect(() => assertWaniKaniResponse({}, 'test')).toThrow(TypeError);
            expect(() => assertWaniKaniResponse({}, 'test')).toThrow(/test/);
        });
    });

    describe('assertDeepLResponse', () => {
        it('sollte bei gültiger Response nicht werfen', () => {
            const response = {
                translations: [
                    { detected_source_language: 'EN', text: 'Test' },
                ],
            };

            expect(() => assertDeepLResponse(response, 'test')).not.toThrow();
        });

        it('sollte bei ungültiger Response werfen', () => {
            expect(() => assertDeepLResponse(null, 'test')).toThrow(TypeError);
            expect(() => assertDeepLResponse({}, 'test')).toThrow(TypeError);
            expect(() => assertDeepLResponse({}, 'test')).toThrow(/test/);
        });
    });
});
