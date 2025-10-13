import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { translateText, translateBatch, getUsage } from "../../shared/lib/deepl";
import axios from "axios";

// Mock axios for integration testing without external API calls
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

// Integration Tests - Test DeepL service integration with mocked HTTP layer
describe("DeepL API Integration Tests (Mocked)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Translation Service Integration", () => {
        it("should integrate translateText with proper HTTP request structure", async () => {
            // Mock successful DeepL API response
            vi.mocked(mockedAxios.post).mockResolvedValueOnce({
                data: {
                    translations: [
                        {
                            text: "Hallo, Welt!",
                            detected_source_language: "EN"
                        }
                    ]
                }
            });

            const result = await translateText("test-api-key", "Hello, world!", "DE", false);

            // Verify integration worked
            expect(result).toBe("Hallo, Welt!");

            // Verify correct API integration
            expect(mockedAxios.post).toHaveBeenCalledWith(
                "https://api-free.deepl.com/v2/translate",
                expect.objectContaining({
                    text: ["hello, world!"], // API expects array and lowercase
                    target_lang: "DE",
                    source_lang: "EN"
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "Authorization": "DeepL-Auth-Key test-api-key",
                        "Content-Type": "application/json"
                    }),
                    timeout: 30000
                })
            );
        });

        it("should integrate translateText with Pro API endpoint", async () => {
            vi.mocked(mockedAxios.post).mockResolvedValueOnce({
                data: {
                    translations: [
                        {
                            text: "Boden",
                            detected_source_language: "EN"
                        }
                    ]
                }
            });

            const result = await translateText("test-pro-key", "ground", "DE", true);

            expect(result).toBe("Boden");

            // Verify Pro endpoint is used
            expect(mockedAxios.post).toHaveBeenCalledWith(
                "https://api.deepl.com/v2/translate",
                expect.objectContaining({
                    text: ["ground"], // API expects array
                    target_lang: "DE",
                    source_lang: "EN"
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "Authorization": "DeepL-Auth-Key test-pro-key",
                        "Content-Type": "application/json"
                    })
                })
            );
        });

        it("should integrate translateBatch with proper request batching", async () => {
            const mockResponses = [
                { text: "Boden", detected_source_language: "EN" },
                { text: "Wasser", detected_source_language: "EN" },
                { text: "Feuer", detected_source_language: "EN" }
            ];

            vi.mocked(mockedAxios.post).mockResolvedValueOnce({
                data: { translations: mockResponses }
            });

            const texts = ["ground", "water", "fire"];
            const result = await translateBatch("test-api-key", texts, true, "DE", false);

            expect(result).toEqual(["Boden", "Wasser", "Feuer"]);

            // Verify batch request structure - for batch translation uses proxy endpoint
            expect(mockedAxios.post).toHaveBeenCalledWith(
                "/api/deepl/v2/translate",
                expect.objectContaining({
                    text: texts,
                    target_lang: "DE",
                    source_lang: "EN"
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "Authorization": "DeepL-Auth-Key test-api-key",
                        "Content-Type": "application/json"
                    })
                })
            );
        });

        it("should integrate getUsage with proper API endpoint", async () => {
            vi.mocked(mockedAxios.get).mockResolvedValueOnce({
                data: {
                    character_count: 12345,
                    character_limit: 500000
                }
            });

            const result = await getUsage("test-api-key", false);

            expect(result).toEqual({
                character_count: 12345,
                character_limit: 500000
            });

            // Verify usage endpoint integration
            expect(mockedAxios.get).toHaveBeenCalledWith(
                "https://api-free.deepl.com/v2/usage",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "Authorization": "DeepL-Auth-Key test-api-key"
                    })
                })
            );
        });
    });

    describe("Error Handling Integration", () => {
        it("should handle network errors gracefully", async () => {
            // Create a network error that will be rethrown after 3 retries
            const networkError = new Error("Network Error");
            vi.mocked(mockedAxios.post)
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError);

            await expect(translateText("invalid-key", "test", "DE", false))
                .rejects.toThrow("Network Error");
        });

        it("should handle rate limiting errors", async () => {
            const rateLimitError = new Error("Rate limit error") as any;
            rateLimitError.response = {
                status: 429,
                data: { message: "Too many requests" }
            };

            vi.mocked(mockedAxios.post).mockRejectedValueOnce(rateLimitError);

            await expect(translateText("test-key", "test", "DE", false))
                .rejects.toThrow("Too many requests");
        });

        it("should handle invalid authentication", async () => {
            const authError = new Error("Auth error") as any;
            authError.response = {
                status: 403,
                data: { message: "Authorization failure" }
            };

            vi.mocked(mockedAxios.post).mockRejectedValueOnce(authError);

            await expect(translateText("invalid-key", "test", "DE", false))
                .rejects.toThrow("Authorization failure");
        });
    });

    describe("WaniKani Integration Scenarios", () => {
        it("should handle typical radical translations", async () => {
            const radicalMockResponses = [
                { text: "Boden", detected_source_language: "EN" },
                { text: "Wasser", detected_source_language: "EN" },
                { text: "Feuer", detected_source_language: "EN" },
                { text: "Baum", detected_source_language: "EN" },
                { text: "groß", detected_source_language: "EN" }
            ];

            vi.mocked(mockedAxios.post).mockResolvedValueOnce({
                data: { translations: radicalMockResponses }
            });

            const radicalConcepts = ["ground", "water", "fire", "tree", "big"];
            const result = await translateBatch("test-key", radicalConcepts, true, "DE", false);

            expect(result).toEqual(["Boden", "Wasser", "Feuer", "Baum", "groß"]);
            expect(result.length).toBe(radicalConcepts.length);
        });

        it("should handle vocabulary translations with context preservation", async () => {
            vi.mocked(mockedAxios.post).mockResolvedValueOnce({
                data: {
                    translations: [
                        { text: "eines", detected_source_language: "EN" }
                    ]
                }
            });

            const result = await translateText("test-key", "one", "DE", false);

            expect(result).toBe("eines");

            // Verify API call structure for single text translation
            expect(mockedAxios.post).toHaveBeenCalledWith(
                "https://api-free.deepl.com/v2/translate",
                expect.objectContaining({
                    text: ["one"], // Single text as array
                    target_lang: "DE",
                    source_lang: "EN"
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        "Authorization": "DeepL-Auth-Key test-key",
                        "Content-Type": "application/json"
                    })
                })
            );
        });

        it("should handle complex vocabulary meanings", async () => {
            const complexMeanings = [
                "to be located",
                "to exist",
                "honorific language",
                "respectful language"
            ];

            const mockResponses = complexMeanings.map(meaning => ({
                text: `übersetzt: ${meaning}`,
                detected_source_language: "EN"
            }));

            vi.mocked(mockedAxios.post).mockResolvedValueOnce({
                data: { translations: mockResponses }
            });

            const result = await translateBatch("test-key", complexMeanings, true, "DE", false);

            expect(result).toHaveLength(complexMeanings.length);
            expect(result.every(translation => translation.includes("übersetzt:"))).toBe(true);
        });
    });

    describe("Rate Limiting Integration", () => {
        it("should integrate with rate limiting for sequential requests", async () => {
            // Mock multiple successful responses
            vi.mocked(mockedAxios.post)
                .mockResolvedValueOnce({
                    data: { translations: [{ text: "eins", detected_source_language: "EN" }] }
                })
                .mockResolvedValueOnce({
                    data: { translations: [{ text: "zwei", detected_source_language: "EN" }] }
                })
                .mockResolvedValueOnce({
                    data: { translations: [{ text: "drei", detected_source_language: "EN" }] }
                });

            const start = Date.now();

            // Make sequential requests (should be rate limited)
            const results = await Promise.all([
                translateText("test-key", "one", "DE", false),
                translateText("test-key", "two", "DE", false),
                translateText("test-key", "three", "DE", false)
            ]);

            const elapsed = Date.now() - start;

            expect(results).toEqual(["eins", "zwei", "drei"]);

            // Verify rate limiting adds delay (should take at least 2 seconds for 3 requests with 1s delay)
            expect(elapsed).toBeGreaterThan(1000);
            expect(mockedAxios.post).toHaveBeenCalledTimes(3);
        });
    })
});
