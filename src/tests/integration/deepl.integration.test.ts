import { describe, expect, it, beforeAll } from "vitest";
import dotenv from "dotenv";

// Load environment variables explicitly for integration tests
dotenv.config();

// Integration Tests - These run against the actual DeepL API
// Set DEEPL_API_KEY environment variable to run these tests
describe("DeepL API Integration Tests (Real API)", () => {
    const apiKey = process.env.DEEPL_API_KEY;
    const isProTier = process.env.DEEPL_PRO === "true";

    console.log(`🔑 DeepL API Key available: ${!!apiKey}`);
    console.log(`🔧 DeepL Pro tier: ${isProTier}`);

    // Add connection test to validate network access
    let hasNetworkAccess = false;

    beforeAll(async () => {
        try {
            // Test basic network connectivity
            const response = await fetch('https://httpbin.org/get', {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            hasNetworkAccess = response.ok;
        } catch (error) {
            console.log("⚠️  Network connectivity test failed - some tests may be skipped");
            hasNetworkAccess = false;
        }
    });

    // Skip these tests if no API key is provided or no network access
    const testIf = (condition: boolean) => condition ? it : it.skip;

    if (!apiKey) {
        console.log(`
⚠️  DeepL Integration Tests skipped - no API key provided.
   To run these tests, set DEEPL_API_KEY environment variable.
        `);
    }

    describe("Real API Translation Tests", () => {
        testIf(!!apiKey && hasNetworkAccess)("should translate English to German correctly", async () => {
            const { translateText } = await import("../../lib/deepl");

            const result = await translateText(apiKey!, "Hello, world!", "DE", isProTier);

            // DeepL should translate this to something like "Hallo, Welt!"
            expect(result).toBeDefined();
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
            // Basic sanity check - should contain German words
            expect(result.toLowerCase()).toMatch(/hallo|welt/);
        });



        testIf(!!apiKey && hasNetworkAccess)("should translate batch of radical concepts", async () => {
            const { translateBatch } = await import("../../lib/deepl");

            const radicalConcepts = ["ground", "water", "fire", "tree", "big"];
            const result = await translateBatch(apiKey!, radicalConcepts, true, "DE", isProTier);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(radicalConcepts.length);

            // Check that we got reasonable German translations
            expect(result[0].toLowerCase()).toMatch(/grund|boden|erde/); // ground
            expect(result[1].toLowerCase()).toMatch(/wasser/); // water
            expect(result[2].toLowerCase()).toMatch(/feuer/); // fire
            expect(result[3].toLowerCase()).toMatch(/baum/); // tree
            expect(result[4].toLowerCase()).toMatch(/groß|große/); // big
        });

        testIf(!!apiKey && hasNetworkAccess)("should handle API usage information", async () => {
            const { getUsage } = await import("../../lib/deepl");

            const usage = await getUsage(apiKey!, isProTier);

            expect(usage).toBeDefined();
            expect(typeof usage.character_count).toBe("number");
            expect(typeof usage.character_limit).toBe("number");
            expect(usage.character_count).toBeGreaterThanOrEqual(0);
            expect(usage.character_limit).toBeGreaterThan(0);
        });

        testIf(!!apiKey && hasNetworkAccess)("should respect rate limiting in real API calls", async () => {
            const { translateText } = await import("../../lib/deepl");

            const startTime = Date.now();

            // Make 3 consecutive API calls
            const results = await Promise.all([
                translateText(apiKey!, "test1", "DE", isProTier),
                translateText(apiKey!, "test2", "DE", isProTier),
                translateText(apiKey!, "test3", "DE", isProTier)
            ]);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should take at least 2 seconds due to 1-second rate limiting
            expect(duration).toBeGreaterThanOrEqual(2000);
            expect(results).toHaveLength(3);
            results.forEach(result => {
                expect(result).toBeDefined();
                expect(typeof result).toBe("string");
            });
        });

        testIf(!!apiKey && hasNetworkAccess)("should handle Wanikani-style radical translations", async () => {
            const { translateBatch } = await import("../../lib/deepl");

            // Test translations of actual Wanikani radical meanings
            const wanikaniRadicals = [
                "stick", "drop", "lid", "seven", "nine",
                "person", "enter", "eight", "power", "knife"
            ];

            const result = await translateBatch(apiKey!, wanikaniRadicals, true, "DE", isProTier);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(wanikaniRadicals.length);

            // Each translation should be a non-empty string
            result.forEach((translation, index) => {
                expect(translation).toBeDefined();
                expect(typeof translation).toBe("string");
                expect(translation.length).toBeGreaterThan(0);

                console.log(`${wanikaniRadicals[index]} -> ${translation}`);
            });
        });

        testIf(!!apiKey && hasNetworkAccess)("should handle complex radical descriptions", async () => {
            const { translateBatch } = await import("../../lib/deepl");

            // Test longer radical descriptions that might need translation
            const descriptions = [
                "ground, earth, soil",
                "water, liquid, fluid",
                "big, large, great",
                "small, little, tiny"
            ];

            const result = await translateBatch(apiKey!, descriptions, true, "DE", isProTier);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(descriptions.length);

            // Check that commas are preserved and multiple meanings are translated
            result.forEach((translation, index) => {
                expect(translation).toBeDefined();
                expect(typeof translation).toBe("string");
                expect(translation.length).toBeGreaterThan(0);

                // Should preserve comma structure for multiple meanings
                if (descriptions[index].includes(",")) {
                    expect(translation).toMatch(/,/);
                }

                console.log(`"${descriptions[index]}" -> "${translation}"`);
            });
        });
    });

    describe("Error Handling with Real API", () => {
        testIf(!!apiKey && hasNetworkAccess)("should handle invalid target language gracefully", async () => {
            const { translateText } = await import("../../lib/deepl");

            await expect(translateText(apiKey!, "test", "INVALID", isProTier))
                .rejects.toThrow();
        });

        // Skip this test if no API key available
        testIf(!!apiKey && hasNetworkAccess)("should fail with invalid API key", async () => {
            const { translateText } = await import("../../lib/deepl");

            await expect(translateText("invalid-key-12345", "test", "DE", false))
                .rejects.toThrow();
        });
    });

    // Helper to show how to run these tests
    if (!apiKey) {
        console.log(`
🔧 To run DeepL integration tests:
   
   1. Get a DeepL API key from https://www.deepl.com/pro-api
   2. Edit the .env file in the project root:
      DEEPL_API_KEY=your_api_key_here
      DEEPL_PRO=false  # or true for Pro account
   3. Run: npm run test:integration
   
   Alternative - Set environment variables directly:
   
   PowerShell Example:
   $env:DEEPL_API_KEY="your_api_key_here"; npm run test:integration
   
   CMD Example:
   set DEEPL_API_KEY=your_api_key_here && npm run test:integration
   
   Bash Example:
   DEEPL_API_KEY="your_api_key_here" npm run test:integration
        `);
    }
});
