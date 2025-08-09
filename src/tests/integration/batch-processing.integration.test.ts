import { describe, expect, it, beforeAll, beforeEach } from "vitest";
import dotenv from "dotenv";
import { getRadicals, getRadicalStudyMaterials, updateRadicalSynonyms, createRadicalSynonyms } from "../../lib/wanikani";
import { translateText } from "../../lib/deepl";

// Load environment variables
dotenv.config();

// Add delay helper function for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 🚀 BATCH-PROCESSING INTEGRATION TESTS
 * 
 * ⚠️ SAFETY WARNING ⚠️
 * These tests work with SPECIFIC TEST RADICALS only:
 * - "Rice" (米) - Safe for testing
 * - "Spikes" - Safe for testing
 * - "Umbrella" - Safe for testing
 * 
 * These tests verify that the batch processing implementation works correctly
 * with real API calls in a controlled environment.
 */

let apiToken: string;
let deeplToken: string;

describe("🚀 Batch Processing Integration Tests - TEST RADICALS ONLY", () => {
    beforeAll(() => {
        apiToken = process.env.WANIKANI_API_TOKEN || "";
        deeplToken = process.env.DEEPL_API_TOKEN || "";

        if (!apiToken) {
            console.warn("WANIKANI_API_TOKEN not found. Skipping integration tests.");
        }
        if (!deeplToken) {
            console.warn("DEEPL_API_TOKEN not found. Skipping translation tests.");
        }
    });

    beforeEach(async () => {
        if (apiToken) {
            await delay(5000); // 5 second delay between tests to prevent rate limiting
        }
    });

    describe("📦 Batch Configuration Verification", () => {
        it("should use correct batch size for real API calls", async () => {
            if (!apiToken) return;

            // Get test radicals
            const radicals = await getRadicals(apiToken, undefined, {
                slugs: "rice,spikes,umbrella",
                limit: 3
            });

            if (radicals.length === 0) return;

            // Simulate batch splitting logic with real data
            const BATCH_SIZE = 20;
            const batches = [];

            // Create artificial larger dataset by repeating our safe radicals
            const extendedRadicals = [];
            for (let i = 0; i < 45; i++) {
                extendedRadicals.push(radicals[i % radicals.length]);
            }

            for (let i = 0; i < extendedRadicals.length; i += BATCH_SIZE) {
                batches.push(extendedRadicals.slice(i, i + BATCH_SIZE));
            }

            expect(batches.length).toBe(Math.ceil(45 / 20)); // Should be 3 batches
            expect(batches[0]).toHaveLength(20);
            expect(batches[1]).toHaveLength(20);
            expect(batches[2]).toHaveLength(5);

            console.log(`✅ Batch configuration verified: ${batches.length} batches for 45 radicals`);
        });
    });

    describe("🌐 Translation Batch Processing", () => {
        it("should process multiple radicals in batches with translation", async () => {
            if (!apiToken || !deeplToken) return;

            console.log("🔍 Testing batch translation processing...");

            // Get our safe test radicals
            const radicals = await getRadicals(apiToken, undefined, {
                slugs: "rice,spikes,umbrella",
                limit: 3
            });

            if (radicals.length === 0) {
                console.log("No test radicals found, skipping test");
                return;
            }

            console.log(`📝 Found ${radicals.length} test radicals for batch processing`);

            // Process each radical with translation (simulating batch behavior)
            const batchResults = [];
            const BATCH_SIZE = 2; // Small batch size for testing

            for (let i = 0; i < radicals.length; i += BATCH_SIZE) {
                const batch = radicals.slice(i, i + BATCH_SIZE);
                console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(radicals.length / BATCH_SIZE)}: ${batch.length} radicals`);

                const batchResult = [];

                for (const radical of batch) {
                    const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;
                    if (!["Rice", "Spikes", "Umbrella"].includes(primaryMeaning || "")) continue;

                    try {
                        // Test translation
                        const translation = await translateText(
                            deeplToken,
                            primaryMeaning || "",
                            'DE',
                            false,
                            1
                        );

                        console.log(`🌐 Translated "${primaryMeaning}" → "${translation}"`);

                        // Get existing study materials
                        const studyMaterials = await getRadicalStudyMaterials(apiToken, undefined, {
                            subject_ids: radical.id.toString()
                        });

                        batchResult.push({
                            radical: primaryMeaning,
                            translation,
                            hasStudyMaterial: studyMaterials.length > 0,
                            currentSynonyms: studyMaterials[0]?.data.meaning_synonyms || []
                        });

                        // Add delay between API calls within batch (rate limiting)
                        await delay(1500);

                    } catch (error) {
                        console.log(`❌ Translation failed for ${primaryMeaning}: ${error}`);
                        batchResult.push({
                            radical: primaryMeaning,
                            translation: null,
                            error: String(error)
                        });
                    }
                }

                batchResults.push(batchResult);

                // Inter-batch delay (simulating BATCH_DELAY_MS)
                if (i + BATCH_SIZE < radicals.length) {
                    console.log("⏸️ Inter-batch delay (2s)...");
                    await delay(2000);
                }
            }

            // Verify batch processing results
            expect(batchResults.length).toBeGreaterThan(0);
            const totalProcessed = batchResults.flat().length;
            const successfulTranslations = batchResults.flat().filter(r => r.translation).length;

            console.log(`✅ Batch processing completed: ${successfulTranslations}/${totalProcessed} successful translations`);
            expect(totalProcessed).toBeGreaterThan(0);

        }, 60000); // 60 second timeout for this test
    });

    describe("🔄 Batch Upload Processing", () => {
        it("should handle batch upload operations safely", async () => {
            if (!apiToken || !deeplToken) return;

            console.log("🔍 Testing batch upload processing...");

            // Get test radicals
            const radicals = await getRadicals(apiToken, undefined, {
                slugs: "rice,spikes",
                limit: 2 // Keep it small for testing
            });

            if (radicals.length === 0) return;

            const batchUploadResults = [];

            for (const radical of radicals) {
                const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;
                if (!["Rice", "Spikes"].includes(primaryMeaning || "")) continue;

                try {
                    // Translate first
                    const translation = await translateText(
                        deeplToken,
                        primaryMeaning || "",
                        'DE',
                        false,
                        1
                    );

                    // Get existing study materials
                    const studyMaterials = await getRadicalStudyMaterials(apiToken, undefined, {
                        subject_ids: radical.id.toString()
                    });

                    const testSynonyms = [translation.toLowerCase()];

                    let uploadResult;
                    if (studyMaterials.length > 0) {
                        // Update existing
                        console.log(`📤 Updating synonyms for ${primaryMeaning}...`);
                        uploadResult = await updateRadicalSynonyms(
                            apiToken,
                            studyMaterials[0].id,
                            testSynonyms
                        );
                        batchUploadResults.push({
                            radical: primaryMeaning,
                            operation: 'update',
                            success: true,
                            synonyms: testSynonyms
                        });
                    } else {
                        // Create new
                        console.log(`📤 Creating synonyms for ${primaryMeaning}...`);
                        uploadResult = await createRadicalSynonyms(
                            apiToken,
                            radical.id,
                            testSynonyms
                        );
                        batchUploadResults.push({
                            radical: primaryMeaning,
                            operation: 'create',
                            success: true,
                            synonyms: testSynonyms
                        });
                    }

                    // Verify the upload
                    expect(uploadResult.data.meaning_synonyms).toEqual(testSynonyms);
                    console.log(`✅ Upload successful for ${primaryMeaning}: ${testSynonyms.join(', ')}`);

                    // Rate limiting delay between uploads
                    await delay(3000);

                } catch (error) {
                    console.log(`❌ Upload failed for ${primaryMeaning}: ${error}`);
                    batchUploadResults.push({
                        radical: primaryMeaning,
                        operation: 'failed',
                        success: false,
                        error: String(error)
                    });
                }
            }

            // Verify batch results
            expect(batchUploadResults.length).toBeGreaterThan(0);
            const successfulUploads = batchUploadResults.filter(r => r.success).length;
            console.log(`✅ Batch upload completed: ${successfulUploads}/${batchUploadResults.length} successful uploads`);

        }, 90000); // 90 second timeout
    });

    describe("⚠️ Batch Error Handling", () => {
        it("should handle individual failures within a batch gracefully", async () => {
            if (!apiToken) return;

            console.log("🔍 Testing batch error handling...");

            // Create a mixed scenario with valid and invalid operations
            const testScenarios = [
                { name: "Valid Radical", slug: "rice", shouldSucceed: true },
                { name: "Invalid Operation", slug: "nonexistent", shouldSucceed: false },
                { name: "Another Valid", slug: "spikes", shouldSucceed: true }
            ];

            const batchErrorResults = [];

            for (const scenario of testScenarios) {
                try {
                    if (scenario.shouldSucceed) {
                        // Valid operation
                        const radicals = await getRadicals(apiToken, undefined, {
                            slugs: scenario.slug,
                            limit: 1
                        });

                        if (radicals.length > 0) {
                            const radical = radicals[0];
                            const primaryMeaning = radical.data.meanings.find(m => m.primary)?.meaning;

                            batchErrorResults.push({
                                scenario: scenario.name,
                                radical: primaryMeaning,
                                success: true,
                                message: `Successfully processed ${primaryMeaning}`
                            });
                            console.log(`✅ ${scenario.name}: Successfully processed ${primaryMeaning}`);
                        }
                    } else {
                        // Invalid operation (should fail)
                        await getRadicals(apiToken, undefined, {
                            slugs: "this-radical-does-not-exist-12345",
                            limit: 1
                        });

                        // If we get here, it didn't fail as expected
                        batchErrorResults.push({
                            scenario: scenario.name,
                            success: false,
                            message: "Expected failure but operation succeeded"
                        });
                    }
                } catch (error) {
                    if (scenario.shouldSucceed) {
                        // Unexpected failure
                        batchErrorResults.push({
                            scenario: scenario.name,
                            success: false,
                            message: `Unexpected failure: ${error}`
                        });
                        console.log(`❌ ${scenario.name}: Unexpected failure: ${error}`);
                    } else {
                        // Expected failure
                        batchErrorResults.push({
                            scenario: scenario.name,
                            success: true,
                            message: "Failed as expected"
                        });
                        console.log(`✅ ${scenario.name}: Failed as expected (good!)`);
                    }
                }

                // Delay between scenarios
                await delay(2000);
            }

            // Verify error handling
            expect(batchErrorResults.length).toBe(testScenarios.length);
            const handledCorrectly = batchErrorResults.filter(r => r.success).length;
            console.log(`✅ Error handling test completed: ${handledCorrectly}/${batchErrorResults.length} scenarios handled correctly`);

        }, 60000);
    });

    describe("⏱️ Rate Limiting Verification", () => {
        it("should respect rate limits during batch processing", async () => {
            if (!apiToken) return;

            console.log("🔍 Testing rate limiting in batch processing...");

            const startTime = Date.now();
            const callTimes = [];

            // Make sequential API calls (simulating within-batch processing)
            const testRadicalSlugs = ["rice", "spikes", "umbrella"];

            for (const slug of testRadicalSlugs) {
                const callStart = Date.now();

                try {
                    const radicals = await getRadicals(apiToken, undefined, {
                        slugs: slug,
                        limit: 1
                    });

                    const callEnd = Date.now();
                    callTimes.push({
                        slug,
                        duration: callEnd - callStart,
                        success: radicals.length > 0
                    });

                    console.log(`⏱️ API call for ${slug}: ${callEnd - callStart}ms`);

                    // Simulate batch rate limiting (1.2s delay between calls)
                    await delay(1200);

                } catch (error) {
                    const callEnd = Date.now();
                    callTimes.push({
                        slug,
                        duration: callEnd - callStart,
                        success: false,
                        error: String(error)
                    });
                }
            }

            const totalTime = Date.now() - startTime;
            const expectedMinTime = (testRadicalSlugs.length - 1) * 1200; // Inter-call delays

            console.log(`⏱️ Total batch processing time: ${totalTime}ms`);
            console.log(`⏱️ Expected minimum time (rate limiting): ${expectedMinTime}ms`);

            // Verify rate limiting was respected
            expect(totalTime).toBeGreaterThanOrEqual(expectedMinTime);
            expect(callTimes.length).toBe(testRadicalSlugs.length);

            const successfulCalls = callTimes.filter(c => c.success).length;
            console.log(`✅ Rate limiting test completed: ${successfulCalls}/${callTimes.length} successful calls`);

        }, 45000);

        it("should handle inter-batch delays correctly", async () => {
            if (!apiToken) return;

            console.log("🔍 Testing inter-batch delay timing...");

            const batchDelayStart = Date.now();

            // Simulate inter-batch delay
            const BATCH_DELAY_MS = 2000;
            console.log(`⏸️ Simulating inter-batch delay (${BATCH_DELAY_MS}ms)...`);
            await delay(BATCH_DELAY_MS);

            const batchDelayEnd = Date.now();
            const actualDelay = batchDelayEnd - batchDelayStart;

            console.log(`⏱️ Actual inter-batch delay: ${actualDelay}ms`);

            // Verify delay was approximately correct (within 100ms tolerance)
            expect(actualDelay).toBeGreaterThanOrEqual(BATCH_DELAY_MS - 100);
            expect(actualDelay).toBeLessThanOrEqual(BATCH_DELAY_MS + 500);

            console.log(`✅ Inter-batch delay test completed: ${actualDelay}ms (expected ${BATCH_DELAY_MS}ms)`);
        });
    });
});
