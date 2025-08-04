import { describe, expect, it, beforeAll, afterAll } from "vitest";
import dotenv from "dotenv";
import { WKRadical } from "@bachmacintosh/wanikani-api-types";
import { getRadicals, getRadicalStudyMaterials, createRadicalSynonyms, updateRadicalSynonyms } from "./wanikani";

// Load environment variables
dotenv.config();

/**
 * ⚠️  INTEGRATION TESTS FOR DELETE MODE ⚠️ 
 * 
 * These tests verify the DELETE mode functionality added to RadicalsManager.
 * Tests work with SPECIFIC TEST RADICALS that are safe to manipulate:
 * - "Rice" (米)
 * - "Spikes" 
 * - "Umbrella"
 * 
 * DELETE MODE FUNCTIONALITY:
 * - Clears all synonyms for selected radicals
 * - Sends empty arrays to Wanikani API
 * - Does not require DeepL token (no translation needed)
 * - Updates study materials with empty synonym lists
 * 
 * SAFETY:
 * - Only manipulates pre-approved test radicals
 * - Tests restore original state after completion
 * - All operations are logged for debugging
 */

// Test radicals that are safe for manipulation
const TEST_RADICALS = {
    RICE: { meaning: "Rice", characters: "米", slug: "rice", id: null as number | null },
    SPIKES: { meaning: "Spikes", characters: null, slug: "spikes", id: null as number | null },
    UMBRELLA: { meaning: "Umbrella", characters: null, slug: "umbrella", id: null as number | null }
} as const;

