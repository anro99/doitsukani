/**
 * 🎯 Precise Synonym Management Test Suite (TDD)
 * 
 * This test verifies the precise synonym management algorithm with 8-synonym limit.
 * 
 * Requirements:
 * 1. Copy existing synonyms (smart-merge mode)
 * 2. Add primary translation first if not duplicate
 * 3. Add alternative translations in order if not duplicates  
 * 4. Apply case-insensitive duplicate detection
 * 5. Limit to 8 synonyms maximum
 * 6. Only save if changes are required
 */

import { describe, it, expect } from 'vitest';
import {
    processPreciseSynonymManagement,
    type SynonymManagementOptions
} from '../../lib/vocabulary-wanikani-upload';

describe('🎯 Precise Synonym Management (TDD)', () => {
    describe('Step 1-2: Initial Setup and Primary Translation', () => {
        it('should copy existing synonyms and add primary translation (smart-merge mode)', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Hund', 'Tier'],
                translatedSynonyms: ['Hund', 'Hündchen'] // Primary: 'dog' -> 'Hund', Alternative: 'canine' -> 'Hündchen'
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund', 'Tier', 'Hündchen']); // Existing + new non-duplicate
            expect(result.needsUpdate).toBe(true);
            expect(result.changesMade).toBe(true);
        });

        it('should skip duplicates during primary translation addition', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Hund', 'Tier'],
                translatedSynonyms: ['Hund', 'Hündchen'] // First synonym is duplicate
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund', 'Tier', 'Hündchen']); // Only unique synonyms
            expect(result.needsUpdate).toBe(true);
        });
    });

    describe('Step 3: Alternative Translation Handling', () => {
        it('should add alternative translations in order', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Hund'],
                translatedSynonyms: ['Hund', 'Welpe', 'Köter', 'Vierbeiner'] // Multiple alternatives
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund', 'Welpe', 'Köter', 'Vierbeiner']);
            expect(result.needsUpdate).toBe(true);
        });
    });

    describe('Step 4: Case-Insensitive Duplicate Detection', () => {
        it('should prevent duplicates with different cases', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['HUND', 'tier'],
                translatedSynonyms: ['hund', 'TIER', 'Katze'] // Mixed case duplicates
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['HUND', 'tier', 'Katze']); // Only unique (case-insensitive)
            expect(result.needsUpdate).toBe(true);
        });
    });

    describe('Step 5: Replace Mode Support', () => {
        it('should ignore existing synonyms in replace mode', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'replace',
                currentSynonyms: ['ExistingSynonym', 'OldSynonym'],
                translatedSynonyms: ['NewSynonym', 'AnotherNew']
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['NewSynonym', 'AnotherNew']);
            expect(result.needsUpdate).toBe(true);
        });
    });

    describe('Step 6: Delete Mode Support', () => {
        it('should remove specified synonyms in delete mode', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'delete',
                currentSynonyms: ['Keep1', 'Remove1', 'Keep2', 'Remove2'],
                translatedSynonyms: ['Remove1', 'Remove2'] // Synonyms to remove
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Keep1', 'Keep2']);
            expect(result.needsUpdate).toBe(true);
        });

        it('should handle case-insensitive removal in delete mode', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'delete',
                currentSynonyms: ['KEEP', 'remove', 'Another'],
                translatedSynonyms: ['REMOVE', 'another'] // Mixed case
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['KEEP']);
            expect(result.needsUpdate).toBe(true);
        });
    });

    describe('Step 7: 8-Synonym Limit Enforcement', () => {
        it('should limit results to maximum 8 synonyms', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['S1', 'S2', 'S3', 'S4', 'S5'],
                translatedSynonyms: ['S6', 'S7', 'S8', 'S9', 'S10', 'S11'] // Would exceed 8
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toHaveLength(8);
            expect(result.finalSynonyms).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']);
            expect(result.needsUpdate).toBe(true);
        });

        it('should apply limit in delete mode as well', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'delete',
                currentSynonyms: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9'], // 9 synonyms 
                translatedSynonyms: [] // Delete nothing, but should still limit to 8
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toHaveLength(8);
            expect(result.finalSynonyms).toEqual(['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8']);
            expect(result.needsUpdate).toBe(true); // Should update because we're reducing from 9 to 8
        });
    });

    describe('Step 8: Update Detection', () => {
        it('should detect when no update is needed (identical arrays)', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Hund', 'Tier'],
                translatedSynonyms: ['Hund', 'Tier'] // Exact same synonyms
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund', 'Tier']);
            expect(result.needsUpdate).toBe(false); // No change needed
            expect(result.changesMade).toBe(false);
        });

        it('should detect when update is needed (different order or content)', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Tier', 'Hund'], // Different order
                translatedSynonyms: ['Hund', 'Tier']
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Tier', 'Hund']); // Order preserved from existing
            expect(result.needsUpdate).toBe(false); // Same content, different order = no change
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty current synonyms', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: [],
                translatedSynonyms: ['New1', 'New2']
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['New1', 'New2']);
            expect(result.needsUpdate).toBe(true);
        });

        it('should handle empty translated synonyms', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Existing1', 'Existing2'],
                translatedSynonyms: []
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Existing1', 'Existing2']);
            expect(result.needsUpdate).toBe(false);
        });

        it('should handle synonyms with whitespace', () => {
            // Arrange
            const options: SynonymManagementOptions = {
                synonymMode: 'smart-merge',
                currentSynonyms: ['Hund'],
                translatedSynonyms: [' Katze ', '  Vogel  ', 'Hund '] // With whitespace
            };

            // Act
            const result = processPreciseSynonymManagement(options);

            // Assert
            expect(result.finalSynonyms).toEqual(['Hund', 'Katze', 'Vogel']); // Trimmed and deduplicated
            expect(result.needsUpdate).toBe(true);
        });
    });
});
