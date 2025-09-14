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
    action: 'created' | 'updated' | 'error';
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
    console.log(`🚫 Rate limited request failed:`, error);
    if (jobInfo.retryCount < 3) {
        console.log(`⏳ Retrying in ${2000 * (jobInfo.retryCount + 1)}ms...`);
        return 2000 * (jobInfo.retryCount + 1); // Exponential backoff
    }
    return; // Stop retrying after 3 attempts
});

globalLimiter.on("retry", (_error, jobInfo) => {
    console.log(`🔄 Retrying API call (attempt ${jobInfo.retryCount + 1})`);
});

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

            const result = await wanikani.updateSynonyms(options.apiToken, globalLimiter, {
                id: mapping.studyMaterialId,
                synonyms: finalSynonyms
            });

            return {
                vocabularyId: mapping.vocabularyId,
                studyMaterialId: mapping.studyMaterialId,
                action: 'updated',
                finalSynonyms: result.data.meaning_synonyms || finalSynonyms,
                success: true
            };
        } else {
            // Create new study material
            const result = await wanikani.createStudyMaterials(options.apiToken, globalLimiter, {
                subject: mapping.vocabularyId,
                synonyms: newSynonyms
            });

            return {
                vocabularyId: mapping.vocabularyId,
                studyMaterialId: result.data.id,
                action: 'created',
                finalSynonyms: result.data.meaning_synonyms || newSynonyms,
                success: true
            };
        }
    } catch (error) {
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
            return newSynonyms;
        case 'delete':
            return currentSynonyms.filter(synonym => !newSynonyms.includes(synonym));
        case 'smart-merge':
        default:
            // Remove duplicates and merge
            const combined = [...currentSynonyms, ...newSynonyms];
            return Array.from(new Set(combined));
    }
}
