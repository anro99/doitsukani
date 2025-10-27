/**
 * Combined WaniKani API Service
 * 
 * Fetches Radicals, Kanji, and Vocabulary in a single request
 * using WaniKani's Subjects API with multiple types.
 * 
 * API Endpoint: GET /v2/subjects?types=radical,kanji,vocabulary
 * 
 * Features:
 * - Single API request für alle drei Types
 * - Pre-mixed ordering (nicht nach Type gruppiert)
 * - Level-Filterung (einzelne, mehrere oder alle Levels)
 * - Pagination Support (next_url)
 * - Rate Limiting via Bottleneck
 */

import axios from 'axios';
import Bottleneck from 'bottleneck';
import { Subject, SubjectCollection, StudyMaterial } from '@bachman-dev/wanikani-api-types';
import type { SetProgress } from '../../../shared/lib/progressreporter';
import {
    createCombinedItem,
    type CombinedItem,
    type CombinedItemType,
} from '../types/combined-types';

// Type aliases für API Responses
type WKSubject = Subject;
type WKCollection = SubjectCollection;
type WKStudyMaterial = StudyMaterial;

/**
 * Rate Limiting Configuration
 * 
 * Gleiche Settings wie in shared/lib/wanikani.ts:
 * - Hard Limit: 60 requests/minute
 * - Conservative: 5000ms zwischen Requests
 * - Maximal 1 concurrent request
 */
const API_LIMITS = {
    minTime: 5000,
    maxConcurrent: 1,
};

/**
 * Options für fetchCombinedSubjects
 */
export interface FetchCombinedOptions {
    /** Level-Filter (z.B. "1", "1,2,3", "1-10") */
    levels?: string;

    /** Maximale Anzahl Items (für Preview) */
    limit?: number;

    /** Offset für Pagination */
    offset?: number;

    /** Progress Callback */
    setProgress?: SetProgress;
}

/**
 * Result Type für getCombinedCount
 */
export interface CombinedCountResult {
    /** Anzahl Radicals */
    radicals: number;
    /** Anzahl Kanji */
    kanji: number;
    /** Anzahl Vocabulary */
    vocabulary: number;
    /** Gesamtanzahl (radicals + kanji + vocabulary) */
    total: number;
}

/**
 * Get total count of combined items for a level
 * 
 * Optimized Strategy:
 * - Für einzelne Levels (<1000 Items): EINEN Request + client-side counting
 * - Für "all levels" (>1000 Items): 3 parallele Count-Requests
 * 
 * Memory-efficient: Lädt nur 1 Item pro Type für "all", oder max 1000 Items für Level.
 * 
 * @param token - WaniKani API Token
 * @param level - Optional: Specific Level (default: alle Levels)
 * @returns Promise<CombinedCountResult> - Counts für R/K/V + Total
 * 
 * @example
 * // Get counts for level 1 (fast: 1 request)
 * const counts = await getCombinedCount(token, 1);
 * // { radicals: 25, kanji: 18, vocabulary: 37, total: 80 }
 * 
 * @example
 * // Get counts for all levels (3 requests)
 * const allCounts = await getCombinedCount(token);
 * // { radicals: 478, kanji: 2136, vocabulary: 6662, total: 9276 }
 */
