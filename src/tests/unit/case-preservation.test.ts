import { describe, expect, it } from "vitest";

/**
 * Tests für Groß-/Kleinschreibung-Erhaltung in Synonymen
 * 
 * Anforderungen:
 * 1. Synonyme sollen ihre ursprüngliche Groß-/Kleinschreibung behalten
 * 2. Beim Vergleich auf Duplikate soll Groß-/Kleinschreibung ignoriert werden
 * 3. Deduplizierung soll case-insensitive erfolgen aber original case bewahren
 */

describe("Case Preservation in Synonyms", () => {
    it("should preserve original case in synonyms", () => {
        // Simulate the logic from RadicalsManager
        const translation = "Reis"; // Original case from DeepL
        const translatedSynonym = translation.trim(); // Keep original case

        expect(translatedSynonym).toBe("Reis");
        expect(translatedSynonym).not.toBe("reis");
    });

    it("should detect duplicates case-insensitively", () => {
        const currentSynonyms = ["reis", "Getreide"];
        const newTranslation = "Reis"; // Different case but same word

        // Case-insensitive comparison logic
        const isDuplicate = currentSynonyms.some(syn =>
            syn.toLowerCase().trim() === newTranslation.toLowerCase()
        );

        expect(isDuplicate).toBe(true);
    });

    it("should deduplicate case-insensitively but preserve original case", () => {
        const synonyms = ["reis", "Reis", "REIS", "Getreide", "getreide"];

        // Deduplicate using Map with lowercase keys but original values - keep first occurrence
        const seenSynonyms = new Map<string, string>();
        synonyms
            .map(syn => syn.trim())
            .filter(syn => syn.length > 0)
            .forEach(syn => {
                const lowerKey = syn.toLowerCase();
                if (!seenSynonyms.has(lowerKey)) {
                    seenSynonyms.set(lowerKey, syn); // Keep first occurrence
                }
            });
        const deduplicatedSynonyms = [...seenSynonyms.values()];

        expect(deduplicatedSynonyms).toHaveLength(2);
        expect(deduplicatedSynonyms).toContain("reis"); // First occurrence preserved
        expect(deduplicatedSynonyms).toContain("Getreide"); // First occurrence preserved
        expect(deduplicatedSynonyms).not.toContain("Reis");
        expect(deduplicatedSynonyms).not.toContain("REIS");
        expect(deduplicatedSynonyms).not.toContain("getreide");
    });

    it("should handle smart-merge mode with case preservation", () => {
        const currentSynonyms = ["reis", "Getreide"];
        const newTranslation = "Korn"; // New synonym with specific case

        // Smart-merge logic
        let newSynonyms: string[] = [];
        if (!currentSynonyms.some(syn => syn.toLowerCase().trim() === newTranslation.toLowerCase())) {
            newSynonyms = [...currentSynonyms, newTranslation];
        } else {
            newSynonyms = currentSynonyms;
        }

        expect(newSynonyms).toHaveLength(3);
        expect(newSynonyms).toContain("Korn"); // Original case preserved
        expect(newSynonyms).toContain("reis");
        expect(newSynonyms).toContain("Getreide");
    });

    it("should handle smart-merge mode with case-insensitive duplicate detection", () => {
        const currentSynonyms = ["reis", "Getreide"];
        const newTranslation = "Reis"; // Same as existing but different case

        // Smart-merge logic
        let newSynonyms: string[] = [];
        if (!currentSynonyms.some(syn => syn.toLowerCase().trim() === newTranslation.toLowerCase())) {
            newSynonyms = [...currentSynonyms, newTranslation];
        } else {
            newSynonyms = currentSynonyms; // Don't add duplicate
        }

        expect(newSynonyms).toHaveLength(2);
        expect(newSynonyms).toContain("reis"); // Original preserved
        expect(newSynonyms).toContain("Getreide");
        expect(newSynonyms).not.toContain("Reis"); // Duplicate not added
    });

    it("should handle replace mode with case preservation", () => {
        const newTranslation = "Reiskorn"; // Specific case
        const newSynonyms = [newTranslation];

        // Clean synonyms but preserve case
        const cleanedSynonyms = [...new Map(
            newSynonyms
                .map(syn => syn.trim())
                .filter(syn => syn.length > 0)
                .map(syn => [syn.toLowerCase(), syn])
        ).values()];

        expect(cleanedSynonyms).toHaveLength(1);
        expect(cleanedSynonyms[0]).toBe("Reiskorn"); // Original case preserved
    });

    it("should handle validation with case preservation", () => {
        const rawSynonyms = ["Reis", "getreide", "KORN", "weizen"];

        // Validation logic from upload function
        const validSynonyms = [...new Map(
            rawSynonyms
                .map(syn => typeof syn === 'string' ? syn.trim() : '')
                .filter(syn => syn.length > 0)
                .map(syn => [syn.toLowerCase(), syn]) // Use lowercase as key, original as value
        ).values()];

        expect(validSynonyms).toHaveLength(4);
        expect(validSynonyms).toContain("Reis");
        expect(validSynonyms).toContain("getreide");
        expect(validSynonyms).toContain("KORN");
        expect(validSynonyms).toContain("weizen");
    });

    it("should handle mixed case duplicates correctly", () => {
        const rawSynonyms = ["Reis", "reis", "REIS", "Getreide", "korn", "Korn"];

        // Use the same logic as in RadicalsManager - keep first occurrence
        const seenValidSynonyms = new Map<string, string>();
        rawSynonyms
            .map(syn => syn.trim())
            .filter(syn => syn.length > 0)
            .forEach(syn => {
                const lowerKey = syn.toLowerCase();
                if (!seenValidSynonyms.has(lowerKey)) {
                    seenValidSynonyms.set(lowerKey, syn); // Keep first occurrence
                }
            });
        const validSynonyms = [...seenValidSynonyms.values()];

        expect(validSynonyms).toHaveLength(3);
        expect(validSynonyms).toContain("Reis"); // First occurrence of "reis"
        expect(validSynonyms).toContain("Getreide");
        expect(validSynonyms).toContain("korn"); // First occurrence of "korn"

        // Should not contain duplicates
        expect(validSynonyms).not.toContain("reis");
        expect(validSynonyms).not.toContain("REIS");
        expect(validSynonyms).not.toContain("Korn");
    });
});
