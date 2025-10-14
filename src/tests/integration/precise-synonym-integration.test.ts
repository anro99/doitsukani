/**
 * Integration test for the new precise synonym management system.
 * This test demonstrates the enhanced functionality with 8-synonym limit
 * and improved duplicate handling.
 */

import { describe, test, expect } from 'vitest';
import {
    processPreciseSynonymManagement,
    type StudyMaterialMapping
} from '../../../src/features/vocabulary/lib/vocabulary-wanikani-upload';

describe('🎯 Precise Synonym Management - Integration Tests', () => {

    test('should limit synonyms to 8 with proper ordering', () => {
        const mapping: StudyMaterialMapping = {
            vocabularyId: 1,
            exists: true,
            studyMaterialId: 123,
            currentSynonyms: ['Buch', 'Werk'] // 2 existing
        };

        // 10 new translated synonyms - should be truncated to fit in 8 total
        const translatedSynonyms = [
            'book', 'Buch', 'Band', 'Ausgabe', 'Publikation',
            'Schrift', 'Druckwerk', 'Titel', 'Exemplar', 'Werk'
        ];

        const result = processPreciseSynonymManagement({
            synonymMode: 'smart-merge',
            currentSynonyms: mapping.currentSynonyms,
            translatedSynonyms
        });

        expect(result.finalSynonyms).toHaveLength(8);

        // Should start with existing synonyms
        expect(result.finalSynonyms[0]).toBe('Buch');
        expect(result.finalSynonyms[1]).toBe('Werk');

        // Should include primary translation
        expect(result.finalSynonyms[2]).toBe('book');

        // Should have exactly 8 synonyms
        expect(result.finalSynonyms.length).toBe(8);

        // Should not contain case-insensitive duplicates
        const lowerCaseSynonyms = result.finalSynonyms.map(s => s.toLowerCase());
        const uniqueLowerCase = [...new Set(lowerCaseSynonyms)];
        expect(lowerCaseSynonyms).toHaveLength(uniqueLowerCase.length);
    });

    test('should detect when no update is needed', () => {
        const mapping: StudyMaterialMapping = {
            vocabularyId: 1,
            exists: true,
            studyMaterialId: 123,
            currentSynonyms: ['book', 'Buch', 'Band']
        };

        const translatedSynonyms = ['book', 'Buch', 'Band']; // Exact match

        const result = processPreciseSynonymManagement({
            synonymMode: 'smart-merge',
            currentSynonyms: mapping.currentSynonyms,
            translatedSynonyms
        });

        expect(result.needsUpdate).toBe(false);
        expect(result.finalSynonyms).toEqual(['book', 'Buch', 'Band']);
    });

    test('should handle replace mode correctly', () => {
        const mapping: StudyMaterialMapping = {
            vocabularyId: 1,
            exists: true,
            studyMaterialId: 123,
            currentSynonyms: ['old1', 'old2', 'old3']
        };

        const translatedSynonyms = ['book', 'Buch', 'Band'];

        const result = processPreciseSynonymManagement({
            synonymMode: 'replace',
            currentSynonyms: mapping.currentSynonyms,
            translatedSynonyms
        });

        expect(result.needsUpdate).toBe(true);
        expect(result.finalSynonyms).toEqual(['book', 'Buch', 'Band']);
        expect(result.finalSynonyms).not.toContain('old1');
        expect(result.finalSynonyms).not.toContain('old2');
        expect(result.finalSynonyms).not.toContain('old3');
    });

    test('should handle delete mode correctly (DELETE ALL behavior)', () => {
        const mapping: StudyMaterialMapping = {
            vocabularyId: 1,
            exists: true,
            studyMaterialId: 123,
            currentSynonyms: ['book', 'Buch', 'Band', 'Werk', 'other']
        };

        const translatedSynonyms = ['book', 'Buch']; // Ignored in DELETE mode

        const result = processPreciseSynonymManagement({
            synonymMode: 'delete',
            currentSynonyms: mapping.currentSynonyms,
            translatedSynonyms
        });

        expect(result.needsUpdate).toBe(true);
        expect(result.finalSynonyms).toEqual([]); // DELETE ALL - empty array
        expect(result.finalSynonyms).toHaveLength(0);
    });

    test('should preserve case in duplicates', () => {
        const mapping: StudyMaterialMapping = {
            vocabularyId: 1,
            exists: true,
            studyMaterialId: 123,
            currentSynonyms: ['Book'] // Capital B
        };

        const translatedSynonyms = ['book', 'BOOK', 'bOOk', 'Buch']; // Various cases

        const result = processPreciseSynonymManagement({
            synonymMode: 'smart-merge',
            currentSynonyms: mapping.currentSynonyms,
            translatedSynonyms
        });

        expect(result.finalSynonyms).toContain('Book'); // Preserves existing case
        expect(result.finalSynonyms).toContain('Buch'); // New, non-duplicate synonym
        expect(result.finalSynonyms).not.toContain('book'); // Filtered as case-insensitive duplicate
        expect(result.finalSynonyms).not.toContain('BOOK'); // Filtered as case-insensitive duplicate
        expect(result.finalSynonyms).not.toContain('bOOk'); // Filtered as case-insensitive duplicate

        // Should only have 2 synonyms: Book (existing, case preserved) + Buch (new)
        // Primary translation 'book' is filtered out as case-insensitive duplicate of 'Book'
        expect(result.finalSynonyms.length).toBe(2);
    });
});
