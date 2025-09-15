/**
 * TDD Tests für präzise Synonym-Management mit 8-Synonyme-Limit
 * 
 * Spezifikation:
 * 1. Vorhandene Synonyme kopieren (außer bei "replace" Modus)
 * 2. Primary-Bedeutung übersetzen und hinzufügen
 * 3. Alternative-Bedeutungen iterativ übersetzen und hinzufügen
 * 4. Maximal 8 Synonyme beibehalten
 * 5. Case-insensitive Vergleich, aber case-preserving beim Hinzufügen
 * 6. Nur speichern wenn Änderung erforderlich
 */

import { describe, it, expect } from 'vitest';
import {
    processPreciseSynonymManagement,
    type SynonymManagementOptions,
    type SynonymManagementResult
} from '../../lib/vocabulary-wanikani-upload';
import type { VocabularyItem } from '../../lib/vocabulary-translation';

describe('🎯 Precise Synonym Management (TDD)', () => {
    describe('Step 1-2: Initial Setup and Primary Translation', () => {
        it('should copy existing synonyms and add primary translation (smart-merge mode)', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [
                    { meaning: 'dog', primary: true },
                    { meaning: 'canine', primary: false }
                ]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Hund', 'Tier'],
                translatedSynonyms: ['Hund', 'Hündchen'] // Primary: 'dog' -> 'Hund', Alternative: 'canine' -> 'Hündchen'
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund', 'Tier', 'Hündchen']); // Existing + new non-duplicate
            expect(result.needsUpdate).toBe(true);
            expect(result.changesMade).toBe(true);
        });

        it('should ignore existing synonyms in replace mode', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'replace',
                currentSynonyms: ['AltesSynonym'],
                translatedSynonyms: ['Hund']
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund']); // Only new translation, ignoring existing
            expect(result.needsUpdate).toBe(true);
        });
    });

    describe('Step 3-6: Case-insensitive Duplicate Detection', () => {
        it('should avoid adding case-insensitive duplicates but preserve original case', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [
                    { meaning: 'dog', primary: true },
                    { meaning: 'canine', primary: false }
                ]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['HUND', 'tier'],
                translatedSynonyms: ['hund', 'Hündchen'] // 'hund' should be skipped (case-insensitive duplicate)
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toEqual(['HUND', 'tier', 'Hündchen']); // Preserve original case, skip duplicate
        });

        it('should process alternatives in order until 8 synonyms reached', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [
                    { meaning: 'dog', primary: true },
                    { meaning: 'canine', primary: false },
                    { meaning: 'puppy', primary: false },
                    { meaning: 'hound', primary: false },
                    { meaning: 'mutt', primary: false }
                ]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Synonym1', 'Synonym2', 'Synonym3'], // 3 existing
                translatedSynonyms: ['Hund', 'Hündchen', 'Welpe', 'Jagdhund', 'Mischling'] // Primary + 4 alternatives
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toHaveLength(8); // Should be limited to 8
            expect(result.finalSynonyms).toEqual([
                'Synonym1', 'Synonym2', 'Synonym3', // Existing (3)
                'Hund', 'Hündchen', 'Welpe', 'Jagdhund', 'Mischling' // New (5) = Total 8
            ]);
        });
    });

    describe('Step 8: No-Update Detection', () => {
        it('should detect when no update is needed (synonyms match exactly)', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Hund', 'Tier'],
                translatedSynonyms: ['Hund'] // Already exists
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund', 'Tier']); // No change
            expect(result.needsUpdate).toBe(false); // No update needed
            expect(result.changesMade).toBe(false);
        });

        it('should detect when update is needed (synonyms differ)', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['AltesWort'],
                translatedSynonyms: ['Hund']
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toEqual(['AltesWort', 'Hund']);
            expect(result.needsUpdate).toBe(true);
            expect(result.changesMade).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty existing synonyms', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: [],
                translatedSynonyms: ['Hund']
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund']);
            expect(result.needsUpdate).toBe(true);
        });

        it('should handle more than 8 existing synonyms by truncating', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10'], // 10 existing
                translatedSynonyms: ['Hund']
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toHaveLength(8);
            expect(result.finalSynonyms).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']); // First 8, new one doesn't fit
        });

        it('should handle delete mode by removing translated synonyms', () => {
            // Arrange
            const vocabulary: VocabularyItem = {
                id: 1,
                characters: '犬',
                meanings: [{ meaning: 'dog', primary: true }]
            };

            const options: SynonymManagementOptions = {
                synonymMode: 'delete',
                currentSynonyms: ['Hund', 'Tier', 'Welpe'],
                translatedSynonyms: ['Hund', 'Welpe'] // Remove these
            };

            // Act
            const result = processPreciseSynonymManagement(vocabulary, options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Tier']); // Only 'Tier' remains
            expect(result.needsUpdate).toBe(true);
        });
    });
});
