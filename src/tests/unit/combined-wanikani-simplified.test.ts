/**
 * Combined WaniKani API Service - Simplified Unit Tests
 * 
 * Fokus auf Conversion Logic ohne komplexe Mock-Daten
 */

import { describe, it, expect } from 'vitest';
import {
    convertToCombinedItem,
    convertToCombinedItems,
} from '../../features/combined/lib/combined-wanikani';
import type { Subject, StudyMaterial } from '@bachman-dev/wanikani-api-types';
import { isRadical, isKanji, isVocabulary } from '../../features/combined/types/combined-types';

describe('Combined WaniKani API Service (Unit)', () => {
    describe('convertToCombinedItem()', () => {
        it('sollte Radical Subject zu CombinedRadical konvertieren', () => {
            const mockSubject = {
                id: 1,
                object: 'radical',
                url: 'https://api.wanikani.com/v2/subjects/1',
                data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                data: {
                    level: 1,
                    created_at: '2025-01-01T00:00:00.000000Z' as any,
                    slug: 'ground',
                    hidden_at: null,
                    document_url: 'https://www.wanikani.com/radicals/ground',
                    characters: '一',
                    character_images: [],
                    meanings: [
                        { meaning: 'Ground', primary: true, accepted_answer: true },
                    ],
                    auxiliary_meanings: [],
                    amalgamation_subject_ids: [],
                    meaning_mnemonic: 'This radical...',
                },
            } as unknown as Subject;

            const result = convertToCombinedItem(mockSubject);

            expect(isRadical(result)).toBe(true);
            expect(result.id).toBe(1);
            expect(result.type).toBe('radical');
            expect(result.characters).toBe('一');
            expect(result.level).toBe(1);

            if (isRadical(result)) {
                expect(result.primaryMeaning).toBe('Ground');
                expect(result.meanings).toEqual(['Ground']);
                expect(result.meaningMnemonic).toBe('This radical...');
            }
        });

        it('sollte Kanji Subject zu CombinedKanji konvertieren', () => {
            const mockSubject = {
                id: 440,
                object: 'kanji',
                url: 'https://api.wanikani.com/v2/subjects/440',
                data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                data: {
                    level: 1,
                    created_at: '2025-01-01T00:00:00.000000Z' as any,
                    slug: '一',
                    hidden_at: null,
                    document_url: 'https://www.wanikani.com/kanji/一',
                    characters: '一',
                    meanings: [
                        { meaning: 'One', primary: true, accepted_answer: true },
                        { meaning: 'Singular', primary: false, accepted_answer: true },
                    ],
                    readings: [],
                    component_subject_ids: [],
                    amalgamation_subject_ids: [],
                    visually_similar_subject_ids: [],
                    meaning_mnemonic: 'Kanji mnemonic...',
                    reading_mnemonic: 'Reading hint...',
                    meaning_hint: null,
                    reading_hint: null,
                    lesson_position: 0,
                    spaced_repetition_system_id: 1,
                },
            } as unknown as Subject;

            const result = convertToCombinedItem(mockSubject);

            expect(isKanji(result)).toBe(true);
            expect(result.type).toBe('kanji');
            expect(result.characters).toBe('一');

            if (isKanji(result)) {
                expect(result.primaryMeaning).toBe('One');
                expect(result.alternativeMeanings).toEqual(['Singular']);
                expect(result.meanings).toEqual(['One', 'Singular']);
                expect(result.meaningMnemonic).toBe('Kanji mnemonic...');
            }
        });

        it('sollte Vocabulary Subject zu CombinedVocabulary konvertieren', () => {
            const mockSubject = {
                id: 2467,
                object: 'vocabulary',
                url: 'https://api.wanikani.com/v2/subjects/2467',
                data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                data: {
                    level: 1,
                    created_at: '2025-01-01T00:00:00.000000Z' as any,
                    slug: '一',
                    hidden_at: null,
                    document_url: 'https://www.wanikani.com/vocabulary/一',
                    characters: '一',
                    meanings: [
                        { meaning: 'One', primary: true, accepted_answer: true },
                    ],
                    readings: [],
                    parts_of_speech: ['numeral'],
                    component_subject_ids: [],
                    context_sentences: [],
                    pronunciation_audios: [],
                    lesson_position: 0,
                    spaced_repetition_system_id: 1,
                },
            } as unknown as Subject;

            const result = convertToCombinedItem(mockSubject);

            expect(isVocabulary(result)).toBe(true);
            expect(result.type).toBe('vocabulary');
            expect(result.characters).toBe('一');

            if (isVocabulary(result)) {
                expect(result.primaryMeaning).toBe('One');
                expect(result.meanings).toEqual(['One']);
            }
        });

        it('sollte existing synonyms aus Study Materials laden', () => {
            const mockSubject = {
                id: 1,
                object: 'radical',
                url: 'https://api.wanikani.com/v2/subjects/1',
                data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                data: {
                    level: 1,
                    created_at: '2025-01-01T00:00:00.000000Z' as any,
                    slug: 'ground',
                    hidden_at: null,
                    document_url: 'https://www.wanikani.com/radicals/ground',
                    characters: '一',
                    character_images: [],
                    meanings: [
                        { meaning: 'Ground', primary: true, accepted_answer: true },
                    ],
                    auxiliary_meanings: [],
                    amalgamation_subject_ids: [],
                    meaning_mnemonic: 'This radical...',
                },
            } as unknown as Subject;

            const mockStudyMaterials = [
                {
                    id: 100,
                    object: 'study_material',
                    url: 'https://api.wanikani.com/v2/study_materials/100',
                    data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                    data: {
                        created_at: '2025-01-01T00:00:00.000000Z' as any,
                        subject_id: 1,
                        subject_type: 'radical',
                        meaning_note: '',
                        reading_note: '',
                        meaning_synonyms: ['Boden', 'Erde'],
                        hidden: false,
                    },
                },
            ] as unknown as StudyMaterial[];

            const result = convertToCombinedItem(mockSubject, mockStudyMaterials);

            expect(result.existingSynonyms).toEqual(['Boden', 'Erde']);
        });

        it('sollte null characters für text-only radicals handhaben', () => {
            const mockSubject = {
                id: 2,
                object: 'radical',
                url: 'https://api.wanikani.com/v2/subjects/2',
                data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                data: {
                    level: 1,
                    created_at: '2025-01-01T00:00:00.000000Z' as any,
                    slug: 'fins',
                    hidden_at: null,
                    document_url: 'https://www.wanikani.com/radicals/fins',
                    characters: null,
                    character_images: [
                        {
                            url: 'https://cdn.wanikani.com/images/fins.png',
                            content_type: 'image/png',
                            metadata: {
                                color: '#000000',
                                dimensions: '100x100',
                                style_name: 'original',
                            },
                        },
                    ],
                    meanings: [
                        { meaning: 'Fins', primary: true, accepted_answer: true },
                    ],
                    auxiliary_meanings: [],
                    amalgamation_subject_ids: [],
                    meaning_mnemonic: 'This radical...',
                },
            } as unknown as Subject;

            const result = convertToCombinedItem(mockSubject);

            expect(isRadical(result)).toBe(true);
            expect(result.characters).toBeNull();
        });
    });

    describe('convertToCombinedItems()', () => {
        it('sollte Array von Subjects zu CombinedItems konvertieren', () => {
            const mockSubjects = [
                {
                    id: 1,
                    object: 'radical',
                    url: 'https://api.wanikani.com/v2/subjects/1',
                    data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                    data: {
                        level: 1,
                        created_at: '2025-01-01T00:00:00.000000Z' as any,
                        slug: 'ground',
                        hidden_at: null,
                        document_url: 'https://www.wanikani.com/radicals/ground',
                        characters: '一',
                        character_images: [],
                        meanings: [
                            { meaning: 'Ground', primary: true, accepted_answer: true },
                        ],
                        auxiliary_meanings: [],
                        amalgamation_subject_ids: [],
                        meaning_mnemonic: 'This radical...',
                    },
                },
                {
                    id: 440,
                    object: 'kanji',
                    url: 'https://api.wanikani.com/v2/subjects/440',
                    data_updated_at: '2025-01-01T00:00:00.000000Z' as any,
                    data: {
                        level: 1,
                        created_at: '2025-01-01T00:00:00.000000Z' as any,
                        slug: '一',
                        hidden_at: null,
                        document_url: 'https://www.wanikani.com/kanji/一',
                        characters: '一',
                        meanings: [
                            { meaning: 'One', primary: true, accepted_answer: true },
                        ],
                        readings: [],
                        component_subject_ids: [],
                        amalgamation_subject_ids: [],
                        visually_similar_subject_ids: [],
                        meaning_mnemonic: 'Kanji mnemonic...',
                        reading_mnemonic: 'Reading hint...',
                        meaning_hint: null,
                        reading_hint: null,
                        lesson_position: 0,
                        spaced_repetition_system_id: 1,
                    },
                },
            ] as unknown as Subject[];

            const result = convertToCombinedItems(mockSubjects);

            expect(result).toHaveLength(2);
            expect(isRadical(result[0])).toBe(true);
            expect(isKanji(result[1])).toBe(true);
        });
    });
});
