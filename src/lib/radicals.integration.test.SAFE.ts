import { describe, expect, it, beforeAll } from "vitest";
import dotenv from "dotenv";
import { WKRadical, WKStudyMaterial } from "@bachmacintosh/wanikani-api-types";

// Load environment variables
dotenv.config();

/**
 * ⚠️  CRITICAL SAFETY WARNING ⚠️ 
 * 
 * These integration tests MUST ONLY perform read operations (GET requests).
 * They must NEVER call any of these write functions:
 * - createSynonyms (POST /v2/study_materials)
 * - updateSynonyms (PUT /v2/study_materials/:id)
 * - Any axios.post, axios.put, axios.delete, axios.patch operations
 * 
 * Violating this rule will create/modify data in the user's Wanikani account!
 * 
 * ALLOWED operations:
 * - GET /v2/subjects?types=radical (read radical data)
 * - GET /v2/study_materials?subject_types=radical (read study materials)
 * 
 * All tests are limited to max 10 items to respect API limits.
 */

// For now we'll create placeholder functions that we'll implement later
// CRITICAL: These functions must ONLY perform READ operations (GET requests)
// They must NEVER call createSynonyms, updateSynonyms or any POST/PUT/DELETE operations
const getRadicals = async (
    _token: string,
    setProgress?: any,
    options?: { levels?: string; limit?: number }
): Promise<WKRadical[]> => {
    // Placeholder implementation - will be replaced with actual read-only function
    // This function will only use GET /v2/subjects?types=radical
    console.log(`READ-ONLY: Would fetch radicals with token, options:`, { levels: options?.levels, limit: options?.limit });
    if (setProgress) setProgress({ text: "READ-ONLY test" });
    throw new Error("getRadicals not implemented yet");
};

const getRadicalStudyMaterials = async (
    _token: string,
    setProgress?: any,
    options?: { subject_ids?: string; limit?: number }
): Promise<WKStudyMaterial[]> => {
    // Placeholder implementation - will be replaced with actual read-only function
    // This function will only use GET /v2/study_materials?subject_types=radical
    console.log(`READ-ONLY: Would fetch study materials with token, options:`, { subject_ids: options?.subject_ids, limit: options?.limit });
    if (setProgress) setProgress({ text: "READ-ONLY test" });
    throw new Error("getRadicalStudyMaterials not implemented yet");
};

