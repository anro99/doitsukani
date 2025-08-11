import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRadicalsManager } from '../../hooks/useRadicalsManager';
import * as wanikaniModule from '../../lib/wanikani';

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock Bottleneck
vi.mock('bottleneck', () => {
    const MockBottleneck = vi.fn().mockImplementation(() => ({
        schedule: vi.fn((fn) => fn()),
    }));
    return {
        default: MockBottleneck,
    };
});

// Mock API modules
vi.mock('../../lib/wanikani', () => ({
    getRadicals: vi.fn(),
    getRadicalStudyMaterials: vi.fn(),
    createRadicalSynonyms: vi.fn(),
    updateRadicalSynonyms: vi.fn(),
}));

vi.mock('../../lib/deepl', () => ({
    translateText: vi.fn(),
}));

vi.mock('../../lib/contextual-translation', () => ({
    extractContextFromMnemonic: vi.fn().mockReturnValue('test context'),
}));

/**
 * Tests for the critical Study Material ID Fix
 * 
 * This test suite validates the fix for the 404 error bug where the system was
 * incorrectly using radical.id (subject_id) instead of studyMaterial.id 
 * when updating existing study materials.
 * 
 * The fix ensures:
 * - CREATE operations use radical.id (subject_id) ✅ - was already correct
 * - UPDATE operations use existingStudyMaterial.id (study_material_id) ✅ - the critical fix
 */
