import { describe, it, expect } from 'vitest';
import { processPreciseSynonymManagement } from '../../features/vocabulary/lib/vocabulary-wanikani-upload';

describe('🗑️ DELETE Mode Fix - Remove ALL Synonyms', () => {
    it('should remove all synonyms in DELETE mode, even with empty translatedSynonyms', () => {
        const result = processPreciseSynonymManagement({
            synonymMode: 'delete',
            currentSynonyms: ['existing1', 'existing2', 'existing3'],
            translatedSynonyms: [] // Empty - should still delete ALL
        });

        expect(result.finalSynonyms).toEqual([]);
        expect(result.needsUpdate).toBe(true); // Update is needed to clear synonyms
        expect(result.changesMade).toBe(true);
    });

    it('should not need update if synonyms are already empty in DELETE mode', () => {
        const result = processPreciseSynonymManagement({
            synonymMode: 'delete',
            currentSynonyms: [], // Already empty
            translatedSynonyms: []
        });

        expect(result.finalSynonyms).toEqual([]);
        expect(result.needsUpdate).toBe(false); // No update needed - already empty
        expect(result.changesMade).toBe(false);
    });

    it('should handle DELETE mode with various existing synonyms', () => {
        const testCases = [
            {
                current: ['synonym1'],
                expected: { needsUpdate: true, finalSynonyms: [] }
            },
            {
                current: ['syn1', 'syn2', 'syn3', 'syn4', 'syn5'],
                expected: { needsUpdate: true, finalSynonyms: [] }
            },
            {
                current: [],
                expected: { needsUpdate: false, finalSynonyms: [] }
            }
        ];

        testCases.forEach(({ current, expected }) => {
            const result = processPreciseSynonymManagement({
                synonymMode: 'delete',
                currentSynonyms: current,
                translatedSynonyms: []
            });

            expect(result.finalSynonyms).toEqual(expected.finalSynonyms);
            expect(result.needsUpdate).toBe(expected.needsUpdate);
        });
    });

    it('should ignore translatedSynonyms in DELETE mode - always clear all', () => {
        const result = processPreciseSynonymManagement({
            synonymMode: 'delete',
            currentSynonyms: ['keep1', 'keep2', 'remove1', 'remove2'],
            translatedSynonyms: ['remove1', 'remove2'] // Should be ignored - DELETE ALL
        });

        // In DELETE mode, ALL synonyms should be removed regardless of translatedSynonyms
        expect(result.finalSynonyms).toEqual([]);
        expect(result.needsUpdate).toBe(true);
        expect(result.changesMade).toBe(true);
    });
});
