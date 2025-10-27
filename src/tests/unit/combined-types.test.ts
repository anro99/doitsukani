/**
 * Combined Types - Unit Tests
 * 
 * Testet Type Guards und Helper Functions für CombinedItem Types
 */

import { describe, it, expect } from 'vitest';
import {
    isRadical,
    isKanji,
    isVocabulary,
    getTypeBadge,
    getTypeColor,
    extractOriginalItem,
    createCombinedItem,
    type CombinedItem,
    type CombinedRadical,
    type CombinedKanji,
    type CombinedVocabulary,
} from '../../features/combined/types/combined-types';
import type { RadicalItem } from '../../features/radicals/lib/RadicalTranslationService';
import type { KanjiItem } from '../../features/kanji/lib/KanjiTranslationService';
import type { VocabularyItem } from '../../features/combined/types/combined-types';

describe('Combined Types - Type Guards', () => {
    const mockRadical: CombinedRadical = {
        type: 'radical',
        id: 1,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'Ground',
        meanings: ['Ground'],
        existingSynonyms: [],
        meaningMnemonic: 'This radical is a single horizontal line...',
    };

    const mockKanji: CombinedKanji = {
        type: 'kanji',
        id: 440,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'One',
        alternativeMeanings: [],
        meanings: ['One'],
        existingSynonyms: [],
        meaningMnemonic: 'Imagine this is a single number one...',
    };

    const mockVocabulary: CombinedVocabulary = {
        type: 'vocabulary',
        id: 2467,
        characters: '一',
        level: 1,
        selected: false,
        translatedSynonyms: [],
        primaryMeaning: 'One',
        alternativeMeanings: [],
        meanings: ['One'],
        existingSynonyms: [],
    };

    describe('isRadical()', () => {
        it('sollte true zurückgeben für Radical Items', () => {
            expect(isRadical(mockRadical)).toBe(true);
        });

        it('sollte false zurückgeben für Kanji Items', () => {
            expect(isRadical(mockKanji)).toBe(false);
        });

        it('sollte false zurückgeben für Vocabulary Items', () => {
            expect(isRadical(mockVocabulary)).toBe(false);
        });

        it('sollte Type Narrowing ermöglichen', () => {
            const item: CombinedItem = mockRadical;
            
            if (isRadical(item)) {
                // TypeScript sollte hier wissen, dass item vom Typ CombinedRadical ist
                expect(item.primaryMeaning).toBe('Ground');
                expect(item.meaningMnemonic).toBeDefined();
                // Diese Properties existieren nur bei Radical, nicht bei Kanji/Vocabulary:
                expect('alternativeMeanings' in item).toBe(false);
            } else {
                throw new Error('Should be a radical');
            }
        });
    });

    describe('isKanji()', () => {
        it('sollte true zurückgeben für Kanji Items', () => {
            expect(isKanji(mockKanji)).toBe(true);
        });

        it('sollte false zurückgeben für Radical Items', () => {
            expect(isKanji(mockRadical)).toBe(false);
        });

        it('sollte false zurückgeben für Vocabulary Items', () => {
            expect(isKanji(mockVocabulary)).toBe(false);
        });

        it('sollte Type Narrowing ermöglichen', () => {
            const item: CombinedItem = mockKanji;
            
            if (isKanji(item)) {
                expect(item.primaryMeaning).toBe('One');
                expect(item.alternativeMeanings).toBeDefined();
                expect(item.meaningMnemonic).toBeDefined();
                expect(item.characters).toBe('一'); // Non-nullable für Kanji
            } else {
                throw new Error('Should be a kanji');
            }
        });
    });

    describe('isVocabulary()', () => {
        it('sollte true zurückgeben für Vocabulary Items', () => {
            expect(isVocabulary(mockVocabulary)).toBe(true);
        });

        it('sollte false zurückgeben für Radical Items', () => {
            expect(isVocabulary(mockRadical)).toBe(false);
        });

        it('sollte false zurückgeben für Kanji Items', () => {
            expect(isVocabulary(mockKanji)).toBe(false);
        });

        it('sollte Type Narrowing ermöglichen', () => {
            const item: CombinedItem = mockVocabulary;
            
            if (isVocabulary(item)) {
                expect(item.primaryMeaning).toBe('One');
                expect(item.alternativeMeanings).toBeDefined();
                expect(item.characters).toBe('一'); // Non-nullable für Vocabulary
                // meaningMnemonic existiert nicht bei Vocabulary
                expect('meaningMnemonic' in item).toBe(false);
            } else {
                throw new Error('Should be a vocabulary');
            }
        });
    });
});

