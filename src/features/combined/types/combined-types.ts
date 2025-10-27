/**
 * Combined Types - Type Definitions für Combined Manager Feature
 * 
 * Ermöglicht die gleichzeitige Verarbeitung von Radicals, Kanji und Vocabulary
 * über das WaniKani Subjects API Endpoint: /v2/subjects?types=radical,kanji,vocabulary
 * 
 * Design Decision:
 * - Union Type für polymorphe Items (Radical | Kanji | Vocabulary)
 * - Type Guards für sichere Type Narrowing
 * - Gemeinsame Basis-Properties für alle drei Typen
 * - Typ-spezifische Properties in discriminated union
 */

import type { RadicalItem } from '../../radicals/lib/RadicalTranslationService';
import type { KanjiItem } from '../../kanji/lib/KanjiTranslationService';
import type { ProcessableItem } from '../../../shared/processing/types/processing.types';

/**
 * Vocabulary Item Type (analog zu RadicalItem/KanjiItem)
 * 
 * Extracted from vocabulary-translation.ts für Konsistenz mit anderen Features
 */
export interface VocabularyItem extends ProcessableItem {
    id: number;
    characters: string;
    meanings: string[]; // From ProcessableItem
    existingSynonyms: string[]; // From ProcessableItem
    primaryMeaning: string;
    alternativeMeanings: string[];
}

/**
 * Combined Item - Union Type für alle drei WaniKani Subject Types
 * 
 * Discriminated Union:
 * - 'type' property als discriminator
 * - Ermöglicht Type Narrowing in TypeScript
 * - Type Guards funktionieren damit automatisch
 */
export type CombinedItemType = 'radical' | 'kanji' | 'vocabulary';

export interface CombinedItemBase {
    type: CombinedItemType;
    id: number;
    characters: string | null; // ⚠️ null bei text-only radicals
    level: number;
    selected: boolean;
    translatedSynonyms: string[];
}

/**
 * Radical in Combined Context
 */
export interface CombinedRadical extends CombinedItemBase {
    type: 'radical';
    primaryMeaning: string;
    meanings: string[]; // From ProcessableItem
    existingSynonyms: string[]; // From ProcessableItem
    meaningMnemonic?: string;
}

/**
 * Kanji in Combined Context
 */
export interface CombinedKanji extends CombinedItemBase {
    type: 'kanji';
    characters: string; // ✅ Non-nullable für Kanji
    primaryMeaning: string;
    alternativeMeanings: string[];
    meanings: string[]; // From ProcessableItem
    existingSynonyms: string[]; // From ProcessableItem
    meaningMnemonic?: string;
}

/**
 * Vocabulary in Combined Context
 */
export interface CombinedVocabulary extends CombinedItemBase {
    type: 'vocabulary';
    characters: string; // ✅ Non-nullable für Vocabulary
    primaryMeaning: string;
    alternativeMeanings: string[];
    meanings: string[]; // From ProcessableItem
    existingSynonyms: string[]; // From ProcessableItem
}

/**
 * Union Type für polymorphe Verwendung
 */
export type CombinedItem = CombinedRadical | CombinedKanji | CombinedVocabulary;

/**
 * Type Guard: Prüft ob ein CombinedItem ein Radical ist
 * 
 * Ermöglicht TypeScript Type Narrowing:
 * ```typescript
 * if (isRadical(item)) {
 *   // item ist vom Typ CombinedRadical
 *   console.log(item.primaryMeaning); // ✅ Type-safe
 * }
 * ```
 */
export function isRadical(item: CombinedItem): item is CombinedRadical {
    return item.type === 'radical';
}

/**
 * Type Guard: Prüft ob ein CombinedItem ein Kanji ist
 */
export function isKanji(item: CombinedItem): item is CombinedKanji {
    return item.type === 'kanji';
}

/**
 * Type Guard: Prüft ob ein CombinedItem ein Vocabulary ist
 */
export function isVocabulary(item: CombinedItem): item is CombinedVocabulary {
    return item.type === 'vocabulary';
}

