/**
 * DeepL Translation Service
 * 
 * Verwendet die DeepL API für professionelle Übersetzungen von Englisch nach Deutsch.
 * Unterstützt Batch-Processing, Caching und Rate Limiting.
 * 
 * API Dokumentation: https://www.deepl.com/docs-api
 */

import type { TranslationService, ProcessableItem } from '../types/processing.types';

interface DeepLResponse {
    translations: Array<{
        text: string;
        detected_source_lang: string;
    }>;
}

export class DeeplTranslationService implements TranslationService {
    readonly name = 'DeepL';

    private apiKey: string;
    private cache: Map<string, string> = new Map();
    private readonly API_URL = 'https://api-free.deepl.com/v2/translate';
    private readonly MAX_TEXTS_PER_REQUEST = 50;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Prüft ob der Service verfügbar ist (API Key vorhanden)
     */
    isAvailable(): boolean {
        return this.apiKey !== '' && this.apiKey.length > 0;
    }

    /**
     * Übersetzt ein einzelnes Item
     */
    async translate<T extends ProcessableItem>(item: T): Promise<string[]> {
        if (!this.isAvailable()) {
            throw new Error('DeepL Translation Service is not available. Please provide an API key.');
        }

        if (!item.meanings || item.meanings.length === 0) {
            return [];
        }

        // Check cache first
        const cached = this.getCachedTranslations(item.meanings);
        if (cached) {
            return cached;
        }

        // Translate all meanings in one API call
        const translations = await this.translateTexts(item.meanings);

        // Cache results
        item.meanings.forEach((meaning, index) => {
            this.cache.set(meaning, translations[index]);
        });

        return translations;
    }

    /**
     * Übersetzt mehrere Items in Batches
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
     * Leert den Übersetzungs-Cache
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * Prüft ob alle Texte im Cache sind
     */
    private getCachedTranslations(texts: string[]): string[] | null {
        const cached: string[] = [];

        for (const text of texts) {
            const cachedTranslation = this.cache.get(text);
            if (!cachedTranslation) {
                return null; // Not all texts are cached
            }
            cached.push(cachedTranslation);
        }

        return cached;
    }

    /**
     * Übersetzt mehrere Texte mit der DeepL API
     */
    private async translateTexts(texts: string[]): Promise<string[]> {
        if (texts.length === 0) {
            return [];
        }

        // Split into chunks if necessary (DeepL limit: 50 texts per request)
        const chunks = this.chunkArray(texts, this.MAX_TEXTS_PER_REQUEST);
        const allTranslations: string[] = [];

        for (const chunk of chunks) {
            const translations = await this.translateChunk(chunk);
            allTranslations.push(...translations);
        }

        return allTranslations;
    }

    /**
     * Übersetzt einen Chunk von Texten
     */
    private async translateChunk(texts: string[]): Promise<string[]> {
        // Build request body
        const params = new URLSearchParams();
        params.append('target_lang', 'DE');
        params.append('source_lang', 'EN');

        texts.forEach(text => {
            params.append('text', text);
        });

        try {
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            });

            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('DeepL API rate limit exceeded');
                }
                throw new Error(`DeepL API error: ${response.status} ${response.statusText}`);
            }

            const data: DeepLResponse = await response.json();

            if (!data.translations || !Array.isArray(data.translations)) {
                throw new Error('Invalid DeepL API response format');
            }

            return data.translations.map(t => t.text);
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Unknown error during translation');
        }
    }

    /**
     * Splittet Array in Chunks
     */
    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}
