import axios from "axios";
import Bottleneck from "bottleneck";

export interface DeepLTranslation {
    text: string;
    detected_source_language: string;
}

interface DeepLResponse {
    translations: DeepLTranslation[];
}

// Rate limiting for DeepL API (more generous than Wanikani)
const DEEPL_API_LIMITS = {
    minTime: 1000, // 1 second between requests
    maxConcurrent: 5
};

const limiter = new Bottleneck(DEEPL_API_LIMITS);

/**
 * Translate a single text using DeepL API
 */
export const translateText = async (
    apiKey: string,
    text: string,
    targetLang: string = "DE",
    isPro: boolean = false,
    maxRetries: number = 3,
    context?: string
): Promise<string> => {
    // Input validation
    if (!apiKey) {
        throw new Error("API key is required");
    }

    if (!text || text.trim() === "") {
        throw new Error("Text cannot be empty");
    }

    // Convert to lowercase to avoid DeepL treating capitalized words as proper nouns
    // DeepL doesn't translate proper nouns, so "Bamboo" stays "Bamboo" but "bamboo" becomes "Bambus"
    const textToTranslate = text.toLowerCase();

    // Use proxy URLs for development, direct URLs for testing
    const baseUrl = process.env.NODE_ENV === "test"
        ? (isPro ? "https://api.deepl.com/v2/translate" : "https://api-free.deepl.com/v2/translate")
        : (isPro ? "/api/deepl-pro/v2/translate" : "/api/deepl/v2/translate");

    const translateWithRetry = async (retryCount: number = 0): Promise<string> => {
        try {
            const requestBody: any = {
                text: [textToTranslate],
                target_lang: targetLang,
                source_lang: "EN"
            };

            // Add context if provided
            if (context) {
                requestBody.context = context;
            }

            const response = await limiter.schedule(() =>
                axios.post(baseUrl, requestBody, {
                    headers: {
                        "Authorization": `DeepL-Auth-Key ${apiKey}`,
                        "Content-Type": "application/json"
                    }
                })
            );

            const data = response.data as DeepLResponse;
            return data.translations[0].text;
        } catch (error: any) {
            // Handle specific DeepL errors
            if (error.response) {
                const { status, data } = error.response;

                switch (status) {
                    case 403:
                        throw new Error(data.message || "Authorization failure");
                    case 456:
                        throw new Error(data.message || "Quota exceeded");
                    case 429:
                        throw new Error(data.message || "Too many requests");
                    default:
                        throw new Error(data.message || `API error: ${status}`);
                }
            }

            // Retry on network errors
            if (retryCount < maxRetries - 1) {
                return translateWithRetry(retryCount + 1);
            }

            throw error;
        }
    };

    return translateWithRetry();
};

/**
 * Translate multiple texts in batch or individually
 */
export const translateBatch = async (
    apiKey: string,
    texts: string[],
    fallbackToIndividual: boolean = true,
    targetLang: string = "DE",
    isPro: boolean = false,
    batchSize: number = 50,
    context?: string
): Promise<string[]> => {
    if (texts.length === 0) {
        return [];
    }

    // Split into chunks if necessary
    const chunks = [];
    for (let i = 0; i < texts.length; i += batchSize) {
        chunks.push(texts.slice(i, i + batchSize));
    }

    const results: string[] = [];

    for (const chunk of chunks) {
        try {
            // Convert all texts to lowercase to avoid DeepL treating capitalized words as proper nouns
            const lowercaseChunk = chunk.map(text => text.toLowerCase());

            // Try batch translation first
            // Use proxy URLs for development
            const baseUrl = isPro
                ? "/api/deepl-pro/v2/translate"
                : "/api/deepl/v2/translate";

            const requestBody: any = {
                text: lowercaseChunk,
                target_lang: targetLang,
                source_lang: "EN"
            };

            // Add context if provided
            if (context) {
                requestBody.context = context;
            }

            const response = await limiter.schedule(() =>
                axios.post(baseUrl, requestBody, {
                    headers: {
                        "Authorization": `DeepL-Auth-Key ${apiKey}`,
                        "Content-Type": "application/json"
                    }
                })
            );

            const data = response.data as DeepLResponse;
            results.push(...data.translations.map(t => t.text));
        } catch (error) {
            if (fallbackToIndividual) {
                // Fallback to individual translations
                for (const text of chunk) {
                    try {
                        const translation = await translateText(apiKey, text, targetLang, isPro, 3, context);
                        results.push(translation);
                    } catch (individualError) {
                        // If individual translation also fails, use original text
                        results.push(text);
                    }
                }
            } else {
                throw error;
            }
        }
    }

    return results;
};

/**
 * Get usage information from DeepL API
 */
export const getUsage = async (apiKey: string, isPro: boolean = false): Promise<any> => {
    const baseUrl = isPro
        ? "https://api.deepl.com/v2/usage"
        : "https://api-free.deepl.com/v2/usage";

    const response = await axios.get(baseUrl, {
        headers: {
            "Authorization": `DeepL-Auth-Key ${apiKey}`
        }
    });

    return response.data;
};