/**
 * Helper: Extrahiert das Original Item aus einem CombinedItem
 * 
 * Konvertiert zurück zu RadicalItem | KanjiItem | VocabularyItem
 * für die Verwendung mit feature-spezifischen Services.
 */
export function extractOriginalItem(item: CombinedItem): RadicalItem | KanjiItem | VocabularyItem {
    if (isRadical(item)) {
        return {
            id: item.id,
            characters: item.characters,
            primaryMeaning: item.primaryMeaning,
            meanings: item.meanings,
            existingSynonyms: item.existingSynonyms,
            meaningMnemonic: item.meaningMnemonic,
        } as RadicalItem;
    }

    if (isKanji(item)) {
        return {
            characters: item.characters,
            primaryMeaning: item.primaryMeaning,
            alternativeMeanings: item.alternativeMeanings,
            meanings: item.meanings,
            existingSynonyms: item.existingSynonyms,
            meaningMnemonic: item.meaningMnemonic,
        } as KanjiItem;
    }

    // Vocabulary
    return {
        id: item.id,
        characters: item.characters,
        primaryMeaning: item.primaryMeaning,
        alternativeMeanings: item.alternativeMeanings,
        meanings: item.meanings,
        existingSynonyms: item.existingSynonyms,
    } as VocabularyItem;
}

/**
 * Helper: Erstellt ein CombinedItem aus einem Original Item
 * 
 * Konvertiert RadicalItem | KanjiItem | VocabularyItem zu CombinedItem
 * für die Verwendung im Combined Manager.
 */
export function createCombinedItem(
    originalItem: RadicalItem | KanjiItem | VocabularyItem,
    type: CombinedItemType,
    level: number
): CombinedItem {
    const baseItem: Omit<CombinedItemBase, 'type'> = {
        id: originalItem.id,
        characters: 'characters' in originalItem ? originalItem.characters : null,
        level,
        selected: false,
        translatedSynonyms: [],
    };

    if (type === 'radical') {
        const radicalItem = originalItem as RadicalItem;
        return {
            ...baseItem,
            type: 'radical',
            primaryMeaning: radicalItem.primaryMeaning,
            meanings: radicalItem.meanings,
            existingSynonyms: radicalItem.existingSynonyms,
            meaningMnemonic: radicalItem.meaningMnemonic,
        } as CombinedRadical;
    }

    if (type === 'kanji') {
        const kanjiItem = originalItem as KanjiItem;
        return {
            ...baseItem,
            type: 'kanji',
            characters: kanjiItem.characters,
            primaryMeaning: kanjiItem.primaryMeaning,
            alternativeMeanings: kanjiItem.alternativeMeanings,
            meanings: kanjiItem.meanings,
            existingSynonyms: kanjiItem.existingSynonyms,
            meaningMnemonic: kanjiItem.meaningMnemonic,
        } as CombinedKanji;
    }

    // Vocabulary
    const vocabularyItem = originalItem as VocabularyItem;
    return {
        ...baseItem,
        type: 'vocabulary',
        characters: vocabularyItem.characters,
        primaryMeaning: vocabularyItem.primaryMeaning,
        alternativeMeanings: vocabularyItem.alternativeMeanings,
        meanings: vocabularyItem.meanings,
        existingSynonyms: vocabularyItem.existingSynonyms,
    } as CombinedVocabulary;
}

/**
 * Helper: Gibt den Type Badge für ein Item zurück
 * 
 * Used in UI Components für visuelle Type Indicators:
 * - [R] für Radicals
 * - [K] für Kanji
 * - [V] für Vocabulary
 */
export function getTypeBadge(item: CombinedItem): string {
    if (isRadical(item)) return 'R';
    if (isKanji(item)) return 'K';
    return 'V'; // Vocabulary
}

/**
 * Helper: Gibt die Type Color für ein Item zurück
 * 
 * Used in UI Components für farbliche Unterscheidung:
 * - blue für Radicals
 * - pink für Kanji
 * - purple für Vocabulary
 */
export function getTypeColor(item: CombinedItem): 'blue' | 'pink' | 'purple' {
    if (isRadical(item)) return 'blue';
    if (isKanji(item)) return 'pink';
    return 'purple'; // Vocabulary
}