export async function getCombinedCount(
    token: string,
    level?: number
): Promise<CombinedCountResult> {
    const limiter = new Bottleneck(API_LIMITS);

    console.log(`[CombinedWaniKani] 🔢 Fetching counts for level ${level || 'all'}...`);

    // ✅ Optimierung für einzelne Levels: 1 Request + client-side counting
    if (level !== undefined) {
        try {
            // Single request mit allen Typen, limit=1000 (WaniKani max per page)
            const url = `https://api.wanikani.com/v2/subjects?types=radical,kanji,vocabulary&levels=${level}&limit=1000`;

            const response = await limiter.schedule(() =>
                axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            );

            const collection = response.data as WKCollection;

            // Count by type (client-side, sehr schnell)
            let radicalCount = 0;
            let kanjiCount = 0;
            let vocabularyCount = 0;

            for (const subject of collection.data) {
                if (subject.object === 'radical') radicalCount++;
                else if (subject.object === 'kanji') kanjiCount++;
                else if (subject.object === 'vocabulary') vocabularyCount++;
            }

            const result: CombinedCountResult = {
                radicals: radicalCount,
                kanji: kanjiCount,
                vocabulary: vocabularyCount,
                total: collection.total_count,
            };

            console.log('[CombinedWaniKani] 📊 Counts:', {
                ...result,
                level,
                dataLoaded: collection.data.length,
                source: '1 API request + client count'
            });

            return result;

        } catch (error) {
            console.error('[CombinedWaniKani] ❌ Error fetching counts:', error);
            throw error;
        }
    }

    // ✅ Für "all levels": 3 parallele Count-Requests (da >1000 Items total)
    // Build URLs für separate Count Requests
    const baseUrl = 'https://api.wanikani.com/v2/subjects?limit=1';

    const radicalUrl = `${baseUrl}&types=radical`;
    const kanjiUrl = `${baseUrl}&types=kanji`;
    const vocabularyUrl = `${baseUrl}&types=vocabulary`;

    try {
        // Parallele Requests für alle drei Typen
        const [radicalResponse, kanjiResponse, vocabularyResponse] = await Promise.all([
            limiter.schedule(() =>
                axios.get(radicalUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ),
            limiter.schedule(() =>
                axios.get(kanjiUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ),
            limiter.schedule(() =>
                axios.get(vocabularyUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                })
            ),
        ]);

        const radicalCount = (radicalResponse.data as WKCollection).total_count;
        const kanjiCount = (kanjiResponse.data as WKCollection).total_count;
        const vocabularyCount = (vocabularyResponse.data as WKCollection).total_count;

        const result: CombinedCountResult = {
            radicals: radicalCount,
            kanji: kanjiCount,
            vocabulary: vocabularyCount,
            total: radicalCount + kanjiCount + vocabularyCount,
        };

        console.log('[CombinedWaniKani] 📊 Counts:', {
            ...result,
            level: 'all',
            source: '3 parallel API requests'
        });

        return result;
    } catch (error) {
        console.error('[CombinedWaniKani] ❌ Error fetching counts:', error);
        throw error;
    }
}

/**
 * Fetches Combined Subjects (Radicals, Kanji, Vocabulary) von WaniKani API
 * 
 * Verwendet das Subjects Endpoint mit types=radical,kanji,vocabulary
 * für eine effiziente Single-Request-Abfrage.
 * 
 * @param token - WaniKani API Token
 * @param options - Fetch Options (levels, limit, offset, progress)
 * @returns Promise<WKSubject[]> - Array von gemischten Subjects
 * 
 * @example
 * // Fetch all combined subjects for level 1
 * const subjects = await fetchCombinedSubjects(token, { levels: '1' });
 * 
 * @example
 * // Fetch preview (12 items) for levels 1-3
 * const preview = await fetchCombinedSubjects(token, { 
 *   levels: '1,2,3', 
 *   limit: 12 
 * });
 */
export async function fetchCombinedSubjects(
    token: string,
    options: FetchCombinedOptions = {}
): Promise<WKSubject[]> {
    const limiter = new Bottleneck(API_LIMITS);

    // Build API URL with query parameters
    const params = new URLSearchParams();
    params.append('types', 'radical,kanji,vocabulary');

    if (options.levels) {
        params.append('levels', options.levels);
    }

    if (options.limit) {
        params.append('limit', options.limit.toString());
    }

    if (options.offset) {
        params.append('offset', options.offset.toString());
    }

    const url = `https://api.wanikani.com/v2/subjects?${params.toString()}`;

    // Progress Reporting
    if (options.setProgress) {
        const levelText = options.levels ? ` für Level ${options.levels}` : '';
        const limitText = options.limit ? ` (max ${options.limit})` : '';

        options.setProgress({
            text: `Lade Combined Items${levelText}${limitText}...`,
            currentStep: 1,
            lastStep: 1,
        });
    }

    // Single Request (mit limit) oder Pagination (ohne limit)
    if (options.limit) {
        // Single Page Request
        const response = await limiter.schedule(() =>
            axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
        );

        const collection = response.data as WKCollection;

        // Apply limit (API kann mehr zurückgeben)
        const limited = collection.data.slice(0, options.limit);

        if (options.setProgress) {
            options.setProgress({
                text: `${limited.length} Combined Items geladen`,
                currentStep: 1,
                lastStep: 1,
            });
        }

        return limited as WKSubject[];
    }

    // Paginated Request (alle Seiten laden)
    const result: WKSubject[] = [];
    let nextUrl: string | null = url;
    let page = 0;

    while (nextUrl) {
        const response = await limiter.schedule(() =>
            axios.get(nextUrl!, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
        );

        const collection = response.data as WKCollection;
        result.push(...(collection.data as WKSubject[]));

        // Progress Update
        if (options.setProgress) {
            const totalPages = Math.ceil(collection.total_count / collection.pages.per_page);

            options.setProgress({
                text: `Lade Combined Items (Seite ${++page}/${totalPages})...`,
                currentStep: page,
                lastStep: totalPages,
            });
        }

        nextUrl = collection.pages.next_url;
    }

    if (options.setProgress) {
        options.setProgress({
            text: `${result.length} Combined Items geladen`,
            currentStep: 1,
            lastStep: 1,
        });
    }

    return result;
}

/**
 * Fetches Combined Preview (erste 12 Items, gemischt)
 * 
 * Optimiert für schnelle Preview-Anzeige ohne vollständige Pagination.
 * 
 * @param token - WaniKani API Token
 * @param level - Optional: Specific Level (default: alle Levels)
 * @param limit - Optional: Anzahl Items (default: 12)
 * @returns Promise<WKSubject[]>
 */
export async function fetchCombinedPreview(
    token: string,
    level?: number,
    limit: number = 12
): Promise<WKSubject[]> {
    return fetchCombinedSubjects(token, {
        levels: level ? level.toString() : undefined,
        limit,
    });
}

/**
 * Converts WaniKani Subject zu CombinedItem
 * 
 * Extrahiert relevante Properties und konvertiert in unsere
 * Combined Item Type mit type discriminator.
 * 
 * @param subject - WaniKani Subject (Radical, Kanji oder Vocabulary)
 * @param studyMaterials - Optional: Study Materials für existierende Synonyme
 * @returns CombinedItem
 */
export function convertToCombinedItem(
    subject: WKSubject,
    studyMaterials?: WKStudyMaterial[]
): CombinedItem {
    const subjectType = subject.object as CombinedItemType;

    // Find study material for this subject
    const studyMaterial = studyMaterials?.find(sm => sm.data.subject_id === subject.id);

    // Extract meanings
    const meanings = subject.data.meanings
        .filter(m => m.accepted_answer)
        .map(m => m.meaning);

    const primaryMeaning = subject.data.meanings.find(m => m.primary)?.meaning
        || meanings[0]
        || '';

    // Extract alternative meanings (non-primary)
    const alternativeMeanings = subject.data.meanings
        .filter(m => !m.primary && m.accepted_answer)
        .map(m => m.meaning);

    // Extract existing synonyms
    const existingSynonyms = studyMaterial?.data.meaning_synonyms || [];

    // Characters (nullable für text-only radicals)
    const characters = subject.data.characters;

    // Meaning Mnemonic (nur für Radicals und Kanji)
    const meaningMnemonic = ('meaning_mnemonic' in subject.data)
        ? subject.data.meaning_mnemonic
        : undefined;

    // Create base item compatible with ProcessableItem
    const baseItem = {
        id: subject.id,
        characters,
        meanings,
        existingSynonyms,
        primaryMeaning,
        alternativeMeanings,
        meaningMnemonic,
    };

    // Convert to CombinedItem via createCombinedItem helper
    return createCombinedItem(
        baseItem as any, // Type assertion - createCombinedItem handles different types
        subjectType,
        subject.data.level
    );
}

/**
 * Converts Array von WaniKani Subjects zu CombinedItems
 * 
 * Batch-Konvertierung mit optional Study Materials Lookup.
 * 
 * @param subjects - Array von WaniKani Subjects
 * @param studyMaterials - Optional: Study Materials für Synonyme
 * @returns CombinedItem[]
 */
export function convertToCombinedItems(
    subjects: WKSubject[],
    studyMaterials?: WKStudyMaterial[]
): CombinedItem[] {
    return subjects.map(subject =>
        convertToCombinedItem(subject, studyMaterials)
    );
}

/**
 * Fetches Study Materials für Combined Items
 * 
 * Lädt alle Study Materials für eine Liste von Subject IDs.
 * Wird verwendet um existierende Synonyme zu laden.
 * 
 * @param token - WaniKani API Token
 * @param subjectIds - Array von Subject IDs
 * @returns Promise<WKStudyMaterial[]>
 */
export async function fetchCombinedStudyMaterials(
    token: string,
    subjectIds: number[]
): Promise<WKStudyMaterial[]> {
    if (subjectIds.length === 0) {
        return [];
    }

    const limiter = new Bottleneck(API_LIMITS);

    // WaniKani API: subject_ids als comma-separated string
    const subjectIdsParam = subjectIds.join(',');
    const url = `https://api.wanikani.com/v2/study_materials?subject_ids=${subjectIdsParam}`;

    try {
        const response = await limiter.schedule(() =>
            axios.get(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
        );

        const collection = response.data as { data: WKStudyMaterial[] };
        return collection.data;
    } catch (error) {
        console.error('Error fetching combined study materials:', error);
        return [];
    }
}

/**
 * Fetches Complete Combined Items mit Study Materials
 * 
 * One-Stop-Function: Lädt Subjects + Study Materials in einem Schritt.
 * 
 * @param token - WaniKani API Token
 * @param options - Fetch Options
 * @returns Promise<CombinedItem[]>
 * 
 * @example
 * const items = await fetchCompleteCombinedItems(token, { 
 *   levels: '1,2,3',
 *   setProgress: (p) => console.log(p.text)
 * });
 */
export async function fetchCompleteCombinedItems(
    token: string,
    options: FetchCombinedOptions = {}
): Promise<CombinedItem[]> {
    // Step 1: Fetch Subjects
    const subjects = await fetchCombinedSubjects(token, options);

    // Step 2: Fetch Study Materials
    const subjectIds = subjects.map(s => s.id);
    const studyMaterials = await fetchCombinedStudyMaterials(token, subjectIds);

    // Step 3: Convert to CombinedItems
    const combinedItems = convertToCombinedItems(subjects, studyMaterials);

    return combinedItems;
}