describe('Study Material ID Fix Validation', () => {
    const mockRadicals: any[] = [
        {
            id: 64, // subject_id from original error logs
            object: 'radical',
            url: 'https://api.wanikani.com/v2/subjects/64',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                level: 1,
                meanings: [{ meaning: 'Origin', primary: true, accepted_answer: true }],
                characters: '原',
                meaning_mnemonic: 'Test mnemonic',
                character_images: []
            }
        },
        {
            id: 74, // subject_id from original error logs
            object: 'radical',
            url: 'https://api.wanikani.com/v2/subjects/74',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                level: 2,
                meanings: [{ meaning: 'Measurement', primary: true, accepted_answer: true }],
                characters: '量',
                meaning_mnemonic: 'Test mnemonic',
                character_images: []
            }
        }
    ];

    // Mock existing study materials
    const mockExistingStudyMaterials: any[] = [
        {
            id: 1000, // DIFFERENT from subject_id (64) - this is the study_material_id
            object: 'study_material',
            url: 'https://api.wanikani.com/v2/study_materials/1000',
            data_updated_at: '2023-01-01T00:00:00.000000Z',
            data: {
                subject_id: 64, // Points to radical with id 64
                subject_type: 'radical',
                meaning_note: null,
                reading_note: null,
                meaning_synonyms: ['existing-synonym'],
                hidden: false,
                created_at: '2023-01-01T00:00:00.000000Z'
            }
        }
        // Note: No existing study material for subject_id 74, so it should be created
    ];

    const mockStudyMaterialResponse: any = {
        id: 2000,
        object: 'study_material',
        url: 'https://api.wanikani.com/v2/study_materials/2000',
        data_updated_at: '2023-01-01T00:00:00.000000Z',
        data: {
            subject_id: 74,
            subject_type: 'radical',
            meaning_note: null,
            reading_note: null,
            meaning_synonyms: ['new-synonym'],
            hidden: false,
            created_at: '2023-01-01T00:00:00.000000Z'
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockImplementation((key) => {
            if (key === 'wanikani-api-token') return 'test-api-token';
            if (key === 'deepl-api-token') return 'test-deepl-token';
            return '';
        });

        vi.mocked(wanikaniModule.getRadicals).mockResolvedValue(mockRadicals);
        vi.mocked(wanikaniModule.getRadicalStudyMaterials).mockResolvedValue(mockExistingStudyMaterials);
        vi.mocked(wanikaniModule.createRadicalSynonyms).mockResolvedValue(mockStudyMaterialResponse);
        vi.mocked(wanikaniModule.updateRadicalSynonyms).mockResolvedValue(mockStudyMaterialResponse);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Study Material ID Logic', () => {
        it('should use correct IDs for create vs update operations', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            // Wait for initial data load
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Verify the data is loaded correctly
            expect(result.current.wkRadicals).toEqual(mockRadicals);
            expect(result.current.studyMaterials).toEqual(mockExistingStudyMaterials);

            // Get filtered radicals - mock DeepL translation call
            vi.mocked(wanikaniModule.createRadicalSynonyms).mockClear();
            vi.mocked(wanikaniModule.updateRadicalSynonyms).mockClear();

            // Get the radical that has existing study material (subject_id 64 -> study_material_id 1000)
            const radicals = result.current.filteredRadicals.map(radical => ({
                ...radical,
                selected: true,
                translatedSynonyms: ['updated-synonym']
            }));

            // Mock DeepL translation
            vi.mocked(require('../../lib/deepl').translateText).mockResolvedValue('updated-synonym');

            // Process translations - this should trigger UPDATE for existing study material
            await act(async () => {
                await result.current.processTranslations(radicals);
            });

            // CRITICAL VALIDATION: Verify UPDATE uses study_material.id (1000), not subject_id (64)
            expect(wanikaniModule.updateRadicalSynonyms).toHaveBeenCalledWith(
                'test-api-token',
                1000, // Should use study_material.id, NOT subject_id (64)
                ['updated-synonym']
            );

            // Verify CREATE operations would use subject_id (this scenario would happen with radical 74)
            // Note: In this test, radical 74 is level 2, so it's filtered out by default selectedLevel=1
        });

        it('should handle CREATE operations with correct subject_id', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            // Set level to 'all' to include both radicals
            act(() => {
                result.current.setSelectedLevel('all');
            });

            // Wait for initial data load
            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Get all radicals
            const allRadicals = result.current.filteredRadicals;
            expect(allRadicals).toHaveLength(2);

            // Set up radical 74 (Measurement) with translations - this should trigger CREATE
            const radical74 = allRadicals.find(r => r.id === 74);
            expect(radical74).toBeDefined();
            expect(radical74?.currentSynonyms).toEqual([]); // No existing study material

            const radicalsWithTranslations = [{
                ...radical74!,
                selected: true,
                translatedSynonyms: ['new-measurement-synonym']
            }];

            // Process translations
            await act(async () => {
                await result.current.processTranslations(radicalsWithTranslations);
            });

            // CRITICAL VALIDATION: Verify CREATE uses subject_id (74)
            expect(wanikaniModule.createRadicalSynonyms).toHaveBeenCalledWith(
                'test-api-token',
                74, // Should use subject_id for CREATE operations
                ['new-measurement-synonym']
            );
        });

        it('should correctly identify existing vs new study materials', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.setSelectedLevel('all');
            });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            const allRadicals = result.current.filteredRadicals;

            // Radical with subject_id 64 should have existing synonyms
            const radical64 = allRadicals.find(r => r.id === 64);
            expect(radical64?.currentSynonyms).toEqual(['existing-synonym']);

            // Radical with subject_id 74 should have no existing synonyms
            const radical74 = allRadicals.find(r => r.id === 74);
            expect(radical74?.currentSynonyms).toEqual([]);
        });

        it('should prevent 404 errors by using correct study material IDs', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Simulate the scenario that was causing 404 errors
            const radicals = result.current.filteredRadicals.map(radical => ({
                ...radical,
                selected: true,
                translatedSynonyms: ['test-synonym']
            }));

            await act(async () => {
                await result.current.processTranslations(radicals);
            });

            // Verify that updateRadicalSynonyms was called with the study_material ID, not subject ID
            const updateCalls = vi.mocked(wanikaniModule.updateRadicalSynonyms).mock.calls;
            expect(updateCalls).toHaveLength(1);

            const [apiToken, studyMaterialId, synonyms] = updateCalls[0];
            expect(apiToken).toBe('test-api-token');
            expect(studyMaterialId).toBe(1000); // study_material.id
            expect(studyMaterialId).not.toBe(64); // NOT subject_id
            expect(synonyms).toEqual(['test-synonym']);
        });
    });

    describe('Error Prevention', () => {
        it('should not call update with subject_id (the original bug)', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            const radicals = result.current.filteredRadicals.map(radical => ({
                ...radical,
                selected: true,
                translatedSynonyms: ['test']
            }));

            await act(async () => {
                await result.current.processTranslations(radicals);
            });

            // CRITICAL: Verify the bug is fixed - should NEVER call update with subject_id
            const updateCalls = vi.mocked(wanikaniModule.updateRadicalSynonyms).mock.calls;

            updateCalls.forEach(([, studyMaterialId]) => {
                // All update calls should use study_material IDs (1000+), never subject IDs (64, 74, etc.)
                expect(studyMaterialId).toBeGreaterThanOrEqual(1000);
                expect(studyMaterialId).not.toBe(64); // Original problematic subject_id
                expect(studyMaterialId).not.toBe(74); // Original problematic subject_id
            });
        });

        it('should handle mixed create/update scenarios correctly', async () => {
            // Add one more study material to test mixed scenarios
            const mixedStudyMaterials = [
                ...mockExistingStudyMaterials,
                {
                    id: 1001, // Different study_material ID
                    object: 'study_material',
                    url: 'https://api.wanikani.com/v2/study_materials/1001',
                    data_updated_at: '2023-01-01T00:00:00.000000Z',
                    data: {
                        subject_id: 74, // Now radical 74 also has existing study material
                        subject_type: 'radical',
                        meaning_synonyms: ['old-measurement'],
                        hidden: false,
                        created_at: '2023-01-01T00:00:00.000000Z'
                    }
                }
            ];

            vi.mocked(wanikaniModule.getRadicalStudyMaterials).mockResolvedValue(mixedStudyMaterials);

            const { result } = renderHook(() => useRadicalsManager());

            act(() => {
                result.current.setSelectedLevel('all');
            });

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Now both radicals should have existing synonyms
            const allRadicals = result.current.filteredRadicals;
            expect(allRadicals).toHaveLength(2);

            const radical64 = allRadicals.find(r => r.id === 64);
            const radical74 = allRadicals.find(r => r.id === 74);

            expect(radical64?.currentSynonyms).toEqual(['existing-synonym']);
            expect(radical74?.currentSynonyms).toEqual(['old-measurement']);

            // Process both radicals
            const radicalsWithTranslations = allRadicals.map(radical => ({
                ...radical,
                selected: true,
                translatedSynonyms: [`updated-${radical.meaning.toLowerCase()}`]
            }));

            await act(async () => {
                await result.current.processTranslations(radicalsWithTranslations);
            });

            // Verify both updates use correct study_material IDs
            const updateCalls = vi.mocked(wanikaniModule.updateRadicalSynonyms).mock.calls;
            expect(updateCalls).toHaveLength(2);

            // First call should update radical 64's study material (id 1000)
            expect(updateCalls[0][1]).toBe(1000);
            expect(updateCalls[0][2]).toEqual(['updated-origin']);

            // Second call should update radical 74's study material (id 1001)  
            expect(updateCalls[1][1]).toBe(1001);
            expect(updateCalls[1][2]).toEqual(['updated-measurement']);

            // Verify no CREATE calls were made (since both have existing study materials)
            expect(vi.mocked(wanikaniModule.createRadicalSynonyms)).not.toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle radicals with no existing study materials', async () => {
            // Mock scenario with no existing study materials
            vi.mocked(wanikaniModule.getRadicalStudyMaterials).mockResolvedValue([]);

            const { result } = renderHook(() => useRadicalsManager());

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            const radicals = result.current.filteredRadicals.map(radical => ({
                ...radical,
                selected: true,
                translatedSynonyms: ['new-synonym']
            }));

            await act(async () => {
                await result.current.processTranslations(radicals);
            });

            // Should only call CREATE, never UPDATE
            expect(wanikaniModule.createRadicalSynonyms).toHaveBeenCalledWith(
                'test-api-token',
                64, // subject_id for CREATE
                ['new-synonym']
            );
            expect(wanikaniModule.updateRadicalSynonyms).not.toHaveBeenCalled();
        });

        it('should handle empty synonyms correctly', async () => {
            const { result } = renderHook(() => useRadicalsManager());

            await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 100));
            });

            // Set delete mode
            act(() => {
                result.current.setSynonymMode('delete');
            });

            const radicals = result.current.filteredRadicals.map(radical => ({
                ...radical,
                selected: true,
                translatedSynonyms: [] // Empty synonyms for delete mode
            }));

            await act(async () => {
                await result.current.processTranslations(radicals);
            });

            // Should still call UPDATE with correct study_material ID and empty array
            expect(wanikaniModule.updateRadicalSynonyms).toHaveBeenCalledWith(
                'test-api-token',
                1000, // study_material.id, not subject_id
                []
            );
        });
    });
});