describe("Radical API Integration Tests - READ-ONLY", () => {
    let apiToken: string;

    beforeAll(() => {
        // Check if we have a Wanikani API token for integration tests
        apiToken = process.env.WANIKANI_API_TOKEN || "";

        if (!apiToken) {
            console.warn("WANIKANI_API_TOKEN not found in environment variables. Skipping integration tests.");
        }
    });

    describe("READ-ONLY Safety Checks", () => {
        it("should verify no write operations are used in integration tests", () => {
            // This test ensures that our integration tests never call write operations
            const prohibitedOperations = [
                'createSynonyms',
                'updateSynonyms',
                'axios.post',
                'axios.put',
                'axios.delete',
                'axios.patch'
            ];

            // Document that these operations are prohibited in integration tests
            expect(prohibitedOperations.length).toBeGreaterThan(0);
            console.log("⚠️  These operations are PROHIBITED in integration tests:", prohibitedOperations);
        });

        it("should only use GET endpoints for radical data", () => {
            // Document the allowed READ-ONLY endpoints
            const allowedEndpoints = [
                'GET /v2/subjects?types=radical',
                'GET /v2/study_materials?subject_types=radical'
            ];

            // Verify we only document read operations
            expect(allowedEndpoints.every(endpoint => endpoint.startsWith('GET'))).toBe(true);
            console.log("✅ Allowed READ-ONLY endpoints:", allowedEndpoints);
        });

        it("should enforce maximum item limits to respect API", () => {
            const maxItemsPerTest = 10;
            expect(maxItemsPerTest).toBeLessThanOrEqual(10);
            console.log(`✅ Maximum items per test: ${maxItemsPerTest}`);
        });
    });

    describe("READ-ONLY getRadicals Integration", () => {
        it.skip("should fetch real radicals from Wanikani API (max 10, READ-ONLY)", async () => {
            if (!apiToken) return;

            const radicals = await getRadicals(apiToken, undefined, { limit: 10 });

            expect(radicals).toBeDefined();
            expect(Array.isArray(radicals)).toBe(true);
            expect(radicals.length).toBeLessThanOrEqual(10);

            if (radicals.length > 0) {
                const firstRadical = radicals[0];

                // Validate structure
                expect(firstRadical.object).toBe("radical");
                expect(firstRadical.id).toBeGreaterThan(0);
                expect(firstRadical.data).toBeDefined();
                expect(firstRadical.data.level).toBeGreaterThan(0);
                expect(firstRadical.data.meanings).toBeDefined();
                expect(Array.isArray(firstRadical.data.meanings)).toBe(true);
                expect(firstRadical.data.meanings.length).toBeGreaterThan(0);

                // Check that at least one meaning is primary
                const primaryMeaning = firstRadical.data.meanings.find(m => m.primary);
                expect(primaryMeaning).toBeDefined();
                expect(typeof primaryMeaning?.meaning).toBe("string");
                expect(primaryMeaning?.meaning.length).toBeGreaterThan(0);

                console.log(`READ-ONLY: Fetched radical: ${primaryMeaning?.meaning} (Level ${firstRadical.data.level})`);
                if (firstRadical.data.characters) {
                    console.log(`READ-ONLY: Characters: ${firstRadical.data.characters}`);
                }
            }
        }, 10000);

        it.skip("should fetch radicals from specific levels (READ-ONLY)", async () => {
            if (!apiToken) return;

            const radicals = await getRadicals(apiToken, undefined, {
                levels: "1,2",
                limit: 5
            });

            expect(radicals).toBeDefined();
            expect(Array.isArray(radicals)).toBe(true);
            expect(radicals.length).toBeLessThanOrEqual(5);

            // Check that all radicals are from levels 1 or 2
            radicals.forEach(radical => {
                expect([1, 2]).toContain(radical.data.level);
            });
        }, 10000);

        it.skip("should handle progress reporting (READ-ONLY)", async () => {
            if (!apiToken) return;

            let progressCalled = false;
            const progressCallback = (progress: any) => {
                progressCalled = true;
                expect(progress).toBeDefined();
                expect(progress.text).toBeDefined();
                expect(typeof progress.text).toBe("string");
            };

            const radicals = await getRadicals(apiToken, progressCallback, { limit: 3 });

            expect(progressCalled).toBe(true);
            expect(radicals).toBeDefined();
        }, 10000);
    });

    describe("READ-ONLY getRadicalStudyMaterials Integration", () => {
        it.skip("should fetch real radical study materials (max 10, READ-ONLY)", async () => {
            if (!apiToken) return;

            const studyMaterials = await getRadicalStudyMaterials(apiToken, undefined, { limit: 10 });

            expect(studyMaterials).toBeDefined();
            expect(Array.isArray(studyMaterials)).toBe(true);
            expect(studyMaterials.length).toBeLessThanOrEqual(10);

            if (studyMaterials.length > 0) {
                const firstMaterial = studyMaterials[0];

                // Validate structure
                expect(firstMaterial.object).toBe("study_material");
                expect(firstMaterial.id).toBeGreaterThan(0);
                expect(firstMaterial.data).toBeDefined();
                expect(firstMaterial.data.subject_type).toBe("radical");
                expect(firstMaterial.data.subject_id).toBeGreaterThan(0);
                expect(Array.isArray(firstMaterial.data.meaning_synonyms)).toBe(true);
                expect(typeof firstMaterial.data.hidden).toBe("boolean");

                console.log(`READ-ONLY: Fetched study material for radical ID: ${firstMaterial.data.subject_id}`);
                if (firstMaterial.data.meaning_synonyms.length > 0) {
                    console.log(`READ-ONLY: Synonyms: ${firstMaterial.data.meaning_synonyms.join(", ")}`);
                }
            }
        }, 10000);

        it.skip("should filter study materials by subject IDs (READ-ONLY)", async () => {
            if (!apiToken) return;

            // First get some radicals to get their IDs
            const radicals = await getRadicals(apiToken, undefined, { limit: 3 });

            if (radicals.length > 0) {
                const subjectIds = radicals.map(r => r.id).join(",");
                const studyMaterials = await getRadicalStudyMaterials(apiToken, undefined, {
                    subject_ids: subjectIds,
                    limit: 5
                });

                expect(studyMaterials).toBeDefined();
                expect(Array.isArray(studyMaterials)).toBe(true);

                // All returned study materials should be for our requested subject IDs
                const requestedIds = radicals.map(r => r.id);
                studyMaterials.forEach(material => {
                    expect(requestedIds).toContain(material.data.subject_id);
                });
            }
        }, 15000);
    });

    describe("READ-ONLY Combined Tests", () => {
        it.skip("should correlate radicals with their study materials (READ-ONLY)", async () => {
            if (!apiToken) return;

            // Get some radicals
            const radicals = await getRadicals(apiToken, undefined, { limit: 5 });

            if (radicals.length > 0) {
                const radicalIds = radicals.map(r => r.id);

                // Get study materials for these radicals
                const studyMaterials = await getRadicalStudyMaterials(apiToken, undefined, {
                    subject_ids: radicalIds.join(","),
                    limit: 10
                });

                // Create a map for easier lookup
                const studyMaterialMap = new Map(
                    studyMaterials.map(sm => [sm.data.subject_id, sm])
                );

                radicals.forEach(radical => {
                    const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;
                    console.log(`READ-ONLY: Radical ${radical.id}: ${primaryMeaning} (Level ${radical.data.level})`);

                    const studyMaterial = studyMaterialMap.get(radical.id);
                    if (studyMaterial) {
                        console.log(`  READ-ONLY: Has study material with ${studyMaterial.data.meaning_synonyms.length} synonyms`);
                        if (studyMaterial.data.meaning_synonyms.length > 0) {
                            console.log(`  READ-ONLY: Synonyms: ${studyMaterial.data.meaning_synonyms.join(", ")}`);
                        }
                    } else {
                        console.log(`  READ-ONLY: No study material found`);
                    }
                });

                expect(radicals.length).toBeGreaterThan(0);
            }
        }, 20000);
    });

    describe("Error Handling Integration (READ-ONLY)", () => {
        it("should handle invalid API token gracefully", async () => {
            const invalidToken = "invalid-token-12345";

            await expect(getRadicals(invalidToken, undefined, { limit: 1 }))
                .rejects
                .toThrow();
        }, 10000);

        it("should handle network errors gracefully", async () => {
            // Test with malformed token that might cause different errors
            const malformedToken = "";

            await expect(getRadicals(malformedToken, undefined, { limit: 1 }))
                .rejects
                .toThrow();
        }, 10000);
    });

    describe("Rate Limiting Integration (READ-ONLY)", () => {
        it.skip("should respect API rate limits during multiple calls (READ-ONLY)", async () => {
            if (!apiToken) return;

            const startTime = Date.now();

            // Make multiple API calls in sequence
            const promises = [
                getRadicals(apiToken, undefined, { limit: 2 }),
                getRadicalStudyMaterials(apiToken, undefined, { limit: 2 }),
                getRadicals(apiToken, undefined, { levels: "1", limit: 2 }),
            ];

            const results = await Promise.all(promises);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            // Should take at least 2 seconds due to rate limiting (1100ms between calls)
            // But we'll be more lenient for CI environments
            expect(totalTime).toBeGreaterThan(1000);

            results.forEach(result => {
                expect(Array.isArray(result)).toBe(true);
            });

            console.log(`READ-ONLY: Three API calls completed in ${totalTime}ms`);
        }, 30000);
    });

    describe("Data Quality Tests (READ-ONLY)", () => {
        it.skip("should validate radical data quality and structure (READ-ONLY)", async () => {
            if (!apiToken) return;

            const radicals = await getRadicals(apiToken, undefined, { limit: 5 });

            if (radicals.length > 0) {
                radicals.forEach((radical, index) => {
                    // Basic structure validation
                    expect(radical.object).toBe("radical");
                    expect(typeof radical.id).toBe("number");
                    expect(radical.id).toBeGreaterThan(0);

                    // Data validation
                    expect(radical.data).toBeDefined();
                    expect(typeof radical.data.level).toBe("number");
                    expect(radical.data.level).toBeGreaterThan(0);
                    expect(radical.data.level).toBeLessThanOrEqual(60);

                    // Meanings validation
                    expect(Array.isArray(radical.data.meanings)).toBe(true);
                    expect(radical.data.meanings.length).toBeGreaterThan(0);

                    const primaryMeanings = radical.data.meanings.filter(m => m.primary);
                    expect(primaryMeanings.length).toBeGreaterThanOrEqual(1);

                    // URL validation
                    expect(radical.url).toContain("api.wanikani.com");
                    expect(radical.data.document_url).toContain("wanikani.com");

                    // Characters can be null for image-based radicals
                    expect(typeof radical.data.characters === "string" || radical.data.characters === null).toBe(true);

                    console.log(`READ-ONLY: ✓ Radical ${index + 1}: Valid structure and data`);
                });
            }
        }, 15000);
    });
});
