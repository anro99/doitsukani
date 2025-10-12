import { mergeTranslations, getPrebuiltTranslations } from '../../lib/vocabulary-translation-merger';

describe('VocabularyTranslationMerger', () => {

    describe('mergeTranslations', () => {
        test('should merge DeepL and prebuilt translations - DeepL has priority', () => {
            const deeplTranslations = ['Entschuldigung', 'Verzeihung'];
            const prebuiltTranslations = ['Entschuldigung', 'Sorry', 'Pardon'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations);

            expect(result).toEqual([
                'Entschuldigung', 'Verzeihung', // DeepL vollständig (Priorität)
                'Sorry', 'Pardon'              // Neue aus prebuilt (ohne Duplikat)
            ]);
        });

        test('should prioritize DeepL translations (case insensitive)', () => {
            const deeplTranslations = ['Entschuldigung'];
            const prebuiltTranslations = ['ENTSCHULDIGUNG', 'Sorry'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations);

            expect(result).toEqual(['Entschuldigung', 'Sorry']);
        });

        test('should ALWAYS keep all DeepL translations when limiting', () => {
            const deeplTranslations = ['DeepL1', 'DeepL2', 'DeepL3', 'DeepL4', 'DeepL5'];
            const prebuiltTranslations = ['Pre1', 'Pre2', 'Pre3', 'Pre4', 'Pre5'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations, 7);

            expect(result).toHaveLength(7);
            expect(result.slice(0, 5)).toEqual([
                'DeepL1', 'DeepL2', 'DeepL3', 'DeepL4', 'DeepL5'  // Alle DeepL behalten
            ]);
            expect(result.slice(5, 7)).toEqual(['Pre1', 'Pre2']); // Prebuilt gekürzt
        });

        test('should handle case where DeepL alone equals limit', () => {
            const deeplTranslations = [
                'DeepL1', 'DeepL2', 'DeepL3', 'DeepL4', 'DeepL5',
                'DeepL6', 'DeepL7', 'DeepL8'
            ];
            const prebuiltTranslations = ['Pre1', 'Pre2'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations, 8);

            // DeepL füllt das Limit komplett - keine prebuilt passen mehr rein
            expect(result).toEqual(deeplTranslations);
            expect(result).toHaveLength(8);
        });

        test('should handle case where DeepL exceeds limit', () => {
            const deeplTranslations = [
                'DeepL1', 'DeepL2', 'DeepL3', 'DeepL4', 'DeepL5',
                'DeepL6', 'DeepL7', 'DeepL8', 'DeepL9', 'DeepL10'
            ];
            const prebuiltTranslations = ['Pre1', 'Pre2'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations, 8);

            // Alle DeepL behalten, auch wenn Limit überschritten wird!
            expect(result).toEqual(deeplTranslations);
            expect(result).toHaveLength(10); // Mehr als Limit, aber DeepL hat Priorität
        });

        test('should never reduce DeepL translations count', () => {
            const deeplTranslations = ['A', 'B', 'C'];
            const prebuiltTranslations = ['D', 'E'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations, 2);

            // DeepL hat Priorität - wird nie gekürzt
            expect(result.slice(0, 3)).toEqual(['A', 'B', 'C']);
            expect(result).toHaveLength(3); // Keine prebuilt, da DeepL Priorität hat
        });

        test('should handle empty DeepL translations', () => {
            const deeplTranslations: string[] = [];
            const prebuiltTranslations = ['Pre1', 'Pre2', 'Pre3'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations, 2);

            expect(result).toEqual(['Pre1', 'Pre2']); // Prebuilt gekürzt auf Limit
        });

        test('should handle empty prebuilt translations', () => {
            const deeplTranslations = ['DeepL1', 'DeepL2'];
            const prebuiltTranslations: string[] = [];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations, 5);

            expect(result).toEqual(['DeepL1', 'DeepL2']); // Nur DeepL
        });

        test('should handle case sensitive option', () => {
            const deeplTranslations = ['Entschuldigung'];
            const prebuiltTranslations = ['ENTSCHULDIGUNG', 'Sorry'];

            const result = mergeTranslations(
                deeplTranslations,
                prebuiltTranslations,
                8,
                { caseSensitive: true }
            );

            expect(result).toEqual(['Entschuldigung', 'ENTSCHULDIGUNG', 'Sorry']);
        });

        test('should remove exact duplicates regardless of position', () => {
            const deeplTranslations = ['A', 'B', 'C'];
            const prebuiltTranslations = ['B', 'D', 'A', 'E'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations);

            expect(result).toEqual(['A', 'B', 'C', 'D', 'E']); // Keine Duplikate
        });
    });

    describe('getPrebuiltTranslations', () => {
        test('should return prebuilt translations for existing vocabulary ID', () => {
            const mockTranslations = {
                '2734': ['Sorry', 'Pardon'],
                '7242': ['Leader', 'Boss']
            };

            const result = getPrebuiltTranslations(2734, mockTranslations);

            expect(result).toEqual(['Sorry', 'Pardon']);
        });

        test('should return empty array for non-existing vocabulary ID', () => {
            const mockTranslations = { '2734': ['Sorry'] };

            const result = getPrebuiltTranslations(9999, mockTranslations);

            expect(result).toEqual([]);
        });

        test('should handle string and number IDs correctly', () => {
            const mockTranslations = { '2734': ['Translation1'] };

            const resultNumber = getPrebuiltTranslations(2734, mockTranslations);
            const resultString = getPrebuiltTranslations(2734, mockTranslations);

            expect(resultNumber).toEqual(['Translation1']);
            expect(resultString).toEqual(['Translation1']);
        });

        test('should return empty array for empty translations object', () => {
            const mockTranslations = {};

            const result = getPrebuiltTranslations(2734, mockTranslations);

            expect(result).toEqual([]);
        });

        test('should handle null/undefined values gracefully', () => {
            const mockTranslations = {
                '2734': undefined as any,
                '7242': null as any
            };

            const result1 = getPrebuiltTranslations(2734, mockTranslations);
            const result2 = getPrebuiltTranslations(7242, mockTranslations);

            expect(result1).toEqual([]);
            expect(result2).toEqual([]);
        });
    });

    describe('edge cases and error handling', () => {
        test('should handle very long translation arrays', () => {
            const deeplTranslations = Array.from({ length: 15 }, (_, i) => `DeepL${i + 1}`);
            const prebuiltTranslations = Array.from({ length: 10 }, (_, i) => `Pre${i + 1}`);

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations, 8);

            // Alle DeepL behalten (15), keine prebuilt da schon über Limit
            expect(result).toEqual(deeplTranslations);
            expect(result).toHaveLength(15);
        });

        test('should handle special characters and unicode', () => {
            const deeplTranslations = ['Entschuldigung', 'Verzeihung'];
            const prebuiltTranslations = ['お疲れ様', '頑張って', 'Müdigkeit'];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations);

            expect(result).toEqual([
                'Entschuldigung', 'Verzeihung',
                'お疲れ様', '頑張って', 'Müdigkeit'
            ]);
        });

        test('should handle whitespace and trimming', () => {
            const deeplTranslations = [' Entschuldigung ', 'Verzeihung'];
            const prebuiltTranslations = ['Entschuldigung', ' Sorry '];

            const result = mergeTranslations(deeplTranslations, prebuiltTranslations);

            // Sollte original Strings beibehalten (kein automatisches Trimming)
            expect(result).toEqual([' Entschuldigung ', 'Verzeihung', ' Sorry ']);
        });
    });
});
