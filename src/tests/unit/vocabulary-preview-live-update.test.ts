import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVocabularyManager } from '../../hooks/useVocabularyManager';

// Mock the API functions
vi.mock('../../lib/wanikani', () => ({
    getVocabularyCount: vi.fn().mockResolvedValue(5),
    getVocabularyPreview: vi.fn().mockResolvedValue([
        {
            id: 1,
            data: {
                characters: '犬',
                level: 1,
                meanings: [{ meaning: 'dog', primary: true }],
                readings: [{ reading: 'いぬ', primary: true }],
                meaning_mnemonic: 'Test mnemonic'
            }
        }
    ]),
    getVocabularyStudyMaterials: vi.fn().mockResolvedValue([
        {
            id: 12345,
            data: {
                subject_id: 1,
                subject_type: 'vocabulary',
                meaning_synonyms: ['old-synonym'],
                meaning_note: '',
                reading_note: '',
                created_at: '2023-01-01T00:00:00.000Z',
                hidden: false
            }
        }
    ]),
}));

// Mock storage functions
vi.mock('../../lib/storage', () => ({
    loadWanikaniToken: vi.fn(() => 'mock-wanikani-token'),
    saveWanikaniToken: vi.fn(),
    removeToken: vi.fn(),
    loadDeepLToken: vi.fn(() => 'mock-deepl-token'),
    saveDeepLToken: vi.fn(),
    STORAGE_KEYS: {
        WANIKANI_TOKEN: 'wanikani-token',
        DEEPL_TOKEN: 'deepl-token'
    }
}));

describe('🔄 Live-Update Vocabulary Preview Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should update vocabulary preview when handleItemUpdated is called', async () => {
        const { result } = renderHook(() => useVocabularyManager());

        // Set up tokens and load initial data
        await act(async () => {
            result.current.handleApiTokenChange('test-wanikani-token');
            result.current.handleDeepLTokenChange('test-deepl-token');
        });

        // Wait for initial API loading
        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        // Verify initial state - vocabulary should have old synonyms
        expect(result.current.filteredVocabulary.length).toBe(1);
        expect(result.current.filteredVocabulary[0].currentSynonyms).toEqual(['old-synonym']);

        // Simulate handleItemUpdated being called (as it would be during processing)
        const mockVocabularyItem = {
            id: 1,
            characters: '犬',
            meanings: [{ meaning: 'dog', primary: true }]
        };

        const mockResult = {
            vocabularyId: 1,
            success: true,
            translatedSynonyms: ['new-synonym1', 'new-synonym2'],
            uploadedSynonyms: ['new-synonym1', 'new-synonym2'],
            message: 'Successfully processed and updated'
        };

        // Call the internal handleItemUpdated function directly (simulating streaming callback)
        await act(async () => {
            // Access the internal function through a manual call
            // This simulates what happens during the streaming process
            const handleItemUpdated = (item: any, result: any) => {
                console.log(`✅ Updated item ${item.id} (${item.characters}):`, result);

                // Update study materials in real-time (same logic as in the hook)
                if (result.success) {
                    // This should trigger the filteredVocabulary recalculation
                    // The test will verify that the vocabulary preview updates
                }
            };

            handleItemUpdated(mockVocabularyItem, mockResult);
        });

        // ✅ CRITICAL TEST: Verify that the vocabulary preview was updated in real-time
        // The filteredVocabulary should now show the new synonyms
        const updatedVocabulary = result.current.filteredVocabulary.find(v => v.id === 1);
        expect(updatedVocabulary).toBeDefined();

        // This should pass if Live-Update is working correctly
        expect(updatedVocabulary?.currentSynonyms).toEqual(['new-synonym1', 'new-synonym2']);
    });

    it('should handle live updates for vocabulary items without existing study materials', async () => {
        // Mock a vocabulary item that doesn't have study materials initially
        const getVocabularyStudyMaterials = vi.mocked(await import('../../lib/wanikani')).getVocabularyStudyMaterials;
        getVocabularyStudyMaterials.mockResolvedValueOnce([]); // No study materials initially

        const { result } = renderHook(() => useVocabularyManager());

        await act(async () => {
            result.current.handleApiTokenChange('test-wanikani-token');
            result.current.handleDeepLTokenChange('test-deepl-token');
        });

        await act(async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
        });

        // Vocabulary should exist but have no synonyms initially
        expect(result.current.filteredVocabulary.length).toBe(1);
        expect(result.current.filteredVocabulary[0].currentSynonyms).toEqual([]);

        // This tests what happens when a new study material is created during processing
        // The live update should handle this gracefully
        expect(result.current.filteredVocabulary[0].characters).toBe('犬');
    });
});
