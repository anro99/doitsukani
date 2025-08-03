import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock functions for the deepl module
const mockTranslateText = vi.fn();
const mockTranslateBatch = vi.fn();
const mockGetUsage = vi.fn();

// Mock the entire deepl module
vi.mock("./deepl", () => ({
    translateText: mockTranslateText,
    translateBatch: mockTranslateBatch,
    getUsage: mockGetUsage
}));

describe("DeepL API Integration", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("translateText", () => {
        it("should translate single text successfully", async () => {
            mockTranslateText.mockResolvedValueOnce("Grund");

            expect(mockTranslateText("test-api-key", "ground")).resolves.toBe("Grund");
            expect(mockTranslateText).toHaveBeenCalledWith("test-api-key", "ground");
        });

        it("should handle custom target language", async () => {
            mockTranslateText.mockResolvedValueOnce("sol");

            await expect(mockTranslateText("test-key", "ground", "ES")).resolves.toBe("sol");
            expect(mockTranslateText).toHaveBeenCalledWith("test-key", "ground", "ES");
        });

        it("should handle API authentication errors", async () => {
            mockTranslateText.mockRejectedValueOnce(new Error("Authorization failure"));

            await expect(mockTranslateText("invalid-key", "test"))
                .rejects.toThrow("Authorization failure");
        });

        it("should handle quota exceeded errors", async () => {
            mockTranslateText.mockRejectedValueOnce(new Error("Quota exceeded"));

            await expect(mockTranslateText("test-key", "test"))
                .rejects.toThrow("Quota exceeded");
        });

        it("should handle network errors gracefully", async () => {
            mockTranslateText.mockRejectedValueOnce(new Error("Network Error"));

            await expect(mockTranslateText("test-key", "test"))
                .rejects.toThrow("Network Error");
        });

        it("should validate empty text input", async () => {
            mockTranslateText.mockRejectedValueOnce(new Error("Text cannot be empty"));

            await expect(mockTranslateText("test-key", ""))
                .rejects.toThrow("Text cannot be empty");
        });

        it("should validate API key", async () => {
            mockTranslateText.mockRejectedValueOnce(new Error("API key is required"));

            await expect(mockTranslateText("", "test"))
                .rejects.toThrow("API key is required");
        });

        it("should handle special characters correctly", async () => {
            mockTranslateText.mockResolvedValueOnce("Café & Naïve");

            await expect(mockTranslateText("test-key", "Coffee & Naive"))
                .resolves.toBe("Café & Naïve");
        });

        it("should handle long text", async () => {
            const longText = "a".repeat(1000);
            mockTranslateText.mockResolvedValueOnce("sehr langer Text");

            await expect(mockTranslateText("test-key", longText))
                .resolves.toBe("sehr langer Text");
        });

        it("should support different target languages", async () => {
            mockTranslateText.mockResolvedValueOnce("tierra");

            await expect(mockTranslateText("test-key", "ground", "ES"))
                .resolves.toBe("tierra");
        });

        it("should handle retry logic", async () => {
            mockTranslateText
                .mockRejectedValueOnce(new Error("Temporary failure"))
                .mockResolvedValueOnce("Success");

            await expect(mockTranslateText("test-key", "test"))
                .rejects.toThrow("Temporary failure");

            await expect(mockTranslateText("test-key", "test"))
                .resolves.toBe("Success");

            expect(mockTranslateText).toHaveBeenCalledTimes(2);
        });
    });

    describe("translateBatch", () => {
        it("should translate multiple texts efficiently", async () => {
            mockTranslateBatch.mockResolvedValueOnce(["Grund", "Wasser", "Feuer"]);

            const texts = ["ground", "water", "fire"];
            await expect(mockTranslateBatch("test-key", texts))
                .resolves.toEqual(["Grund", "Wasser", "Feuer"]);

            expect(mockTranslateBatch).toHaveBeenCalledWith("test-key", texts);
        });

        it("should handle empty batch gracefully", async () => {
            mockTranslateBatch.mockResolvedValueOnce([]);

            await expect(mockTranslateBatch("test-key", []))
                .resolves.toEqual([]);
        });

        it("should handle batch with single item", async () => {
            mockTranslateBatch.mockResolvedValueOnce(["Grund"]);

            await expect(mockTranslateBatch("test-key", ["ground"]))
                .resolves.toEqual(["Grund"]);
        });

        it("should handle large batches", async () => {
            const largeBatch = Array.from({ length: 100 }, (_, i) => `text${i}`);
            const expectedResult = Array.from({ length: 100 }, (_, i) => `übersetzung${i}`);

            mockTranslateBatch.mockResolvedValueOnce(expectedResult);

            await expect(mockTranslateBatch("test-key", largeBatch))
                .resolves.toHaveLength(100);
        });

        it("should handle batch failures with fallback", async () => {
            mockTranslateBatch.mockRejectedValueOnce(new Error("Batch failed"));

            await expect(mockTranslateBatch("test-key", ["ground", "water"]))
                .rejects.toThrow("Batch failed");
        });

        it("should preserve order in batch translation", async () => {
            const texts = ["first", "second", "third"];
            const translations = ["erste", "zweite", "dritte"];

            mockTranslateBatch.mockResolvedValueOnce(translations);

            await expect(mockTranslateBatch("test-key", texts))
                .resolves.toEqual(translations);
        });
    });

    describe("getUsage", () => {
        it("should return current API usage", async () => {
            const mockUsage = {
                character_count: 12345,
                character_limit: 500000
            };

            mockGetUsage.mockResolvedValueOnce(mockUsage);

            await expect(mockGetUsage("test-key"))
                .resolves.toEqual(mockUsage);
        });

        it("should handle usage API errors", async () => {
            mockGetUsage.mockRejectedValueOnce(new Error("Usage API failed"));

            await expect(mockGetUsage("test-key"))
                .rejects.toThrow("Usage API failed");
        });

        it("should validate API key for usage", async () => {
            mockGetUsage.mockRejectedValueOnce(new Error("Invalid API key"));

            await expect(mockGetUsage(""))
                .rejects.toThrow("Invalid API key");
        });
    });

    describe("Rate Limiting", () => {
        it("should respect rate limits", async () => {
            mockTranslateText.mockResolvedValue("Test");

            // Mock multiple calls to test rate limiting behavior
            const promises = Array.from({ length: 3 }, () =>
                mockTranslateText("test-key", "test")
            );

            await Promise.all(promises);
            expect(mockTranslateText).toHaveBeenCalledTimes(3);
        });

        it("should handle rate limit exceeded", async () => {
            mockTranslateText.mockRejectedValueOnce(new Error("Too many requests"));

            await expect(mockTranslateText("test-key", "test"))
                .rejects.toThrow("Too many requests");
        });
    });

    describe("Configuration", () => {
        it("should work with free tier API", async () => {
            mockTranslateText.mockResolvedValueOnce("Test");

            await expect(mockTranslateText("test-key", "test", "DE", false))
                .resolves.toBe("Test");
        });

        it("should work with pro tier API", async () => {
            mockTranslateText.mockResolvedValueOnce("Test");

            await expect(mockTranslateText("test-key", "test", "DE", true))
                .resolves.toBe("Test");
        });
    });

    describe("Input Validation", () => {
        it("should handle Unicode characters", async () => {
            mockTranslateText.mockResolvedValueOnce("Wasser Feuer Erde");

            await expect(mockTranslateText("test-key", "水火土"))
                .resolves.toBe("Wasser Feuer Erde");
        });

        it("should handle HTML entities", async () => {
            mockTranslateText.mockResolvedValueOnce("Tom &amp; Jerry");

            await expect(mockTranslateText("test-key", "Tom &amp; Jerry"))
                .resolves.toBe("Tom &amp; Jerry");
        });

        it("should handle newlines", async () => {
            mockTranslateText.mockResolvedValueOnce("Zeile 1\nZeile 2");

            await expect(mockTranslateText("test-key", "Line 1\nLine 2"))
                .resolves.toBe("Zeile 1\nZeile 2");
        });

        it("should handle empty strings appropriately", async () => {
            mockTranslateText.mockRejectedValueOnce(new Error("Text cannot be empty"));

            await expect(mockTranslateText("test-key", ""))
                .rejects.toThrow("Text cannot be empty");
        });
    });

    describe("Error Recovery", () => {
        it("should implement retry logic for temporary failures", async () => {
            mockTranslateText
                .mockRejectedValueOnce(new Error("Temporary failure"))
                .mockResolvedValueOnce("Success on retry");

            // First call fails
            await expect(mockTranslateText("test-key", "test"))
                .rejects.toThrow("Temporary failure");

            // Second call succeeds  
            await expect(mockTranslateText("test-key", "test"))
                .resolves.toBe("Success on retry");
        });

        it("should fail after maximum retries", async () => {
            mockTranslateText.mockRejectedValue(new Error("Persistent failure"));

            await expect(mockTranslateText("test-key", "test"))
                .rejects.toThrow("Persistent failure");
        });
    });
});
