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
        const studyMaterials = await wanikani.getStudyMaterials(apiToken);

        const existingMaterial = studyMaterials.find(
            material => material.data.subject_id === vocabularyId
        );

        if (existingMaterial) {
            return {
                vocabularyId,
                studyMaterialId: existingMaterial.id,
                exists: true,
                currentSynonyms: existingMaterial.data.meaning_synonyms || []
            };
        }

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
export async function createOrUpdateStudyMaterial(
    mapping: StudyMaterialMapping,
    newSynonyms: string[],
    options: VocabularyUploadOptions
): Promise<UploadResultItem> {
    const limiter = new Bottleneck({
        minTime: 5000, // Conservative rate limiting for testing
        maxConcurrent: 1
    });

    try {
        if (mapping.exists && mapping.studyMaterialId) {
            // Update existing study material
            const finalSynonyms = mergeSynonyms(mapping.currentSynonyms, newSynonyms, options.synonymMode);

            const result = await wanikani.updateSynonyms(options.apiToken, limiter, {
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
            const result = await wanikani.createStudyMaterials(options.apiToken, limiter, {
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
    stopSignal?: { current: boolean }
): Promise<BatchUploadResult> {
    const results: UploadResultItem[] = [];
    const errors: string[] = [];
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const { vocabulary, translatedSynonyms } of vocabularyTranslations) {
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
