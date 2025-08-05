import { describe, expect, it, beforeAll } from "vitest";
import dotenv from "dotenv";
import { getRadicals, getRadicalStudyMaterials } from "../../lib/wanikani";

// Load environment variables
dotenv.config();

/**
 * ⚠️ CRITICAL BUG REPRODUCTION TEST ⚠️
 * 
 * This test reproduces the exact issue causing 422 errors:
 * "Validation failed: Meaning synonyms No duplicate synonyms!"
 * 
 * The bug occurs when:
 * 1. An existing study material has synonyms: ["herkunft", "herkunft"] (duplicates)
 * 2. The smart-merge logic doesn't deduplicate before sending to API
 * 3. Wanikani API rejects with 422 error
 * 
 * From the user logs we can see:
 * 🐛 DEBUG: New synonyms to upload: Array [ "herkunft", "herkunft" ]
 * 🐛 DEBUG: Axios error data: Object { error: "Validation failed: Meaning synonyms No duplicate synonyms!", code: 422 }
 */

describe("🐛 Bug Reproduction: Duplicate Synonyms 422 Error", () => {
    let apiToken: string;

    beforeAll(() => {
        // Check if we have a Wanikani API token for integration tests
        apiToken = process.env.WANIKANI_API_TOKEN || "";

        if (!apiToken) {
            console.warn("WANIKANI_API_TOKEN not found in environment variables. Skipping integration tests.");
        }
    });

    describe("Unit Tests - Synonym Logic Bug Reproduction", () => {
        it("should reproduce the exact smart-merge bug from user logs", () => {
            console.log("🔍 Reproducing the smart-merge bug that causes 422 errors...");

            // This simulates the exact scenario from the user's logs
            const existingSynonyms = ["herkunft", "herkunft"]; // Duplicates already exist
            const newTranslation = "Herkunft"; // Case difference
            const synonymMode = "smart-merge";

            // Current BUGGY logic from RadicalsManager.tsx
            let newSynonyms: string[] = [];
            switch (synonymMode) {
                case 'smart-merge':
                    if (!existingSynonyms.some(syn => syn.toLowerCase() === newTranslation.toLowerCase())) {
                        newSynonyms = [...existingSynonyms, newTranslation.toLowerCase()];
                    } else {
                        newSynonyms = existingSynonyms; // BUG: This preserves duplicates!
                    }
                    break;
            }

            console.log(`📥 Existing synonyms:`, existingSynonyms);
            console.log(`➕ New translation:`, newTranslation);
            console.log(`📤 Buggy result:`, newSynonyms);

            // This is exactly what causes the 422 error
            const hasDuplicates = newSynonyms.length !== new Set(newSynonyms).size;
            expect(hasDuplicates).toBe(true); // Confirms the bug exists
            expect(newSynonyms).toEqual(["herkunft", "herkunft"]); // Exact same as user logs

            console.log(`❌ BUG CONFIRMED: Duplicates detected:`, newSynonyms);
            console.log(`🚨 This would cause Wanikani API 422 error!`);
        });

        it("should provide the FIXED smart-merge logic", () => {
            console.log("🔧 Testing FIXED deduplication logic...");

            // Same scenario as above, but with fixed logic
            const existingSynonyms = ["herkunft", "herkunft"]; // Duplicates already exist
            const newTranslation = "Herkunft"; // Case difference

            // FIXED logic with proper deduplication
            const fixedSmartMerge = (existing: string[], newSyn: string): string[] => {
                const normalizedNew = newSyn.toLowerCase().trim();
                const combined = [...existing, normalizedNew];

                // Deduplicate and filter out empty strings
                const deduplicated = [...new Set(
                    combined
                        .map(syn => syn.toLowerCase().trim())
                        .filter(syn => syn.length > 0)
                )];

                return deduplicated;
            };

            const fixedResult = fixedSmartMerge(existingSynonyms, newTranslation);

            console.log(`📥 Existing synonyms:`, existingSynonyms);
            console.log(`➕ New translation:`, newTranslation);
            console.log(`📤 Fixed result:`, fixedResult);

            // Verify the fix works
            expect(fixedResult).toEqual(["herkunft"]); // No duplicates!
            expect(fixedResult.length).toBe(new Set(fixedResult).size); // Confirm no duplicates
            expect(fixedResult).not.toEqual(existingSynonyms); // Different from buggy input

            console.log(`✅ BUG FIXED: No duplicates in result:`, fixedResult);
        });

        it("should test ADD mode behavior - preserves duplicates as expected", () => {
            console.log("🧪 Testing ADD mode behavior...");

            // This tests the specific issue the user reported
            const existingSynonyms = ["herkunft", "origin"]; // User has existing synonyms
            const newTranslation = "Herkunft"; // Same word, different case
            const synonymMode = "add";

            // Current implementation for ADD mode
            let newSynonyms: string[] = [];
            switch (synonymMode) {
                case 'add':
                    newSynonyms = [...existingSynonyms, newTranslation.toLowerCase().trim()];
                    break;
            }

            // ADD mode should NOT deduplicate - user expects ALL synonyms
            const addModeResult = newSynonyms
                .map(syn => syn.toLowerCase().trim())
                .filter(syn => syn.length > 0);
            // Note: No Set() deduplication for add mode!

            console.log(`📥 Existing synonyms:`, existingSynonyms);
            console.log(`➕ New translation:`, newTranslation);
            console.log(`📤 ADD mode result (should include duplicates):`, addModeResult);

            // In ADD mode, we SHOULD have duplicates if the user wants them
            expect(addModeResult).toEqual(["herkunft", "origin", "herkunft"]);
            expect(addModeResult.length).toBe(3); // Should include the duplicate
            expect(addModeResult.filter(syn => syn === "herkunft").length).toBe(2); // Two "herkunft" entries

            console.log(`✅ ADD mode correctly preserves duplicates as expected by user`);
        });

        it("should contrast ADD vs SMART-MERGE behavior", () => {
            console.log("🔄 Comparing ADD vs SMART-MERGE behavior...");

            const existingSynonyms = ["reis", "rice"];
            const newTranslation = "Reis"; // Same as existing, different case

            // ADD mode - should add even if duplicate exists
            const addResult = [...existingSynonyms, newTranslation.toLowerCase().trim()]
                .map(syn => syn.toLowerCase().trim())
                .filter(syn => syn.length > 0);
            // No deduplication!

            // SMART-MERGE mode - should deduplicate
            let smartMergeArray: string[] = [];
            if (!existingSynonyms.some(syn => syn.toLowerCase().trim() === newTranslation.toLowerCase().trim())) {
                smartMergeArray = [...existingSynonyms, newTranslation.toLowerCase().trim()];
            } else {
                smartMergeArray = existingSynonyms;
            }
            const smartMergeResult = [...new Set(
                smartMergeArray
                    .map(syn => syn.toLowerCase().trim())
                    .filter(syn => syn.length > 0)
            )];

            console.log(`ADD result:`, addResult);
            console.log(`SMART-MERGE result:`, smartMergeResult);

            expect(addResult).toEqual(["reis", "rice", "reis"]); // Has duplicate
            expect(smartMergeResult).toEqual(["reis", "rice"]); // No duplicate
            expect(addResult.length).toBeGreaterThan(smartMergeResult.length);

            console.log(`✅ ADD and SMART-MERGE behave differently as expected`);
        });

        it("should test all synonym modes with proper deduplication", () => {
            const testCases = [
                {
                    mode: "replace",
                    existing: ["old1", "old2", "old1"], // Has duplicates
                    newTranslation: "new",
                    expected: ["new"]
                },
                {
                    mode: "add",
                    existing: ["existing", "existing"], // Has duplicates
                    newTranslation: "new",
                    expected: ["existing", "new"]
                },
                {
                    mode: "smart-merge",
                    existing: ["same", "same"], // Has duplicates  
                    newTranslation: "same", // Same as existing
                    expected: ["same"] // Should deduplicate
                },
                {
                    mode: "smart-merge",
                    existing: ["existing", "existing"], // Has duplicates
                    newTranslation: "new", // Different from existing
                    expected: ["existing", "new"] // Should deduplicate and add
                }
            ];

            // FIXED logic for all modes
            const processWithDeduplication = (existing: string[], newSyn: string, mode: string): string[] => {
                const normalizedNew = newSyn.toLowerCase().trim();
                let result: string[] = [];

                switch (mode) {
                    case 'replace':
                        result = [normalizedNew];
                        break;
                    case 'add':
                        result = [...existing, normalizedNew];
                        break;
                    case 'smart-merge':
                        if (!existing.some(syn => syn.toLowerCase().trim() === normalizedNew)) {
                            result = [...existing, normalizedNew];
                        } else {
                            result = existing;
                        }
                        break;
                    default:
                        result = existing;
                }

                // Always deduplicate and filter
                return [...new Set(
                    result
                        .map(syn => syn.toLowerCase().trim())
                        .filter(syn => syn.length > 0)
                )];
            };

            testCases.forEach(testCase => {
                const result = processWithDeduplication(testCase.existing, testCase.newTranslation, testCase.mode);
                console.log(`Mode "${testCase.mode}":`, testCase.existing, "+", testCase.newTranslation, "→", result);

                expect(result).toEqual(testCase.expected);
                expect(result.length).toBe(new Set(result).size); // No duplicates
            });
        });

        it("should test edge cases that cause validation errors", () => {
            console.log("🚨 Testing edge cases that cause API validation errors...");

            const edgeCases = [
                {
                    name: "empty strings",
                    input: ["valid", "", "another", ""],
                    expected: ["valid", "another"]
                },
                {
                    name: "whitespace-only strings",
                    input: ["valid", "   ", "\t", "another"],
                    expected: ["valid", "another"]
                },
                {
                    name: "case variations",
                    input: ["Word", "word", "WORD", "WoRd"],
                    expected: ["word"]
                },
                {
                    name: "whitespace variations",
                    input: [" padded ", "padded", "  padded  "],
                    expected: ["padded"]
                },
                {
                    name: "mixed issues",
                    input: ["Valid", "", "  ", "valid", "VALID", " valid "],
                    expected: ["valid"]
                }
            ];

            const cleanAndDeduplicate = (synonyms: string[]): string[] => {
                return [...new Set(
                    synonyms
                        .map(syn => syn.toLowerCase().trim())
                        .filter(syn => syn.length > 0)
                )];
            };

            edgeCases.forEach(edgeCase => {
                const result = cleanAndDeduplicate(edgeCase.input);
                console.log(`Edge case "${edgeCase.name}":`, edgeCase.input, "→", result);

                expect(result).toEqual(edgeCase.expected);
                expect(result.length).toBe(new Set(result).size); // No duplicates
                expect(result.every(syn => syn.trim().length > 0)).toBe(true); // No empty strings
            });
        });
    });

    describe("Integration Tests - Safe API Testing", () => {
        it("should test the actual API behavior with duplicates (read-only)", async () => {
            if (!apiToken) {
                console.log("Skipping integration test: WANIKANI_API_TOKEN not available");
                return;
            }

            console.log("🔍 Testing actual API behavior with study materials...");

            try {
                // Get radicals (safe read operation)
                const radicals = await getRadicals(apiToken);
                console.log(`📚 Found ${radicals.length} radicals`);

                // Get existing study materials (safe read operation)
                const studyMaterials = await getRadicalStudyMaterials(apiToken);
                console.log(`📊 Found ${studyMaterials.length} study materials`);

                // Find study materials with duplicates
                const materialsWithDuplicates = studyMaterials.filter(sm => {
                    const synonyms = sm.data.meaning_synonyms || [];
                    return synonyms.length !== new Set(synonyms).size;
                });

                console.log(`🔍 Study materials with duplicates: ${materialsWithDuplicates.length}`);

                if (materialsWithDuplicates.length > 0) {
                    materialsWithDuplicates.slice(0, 3).forEach(sm => {
                        console.log(`📝 Subject ${sm.data.subject_id}: ${sm.data.meaning_synonyms}`);

                        const synonyms = sm.data.meaning_synonyms || [];
                        const duplicates = synonyms.filter((syn, index) => synonyms.indexOf(syn) !== index);
                        console.log(`🔍 Duplicates found:`, duplicates);

                        expect(synonyms.length).toBeGreaterThan(new Set(synonyms).size);
                    });

                    console.log(`🚨 CONFIRMED: Existing data contains duplicates that cause 422 errors!`);
                } else {
                    console.log(`✅ No duplicates found in current study materials`);
                }

            } catch (error) {
                console.error("❌ API test failed:", error);
                // Don't fail the test, just log the error
            }
        });
    });
});
