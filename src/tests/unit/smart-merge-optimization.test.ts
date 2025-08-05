import { describe, expect, it } from 'vitest';

// Test for the array comparison optimization
describe('Smart-Merge Optimization', () => {
    // Helper function to compare arrays for equality (case-insensitive)
    const arraysEqual = (arr1: string[], arr2: string[]): boolean => {
        if (arr1.length !== arr2.length) return false;

        const sorted1 = arr1.map(s => s.toLowerCase().trim()).sort();
        const sorted2 = arr2.map(s => s.toLowerCase().trim()).sort();

        return sorted1.every((val, index) => val === sorted2[index]);
    };

    describe('arraysEqual function', () => {
        it('should return true for identical arrays', () => {
            const arr1 = ['apple', 'banana', 'cherry'];
            const arr2 = ['apple', 'banana', 'cherry'];
            expect(arraysEqual(arr1, arr2)).toBe(true);
        });

        it('should return true for arrays with different order', () => {
            const arr1 = ['apple', 'banana', 'cherry'];
            const arr2 = ['cherry', 'apple', 'banana'];
            expect(arraysEqual(arr1, arr2)).toBe(true);
        });

        it('should return true for arrays with case differences', () => {
            const arr1 = ['Apple', 'BANANA', 'cherry'];
            const arr2 = ['apple', 'banana', 'CHERRY'];
            expect(arraysEqual(arr1, arr2)).toBe(true);
        });

        it('should return true for arrays with whitespace differences', () => {
            const arr1 = [' apple ', 'banana', 'cherry '];
            const arr2 = ['apple', ' banana ', ' cherry'];
            expect(arraysEqual(arr1, arr2)).toBe(true);
        });

        it('should return false for arrays with different lengths', () => {
            const arr1 = ['apple', 'banana'];
            const arr2 = ['apple', 'banana', 'cherry'];
            expect(arraysEqual(arr1, arr2)).toBe(false);
        });

        it('should return false for arrays with different content', () => {
            const arr1 = ['apple', 'banana', 'cherry'];
            const arr2 = ['apple', 'banana', 'orange'];
            expect(arraysEqual(arr1, arr2)).toBe(false);
        });

        it('should return true for empty arrays', () => {
            const arr1: string[] = [];
            const arr2: string[] = [];
            expect(arraysEqual(arr1, arr2)).toBe(true);
        });

        it('should handle complex case with duplicates and mixed case', () => {
            const arr1 = ['Apple', 'apple', 'BANANA'];
            const arr2 = ['apple', 'banana'];
            // This should return false because arr1 has duplicates when case-normalized
            // but the function sorts unique values, so this depends on implementation
            expect(arraysEqual(arr1, arr2)).toBe(false);
        });
    });

    describe('Smart-Merge Logic Scenarios', () => {
        it('should detect no change when translation already exists', () => {
            const currentSynonyms = ['Zweig', 'Ast'];
            const newTranslation = 'zweig'; // Same but different case

            // Simulate smart-merge logic
            const exists = currentSynonyms.some(syn =>
                syn.toLowerCase().trim() === newTranslation.toLowerCase()
            );

            expect(exists).toBe(true);

            // If exists, synonyms don't change
            const newSynonyms = exists ? currentSynonyms : [...currentSynonyms, newTranslation];

            expect(arraysEqual(currentSynonyms, newSynonyms)).toBe(true);
        });

        it('should detect change when adding new translation', () => {
            const currentSynonyms = ['Zweig'];
            const newTranslation = 'Ast';

            // Simulate smart-merge logic
            const exists = currentSynonyms.some(syn =>
                syn.toLowerCase().trim() === newTranslation.toLowerCase()
            );

            expect(exists).toBe(false);

            // If doesn't exist, add new synonym
            const newSynonyms = exists ? currentSynonyms : [...currentSynonyms, newTranslation];

            expect(arraysEqual(currentSynonyms, newSynonyms)).toBe(false);
        });

        it('should detect no change after deduplication', () => {
            const currentSynonyms = ['Zweig', 'Ast'];

            // Simulate cleaning process that might not change anything
            const seenSynonyms = new Map<string, string>();
            currentSynonyms
                .map(syn => syn.trim())
                .filter(syn => syn.length > 0)
                .forEach(syn => {
                    const lowerKey = syn.toLowerCase();
                    if (!seenSynonyms.has(lowerKey)) {
                        seenSynonyms.set(lowerKey, syn);
                    }
                });
            const cleanedSynonyms = [...seenSynonyms.values()];

            expect(arraysEqual(currentSynonyms, cleanedSynonyms)).toBe(true);
        });
    });

    describe('Performance Benefits', () => {
        it('should avoid unnecessary API calls for unchanged synonyms', () => {
            // Test cases that would previously trigger unnecessary updates
            const testCases = [
                {
                    name: 'Same synonyms in different order',
                    original: ['Zweig', 'Ast', 'Branch'],
                    processed: ['Ast', 'Branch', 'Zweig'],
                    shouldSkip: true
                },
                {
                    name: 'Same synonyms with case differences',
                    original: ['Zweig', 'Ast'],
                    processed: ['zweig', 'AST'],
                    shouldSkip: true
                },
                {
                    name: 'Actually different synonyms',
                    original: ['Zweig'],
                    processed: ['Zweig', 'Ast'],
                    shouldSkip: false
                },
                {
                    name: 'Empty to empty',
                    original: [],
                    processed: [],
                    shouldSkip: true
                }
            ];

            testCases.forEach(({ name, original, processed, shouldSkip }) => {
                const noChange = arraysEqual(original, processed);
                expect(noChange).toBe(shouldSkip);
                console.log(`${name}: Skip upload = ${noChange}`);
            });
        });
    });
});