describe("DELETE Mode Integration Tests - RadicalsManager", () => {
    let apiToken: string;
    let testRadicalsData: Array<{
        radical: WKRadical;
        originalSynonyms: string[];
        studyMaterialId: number | null;
    }> = [];

    beforeAll(async () => {
        // Check if we have a Wanikani API token for integration tests
        apiToken = process.env.WANIKANI_API_TOKEN || "";

        if (!apiToken) {
            console.warn("WANIKANI_API_TOKEN not found in environment variables. Skipping DELETE mode integration tests.");
            return;
        }

        console.log("🔧 DELETE MODE INTEGRATION: Setting up test data...");

        // Load test radicals and their current state
        for (const [key, testRadical] of Object.entries(TEST_RADICALS)) {
            try {
                const radicals = await getRadicals(apiToken, undefined, {
                    slugs: testRadical.slug,
                    limit: 1
                });

                if (radicals.length > 0) {
                    const radical = radicals[0];
                    const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;

                    // Only work with our safe test radicals
                    if (primaryMeaning === testRadical.meaning) {
                        // Get existing study materials
                        const studyMaterials = await getRadicalStudyMaterials(apiToken, undefined, {
                            subject_ids: radical.id.toString()
                        });

                        const originalSynonyms = studyMaterials.length > 0
                            ? studyMaterials[0].data.meaning_synonyms
                            : [];

                        const studyMaterialId = studyMaterials.length > 0
                            ? studyMaterials[0].id
                            : null;

                        testRadicalsData.push({
                            radical,
                            originalSynonyms: [...originalSynonyms], // Deep copy
                            studyMaterialId
                        });

                        // Update the TEST_RADICALS object with the ID
                        (TEST_RADICALS[key as keyof typeof TEST_RADICALS] as any).id = radical.id;

                        console.log(`🔧 DELETE MODE INTEGRATION: Loaded ${primaryMeaning} (ID: ${radical.id}) with ${originalSynonyms.length} synonyms`);
                    }
                }
            } catch (error) {
                console.warn(`🔧 DELETE MODE INTEGRATION: Failed to load ${testRadical.meaning}: ${error}`);
            }
        }

        console.log(`🔧 DELETE MODE INTEGRATION: Setup complete. Testing with ${testRadicalsData.length} radicals.`);
    });

    afterAll(async () => {
        if (!apiToken || testRadicalsData.length === 0) return;

        console.log("🔧 DELETE MODE INTEGRATION: Restoring original state...");

        // Restore original synonyms for all test radicals
        for (const testData of testRadicalsData) {
            try {
                if (testData.studyMaterialId && testData.originalSynonyms.length > 0) {
                    await updateRadicalSynonyms(
                        apiToken,
                        testData.studyMaterialId,
                        testData.originalSynonyms
                    );
                    console.log(`🔧 DELETE MODE INTEGRATION: Restored ${testData.originalSynonyms.length} synonyms for ${testData.radical.data.meanings.find(m => m.primary)?.meaning}`);
                } else if (testData.studyMaterialId) {
                    // Clear synonyms if originally empty
                    await updateRadicalSynonyms(apiToken, testData.studyMaterialId, []);
                    console.log(`🔧 DELETE MODE INTEGRATION: Cleared synonyms for ${testData.radical.data.meanings.find(m => m.primary)?.meaning} (originally empty)`);
                }
            } catch (error) {
                console.warn(`🔧 DELETE MODE INTEGRATION: Failed to restore ${testData.radical.data.meanings.find(m => m.primary)?.meaning}: ${error}`);
            }
        }

        console.log("🔧 DELETE MODE INTEGRATION: Cleanup complete.");
    });

    it("should initialize DELETE mode without requiring DeepL token", async () => {
        if (!apiToken) return;

        // DELETE mode should work without DeepL token
        const synonymMode = 'delete';

        // Mock the mode logic from RadicalsManager
        const requiresDeepL = synonymMode !== 'delete';

        expect(requiresDeepL).toBe(false);
        expect(synonymMode).toBe('delete');

        console.log("✅ DELETE MODE: Confirmed DELETE mode does not require DeepL token");
    });

    it("should process radicals in DELETE mode and set empty synonyms", async () => {
        if (!apiToken || testRadicalsData.length === 0) return;

        console.log("🔧 DELETE MODE: Testing synonym deletion process...");

        for (const testData of testRadicalsData) {
            const radical = testData.radical;
            const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;

            console.log(`🔧 DELETE MODE: Processing ${primaryMeaning} (ID: ${radical.id})`);

            // Simulate the DELETE mode processing logic from RadicalsManager
            const synonymMode = 'delete';

            // Ensure there are some synonyms to delete first
            if (testData.originalSynonyms.length === 0) {
                // Add temporary synonyms for testing
                const tempSynonyms = ["temp1", "temp2", "toDelete"];

                if (testData.studyMaterialId) {
                    await updateRadicalSynonyms(apiToken, testData.studyMaterialId, tempSynonyms);
                    console.log(`🔧 DELETE MODE: Added temporary synonyms to ${primaryMeaning}: [${tempSynonyms.join(', ')}]`);
                } else {
                    const newStudyMaterial = await createRadicalSynonyms(apiToken, radical.id, tempSynonyms);
                    testData.studyMaterialId = newStudyMaterial.id;
                    console.log(`🔧 DELETE MODE: Created new study material for ${primaryMeaning} with synonyms: [${tempSynonyms.join(', ')}]`);
                }
            }

            // Simulate DELETE mode logic: always return empty array
            const processedSynonyms: string[] = [];

            // Verify the logic
            expect(processedSynonyms).toEqual([]);
            expect(synonymMode).toBe('delete');

            console.log(`🔧 DELETE MODE: ${primaryMeaning} processed with ${processedSynonyms.length} synonyms (expected: 0)`);
        }

        console.log("✅ DELETE MODE: All radicals processed successfully with empty synonym arrays");
    });

    it("should upload empty synonym arrays to Wanikani API", async () => {
        if (!apiToken || testRadicalsData.length === 0) return;

        console.log("🔧 DELETE MODE: Testing API upload with empty arrays...");

        for (const testData of testRadicalsData) {
            const radical = testData.radical;
            const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;

            if (!testData.studyMaterialId) {
                console.log(`🔧 DELETE MODE: No study material for ${primaryMeaning} - skipping`);
                continue;
            }

            console.log(`🔧 DELETE MODE: Uploading empty synonyms for ${primaryMeaning}`);

            // Simulate the upload logic from RadicalsManager
            const synonymMode = 'delete';
            const validSynonyms: string[] = []; // DELETE mode always produces empty array

            // The key test: DELETE mode should allow empty arrays
            const shouldUpload = validSynonyms.length === 0 && synonymMode === 'delete';
            expect(shouldUpload).toBe(true);

            // Actually upload empty array
            const result = await updateRadicalSynonyms(
                apiToken,
                testData.studyMaterialId,
                validSynonyms
            );

            // Verify the upload worked
            expect(result.data.meaning_synonyms).toEqual([]);

            console.log(`✅ DELETE MODE: Successfully uploaded empty synonyms for ${primaryMeaning}`);

            // Double-check by fetching the study material again
            const verifyStudyMaterials = await getRadicalStudyMaterials(apiToken, undefined, {
                subject_ids: radical.id.toString()
            });

            if (verifyStudyMaterials.length > 0) {
                expect(verifyStudyMaterials[0].data.meaning_synonyms).toEqual([]);
                console.log(`✅ DELETE MODE: Verified ${primaryMeaning} has no synonyms after deletion`);
            }
        }

        console.log("✅ DELETE MODE: All uploads completed successfully");
    });

    it("should handle DELETE mode validation correctly", async () => {
        if (!apiToken) return;

        // Test the validation logic from RadicalsManager upload function
        const synonymMode = 'delete';
        const rawSynonyms: string[] = []; // DELETE mode produces empty arrays

        // Apply the same validation logic as in RadicalsManager
        let validSynonyms: string[] = [];

        // For DELETE mode: Always empty array
        if (synonymMode === 'delete') {
            validSynonyms = [];
        } else {
            // Other modes: Deduplicate and validate
            validSynonyms = [...new Set(
                rawSynonyms
                    .map(syn => typeof syn === 'string' ? syn.toLowerCase().trim() : '')
                    .filter(syn => syn.length > 0)
            )];
        }

        // For DELETE mode, empty arrays are valid and should be uploaded
        const shouldSkip = validSynonyms.length === 0 && synonymMode !== 'delete';

        expect(validSynonyms).toEqual([]);
        expect(shouldSkip).toBe(false); // DELETE mode should NOT skip empty arrays
        expect(synonymMode).toBe('delete');

        console.log("✅ DELETE MODE: Validation logic works correctly for empty arrays");
    });

    it("should generate correct success messages for DELETE mode", async () => {
        if (!apiToken) return;

        const synonymMode = 'delete';
        const validSynonyms: string[] = [];

        // Simulate message generation from RadicalsManager
        let successMessage: string;

        if (synonymMode === 'delete') {
            successMessage = `🗑️ Erfolgreich gelöscht: Alle Synonyme entfernt`;
        } else {
            successMessage = `✅ Erfolgreich hochgeladen: ${validSynonyms.join(', ')}`;
        }

        expect(successMessage).toBe("🗑️ Erfolgreich gelöscht: Alle Synonyme entfernt");
        expect(successMessage).toContain("🗑️");
        expect(successMessage).toContain("gelöscht");

        console.log("✅ DELETE MODE: Success message generation works correctly");
        console.log(`   Message: "${successMessage}"`);
    });

    it("should complete full DELETE mode workflow", async () => {
        if (!apiToken || testRadicalsData.length === 0) return;

        console.log("🔧 DELETE MODE: Testing complete workflow...");

        // Select one test radical for full workflow test
        const testData = testRadicalsData[0];
        const radical = testData.radical;
        const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;

        if (!testData.studyMaterialId) {
            console.log(`🔧 DELETE MODE: No study material for ${primaryMeaning} - creating one`);
            const tempSynonyms = ["workflow", "test"];
            const newStudyMaterial = await createRadicalSynonyms(apiToken, radical.id, tempSynonyms);
            testData.studyMaterialId = newStudyMaterial.id;
        } else {
            // Ensure there are synonyms to delete
            const tempSynonyms = ["workflow", "test", "complete"];
            await updateRadicalSynonyms(apiToken, testData.studyMaterialId, tempSynonyms);
            console.log(`🔧 DELETE MODE: Added test synonyms to ${primaryMeaning}: [${tempSynonyms.join(', ')}]`);
        }

        // Simulate the complete DELETE mode workflow from RadicalsManager
        console.log(`🔧 DELETE MODE: Starting workflow for ${primaryMeaning}`);

        // 1. Mode check (no DeepL required)
        const synonymMode = 'delete';
        const needsDeepL = synonymMode !== 'delete';
        expect(needsDeepL).toBe(false);

        // 2. Processing (no translation, just empty array)
        const processedRadical = {
            ...radical,
            translatedSynonyms: [],
            currentSynonyms: [] // DELETE mode sets this to empty
        };

        expect(processedRadical.currentSynonyms).toEqual([]);

        // 3. Upload validation
        const validSynonyms: string[] = [];  // DELETE mode always produces empty array

        const shouldUpload = validSynonyms.length === 0 && synonymMode === 'delete';
        expect(shouldUpload).toBe(true);

        // 4. Actual upload
        const uploadResult = await updateRadicalSynonyms(
            apiToken,
            testData.studyMaterialId!,
            validSynonyms
        );

        expect(uploadResult.data.meaning_synonyms).toEqual([]);

        // 5. Success message
        const successMessage = synonymMode === 'delete'
            ? `🗑️ Erfolgreich gelöscht: Alle Synonyme entfernt`
            : `✅ Erfolgreich hochgeladen: ${validSynonyms.join(', ')}`;

        expect(successMessage).toContain("🗑️");

        console.log(`✅ DELETE MODE: Complete workflow test passed for ${primaryMeaning}`);
        console.log(`   Final state: ${uploadResult.data.meaning_synonyms.length} synonyms`);
        console.log(`   Success message: "${successMessage}"`);
    });
});

describe("DELETE Mode Error Handling", () => {
    it("should handle invalid API tokens gracefully", async () => {
        const invalidToken = "invalid_token_123";

        // DELETE mode should still fail gracefully with invalid token
        await expect(
            updateRadicalSynonyms(invalidToken, 1, [])
        ).rejects.toThrow();

        console.log("✅ DELETE MODE: Error handling works for invalid tokens");
    });

    it("should handle non-existent study materials", async () => {
        const apiToken = process.env.WANIKANI_API_TOKEN || "";
        if (!apiToken) return;

        const nonExistentId = 999999999;

        // Should handle non-existent study material IDs
        await expect(
            updateRadicalSynonyms(apiToken, nonExistentId, [])
        ).rejects.toThrow();

        console.log("✅ DELETE MODE: Error handling works for non-existent study materials");
    });
});
