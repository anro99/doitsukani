import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external dependencies
vi.mock('../../lib/wanikani', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../lib/wanikani')>();
    return {
        ...actual,
        getVocabularyStudyMaterials: vi.fn(),
        createStudyMaterials: vi.fn(),
        updateSynonyms: vi.fn(),
        updateVocabularySynonyms: vi.fn()
    };
});

import {
    findStudyMaterialForVocabulary,
    createOrUpdateStudyMaterial,
    uploadVocabularyBatch,
    type StudyMaterialMapping,
    type VocabularyUploadOptions
} from '../../lib/vocabulary-wanikani-upload';
import * as wanikani from '../../lib/wanikani';
import { VocabularyItem } from '../../lib/vocabulary-translation';

describe('🔴 Phase A.3: WaniKani Upload System (TDD)', () => {
    const mockApiToken = 'test-token';
    const mockVocabularyItems: VocabularyItem[] = [
        {
            id: 1,
            characters: '猫',
            meanings: [{ meaning: 'cat', primary: true }]
        },
        {
            id: 2,
            characters: '犬',
            meanings: [{ meaning: 'dog', primary: true }]
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('findStudyMaterialForVocabulary', () => {
        it('should find existing study material by vocabulary ID', async () => {
            // Arrange
            const mockStudyMaterials = [
                { id: 101, data: { subject_id: 1, meaning_synonyms: ['Hund'] } },
                { id: 102, data: { subject_id: 2, meaning_synonyms: ['Katze'] } }
            ];

            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue(mockStudyMaterials as any);

            // Act
            const result = await findStudyMaterialForVocabulary(mockApiToken, 1);

            // Assert
            expect(result).toEqual({
                vocabularyId: 1,
                studyMaterialId: 101,
                exists: true,
                currentSynonyms: ['Hund']
            });
            expect(wanikani.getVocabularyStudyMaterials).toHaveBeenCalledWith(mockApiToken, undefined, {
                subject_ids: '1'
            });
        });

        it('should return no mapping when study material does not exist', async () => {
            // Arrange
            vi.mocked(wanikani.getVocabularyStudyMaterials).mockResolvedValue([] as any);

            // Act
            const result = await findStudyMaterialForVocabulary(mockApiToken, 1);

            // Assert
            expect(result).toEqual({
                vocabularyId: 1,
                studyMaterialId: null,
                exists: false,
                currentSynonyms: []
            });
        });

        it('should handle API errors gracefully', async () => {
            // Arrange
            vi.mocked(wanikani.getVocabularyStudyMaterials).mockRejectedValue(new Error('API Error'));

            // Act & Assert
            await expect(findStudyMaterialForVocabulary(mockApiToken, 1))
                .rejects.toThrow('Failed to find study material for vocabulary 1: API Error');
        });
    });

    describe('createOrUpdateStudyMaterial', () => {
        it('should update existing study material with new synonyms', async () => {
            // Arrange
            const mapping: StudyMaterialMapping = {
                vocabularyId: 1,
                studyMaterialId: 101,
                exists: true,
                currentSynonyms: ['Hund']
            };
            const translatedSynonyms = ['Katze', 'Kätzchen'];
            const options: VocabularyUploadOptions = {
                synonymMode: 'smart-merge',
                apiToken: mockApiToken
            };

            vi.mocked(wanikani.updateSynonyms).mockResolvedValue({
                data: { meaning_synonyms: ['Hund', 'Katze', 'Kätzchen'] }
            } as any);

            // Act
            const result = await createOrUpdateStudyMaterial(mapping, mockVocabularyItems[0], translatedSynonyms, options);

            // Assert
            expect(result).toEqual({
                vocabularyId: 1,
                studyMaterialId: 101,
                action: 'updated',
                finalSynonyms: ['Hund', 'Katze', 'Kätzchen'],
                success: true
            });
            expect(wanikani.updateSynonyms).toHaveBeenCalledWith(
                mockApiToken,
                expect.any(Object), // Bottleneck limiter
                { id: 101, synonyms: ['Hund', 'Katze', 'Kätzchen'] }
            );
        });

        it('should create new study material when none exists', async () => {
            // Arrange
            const mapping: StudyMaterialMapping = {
                vocabularyId: 1,
                studyMaterialId: null,
                exists: false,
                currentSynonyms: []
            };
            const translatedSynonyms = ['Katze'];
            const options: VocabularyUploadOptions = {
                synonymMode: 'replace',
                apiToken: mockApiToken
            };

            vi.mocked(wanikani.createStudyMaterials).mockResolvedValue({
                data: { id: 103, meaning_synonyms: ['Katze'] }
            } as any);

            // Act
            const result = await createOrUpdateStudyMaterial(mapping, mockVocabularyItems[0], translatedSynonyms, options);

            // Assert
            expect(result).toEqual({
                vocabularyId: 1,
                studyMaterialId: 103,
                action: 'created',
                finalSynonyms: ['Katze'],
                success: true
            });
            expect(wanikani.createStudyMaterials).toHaveBeenCalledWith(
                mockApiToken,
                expect.any(Object), // Bottleneck limiter
                { subject: 1, synonyms: ['Katze'] }
            );
        });

        it('should handle different synonym modes correctly', async () => {
            // Arrange
            const mapping: StudyMaterialMapping = {
                vocabularyId: 1,
                studyMaterialId: 101,
                exists: true,
                currentSynonyms: ['Hund', 'Welpe']
            };
            const translatedSynonyms = ['Katze'];
            const options: VocabularyUploadOptions = {
                synonymMode: 'replace',
                apiToken: mockApiToken
            };

            vi.mocked(wanikani.updateSynonyms).mockResolvedValue({
                data: { meaning_synonyms: ['Katze'] }
            } as any);

            // Act
            await createOrUpdateStudyMaterial(mapping, mockVocabularyItems[0], translatedSynonyms, options);

            // Assert
            expect(wanikani.updateSynonyms).toHaveBeenCalledWith(
                mockApiToken,
                expect.any(Object), // Bottleneck limiter
                { id: 101, synonyms: ['Katze'] } // Should replace, not merge
            );
        });

        it('should handle upload errors gracefully', async () => {
            // Arrange
            const mapping: StudyMaterialMapping = {
                vocabularyId: 1,
                studyMaterialId: 101,
                exists: true,
                currentSynonyms: ['Hund']
            };
            const translatedSynonyms = ['Katze'];
            const options: VocabularyUploadOptions = {
                synonymMode: 'smart-merge',
                apiToken: mockApiToken
            };

            vi.mocked(wanikani.updateSynonyms).mockRejectedValue(new Error('Upload failed'));

            // Act
            const result = await createOrUpdateStudyMaterial(mapping, mockVocabularyItems[0], translatedSynonyms, options);

            // Assert
            expect(result).toEqual({
                vocabularyId: 1,
                studyMaterialId: 101,
                action: 'error',
                finalSynonyms: [],
                success: false,
                error: 'Upload failed'
            });
        });

        it('should handle 422 validation errors with detailed analysis', async () => {
            // Arrange
            const mapping: StudyMaterialMapping = {
                vocabularyId: 1,
                studyMaterialId: 101,
                exists: true,
                currentSynonyms: ['Hund']
            };
            const translatedSynonyms = ['Katze', 'Hund']; // Duplicate that could cause 422
            const options: VocabularyUploadOptions = {
                synonymMode: 'smart-merge',
                apiToken: mockApiToken
            };

            const error422 = {
                response: {
                    status: 422,
                    data: {
                        error: 'Validation failed: meaning_synonyms contains duplicates'
                    }
                }
            };

            vi.mocked(wanikani.updateSynonyms).mockRejectedValue(error422);

            // Act
            const result = await createOrUpdateStudyMaterial(mapping, mockVocabularyItems[0], translatedSynonyms, options);

            // Assert
            expect(result).toEqual({
                vocabularyId: 1,
                studyMaterialId: null,
                action: 'failed',
                finalSynonyms: [],
                success: false,
                error: '422 Validation Error: Validation failed: meaning_synonyms contains duplicates'
            });
        });

        it('should prevent 422 errors by removing case-insensitive duplicates', async () => {
            // Arrange
            const mapping: StudyMaterialMapping = {
                vocabularyId: 1,
                studyMaterialId: 101,
                exists: true,
                currentSynonyms: ['Hund', 'DOG']
            };
            const translatedSynonyms = ['katze', 'KATZE', 'dog']; // Case variations that should be deduplicated
            const options: VocabularyUploadOptions = {
                synonymMode: 'smart-merge',
                apiToken: mockApiToken
            };

            vi.mocked(wanikani.updateSynonyms).mockResolvedValue({
                data: { meaning_synonyms: ['Hund', 'DOG', 'katze'] }
            } as any);

            // Act
            const result = await createOrUpdateStudyMaterial(mapping, mockVocabularyItems[0], translatedSynonyms, options);

            // Assert
            expect(result.success).toBe(true);
            expect(vi.mocked(wanikani.updateSynonyms)).toHaveBeenCalledWith(
                mockApiToken,
                expect.any(Object), // globalLimiter
                expect.objectContaining({
                    id: 101,
                    synonyms: expect.arrayContaining(['Hund', 'DOG', 'katze']) // Should deduplicate case-insensitive
                })
            );

            const calledSynonyms = vi.mocked(wanikani.updateSynonyms).mock.calls[0][2].synonyms;
            expect(calledSynonyms).toHaveLength(3); // Should have removed the duplicate 'KATZE' and 'dog'
        });
    });

    describe('uploadVocabularyBatch', () => {
        it('should upload a batch of vocabulary items with their translations', async () => {
            // Arrange
            const vocabularyTranslations = [
                { vocabulary: mockVocabularyItems[0], translatedSynonyms: ['Katze'] },
                { vocabulary: mockVocabularyItems[1], translatedSynonyms: ['Hund'] }
            ];
            const options: VocabularyUploadOptions = {
                synonymMode: 'smart-merge',
                apiToken: mockApiToken
            };

            // Mock study material finding
            vi.mocked(wanikani.getVocabularyStudyMaterials)
                .mockResolvedValueOnce([] as any) // No existing for vocabulary 1
                .mockResolvedValueOnce([{ id: 102, data: { subject_id: 2, meaning_synonyms: ['Welpe'] } }] as any); // Existing for vocabulary 2

            // Mock create/update operations
            vi.mocked(wanikani.createStudyMaterials).mockResolvedValue({
                data: { id: 104, meaning_synonyms: ['Katze'] }
            } as any);
            vi.mocked(wanikani.updateSynonyms).mockResolvedValue({
                data: { meaning_synonyms: ['Welpe', 'Hund'] }
            } as any);

            // Act
            const result = await uploadVocabularyBatch(vocabularyTranslations, options);

            // Assert
            expect(result).toEqual({
                success: true,
                totalItems: 2,
                createdCount: 1,
                updatedCount: 1,
                errorCount: 0,
                results: [
                    {
                        vocabularyId: 1,
                        studyMaterialId: 104,
                        action: 'created',
                        finalSynonyms: ['Katze'],
                        success: true
                    },
                    {
                        vocabularyId: 2,
                        studyMaterialId: 102,
                        action: 'updated',
                        finalSynonyms: ['Welpe', 'Hund'],
                        success: true
                    }
                ],
                errors: []
            });
        });

        it('should handle mixed success and error scenarios', async () => {
            // Arrange
            const vocabularyTranslations = [
                { vocabulary: mockVocabularyItems[0], translatedSynonyms: ['Katze'] },
                { vocabulary: mockVocabularyItems[1], translatedSynonyms: ['Hund'] }
            ];
            const options: VocabularyUploadOptions = {
                synonymMode: 'replace',
                apiToken: mockApiToken
            };

            // Mock: first succeeds, second fails
            vi.mocked(wanikani.getVocabularyStudyMaterials)
                .mockResolvedValueOnce([] as any)
                .mockRejectedValueOnce(new Error('API Error'));

            vi.mocked(wanikani.createStudyMaterials).mockResolvedValue({
                data: { id: 105, meaning_synonyms: ['Katze'] }
            } as any);

            // Act
            const result = await uploadVocabularyBatch(vocabularyTranslations, options);

            // Assert
            expect(result).toEqual({
                success: false,
                totalItems: 2,
                createdCount: 1,
                updatedCount: 0,
                errorCount: 1,
                results: [
                    {
                        vocabularyId: 1,
                        studyMaterialId: 105,
                        action: 'created',
                        finalSynonyms: ['Katze'],
                        success: true
                    },
                    {
                        vocabularyId: 2,
                        studyMaterialId: null,
                        action: 'error',
                        finalSynonyms: [],
                        success: false,
                        error: 'Failed to find study material for vocabulary 2: API Error'
                    }
                ],
                errors: ['Failed to find study material for vocabulary 2: API Error']
            });
        });
    });
});
