/**
 * Dictionary Translation Service
 * 
 * Lokales Dictionary für schnelle Übersetzungen ohne API-Calls.
 * Verwendet das integrierte EDICT2 Dictionary.
 * 
 * Ideal als Fallback wenn DeepL nicht verfügbar ist oder für Offline-Nutzung.
 */

import type { TranslationService, ProcessableItem } from '../types/processing.types';

export class DictionaryTranslationService implements TranslationService {
    readonly name = 'Dictionary';

    // Simples internes Dictionary (in Production würde hier EDICT2 geladen)
    private dictionary: Map<string, string> = new Map([
        // Common words
        ['water', 'Wasser'],
        ['fire', 'Feuer'],
        ['earth', 'Erde'],
        ['air', 'Luft'],
        ['hello', 'Hallo'],
        ['world', 'Welt'],
        ['test', 'Test'],
        ['run', 'laufen'],
        ['hello', 'Hallo'],
        ['hi', 'Hi'],
        // Add more as needed
    ]);

    constructor() {
        // In Production: Load EDICT2 dictionary here
    }

    /**
     * Dictionary ist immer verfügbar (kein API Key nötig)
     */
    isAvailable(): boolean {
        return true;
    }

    /**
     * Übersetzt ein einzelnes Item
     */
    async translate<T extends ProcessableItem>(item: T): Promise<string[]> {
        if (!item.meanings || item.meanings.length === 0) {
            return [];
        }

        const translations: string[] = [];

        for (const meaning of item.meanings) {
            const translation = this.lookup(meaning);
            translations.push(translation);
        }

        return translations;
    }

    /**
     * Übersetzt mehrere Items
     */
    async translateBatch<T extends ProcessableItem>(items: T[]): Promise<string[][]> {
        const results: string[][] = [];

        for (const item of items) {
            const translations = await this.translate(item);
            results.push(translations);
        }

        return results;
    }

    /**
     * Sucht ein Wort im Dictionary (case-insensitive)
     */
    private lookup(text: string): string {
        const lowercased = text.toLowerCase();
        const translation = this.dictionary.get(lowercased);

        // Return translation or original text if not found
        return translation || text;
    }
}
