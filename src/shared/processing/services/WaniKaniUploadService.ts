/**
 * WaniKani Upload Service
 * 
 * Verwaltet Study Materials über die WaniKani API v2.
 * Implementiert Rate Limiting via Bottleneck, Retry Logic und Batch-Processing.
 * 
 * Rate Limits:
 * - Study Materials PUT/POST: 10 requests per minute (WaniKani API Limit)
 * - Study Materials GET: 60 requests per minute
 * 
 * API Dokumentation: https://docs.api.wanikani.com/20170710/
 */

import Bottleneck from 'bottleneck';
import type { UploadService } from '../types/processing.types';
import { createLogger } from '../../lib/logger';

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

/**
 * Rate Limit Configuration für Study Materials
 * 
 * WaniKani API Limits:
 * - POST/PUT (Create/Update): 10 requests per minute
 * - GET (Read): 60 requests per minute
 * 
 * Bottleneck Strategy:
 * - reservoir: 10 requests
 * - reservoirRefreshAmount: 10 requests
 * - reservoirRefreshInterval: 60000ms (1 minute)
 * - minTime: 6000ms (6 seconds between requests - safe margin)
 */
const UPLOAD_RATE_LIMITS = {
    reservoir: 10,                    // Start with 10 requests available
    reservoirRefreshAmount: 10,       // Refill to 10 requests
    reservoirRefreshInterval: 60000,  // Every 60 seconds
    minTime: 6000,                    // Minimum 6 seconds between requests
    maxConcurrent: 1,                 // Only 1 concurrent request
};

/**
 * Rate Limit Configuration für GET requests (Study Materials lookup)
 * 
 * GET requests haben höheres Limit: 60 per minute
 */
const GET_RATE_LIMITS = {
    reservoir: 60,
    reservoirRefreshAmount: 60,
    reservoirRefreshInterval: 60000,
    minTime: 1000,  // 1 second between requests
    maxConcurrent: 1,
};

export class WaniKaniUploadService implements UploadService {
    readonly name = 'WaniKani';

    private apiToken: string;
    private readonly API_BASE = 'https://api.wanikani.com/v2';
    private readonly logger = createLogger('WaniKaniUploadService');

    // Bottleneck rate limiters
    private readonly uploadLimiter: Bottleneck;  // For POST/PUT requests
    private readonly getLimiter: Bottleneck;     // For GET requests

    constructor(apiToken: string, testMode = false) {
        this.apiToken = apiToken;

        // Initialize rate limiters
        // In test mode: Use minimal delays (10ms instead of 6000ms)
        if (testMode) {
            this.uploadLimiter = new Bottleneck({
                ...UPLOAD_RATE_LIMITS,
                minTime: 10,
                reservoir: 1000,
                reservoirRefreshAmount: 1000,
                reservoirRefreshInterval: 100,
            });
            this.getLimiter = new Bottleneck({
                ...GET_RATE_LIMITS,
                minTime: 10,
                reservoir: 1000,
                reservoirRefreshAmount: 1000,
                reservoirRefreshInterval: 100,
            });
        } else {
            this.uploadLimiter = new Bottleneck(UPLOAD_RATE_LIMITS);
            this.getLimiter = new Bottleneck(GET_RATE_LIMITS);
        }
    }

    /**
     * Prüft ob der Service verfügbar ist (API Token vorhanden)
     */
    isAvailable(): boolean {
        return this.apiToken !== '' && this.apiToken.length > 0;
    }

    /**
     * Lädt Synonyme für ein Item hoch
     * 
     * Verwendet Bottleneck für automatisches Rate Limiting:
     * - GET request via getLimiter (60/min)
     * - PUT/POST request via uploadLimiter (10/min)
     */
    async upload(itemId: number, synonyms: string[]): Promise<boolean> {
        try {
            // First, check if study material already exists (GET request)
            const existingMaterial = await this.findStudyMaterial(itemId);

            if (existingMaterial) {
                // Update existing study material (PUT request)
                return await this.updateStudyMaterial(existingMaterial.id, synonyms);
            } else {
                // Create new study material (POST request)
                return await this.createStudyMaterial(itemId, synonyms);
            }
        } catch (error) {
            this.logger.error(`Upload failed for item ${itemId}`, error as Error);
            return false;
        }
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
     * 
     * Returns status from Bottleneck upload limiter
     */
    getRateLimitStatus(): { requestsInLastSecond: number; canMakeRequest: boolean } {
        const counts = this.uploadLimiter.counts();

        return {
            requestsInLastSecond: counts.EXECUTING + counts.QUEUED,
            canMakeRequest: counts.QUEUED === 0,
        };
    }

    /**
     * Sucht existierendes Study Material für ein Item
     * 
     * Verwendet getLimiter (60 requests/minute)
     */
    private async findStudyMaterial(subjectId: number, retryCount = 0): Promise<StudyMaterialData | null> {
        const url = `${this.API_BASE}/study_materials?subject_ids=${subjectId}`;

        // Use GET rate limiter
        const response = await this.getLimiter.schedule(() =>
            this.makeRequest(url, 'GET')
        );

        // Handle rate limiting with exponential backoff
        if (response.status === 429) {
            if (retryCount < 3) {
                const backoffMs = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
                // Silent retry - only log on final failure
                await this.sleep(backoffMs);
                return this.findStudyMaterial(subjectId, retryCount + 1);
            }
            // All retries exhausted - log error
            const error = new Error(`Failed to fetch study material after ${retryCount} retries: 429 Too Many Requests`);
            this.logger.error(`Rate limit exceeded (429) for subject ${subjectId} after 3 retries`, error, { subjectId, retryCount });
            throw error;
        }

        if (!response.ok) {
            throw new Error(`Failed to fetch study material: ${response.status}`);
        }

        const data: WaniKaniCollectionResponse = await response.json();

        return data.data.length > 0 ? data.data[0] : null;
    }

    /**
     * Erstellt neues Study Material
     * 
     * Verwendet uploadLimiter (10 requests/minute)
     */
    private async createStudyMaterial(subjectId: number, synonyms: string[]): Promise<boolean> {
        const url = `${this.API_BASE}/study_materials`;

        const body = {
            study_material: {
                subject_id: subjectId,
                meaning_synonyms: synonyms,
            },
        };

        // Use upload rate limiter (10 req/min)
        const response = await this.uploadLimiter.schedule(() =>
            this.makeRequest(url, 'POST', body)
        );

        return response.ok;
    }

    /**
     * Aktualisiert existierendes Study Material
     * 
     * Verwendet uploadLimiter (10 requests/minute)
     */
    private async updateStudyMaterial(studyMaterialId: number, synonyms: string[]): Promise<boolean> {
        const url = `${this.API_BASE}/study_materials/${studyMaterialId}`;

        const body = {
            study_material: {
                meaning_synonyms: synonyms,
            },
        };

        // Use upload rate limiter (10 req/min)
        const response = await this.uploadLimiter.schedule(() =>
            this.makeRequest(url, 'PUT', body)
        );

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
                    // Silent retry - only log if final attempt fails
                    await this.sleep(waitTime);
                    return this.makeRequest(url, method, body, retries + 1);
                } else {
                    // All retries exhausted - log error
                    this.logger.error(
                        `Rate limit exceeded (429) after ${maxRetries} retries`,
                        undefined,
                        { method, url, retries: maxRetries }
                    );
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
