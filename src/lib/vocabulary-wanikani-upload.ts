import * as wanikani from './wanikani';
import { VocabularyItem } from './vocabulary-translation';
import Bottleneck from 'bottleneck';

// Types for WaniKani upload system
export interface StudyMaterialMapping {
    vocabularyId: number;
    studyMaterialId: number | null;
    exists: boolean;
    currentSynonyms: string[];
}

export interface VocabularyUploadOptions {
    synonymMode: 'smart-merge' | 'replace' | 'delete';
    apiToken: string;
}

export interface UploadResultItem {
    vocabularyId: number;
    studyMaterialId: number | null;
    action: 'created' | 'updated' | 'error' | 'failed';
    finalSynonyms: string[];
    success: boolean;
    error?: string;
}

export interface BatchUploadResult {
    success: boolean;
    totalItems: number;
    createdCount: number;
    updatedCount: number;
    errorCount: number;
    results: UploadResultItem[];
    errors: string[];
}

export interface VocabularyTranslation {
    vocabulary: VocabularyItem;
    translatedSynonyms: string[];
}

/**
 * 🔴 RED Phase: Minimal implementations to make tests pass
 */

/**
 * Find existing study material for a vocabulary item
 */
export async function findStudyMaterialForVocabulary(
    apiToken: string,
    vocabularyId: number
): Promise<StudyMaterialMapping> {
    try {
        console.log(`🔍 Looking for study material for vocabulary ID ${vocabularyId}`);

        // Use the more efficient vocabulary-specific API with subject_ids filter, rate-limited
        const studyMaterials = await globalLimiter.schedule(() =>
            wanikani.getVocabularyStudyMaterials(apiToken, undefined, {
                subject_ids: vocabularyId.toString()
            })
        );

        console.log(`📊 Found ${studyMaterials.length} study materials for vocabulary ID ${vocabularyId}`);

        const existingMaterial = studyMaterials.find(
            material => material.data.subject_id === vocabularyId
        );

        if (existingMaterial) {
            console.log(`✅ Found existing study material:`, {
                id: existingMaterial.id,
                synonyms: existingMaterial.data.meaning_synonyms
            });

            return {
                vocabularyId,
                studyMaterialId: existingMaterial.id,
                exists: true,
                currentSynonyms: existingMaterial.data.meaning_synonyms || []
            };
        }

        console.log(`❌ No existing study material found for vocabulary ID ${vocabularyId}`);
        return {
            vocabularyId,
            studyMaterialId: null,
            exists: false,
            currentSynonyms: []
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to find study material for vocabulary ${vocabularyId}: ${errorMessage}`);
    }
}

/**
 * Create or update study material with synonyms
 */
// Create a global rate limiter for all API calls
const globalLimiter = new Bottleneck({
    minTime: 2000, // Increased to 2 seconds between requests to avoid 429 errors
    maxConcurrent: 1
});

// Add debugging for rate limiting
globalLimiter.on("failed", async (error, jobInfo) => {
    const status = error?.response?.status || error?.status;
    console.log(`🚫 API request failed with status ${status}:`, error);

    // Only retry on actual rate limiting (429) or temporary server errors (5xx)
    if (status === 429 || (status >= 500 && status < 600)) {
        if (jobInfo.retryCount < 3) {
            console.log(`⏳ Retrying in ${2000 * (jobInfo.retryCount + 1)}ms...`);
            return 2000 * (jobInfo.retryCount + 1); // Exponential backoff
        }
    } else if (status === 422) {
        console.log(`🚫 422 Validation Error - Not retrying. Data might be invalid (duplicates, too long, etc.)`);
        return; // Don't retry validation errors
    } else {
        console.log(`🚫 Non-retryable error (status: ${status}) - Not retrying`);
        return; // Don't retry other client errors (4xx)
    }

    return; // Stop retrying after 3 attempts
});

globalLimiter.on("retry", (_error, jobInfo) => {
    console.log(`🔄 Retrying API call (attempt ${jobInfo.retryCount + 1})`);
});

/**
 * Handle 422 validation errors with detailed error analysis
 */
function handle422Error(error: any, vocabularyId: number, synonyms: string[]): UploadResultItem {
    console.log(`🚫 422 Validation Error for vocabulary ${vocabularyId}:`, error.response?.data);

    let errorReason = 'Unknown validation error';

    if (error.response?.data?.error) {
        errorReason = error.response.data.error;
    } else if (error.response?.data?.errors) {
        errorReason = JSON.stringify(error.response.data.errors);
    }

    // Common 422 reasons:
    // - Duplicate synonyms
    // - Synonyms too long (>255 chars)
    // - Too many synonyms (>10)
    console.log(`🔍 422 Error analysis:`, {
        synonymCount: synonyms.length,
        maxSynonymLength: Math.max(...synonyms.map(s => s.length)),
        duplicates: synonyms.filter((item, index) => synonyms.indexOf(item) !== index),
        errorReason
    });

    return {
        vocabularyId,
        studyMaterialId: null,
        action: 'failed',
        finalSynonyms: [],
        success: false,
        error: `422 Validation Error: ${errorReason}`
    };
}

export async function createOrUpdateStudyMaterial(
    mapping: StudyMaterialMapping,
    newSynonyms: string[],
    options: VocabularyUploadOptions
): Promise<UploadResultItem> {

    console.log(`🔄 Processing upload for vocabulary ID ${mapping.vocabularyId}:`, {
        exists: mapping.exists,
        studyMaterialId: mapping.studyMaterialId,
        currentSynonyms: mapping.currentSynonyms,
        newSynonyms
    });

    try {
        if (mapping.exists && mapping.studyMaterialId) {
            // Update existing study material
            const finalSynonyms = mergeSynonyms(mapping.currentSynonyms, newSynonyms, options.synonymMode);

            // Validate and clean synonyms before sending
            let validSynonyms = finalSynonyms
                .map(s => s.trim()) // Remove whitespace
                .filter(s => s.length > 0) // Remove empty strings
                .map(s => s.length > 255 ? s.substring(0, 255) : s); // Truncate very long synonyms

            if (validSynonyms.length > 10) {
                console.log(`⚠️ Too many synonyms (${validSynonyms.length}), truncating to 10`);
                validSynonyms = validSynonyms.slice(0, 10);
            }

            console.log(`📝 Final synonyms for upload:`, validSynonyms);

            const result = await wanikani.updateSynonyms(options.apiToken, globalLimiter, {
                id: mapping.studyMaterialId,
                synonyms: validSynonyms
            });

            return {
                vocabularyId: mapping.vocabularyId,
                studyMaterialId: mapping.studyMaterialId,
                action: 'updated',
                finalSynonyms: result.data.meaning_synonyms || validSynonyms,
                success: true
            };
        } else {
            // Create new study material
            let validSynonyms = newSynonyms
                .map(s => s.trim()) // Remove whitespace
                .filter(s => s.length > 0) // Remove empty strings
                .map(s => s.length > 255 ? s.substring(0, 255) : s); // Truncate very long synonyms

            validSynonyms = removeDuplicatesCaseInsensitive(validSynonyms);

            if (validSynonyms.length > 10) {
                console.log(`⚠️ Too many synonyms (${validSynonyms.length}), truncating to 10`);
                validSynonyms = validSynonyms.slice(0, 10);
            }

            console.log(`📝 Final synonyms for creation:`, validSynonyms);

            const result = await wanikani.createStudyMaterials(options.apiToken, globalLimiter, {
                subject: mapping.vocabularyId,
                synonyms: validSynonyms
            });

            return {
                vocabularyId: mapping.vocabularyId,
                studyMaterialId: result.data.id,
                action: 'created',
                finalSynonyms: result.data.meaning_synonyms || newSynonyms,
                success: true
            };
        }
    } catch (error: any) {
        // Handle 422 validation errors specifically
        if (error?.response?.status === 422) {
            return handle422Error(error, mapping.vocabularyId, newSynonyms);
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
            vocabularyId: mapping.vocabularyId,
            studyMaterialId: mapping.studyMaterialId,
            action: 'error',
            finalSynonyms: [],
            success: false,
            error: errorMessage
        };
    }
}

/**
 * Upload a batch of vocabulary translations to WaniKani
 */
export async function uploadVocabularyBatch(
    vocabularyTranslations: VocabularyTranslation[],
    options: VocabularyUploadOptions,
    stopSignal?: { current: boolean },
    onProgress?: (progress: number) => void
): Promise<BatchUploadResult> {
    const results: UploadResultItem[] = [];
    const errors: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < vocabularyTranslations.length; i++) {
        const { vocabulary, translatedSynonyms } = vocabularyTranslations[i];

        // Check stop signal before processing each item
        if (stopSignal?.current === true) {
            console.log('🛑 Upload processing stopped by user request');
            break;
        }

        try {
            // Find existing study material
            const mapping = await findStudyMaterialForVocabulary(options.apiToken, vocabulary.id);

            // Create or update study material
            const result = await createOrUpdateStudyMaterial(mapping, translatedSynonyms, options);

            results.push(result);

            if (result.success) {
                if (result.action === 'created') createdCount++;
                else if (result.action === 'updated') updatedCount++;
            } else {
                errorCount++;
                if (result.error) errors.push(result.error);
            }

            // Report progress after each upload
            if (onProgress) {
                const progress = Math.round(((i + 1) / vocabularyTranslations.length) * 100);
                onProgress(progress);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const errorResult: UploadResultItem = {
                vocabularyId: vocabulary.id,
                studyMaterialId: null,
                action: 'error',
                finalSynonyms: [],
                success: false,
                error: errorMessage
            };

            results.push(errorResult);
            errors.push(errorMessage);
            errorCount++;
        }
    }

    return {
        success: errorCount === 0,
        totalItems: vocabularyTranslations.length,
        createdCount,
        updatedCount,
        errorCount,
        results,
        errors
    };
}

/**
 * Merge synonyms based on the specified mode
 */
function mergeSynonyms(currentSynonyms: string[], newSynonyms: string[], mode: string): string[] {
    switch (mode) {
        case 'replace':
            return removeDuplicatesCaseInsensitive(newSynonyms);
        case 'delete':
            return currentSynonyms.filter(synonym =>
                !newSynonyms.some(newSyn => newSyn.toLowerCase() === synonym.toLowerCase())
            );
        case 'smart-merge':
        default:
            // Remove duplicates (case-insensitive) and merge
            const combined = [...currentSynonyms, ...newSynonyms];
            return removeDuplicatesCaseInsensitive(combined);
    }
}

/**
 * Remove duplicates case-insensitively, preserving the first occurrence
 */
function removeDuplicatesCaseInsensitive(synonyms: string[]): string[] {
    const seen = new Set<string>();
    return synonyms.filter(synonym => {
        const lowerCase = synonym.toLowerCase().trim();
        if (seen.has(lowerCase)) {
            return false;
        }
        seen.add(lowerCase);
        return true;
    });
}