describe('Combined Types - Helper Functions', () => {
    const mockRadical: CombinedRadical = {
        type: 'radical',
        id: 1,
        characters: null, // Text-only radical
        level: 1,
        selected: false,
        translatedSynonyms: ['Boden'],
        primaryMeaning: 'Ground',
        meanings: ['Ground'],
        existingSynonyms: ['Erde'],
        meaningMnemonic: 'This radical is a single horizontal line...',
    };

    const mockKanji: CombinedKanji = {
        type: 'kanji',
        id: 440,
        characters: '一',
        level: 1,
        selected: true,
        translatedSynonyms: ['Eins', 'Einzig'],
        primaryMeaning: 'One',
        alternativeMeanings: ['Singular'],
        meanings: ['One', 'Singular'],
        existingSynonyms: [],
        meaningMnemonic: 'Imagine this is a single number one...',
    };

    const mockVocabulary: CombinedVocabulary = {
        type: 'vocabulary',
        id: 2467,
        characters: '一つ',
        level: 1,
        selected: false,
        translatedSynonyms: ['Eins'],
        primaryMeaning: 'One Thing',
        alternativeMeanings: ['A Single Item'],
        meanings: ['One Thing', 'A Single Item'],
        existingSynonyms: ['Ein Ding'],
    };

    describe('getTypeBadge()', () => {
        it('sollte "R" für Radicals zurückgeben', () => {
            expect(getTypeBadge(mockRadical)).toBe('R');
        });

        it('sollte "K" für Kanji zurückgeben', () => {
            expect(getTypeBadge(mockKanji)).toBe('K');
        });

        it('sollte "V" für Vocabulary zurückgeben', () => {
            expect(getTypeBadge(mockVocabulary)).toBe('V');
        });
    });

    describe('getTypeColor()', () => {
        it('sollte "blue" für Radicals zurückgeben', () => {
            expect(getTypeColor(mockRadical)).toBe('blue');
        });

        it('sollte "pink" für Kanji zurückgeben', () => {
            expect(getTypeColor(mockKanji)).toBe('pink');
        });

        it('sollte "purple" für Vocabulary zurückgeben', () => {
            expect(getTypeColor(mockVocabulary)).toBe('purple');
        });
    });

    describe('extractOriginalItem()', () => {
        it('sollte RadicalItem aus CombinedRadical extrahieren', () => {
            const original = extractOriginalItem(mockRadical) as RadicalItem;

            expect(original.id).toBe(1);
            expect(original.characters).toBeNull();
            expect(original.primaryMeaning).toBe('Ground');
            expect(original.meanings).toEqual(['Ground']);
            expect(original.existingSynonyms).toEqual(['Erde']);
            expect(original.meaningMnemonic).toBe('This radical is a single horizontal line...');
        });

        it('sollte KanjiItem aus CombinedKanji extrahieren', () => {
            const original = extractOriginalItem(mockKanji) as KanjiItem;

            expect(original.characters).toBe('一');
            expect(original.primaryMeaning).toBe('One');
            expect(original.alternativeMeanings).toEqual(['Singular']);
            expect(original.meanings).toEqual(['One', 'Singular']);
            expect(original.existingSynonyms).toEqual([]);
            expect(original.meaningMnemonic).toBe('Imagine this is a single number one...');
        });

        it('sollte VocabularyItem aus CombinedVocabulary extrahieren', () => {
            const original = extractOriginalItem(mockVocabulary) as VocabularyItem;

            expect(original.id).toBe(2467);
            expect(original.characters).toBe('一つ');
            expect(original.primaryMeaning).toBe('One Thing');
            expect(original.alternativeMeanings).toEqual(['A Single Item']);
            expect(original.meanings).toEqual(['One Thing', 'A Single Item']);
            expect(original.existingSynonyms).toEqual(['Ein Ding']);
        });
    });

    describe('createCombinedItem()', () => {
        it('sollte CombinedRadical aus RadicalItem erstellen', () => {
            const radicalItem: RadicalItem = {
                id: 1,
                characters: '一',
                primaryMeaning: 'Ground',
                meanings: ['Ground'],
                existingSynonyms: ['Erde'],
                meaningMnemonic: 'This radical is a single horizontal line...',
            };

            const combined = createCombinedItem(radicalItem, 'radical', 1);

            expect(isRadical(combined)).toBe(true);
            expect(combined.type).toBe('radical');
            expect(combined.id).toBe(1);
            expect(combined.characters).toBe('一');
            expect(combined.level).toBe(1);
            expect(combined.selected).toBe(false);
            expect(combined.translatedSynonyms).toEqual([]);
            
            if (isRadical(combined)) {
                expect(combined.primaryMeaning).toBe('Ground');
                expect(combined.meanings).toEqual(['Ground']);
                expect(combined.existingSynonyms).toEqual(['Erde']);
                expect(combined.meaningMnemonic).toBe('This radical is a single horizontal line...');
            }
        });

        it('sollte CombinedKanji aus KanjiItem erstellen', () => {
            const kanjiItem: KanjiItem = {
                id: 440,
                characters: '一',
                primaryMeaning: 'One',
                alternativeMeanings: ['Singular'],
                meanings: ['One', 'Singular'],
                existingSynonyms: [],
                meaningMnemonic: 'Imagine this is a single number one...',
            };

            const combined = createCombinedItem(kanjiItem, 'kanji', 1);

            expect(isKanji(combined)).toBe(true);
            expect(combined.type).toBe('kanji');
            expect(combined.characters).toBe('一');
            expect(combined.level).toBe(1);
            expect(combined.selected).toBe(false);
            
            if (isKanji(combined)) {
                expect(combined.primaryMeaning).toBe('One');
                expect(combined.alternativeMeanings).toEqual(['Singular']);
                expect(combined.meanings).toEqual(['One', 'Singular']);
                expect(combined.existingSynonyms).toEqual([]);
                expect(combined.meaningMnemonic).toBe('Imagine this is a single number one...');
            }
        });

        it('sollte CombinedVocabulary aus VocabularyItem erstellen', () => {
            const vocabularyItem: VocabularyItem = {
                id: 2467,
                characters: '一つ',
                primaryMeaning: 'One Thing',
                alternativeMeanings: ['A Single Item'],
                meanings: ['One Thing', 'A Single Item'],
                existingSynonyms: ['Ein Ding'],
            };

            const combined = createCombinedItem(vocabularyItem, 'vocabulary', 1);

            expect(isVocabulary(combined)).toBe(true);
            expect(combined.type).toBe('vocabulary');
            expect(combined.id).toBe(2467);
            expect(combined.characters).toBe('一つ');
            expect(combined.level).toBe(1);
            expect(combined.selected).toBe(false);
            
            if (isVocabulary(combined)) {
                expect(combined.primaryMeaning).toBe('One Thing');
                expect(combined.alternativeMeanings).toEqual(['A Single Item']);
                expect(combined.meanings).toEqual(['One Thing', 'A Single Item']);
                expect(combined.existingSynonyms).toEqual(['Ein Ding']);
            }
        });

        it('sollte null characters für text-only radicals handhaben', () => {
            const radicalItem: RadicalItem = {
                id: 2,
                characters: null,
                primaryMeaning: 'Fins',
                meanings: ['Fins'],
                existingSynonyms: [],
                meaningMnemonic: 'This radical consists of...',
            };

            const combined = createCombinedItem(radicalItem, 'radical', 1);

            expect(isRadical(combined)).toBe(true);
            expect(combined.characters).toBeNull();
            
            if (isRadical(combined)) {
                expect(combined.primaryMeaning).toBe('Fins');
            }
        });
    });
});

