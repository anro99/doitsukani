import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios at the top level
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn()
    }
}));

// Mock Bottleneck with proper function handling
vi.mock('bottleneck', () => {
    const mockSchedule = vi.fn().mockImplementation(async (fn: Function | any, ...args: any[]) => {
        // If first argument is a function, call it with remaining args
        if (typeof fn === 'function') {
            return await fn(...args);
        }
        // If first argument is options and second is function
        if (typeof args[0] === 'function') {
            return await args[0](...args.slice(1));
        }
        throw new Error('Mock schedule: no function provided');
    });

    return {
        default: vi.fn().mockImplementation(() => ({
            schedule: mockSchedule
        }))
    };
});

// Import after mocking
import axios from 'axios';
import {
    getVocabularyCount,
    getVocabularyPreview,
    getVocabularyStudyMaterials,
    updateVocabularySynonyms,
    createVocabularySynonyms
} from '../../shared/lib/wanikani';

const mockAxios = axios as any;

describe('🔧 Vocabulary API Functions Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getVocabularyCount Function', () => {
        it('should return vocabulary count for a specific level', async () => {
            const mockResponse = {
                data: {
                    total_count: 85,
                    data: []
                }
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const count = await getVocabularyCount('mock-token', 5);

            expect(count).toBe(85);
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/subjects?types=vocabulary&limit=1&levels=5',
                {
                    headers: {
                        Authorization: 'Bearer mock-token'
                    }
                }
            );
        });

        it('should return vocabulary count for all levels', async () => {
            const mockResponse = {
                data: {
                    total_count: 6355,
                    data: []
                }
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const count = await getVocabularyCount('mock-token');

            expect(count).toBe(6355);
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/subjects?types=vocabulary&limit=1',
                {
                    headers: {
                        Authorization: 'Bearer mock-token'
                    }
                }
            );
        });

        it('should use fallback count for suspiciously low "all levels" count', async () => {
            const mockResponse = {
                data: {
                    total_count: 100, // Suspiciously low for all vocabulary
                    data: []
                }
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const count = await getVocabularyCount('mock-token');

            expect(count).toBe(6355); // Fallback count
        });
    });

    describe('getVocabularyPreview Function', () => {
        it('should return vocabulary preview for a specific level', async () => {
            const mockVocabulary = [
                {
                    id: 1,
                    object: 'vocabulary',
                    data: {
                        characters: '人',
                        meanings: [{ meaning: 'person', primary: true }],
                        readings: [{ reading: 'ひと' }],
                        level: 1
                    }
                }
            ];
            const mockResponse = {
                data: {
                    data: mockVocabulary
                }
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await getVocabularyPreview('mock-token', 1, 12);

            expect(result).toEqual(mockVocabulary);
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/subjects?types=vocabulary&limit=12&levels=1',
                {
                    headers: {
                        Authorization: 'Bearer mock-token'
                    }
                }
            );
        });

        it('should return vocabulary preview for all levels', async () => {
            const mockVocabulary = [
                {
                    id: 1,
                    object: 'vocabulary',
                    data: {
                        characters: '人',
                        meanings: [{ meaning: 'person', primary: true }],
                        readings: [{ reading: 'ひと' }],
                        level: 1
                    }
                }
            ];
            const mockResponse = {
                data: {
                    data: mockVocabulary
                }
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await getVocabularyPreview('mock-token', undefined, 12);

            expect(result).toEqual(mockVocabulary);
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/subjects?types=vocabulary&limit=12',
                {
                    headers: {
                        Authorization: 'Bearer mock-token'
                    }
                }
            );
        });
    });

    describe('getVocabularyStudyMaterials Function', () => {
        it('should return vocabulary study materials', async () => {
            const mockStudyMaterials = [
                {
                    id: 1,
                    object: 'study_material',
                    data: {
                        subject_id: 1,
                        meaning_synonyms: ['human', 'individual']
                    }
                }
            ];
            const mockResponse = {
                data: {
                    data: mockStudyMaterials
                }
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await getVocabularyStudyMaterials('mock-token');

            expect(result).toEqual(mockStudyMaterials);
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/study_materials?subject_types=vocabulary',
                {
                    headers: {
                        Authorization: 'Bearer mock-token'
                    }
                }
            );
        });

        it('should filter by subject_ids when provided', async () => {
            const mockStudyMaterials = [
                {
                    id: 1,
                    object: 'study_material',
                    data: {
                        subject_id: 1,
                        meaning_synonyms: ['human']
                    }
                }
            ];
            const mockResponse = {
                data: {
                    data: mockStudyMaterials
                }
            };
            mockAxios.get.mockResolvedValueOnce(mockResponse);

            const result = await getVocabularyStudyMaterials('mock-token', undefined, {
                subject_ids: '1,2,3'
            });

            expect(result).toEqual(mockStudyMaterials);
            expect(mockAxios.get).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/study_materials?subject_types=vocabulary&subject_ids=1,2,3',
                {
                    headers: {
                        Authorization: 'Bearer mock-token'
                    }
                }
            );
        });
    });

    describe('updateVocabularySynonyms Function', () => {
        it('should update synonyms for existing study material', async () => {
            const mockUpdatedStudyMaterial = {
                id: 1,
                object: 'study_material',
                data: {
                    subject_id: 1,
                    meaning_synonyms: ['human', 'individual', 'person']
                }
            };
            const mockResponse = {
                data: mockUpdatedStudyMaterial
            };
            mockAxios.put.mockResolvedValueOnce(mockResponse);

            const result = await updateVocabularySynonyms('mock-token', 1, ['human', 'individual', 'person']);

            expect(result).toEqual(mockUpdatedStudyMaterial);
            expect(mockAxios.put).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/study_materials/1',
                {
                    study_material: {
                        meaning_synonyms: ['human', 'individual', 'person']
                    }
                },
                {
                    headers: {
                        Authorization: 'Bearer mock-token',
                        'Content-Type': 'application/json'
                    }
                }
            );
        });
    });

    describe('createVocabularySynonyms Function', () => {
        it('should create new synonyms for vocabulary subject', async () => {
            const mockNewStudyMaterial = {
                id: 2,
                object: 'study_material',
                data: {
                    subject_id: 2,
                    meaning_synonyms: ['human', 'individual']
                }
            };
            const mockResponse = {
                data: mockNewStudyMaterial
            };
            mockAxios.post.mockResolvedValueOnce(mockResponse);

            const result = await createVocabularySynonyms('mock-token', 2, ['human', 'individual']);

            expect(result).toEqual(mockNewStudyMaterial);
            expect(mockAxios.post).toHaveBeenCalledWith(
                'https://api.wanikani.com/v2/study_materials',
                {
                    study_material: {
                        subject_id: 2,
                        meaning_synonyms: ['human', 'individual']
                    }
                },
                {
                    headers: {
                        Authorization: 'Bearer mock-token',
                        'Content-Type': 'application/json'
                    }
                }
            );
        });
    });
});
