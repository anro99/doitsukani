/**
 * WaniKani Upload Service
 * 
 * Verwaltet Study Materials über die WaniKani API v2.
 * Implementiert Rate Limiting (1 req/sec), Retry Logic und Batch-Processing.
 * 
 * API Dokumentation: https://docs.api.wanikani.com/20170710/
 */

import type { UploadService } from '../types/processing.types';

interface StudyMaterialData {
    id: number;
    object: 'study_material';
    data: {
        subject_id: number;
        subject_type: string;
        meaning_synonyms: string[];
        created_at: string;
    };
}

interface WaniKaniCollectionResponse {
    object: 'collection';
    url: string;
    data: StudyMaterialData[];
    pages: {
        next_url: string | null;
        previous_url: string | null;
        per_page: number;
    };
    total_count: number;
    data_updated_at: string;
}

export class WaniKaniUploadService implements UploadService {
    readonly name = 'WaniKani';

    private apiToken: string;
    private readonly API_BASE = 'https://api.wanikani.com/v2';
    private readonly RATE_LIMIT_MS = 1000; // 1 request per second

    // Rate limiting
    private lastRequestTime = 0;
    private requestQueue: Array<() => Promise<void>> = [];
    private isProcessingQueue = false;

    constructor(apiToken: string) {
        this.apiToken = apiToken;
    }

    /**
     * Prüft ob der Service verfügbar ist (API Token vorhanden)
     */
    isAvailable(): boolean {
        return this.apiToken !== '' && this.apiToken.length > 0;
    }

    /**
     * Lädt Synonyme für ein Item hoch
     */
    async upload(itemId: number, synonyms: string[]): Promise<boolean> {
        return this.enqueueRequest(async () => {
            try {
                // First, check if study material already exists
                const existingMaterial = await this.findStudyMaterial(itemId);

                if (existingMaterial) {
                    // Update existing study material
                    return await this.updateStudyMaterial(existingMaterial.id, synonyms);
                } else {
                    // Create new study material
                    return await this.createStudyMaterial(itemId, synonyms);
                }
            } catch (error) {
                console.error(`Upload failed for item ${itemId}:`, error);
                return false;
            }
        });
    }

    /**
     * Lädt einen Batch von Items hoch (sequenziell mit Rate Limiting)
     */
    async uploadBatch(items: Array<{ id: number; synonyms: string[] }>): Promise<boolean[]> {
        const results: boolean[] = [];

        for (const item of items) {
            const success = await this.upload(item.id, item.synonyms);
            results.push(success);
        }

        return results;
    }

    /**
     * Gibt Rate Limit Status zurück
     */
    getRateLimitStatus(): { requestsInLastSecond: number; canMakeRequest: boolean } {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        const canMakeRequest = timeSinceLastRequest >= this.RATE_LIMIT_MS;

        return {
            requestsInLastSecond: canMakeRequest ? 0 : 1,
            canMakeRequest,
        };
    }

    /**
     * Fügt Request zur Queue hinzu und verarbeitet sie mit Rate Limiting
     */
    private async enqueueRequest<T>(request: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                try {
                    const result = await request();
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            });

            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    /**
     * Verarbeitet die Request Queue mit Rate Limiting
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            // Wait for rate limit
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
                await this.sleep(this.RATE_LIMIT_MS - timeSinceLastRequest);
            }

            // Execute next request
            const request = this.requestQueue.shift();
            if (request) {
                this.lastRequestTime = Date.now();
                await request();
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Sucht existierendes Study Material für ein Item
     */
    private async findStudyMaterial(subjectId: number): Promise<StudyMaterialData | null> {
        const url = `${this.API_BASE}/study_materials?subject_ids=${subjectId}`;

        const response = await this.makeRequest(url, 'GET');

        if (!response.ok) {
            throw new Error(`Failed to fetch study material: ${response.status}`);
        }

        const data: WaniKaniCollectionResponse = await response.json();

        return data.data.length > 0 ? data.data[0] : null;
    }

    /**
     * Erstellt neues Study Material
     */
    private async createStudyMaterial(subjectId: number, synonyms: string[]): Promise<boolean> {
        const url = `${this.API_BASE}/study_materials`;

        const body = {
            study_material: {
                subject_id: subjectId,
                meaning_synonyms: synonyms,
            },
        };

        const response = await this.makeRequest(url, 'POST', body);

        return response.ok;
    }

    /**
     * Aktualisiert existierendes Study Material
     */
    private async updateStudyMaterial(studyMaterialId: number, synonyms: string[]): Promise<boolean> {
        const url = `${this.API_BASE}/study_materials/${studyMaterialId}`;

        const body = {
            study_material: {
                meaning_synonyms: synonyms,
            },
        };

        const response = await this.makeRequest(url, 'PUT', body);

        return response.ok;
    }

    /**
     * Macht einen API Request mit Retry-Logic
     */
    private async makeRequest(
        url: string,
        method: 'GET' | 'POST' | 'PUT',
        body?: Record<string, unknown>,
        retries = 0
    ): Promise<Response> {
        const maxRetries = 3;

        try {
            const options: Record<string, unknown> = {
                method,
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json',
                },
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);

            // Handle rate limiting
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000;

                if (retries < maxRetries) {
                    await this.sleep(waitTime);
                    return this.makeRequest(url, method, body, retries + 1);
                }
            }

            // Don't retry on 401 (Unauthorized) or 404 (Not Found)
            if (response.status === 401 || response.status === 404) {
                return response;
            }

            // Retry on other errors
            if (!response.ok && retries < maxRetries) {
                await this.sleep(Math.pow(2, retries) * 1000); // Exponential backoff
                return this.makeRequest(url, method, body, retries + 1);
            }

            return response;
        } catch (error) {
            // Retry on network errors
            if (retries < maxRetries) {
                await this.sleep(Math.pow(2, retries) * 1000);
                return this.makeRequest(url, method, body, retries + 1);
            }
            throw error;
        }
    }

    /**
     * Sleep Helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