describe('Combined Types - Integration mit Type System', () => {
    it('sollte CombinedItem als Union Type verwenden können', () => {
        const items: CombinedItem[] = [
            {
                type: 'radical',
                id: 1,
                characters: '一',
                level: 1,
                selected: false,
                translatedSynonyms: [],
                primaryMeaning: 'Ground',
                meanings: ['Ground'],
                existingSynonyms: [],
            },
            {
                type: 'kanji',
                id: 440,
                characters: '一',
                level: 1,
                selected: false,
                translatedSynonyms: [],
                primaryMeaning: 'One',
                alternativeMeanings: [],
                meanings: ['One'],
                existingSynonyms: [],
            },
            {
                type: 'vocabulary',
                id: 2467,
                characters: '一',
                level: 1,
                selected: false,
                translatedSynonyms: [],
                primaryMeaning: 'One',
                alternativeMeanings: [],
                meanings: ['One'],
                existingSynonyms: [],
            },
        ];

        expect(items).toHaveLength(3);
        expect(items.filter(isRadical)).toHaveLength(1);
        expect(items.filter(isKanji)).toHaveLength(1);
        expect(items.filter(isVocabulary)).toHaveLength(1);
    });

    it('sollte Type Guards in switch-case verwenden können', () => {
        const items: CombinedItem[] = [
            { 
                type: 'radical', 
                id: 1, 
                characters: '一', 
                level: 1, 
                selected: false, 
                translatedSynonyms: [], 
                primaryMeaning: 'Ground',
                meanings: ['Ground'],
                existingSynonyms: [],
            },
            { 
                type: 'kanji', 
                id: 440, 
                characters: '一', 
                level: 1, 
                selected: false, 
                translatedSynonyms: [], 
                primaryMeaning: 'One', 
                alternativeMeanings: [],
                meanings: ['One'],
                existingSynonyms: [],
            },
            { 
                type: 'vocabulary', 
                id: 2467, 
                characters: '一', 
                level: 1, 
                selected: false, 
                translatedSynonyms: [], 
                primaryMeaning: 'One', 
                alternativeMeanings: [],
                meanings: ['One'],
                existingSynonyms: [],
            },
        ];

        const badges = items.map(item => {
            switch (item.type) {
                case 'radical':
                    return 'R';
                case 'kanji':
                    return 'K';
                case 'vocabulary':
                    return 'V';
                default:
                    // TypeScript exhaustiveness check
                    const _exhaustive: never = item;
                    return _exhaustive;
            }
        });

        expect(badges).toEqual(['R', 'K', 'V']);
    });
});
