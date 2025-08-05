import { describe, expect, it, vi, beforeEach } from "vitest";
import { translateText } from "../../lib/deepl";

// Mock axios to avoid real API calls during testing
vi.mock("axios", () => ({
    default: {
        post: vi.fn()
    }
}));

// Mock bottleneck
vi.mock("bottleneck", () => ({
    default: vi.fn().mockImplementation(() => ({
        schedule: (fn: any) => fn()
    }))
}));

import axios from "axios";

describe("DeepL Capitalization Fix", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should convert input to lowercase before sending to API", async () => {
        const mockAxios = axios as any;

        // Mock successful API response  
        mockAxios.post.mockResolvedValueOnce({
            data: {
                translations: [{ text: "Bambus" }]
            }
        });

        await translateText("test-key", "Bamboo", "DE", false);

        // Verify that axios.post was called with lowercase text
        expect(mockAxios.post).toHaveBeenCalledWith(
            "https://api-free.deepl.com/v2/translate",
            {
                text: ["bamboo"], // Should be lowercase!
                target_lang: "DE",
                source_lang: "EN"
            },
            {
                headers: {
                    "Authorization": "DeepL-Auth-Key test-key",
                    "Content-Type": "application/json"
                }
            }
        );
    });

    it("should handle already lowercase input correctly", async () => {
        const mockAxios = axios as any;

        // Mock successful API response  
        mockAxios.post.mockResolvedValueOnce({
            data: {
                translations: [{ text: "trödeln" }]
            }
        });

        await translateText("test-key", "loiter", "DE", false);

        // Verify that axios.post was called with the same lowercase text
        expect(mockAxios.post).toHaveBeenCalledWith(
            "https://api-free.deepl.com/v2/translate",
            {
                text: ["loiter"], // Should remain lowercase
                target_lang: "DE",
                source_lang: "EN"
            },
            {
                headers: {
                    "Authorization": "DeepL-Auth-Key test-key",
                    "Content-Type": "application/json"
                }
            }
        );
    });

    it("should handle mixed case input correctly", async () => {
        const mockAxios = axios as any;

        // Mock successful API response  
        mockAxios.post.mockResolvedValueOnce({
            data: {
                translations: [{ text: "Boden" }]
            }
        });

        await translateText("test-key", "GrOuNd", "DE", false);

        // Verify that axios.post was called with all lowercase text
        expect(mockAxios.post).toHaveBeenCalledWith(
            "https://api-free.deepl.com/v2/translate",
            {
                text: ["ground"], // Should be all lowercase
                target_lang: "DE",
                source_lang: "EN"
            },
            {
                headers: {
                    "Authorization": "DeepL-Auth-Key test-key",
                    "Content-Type": "application/json"
                }
            }
        );
    });

    it("should handle problematic WaniKani radicals correctly", async () => {
        const mockAxios = axios as any;

        // Mock successful API responses for problematic radicals  
        mockAxios.post
            .mockResolvedValueOnce({
                data: { translations: [{ text: "Bambus" }] }
            })
            .mockResolvedValueOnce({
                data: { translations: [{ text: "trödeln" }] }
            });

        const bambooResult = await translateText("test-key", "Bamboo", "DE", false);
        const loiterResult = await translateText("test-key", "Loiter", "DE", false);

        expect(bambooResult).toBe("Bambus");
        expect(loiterResult).toBe("trödeln");

        // Verify that axios.post was called with lowercase text
        expect(mockAxios.post).toHaveBeenNthCalledWith(1,
            "https://api-free.deepl.com/v2/translate",
            {
                text: ["bamboo"], // Should be lowercase!
                target_lang: "DE",
                source_lang: "EN"
            },
            {
                headers: {
                    "Authorization": "DeepL-Auth-Key test-key",
                    "Content-Type": "application/json"
                }
            }
        );

        expect(mockAxios.post).toHaveBeenNthCalledWith(2,
            "https://api-free.deepl.com/v2/translate",
            {
                text: ["loiter"], // Should be lowercase!
                target_lang: "DE",
                source_lang: "EN"
            },
            {
                headers: {
                    "Authorization": "DeepL-Auth-Key test-key",
                    "Content-Type": "application/json"
                }
            }
        );
    });
});
